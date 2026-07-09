const Listing = require("../models/listing.js");
const ExpressError = require("../utils/ExpressError.js");
const { cloudinary } = require("../cloudConfig.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const mapToken = process.env.MAP_TOKEN;

if (!mapToken) {
  throw new Error("MAP_TOKEN is missing from environment variables.");
}

const geocodingClient = mbxGeocoding({
  accessToken: mapToken,
});

// Get coordinates from location and country
const getGeometryFromLocation = async (location, country) => {
  const cleanLocation = location?.trim();
  const cleanCountry = country?.trim();

  if (!cleanLocation) {
    throw new ExpressError(400, "Location is required.");
  }

  if (!cleanCountry) {
    throw new ExpressError(400, "Country is required.");
  }

  const searchQuery = `${cleanLocation}, ${cleanCountry}`;

  console.log("Geocoding:", searchQuery);

  const response = await geocodingClient
    .forwardGeocode({
      query: searchQuery,
      limit: 1,
      autocomplete: false,
    })
    .send();

  const features = response?.body?.features;

  if (!Array.isArray(features) || features.length === 0) {
    throw new ExpressError(400, `Location "${searchQuery}" not found.`);
  }

  const geometry = features[0].geometry;

  if (
    !geometry ||
    geometry.type !== "Point" ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length !== 2
  ) {
    throw new ExpressError(400, "Invalid coordinates returned by Mapbox.");
  }

  const longitude = Number(geometry.coordinates[0]);
  const latitude = Number(geometry.coordinates[1]);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90 ||
    (longitude === 0 && latitude === 0)
  ) {
    throw new ExpressError(400, "Invalid coordinates returned by Mapbox.");
  }

  return {
    type: "Point",
    coordinates: [longitude, latitude],
  };
};

// Show all listings
module.exports.index = async (req, res) => {
  const search = req.query.search?.trim() || "";
  let query = {};

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    query = {
      $or: [
        {
          title: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          location: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          country: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ],
    };
  }

  const allListings = await Listing.find(query);

  res.render("listings/index.ejs", {
    allListings,
    search,
    mapToken,
  });
};

// Render new listing form
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// Show single listing
module.exports.showListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id)
    .populate("owner")
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    });

  if (!listing) {
    req.flash("error", "Listing does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", {
    listing,
    mapToken,
  });
};

// Create listing
module.exports.createListing = async (req, res) => {
  if (!req.body.listing) {
    throw new ExpressError(400, "Invalid Listing Data");
  }

  const listingData = {
    ...req.body.listing,
    location: req.body.listing.location?.trim(),
    country: req.body.listing.country?.trim(),
  };

  if (!listingData.location) {
    throw new ExpressError(400, "Location is required.");
  }

  if (!listingData.country) {
    throw new ExpressError(400, "Country is required.");
  }

  const geometry = await getGeometryFromLocation(
    listingData.location,
    listingData.country
  );

  const newListing = new Listing(listingData);

  newListing.owner = req.user._id;
  newListing.geometry = geometry;

  if (req.file) {
    newListing.image = {
      url: req.file.path,
      filename: req.file.filename,
    };
  }

  await newListing.save();

  console.log("Saved coordinates:", newListing.geometry.coordinates);

  req.flash("success", "Listing Created Successfully!");

  res.redirect(`/listings/${newListing._id}`);
};

// Render edit form
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  res.render("listings/edit.ejs", {
    listing,
  });
};

// Update listing
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  if (!req.body.listing) {
    throw new ExpressError(400, "Invalid Listing Data");
  }

  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  const updatedData = {
    ...req.body.listing,
    location: req.body.listing.location?.trim(),
    country: req.body.listing.country?.trim(),
  };

  if (!updatedData.location) {
    throw new ExpressError(400, "Location is required.");
  }

  if (!updatedData.country) {
    throw new ExpressError(400, "Country is required.");
  }

  const oldLocation = listing.location?.trim().toLowerCase() || "";
  const oldCountry = listing.country?.trim().toLowerCase() || "";
  const newLocation = updatedData.location.toLowerCase();
  const newCountry = updatedData.country.toLowerCase();

  const locationChanged =
    oldLocation !== newLocation || oldCountry !== newCountry;

  const coordinates = listing.geometry?.coordinates;

  const geometryInvalid =
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !Number.isFinite(Number(coordinates[0])) ||
    !Number.isFinite(Number(coordinates[1])) ||
    (Number(coordinates[0]) === 0 && Number(coordinates[1]) === 0);

  let newGeometry = null;

  if (locationChanged || geometryInvalid) {
    newGeometry = await getGeometryFromLocation(
      updatedData.location,
      updatedData.country
    );
  }

  Object.assign(listing, updatedData);

  if (newGeometry) {
    listing.geometry = newGeometry;
  }

  if (req.file) {
    const oldFilename = listing.image?.filename;

    listing.image = {
      url: req.file.path,
      filename: req.file.filename,
    };

    if (oldFilename) {
      try {
        await cloudinary.uploader.destroy(oldFilename);
      } catch (error) {
        console.error("Failed to delete old Cloudinary image:", error.message);
      }
    }
  }

  await listing.save();

  console.log("Updated coordinates:", listing.geometry?.coordinates);

  req.flash("success", "Listing Updated Successfully!");

  res.redirect(`/listings/${listing._id}`);
};

// Delete listing
module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  if (listing.image?.filename) {
    try {
      await cloudinary.uploader.destroy(listing.image.filename);
    } catch (error) {
      console.error("Failed to delete Cloudinary image:", error.message);
    }
  }

  await Listing.findByIdAndDelete(id);

  req.flash("success", "Listing Deleted Successfully!");

  res.redirect("/listings");
};
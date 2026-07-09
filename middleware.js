const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");

// Check Login
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in first!");
    return res.redirect("/login");
  }

  next();
};

// Check Listing Owner
module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  if (!listing.owner) {
    throw new ExpressError(403, "This listing does not have an owner.");
  }

  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You are not the owner of this listing!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// Validate Listing
module.exports.validatingListing = (req, res, next) => {
  console.log("LISTING VALIDATION BODY:", req.body);

  const { error } = listingSchema.validate(req.body);

  if (error) {
    const errMsg = error.details
      .map((element) => element.message)
      .join(", ");

    console.log("LISTING VALIDATION ERROR:", errMsg);
    throw new ExpressError(400, errMsg);
  }

  next();
};

// Validate Review
module.exports.validatingReview = (req, res, next) => {
  console.log("REVIEW VALIDATION BODY:", req.body);

  const { error } = reviewSchema.validate(req.body);

  if (error) {
    const errMsg = error.details
      .map((element) => element.message)
      .join(", ");

    console.log("REVIEW VALIDATION ERROR:", errMsg);
    throw new ExpressError(400, errMsg);
  }

  next();
};

// Check Review Author
module.exports.isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);

  if (!review) {
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }

  if (!review.author) {
    throw new ExpressError(403, "This review does not have an author.");
  }

  if (!review.author.equals(req.user._id)) {
    req.flash("error", "You are not the author of this review!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// Save Redirect URL
module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }

  next();
};
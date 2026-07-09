const express = require("express");
const router = express.Router();
const multer = require("multer");

const wrapAsync = require("../utils/wrapAsync.js");
const listingController = require("../controllers/listing.js");
const {
  isLoggedIn,
  isOwner,
  validatingListing,
} = require("../middleware.js");

const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router.get(
  "/",
  wrapAsync(listingController.index)
);

router.get(
  "/new",
  isLoggedIn,
  wrapAsync(listingController.renderNewForm)
);

router.post(
  "/",
  isLoggedIn,
  upload.single("image"),
  validatingListing,
  wrapAsync(listingController.createListing)
);

router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.renderEditForm)
);

router.get(
  "/:id",
  wrapAsync(listingController.showListing)
);

router.put(
  "/:id",
  isLoggedIn,
  isOwner,
  upload.single("image"),
  validatingListing,
  wrapAsync(listingController.updateListing)
);

router.delete(
  "/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.deleteListing)
);

module.exports = router;
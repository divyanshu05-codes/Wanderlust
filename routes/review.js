const express = require("express");
const router = express.Router({ mergeParams: true });

const wrapAsync = require("../utils/wrapAsync.js");

const reviewController = require("../controllers/review.js");

const {
    isLoggedIn,
    validatingReview,
    isReviewAuthor,
} = require("../middleware.js");

// Create Review
router.post(
    "/",
    isLoggedIn,
    validatingReview,
    wrapAsync(reviewController.createReview)
);

// Delete Review
router.delete(
    "/:reviewId",
    isLoggedIn,
    isReviewAuthor,
    wrapAsync(reviewController.deleteReview)
);

module.exports = router;
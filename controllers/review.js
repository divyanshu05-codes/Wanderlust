const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const ExpressError = require("../utils/ExpressError.js");

// Create Review
module.exports.createReview = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  const review = new Review(req.body.review);
  review.author = req.user._id;
  listing.reviews.push(review);

  await review.save();
  await listing.save();

  req.flash("success", "Review Added Successfully!");
  res.redirect(`/listings/${req.params.id}`);
};

// Delete Review
module.exports.deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;

  await Listing.findByIdAndUpdate(id, {
    $pull: { reviews: reviewId },
  });

  await Review.findByIdAndDelete(reviewId);

  req.flash("success", "Review Deleted Successfully!");
  res.redirect(`/listings/${id}`);
};
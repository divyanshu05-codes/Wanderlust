const express = require("express");
const router = express.Router();
const passport = require("passport");
const wrapAsync = require("../utils/wrapAsync.js");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/user.js");

// Signup Page
router.get("/signup",userController.renderSignupPage);

// Signup Logic
router.post("/signup",wrapAsync(userController.signup));

// Login Page
router.get("/login",userController.renderLoginPage);

// Login Logic
router.post("/login",saveRedirectUrl,passport.authenticate("local", {failureRedirect: "/login",failureFlash: true,}),userController.login);

// Logout
router.get("/logout",userController.logout);

module.exports = router;
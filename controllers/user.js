const User = require("../models/user.js");

// Signup Page
module.exports.renderSignupPage = (req, res) => {
  res.render("users/signup.ejs");
};

// Signup Logic
module.exports.signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const newUser = new User({
      email,
      username,
    });

    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }

      req.flash("success", "Welcome to WanderLust!");
      res.redirect("/listings");
    });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/signup");
  }
};

// Login Page
module.exports.renderLoginPage = (req, res) => {
  res.render("users/login.ejs");
};

// Login Logic
module.exports.login = async (req, res) => {
  req.flash("success", "Welcome back!");
  let redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

// Logout Logic
module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.flash("success", "Logged out successfully!");
    res.redirect("/listings");
  });
};
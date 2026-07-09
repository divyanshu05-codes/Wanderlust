require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const ExpressError = require("./utils/ExpressError.js");
const User = require("./models/user.js");
const listingRoutes = require("./routes/listing.js");
const reviewRoutes = require("./routes/review.js");
const userRoutes = require("./routes/user.js");

const app = express();
const dbUrl = process.env.ATLAS_DB_URL;
const PORT = process.env.PORT || 8080;

// Environment Validation
const requiredEnvVariables = [
  "ATLAS_DB_URL",
  "MAP_TOKEN",
  "CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "SESSION_SECRET",
];

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    console.error(`${variable} is missing from .env`);
    process.exit(1);
  }
}

// View Engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);

// Basic Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Session Configuration
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from .env");
}

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SESSION_SECRET,
  },
  touchAfter: 24 * 60 * 60,
});

store.on("error", (err) => {
  console.error("SESSION STORE ERROR:", err);
});

const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

app.use(session(sessionOptions));
app.use(flash());

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global Locals
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// Home Route
app.get("/", (req, res) => {
  res.redirect("/listings");
});

// Application Routes
app.use("/", userRoutes);
app.use("/listings", listingRoutes);
app.use("/listings/:id/reviews", reviewRoutes);

// Favicon
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

// 404 Handler
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Something Went Wrong!";

  console.error(`${statusCode} ERROR:`, err);

  res.status(statusCode).render("error.ejs", {
    err: {
      statusCode,
      message,
    },
  });
});

// Database Connection and Server Start
async function startServer() {
  try {
    console.log("Connecting to MongoDB Atlas...");

    const validScheme =
      dbUrl.startsWith("mongodb://") ||
      dbUrl.startsWith("mongodb+srv://");

    if (!validScheme) {
      throw new Error(
        'Invalid MongoDB URI. ATLAS_DB_URL must start with "mongodb://" or "mongodb+srv://"'
      );
    }

    await mongoose.connect(dbUrl);

    console.log("MongoDB Atlas connected successfully");
    console.log("Database:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database Connection Failed");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    process.exit(1);
  }
}

startServer();
// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}


// ==========================================
// IMPORTS
// ==========================================
const express = require("express");
const app = express();

const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const session = require("express-session");

// CORRECT IMPORT FOR connect-mongo@6.0.0
const { MongoStore } = require("connect-mongo");

const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/user.js");
const ExpressError = require("./utils/ExpressError.js");


// ==========================================
// ROUTERS
// ==========================================
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");


// ==========================================
// PORT
// ==========================================
const PORT = process.env.PORT || 8080;


// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================
const dbUrl = process.env.ATLAS_DB_URL;
const sessionSecret = process.env.SESSION_SECRET;


if (!dbUrl) {
  console.error("ATLAS_DB_URL is missing.");
  process.exit(1);
}


if (!sessionSecret) {
  console.error("SESSION_SECRET is missing.");
  process.exit(1);
}


// ==========================================
// DATABASE CONNECTION
// ==========================================
async function main() {
  await mongoose.connect(dbUrl);
}


main()
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });


// ==========================================
// VIEW ENGINE
// ==========================================
app.engine("ejs", ejsMate);

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));


// ==========================================
// EXPRESS MIDDLEWARE
// ==========================================
app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "public")));


// ==========================================
// RENDER / PRODUCTION PROXY
// ==========================================
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}


// ==========================================
// MONGODB SESSION STORE
// connect-mongo@6.0.0
// ==========================================
const store = MongoStore.create({
  mongoUrl: dbUrl,

  crypto: {
    secret: sessionSecret,
  },

  touchAfter: 24 * 60 * 60,
});


store.on("error", (err) => {
  console.error("SESSION STORE ERROR:", err);
});


// ==========================================
// SESSION CONFIGURATION
// ==========================================
const sessionOptions = {
  store,

  name: "wanderlust.sid",

  secret: sessionSecret,

  resave: false,

  saveUninitialized: false,

  cookie: {
    httpOnly: true,

    maxAge: 7 * 24 * 60 * 60 * 1000,

    sameSite: "lax",

    secure: process.env.NODE_ENV === "production",
  },
};


// ==========================================
// SESSION MIDDLEWARE
// ==========================================
app.use(session(sessionOptions));


// ==========================================
// FLASH MESSAGES
// ==========================================
app.use(flash());


// ==========================================
// PASSPORT
// ==========================================
app.use(passport.initialize());

app.use(passport.session());


passport.use(
  new LocalStrategy(User.authenticate())
);


passport.serializeUser(
  User.serializeUser()
);


passport.deserializeUser(
  User.deserializeUser()
);


// ==========================================
// GLOBAL LOCALS
// ==========================================
app.use((req, res, next) => {
  res.locals.success = req.flash("success");

  res.locals.error = req.flash("error");

  res.locals.currUser = req.user;

  next();
});


// ==========================================
// HOME
// ==========================================
app.get("/", (req, res) => {
  res.redirect("/listings");
});


// ==========================================
// ROUTES
// ==========================================
app.use("/listings", listingRouter);

app.use(
  "/listings/:id/reviews",
  reviewRouter
);

app.use("/", userRouter);


// ==========================================
// 404
// ==========================================
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

// ==========================================
// ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  console.error(err);

  const {
    statusCode = 500,
    message = "Something went wrong!",
  } = err;

  res.status(statusCode).render("error.ejs", {
    message,
  });
});


// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
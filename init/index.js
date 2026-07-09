const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("connected to DB");
    initDB();
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}


const initDB = async () => {
  await Listing.deleteMany({});

  const user = await User.findOne(); // ✅ get real user
  if (!user) {
    console.log("No user found in DB. Create one first.");
    return;
  }

  const updatedData = initData.data.map((obj) => ({
  title: obj.title,
  description: obj.description,
  price: obj.price,
  location: obj.location,
  country: obj.country,
  image: {
    url: typeof obj.image === "string" ? obj.image : obj.image.url,
    filename: "listingimage",
    },
  owner: user._id,
})
  );

  await Listing.insertMany(updatedData);
  console.log("DB Initialized with sample listings");
  mongoose.connection.close();
};
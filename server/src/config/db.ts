import mongoose from "mongoose";

const connectDatabase = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error("MONGO_URI is missing in Render Environment Variables");
  }

  await mongoose.connect(mongoURI);
  console.log("MongoDB Connected Successfully");
};

export default connectDatabase;

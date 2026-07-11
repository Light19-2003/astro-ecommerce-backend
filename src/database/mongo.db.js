
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.mango_url);

    console.log("✅ MongoDB Connected");
  } catch (ex) {
    console.error("❌ MongoDB Connection Error:", ex.message);
    process.exit(1);
  }
};

export default connectMongoDB;

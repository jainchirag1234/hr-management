import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/User.js";

dotenv.config();

const adminSeeder = async () => {
  try {
    // Database Connection
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    // Check Admin Already Exists
    const adminExists = await User.findOne({
      email: "admin@hrms.com",
    });

    if (adminExists) {
      console.log("Admin already exists");
      process.exit();
    }

    // Password Hash
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    // Create Admin
    await User.create({
      name: "HR Admin",
      email: "admin@hrms.com",
      password: hashedPassword,
      role: "Admin",
      status: "Active",
    });

    console.log("Admin Seeded Successfully");

    process.exit();
  } catch (error) {
    console.log("Seeder Error:", error.message);
    process.exit();
  }
};

adminSeeder();

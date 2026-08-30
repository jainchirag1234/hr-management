import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      trim: true,
      unique: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true, // isse createdAt (Created date) aur updatedAt apne aap aa jayega
  },
);

export default mongoose.model("department", departmentSchema);

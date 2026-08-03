import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "Last Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Invalid email address",
      ],
    },

    phoneNumber: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Invalid phone number"],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters"],
    },
    profileImage: {
      type: String,
    },

    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    address: {
      type: String,
    },

    joiningDate: {
      type: Date,
      validate: {
        validator: function (value) {
          return value instanceof Date && !isNaN(value);
        },
        message: "Invalid joining date",
      },
    },

    department: {
      type: String,
    },

    designation: {
      type: String,
    },

    salary: {
      type: Number,
      min: [0, "Salary cannot be negative"],
    },

    employmentType: {
      type: String,
      enum: ["Full Time", "Part Time", "Contract", "Intern"],
    },

    role: {
      type: String,
      enum: ["Admin", "Employee"],
      default: "Employee",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Resigned", "Terminated"],
      default: "Active",
    },

    emergencyContactName: {
      type: String,
    },

    emergencyContactNumber: {
      type: String,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },

    bankDetails: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("User", UserSchema);

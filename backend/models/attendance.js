import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    checkInTime: {
      type: String,
      default: "",
    },

    checkOutTime: {
      type: String,
      default: "",
    },

    workingHours: {
      type: Number,
      default: 0,
    },

    attendanceStatus: {
      type: String,
      enum: [
        "Present",
        "Absent",
        "Half Day",
        "Late",
        "On Leave",
        "Work From Home",
      ],
      default: "Present",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Same employee ke liye same date par duplicate attendance na bane
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;

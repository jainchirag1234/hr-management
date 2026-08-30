import mongoose from "mongoose";
const { Schema } = mongoose;

const leaveSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "User", // apke Employee model ka naam
      required: true,
    },

    leaveType: {
      type: String,
      enum: [
        "Casual Leave",
        "Sick Leave",
        "Paid Leave",
        "Unpaid Leave",
        "Emergency Leave",
        "Other",
      ],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    totalLeaveDays: {
      type: Number,
      required: true,
      min: 0.5, // half-day leave support ke liye
    },

    isHalfDay: {
      type: Boolean,
      default: false,
    },

    halfDaySession: {
      type: String,
      enum: ["First Half", "Second Half", null],
      default: null,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },

    adminComment: {
      type: String,
      trim: true,
      default: "",
    },

    appliedDate: {
      type: Date,
      default: Date.now,
    },

    approvedOrRejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedOrRejectedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt automatically add ho jayenge
  },
);

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave;

import mongoose from "mongoose";
const leaveTypeSchema = new mongoose.Schema(
  {
    leaveTypeName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: true,
    },
    maximumAllowedDays: {
      type: Number,
      required: true,
    },
    paidOrUnpaid: {
      type: String,
      enum: ["Paid", "Unpaid"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  },
);
const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);
export default LeaveType;

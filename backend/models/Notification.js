// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Kise notification jaa raha hai
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Recipient ka role - taaki frontend easily filter kar sake
    // (admin panel vs user dashboard)
    recipientRole: {
      type: String,
      enum: ["admin", "user"],
      required: true,
    },

    // Kisne action liya (optional, but useful e.g. "admin ne reject kiya")
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Ab dono taraf ke events cover honge
    type: {
      type: String,
      enum: [
        "LEAVE_APPLIED", // user -> admin
        "LEAVE_APPROVED", // admin -> user
        "LEAVE_REJECTED", // admin -> user
        "LEAVE_CANCELLED", // user -> admin
      ],
      required: true,
    },

    message: { type: String, required: true },

    relatedLeave: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leave",
    },

    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);

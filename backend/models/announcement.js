import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: "true",
  },
  description: {
    type: String,
    required: true,
    trim: "true",
  },
  publishDate: {
    type: Date,
    default: Date.now(),
    validate: {
      validator: function (value) {
        // expiryDate optional hai, isliye tabhi check karo jab wo mojood ho
        if (!this.expiryDate) return true;
        return value <= this.expiryDate;
      },
      message: "Publish date cannot be after the expiry date",
    },
  },
  expiryDate: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  status: {
    type: String,
    enum: ["active", "inactive", "expired"],
    default: "active",
  },
});
export default mongoose.model("announcement", announcementSchema);

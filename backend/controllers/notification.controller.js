// controllers/notificationController.js
import Notification from "../models/Notification.js";
import { getIO } from "../utils/socket.js";

/**
 * Helper function - kahin bhi (leave controller etc.) se call karke
 * naya notification create kar sakte hain
 */
export const createNotification = async ({
  recipient,
  recipientRole,
  sender,
  type,
  message,
  relatedLeave,
  relatedHoliday,
  relatedAnnouncement,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      recipientRole,
      sender,
      type,
      message,
      relatedLeave,
      relatedHoliday,
      relatedAnnouncement,
    });
    
    // Emit socket event for real-time update
    try {
      const io = getIO();
      if (recipientRole === "admin") {
        io.to("admins").emit("notification:new", notification);
      } else {
        io.to(recipient.toString()).emit("notification:new", notification);
      }
    } catch (socketError) {
      console.error("Socket emission failed:", socketError.message);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error.message);
    // yahan throw nahi kar rahe taaki main flow (leave apply etc.) fail na ho
    return null;
  }
};

/**
 * @desc    Logged-in user/admin ke saare notifications fetch karo
 * @route   GET /api/notifications
 * @access  Private
 */
export const getMyNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;

    const filter = { recipient: req.user._id };
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate("sender", "firstName lastName email role")
      .populate("relatedLeave")
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

/**
 * @desc    Ek single notification ko read mark karo
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Security check - sirf apna hi notification read kar sake
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this notification",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message,
    });
  }
};

/**
 * @desc    Saare notifications ko ek saath read mark karo
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
      error: error.message,
    });
  }
};

/**
 * @desc    Logged-in user ke saare notifications clear karo
 * @route   DELETE /api/notification/clear-all
 * @access  Private
 */
export const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.status(200).json({
      success: true,
      message: "All notifications cleared",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to clear notifications",
      error: error.message,
    });
  }
};

/**
 * @desc    Ek notification delete karo
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this notification",
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

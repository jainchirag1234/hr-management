import Announcement from "../models/announcement.js";
import User from "../models/User.js";
import { createNotification } from "./notification.controller.js";

// @desc    Create a new announcement
// @route   POST /api/announcements
export const createAnnouncement = async (req, res) => {
  try {
    const { title, description, publishDate, expiryDate, priority, status } =
      req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    const announcement = await Announcement.create({
      title,
      description,
      publishDate,
      expiryDate,
      priority,
      status,
    });

    // Notify all active employees
    const employees = await User.find({ role: "Employee", status: "Active" }).select("_id");
    await Promise.all(
      employees.map((emp) =>
        createNotification({
          recipient: emp._id,
          recipientRole: "user",
          sender: req.user ? req.user._id : null, // fallback if req.user is undefined
          type: "ANNOUNCEMENT_CREATED",
          message: `New Announcement: ${title}`,
          relatedAnnouncement: announcement._id,
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create announcement",
      error: error.message,
    });
  }
};

// @desc    Get all announcements
// @route   GET /api/announcements
export const getAnnouncements = async (req, res) => {
  try {
    const { status, priority } = req.query;

    // optional filters via query params
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const announcements = await Announcement.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
      error: error.message,
    });
  }
};

// @desc    Get single announcement by ID
// @route   GET /api/announcements/:id
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcement",
      error: error.message,
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update announcement",
      error: error.message,
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
      error: error.message,
    });
  }
};

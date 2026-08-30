// routes/notificationRoutes.js
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notification.controller.js";

const router = express.Router();

// Sab routes protected hain - login zaroori hai
router.use(protect);

router.get("/", getMyNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/clear-all", clearAllNotifications);
router.delete("/:id", deleteNotification);

export default router;

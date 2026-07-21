import express from "express";
import {
  applyLeave,
  getAllLeaves,
  getMyLeaves,
  getLeaveById,
  updateLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  deleteLeave,
} from "../controllers/leave.controller.js";

import protect from "../middlewares/auth.middleware.js"; // ⚠️ apna actual filename confirm karo

const router = express.Router();

// Chhota inline admin-check helper (authorize() ki jagah)
const adminOnly = (req, res, next) => {
  if (req.user?.role?.toLowerCase() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Aapko is action ki permission nahi hai",
    });
  }
  next();
};

router.use(protect);

// Fixed-path routes MUST come before wildcard /:id routes
// Employee routes
router.post("/", applyLeave);
router.get("/my-leaves", getMyLeaves);

// Admin-only fixed routes
router.get("/", adminOnly, getAllLeaves);

// Wildcard /:id routes (must come AFTER all fixed paths)
router.get("/:id", getLeaveById);
router.put("/:id", updateLeave);
router.patch("/:id/cancel", cancelLeave);
router.patch("/:id/approve", adminOnly, approveLeave);
router.patch("/:id/reject", adminOnly, rejectLeave);
router.delete("/:id", adminOnly, deleteLeave);

export default router;

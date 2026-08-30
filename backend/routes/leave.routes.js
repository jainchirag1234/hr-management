// routes/leaveRoutes.js
import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
} from "../controllers/leave.controller.js";

const router = express.Router();

router.use(protect); // sab routes login required

// Employee routes
router.post("/", applyLeave);
router.get("/my", getMyLeaves);
router.patch("/:id/cancel", cancelLeave);

// Admin only routes
router.get("/", authorize("admin"), getAllLeaves);
router.patch("/:id/approve", authorize("admin"), approveLeave);
router.patch("/:id/reject", authorize("admin"), rejectLeave);

export default router;

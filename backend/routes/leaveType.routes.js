import express from "express";
import {
  createLeaveType,
  getAllLeaveTypes,
  getLeaveTypeById,
  updateLeaveType,
  deleteLeaveType,
} from "../controllers/leaveType.controller.js";

const router = express.Router();

router.post("/", createLeaveType);
router.get("/", getAllLeaveTypes);
router.get("/:id", getLeaveTypeById);
router.put("/:id", updateLeaveType);
router.delete("/:id", deleteLeaveType);

export default router;

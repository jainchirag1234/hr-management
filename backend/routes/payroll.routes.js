import express from "express";
import {
  generatePayroll,
  getAllPayroll,
  getMyPayslips,
  getPayslipById,
  markAsPaid,
} from "../controllers/payroll.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/generate", protect, authorize("admin"), generatePayroll);
router.get("/", protect, authorize("admin"), getAllPayroll);
router.get("/my-payslips", protect, getMyPayslips);
router.get("/:id", protect, getPayslipById);
router.patch("/:id/mark-paid", protect, authorize("admin"), markAsPaid);

export default router;
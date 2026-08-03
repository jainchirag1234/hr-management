import express from "express";
import {
  createAttendance,
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
  getMonthlyAttendanceSummary,
  getYearlyAttendanceSummary,
  getEmployeeAttendanceCalendar,
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.post("/check-in", checkIn);
router.post("/check-out", checkOut);

router.get("/today", getTodayAttendance);
router.get("/history/:employeeId", getAttendanceHistory);
router.get("/summary/monthly", getMonthlyAttendanceSummary);
router.get("/summary/yearly", getYearlyAttendanceSummary);

// IMPORTANT: /calendar/:employeeId MUST be before /:id route
router.get("/calendar/:employeeId", getEmployeeAttendanceCalendar);

router.route("/").post(createAttendance).get(getAllAttendance);

router
  .route("/:id")
  .get(getAttendanceById)
  .put(updateAttendance)
  .delete(deleteAttendance);

export default router;

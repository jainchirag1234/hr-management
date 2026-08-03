import Payroll from "../models/Payroll.js";
import SalaryStructure from "../models/SalaryStructure.js";
import Attendance from "../models/Attendance.js"; // existing module
import Leave from "../models/Leave.js"; // existing module
import User from "../models/User.js";

// Helper: ek employee ka payroll generate karta hai
const generateForEmployee = async (employeeId, month, year, generatedBy) => {
  const existingPayslip = await Payroll.findOne({ employeeId, month, year });
  if (existingPayslip) {
    if (existingPayslip.paymentStatus === "Paid") {
      return {
        skipped: true,
        reason: "Payslip already generated and paid for this month",
      };
    } else {
      // Overwrite if it is still Pending
      await Payroll.deleteOne({ _id: existingPayslip._id });
    }
  }

  const structure = await SalaryStructure.findOne({
    employeeId,
    isActive: true,
  });
  if (!structure) {
    return { skipped: true, reason: "No active salary structure found" };
  }

  // Fetch employee to get joiningDate
  const employee = await User.findById(employeeId).select("joiningDate");
  if (!employee) {
    return { skipped: true, reason: "Employee not found" };
  }

  // Total days in the payroll month
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Month boundaries
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month - 1, totalDaysInMonth, 23, 59, 59, 999);
  const startOfNextMonth = new Date(year, month, 1);

  // ─── Pro-Ration Logic ───────────────────────────────────────────────────────
  // Check if employee joined IN this payroll month (mid-month joining)
  let isProRated = false;
  let joiningDateInMonth = null;
  let salaryStartDate = startOfMonth; // default: full month

  if (employee.joiningDate) {
    const jd = new Date(employee.joiningDate);
    const jYear = jd.getFullYear();
    const jMonth = jd.getMonth() + 1; // 1-indexed

    if (jYear === year && jMonth === month) {
      // Joining is WITHIN this payroll month → pro-rate
      isProRated = true;
      joiningDateInMonth = jd;
      salaryStartDate = new Date(jYear, jMonth - 1, jd.getDate()); // start of joining day
    } else if (jYear > year || (jYear === year && jMonth > month)) {
      // Employee has not yet joined → skip
      return {
        skipped: true,
        reason: `Employee joining date (${jd.toDateString()}) is after the payroll month`,
      };
    }
    // jYear < year || jMonth < month → employee joined before this month → full salary
  }

  // Days for which salary is to be paid
  const paidDays = isProRated
    ? totalDaysInMonth - salaryStartDate.getDate() + 1  // joining day to month-end (inclusive)
    : totalDaysInMonth;

  // ─── Attendance & Leave counts (from salaryStartDate onwards) ───────────────
  const attendanceCount = await Attendance.countDocuments({
    employee: employeeId,
    date: { $gte: salaryStartDate, $lt: startOfNextMonth },
    attendanceStatus: { $in: ["Present", "Late", "Work From Home"] },
  });

  const unpaidLeaves = await Leave.find({
    employee: employeeId,
    leaveType: "Unpaid Leave",
    status: "Approved",
    startDate: { $gte: salaryStartDate, $lte: endOfMonth },
  });
  const unpaidLeaveCount = unpaidLeaves.reduce((sum, leave) => sum + leave.totalLeaveDays, 0);

  const paidLeaves = await Leave.find({
    employee: employeeId,
    leaveType: { $ne: "Unpaid Leave" },
    status: "Approved",
    startDate: { $gte: salaryStartDate, $lte: endOfMonth },
  });
  const paidLeaveCount = paidLeaves.reduce((sum, leave) => sum + leave.totalLeaveDays, 0);

  // ─── Salary Calculation ─────────────────────────────────────────────────────
  const perDaySalary = structure.grossSalary / totalDaysInMonth;

  // Pro-rated gross: (monthly salary / total days) × paid days
  const grossPay = isProRated
    ? Math.round(perDaySalary * paidDays)
    : structure.grossSalary;

  // Deductions are also pro-rated proportionally for mid-month joining
  const totalDeductions = isProRated
    ? Math.round((structure.totalDeductions / totalDaysInMonth) * paidDays)
    : structure.totalDeductions;

  // LOP deduction for unpaid leaves
  const lopDeduction = Math.round(perDaySalary * unpaidLeaveCount);

  const netPay = Math.max(0, grossPay - totalDeductions - lopDeduction);

  const payslip = await Payroll.create({
    employeeId,
    salaryStructureId: structure._id,
    month,
    year,
    workingDays: totalDaysInMonth,
    presentDays: attendanceCount,
    paidLeaveDays: paidLeaveCount,
    unpaidLeaveDays: unpaidLeaveCount,
    lopDeduction,
    isProRated,
    joiningDateInMonth: isProRated ? joiningDateInMonth : null,
    paidDays,
    grossPay,
    totalDeductions,
    netPay,
    paymentStatus: "Pending",
    generatedBy,
  });

  return { skipped: false, payslip };
};

// POST /api/payroll/generate  (Admin only) — single ya bulk
export const generatePayroll = async (req, res) => {
  try {
    const { month, year, employeeId } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    if (employeeId) {
      const result = await generateForEmployee(
        employeeId,
        month,
        year,
        req.user.id,
      );
      if (result.skipped) {
        return res.status(400).json({ message: result.reason });
      }
      return res
        .status(201)
        .json({ message: "Payslip generated", data: result.payslip });
    }

    const employees = await User.find({ status: "Active" });
    const generated = [];
    const skipped = [];

    for (const emp of employees) {
      const result = await generateForEmployee(
        emp._id,
        month,
        year,
        req.user.id,
      );
      if (result.skipped) {
        skipped.push({ employeeId: emp._id, reason: result.reason });
      } else {
        generated.push(result.payslip);
      }
    }

    res.status(201).json({
      message: `${generated.length} payslips generated, ${skipped.length} skipped`,
      generated,
      skipped,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error generating payroll", error: err.message });
  }
};

// GET /api/payroll  (Admin — all, with filters)
export const getAllPayroll = async (req, res) => {
  try {
    const { month, year, status, employeeId } = req.query;
    const filter = {};
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.paymentStatus = status;
    if (employeeId) filter.employeeId = employeeId;

    const payrolls = await Payroll.find(filter)
      .populate("employeeId", "firstName lastName email department")
      .sort({ year: -1, month: -1 });

    res.status(200).json({ data: payrolls });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching payroll records", error: err.message });
  }
};

// GET /api/payroll/my-payslips  (Employee — self only)
export const getMyPayslips = async (req, res) => {
  try {
    const payslips = await Payroll.find({ employeeId: req.user.id }).sort({
      year: -1,
      month: -1,
    });

    res.status(200).json({ data: payslips });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching your payslips", error: err.message });
  }
};

// GET /api/payroll/:id  (Admin or owner)
export const getPayslipById = async (req, res) => {
  try {
    const payslip = await Payroll.findById(req.params.id)
      .populate("employeeId", "firstName lastName email department designation")
      .populate("salaryStructureId");

    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    if (
      req.user.role !== "admin" &&
      payslip.employeeId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ data: payslip });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching payslip", error: err.message });
  }
};

// PATCH /api/payroll/:id/mark-paid  (Admin only)
export const markAsPaid = async (req, res) => {
  try {
    const { paymentDate, paymentMode, transactionRef } = req.body;

    const payslip = await Payroll.findById(req.params.id);
    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    if (payslip.paymentStatus === "Paid") {
      return res
        .status(400)
        .json({ message: "Payslip is already marked as paid" });
    }

    payslip.paymentStatus = "Paid";
    payslip.paymentDate = paymentDate || new Date();
    payslip.paymentMode = paymentMode;
    payslip.transactionRef = transactionRef;
    await payslip.save();

    res.status(200).json({ message: "Payslip marked as paid", data: payslip });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating payment status", error: err.message });
  }
};

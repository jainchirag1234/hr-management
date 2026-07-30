import Payroll from "../models/Payroll.js";
import SalaryStructure from "../models/SalaryStructure.js";
import Attendance from "../models/Attendance.js"; // existing module
import Leave from "../models/Leave.js"; // existing module
import User from "../models/User.js";

// Helper: ek employee ka payroll generate karta hai
const generateForEmployee = async (employeeId, month, year, generatedBy) => {
  const existingPayslip = await Payroll.findOne({ employeeId, month, year });
  if (existingPayslip) {
    return {
      skipped: true,
      reason: "Payslip already generated for this month",
    };
  }

  const structure = await SalaryStructure.findOne({
    employeeId,
    isActive: true,
  });
  if (!structure) {
    return { skipped: true, reason: "No active salary structure found" };
  }

  const workingDays = new Date(year, month, 0).getDate();

  const attendanceCount = await Attendance.countDocuments({
    employeeId,
    date: {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0),
    },
    status: "Present",
  });

  const unpaidLeaveCount = await Leave.countDocuments({
    employeeId,
    leaveType: "Unpaid",
    status: "Approved",
    fromDate: {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0),
    },
  });

  const paidLeaveCount = await Leave.countDocuments({
    employeeId,
    leaveType: { $ne: "Unpaid" },
    status: "Approved",
    fromDate: {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0),
    },
  });

  const perDaySalary = structure.grossSalary / workingDays;
  const lopDeduction = Math.round(perDaySalary * unpaidLeaveCount);

  const grossPay = structure.grossSalary;
  const totalDeductions = structure.totalDeductions;
  const netPay = grossPay - totalDeductions - lopDeduction;

  const payslip = await Payroll.create({
    employeeId,
    salaryStructureId: structure._id,
    month,
    year,
    workingDays,
    presentDays: attendanceCount,
    paidLeaveDays: paidLeaveCount,
    unpaidLeaveDays: unpaidLeaveCount,
    lopDeduction,
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
      .populate("employeeId", "name email department")
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
      .populate("employeeId", "name email department designation")
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

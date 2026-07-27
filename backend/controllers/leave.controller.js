// controllers/leaveController.js
import Leave from "../models/Leave.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import { createNotification } from "./notification.controller.js";

// ---------------------------------------------------
// Valid leaveType list matching the schema enum
// ---------------------------------------------------
const VALID_LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Paid Leave",
  "Unpaid Leave",
  "Emergency Leave",
  "Other",
];

// ---------------------------------------------------
// Helper: calculate total leave days
// (simple version — weekends/holidays are not excluded,
// add that logic here if needed)
// ---------------------------------------------------
const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  return diffDays;
};

// ---------------------------------------------------
// @desc    Apply for a new leave
// @route   POST /api/leaves
// @access  Private (employee)
// ---------------------------------------------------
export const applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "leaveType, startDate, endDate and reason are required",
      });
    }

    if (!VALID_LEAVE_TYPES.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: `leaveType must be one of: ${VALID_LEAVE_TYPES.join(", ")}`,
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Leave end date cannot be before start date",
      });
    }

    const totalLeaveDays = calculateLeaveDays(startDate, endDate);

    const leave = await Leave.create({
      employee: req.user._id, // should come from auth middleware
      leaveType,
      startDate,
      endDate,
      totalLeaveDays,
      reason,
      status: "Pending",
    });

    const admins = await User.find({ role: "Admin" }).select(
      "firstName lastName email",
    );

    // ---- Email notification to admins ----
    const adminEmails = admins.map((a) => a.email).filter(Boolean);
    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails.join(","),
        subject: `New Leave Request - ${req.user.firstName} ${req.user.lastName}`,
        html: `
          <h3>New Leave Request</h3>
          <p><b>Employee:</b> (${req.user.firstName} ${req.user.lastName}) (${req.user.email})</p>
          <p><b>Leave Type:</b> ${leaveType}</p>
          <p><b>From:</b> ${startDate} <b>To:</b> ${endDate}</p>
          <p><b>Total Days:</b> ${totalLeaveDays}</p>
          <p><b>Reason:</b> ${reason}</p>
        `,
      });
    }

    // ---- In-app notification to admins ----
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          recipient: admin._id,
          recipientRole: "admin",
          sender: req.user._id,
          type: "LEAVE_APPLIED",
          message: `${req.user.firstName} ${req.user.lastName} has applied for ${leaveType} leave from (${new Date(
            startDate,
          ).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}). Status: Pending`,
          relatedLeave: leave._id,
        }),
      ),
    );

    return res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while applying for leave",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Get all leaves (admin) with optional filters
// @route   GET /api/leaves?status=Pending&employee=<id>&leaveType=Sick Leave
// @access  Private (admin)
// ---------------------------------------------------
export const getAllLeaves = async (req, res) => {
  try {
    const { status, employee, leaveType } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (leaveType) filter.leaveType = leaveType;

    const leaves = await Leave.find(filter)
      .populate("employee", "firstName lastName email")
      .populate("approvedOrRejectedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while fetching leaves",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Get leaves of the logged-in employee
// @route   GET /api/leaves/my-leaves
// @access  Private (employee)
// ---------------------------------------------------
export const getMyLeaves = async (req, res) => {
  try {
    const { status } = req.query; // optional filter

    const filter = { employee: req.user._id };
    if (status) filter.status = status;

    const leaves = await Leave.find(filter)
      .populate("approvedOrRejectedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while fetching your leaves",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Get single leave by ID
// @route   GET /api/leaves/:id
// @access  Private
// ---------------------------------------------------
export const getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate("employee", "firstName lastName email")
      .populate("approvedOrRejectedBy", "firstName lastName email");

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while fetching leave",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Update leave details (only while still Pending)
// @route   PUT /api/leaves/:id
// @access  Private (employee - owner)
// ---------------------------------------------------
export const updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found",
      });
    }

    if (leave.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own leave",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only a Pending leave can be edited",
      });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    if (leaveType && !VALID_LEAVE_TYPES.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: `leaveType must be one of: ${VALID_LEAVE_TYPES.join(", ")}`,
      });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Leave end date cannot be before start date",
      });
    }

    if (leaveType) leave.leaveType = leaveType;
    if (startDate) leave.startDate = startDate;
    if (endDate) leave.endDate = endDate;
    if (reason) leave.reason = reason;

    if (startDate || endDate) {
      leave.totalLeaveDays = calculateLeaveDays(
        startDate || leave.startDate,
        endDate || leave.endDate,
      );
    }

    await leave.save();

    return res.status(200).json({
      success: true,
      message: "Leave updated successfully",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while updating leave",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Approve a leave (admin)
// @route   PATCH /api/leaves/:id/approve
// @access  Private (admin)
// ---------------------------------------------------
export const approveLeave = async (req, res) => {
  try {
    const { adminComment } = req.body;

    const leave = await Leave.findById(req.params.id).populate(
      "employee",
      "firstName lastName email",
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "This leave has already been processed",
      });
    }

    leave.status = "Approved";
    leave.adminComment = adminComment || "";
    leave.approvedOrRejectedBy = req.user._id;
    leave.approvedOrRejectedDate = new Date();

    await leave.save();

    // ---- Email notification to employee ----
    await sendEmail({
      to: leave.employee.email,
      subject: "Your leave has been approved.",
      html: `
        <h3>Leave Approved ✅</h3>
        <p>Hi ${leave.employee.firstName},</p>
        <p><b>Leave Type:</b> ${leave.leaveType}</p>
        <p><b>From:</b> ${leave.startDate.toDateString()} <b>To:</b> ${leave.endDate.toDateString()}</p>
        ${
          leave.adminComment?.trim()
            ? `<p><b>Admin Comment:</b> ${leave.adminComment}</p>`
            : ""
        }
      `,
    });

    // ---- In-app notification to employee ----
    await createNotification({
      recipient: leave.employee._id,
      recipientRole: "user",
      sender: req.user._id,
      type: "LEAVE_APPROVED",
      message: `${leave.employee.firstName}, your ${leave.leaveType} leave has been approved. Status: Approved`,
      relatedLeave: leave._id,
    });

    return res.status(200).json({
      success: true,
      message: "Leave approved successfully",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while approving leave",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Reject a leave (admin)
// @route   PATCH /api/leaves/:id/reject
// @access  Private (admin)
// ---------------------------------------------------
export const rejectLeave = async (req, res) => {
  try {
    const { adminComment } = req.body;

    const leave = await Leave.findById(req.params.id).populate(
      "employee",
      "firstName lastName email",
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "This leave has already been processed",
      });
    }

    leave.status = "Rejected";
    leave.adminComment = adminComment || "";
    leave.approvedOrRejectedBy = req.user._id;
    leave.approvedOrRejectedDate = new Date();

    await leave.save();

    // ---- Email notification to employee ----
    await sendEmail({
      to: leave.employee.email,
      subject: "Your leave request has been rejected",
      html: `
        <h3>Leave Rejected ❌</h3>
        <p>Hi ${leave.employee.firstName},</p>
        <p><b>Leave Type:</b> ${leave.leaveType}</p>
        <p><b>From:</b> ${leave.startDate.toDateString()} <b>To:</b> ${leave.endDate.toDateString()}</p>
        <p><b>Admin Comment:</b> ${leave.adminComment}</p>
      `,
    });

    // ---- In-app notification to employee ----
    await createNotification({
      recipient: leave.employee._id,
      recipientRole: "user",
      sender: req.user._id,
      type: "LEAVE_REJECTED",
      message: `${leave.employee.firstName}, your ${leave.leaveType} leave has been rejected. Status: Rejected${
        adminComment ? ` (Reason: ${adminComment})` : ""
      }`,
      relatedLeave: leave._id,
    });

    return res.status(200).json({
      success: true,
      message: "Leave rejected",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while rejecting leave",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Cancel a leave (employee, only while Pending)
// @route   PATCH /api/leaves/:id/cancel
// @access  Private (employee - owner)
// ---------------------------------------------------
export const cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found",
      });
    }

    if (leave.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own leave",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only a Pending leave can be cancelled",
      });
    }

    leave.status = "Cancelled";
    await leave.save();

    // ---- In-app notification to admins ----
    const admins = await User.find({ role: "Admin" }).select("_id");
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          recipient: admin._id,
          recipientRole: "admin",
          sender: req.user._id,
          type: "LEAVE_CANCELLED",
          message: `${req.user.firstName} ${req.user.lastName} has cancelled their ${leave.leaveType} leave. Status: Cancelled`,
          relatedLeave: leave._id,
        }),
      ),
    );

    return res.status(200).json({
      success: true,
      message: "Leave cancelled successfully",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while cancelling leave",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Delete a leave record permanently
// @route   DELETE /api/leaves/:id
// @access  Private (admin)
// ---------------------------------------------------
export const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave record deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while deleting leave",
      error: error.message,
    });
  }
};

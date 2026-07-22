import Leave from "../models/leave.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
// ---------------------------------------------------
// Schema ke enum se match karta valid leaveType list
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
// Helper: total leave days calculate karne ke liye
// (simple version — weekends/holidays exclude nahi kar rahe,
// agar chahiye to yahan logic add kar sakte hain)
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
        message: "leaveType, startDate, endDate aur reason zaroori hain",
      });
    }

    if (!VALID_LEAVE_TYPES.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: `leaveType inme se hona chahiye: ${VALID_LEAVE_TYPES.join(", ")}`,
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
      employee: req.user._id, // auth middleware se aana chahiye
      leaveType,
      startDate,
      endDate,
      totalLeaveDays,
      reason,
    });

    const admins = await User.find({ role: "Admin" }).select("email");
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

    return res.status(201).json({
      success: true,
      message: "Leave application submit ho gayi",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Leave apply error",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Get all leaves (admin) with optional filters
// @route   GET /api/leaves?status=Pending&employee=<id>
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
      .populate("employee", "name email")
      .populate("approvedOrRejectedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Leaves fetch karte waqt error aayi",
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
    const leaves = await Leave.find({ employee: req.user._id })
      .populate("approvedOrRejectedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Aapki leaves fetch karte waqt error aayi",
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
      .populate("employee", "name email")
      .populate("approvedOrRejectedBy", "name email");

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record nahi mila",
      });
    }

    return res.status(200).json({
      success: true,
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Leave fetch karte waqt error aayi",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Update leave details (sirf jab tak Pending ho)
// @route   PUT /api/leaves/:id
// @access  Private (employee - owner)
// ---------------------------------------------------
export const updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record nahi mila",
      });
    }

    if (leave.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Aap sirf apni leave edit kar sakte hain",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Sirf Pending leave hi edit ki ja sakti hai",
      });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    if (leaveType && !VALID_LEAVE_TYPES.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: `leaveType inme se hona chahiye: ${VALID_LEAVE_TYPES.join(", ")}`,
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
      message: "Leave update ho gayi",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Leave update karte waqt error aayi",
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

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record nahi mila",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Yeh leave pehle hi process ho chuki hai",
      });
    }

    leave.status = "Approved";
    leave.adminComment = adminComment || "";
    leave.approvedOrRejectedBy = req.user._id;
    leave.approvedOrRejectedDate = new Date();

    await leave.save();

    const populatedLeave = await leave.populate(
      "employee",
      "firstName lastName email",
    );

    await sendEmail({
      to: populatedLeave.employee.email,
      subject: "Your leave has been approved.",
      html: `
    <h3>Leave Approved ✅</h3>
    <p>Hi ${populatedLeave.employee.firstName},</p>

    <p><b>Leave Type:</b> ${leave.leaveType}</p>
    <p><b>From:</b> ${leave.startDate.toDateString()} <b>To:</b> ${leave.endDate.toDateString()}</p>

    ${
      leave.adminComment?.trim()
        ? `<p><b>Admin Comment:</b> ${leave.adminComment}</p>`
        : ""
    }
  `,
    });

    return res.status(200).json({
      success: true,
      message: "Leave approve ",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Leave approve error",
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

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record nahi mila",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Yeh leave pehle hi process ho chuki hai",
      });
    }

    leave.status = "Rejected";
    leave.adminComment = adminComment || "";
    leave.approvedOrRejectedBy = req.user._id;
    leave.approvedOrRejectedDate = new Date();

    await leave.save();
    const populatedLeave = await leave.populate(
      "employee",
      "firstName lastName email",
    );

    await sendEmail({
      to: populatedLeave.employee.email,
      subject: "Your leave request has been rejected",
      html: `
        <h3>Leave Rejected ❌</h3>
        <p>Hi ${populatedLeave.employee.firstName},</p>
        <p><b>Leave Type:</b> ${leave.leaveType}</p>
        <p><b>From:</b> ${leave.startDate.toDateString()} <b>To:</b> ${leave.endDate.toDateString()}</p>
        <p><b>Admin Comment:</b> ${leave.adminComment}</p>
      `,
    });
    return res.status(200).json({
      success: true,
      message: "Leave rejected",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Leave reject karte waqt error aayi",
      error: error.message,
    });
  }
};

// ---------------------------------------------------
// @desc    Cancel a leave (employee, sirf Pending state me)
// @route   PATCH /api/leaves/:id/cancel
// @access  Private (employee - owner)
// ---------------------------------------------------
export const cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record nahi mila",
      });
    }

    if (leave.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Aap sirf apni leave cancel kar sakte hain",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Sirf Pending leave hi cancel ki ja sakti hai",
      });
    }

    leave.status = "Cancelled";
    await leave.save();

    return res.status(200).json({
      success: true,
      message: "Leave cancel kar di gayi",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Leave cancel karte waqt error aayi",
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
        message: "Leave record nahi mila",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave record delete ho gaya",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Leave delete karte waqt error aayi",
      error: error.message,
    });
  }
};

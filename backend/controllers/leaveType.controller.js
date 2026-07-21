import LeaveType from "../models/leaveType.js";

// @desc    Create a new leave type
// @route   POST /api/leave-types
export const createLeaveType = async (req, res) => {
  try {
    const { name, description, maxAllowedDays, isPaid, status } = req.body;

    if (!name || maxAllowedDays === undefined || isPaid === undefined) {
      return res.status(400).json({
        success: false,
        message: "name, maxAllowedDays and isPaid are required fields",
      });
    }

    const existing = await LeaveType.findOne({ leaveTypeName: name.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Leave type with this name already exists",
      });
    }

    const leaveType = await LeaveType.create({
      leaveTypeName: name,
      description,
      maximumAllowedDays: maxAllowedDays,
      paidOrUnpaid: isPaid ? "Paid" : "Unpaid",
      status: status
        ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        : "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Leave type created successfully",
      data: leaveType,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create leave type",
      error: error.message,
    });
  }
};

// @desc    Get all leave types (supports ?status=active filter)
// @route   GET /api/leave-types
export const getAllLeaveTypes = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      // query me "active" aa sakta hai, schema enum "Active"/"Inactive" expect karta hai
      filter.status =
        req.query.status.charAt(0).toUpperCase() +
        req.query.status.slice(1).toLowerCase();
    }

    const leaveTypes = await LeaveType.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leaveTypes.length,
      data: leaveTypes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leave types",
      error: error.message,
    });
  }
};

// @desc    Get single leave type by ID
// @route   GET /api/leave-types/:id
export const getLeaveTypeById = async (req, res) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id);

    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found",
      });
    }

    return res.status(200).json({ success: true, data: leaveType });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leave type",
      error: error.message,
    });
  }
};

// @desc    Update a leave type
// @route   PUT /api/leave-types/:id
export const updateLeaveType = async (req, res) => {
  try {
    const { name, description, maxAllowedDays, isPaid, status } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.leaveTypeName = name;
    if (description !== undefined) updateData.description = description;
    if (maxAllowedDays !== undefined)
      updateData.maximumAllowedDays = maxAllowedDays;
    if (isPaid !== undefined)
      updateData.paidOrUnpaid = isPaid ? "Paid" : "Unpaid";
    if (status !== undefined) {
      updateData.status =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    const leaveType = await LeaveType.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave type updated successfully",
      data: leaveType,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update leave type",
      error: error.message,
    });
  }
};

// @desc    Delete a leave type
// @route   DELETE /api/leave-types/:id
export const deleteLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.findByIdAndDelete(req.params.id);

    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave type deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete leave type",
      error: error.message,
    });
  }
};

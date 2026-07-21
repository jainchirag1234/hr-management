import mongoose from "mongoose";
import Designation from "../models/designation.js";
import Department from "../models/department.js";
import User from "../models/User.js";

// @desc    Create a new designation
// @route   POST /api/designations
export const createDesignation = async (req, res) => {
  try {
    const { name, department, description, status } = req.body;

    if (!name || !department) {
      return res.status(400).json({
        success: false,
        message: "Name and department are required",
      });
    }

    const existing = await Designation.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Designation with this name already exists",
      });
    }

    const designation = await Designation.create({
      name,
      department,
      description,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Designation created successfully",
      data: designation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create designation",
      error: error.message,
    });
  }
};

// @desc    Get all designations
// @route   GET /api/designations
export const getDesignations = async (req, res) => {
  try {
    const { status, department } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const designations = await Designation.find(filter)
      .populate("department", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: designations.length,
      data: designations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch designations",
      error: error.message,
    });
  }
};

// @desc    Get single designation by ID
// @route   GET /api/designations/:id
export const getDesignationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid designation ID",
      });
    }

    const designation = await Designation.findById(id).populate(
      "department",
      "name",
    );

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: designation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch designation",
      error: error.message,
    });
  }
};

// @desc    Update designation
// @route   PUT /api/designations/:id
export const updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, description, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid designation ID",
      });
    }

    const designationToUpdate = await Designation.findById(id);
    if (!designationToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
      });
    }
    const oldName = designationToUpdate.name;

    if (name) {
      const existing = await Designation.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Another designation with this name already exists",
        });
      }
    }

    const designation = await Designation.findByIdAndUpdate(
      id,
      { name, department, description, status },
      { new: true, runValidators: true },
    );

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
      });
    }

    let userUpdates = {};
    if (name && oldName !== designation.name) {
      userUpdates.designation = designation.name;
    }

    if (department && String(designationToUpdate.department) !== String(department)) {
      const newDept = await Department.findById(department);
      if (newDept) {
        userUpdates.department = newDept.name;
      }
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.updateMany(
        { designation: oldName },
        { $set: userUpdates }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Designation updated successfully",
      data: designation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update designation",
      error: error.message,
    });
  }
};

// @desc    Delete designation
// @route   DELETE /api/designations/:id
export const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid designation ID",
      });
    }

    const designation = await Designation.findByIdAndDelete(id);

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Designation deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete designation",
      error: error.message,
    });
  }
};

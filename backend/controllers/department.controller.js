import Department from "../models/department.js";
import User from "../models/User.js"; // apna actual path dena

// @desc    Create new department
// @route   POST /api/departments
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, manager, status } = req.body;

    if (!name || !code || !manager) {
      return res.status(400).json({
        success: false,
        message: "Department name, code and manager are required",
      });
    }

    const existing = await Department.findOne({
      $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Department with this name or code already exists",
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || "",
      manager,
      status: status ? status.trim().toLowerCase() : "active", // 👈 normalize case
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error("createDepartment error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid manager ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating department",
    });
  }
};

// @desc    Get all departments
// @route   GET /api/departments
export const getDepartments = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status.trim().toLowerCase(); // 👈 normalize case
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const departments = await Department.find(filter)
      .populate("manager", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    console.error("getDepartments error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching departments",
    });
  }
};

// @desc    Get single department by ID
// @route   GET /api/departments/:id
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate(
      "manager",
      "firstName lastName email",
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error("getDepartmentById error:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while fetching department",
    });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
export const updateDepartment = async (req, res) => {
  try {
    const { name, code, description, manager, status } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const oldName = department.name;

    if (name || code) {
      const duplicate = await Department.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(name ? [{ name: name.trim() }] : []),
          ...(code ? [{ code: code.trim().toUpperCase() }] : []),
        ],
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another department with this name or code already exists",
        });
      }
    }

    if (name !== undefined) department.name = name.trim();
    if (code !== undefined) department.code = code.trim().toUpperCase();
    if (description !== undefined) department.description = description;
    if (manager !== undefined) department.manager = manager;
    if (status !== undefined) department.status = status.trim().toLowerCase(); // 👈 normalize case

    await department.save();

    if (name !== undefined && oldName !== department.name) {
      await User.updateMany(
        { department: oldName },
        { $set: { department: department.name } },
      );
    }

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    console.error("updateDepartment error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department or manager ID",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while updating department",
    });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    await department.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("deleteDepartment error:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while deleting department",
    });
  }
};

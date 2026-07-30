import SalaryStructure from "../models/SalaryStructure.js";
import SalaryRevision from "../models/SalaryRevision.js";

// POST /api/salary/structure  (Admin only)
export const createStructure = async (req, res) => {
  try {
    const {
      employeeId,
      basic,
      hra,
      allowances,
      deductions,
      bonus,
      bankDetails,
      effectiveFrom,
    } = req.body;

    const existing = await SalaryStructure.findOne({
      employeeId,
      isActive: true,
    });
    if (existing) {
      return res
        .status(400)
        .json({
          message:
            "Active salary structure already exists. Use update/revision instead.",
        });
    }

    const totalAllowances = Object.values(allowances || {}).reduce(
      (a, b) => a + (b || 0),
      0,
    );
    const totalDeductions = Object.values(deductions || {}).reduce(
      (a, b) => a + (b || 0),
      0,
    );
    const grossSalary = basic + hra + totalAllowances + (bonus || 0);
    const ctc = grossSalary * 12;

    const structure = await SalaryStructure.create({
      employeeId,
      basic,
      hra,
      allowances,
      deductions,
      bonus,
      grossSalary,
      totalDeductions,
      ctc,
      bankDetails,
      effectiveFrom,
      createdBy: req.user.id,
    });

    res
      .status(201)
      .json({ message: "Salary structure created", data: structure });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating salary structure", error: err.message });
  }
};

// GET /api/salary/structure/:employeeId  (Admin or self)
export const getStructure = async (req, res) => {
  try {
    const structure = await SalaryStructure.findOne({
      employeeId: req.params.employeeId,
      isActive: true,
    });

    if (!structure) {
      return res
        .status(404)
        .json({ message: "No active salary structure found" });
    }

    res.status(200).json({ data: structure });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching salary structure", error: err.message });
  }
};

// PUT /api/salary/structure/:employeeId  (Admin only — creates a revision)
export const updateStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const {
      basic,
      hra,
      allowances,
      deductions,
      bonus,
      bankDetails,
      effectiveFrom,
      revisionType,
      remarks,
    } = req.body;

    const oldStructure = await SalaryStructure.findOne({
      employeeId,
      isActive: true,
    });
    if (!oldStructure) {
      return res
        .status(404)
        .json({
          message: "No existing structure to revise. Create one first.",
        });
    }

    const totalAllowances = Object.values(allowances || {}).reduce(
      (a, b) => a + (b || 0),
      0,
    );
    const totalDeductions = Object.values(deductions || {}).reduce(
      (a, b) => a + (b || 0),
      0,
    );
    const grossSalary = basic + hra + totalAllowances + (bonus || 0);
    const ctc = grossSalary * 12;

    oldStructure.isActive = false;
    await oldStructure.save();

    const newStructure = await SalaryStructure.create({
      employeeId,
      basic,
      hra,
      allowances,
      deductions,
      bonus,
      grossSalary,
      totalDeductions,
      ctc,
      bankDetails,
      effectiveFrom,
      createdBy: req.user.id,
    });

    const percentageChange =
      ((newStructure.grossSalary - oldStructure.grossSalary) /
        oldStructure.grossSalary) *
      100;

    await SalaryRevision.create({
      employeeId,
      previousStructureId: oldStructure._id,
      newStructureId: newStructure._id,
      revisionType: revisionType || "correction",
      percentageChange: percentageChange.toFixed(2),
      effectiveFrom,
      remarks,
      approvedBy: req.user.id,
    });

    res
      .status(200)
      .json({ message: "Salary structure revised", data: newStructure });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating salary structure", error: err.message });
  }
};

// GET /api/salary/revisions/:employeeId  (Admin or self)
export const getRevisions = async (req, res) => {
  try {
    const revisions = await SalaryRevision.find({
      employeeId: req.params.employeeId,
    })
      .sort({ effectiveFrom: -1 })
      .populate("previousStructureId newStructureId");

    res.status(200).json({ data: revisions });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching revisions", error: err.message });
  }
};

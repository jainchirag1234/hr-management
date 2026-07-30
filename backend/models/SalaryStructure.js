import mongoose from "mongoose";

const salaryStructureSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    basic: {
      type: Number,
      required: true,
    },
    hra: {
      type: Number,
      required: true,
    },
    allowances: {
      type: Object,
      default: {},
    },
    deductions: {
      type: Object,
      default: {},
    },
    bonus: {
      type: Number,
      default: 0,
    },
    grossSalary: {
      type: Number,
      required: true,
    },
    totalDeductions: {
      type: Number,
      required: true,
    },
    ctc: {
      type: Number,
      required: true,
    },
    bankDetails: {
      type: Object,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);

export default SalaryStructure;

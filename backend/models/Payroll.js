import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salaryStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructure",
      required: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },

    workingDays: { type: Number, required: true, min: 0 },
    presentDays: { type: Number, required: true, min: 0 },
    paidLeaveDays: { type: Number, default: 0, min: 0 },
    unpaidLeaveDays: { type: Number, default: 0, min: 0 },
    lopDeduction: { type: Number, default: 0, min: 0 },

    grossPay: { type: Number, required: true, min: 0 },
    totalDeductions: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Processing", "Paid"],
      default: "Pending",
    },
    paymentDate: {
      type: Date,
    },
    paymentMode: {
      type: String,
      enum: ["Bank Transfer", "Cheque", "Cash", null],
      default: null,
    },
    transactionRef: {
      type: String,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const Payroll = mongoose.model("Payroll", payrollSchema);

export default Payroll;

import mongoose from "mongoose";

const salaryRevisionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    previousStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructure",
    },
    newStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructure",
      required: true,
    },
    revisionType: {
      type: String,
      enum: ["increment", "promotion", "correction", "demotion"],
      required: true,
    },
    percentageChange: {
      type: Number,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const SalaryRevision = mongoose.model("SalaryRevision", salaryRevisionSchema);

export default SalaryRevision;

import express from "express";
import {
  createStructure,
  getStructure,
  updateStructure,
  getRevisions,
  getAllStructures,
  updateBankDetails,
} from "../controllers/salaryStructure.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/structure", protect, authorize("admin"), createStructure);
router.get("/structure", protect, authorize("admin"), getAllStructures);
router.get("/structure/:employeeId", protect, getStructure);
router.put(
  "/structure/:employeeId",
  protect,
  authorize("admin"),
  updateStructure,
);
router.get("/revisions/:employeeId", protect, getRevisions);
router.patch("/structure/:employeeId/bank-details", protect, updateBankDetails);

export default router;

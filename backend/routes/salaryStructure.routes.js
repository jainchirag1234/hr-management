import express from "express";
import {
  createStructure,
  getStructure,
  updateStructure,
  getRevisions,
} from "../controllers/salaryStructure.Controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/structure", protect, authorize("admin"), createStructure);
router.get("/structure/:employeeId", protect, getStructure);
router.put("/structure/:employeeId", protect, authorize("admin"), updateStructure);
router.get("/revisions/:employeeId", protect, getRevisions);

export default router;
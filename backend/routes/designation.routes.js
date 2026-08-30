import express from "express";
import {
  createDesignation,
  getDesignations,
  getDesignationById,
  updateDesignation,
  deleteDesignation,
} from "../controllers/designation.controller.js";

const router = express.Router();

router.post("/", createDesignation);
router.get("/", getDesignations);
router.get("/:id", getDesignationById);
router.put("/:id", updateDesignation);
router.delete("/:id", deleteDesignation);

export default router;

import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller.js";

// agar auth/admin middleware use kar rahe ho to yaha import kar lena
// import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router
  .route("/")
  .post(createDepartment) // POST /api/departments
  .get(getDepartments); // GET /api/departments

router
  .route("/:id")
  .get(getDepartmentById) // GET /api/departments/:id
  .put(updateDepartment) // PUT /api/departments/:id
  .delete(deleteDepartment); // DELETE /api/departments/:id

export default router;

import express from "express";
import {
  createUser,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  forgotPassword,
  resetPassword,
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/create", createUser);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/", getAllUsers);
router.get("/:id", getUserById);

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);

router.patch("/:id/status", updateUserStatus);

export default router;

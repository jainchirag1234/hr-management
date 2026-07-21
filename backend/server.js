import dotenv from "dotenv";
dotenv.config(); // ✅ Sabse pehle — taaki JWT_SECRET sab jagah available ho

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/user.route.js";
import departmentRoutes from "./routes/department.routes.js";
import designationRoutes from "./routes/designation.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import leaveTypeRoutes from "./routes/leaveType.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import holidayRoutes from "./routes/holiday.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
const app = express();

// Connect Database
connectDB();

// ✅ CORS Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// Parse JSON — limit 10mb (Base64 profile image ke liye)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes

app.use("/api/user", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave-types", leaveTypeRoutes); // ✅ Fix: leaveTypeRoutes use karo
app.use("/api/leaves", leaveRoutes); // ✅ Leave applications
app.use("/api/holidays", holidayRoutes);
app.use("/api/announcements", announcementRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});

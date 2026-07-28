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
import notificationRoutes from "./routes/notification.routes.js";
import http from "http";
import { initSocket } from "./utils/socket.js";

const app = express();
const server = http.createServer(app);
initSocket(server);

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
app.use("/api/leave-types", leaveTypeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/announcements", announcementRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});

// Badi Base64 image upload ke liye timeout badhao (2 minutes)
server.timeout = 120000;

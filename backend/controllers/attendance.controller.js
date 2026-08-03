import Attendance from "../models/Attendance.js";
import mongoose from "mongoose";
import User from "../models/User.js";

// ======================================
// CREATE ATTENDANCE
// ======================================
export const createAttendance = async (req, res) => {
  try {
    const {
      employee,
      date,
      checkInTime,
      checkOutTime,
      attendanceStatus,
      notes,
    } = req.body || {};

    if (checkOutTime && !checkInTime) {
      return res.status(400).json({
        success: false,
        message: "Check-out cannot happen without check-in",
      });
    }

    if (employee && date) {
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      const existingAttendance = await Attendance.findOne({
        employee,
        date: attendanceDate,
      });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          message: "Duplicate attendance should not be allowed",
        });
      }
    }

    let workingHours = 0;

    if (checkInTime && checkOutTime) {
      const checkIn = new Date(`1970-01-01T${checkInTime}:00`);
      const checkOut = new Date(`1970-01-01T${checkOutTime}:00`);

      const diff = (checkOut - checkIn) / (1000 * 60 * 60);
      workingHours = diff > 0 ? diff : 0;
    }

    const attendance = await Attendance.create({
      employee,
      date,
      checkInTime,
      checkOutTime,
      workingHours,
      attendanceStatus,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Attendance created successfully",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// EMPLOYEE CHECK IN
// ======================================
export const checkIn = async (req, res) => {
  try {
    const { employee } = req.body || {};

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyCheckedIn = await Attendance.findOne({
      employee,
      date: today,
    });

    if (alreadyCheckedIn) {
      return res.status(400).json({
        success: false,
        message: "Employee already checked in today",
      });
    }

    const currentTime = new Date().toTimeString().slice(0, 5);

    // ✅ Late Attendance Logic: 10:30 AM ke baad check-in = "Late"
    const LATE_THRESHOLD = "10:30";
    const attendanceStatus = currentTime > LATE_THRESHOLD ? "Late" : "Present";

    const attendance = await Attendance.create({
      employee,
      date: today,
      checkInTime: currentTime,
      attendanceStatus,
    });

    res.status(201).json({
      success: true,
      message: "Check-in successful",
      attendance,
    });
  } catch (error) {
    console.error("CheckIn Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// EMPLOYEE CHECK OUT
// ======================================
export const checkOut = async (req, res) => {
  try {
    const { employee } = req.body || {};

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee,
      date: today,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Check-in record not found",
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: "Employee already checked out",
      });
    }

    const currentTime = new Date().toTimeString().slice(0, 5);

    attendance.checkOutTime = currentTime;

    const checkIn = new Date(`1970-01-01T${attendance.checkInTime}:00`);
    const checkOut = new Date(`1970-01-01T${currentTime}:00`);

    attendance.workingHours = (checkOut - checkIn) / (1000 * 60 * 60);

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Check-out successful",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// GET TODAY ATTENDANCE
// ======================================
export const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      date: today,
    })
      .populate("employee", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// ATTENDANCE HISTORY OF EMPLOYEE
// ======================================
export const getAttendanceHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const attendance = await Attendance.find({
      employee: employeeId,
    })
      .populate("employee", "firstName lastName email")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// GET ALL ATTENDANCE
// ======================================
export const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("employee", "firstName lastName email")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// GET SINGLE ATTENDANCE
// ======================================
export const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate(
      "employee",
      "firstName lastName email",
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// UPDATE ATTENDANCE
// ======================================
export const updateAttendance = async (req, res) => {
  try {
    const { checkInTime, checkOutTime, attendanceStatus, notes } = req.body;

    if (checkOutTime) {
      const existing = await Attendance.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Attendance not found",
        });
      }

      const finalCheckInTime = checkInTime || existing.checkInTime;

      if (!finalCheckInTime) {
        return res.status(400).json({
          success: false,
          message: "Check-out cannot happen without check-in",
        });
      }
    }

    const updateData = {
      checkInTime,
      checkOutTime,
      attendanceStatus,
      notes,
    };

    if (checkInTime && checkOutTime) {
      const checkIn = new Date(`1970-01-01T${checkInTime}:00`);
      const checkOut = new Date(`1970-01-01T${checkOutTime}:00`);

      updateData.workingHours = (checkOut - checkIn) / (1000 * 60 * 60);
    } else if (checkOutTime || checkInTime) {
      // If updating only one of them, calculate based on existing
      const existing = await Attendance.findById(req.params.id);
      if (existing) {
        const finalCheckIn = checkInTime || existing.checkInTime;
        const finalCheckOut = checkOutTime || existing.checkOutTime;
        if (finalCheckIn && finalCheckOut) {
          const checkIn = new Date(`1970-01-01T${finalCheckIn}:00`);
          const checkOut = new Date(`1970-01-01T${finalCheckOut}:00`);
          updateData.workingHours = (checkOut - checkIn) / (1000 * 60 * 60);
        }
      }
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    ).populate("employee", "firstName lastName email");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// DELETE ATTENDANCE
// ======================================
export const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getMonthlyAttendanceSummary = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;

    const summary = await Attendance.aggregate([
      {
        $match: {
          employee: new mongoose.Types.ObjectId(employeeId),
          month: Number(month),
          year: Number(year),
        },
      },
      {
        $group: {
          _id: "$attendanceStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Total working days bhi nikaal lo
    const totalDays = await Attendance.countDocuments({
      employee: employeeId,
      month: Number(month),
      year: Number(year),
    });

    // Result ko readable format mein convert karo
    const statusWiseCount = {
      Present: 0,
      Absent: 0,
      "Half Day": 0,
      Late: 0,
      "On Leave": 0,
      "Work From Home": 0,
    };

    summary.forEach((item) => {
      statusWiseCount[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      totalDays,
      summary: statusWiseCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Year-wise total days summary (month by month breakdown)
export const getYearlyAttendanceSummary = async (req, res) => {
  try {
    const { employeeId, year } = req.query;

    const summary = await Attendance.aggregate([
      {
        $match: {
          employee: new mongoose.Types.ObjectId(employeeId),
          year: Number(year),
        },
      },
      {
        $group: {
          _id: { month: "$month", status: "$attendanceStatus" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.month",
          statuses: {
            $push: { status: "$_id.status", count: "$count" },
          },
          totalDays: { $sum: "$count" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      year,
      monthlyBreakdown: summary,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================
// GET EMPLOYEE ATTENDANCE CALENDAR
// Joining date se aaj tak har din ka record (Not Marked bhi)
// GET /api/attendance/calendar/:employeeId?page=1&limit=7
// ======================================
export const getEmployeeAttendanceCalendar = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 7));

    // 1. Employee fetch karo
    const employee = await User.findById(employeeId).select(
      "joiningDate firstName lastName",
    );
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }
    if (!employee.joiningDate) {
      return res.status(400).json({
        success: false,
        message: "Employee joining date not set",
      });
    }

    // 2. Date range setup (using local date parts to construct a stable UTC midnight date)
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    
    // Parse joining date safely
    const empJoin = new Date(employee.joiningDate);
    const joiningDate = new Date(Date.UTC(empJoin.getFullYear(), empJoin.getMonth(), empJoin.getDate()));

    if (joiningDate > today) {
      return res.status(400).json({
        success: false,
        message: "Joining date is in the future",
      });
    }

    // 3. Today se joining date tak saare din ka array (latest first)
    const allDays = [];
    const cursor = new Date(today);
    while (cursor >= joiningDate) {
      allDays.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const totalDays = allDays.length;
    const totalPages = Math.ceil(totalDays / limit);

    // 4. Is page ke liye slice
    const pageDays = allDays.slice((page - 1) * limit, page * limit);

    // 5. In dino ke attendance records ek hi query mein fetch karo
    const from = pageDays[pageDays.length - 1]; // oldest day in page
    const to = pageDays[0]; // newest day in page

    const dbRecords = await Attendance.find({
      employee: new mongoose.Types.ObjectId(employeeId),
      date: { $gte: from, $lte: to },
    });

    // date string -> record map banao
    const recordMap = {};
    dbRecords.forEach((r) => {
      const key = new Date(r.date).toISOString().split("T")[0];
      recordMap[key] = r;
    });

    // 6. Har din ke liye merge karo
    const records = pageDays.map((day) => {
      const key = day.toISOString().split("T")[0];
      const existing = recordMap[key];
      const isSunday = day.getUTCDay() === 0;

      if (existing) {
        return {
          _id: existing._id,
          date: key,
          attendanceStatus: isSunday ? "Weekly Off" : existing.attendanceStatus,
          checkInTime: existing.checkInTime || null,
          checkOutTime: existing.checkOutTime || null,
          workingHours: existing.workingHours ?? null,
          notes: existing.notes || "",
          isNotMarked: false,
          isSundayOff: isSunday,
        };
      }
      return {
        _id: null,
        date: key,
        attendanceStatus: isSunday ? "Weekly Off" : "Not Marked",
        checkInTime: null,
        checkOutTime: null,
        workingHours: null,
        notes: null,
        isNotMarked: !isSunday, // Sunday hai toh 'Not Marked' ki tarah treat nahi karenge
        isSundayOff: isSunday,
      };
    });

    res.status(200).json({
      success: true,
      employeeId,
      joiningDate: employee.joiningDate,
      totalDays,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      records,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

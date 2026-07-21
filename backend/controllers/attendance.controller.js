import Attendance from "../models/Attendance.js";

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

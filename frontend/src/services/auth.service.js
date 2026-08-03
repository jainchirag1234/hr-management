import api from "../api/axios";

// ======================================
// CREATE User
// POST /api/user/create
// ======================================
export const createUser = (data) => {
  return api.post("/user/create", data);
};

// ======================================
// LOGIN
// POST /api/user/login
// ======================================
export const loginUser = (data) => {
  return api.post("/user/login", data);
};

// ======================================
// GET ALL Users
// GET /api/user
// ======================================
export const getAllUsers = () => {
  return api.get("/user");
};

// ======================================
// GET User BY ID
// GET /api/user/:id
// ======================================
export const getUserById = (id) => {
  return api.get(`/user/${id}`);
};

// ======================================
// UPDATE User
// PUT /api/user/:id
// ======================================
export const updateUser = (id, data) => {
  return api.put(`/user/${id}`, data);
};

// ======================================
// DELETE User
// DELETE /api/user/:id
// ======================================
export const deleteUser = (id) => {
  return api.delete(`/user/${id}`);
};

// ======================================
// UPDATE STATUS
// PATCH /api/user/:id/status
// ======================================
export const updateUserStatus = (id, status) => {
  return api.patch(`/user/${id}/status`, { status });
};
// ==========================
// GET ALL USERS
// ==========================

export const createDepartment = (data) => {
  return api.post("/departments", data);
};

// ======================================
// GET ALL DEPARTMENTS
// GET /api/departments
// ======================================
export const getDepartments = () => {
  return api.get("/departments");
};

// ======================================
// GET DEPARTMENT BY ID
// GET /api/departments/:id
// ======================================
export const getDepartmentById = (id) => {
  return api.get(`/departments/${id}`);
};

// ======================================
// UPDATE DEPARTMENT
// PUT /api/departments/:id
// ======================================
export const updateDepartment = (id, data) => {
  return api.put(`/departments/${id}`, data);
};

// ======================================
// DELETE DEPARTMENT
// DELETE /api/departments/:id
// ======================================
export const deleteDepartment = (id) => {
  return api.delete(`/departments/${id}`);
};

// ======================================
// GET ALL DEPARTMENTS
// GET /api/departments
// ======================================

// ======================================
// CREATE DESIGNATION
// POST /api/designations
// ======================================
export const createDesignation = (data) => {
  return api.post("/designations", data);
};

// ======================================
// GET ALL DESIGNATIONS
// GET /api/designations
// ======================================
export const getDesignations = () => {
  return api.get("/designations");
};

// ======================================
// GET DESIGNATION BY ID
// GET /api/designations/:id
// ======================================
export const getDesignationById = (id) => {
  return api.get(`/designations/${id}`);
};

// ======================================
// UPDATE DESIGNATION
// PUT /api/designations/:id
// ======================================
export const updateDesignation = (id, data) => {
  return api.put(`/designations/${id}`, data);
};

// ======================================
// DELETE DESIGNATION
// DELETE /api/designations/:id
// ======================================
export const deleteDesignation = (id) => {
  return api.delete(`/designations/${id}`);
};
// ======================================
// CREATE ATTENDANCE
// POST /api/attendance
// ======================================
export const createAttendance = (data) => {
  return api.post("/attendance", data);
};

// ======================================
// GET ALL ATTENDANCE
// GET /api/attendance
// ======================================
export const getAllAttendance = () => {
  return api.get("/attendance");
};

// ======================================
// GET ATTENDANCE BY ID
// GET /api/attendance/:id
// ======================================
export const getAttendanceById = (id) => {
  return api.get(`/attendance/${id}`);
};

// ======================================
// UPDATE ATTENDANCE
// PUT /api/attendance/:id
// ======================================
export const updateAttendance = (id, data) => {
  return api.put(`/attendance/${id}`, data);
};

// ======================================
// DELETE ATTENDANCE
// DELETE /api/attendance/:id
// ======================================
export const deleteAttendance = (id) => {
  return api.delete(`/attendance/${id}`);
};
export const checkInAttendance = (data) => {
  return api.post("/attendance/check-in", data);
};

export const checkOutAttendance = (data) => {
  return api.post("/attendance/check-out", data);
};

export const getMyAttendance = (employeeId) => {
  return api.get(`/attendance/history/${employeeId}`);
};

// ======================================
// MONTHLY ATTENDANCE SUMMARY
// GET /api/attendance/summary/monthly?employeeId=&month=&year=
// ======================================
export const getMonthlyAttendanceSummary = (employeeId, month, year) => {
  return api.get("/attendance/summary/monthly", {
    params: { employeeId, month, year },
  });
};

// ======================================
// YEARLY ATTENDANCE SUMMARY
// GET /api/attendance/summary/yearly?employeeId=&year=
// ======================================
export const getYearlyAttendanceSummary = (employeeId, year) => {
  return api.get("/attendance/summary/yearly", {
    params: { employeeId, year },
  });
};

// ======================================
// GET EMPLOYEE ATTENDANCE CALENDAR
// Joining date se aaj tak har din — server-side 7-day pagination
// GET /api/attendance/calendar/:employeeId?page=1&limit=7
// ======================================
export const getEmployeeAttendanceCalendar = (employeeId, page = 1, limit = 7) => {
  return api.get(`/attendance/calendar/${employeeId}`, {
    params: { page, limit },
  });
};


// ======================================
// CREATE HOLIDAY
// POST /api/holidays
// ======================================
export const createHoliday = (data) => {
  return api.post("/holidays", data);
};

// ======================================
// GET ALL HOLIDAYS
// GET /api/holidays
// ======================================
export const getHolidays = () => {
  return api.get("/holidays");
};

// ======================================
// GET HOLIDAY BY ID
// GET /api/holidays/:id
// ======================================
export const getHolidayById = (id) => {
  return api.get(`/holidays/${id}`);
};

// ======================================
// UPDATE HOLIDAY
// PUT /api/holidays/:id
// ======================================
export const updateHoliday = (id, data) => {
  return api.put(`/holidays/${id}`, data);
};

// ======================================
// DELETE HOLIDAY
// DELETE /api/holidays/:id
// ======================================
export const deleteHoliday = (id) => {
  return api.delete(`/holidays/${id}`);
};
export const createAnnouncement = (data) => {
  return api.post("/announcements", data);
};

// ======================================
// GET ALL ANNOUNCEMENTS
// GET /api/announcements
// ======================================
export const getAnnouncements = (params) => {
  return api.get("/announcements", { params });
};

// ======================================
// GET ANNOUNCEMENT BY ID
// GET /api/announcements/:id
// ======================================
export const getAnnouncementById = (id) => {
  return api.get(`/announcements/${id}`);
};

// ======================================
// UPDATE ANNOUNCEMENT
// PUT /api/announcements/:id
// ======================================
export const updateAnnouncement = (id, data) => {
  return api.put(`/announcements/${id}`, data);
};

// ======================================
// DELETE ANNOUNCEMENT
// DELETE /api/announcements/:id
// ======================================
export const deleteAnnouncement = (id) => {
  return api.delete(`/announcements/${id}`);
};

// ======================================
// LEAVES
// ======================================
export const applyLeave = (data) => {
  return api.post("/leaves", data);
};

export const getMyLeaves = () => {
  return api.get("/leaves/my");
};

export const cancelLeave = (id) => {
  return api.patch(`/leaves/${id}/cancel`);
};

export const getAllLeaves = () => {
  return api.get("/leaves");
};

export const approveLeave = (id, adminComment = "") => {
  return api.patch(`/leaves/${id}/approve`, { adminComment });
};

export const rejectLeave = (id, data) => {
  return api.patch(`/leaves/${id}/reject`, data); // passing data for rejection reason
};

export const deleteLeave = (id) => {
  return api.delete(`/leaves/${id}`);
};

// ======================================
// LEAVE TYPES
// ======================================
export const getAllLeaveTypes = () => {
  return api.get("/leave-types");
};

// ======================================
// NOTIFICATIONS
// ======================================
export const getMyNotifications = (unreadOnly = false) => {
  return api.get("/notification", {
    params: unreadOnly ? { unreadOnly: "true" } : {},
  });
};

export const markNotificationRead = (id) => {
  return api.patch(`/notification/${id}/read`);
};

export const markAllNotificationsRead = () => {
  return api.patch("/notification/read-all");
};

export const deleteNotification = (id) => {
  return api.delete(`/notification/${id}`);
};

export const clearAllNotifications = () => {
  return api.delete("/notification/clear-all");
};

// ======================================
// SALARY STRUCTURE
// ======================================

// POST /api/salary/structure  (Admin only)
export const createSalaryStructure = (data) => {
  return api.post("/salary/structure", data);
};

// GET /api/salary/structure/:employeeId
export const getSalaryStructure = (employeeId) => {
  return api.get(`/salary/structure/${employeeId}`);
};

// GET /api/salary/structure (Admin only)
export const getAllSalaryStructures = () => {
  return api.get("/salary/structure");
};

// PUT /api/salary/structure/:employeeId  (Admin only)
export const updateSalaryStructure = (employeeId, data) => {
  return api.put(`/salary/structure/${employeeId}`, data);
};

// GET /api/salary/revisions/:employeeId
export const getSalaryRevisions = (employeeId) => {
  return api.get(`/salary/revisions/${employeeId}`);
};

// PATCH /api/salary/structure/:employeeId/bank-details
export const updateBankDetailsApi = (employeeId, data) => {
  return api.patch(`/salary/structure/${employeeId}/bank-details`, data);
};

// ======================================
// PAYROLL
// ======================================

// POST /api/payroll/generate  (Admin only)
export const generatePayrollApi = (data) => {
  return api.post("/payroll/generate", data);
};

// GET /api/payroll  (Admin only)
export const getAllPayroll = (params) => {
  return api.get("/payroll", { params });
};

// GET /api/payroll/my-payslips  (Employee)
export const getMyPayslips = () => {
  return api.get("/payroll/my-payslips");
};

// GET /api/payroll/:id
export const getPayslipById = (id) => {
  return api.get(`/payroll/${id}`);
};

// PATCH /api/payroll/:id/mark-paid  (Admin only)
export const markPayslipAsPaid = (id, data) => {
  return api.patch(`/payroll/${id}/mark-paid`, data);
};

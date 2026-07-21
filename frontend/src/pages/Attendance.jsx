/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext"; // apna actual path
import {
  checkInAttendance,
  checkOutAttendance,
  getMyAttendance,
  createAttendance,
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getAllUsers, // <-- NAYA IMPORT: apne service file me is naam ka function check/add kar lena
} from "../services/auth.service";

const getTodayDateString = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
};

const getLocalYYYYMMDD = (dateStr) => {
  if (!dateStr) return "";
  if (
    typeof dateStr === "string" &&
    dateStr.length === 10 &&
    dateStr.includes("-")
  ) {
    return dateStr;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
};

// ---------- DISPLAY FORMAT HELPERS ----------
// Date ko hamesha dd-mm-yyyy format me dikhana hai (input/state me yyyy-mm-dd hi rahega)
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "-";
  const localDate = getLocalYYYYMMDD(dateStr);
  const [year, month, day] = localDate.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}-${month}-${year}`;
};

// Time ko hamesha HH:MM (24-hour) format me dikhana hai
// ---------- RAW 24-HOUR TIME (comparison/logic ke liye, kabhi UI me show nahi hota) ----------
const formatTime24 = (timeStr) => {
  if (!timeStr) return "-";

  // Case 1: already "HH:MM" ya "HH:MM:SS" plain string (jaisa <input type="time"> deta hai)
  const plainMatch = timeStr.match(/^(\d{2}):(\d{2})/);
  if (plainMatch) {
    return `${plainMatch[1]}:${plainMatch[2]}`;
  }

  // Case 2: full ISO datetime string aayi backend se
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return timeStr; // fallback
};

// Time ko UI me hamesha 12-hour AM/PM format me dikhana hai (jaise 01:47 PM).
// Internally comparison/late-check ke liye formatTime24 (24hr) hi use hoti hai,
// taaki "12 baje ke baad PM" wali logic kahin break na ho.
const formatTimeDisplay = (timeStr) => {
  const time24 = formatTime24(timeStr);
  if (time24 === "-") return "-";

  const match = time24.match(/^(\d{2}):(\d{2})$/);
  if (!match) return time24; // kuch unexpected format mile to raw hi dikha do

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) hours = 12; // 0 -> 12 AM, 12 -> 12 PM

  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
};
// Decimal hours (jaise 1.78) ko "1h 47m" format me convert karta hai.
// Minutes hamesha 0-59 ke beech rehte hain — 60 minute complete hote hi
// woh apne aap next hour me carry ho jaata hai (isliye "1h 60m" jaisa
// invalid output kabhi nahi dikhega).
const formatWorkingHours = (decimalHours) => {
  if (
    decimalHours === null ||
    decimalHours === undefined ||
    decimalHours === "" ||
    isNaN(Number(decimalHours))
  ) {
    return "-";
  }

  const totalMinutes = Math.round(Number(decimalHours) * 60);
  let hours = Math.floor(totalMinutes / 60);
  let minutes = totalMinutes % 60;

  // Safety net (theoretically % 60 already keeps minutes < 60, but just in case)
  if (minutes === 60) {
    minutes = 0;
    hours += 1;
  }

  return `${hours}h ${minutes}m`;
};

// ---------- EMPLOYEE NAME HELPER ----------
// User model me kabhi "name" hota hai, kabhi "firstName"/"lastName" (jaisa
// Department.jsx me use ho raha hai). Yeh helper dono cases handle karta hai,
// aur agar kuch bhi na mile to email ya "-" fallback deta hai.
const getEmployeeDisplayName = (empObjOrId, employeesList = []) => {
  // Case 1: empObjOrId khud ek populated object hai (jaise r.employee jab backend populate karke bhejta hai)
  let empObj = empObjOrId && typeof empObjOrId === "object" ? empObjOrId : null;

  // Case 2: sirf id string/objectId hai, to employeesList me se dhoondo
  if (!empObj) {
    const id = empObjOrId;
    empObj = employeesList.find((e) => e._id === id) || null;
  }

  if (!empObj) return "-";

  const fullName = `${empObj.firstName || ""} ${empObj.lastName || ""}`.trim();
  return empObj.name || fullName || empObj.email || "-";
};

// ---------- LATE ATTENDANCE LOGIC ----------
// Agar check-in time is threshold ke baad ho, to attendance "Late" maana jayega.
// Format strictly 24-hour zero-padded "HH:MM" hona chahiye (jo <input type="time">
// waise hi deta hai), isliye simple string comparison kaafi hai.
const LATE_THRESHOLD_TIME = "10:30";

const isCheckInLate = (timeStr) => {
  if (!timeStr) return false;
  // comparison ke liye raw "HH:MM" nikaal lo (formatted nahi, taaki comparison safe rahe)
  const normalized = formatTimeDisplay(timeStr);
  if (normalized === "-") return false;
  return normalized > LATE_THRESHOLD_TIME;
};

const STATUS_OPTIONS = [
  "Present",
  "Absent",
  "Half Day",
  "Late",
  "On Leave",
  "Work From Home",
];

const AttendancePage = () => {
  const { user } = useContext(AuthContext);
  const role = (user?.role ?? "").toString().trim().toLowerCase();
  const isAdmin = role === "admin";

  const [myRecords, setMyRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [employees, setEmployees] = useState([]); // <-- NAYA STATE: employee list ke liye
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ---------- Admin: create/edit form state ----------
  const emptyForm = {
    _id: null,
    employee: "",
    date: getTodayDateString(),
    checkInTime: "",
    checkOutTime: "",
    attendanceStatus: "Present",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // ---------- Admin: delete confirmation modal state ----------
  // NAYA: window.confirm() ki jagah ab apna custom modal use hoga.
  // deleteTarget me delete hone wale record ka poora object store hota hai
  // (taaki modal me employee name / date dikha sakein), null = modal band.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------- Admin: filter state ----------
  const emptyFilters = {
    employee: "", // employee _id
    department: "",
    status: "",
    fromDate: "",
    toDate: "",
  };
  const [filters, setFilters] = useState(emptyFilters);

  const todayRecord = myRecords.find(
    (r) => getLocalYYYYMMDD(r.date) === getTodayDateString(),
  );

  // ================= FETCH DATA =================
  const fetchMyAttendance = async () => {
    try {
      const empId = user?._id || user?.id;
      if (!empId) return;
      const res = await getMyAttendance(empId);
      setMyRecords(res.data.attendance);
    } catch (err) {
      console.error(err);
    }
  };

  // NOTE: if your backend supports server-side filtering, pass `filters`
  // (or a mapped query object) straight into getAllAttendance(filters) and
  // drop the client-side filtering done below in `filteredRecords`.
  const fetchAllAttendance = async () => {
    try {
      const res = await getAllAttendance();
      setAllRecords(res.data.attendance);
    } catch (err) {
      console.error(err);
    }
  };

  // NAYA FUNCTION: sirf "employee" role wale users ki list laane ke liye
  const fetchEmployees = async () => {
    try {
      const res = await getAllUsers();
      // Backend se agar sab roles (admin+employee) mixed aa rahe hain,
      // to yaha filter kar lo sirf employee role ke liye.
      const list =
        res.data.users || res.data.data || res.data.employees || res.data || [];
      const onlyEmployees = Array.isArray(list)
        ? list.filter(
            (u) =>
              (u.role ?? "").toString().trim().toLowerCase() === "employee",
          )
        : [];
      setEmployees(onlyEmployees);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllAttendance();
      fetchEmployees(); // <-- admin hone par employee list bhi fetch karo
    } else {
      fetchMyAttendance();
    }
  }, [isAdmin]);

  // ================= EMPLOYEE: CHECK IN / CHECK OUT =================
  const handleCheckIn = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const empId = user?._id || user?.id;
      const res = await checkInAttendance({ employee: empId });
      setMessage(res.data.message);
      fetchMyAttendance();
    } catch (err) {
      setError(err.response?.data?.message || "Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const empId = user?._id || user?.id;
      const res = await checkOutAttendance({ employee: empId });
      setMessage(res.data.message);
      fetchMyAttendance();
    } catch (err) {
      setError(err.response?.data?.message || "Check-out failed");
    } finally {
      setLoading(false);
    }
  };

  // ================= EXPORT CSV =================
  const exportMyAttendanceCSV = () => {
    if (!myRecords || myRecords.length === 0) {
      alert("No records to export");
      return;
    }

    const headers = [
      "Date",
      "Day",
      "Check-In",
      "Check-Out",
      "Hours",
      "Status",
      "Late",
    ];

    const rows = myRecords.map((r) => {
      const late = r.isLate ?? isCheckInLate(r.checkInTime);
      let dayName = "-";
      if (r.date) {
        const d = new Date(r.date);
        if (!isNaN(d.getTime())) {
          dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        }
      }
      return [
        formatDateDisplay(r.date),
        dayName,
        formatTimeDisplay(r.checkInTime),
        formatTimeDisplay(r.checkOutTime),
        formatWorkingHours(r.workingHours),
        r.attendanceStatus || "",
        late ? "Yes" : "No",
      ]
        .map((field) => `"${field}"`)
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `My_Attendance_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================= ADMIN: FORM HANDLERS =================
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      // Check-in time badalne par, agar status abhi "auto" category me hai
      // (Present/Late), to use naye time ke hisaab se recompute karo.
      // Deliberately chuna gaya status (Absent / On Leave / Half Day /
      // Work From Home) overwrite nahi hoga.
      if (name === "checkInTime") {
        const autoStatuses = ["Present", "Late"];
        if (autoStatuses.includes(prev.attendanceStatus)) {
          updated.attendanceStatus = isCheckInLate(value) ? "Late" : "Present";
        }
      }

      return updated;
    });
  };

  const openCreateForm = () => {
    setForm(emptyForm);
    setIsEditMode(false);
    setShowForm(true);
    setError("");
  };

  const openEditForm = async (id) => {
    try {
      const res = await getAttendanceById(id);
      const a = res.data.attendance;
      setForm({
        _id: a._id,
        employee: a.employee?._id || a.employee,
        date: a.date,
        checkInTime: a.checkInTime || "",
        checkOutTime: a.checkOutTime || "",
        attendanceStatus: a.attendanceStatus,
        notes: a.notes || "",
      });
      setIsEditMode(true);
      setShowForm(true);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load record");
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (isEditMode) {
        const { checkInTime, checkOutTime, attendanceStatus, notes } = form;
        await updateAttendance(form._id, {
          checkInTime,
          checkOutTime,
          attendanceStatus,
          notes,
        });
        setMessage("Attendance updated successfully");
      } else {
        const {
          employee,
          date,
          checkInTime,
          checkOutTime,
          attendanceStatus,
          notes,
        } = form;

        if (!employee) {
          setError("Please select an employee");
          setLoading(false);
          return;
        }

        await createAttendance({
          employee,
          date,
          checkInTime,
          checkOutTime,
          attendanceStatus,
          notes,
        });
        setMessage("Attendance created successfully");
      }
      closeForm();
      fetchAllAttendance();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // ================= ADMIN: DELETE (with confirmation modal) =================
  const openDeleteConfirm = (record) => {
    setDeleteTarget(record);
    setError("");
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError("");
    try {
      await deleteAttendance(deleteTarget._id);
      setMessage("Attendance deleted successfully");
      setDeleteTarget(null);
      fetchAllAttendance();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ================= ADMIN: FILTER HANDLERS =================
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "fromDate" && updated.toDate && updated.toDate < value) {
        updated.toDate = "";
      }

      if (name === "toDate" && updated.fromDate && value < updated.fromDate) {
        updated.toDate = updated.fromDate;
      }

      return updated;
    });
  };

  // Client-side filtering.
  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      const empId = r.employee?._id || r.employee;
      if (filters.employee && empId !== filters.employee) return false;
      if (filters.department && r.employee?.department !== filters.department)
        return false;
      if (filters.status && r.attendanceStatus !== filters.status) return false;
      const localDate = getLocalYYYYMMDD(r.date);
      if (filters.fromDate && localDate < filters.fromDate) return false;
      if (filters.toDate && localDate > filters.toDate) return false;
      return true;
    });
  }, [allRecords, filters]);

  const visibleAdminRecords = isAdmin ? filteredRecords : [];

  // ================= ADMIN: EMPLOYEE ID SELECTED FOR DETAIL VIEW =================
  // Admin ab table me seedha saare records nahi dekhta — pehle sirf employee
  // names ki list dikhti hai (cards ke roop me), aur kisi ek employee par
  // click karne par uski poori info + history is id ke through khulti hai.
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // ================= EMPLOYEE: APNI HISTORY TOGGLE =================
  // Employee side par pehle summary "chart" dikhta hai, aur uske andar click
  // karne par hi neeche poori history table open hoti hai.
  const [showMyHistory, setShowMyHistory] = useState(false);

  const openEmployeeDetail = (empId) => {
    setSelectedEmployeeId(empId);
  };

  const closeEmployeeDetail = () => {
    setSelectedEmployeeId(null);
  };

  // ================= ADMIN: PER-EMPLOYEE SUMMARY (for the name cards) =================
  const employeeSummaries = useMemo(() => {
    const map = new Map();

    visibleAdminRecords.forEach((r) => {
      const empId = r.employee?._id || r.employee || "unknown";
      if (!map.has(empId)) {
        map.set(empId, {
          empId,
          empObj: r.employee,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          latestDate: null,
        });
      }
      const entry = map.get(empId);
      entry.total += 1;
      if (r.attendanceStatus === "Present") entry.present += 1;
      if (r.attendanceStatus === "Absent") entry.absent += 1;
      const isLate = r.isLate ?? isCheckInLate(r.checkInTime);
      if (isLate) entry.late += 1;
      const localDate = getLocalYYYYMMDD(r.date);
      if (!entry.latestDate || localDate > entry.latestDate) {
        entry.latestDate = localDate;
        entry.empObj = r.employee || entry.empObj;
      }
    });

    const summaries = Array.from(map.values());
    summaries.sort((a, b) =>
      getEmployeeDisplayName(a.empObj || a.empId, employees).localeCompare(
        getEmployeeDisplayName(b.empObj || b.empId, employees),
      ),
    );
    return summaries;
  }, [visibleAdminRecords, employees]);

  // ================= ADMIN: SELECTED EMPLOYEE KA POORA DATA =================
  const selectedEmployeeRecords = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return filteredRecords
      .filter((r) => (r.employee?._id || r.employee) === selectedEmployeeId)
      .sort((a, b) =>
        getLocalYYYYMMDD(b.date).localeCompare(getLocalYYYYMMDD(a.date)),
      );
  }, [filteredRecords, selectedEmployeeId]);

  const selectedEmployeeObj = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return (
      employees.find((e) => e._id === selectedEmployeeId) ||
      selectedEmployeeRecords[0]?.employee ||
      null
    );
  }, [selectedEmployeeId, employees, selectedEmployeeRecords]);

  const selectedEmployeeStats = useMemo(() => {
    const stats = {
      total: selectedEmployeeRecords.length,
      present: 0,
      absent: 0,
      late: 0,
      avgHours: 0,
    };
    let hoursSum = 0;
    let hoursCount = 0;
    selectedEmployeeRecords.forEach((r) => {
      if (r.attendanceStatus === "Present") stats.present += 1;
      if (r.attendanceStatus === "Absent") stats.absent += 1;
      const isLate = r.isLate ?? isCheckInLate(r.checkInTime);
      if (isLate) stats.late += 1;
      if (
        r.workingHours !== null &&
        r.workingHours !== undefined &&
        r.workingHours !== ""
      ) {
        hoursSum += Number(r.workingHours) || 0;
        hoursCount += 1;
      }
    });
    stats.avgHours = hoursCount > 0 ? hoursSum / hoursCount : 0;
    return stats;
  }, [selectedEmployeeRecords]);

  // ================= EMPLOYEE: APNI ATTENDANCE KA SUMMARY (chart ke liye) =================
  const myStatusSummary = useMemo(() => {
    const counts = {
      Present: 0,
      Absent: 0,
      "Half Day": 0,
      Late: 0,
      "On Leave": 0,
      "Work From Home": 0,
    };
    let hoursSum = 0;
    let hoursCount = 0;
    myRecords.forEach((r) => {
      if (counts[r.attendanceStatus] !== undefined) {
        counts[r.attendanceStatus] += 1;
      }
      if (
        r.workingHours !== null &&
        r.workingHours !== undefined &&
        r.workingHours !== ""
      ) {
        hoursSum += Number(r.workingHours) || 0;
        hoursCount += 1;
      }
    });
    const total = myRecords.length;
    const avgHours = hoursCount > 0 ? hoursSum / hoursCount : 0;
    const maxCount = Math.max(1, ...Object.values(counts));
    return { counts, total, avgHours, maxCount };
  }, [myRecords]);

  // ---------- Bar chart color tokens (solid + gradient pair per status) ----------
  const STATUS_BAR_COLORS = {
    Present: "bg-emerald-500",
    Absent: "bg-rose-500",
    "Half Day": "bg-yellow-500",
    Late: "bg-amber-500",
    "On Leave": "bg-purple-500",
    "Work From Home": "bg-blue-500",
  };

  const STATUS_GRADIENTS = {
    Present: "from-emerald-400 to-emerald-600",
    Absent: "from-rose-400 to-rose-600",
    "Half Day": "from-yellow-400 to-yellow-600",
    Late: "from-amber-400 to-amber-600",
    "On Leave": "from-purple-400 to-purple-600",
    "Work From Home": "from-blue-400 to-blue-600",
  };

  const STATUS_TEXT_COLORS = {
    Present: "text-emerald-700",
    Absent: "text-rose-700",
    "Half Day": "text-yellow-700",
    Late: "text-amber-700",
    "On Leave": "text-purple-700",
    "Work From Home": "text-blue-700",
  };

  // ---------- Renders a single attendance history table (reused for admin detail modal + employee history) ----------
  const renderHistoryTable = (records, { showActions = false } = {}) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-gray-50/80 text-gray-500 font-medium border-b border-gray-100">
            <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold">
              Date
            </th>
            <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold">
              Check-In
            </th>
            <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold">
              Check-Out
            </th>
            <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold">
              Hours
            </th>
            <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold">
              Status
            </th>
            <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold">
              Late
            </th>
            {showActions && (
              <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-right">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((r) => {
            const late = r.isLate ?? isCheckInLate(r.checkInTime);
            return (
              <tr
                key={r._id}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <td className="py-4 px-6">
                  <span className="font-medium text-gray-900">
                    {formatDateDisplay(r.date)}
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-600">
                  {formatTimeDisplay(r.checkInTime)}
                </td>
                <td className="py-4 px-6 text-gray-600">
                  {formatTimeDisplay(r.checkOutTime)}
                </td>
                <td className="py-4 px-6 text-gray-600 font-medium">
                  {formatWorkingHours(r.workingHours)}
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                      r.attendanceStatus === "Present"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                        : r.attendanceStatus === "Late"
                          ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                          : r.attendanceStatus === "Absent"
                            ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
                            : r.attendanceStatus === "Half Day"
                              ? "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20"
                              : r.attendanceStatus === "On Leave"
                                ? "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20"
                                : "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
                    }`}
                  >
                    {r.attendanceStatus}
                  </span>
                </td>
                <td className="py-4 px-6">
                  {late ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>{" "}
                      Yes
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs font-medium">-</span>
                  )}
                </td>
                {showActions && (
                  <td className="py-4 px-6">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditForm(r._id)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Record"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          ></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(r)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {records.length === 0 && (
            <tr>
              <td colSpan={showActions ? 7 : 6} className="py-12 text-center">
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <svg
                    className="w-12 h-12 mb-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <p className="text-base font-medium text-gray-500">
                    No attendance records found
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Attendance Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and track employee attendance records
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
              Add Attendance
            </button>
          )}
        </div>

        {message && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3 p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
            <svg
              className="w-5 h-5 text-emerald-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              ></path>
            </svg>
            {message}
          </div>
        )}
        {error && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3 p-4 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl shadow-sm">
            <svg
              className="w-5 h-5 text-rose-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              ></path>
            </svg>
            {error}
          </div>
        )}

        {/* ================= EMPLOYEE SECTION ================= */}
        {!isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  {user?.name && (
                    <p className="text-sm font-medium text-blue-600 mb-1 uppercase tracking-wider">
                      Welcome back, {user.name}
                    </p>
                  )}
                  <h2 className="text-2xl font-bold text-gray-900">
                    {todayRecord ? "Today's Status" : "Mark Your Attendance"}
                  </h2>
                </div>

                {todayRecord && (
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium text-emerald-700">
                      Active Session
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <button
                  onClick={handleCheckIn}
                  disabled={loading || !!todayRecord}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none sm:w-auto w-full"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    ></path>
                  </svg>
                  Check In
                </button>

                <button
                  onClick={handleCheckOut}
                  disabled={loading || !todayRecord || todayRecord.checkOutTime}
                  className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none sm:w-auto w-full"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    ></path>
                  </svg>
                  Check Out
                </button>
              </div>

              {todayRecord && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                      Check In Time
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {formatTimeDisplay(todayRecord.checkInTime)}
                    </span>
                    {isCheckInLate(todayRecord.checkInTime) && (
                      <span className="text-xs font-medium text-rose-600 mt-2 flex items-center gap-1.5 bg-rose-50 w-fit px-2 py-1 rounded-md">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                        Late Entry
                      </span>
                    )}
                  </div>

                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                      Check Out Time
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {todayRecord.checkOutTime
                        ? formatTimeDisplay(todayRecord.checkOutTime)
                        : "--:--"}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                      Working Hours
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-gray-900">
                        {formatWorkingHours(todayRecord.workingHours)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                      Current Status
                    </span>
                    <div>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${
                          todayRecord.attendanceStatus === "Present"
                            ? "bg-emerald-100 text-emerald-700"
                            : todayRecord.attendanceStatus === "Late"
                              ? "bg-amber-100 text-amber-700"
                              : todayRecord.attendanceStatus === "Absent"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {todayRecord.attendanceStatus}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ---------- EMPLOYEE: ATTENDANCE CHART (click to open history) ---------- */}
            <div className="border-t border-gray-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Your Attendance Overview
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {myStatusSummary.total} record
                    {myStatusSummary.total !== 1 ? "s" : ""} · avg{" "}
                    <span className="font-semibold text-gray-700">
                      {formatWorkingHours(myStatusSummary.avgHours)}
                    </span>{" "}
                    / day
                  </p>
                </div>
                {myRecords.length > 0 && (
                  <button
                    onClick={exportMyAttendanceCSV}
                    className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      ></path>
                    </svg>
                    Export CSV
                  </button>
                )}
              </div>

              {myStatusSummary.total === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <svg
                    className="w-10 h-10 text-gray-300 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14"
                    ></path>
                  </svg>
                  <p className="text-sm text-gray-400">
                    No attendance yet — check in to get started.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowMyHistory(true)}
                  className="w-full text-left bg-gradient-to-b from-gray-50 to-gray-50/60 hover:from-gray-100 hover:to-gray-100/60 rounded-2xl border border-gray-100 p-5 sm:p-7 transition-colors group cursor-pointer"
                  title="Click to view full history"
                >
                  {/* Chart area with horizontal gridlines for a real "chart" feel */}
                  <div className="relative h-40 mb-5">
                    {/* gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="border-t border-gray-200/70 w-full"
                        ></div>
                      ))}
                    </div>

                    {/* bars */}
                    <div className="relative h-full flex items-end gap-3 sm:gap-6 px-1">
                      {Object.entries(myStatusSummary.counts).map(
                        ([status, count]) => {
                          const heightPct = Math.max(
                            count === 0 ? 4 : 10,
                            (count / myStatusSummary.maxCount) * 100,
                          );
                          return (
                            <div
                              key={status}
                              className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                            >
                              <span
                                className={`text-xs font-bold mb-1.5 px-1.5 py-0.5 rounded-md bg-white shadow-sm ring-1 ring-gray-100 ${
                                  count > 0
                                    ? STATUS_TEXT_COLORS[status]
                                    : "text-gray-300"
                                }`}
                              >
                                {count}
                              </span>
                              <div
                                className={`w-full max-w-[2.75rem] rounded-t-lg bg-gradient-to-t ${STATUS_GRADIENTS[status]} shadow-sm transition-all duration-500 ease-out group-hover:brightness-105`}
                                style={{
                                  height: `${heightPct}%`,
                                  opacity: count === 0 ? 0.18 : 1,
                                }}
                              ></div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* legend */}
                  <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center pt-4 border-t border-gray-200/70">
                    {Object.keys(myStatusSummary.counts).map((status) => (
                      <span
                        key={status}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500"
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${STATUS_BAR_COLORS[status]}`}
                        ></span>
                        {status}
                      </span>
                    ))}
                  </div>

                  <p className="text-center text-xs font-semibold text-blue-600 mt-4 inline-flex items-center justify-center gap-1 w-full">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Click to view full history
                  </p>
                </button>
              )}
            </div>

            {/* ---------- EMPLOYEE: FULL HISTORY MODAL (opens on chart click) ---------- */}
            {showMyHistory && (
              <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        My Attendance History
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {myRecords.length} record
                        {myRecords.length !== 1 ? "s" : ""} · avg{" "}
                        <span className="font-semibold text-gray-700">
                          {formatWorkingHours(myStatusSummary.avgHours)}
                        </span>{" "}
                        / day
                      </p>
                    </div>
                    <button
                      onClick={() => setShowMyHistory(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  {/* Modal Body — scrollable table */}
                  <div className="overflow-y-auto">
                    {renderHistoryTable(myRecords)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ADMIN: FILTERS ================= */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                ></path>
              </svg>
              <h3 className="text-base font-semibold text-gray-800">
                Filter Records
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Employee
                </label>
                <select
                  name="employee"
                  value={filters.employee}
                  onChange={handleFilterChange}
                  className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none bg-gray-50 hover:bg-gray-100/50"
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {getEmployeeDisplayName(emp, employees)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none bg-gray-50 hover:bg-gray-100/50"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  From Date
                </label>
                <input
                  type="date"
                  name="fromDate"
                  max={getTodayDateString()}
                  value={filters.fromDate}
                  onChange={handleFilterChange}
                  className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none bg-gray-50 hover:bg-gray-100/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  To Date
                </label>
                <input
                  type="date"
                  name="toDate"
                  min={filters.fromDate || undefined}
                  max={getTodayDateString()}
                  value={filters.toDate}
                  onChange={handleFilterChange}
                  className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none bg-gray-50 hover:bg-gray-100/50"
                />
              </div>
            </div>
          </div>
        )}

        {isAdmin && showForm && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                <h3 className="text-lg font-bold text-gray-900">
                  {isEditMode ? "Edit Attendance Record" : "Add New Record"}
                </h3>
                <button
                  onClick={closeForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              </div>

              <form
                onSubmit={handleSubmitForm}
                className="p-6 space-y-5 overflow-y-auto"
              >
                {!isEditMode ? (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Employee Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="employee"
                      value={form.employee}
                      onChange={handleFormChange}
                      className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                      required
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {getEmployeeDisplayName(emp, employees)}
                        </option>
                      ))}
                    </select>
                    {employees.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No employees found in the system
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Employee Name
                    </label>
                    <input
                      type="text"
                      value={getEmployeeDisplayName(form.employee, employees)}
                      disabled
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                )}

                {!isEditMode && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleFormChange}
                      className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                      required
                    />
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Check In
                    </label>
                    <input
                      type="time"
                      name="checkInTime"
                      value={form.checkInTime}
                      onChange={handleFormChange}
                      className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                    />
                    {isCheckInLate(form.checkInTime) && (
                      <p className="text-xs text-amber-600 font-medium">
                        Late marked (after {LATE_THRESHOLD_TIME})
                      </p>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Check Out
                    </label>
                    <input
                      type="time"
                      name="checkOutTime"
                      value={form.checkOutTime}
                      onChange={handleFormChange}
                      className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="attendanceStatus"
                    value={form.attendanceStatus}
                    onChange={handleFormChange}
                    className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white resize-none"
                    rows={3}
                    placeholder="Add any relevant notes here..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                  >
                    {loading ? (
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : isEditMode ? (
                      "Save Changes"
                    ) : (
                      "Create Record"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= ADMIN: DELETE CONFIRMATION MODAL ================= */}
        {isAdmin && deleteTarget && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">
                Delete Record
              </h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Are you sure you want to delete the attendance record for{" "}
                <span className="font-semibold text-gray-900">
                  {getEmployeeDisplayName(deleteTarget.employee, employees)}
                </span>{" "}
                on{" "}
                <span className="font-semibold text-gray-900">
                  {formatDateDisplay(deleteTarget.date)}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  disabled={deleteLoading}
                  className="px-4 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors disabled:opacity-50 flex items-center"
                >
                  {deleteLoading ? "Deleting..." : "Delete Record"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= ADMIN: EMPLOYEE NAME CARDS (click for full detail) ================= */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Employees</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {employeeSummaries.length} employee
                  {employeeSummaries.length !== 1 ? "s" : ""} · click a card to
                  view full details
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.63a4 4 0 100-8 4 4 0 000 8zm6 3.13a4 4 0 010 7.75M9 12.13a4 4 0 010 7.75"
                  ></path>
                </svg>
                Based on current filters
              </span>
            </div>

            {employeeSummaries.length === 0 ? (
              <div className="py-14 text-center text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.63a4 4 0 100-8 4 4 0 000 8zm6 3.13a4 4 0 010 7.75M9 12.13a4 4 0 010 7.75"
                  ></path>
                </svg>
                <p className="text-base font-medium text-gray-500">
                  No employee records found
                </p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
                {employeeSummaries.map((s) => {
                  const attendanceRate =
                    s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                  return (
                    <button
                      key={s.empId}
                      onClick={() => openEmployeeDetail(s.empId)}
                      className="text-left bg-white hover:bg-blue-50/40 border border-gray-100 hover:border-blue-200 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.99] group relative overflow-hidden"
                    >
                      {/* subtle accent bar on hover */}
                      <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-200"></span>

                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full shrink-0 shadow-sm ring-2 ring-white overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            {s.empObj?.profileImage ? (
                              <img
                                src={s.empObj.profileImage}
                                alt={getEmployeeDisplayName(
                                  s.empObj,
                                  employees,
                                )}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-sm">
                                {getEmployeeDisplayName(s.empObj, employees)
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                              {getEmployeeDisplayName(s.empObj, employees)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {s.empObj?.email ||
                                `${s.total} record${s.total !== 1 ? "s" : ""}`}
                            </p>
                          </div>
                        </div>
                        <svg
                          className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0 mt-1 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          ></path>
                        </svg>
                      </div>

                      {/* attendance rate progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-500 font-medium">
                            Attendance rate
                          </span>
                          <span className="font-bold text-gray-800">
                            {attendanceRate}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                            style={{ width: `${attendanceRate}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md ring-1 ring-inset ring-emerald-600/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {s.present} Present
                        </span>
                        {s.late > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md ring-1 ring-inset ring-amber-600/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            {s.late} Late
                          </span>
                        )}
                        {s.absent > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md ring-1 ring-inset ring-rose-600/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {s.absent} Absent
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= ADMIN: EMPLOYEE FULL DETAIL MODAL ================= */}
        {isAdmin && selectedEmployeeId && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full shrink-0 shadow-sm ring-2 ring-white overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    {selectedEmployeeObj?.profileImage ? (
                      <img
                        src={selectedEmployeeObj.profileImage}
                        alt={getEmployeeDisplayName(
                          selectedEmployeeObj,
                          employees,
                        )}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {getEmployeeDisplayName(selectedEmployeeObj, employees)
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {getEmployeeDisplayName(selectedEmployeeObj, employees)}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      {selectedEmployeeObj?.email && (
                        <span>{selectedEmployeeObj.email}</span>
                      )}
                      {selectedEmployeeObj?.department && (
                        <span>{selectedEmployeeObj.department}</span>
                      )}
                      {selectedEmployeeObj?.designation && (
                        <span>{selectedEmployeeObj.designation}</span>
                      )}
                      {selectedEmployeeObj?.phone && (
                        <span>{selectedEmployeeObj.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeEmployeeDetail}
                  className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {selectedEmployeeStats.total}
                  </p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">
                    Total
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-emerald-700">
                    {selectedEmployeeStats.present}
                  </p>
                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mt-1">
                    Present
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-amber-700">
                    {selectedEmployeeStats.late}
                  </p>
                  <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mt-1">
                    Late
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-blue-700">
                    {formatWorkingHours(selectedEmployeeStats.avgHours)}
                  </p>
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mt-1">
                    Avg Hours
                  </p>
                </div>
              </div>

              <div className="overflow-y-auto">
                {renderHistoryTable(selectedEmployeeRecords, {
                  showActions: true,
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;

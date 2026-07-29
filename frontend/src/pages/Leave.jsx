/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  applyLeave,
  getMyLeaves,
  cancelLeave,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  getAllUsers,
} from "../services/auth.service";

const VALID_LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Emergency Leave",
  "Other",
];

const getEmployeeDisplayName = (empObjOrId, employeesList = []) => {
  let empObj = empObjOrId && typeof empObjOrId === "object" ? empObjOrId : null;
  if (!empObj) {
    const id = empObjOrId;
    empObj = employeesList.find((e) => e._id === id) || null;
  }
  if (!empObj) return "-";
  const fullName = `${empObj.firstName || ""} ${empObj.lastName || ""}`.trim();
  return empObj.name || fullName || empObj.email || "-";
};

const Pagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  setCurrentPage,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600 font-medium">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

const Leave = () => {
  const { user, socket } = useContext(AuthContext); // <-- socket bhi liya
  const role = (user?.role ?? "").toString().trim().toLowerCase();
  const isAdmin = role === "admin";

  // Data states
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Form state for Employee
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Admin states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectData, setRejectData] = useState({ id: null, reason: "" });

  // Approve modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveData, setApproveData] = useState({ id: null, reason: "" });
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [filters, setFilters] = useState({
    status: "",
    employee: "",
    leaveType: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const itemsPerPage = 6;

  const getEmpName = (empObjOrId) => {
    const empObj = empObjOrId && typeof empObjOrId === "object" ? empObjOrId : null;
    if (!empObj) return "";
    return (empObj.name || `${empObj.firstName || ""} ${empObj.lastName || ""}`.trim() || empObj.email || "").toLowerCase();
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      let data = [];
      if (isAdmin) {
        const res = await getAllLeaves();
        data = res.data.data || [];
      } else {
        const res = await getMyLeaves();
        data = res.data.data || [];
      }

      // Default sort: alphabetical by employee name (A-Z)
      data.sort((a, b) => {
        const nameA = getEmpName(a.employee);
        const nameB = getEmpName(b.employee);
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return new Date(b.startDate || 0) - new Date(a.startDate || 0);
      });

      setLeaves(data);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to fetch leaves." });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    if (!isAdmin) return;
    try {
      const res = await getAllUsers();
      const list = res.data.users || res.data.data || res.data || [];
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
    if (!user) return; // Don't fetch if not logged in
    fetchLeaves();
    if (isAdmin) {
      fetchEmployeesList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  // ---------------- SOCKET.IO LIVE NOTIFICATIONS ----------------
  useEffect(() => {
    if (!socket) return;

    if (isAdmin) {
      // Admin ko notify karo jab koi employee naya leave apply kare
      const handleNewLeave = (data) => {
        showMessage("success", data.message || "New leave request received.");
        fetchLeaves();
      };
      socket.on("newLeaveApplied", handleNewLeave);

      return () => {
        socket.off("newLeaveApplied", handleNewLeave);
      };
    } else {
      // Employee ko notify karo jab uski leave approve/reject ho
      const handleStatusUpdate = (data) => {
        showMessage(
          data.status === "Approved" ? "success" : "error",
          data.message ||
            `Your leave has been ${data.status?.toLowerCase() || "updated"}.`,
        );
        fetchLeaves();
      };
      socket.on("leaveStatusUpdated", handleStatusUpdate);

      return () => {
        socket.off("leaveStatusUpdated", handleStatusUpdate);
      };
    }
  }, [socket, isAdmin]);

  // Handle Notifications
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  // ---------------- EMPLOYEE HANDLERS ----------------
  const handleApplyChange = (e) => {
    setApplyForm({ ...applyForm, [e.target.name]: e.target.value });
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      await applyLeave(applyForm);
      showMessage("success", "Leave applied successfully.");
      setShowApplyModal(false);
      setApplyForm({
        leaveType: "Casual Leave",
        startDate: "",
        endDate: "",
        reason: "",
      });
      fetchLeaves();
    } catch (err) {
      showMessage(
        "error",
        err.response?.data?.message || "Failed to apply for leave.",
      );
    }
  };

  const handleCancelLeave = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this leave?")) return;
    try {
      await cancelLeave(id);
      showMessage("success", "Leave cancelled successfully.");
      fetchLeaves();
    } catch (err) {
      showMessage(
        "error",
        err.response?.data?.message || "Failed to cancel leave.",
      );
    }
  };

  // ---------------- ADMIN HANDLERS ----------------

  const openApproveModal = (id) => {
    setApproveData({ id });
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (id) => {
    setApproveSubmitting(true);
    try {
      await approveLeave(id, approveData.reason || "");
      showMessage("success", "Leave approved successfully.");
      setShowApproveModal(false);
      setApproveData({ id: null, reason: "" });
      fetchLeaves();
    } catch (err) {
      showMessage(
        "error",
        err.response?.data?.message || "Failed to approve leave.",
      );
    } finally {
      setApproveSubmitting(false);
    }
  };

  const openRejectModal = (id) => {
    setRejectData({ id, reason: "" });
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      await rejectLeave(rejectData.id, { adminComment: rejectData.reason });
      showMessage("success", "Leave rejected successfully.");
      setShowRejectModal(false);
      fetchLeaves();
    } catch (err) {
      showMessage(
        "error",
        err.response?.data?.message || "Failed to reject leave.",
      );
    }
  };

  // Filter Logic
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (filters.status && l.status !== filters.status) return false;
      if (isAdmin) {
        if (filters.employee && l.employee?._id !== filters.employee)
          return false;
        if (filters.leaveType && l.leaveType !== filters.leaveType)
          return false;
      }
      return true;
    });
  }, [leaves, filters, isAdmin]);

  // Helpers
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">
            Rejected
          </span>
        );
      case "Cancelled":
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
            Pending
          </span>
        );
    }
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const list = leaves;
    return {
      total: list.length,
      approved: list.filter((l) => l.status === "Approved").length,
      pending: list.filter((l) => l.status === "Pending").length,
      rejected: list.filter((l) => l.status === "Rejected").length,
    };
  }, [leaves]);

  // ================= ADMIN: EMPLOYEE SELECTION =================
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const openEmployeeDetail = (empId) => { setSelectedEmployeeId(empId); setDetailPage(1); };
  const closeEmployeeDetail = () => setSelectedEmployeeId(null);

  const employeeSummaries = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map();

    filteredLeaves.forEach((l) => {
      const empId = l.employee?._id || l.employee || "unknown";
      if (!map.has(empId)) {
        map.set(empId, {
          empId,
          empObj: l.employee,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
        });
      }
      const entry = map.get(empId);
      entry.total += 1;
      if (l.status === "Approved") entry.approved += 1;
      if (l.status === "Pending") entry.pending += 1;
      if (l.status === "Rejected") entry.rejected += 1;
      if (l.status === "Cancelled") entry.cancelled += 1;
      if (l.employee && typeof l.employee === "object")
        entry.empObj = l.employee;
    });

    const summaries = Array.from(map.values());
    // Sort alphabetically by employee name A-Z
    summaries.sort((a, b) => {
      const nameA = getEmployeeDisplayName(a.empObj, employees).toLowerCase();
      const nameB = getEmployeeDisplayName(b.empObj, employees).toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return summaries;
  }, [filteredLeaves, employees, isAdmin]);

  const selectedEmployeeLeaves = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return filteredLeaves.filter(
      (l) => (l.employee?._id || l.employee) === selectedEmployeeId,
    );
  }, [filteredLeaves, selectedEmployeeId]);

  const selectedEmployeeObj = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return (
      employees.find((e) => e._id === selectedEmployeeId) ||
      selectedEmployeeLeaves[0]?.employee ||
      null
    );
  }, [selectedEmployeeId, employees, selectedEmployeeLeaves]);

  const selectedEmployeeStats = useMemo(() => {
    const empStats = { total: 0, approved: 0, pending: 0, rejected: 0 };
    selectedEmployeeLeaves.forEach((l) => {
      empStats.total += 1;
      if (l.status === "Approved") empStats.approved += 1;
      if (l.status === "Pending") empStats.pending += 1;
      if (l.status === "Rejected") empStats.rejected += 1;
    });
    return empStats;
  }, [selectedEmployeeLeaves]);

  const renderLeaveTable = (leavesToRender, showEmployeeColumn = false) => (
    <div className="rounded-xl border border-blue-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-indigo-600 border-b border-indigo-700">
              {showEmployeeColumn && (
                <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                  Employee
                </th>
              )}
              <th className="px-2 py-3 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                Leave Type
              </th>
              <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                From
              </th>
              <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                To
              </th>
              <th className="px-2 py-3 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                Days
              </th>
              <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                Reason
              </th>
              <th className="px-2 py-3 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                Admin <br /> Comment
              </th>
              <th className="px-2 py-3 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-blue-50">
            {loading ? (
              <tr>
                <td
                  colSpan={showEmployeeColumn ? 9 : 8}
                  className="px-2 py-10 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg
                      className="w-6 h-6 animate-spin text-indigo-400"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      Loading records...
                    </span>
                  </div>
                </td>
              </tr>
            ) : leavesToRender.length === 0 ? (
              <tr>
                <td
                  colSpan={showEmployeeColumn ? 9 : 8}
                  className="px-2 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm font-medium text-gray-500">
                      No leave records found
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              leavesToRender.map((leave, idx) => (
                <tr
                  key={leave._id}
                  className={`transition-colors duration-150 hover:bg-blue-100/50 ${idx % 2 === 0 ? "bg-white" : "bg-blue-50/30"}`}
                >
                  {showEmployeeColumn && (
                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-800 text-sm">
                        {getEmployeeDisplayName(leave.employee, employees)}
                      </span>
                    </td>
                  )}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {leave.leaveType}
                    </span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600 font-medium">
                    {formatDate(leave.startDate)}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600 font-medium">
                    {formatDate(leave.endDate)}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                      {leave.totalLeaveDays}
                    </span>
                  </td>
                  <td
                    className="px-2 py-3 text-xs text-gray-500 max-w-[150px] truncate"
                    title={leave.reason}
                  >
                    {leave.reason || (
                      <span className="text-gray-300 italic">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    {getStatusBadge(leave.status)}
                  </td>
                  <td
                    className="px-2 py-3 text-xs text-gray-400 max-w-[150px] truncate"
                    title={leave.adminComment}
                  >
                    {leave.adminComment || (
                      <span className="not-italic text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    {isAdmin ? (
                      leave.status === "Pending" ? (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openApproveModal(leave._id)}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors duration-150"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(leave._id)}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-100 transition-colors duration-150"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm select-none">
                          —
                        </span>
                      )
                    ) : leave.status === "Pending" ? (
                      <button
                        onClick={() => handleCancelLeave(leave._id)}
                        className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors duration-150"
                      >
                        Cancel
                      </button>
                    ) : (
                      <span className="text-gray-300 text-sm select-none">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative bg-blue-700 rounded-2xl p-6 shadow-lg overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              🗓️ Leave Management
            </h1>
            <p className="text-indigo-100 mt-1">
              {isAdmin
                ? "Overview of all employee leave requests."
                : "Manage your leave applications."}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowApplyModal(true)}
              className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold py-2.5 px-6 rounded-xl shadow-md transition-all duration-200 transform hover:-translate-y-0.5 whitespace-nowrap"
            >
              + Apply for Leave
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-4 rounded-lg shadow-sm font-medium ${
            message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setFilters({ ...filters, status: "" });
            setCurrentPage(1);
          }}
          className={`bg-white p-5 rounded-xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${!filters.status ? "border-indigo-500 ring-2 ring-indigo-100" : "border-gray-100"}`}
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0">
            📋
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total
            </p>
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
          </div>
        </div>
        <div
          onClick={() => {
            setFilters({ ...filters, status: "Approved" });
            setCurrentPage(1);
          }}
          className={`bg-white p-5 rounded-xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${filters.status === "Approved" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-emerald-100"}`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl flex-shrink-0">
            ✅
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">
              Approved
            </p>
            <p className="text-3xl font-bold text-emerald-600">
              {stats.approved}
            </p>
          </div>
        </div>
        <div
          onClick={() => {
            setFilters({ ...filters, status: "Pending" });
            setCurrentPage(1);
          }}
          className={`bg-white p-5 rounded-xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${filters.status === "Pending" ? "border-amber-500 ring-2 ring-amber-100" : "border-amber-100"}`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">
            ⏳
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
              Pending
            </p>
            <p className="text-3xl font-bold text-amber-500">{stats.pending}</p>
          </div>
        </div>
        <div
          onClick={() => {
            setFilters({ ...filters, status: "Rejected" });
            setCurrentPage(1);
          }}
          className={`bg-white p-5 rounded-xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${filters.status === "Rejected" ? "border-rose-500 ring-2 ring-rose-100" : "border-rose-100"}`}
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-2xl flex-shrink-0">
            ❌
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Rejected
            </p>
            <p className="text-3xl font-bold text-rose-500">{stats.rejected}</p>
          </div>
        </div>
      </div>

      {/* Admin Filters */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="text-base font-semibold text-gray-800">Filter Records</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Employee</label>
              <select
                className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none bg-gray-50 hover:bg-gray-100/50"
                value={filters.employee}
                onChange={(e) => { setFilters({ ...filters, employee: e.target.value }); setCurrentPage(1); }}
              >
                <option value="">All Employees</option>
                {employees
                  .slice()
                  .sort((a, b) => getEmployeeDisplayName(a, employees).localeCompare(getEmployeeDisplayName(b, employees)))
                  .map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none bg-gray-50 hover:bg-gray-100/50"
                value={filters.status}
                onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setCurrentPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Leave Type</label>
              <select
                className="w-full border-gray-200 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none bg-gray-50 hover:bg-gray-100/50"
                value={filters.leaveType}
                onChange={(e) => { setFilters({ ...filters, leaveType: e.target.value }); setCurrentPage(1); }}
              >
                <option value="">All Types</option>
                {VALID_LEAVE_TYPES.map((lt) => (
                  <option key={lt} value={lt}>{lt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Employee / Admin Views */}
      {!isAdmin ? (
        <div className="space-y-4">
          {renderLeaveTable(
            filteredLeaves.slice(
              (currentPage - 1) * itemsPerPage,
              currentPage * itemsPerPage,
            ),
            false,
          )}
          <Pagination
            totalItems={filteredLeaves.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Employees</h2>
              <p className="text-sm text-gray-500 mt-1">
                {employeeSummaries.length} employee
                {employeeSummaries.length !== 1 ? "s" : ""} · click a card to
                view leave details
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
              <p className="text-base font-medium text-gray-500">
                No leave records found
              </p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
              {employeeSummaries
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((s) => (
                  <button
                    key={s.empId}
                    onClick={() => openEmployeeDetail(s.empId)}
                    className="text-left bg-white hover:bg-indigo-50/40 border border-gray-100 hover:border-indigo-200 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.99] group relative overflow-hidden"
                  >
                    <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500 scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-200"></span>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full shrink-0 shadow-sm ring-2 ring-white overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          {s.empObj?.profileImage ? (
                            <img
                              src={s.empObj.profileImage}
                              alt={getEmployeeDisplayName(s.empObj, employees)}
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
                          <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                            {getEmployeeDisplayName(s.empObj, employees)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {s.empObj?.email ||
                              `${s.total} record${s.total !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                        Total: {s.total}
                      </span>
                      {s.pending > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          {s.pending} Pending
                        </span>
                      )}
                      {s.approved > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          {s.approved} Approved
                        </span>
                      )}
                      {s.rejected > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                          {s.rejected} Rejected
                        </span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}
          {employeeSummaries.length > itemsPerPage && (
            <div className="p-4 bg-gray-50/50 border-t border-gray-100">
              <Pagination
                totalItems={employeeSummaries.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ---------------- MODALS ---------------- */}

      {showApplyModal && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Apply for Leave
              </h3>
              <p className="text-gray-500 text-sm mt-0.5">
                Fill in the details below to submit your request.
              </p>
            </div>
            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type
                </label>
                <select
                  name="leaveType"
                  required
                  value={applyForm.leaveType}
                  onChange={handleApplyChange}
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                >
                  {VALID_LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>

              {applyForm.leaveType === "Other" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      name="reason"
                      required
                      rows="3"
                      value={applyForm.reason}
                      onChange={handleApplyChange}
                      placeholder="Please provide a reason for your leave..."
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none resize-none"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        required
                        min={today}
                        value={applyForm.startDate}
                        onChange={handleApplyChange}
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        required
                        min={applyForm.startDate || today}
                        value={applyForm.endDate}
                        onChange={handleApplyChange}
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        required
                        min={today}
                        value={applyForm.startDate}
                        onChange={handleApplyChange}
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        required
                        min={applyForm.startDate || today}
                        value={applyForm.endDate}
                        onChange={handleApplyChange}
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      name="reason"
                      required
                      rows="3"
                      value={applyForm.reason}
                      onChange={handleApplyChange}
                      placeholder="Please provide a reason for your leave..."
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none resize-none"
                    ></textarea>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-gray-800 text-white text-sm hover:bg-gray-900"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Approve Leave Request
              </h3>
              <p className="text-gray-500 text-sm mt-0.5">
                Are you sure you want to approve this leave request?
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment (optional)
                </label>
                <textarea
                  rows="3"
                  value={approveData.reason}
                  onChange={(e) =>
                    setApproveData({ ...approveData, reason: e.target.value })
                  }
                  placeholder="Add an optional note for this approval..."
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none resize-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={approveSubmitting}
                  onClick={() => handleApproveSubmit(approveData.id)}
                  className="px-4 py-2 rounded bg-green-700 text-white text-sm hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {approveSubmitting ? "Approving..." : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Reject Leave Request
              </h3>
              <p className="text-gray-500 text-sm mt-0.5">
                Please provide a reason for rejection.
              </p>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason
                </label>
                <textarea
                  required
                  rows="3"
                  value={rejectData.reason}
                  onChange={(e) =>
                    setRejectData({ ...rejectData, reason: e.target.value })
                  }
                  placeholder="Please specify why this request is being rejected..."
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none resize-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-red-800 text-white text-sm hover:bg-red-900"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADMIN EMPLOYEE DETAIL MODAL ---------------- */}
      {isAdmin && selectedEmployeeId && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full shrink-0 shadow-sm ring-2 ring-white overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
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
                  </div>
                </div>
              </div>
              <button
                onClick={closeEmployeeDetail}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
              <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <p className="text-xl font-bold text-gray-900">
                  {selectedEmployeeStats.total}
                </p>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">
                  Total Leaves
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                <p className="text-xl font-bold text-emerald-700">
                  {selectedEmployeeStats.approved}
                </p>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mt-1">
                  Approved
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                <p className="text-xl font-bold text-amber-700">
                  {selectedEmployeeStats.pending}
                </p>
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mt-1">
                  Pending
                </p>
              </div>
              <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100">
                <p className="text-xl font-bold text-rose-700">
                  {selectedEmployeeStats.rejected}
                </p>
                <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider mt-1">
                  Rejected
                </p>
              </div>
            </div>

            <div className="overflow-y-auto p-4 bg-gray-50/30">
              {renderLeaveTable(
                selectedEmployeeLeaves.slice(
                  (detailPage - 1) * itemsPerPage,
                  detailPage * itemsPerPage,
                ),
                false,
              )}
            </div>
            {selectedEmployeeLeaves.length > itemsPerPage && (
              <div className="p-4 bg-gray-50/50 border-t border-gray-100 shrink-0">
                <Pagination
                  totalItems={selectedEmployeeLeaves.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={detailPage}
                  setCurrentPage={setDetailPage}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leave;

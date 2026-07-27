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

  // Fetch Data
  const fetchLeaves = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await getAllLeaves();
        setLeaves(res.data.data || []);
      } else {
        const res = await getMyLeaves();
        setLeaves(res.data.data || []);
      }
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

  // Filter Logic (Admin)
  const filteredLeaves = useMemo(() => {
    if (!isAdmin) return leaves;
    return leaves.filter((l) => {
      if (filters.status && l.status !== filters.status) return false;
      if (filters.employee && l.employee?._id !== filters.employee)
        return false;
      if (filters.leaveType && l.leaveType !== filters.leaveType) return false;
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
    const list = isAdmin ? filteredLeaves : leaves;
    return {
      total: list.length,
      approved: list.filter((l) => l.status === "Approved").length,
      pending: list.filter((l) => l.status === "Pending").length,
      rejected: list.filter((l) => l.status === "Rejected").length,
    };
  }, [isAdmin ? filteredLeaves : leaves]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl p-6 shadow-lg overflow-hidden">
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
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
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
        <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
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
        <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-100 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
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
        <div className="bg-white p-5 rounded-xl shadow-sm border border-rose-100 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
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
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">🔍 Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Status
              </label>
              <select
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 border"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Employee
              </label>
              <select
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 border"
                value={filters.employee}
                onChange={(e) =>
                  setFilters({ ...filters, employee: e.target.value })
                }
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name ||
                      `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                      emp.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Leave Type
              </label>
              <select
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 border"
                value={filters.leaveType}
                onChange={(e) =>
                  setFilters({ ...filters, leaveType: e.target.value })
                }
              >
                <option value="">All Types</option>
                {VALID_LEAVE_TYPES.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Leave Table */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin Comment
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="px-6 py-8 text-center text-gray-500 text-sm"
                  >
                    Loading...
                  </td>
                </tr>
              ) : (isAdmin ? filteredLeaves : leaves).length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="px-6 py-8 text-center text-gray-500 text-sm"
                  >
                    No leave records found.
                  </td>
                </tr>
              ) : (
                (isAdmin ? filteredLeaves : leaves).map((leave) => (
                  <tr key={leave._id} className="hover:bg-gray-50">
                    {isAdmin && (
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">
                        {leave.employee?.name ||
                          `${leave.employee?.firstName || ""} ${leave.employee?.lastName || ""}`.trim() ||
                          leave.employee?.email ||
                          "-"}
                      </td>
                    )}
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                      {leave.leaveType}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(leave.startDate)} to{" "}
                      {formatDate(leave.endDate)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                      {leave.totalLeaveDays}
                    </td>
                    <td
                      className="px-6 py-3 text-sm text-gray-500 max-w-xs truncate"
                      title={leave.reason}
                    >
                      {leave.reason}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {getStatusBadge(leave.status)}
                    </td>
                    <td
                      className="px-6 py-3 text-sm text-gray-500 max-w-xs truncate"
                      title={leave.adminComment}
                    >
                      {leave.adminComment || "-"}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-center text-sm">
                      {isAdmin ? (
                        leave.status === "Pending" ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openApproveModal(leave._id)}
                              className="text-green-700 border border-green-300 px-3 py-1 rounded hover:bg-green-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(leave._id)}
                              className="text-red-700 border border-red-300 px-3 py-1 rounded hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )
                      ) : leave.status === "Pending" ? (
                        <button
                          onClick={() => handleCancelLeave(leave._id)}
                          className="text-gray-600 border border-gray-300 px-3 py-1 rounded hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- MODALS ---------------- */}

      {showApplyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
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
    </div>
  );
};

export default Leave;

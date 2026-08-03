import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { StatCardSkeleton, TableSkeleton } from "../component/Skeleton";
import EmployeeForm from "./EmployeeForm";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getDepartments,
  getMyAttendance,
  getMyLeaves,
  getHolidays,
  getAnnouncements,
} from "../services/auth.service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function Dashboard() {
  const { user } = useContext(AuthContext);

  const role = (user?.role ?? "").toString().trim().toLowerCase();
  const isAdmin = role === "admin";

  const [employees, setEmployees] = useState([]);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Employee dashboard tabs

  const [myAttendance, setMyAttendance] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { emp } ya null

  // ======================================
  // FETCH DATA
  // ======================================
  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        if (isAdmin) {
          const [res, deptRes] = await Promise.all([
            getAllUsers(),
            getDepartments(),
          ]);
          if (!ignore) {
            setEmployees(res.data.data || []);
            const depts =
              deptRes.data.data ||
              deptRes.data.departments ||
              deptRes.data ||
              [];
            const activeDepts = depts.filter(
              (d) => d.status?.toLowerCase() === "active",
            );
            setDepartmentCount(activeDepts.length);
          }
        } else if (user?.id) {
          // Promise.allSettled — ek fail ho toh bhi baaki data load hoga
          const [
            profileRes,
            attendanceRes,
            leavesRes,
            holidaysRes,
            announcementsRes,
          ] = await Promise.allSettled([
            getUserById(user.id),
            getMyAttendance(user.id),
            getMyLeaves(),
            getHolidays(),
            getAnnouncements(),
          ]);

          if (!ignore) {
            // Profile — required, agar fail toh error dikhao
            if (profileRes.status === "fulfilled") {
              setProfile(profileRes.value.data.data);
            } else {
              throw new Error(
                profileRes.reason?.response?.data?.message ||
                "Failed to load profile",
              );
            }

            // Attendance — controller returns { success, count, attendance: [...] }
            if (attendanceRes.status === "fulfilled") {
              const d = attendanceRes.value.data;
              const raw = d.attendance || d.data || (Array.isArray(d) ? d : []);
              setMyAttendance(
                [...(Array.isArray(raw) ? raw : [])].sort(
                  (a, b) => new Date(b.date) - new Date(a.date),
                ),
              );
            } else {
              setMyAttendance([]);
            }

            // Leaves
            if (leavesRes.status === "fulfilled") {
              const raw =
                leavesRes.value.data.data || leavesRes.value.data || [];
              setMyLeaves(
                [...(Array.isArray(raw) ? raw : [])].sort(
                  (a, b) =>
                    new Date(b.startDate || b.createdAt) -
                    new Date(a.startDate || a.createdAt),
                ),
              );
            } else {
              setMyLeaves([]);
            }

            // Holidays
            if (holidaysRes.status === "fulfilled") {
              const raw =
                holidaysRes.value.data.data ||
                holidaysRes.value.data.holidays ||
                holidaysRes.value.data ||
                [];
              setHolidays(
                [...(Array.isArray(raw) ? raw : [])].sort(
                  (a, b) => new Date(a.date) - new Date(b.date),
                ),
              );
            } else {
              setHolidays([]);
            }

            // Announcements
            if (announcementsRes.status === "fulfilled") {
              const raw =
                announcementsRes.value.data.data ||
                announcementsRes.value.data.announcements ||
                announcementsRes.value.data ||
                [];
              setAnnouncements(
                [...(Array.isArray(raw) ? raw : [])].sort(
                  (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                ),
              );
            } else {
              setAnnouncements([]);
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err?.response?.data?.message ||
            "Failed to load data. Please try again.",
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, [isAdmin, user]);

  // ---- Admin actions ----

  const openEditForm = (emp) => {
    setEditingEmployee(emp);
    setShowForm(true);
  };

  const closeView = () => {
    setViewingEmployee(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleAdminFormSubmit = async (data) => {
    setSavingForm(true);
    setError("");
    try {
      const id = data._id || data.id;
      if (id) {
        const res = await updateUser(id, data);
        setEmployees((prev) =>
          prev.map((e) => (e._id === id ? res.data.data : e)),
        );
      } else {
        const res = await createUser(data);
        setEmployees((prev) => [...prev, res.data.data]);
      }
      closeForm();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save employee");
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    // Direct delete — modal se confirm aata hai
    setDeletingId(emp._id);
    setError("");
    try {
      await deleteUser(emp._id);
      setEmployees((prev) => prev.filter((e) => e._id !== emp._id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete employee");
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Employee (self) actions ----
  const handleSelfFormSubmit = async (data) => {
    setSavingForm(true);
    setError("");
    try {
      // Backend already strips role/status from this route,
      // so employee can only update their own allowed fields.
      const res = await updateUser(user.id, data);
      setProfile(res.data.data);
      setShowForm(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingForm(false);
    }
  };

  const adminStats = [
    {
      label: "Total Employees",
      value: employees.length || 0,
      icon: "👥",
      color: "from-blue-50 to-white",
      textColor: "text-blue-700",
      borderColor: "border-blue-100",
      shadowColor: "shadow-blue-500/10",
    },
    {
      label: "Active",
      value:
        employees.filter((e) => e.status?.toLowerCase() === "active").length ||
        0,
      icon: "✅",
      color: "from-emerald-50 to-white",
      textColor: "text-emerald-700",
      borderColor: "border-emerald-100",
      shadowColor: "shadow-emerald-500/10",
    },
    {
      label: "Inactive",
      value:
        employees.filter((e) => e.status?.toLowerCase() !== "active").length ||
        0,
      icon: "⛔",
      color: "from-red-50 to-white",
      textColor: "text-red-600",
      borderColor: "border-red-100",
      shadowColor: "shadow-red-500/10",
    },
    {
      label: "Departments",
      value: departmentCount || 0,
      icon: "🏢",
      color: "from-indigo-50 to-white",
      textColor: "text-indigo-700",
      borderColor: "border-indigo-100",
      shadowColor: "shadow-indigo-500/10",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto w-full page-enter">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stat cards — sirf admin ke liye */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
              : adminStats.map((s) => (
                <div
                  key={s.label}
                  className={`stat-card interactive-card bg-gradient-to-br ${s.color} rounded-xl shadow-md ${s.shadowColor} border ${s.borderColor} px-5 py-6 flex items-center gap-4 hover:shadow-lg`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl flex-shrink-0`}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                      {s.label}
                    </p>
                    <p
                      className={`text-3xl font-bold ${s.textColor} mt-0.5 stat-value`}
                    >
                      {s.value}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {loading && !isAdmin ? (
          <div className="flex flex-col gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <div
                  className="skeleton"
                  style={{ height: 56, borderRadius: "12px 12px 0 0" }}
                />
                <div className="p-4">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="skeleton skeleton-text mb-2"
                      style={{ width: `${60 + j * 10}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : loading && isAdmin ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <TableSkeleton rows={5} cols={5} />
            </div>
          </div>
        ) : isAdmin ? (
          /* ============ ADMIN VIEW: all employee records ============ */
          <>
            {/* ---- CHARTS ROW ---- */}
            {employees.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Bar Chart – Employees per Department */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">
                    Employees by Department
                  </h3>
                  <p className="text-sm text-black-400 mb-4">
                    Headcount per department
                  </p>
                  {(() => {
                    const map = {};
                    employees.forEach((e) => {
                      const dept = e.department || "Unknown";
                      map[dept] = (map[dept] || 0) + 1;
                    });
                    const data = Object.entries(map).map(([name, count]) => ({
                      name,
                      count,
                    }));

                    // Assign a minimum width of 90px per department so it doesn't squish and long names fit
                    const chartMinWidth = Math.max(500, data.length * 100);

                    return (
                      <div className="w-full overflow-x-auto scrollbar-hide pb-2">
                        <div style={{ minWidth: `${chartMinWidth}px` }}>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={data}
                              margin={{
                                top: 10,
                                right: 10,
                                left: -20,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="name"
                                interval={0}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis allowDecimals={false} />
                              <Tooltip
                                contentStyle={{
                                  width: 160,
                                  borderRadius: 8,
                                  border: "1px solid #e5e7eb",
                                  fontSize: 12,
                                }}
                                cursor={false}
                              />
                              <Bar
                                dataKey="count"
                                name="Employees"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={60}
                                activebar={false}
                              >
                                {data.map((_, i) => {
                                  const COLORS = [
                                    "#3b82f6", // blue-500
                                    "#10b981", // emerald-500
                                    "#f59e0b", // amber-500
                                    "#ef4444", // red-500
                                    "#8b5cf6", // violet-500
                                    "#ec4899", // pink-500
                                    "#14b8a6", // teal-500
                                    "#f97316", // orange-500
                                  ];
                                  return (
                                    <Cell
                                      key={i}
                                      fill={COLORS[i % COLORS.length]}
                                    />
                                  );
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Pie Chart – Active vs Inactive */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">
                    Employee Status
                  </h3>
                  <p className="text-sm text-black-700 mb-4">
                    Active vs Inactive breakdown
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Active",
                            value: employees.filter(
                              (e) => e.status?.toLowerCase() === "active",
                            ).length,
                          },
                          {
                            name: "Inactive",
                            value: employees.filter(
                              (e) => e.status?.toLowerCase() !== "active",
                            ).length,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        <Cell fill="#38bdf8" /> {/* light blue */}
                        <Cell fill="#4ade80" /> {/* light green */}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={10}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ---- Latest Employees Table ---- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">
                  Latest Employees
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Most recently added · showing up to 5
                </p>
              </div>

              {employees.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">
                  No employees found.
                </div>
              ) : (
                <>
                  {/* MOBILE: card list */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {[...employees]
                      .sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                      )
                      .slice(0, 5)
                      .map((emp) => (
                        <div key={emp._id} className="p-4 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              {emp.profileImage ? (
                                <img
                                  src={emp.profileImage}
                                  alt={`${emp.firstName} ${emp.lastName}`}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-indigo-500 to-fuchsia-500 shrink-0 select-none">
                                  {`${emp.firstName?.[0] ?? ""}${emp.lastName?.[0] ?? ""}`.toUpperCase() ||
                                    "?"}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">
                                  {emp.firstName} {emp.lastName}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {emp.designation || "--"} &middot;{" "}
                                  {emp.department || "--"}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {emp.email || "--"}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {emp.gender || "--"}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${emp.status?.toLowerCase() === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {emp.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* DESKTOP: table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-blue-700 text-left text-white">
                          <th className="px-6 py-3 font-medium">Employee</th>
                          <th className="px-6 py-3 font-medium">Email</th>
                          <th className="px-6 py-3 font-medium">Gender</th>
                          <th className="px-6 py-3 font-medium">Department</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...employees]
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt) - new Date(a.createdAt),
                          )
                          .slice(0, 5)
                          .map((emp) => (
                            <tr
                              key={emp._id}
                              className="border-t border-gray-100 hover:bg-gray-50 transition"
                            >
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  {emp.profileImage ? (
                                    <img
                                      src={emp.profileImage}
                                      alt={`${emp.firstName} ${emp.lastName}`}
                                      className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-indigo-500 to-fuchsia-500 shrink-0 select-none">
                                      {`${emp.firstName?.[0] ?? ""}${emp.lastName?.[0] ?? ""}`.toUpperCase() ||
                                        "?"}
                                    </div>
                                  )}
                                  <span className="text-gray-800 font-medium">
                                    {emp.firstName} {emp.lastName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-gray-600">
                                {emp.email || "--"}
                              </td>
                              <td className="px-6 py-3 text-gray-600">
                                {emp.gender || "--"}
                              </td>
                              <td className="px-6 py-3 text-gray-600">
                                {emp.department || "--"}
                              </td>
                              <td className="px-6 py-3">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${emp.status?.toLowerCase() === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                >
                                  {emp.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          /* ============ EMPLOYEE VIEW — 4 Separate Cards ============ */
          <div className="flex flex-col gap-6">
            {/* ===== EMPLOYEE STAT CARDS ===== */}
            {(() => {
              const presentCount = myAttendance.filter(
                (r) =>
                  (r.attendanceStatus || r.status || "").toLowerCase() ===
                  "present",
              ).length;

              const approvedLeaves = myLeaves.filter(
                (l) => l.status?.toLowerCase() === "approved",
              ).length;
              const today = new Date();
              const upcomingHolidays = holidays.filter(
                (h) => h.date && new Date(h.date) >= today,
              ).length;

              const empStats = [
                {
                  label: "Total Attendance",
                  value: myAttendance.length,
                  icon: "🕐",
                  color: "from-blue-50 to-white",
                  textColor: "text-blue-700",
                  borderColor: "border-blue-100",
                  shadowColor: "shadow-blue-500/10",
                },
                {
                  label: "Days Present",
                  value: presentCount,
                  icon: "✅",
                  color: "from-emerald-50 to-white",
                  textColor: "text-emerald-700",
                  borderColor: "border-emerald-100",
                  shadowColor: "shadow-emerald-500/10",
                },
                {
                  label: "Leaves Approved",
                  value: approvedLeaves,
                  icon: "🌿",
                  color: "from-green-50 to-white",
                  textColor: "text-green-700",
                  borderColor: "border-green-100",
                  shadowColor: "shadow-green-500/10",
                },
                {
                  label: "Upcoming Holidays",
                  value: upcomingHolidays,
                  icon: "🎉",
                  color: "from-amber-50 to-white",
                  textColor: "text-amber-700",
                  borderColor: "border-amber-100",
                  shadowColor: "shadow-amber-500/10",
                },
              ];

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {empStats.map((s) => (
                    <div
                      key={s.label}
                      className={`stat-card interactive-card bg-gradient-to-br ${s.color} rounded-xl shadow-md ${s.shadowColor} border ${s.borderColor} px-4 py-5 flex items-center gap-3 hover:shadow-lg`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl flex-shrink-0">
                        {s.icon}
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide leading-tight">
                          {s.label}
                        </p>
                        <p
                          className={`text-2xl font-bold ${s.textColor} mt-0.5 stat-value`}
                        >
                          {s.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ===== EMPLOYEE CHARTS ROW ===== */}
            {(myAttendance.length > 0 || myLeaves.length > 0) &&
              (() => {
                // Monthly attendance trend — last 3 months
                const monthMap = {};
                const now = new Date();
                for (let i = 2; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const key = d.toLocaleDateString("en-IN", {
                    month: "short",
                    year: "2-digit",
                  });
                  monthMap[key] = {
                    month: key,
                    Present: 0,
                    Absent: 0,
                    Late: 0,
                  };
                }
                myAttendance.forEach((rec) => {
                  if (!rec.date) return;
                  const d = new Date(rec.date);
                  const key = d.toLocaleDateString("en-IN", {
                    month: "short",
                    year: "2-digit",
                  });
                  if (!monthMap[key]) return;
                  const status =
                    rec.attendanceStatus || rec.status || "Present";
                  if (status === "Present") monthMap[key].Present++;
                  else if (status === "Absent") monthMap[key].Absent++;
                  else if (status === "Late") monthMap[key].Late++;
                });
                const trendData = Object.values(monthMap);

                // Leave status breakdown
                const leaveStatusMap = {
                  Approved: 0,
                  Pending: 0,
                  Rejected: 0,
                  Cancelled: 0,
                };
                myLeaves.forEach((l) => {
                  const s = l.status || "Pending";
                  if (leaveStatusMap[s] !== undefined) leaveStatusMap[s]++;
                  else leaveStatusMap[s] = 1;
                });
                const leaveData = Object.entries(leaveStatusMap)
                  .filter(([, v]) => v > 0)
                  .map(([name, value]) => ({ name, value }));
                const LEAVE_COLORS = {
                  Approved: "#10b981",
                  Pending: "#f59e0b",
                  Rejected: "#ef4444",
                  Cancelled: "#94a3b8",
                };

                // Attendance status pie data
                const attStatusMap = {};
                myAttendance.forEach((rec) => {
                  const s = rec.attendanceStatus || rec.status || "Present";
                  attStatusMap[s] = (attStatusMap[s] || 0) + 1;
                });

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                    {/* Monthly Attendance Trend */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col min-h-[400px]">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <h3 className="text-base font-bold text-gray-800">
                            📊 Monthly Attendance Trend
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Last 3 months — Present / Absent / Late
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                            Present
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
                            Absent
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block"></span>
                            Late
                          </span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={trendData}
                          margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                          barGap={6}
                          barCategoryGap="15%"
                        >
                          <defs>
                            <linearGradient
                              id="presentGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#3b82f6"
                                stopOpacity={1}
                              />
                              <stop
                                offset="100%"
                                stopColor="#60a5fa"
                                stopOpacity={0.7}
                              />
                            </linearGradient>
                            <linearGradient
                              id="absentGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#ef4444"
                                stopOpacity={1}
                              />
                              <stop
                                offset="100%"
                                stopColor="#f87171"
                                stopOpacity={0.7}
                              />
                            </linearGradient>
                            <linearGradient
                              id="lateGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#f97316"
                                stopOpacity={1}
                              />
                              <stop
                                offset="100%"
                                stopColor="#fb923c"
                                stopOpacity={0.7}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 12,
                              fill: "#6b7280",
                              fontWeight: 500,
                            }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 10,
                              border: "1px solid #e5e7eb",
                              fontSize: 13,
                              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                              padding: "10px 16px",
                            }}
                            cursor={false}
                          />
                          <Bar
                            dataKey="Present"
                            fill="url(#presentGrad)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={36}
                          />
                          <Bar
                            dataKey="Absent"
                            fill="url(#absentGrad)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={36}
                          />
                          <Bar
                            dataKey="Late"
                            fill="url(#lateGrad)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={36}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Leave Status Donut */}
                    {myLeaves.length > 0 ? (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center min-h-[400px]">
                        <h3 className="text-base font-bold text-gray-800 mb-1 text-center">
                          🌿 Leave Status
                        </h3>
                        <p className="text-xs text-gray-400 mb-4 text-center">
                          Approved / Pending / Rejected
                        </p>
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <Pie
                              data={leaveData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                              labelLine={true}
                            >
                              {leaveData.map((entry, i) => (
                                <Cell
                                  key={i}
                                  fill={LEAVE_COLORS[entry.name] || "#94a3b8"}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                fontSize: 12,
                              }}
                            />
                            <Legend
                              iconType="circle"
                              iconSize={10}
                              wrapperStyle={{ fontSize: 12 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
                        No leave data found.
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* ===== CARD 3: HOLIDAYS ===== */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-600">
                <div className="flex items-center gap-2">
                  <span className="text-white text-lg">🎉</span>
                  <h2 className="text-base font-semibold text-white">
                    Holiday List
                  </h2>
                </div>
                <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">
                  {holidays.length} holidays
                </span>
              </div>
              {holidays.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <div className="text-4xl mb-2">🎉</div>
                  <p>Koi holiday nahi mili</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-amber-50 text-left text-amber-800">
                        <th className="px-5 py-3 font-semibold">
                          Holiday Name
                        </th>
                        <th className="px-5 py-3 font-semibold">Date</th>
                        <th className="px-5 py-3 font-semibold">Day</th>
                        <th className="px-5 py-3 font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {holidays.map((hol, i) => {
                        const holDate = hol.date ? new Date(hol.date) : null;
                        const today = new Date();
                        const isPast = holDate && holDate < today;
                        return (
                          <tr
                            key={hol._id || i}
                            className={`hover:bg-gray-50 transition ${isPast ? "opacity-50" : ""}`}
                          >
                            <td className="px-5 py-3 font-medium text-gray-800">
                              <div className="flex items-center gap-2">
                                <span>{isPast ? "📅" : "🎉"}</span>
                                {hol.name || hol.holidayName || "Holiday"}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {holDate
                                ? holDate.toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                                : "--"}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {holDate
                                ? holDate.toLocaleDateString("en-IN", {
                                  weekday: "long",
                                })
                                : "--"}
                            </td>
                            <td className="px-5 py-3">
                              {hol.type ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  {hol.type}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ===== CARD 4: ANNOUNCEMENTS ===== */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-purple-700">
                <div className="flex items-center gap-2">
                  <span className="text-white text-lg">📢</span>
                  <h2 className="text-base font-semibold text-white">
                    Announcements
                  </h2>
                </div>
                <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">
                  {announcements.length} announcements
                </span>
              </div>
              {announcements.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <div className="text-4xl mb-2">📢</div>
                  <p>Koi announcement nahi mili</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {announcements.map((ann, i) => (
                    <div
                      key={ann._id || i}
                      className="px-5 py-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                            <span className="text-base">📢</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              {ann.title || "Announcement"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              {ann.message ||
                                ann.description ||
                                ann.content ||
                                "--"}
                            </p>
                            {ann.targetAudience && (
                              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                                {ann.targetAudience}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 pt-0.5">
                          {ann.createdAt
                            ? new Date(ann.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                            : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit modal - reused for both roles, form adapts via `mode` */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <EmployeeForm
            initialData={isAdmin ? editingEmployee : profile}
            mode={isAdmin ? "admin" : "self"}
            saving={savingForm}
            onSubmit={isAdmin ? handleAdminFormSubmit : handleSelfFormSubmit}
            onCancel={closeForm}
          />
        </div>
      )}

      {/* View modal - admin only, read-only employee details */}
      {viewingEmployee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {viewingEmployee.firstName} {viewingEmployee.lastName}
              </h3>
              <button
                onClick={closeView}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Profile picture section in View modal */}
            <div className="flex flex-col items-center gap-2 mb-5">
              {viewingEmployee.profileImage ? (
                <img
                  src={viewingEmployee.profileImage}
                  alt={`${viewingEmployee.firstName} ${viewingEmployee.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-indigo-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-4 border-white shadow-md select-none">
                  {`${viewingEmployee.firstName?.[0] ?? ""}${viewingEmployee.lastName?.[0] ?? ""}`.toUpperCase() ||
                    "?"}
                </div>
              )}
              <div className="text-center">
                <p className="font-semibold text-gray-800">
                  {viewingEmployee.firstName} {viewingEmployee.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {viewingEmployee.designation || ""}
                  {viewingEmployee.designation && viewingEmployee.department
                    ? " · "
                    : ""}
                  {viewingEmployee.department || ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Email</p>
                <p className="text-gray-800 font-medium">
                  {viewingEmployee.email}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Phone</p>
                <p className="text-gray-800 font-medium">
                  {viewingEmployee.phoneNumber || "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Designation</p>
                <p className="text-gray-800 font-medium">
                  {viewingEmployee.designation || "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Department</p>
                <p className="text-gray-800 font-medium">
                  {viewingEmployee.department || "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Employment Type</p>
                <p className="text-gray-800 font-medium">
                  {viewingEmployee.employmentType || "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Status</p>
                <p className="text-gray-800 font-medium">
                  {viewingEmployee.status || "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Joining Date</p>
                <p className="text-gray-800 font-medium">
                  {viewingEmployee.joiningDate
                    ? new Date(viewingEmployee.joiningDate).toLocaleDateString()
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Role</p>
                <p className="text-gray-800 font-medium">
                  {viewingEmployee.role || "--"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  closeView();
                  openEditForm(viewingEmployee);
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Edit
              </button>
              <button
                onClick={closeView}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======== DELETE CONFIRMATION MODAL ======== */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-4 sm:p-6 max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            {/* Text */}
            <h3 className="text-lg font-bold text-gray-800 text-center">
              Delete Employee?
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-700">
                {deleteConfirm.emp.firstName} {deleteConfirm.emp.lastName}
              </span>
              ?
            </p>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingId === deleteConfirm.emp._id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEmployee(deleteConfirm.emp)}
                disabled={deletingId === deleteConfirm.emp._id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === deleteConfirm.emp._id ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
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
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

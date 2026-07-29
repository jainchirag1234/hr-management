import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import EmployeeForm from "./EmployeeForm";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getDepartments,
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
          const res = await getUserById(user.id);
          if (!ignore) setProfile(res.data.data);
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
    { label: "Total Employees", value: employees.length || "--" },
    {
      label: "Active",
      value:
        employees.filter((e) => e.status?.toLowerCase() === "active").length ||
        "--",
    },
    {
      label: "Inactive",
      value:
        employees.filter((e) => e.status?.toLowerCase() !== "active").length ||
        "--",
    },
    {
      label: "Departments",
      value: departmentCount || "--",
    },
  ];

  const employeeStats = [
    { label: "Department", value: profile?.department ?? "--" },
    { label: "Designation", value: profile?.designation ?? "--" },
    { label: "Employment Type", value: profile?.employmentType ?? "--" },
    { label: "Status", value: profile?.status ?? "--" },
  ];

  const stats = isAdmin ? adminStats : employeeStats;

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto w-full">
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

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <p className="text-gray-500 text-sm">{s.label}</p>
              <p
                className="
                text-3xl
                font-bold
                bg-blue-700
                bg-clip-text
                text-transparent
                mt-1
                "
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 text-sm">
            Loading...
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
                    const chartMinWidth = Math.max(100, data.length * 90);

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
                                maxBarSize={32}
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
          /* ============ EMPLOYEE VIEW: own record only ============ */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                My Profile
              </h2>
            </div>

            {profile && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 sm:px-6 py-4 sm:py-6 text-sm">
                <div>
                  <p className="text-gray-400">Full Name</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {profile.firstName} {profile.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Email</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {profile.email}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Phone</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {profile.phoneNumber || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Designation</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {profile.designation || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Department</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {profile.department || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Joining Date</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {profile.joiningDate
                      ? new Date(profile.joiningDate).toLocaleDateString()
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Address</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {profile.address || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Emergency Contact</p>
                  <p className="text-gray-800 font-medium mt-0.5">
                    {profile.emergencyContactName
                      ? `${profile.emergencyContactName} (${profile.emergencyContactNumber || "--"})`
                      : "--"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add / Edit modal - reused for both roles, form adapts via `mode` */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
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

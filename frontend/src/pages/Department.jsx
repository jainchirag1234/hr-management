/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
  getAllUsers,
} from "../services/auth.service";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  manager: "",
  status: "active",
};

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null); // dept | null
  const [deletingId, setDeletingId] = useState(null);

  // ==========================
  // GET ALL DEPARTMENTS
  // ==========================
  const fetchDepartments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDepartments();
      setDepartments(res.data.data || res.data.departments || res.data || []);
      const userRes = await getAllUsers();
      setUsers(userRes.data.data || userRes.data.users || userRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err?.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // ==========================
  // FORM HANDLERS
  // ==========================
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (dept) => {
    setEditingId(dept._id);
    setFormData({
      name: dept.name || "",
      code: dept.code || "",
      description: dept.description || "",
      manager: dept.manager?._id || dept.manager || "",
      status: dept.status || "active",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  // ==========================
  // CREATE / UPDATE
  // ==========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateDepartment(editingId, formData);
      } else {
        await createDepartment(formData);
      }
      closeForm();
      fetchDepartments();
    } catch (err) {
      console.log(err);
      setError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ==========================
  // DELETE
  // ==========================
  const handleDelete = async (id) => {
    setDeletingId(id);
    setError("");
    try {
      await deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete department");
    } finally {
      setDeletingId(null);
    }
  };

  const stats = [
    {
      label: "Total Departments",
      value: departments.length,
      colorClass: "bg-blue-700 bg-clip-text text-transparent",
    },
    {
      label: "Active",
      value: departments.filter((d) => d.status?.toLowerCase() === "active")
        .length,
      colorClass: "text-green-600",
    },
    {
      label: "Inactive",
      value: departments.filter((d) => d.status?.toLowerCase() !== "active")
        .length,
      colorClass: "text-red-600",
    },
  ];

  return (
    <div className="w-full bg-gray-50">
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

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="stat-card interactive-card bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-md shadow-blue-500/10 border border-blue-100 px-5 py-7 flex flex-col justify-center hover:shadow-lg hover:shadow-blue-500/20"
            >
              <p className="text-gray-500 text-sm">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.colorClass}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl shadow-md shadow-blue-500/10 border border-blue-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Departments</h2>
            <button
              onClick={openAddForm}
              className="text-sm font-medium text-white px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 transition"
            >
              + Add Department
            </button>
          </div>

          {loading ? (
            <div className="overflow-hidden">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="skeleton skeleton-row" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              No departments found.
            </div>
          ) : (
            <>
              {/* MOBILE: card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {departments.map((dept) => (
                  <div key={dept._id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {dept.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Code: {dept.code || "--"} | Manager:{" "}
                          {dept.manager
                            ? `${dept.manager.firstName} ${dept.manager.lastName}`
                            : "--"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                          dept.status?.toLowerCase() === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {dept.status}
                      </span>
                    </div>
                    {dept.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {dept.description}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEditForm(dept)}
                        className="flex-1 text-center text-xs font-medium text-sky-600 border border-sky-200 rounded-lg py-1.5 hover:bg-sky-50 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(dept)}
                        disabled={deletingId === dept._id}
                        className="flex-1 text-center text-xs font-medium text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        {deletingId === dept._id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-sky-600 text-left text-white">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Code</th>
                      <th className="px-6 py-3 font-medium">Manager</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="table-zebra">
                    {departments.map((dept) => (
                      <tr
                        key={dept._id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-3 text-gray-800 font-medium">
                          {dept.name}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {dept.code || "--"}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {dept.manager
                            ? `${dept.manager.firstName} ${dept.manager.lastName}`
                            : "--"}
                        </td>
                        <td className="px-6 py-3 text-gray-600 max-w-xs truncate">
                          {dept.description || "--"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              dept.status?.toLowerCase() === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {dept.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right space-x-3">
                          <button
                            onClick={() => openEditForm(dept)}
                            className="text-sky-600 hover:text-sky-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(dept)}
                            disabled={deletingId === dept._id}
                            className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            {deletingId === dept._id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 modal-backdrop">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto modal-content">
            <div className="flex items-center justify-between mb-5 bg-sky-50 p-4 sm:px-6 sm:py-5 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 rounded-t-xl border-b border-sky-100">
              <h3 className="text-xl font-bold text-sky-800">
                {editingId ? "Edit Department" : "Add Department"}
              </h3>
              <button
                onClick={closeForm}
                className="text-sky-400 hover:text-sky-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Department Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Manager
                </label>
                <select
                  name="manager"
                  value={formData.manager}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select Manager</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Department"
                      : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-4 sm:p-6 max-h-[90vh] overflow-y-auto modal-content">
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

            <h3 className="text-lg font-bold text-gray-800 text-center">
              Delete Department?
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-700">
                {deleteConfirm.name}
              </span>
              ?
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingId === deleteConfirm._id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                disabled={deletingId === deleteConfirm._id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50"
              >
                {deletingId === deleteConfirm._id ? "Deleting..." : " Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Department;

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import {
  createDesignation,
  getDesignations,
  updateDesignation,
  deleteDesignation,
  getDepartments,
} from "../services/auth.service";

const emptyForm = {
  name: "",
  description: "",
  department: "",
  status: "active",
};

const Designation = () => {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null); // designation | null
  const [deletingId, setDeletingId] = useState(null);

  // ==========================
  // GET ALL DESIGNATIONS
  // ==========================
  const fetchDesignations = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDesignations();
      setDesignations(res.data.data || res.data.designations || res.data || []);
      const deptRes = await getDepartments();
      setDepartments(
        deptRes.data.data || deptRes.data.departments || deptRes.data || [],
      );
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err?.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
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

  const openEditForm = (designation) => {
    setEditingId(designation._id);
    setFormData({
      name: designation.name || "",
      description: designation.description || "",
      department: designation.department?._id || designation.department || "",
      status: designation.status || "active",
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
        await updateDesignation(editingId, formData);
      } else {
        await createDesignation(formData);
      }
      closeForm();
      fetchDesignations();
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
      await deleteDesignation(id);
      setDesignations((prev) => prev.filter((d) => d._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete designation");
    } finally {
      setDeletingId(null);
    }
  };

  const stats = [
    {
      label: "Total Designations",
      value: designations.length,
      colorClass:
        "bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent",
    },
    {
      label: "Active",
      value: designations.filter((d) => d.status?.toLowerCase() === "active")
        .length,
      colorClass: "text-green-600",
    },
    {
      label: "Inactive",
      value: designations.filter((d) => d.status?.toLowerCase() !== "active")
        .length,
      colorClass: "text-red-600",
    },
  ];

  return (
    <div className="w-full bg-gray-50">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <p className="text-gray-500 text-sm">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.colorClass}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Designations
            </h2>
            <button
              onClick={openAddForm}
              className="text-sm font-medium text-white px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-90 transition"
            >
              + Add Designation
            </button>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Loading...
            </div>
          ) : designations.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              No designations found.
            </div>
          ) : (
            <>
              {/* MOBILE: card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {designations.map((designation) => (
                  <div
                    key={designation._id}
                    className="p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {designation.name}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                          designation.status?.toLowerCase() === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {designation.status}
                      </span>
                    </div>
                    {designation.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {designation.description}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEditForm(designation)}
                        className="flex-1 text-center text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(designation)}
                        disabled={deletingId === designation._id}
                        className="flex-1 text-center text-xs font-medium text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        {deletingId === designation._id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Department</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {designations.map((designation) => (
                      <tr
                        key={designation._id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-3 text-gray-800 font-medium">
                          {designation.name}
                        </td>

                        <td className="px-6 py-3 text-gray-600">
                          {designation.department?.name || "--"}
                        </td>
                        <td className="px-6 py-3 text-gray-600 max-w-xs truncate">
                          {designation.description || "--"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              designation.status?.toLowerCase() === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {designation.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right space-x-3">
                          <button
                            onClick={() => openEditForm(designation)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(designation)}
                            disabled={deletingId === designation._id}
                            className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            {deletingId === designation._id
                              ? "Deleting..."
                              : "Delete"}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId ? "Edit Designation" : "Add Designation"}
              </h3>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Designation Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-90 rounded-xl transition disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Designation"
                      : "Create Designation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
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
              Delete Designation?
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              {" "}
              <span className="font-semibold text-gray-700">
                {deleteConfirm.name}
              </span>{" "}
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
                {deletingId === deleteConfirm._id ? "Deleting..." : "Delete "}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Designation;

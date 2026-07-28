/* eslint-disable react-hooks/set-state-in-effect */
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../services/auth.service";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function Announcement() {
  const { user } = useContext(AuthContext);

  const role = (user?.role ?? "").toString().trim().toLowerCase();
  const isAdmin = role === "admin";

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { announcement } ya null

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    publishDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    priority: "low",
  });

  // ---------- Fetch announcements ----------
  const fetchAnnouncements = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAnnouncements();

      // Backend response kabhi direct array hoti hai,
      // kabhi { data: [...] } ya { announcements: [...] } wrap kiya hua object
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.announcements)
            ? res.data.announcements
            : [];

      setAnnouncements(list);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ---------- Active announcements (employee view) ----------
  const today = new Date(new Date().toDateString());

  const isActive = (announcement) => {
    if (!announcement.expiryDate) return true;
    return new Date(announcement.expiryDate) >= today;
  };

  const activeAnnouncements = announcements.filter(isActive);

  const rows = isAdmin ? announcements : activeAnnouncements;

  const stats = [
    { label: "Total Announcements", value: announcements.length || 0 },
    { label: "Active", value: activeAnnouncements.length || 0 },
  ];

  // ---------- Form handlers ----------
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      publishDate: new Date().toISOString().slice(0, 10),
      expiryDate: "",
      priority: "low",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingForm(true);
    setError("");
    try {
      if (editingId) {
        const res = await updateAnnouncement(editingId, formData);
        const updated = res?.data?.data ||
          res?.data || { ...formData, _id: editingId };
        setAnnouncements((prev) =>
          prev.map((a) => (a._id === editingId ? updated : a)),
        );
      } else {
        const res = await createAnnouncement(formData);
        const created = res?.data?.data || res?.data;
        setAnnouncements((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setSavingForm(false);
    }
  };

  const handleEdit = (announcement) => {
    setFormData({
      title: announcement.title,
      description: announcement.description || "",
      publishDate:
        announcement.publishDate?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      expiryDate: announcement.expiryDate?.slice(0, 10) || "",
      priority: announcement.priority || "low",
    });
    setEditingId(announcement._id);
    setShowForm(true);
  };

  const handleDelete = async (announcement) => {
    setDeletingId(announcement._id);
    setError("");
    try {
      await deleteAnnouncement(announcement._id);
      setAnnouncements((prev) =>
        prev.filter((a) => a._id !== announcement._id),
      );
      setDeleteConfirm(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "--";

  const priorityBadgeClass = (priority) => {
    switch (priority) {
      case "Urgent":
        return "bg-red-50 text-red-600";
      case "Important":
        return "bg-amber-50 text-amber-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

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
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        {stats.map((s, index) => {
          const themes = [
            {
              bg: "from-indigo-50 to-fuchsia-50",
              border: "border-indigo-100",
              label: "text-indigo-600/70",
              value: "text-indigo-700",
              iconBg: "bg-indigo-100",
              iconColor: "text-indigo-600",
              blob: "bg-indigo-100/40",
            },
            {
              bg: "from-emerald-50 to-teal-50",
              border: "border-emerald-100",
              label: "text-emerald-600/70",
              value: "text-emerald-700",
              iconBg: "bg-emerald-100",
              iconColor: "text-emerald-600",
              blob: "bg-emerald-100/40",
            },
            {
              bg: "from-amber-50 to-orange-50",
              border: "border-amber-100",
              label: "text-amber-600/70",
              value: "text-amber-700",
              iconBg: "bg-amber-100",
              iconColor: "text-amber-600",
              blob: "bg-amber-100/40",
            },
            {
              bg: "from-sky-50 to-cyan-50",
              border: "border-sky-100",
              label: "text-sky-600/70",
              value: "text-sky-700",
              iconBg: "bg-sky-100",
              iconColor: "text-sky-600",
              blob: "bg-sky-100/40",
            },
          ];
          const theme = themes[index % themes.length];

          return (
            <div
              key={s.label}
              className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} rounded-xl border ${theme.border} p-5`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${theme.label} text-sm font-medium`}>
                    {s.label}
                  </p>
                  <p className={`text-3xl font-bold ${theme.value} mt-1`}>
                    {s.value}
                  </p>
                </div>
                <div
                  className={`w-11 h-11 rounded-full ${theme.iconBg} flex items-center justify-center shrink-0`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 ${theme.iconColor}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
              <div
                className={`absolute -right-4 -bottom-4 w-20 h-20 ${theme.blob} rounded-full`}
              />
            </div>
          );
        })}
      </div>
      {/* Announcements card */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {isAdmin ? "Announcements" : "Active Announcements"}
          </h2>
          {isAdmin && (
            <button
              onClick={openAddForm}
              className="text-sm font-medium text-white px-4 py-2.5 rounded-lg bg-blue-700  hover:opacity-90 transition shrink-0"
            >
              + Add Announcement
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            No announcements found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Expiry Date</th>
                  <th className="px-6 py-3 font-medium">Priority</th>
                  {isAdmin && <th className="px-6 py-3 font-medium">Status</th>}
                  {isAdmin && (
                    <th className="px-6 py-3 font-medium text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((announcement) => (
                  <tr
                    key={announcement._id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-3 text-gray-800 font-medium">
                      {announcement.title}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {announcement.description || "--"}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {formatDate(announcement.expiryDate)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityBadgeClass(
                          announcement.priority,
                        )}`}
                      >
                        {announcement.priority || "Normal"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3">
                        {isActive(announcement) ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Expired
                          </span>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-6 py-3 text-right space-x-3">
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ announcement })}
                          disabled={deletingId === announcement._id}
                          className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                        >
                          {deletingId === announcement._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </main>

      {/* Add / Edit modal - admin only */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? "Edit Announcement" : "Add Announcement"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Office closed on Friday"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
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
                  placeholder="Announcement details"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Publish Date
                </label>
                <input
                  type="date"
                  name="publishDate"
                  value={formData.publishDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-blue-700 hover:opacity-90 transition disabled:opacity-50"
                >
                  {savingForm
                    ? "Saving..."
                    : editingId
                      ? "Update Announcement"
                      : "Create Announcement"}
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
              Delete Announcement?
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              {" "}
              <span className="font-semibold text-gray-700">
                {deleteConfirm.announcement.title}
              </span>{" "}
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingId === deleteConfirm.announcement._id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.announcement)}
                disabled={deletingId === deleteConfirm.announcement._id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === deleteConfirm.announcement._id ? (
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

export default Announcement;

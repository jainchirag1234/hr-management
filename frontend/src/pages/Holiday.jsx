/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../services/auth.service";

const TYPE_OPTIONS = ["National", "Optional", "Regional", "Restricted"];

function Holiday() {
  const { user } = useContext(AuthContext);

  const role = (user?.role ?? "").toString().trim().toLowerCase();
  const isAdmin = role === "admin";

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { holiday } ya null

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    Description: "",
    type: "National",
  });

  // ---------- Fetch holidays ----------
  const fetchHolidays = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getHolidays();

      // Backend response kabhi direct array hoti hai,
      // kabhi { data: [...] } ya { holidays: [...] } wrap kiya hua object
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.holidays)
            ? res.data.holidays
            : [];

      setHolidays(list);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // ---------- Upcoming holidays (employee view) ----------
  const today = new Date();
  const upcomingHolidays = holidays.filter(
    (h) => new Date(h.date) >= new Date(today.toDateString()),
  );

  const rows = isAdmin ? holidays : upcomingHolidays;

  const stats = [
    { label: "Total Holidays", value: holidays.length || 0 },
    { label: "Upcoming", value: upcomingHolidays.length || 0 },
  ];

  // ---------- Form handlers ----------
  const resetForm = () => {
    setFormData({ name: "", date: "", Description: "", type: "National" });
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
        const res = await updateHoliday(editingId, formData);
        const updated = res?.data?.data ||
          res?.data || { ...formData, _id: editingId };
        setHolidays((prev) =>
          prev.map((h) => (h._id === editingId ? updated : h)),
        );
      } else {
        const res = await createHoliday(formData);
        const created = res?.data?.data || res?.data;
        setHolidays((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setSavingForm(false);
    }
  };

  const handleEdit = (holiday) => {
    setFormData({
      name: holiday.name,
      date: holiday.date?.slice(0, 10), // yyyy-mm-dd for input[type=date]
      Description: holiday.Description || "",
      type: holiday.type || "National",
    });
    setEditingId(holiday._id);
    setShowForm(true);
  };

  const handleDelete = async (holiday) => {
    setDeletingId(holiday._id);
    setError("");
    try {
      await deleteHoliday(holiday._id);
      setHolidays((prev) => prev.filter((h) => h._id !== holiday._id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete holiday");
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
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-fuchsia-50 rounded-xl border border-indigo-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-600/70 text-sm font-medium">
                Total Holidays
              </p>
              <p className="text-3xl font-bold text-indigo-700 mt-1">
                {holidays.length || 0}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-100/40 rounded-full" />
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-600/70 text-sm font-medium">
                Upcoming
              </p>
              <p className="text-3xl font-bold text-emerald-700 mt-1">
                {upcomingHolidays.length || 0}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-100/40 rounded-full" />
        </div>
      </div>

      {/* Holidays card */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {isAdmin ? "Holidays" : "Upcoming Holidays"}
          </h2>
          {isAdmin && (
            <button
              onClick={openAddForm}
              className="text-sm font-medium text-white px-4 py-2.5 rounded-lg bg-blue-700 hover:opacity-90 transition shrink-0"
            >
              + Add Holiday
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            No holidays found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  {isAdmin && (
                    <th className="px-6 py-3 font-medium text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((holiday) => (
                  <tr
                    key={holiday._id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-3 text-gray-800 font-medium">
                      {holiday.name}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {formatDate(holiday.date)}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {holiday.Description || "--"}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {holiday.type || "--"}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3 text-right space-x-3">
                        <button
                          onClick={() => handleEdit(holiday)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ holiday })}
                          disabled={deletingId === holiday._id}
                          className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                        >
                          {deletingId === holiday._id
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
                {editingId ? "Edit Holiday" : "Add Holiday"}
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
                  Holiday Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Diwali"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  name="Description"
                  value={formData.Description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Optional details"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
                      ? "Update Holiday"
                      : "Create Holiday"}
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
              Delete Holiday?
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              {" "}
              <span className="font-semibold text-gray-700">
                {deleteConfirm.holiday.name}
              </span>{" "}
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingId === deleteConfirm.holiday._id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.holiday)}
                disabled={deletingId === deleteConfirm.holiday._id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === deleteConfirm.holiday._id ? (
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
                  " Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Holiday;

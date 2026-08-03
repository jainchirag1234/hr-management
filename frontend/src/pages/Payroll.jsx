/* eslint-disable react-hooks/set-state-in-effect */
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  getAllPayroll,
  getMyPayslips,
  generatePayrollApi,
  markPayslipAsPaid,
} from "../services/auth.service";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "--";

const statusBadge = (s) => {
  if (s === "Paid") return "bg-green-50 text-green-700 border border-green-200";
  if (s === "Processing")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function Payroll() {
  const { user } = useContext(AuthContext);
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Admin filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterStatus, setFilterStatus] = useState("");

  // Employee filters (client-side)
  const [empFilterMonth, setEmpFilterMonth] = useState("");
  const [empFilterYear, setEmpFilterYear] = useState("");

  // Generate modal state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genMonth, setGenMonth] = useState(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState(String(currentYear));
  const [generating, setGenerating] = useState(false);

  // Mark Paid modal state
  const [markPaidTarget, setMarkPaidTarget] = useState(null);
  const [markForm, setMarkForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: "Bank Transfer",
    transactionRef: "",
  });
  const [markingSaving, setMarkingSaving] = useState(false);

  // Payslip detail modal
  const [viewPayslip, setViewPayslip] = useState(null);

  const fetchPayrolls = async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (isAdmin) {
        const params = {};
        if (filterMonth) params.month = filterMonth;
        if (filterYear) params.year = filterYear;
        if (filterStatus) params.status = filterStatus;
        res = await getAllPayroll(params);
      } else {
        res = await getMyPayslips();
      }
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setPayrolls(list);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load payroll");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [filterMonth, filterYear, filterStatus]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const res = await generatePayrollApi({
        month: Number(genMonth),
        year: Number(genYear),
      });
      setSuccess(res.data?.message || "Payroll generated!");
      setShowGenerate(false);
      fetchPayrolls();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    setMarkingSaving(true);
    setError("");
    setSuccess("");
    try {
      await markPayslipAsPaid(markPaidTarget._id, markForm);
      setSuccess("Payslip marked as paid!");
      setMarkPaidTarget(null);
      fetchPayrolls();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update");
    } finally {
      setMarkingSaving(false);
    }
  };

  // Stats
  const total = payrolls.length;
  const paid = payrolls.filter((p) => p.paymentStatus === "Paid").length;
  const pending = payrolls.filter((p) => p.paymentStatus === "Pending").length;
  const totalNetPay = payrolls.reduce((s, p) => s + (p.netPay || 0), 0);

  // Apply client-side filters for employee
  const displayPayrolls = isAdmin
    ? payrolls
    : payrolls.filter((p) => {
        if (empFilterMonth && String(p.month) !== empFilterMonth) return false;
        if (empFilterYear && String(p.year) !== empFilterYear) return false;
        return true;
      });

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto w-full page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Payroll</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isAdmin
                ? "Generate & manage employee payslips"
                : "View your monthly payslips"}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowGenerate(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-blue-600 hover:bg-blue-700 transition shadow-sm"
            >
              ⚡ Generate Payroll
            </button>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess("")}>✕</button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Total Payslips",
              value: total,
              bg: "from-blue-50 to-indigo-50",
              border: "border-blue-100",
              text: "text-blue-700",
            },
            {
              label: "Paid",
              value: paid,
              bg: "from-emerald-50 to-teal-50",
              border: "border-emerald-100",
              text: "text-emerald-700",
            },
            {
              label: "Pending",
              value: pending,
              bg: "from-amber-50 to-orange-50",
              border: "border-amber-100",
              text: "text-amber-700",
            },
            {
              label: isAdmin ? "Total Net Pay" : "Total Earned",
              value: fmtCurrency(totalNetPay),
              bg: "from-purple-50 to-fuchsia-50",
              border: "border-purple-100",
              text: "text-purple-700",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-xl px-4 py-5`}
            >
              <p className="text-xs font-medium text-gray-500 mb-1">
                {s.label}
              </p>
              <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Admin Filters */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Years</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Paid">Paid</option>
            </select>
            <button
              onClick={fetchPayrolls}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Employee Filters */}
        {!isAdmin && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-500">Filter by:</span>
            <select
              value={empFilterMonth}
              onChange={(e) => setEmpFilterMonth(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={empFilterYear}
              onChange={(e) => setEmpFilterYear(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Years</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {(empFilterMonth || empFilterYear) && (
              <button
                onClick={() => { setEmpFilterMonth(""); setEmpFilterYear(""); }}
                className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                ✕ Clear
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">
              {displayPayrolls.length} payslip{displayPayrolls.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton skeleton-row" />
              ))}
            </div>
          ) : displayPayrolls.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm">No payslips found.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="block lg:hidden p-4 flex flex-col gap-4">
                {displayPayrolls.map((p) => (
                  <div
                    key={p._id}
                    className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        {isAdmin && (
                          <p className="font-semibold text-gray-800 text-sm">
                            {p.employeeId?.firstName
                              ? `${p.employeeId.firstName} ${p.employeeId.lastName || ""}`
                              : p.employeeId?.name || "Employee"}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          {MONTHS[(p.month || 1) - 1]} {p.year}
                        </p>
                        {p.isProRated && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 mt-1 inline-block">
                            ⚡ Pro-Rated
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(p.paymentStatus)}`}
                      >
                        {p.paymentStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-xs text-gray-400">Gross Pay</p>
                        <p className="font-medium text-gray-700">
                          {fmtCurrency(p.grossPay)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Net Pay</p>
                        <p className="font-semibold text-green-700">
                          {fmtCurrency(p.netPay)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Present Days</p>
                        <p className="font-medium">
                          {p.presentDays}/{p.workingDays}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">LOP</p>
                        <p className="font-medium text-red-600">
                          {fmtCurrency(p.lopDeduction)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewPayslip(p)}
                        className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                      >
                        View
                      </button>
                      {isAdmin && p.paymentStatus !== "Paid" && (
                        <button
                          onClick={() => {
                            setMarkPaidTarget(p);
                            setMarkForm({
                              paymentDate: new Date()
                                .toISOString()
                                .slice(0, 10),
                              paymentMode: "Bank Transfer",
                              transactionRef: "",
                            });
                          }}
                          className="flex-1 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white text-left">
                      {isAdmin && (
                        <th className="px-5 py-3 font-medium">Employee</th>
                      )}
                      <th className="px-5 py-3 font-medium">Month / Year</th>
                      <th className="px-5 py-3 font-medium">Present Days</th>
                      <th className="px-5 py-3 font-medium">Gross Pay</th>
                      <th className="px-5 py-3 font-medium">Deductions</th>
                      <th className="px-5 py-3 font-medium">LOP</th>
                      <th className="px-5 py-3 font-medium">Net Pay</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPayrolls.map((p) => (
                      <tr
                        key={p._id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition"
                      >
                        {isAdmin && (
                          <td className="px-5 py-3 text-gray-800 font-medium">
                            {p.employeeId?.firstName
                              ? `${p.employeeId.firstName} ${p.employeeId.lastName || ""}`
                              : p.employeeId?.name || "—"}
                          </td>
                        )}
                        <td className="px-5 py-3 text-gray-700">
                          <div>{MONTHS[(p.month || 1) - 1]} {p.year}</div>
                          {p.isProRated && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 mt-0.5 inline-block">
                              ⚡ Pro-Rated
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {p.presentDays}/{p.workingDays}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          {fmtCurrency(p.grossPay)}
                        </td>
                        <td className="px-5 py-3 text-red-600">
                          {fmtCurrency(p.totalDeductions)}
                        </td>
                        <td className="px-5 py-3 text-orange-600">
                          {fmtCurrency(p.lopDeduction)}
                        </td>
                        <td className="px-5 py-3 font-bold text-green-700">
                          {fmtCurrency(p.netPay)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(p.paymentStatus)}`}
                          >
                            {p.paymentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right space-x-3">
                          <button
                            onClick={() => setViewPayslip(p)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                          {isAdmin && p.paymentStatus !== "Paid" && (
                            <button
                              onClick={() => {
                                setMarkPaidTarget(p);
                                setMarkForm({
                                  paymentDate: new Date()
                                    .toISOString()
                                    .slice(0, 10),
                                  paymentMode: "Bank Transfer",
                                  transactionRef: "",
                                });
                              }}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Mark Paid
                            </button>
                          )}
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

      {/* Generate Payroll Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 modal-content">
            <div className="flex items-center justify-between mb-5 bg-blue-50 p-5 -mx-6 -mt-6 rounded-t-2xl border-b border-blue-100">
              <h3 className="text-lg font-bold text-blue-800">
                Generate Payroll
              </h3>
              <button
                onClick={() => setShowGenerate(false)}
                className="text-blue-400 hover:text-blue-600 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGenerate} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Month *
                </label>
                <select
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Year *
                </label>
                <select
                  value={genYear}
                  onChange={(e) => setGenYear(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                ⚠️ This will generate payslips for{" "}
                <strong>all active employees</strong> who have a salary
                structure and haven't been processed for this month.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGenerate(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {markPaidTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 modal-content">
            <div className="flex items-center justify-between mb-5 bg-green-50 p-5 -mx-6 -mt-6 rounded-t-2xl border-b border-green-100">
              <h3 className="text-lg font-bold text-green-800">Mark As Paid</h3>
              <button
                onClick={() => setMarkPaidTarget(null)}
                className="text-green-400 hover:text-green-600 text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Marking payslip for{" "}
              <strong>
                {markPaidTarget.employeeId?.firstName
                  ? `${markPaidTarget.employeeId.firstName} ${markPaidTarget.employeeId.lastName || ""}`
                  : markPaidTarget.employeeId?.name || "Employee"}
              </strong>{" "}
              — {MONTHS[(markPaidTarget.month || 1) - 1]} {markPaidTarget.year}{" "}
              as paid.
            </p>
            <form onSubmit={handleMarkPaid} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={markForm.paymentDate}
                  onChange={(e) =>
                    setMarkForm((f) => ({ ...f, paymentDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Payment Mode
                </label>
                <select
                  value={markForm.paymentMode}
                  onChange={(e) =>
                    setMarkForm((f) => ({ ...f, paymentMode: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Transaction Ref
                </label>
                <input
                  type="text"
                  value={markForm.transactionRef}
                  onChange={(e) =>
                    setMarkForm((f) => ({
                      ...f,
                      transactionRef: e.target.value,
                    }))
                  }
                  placeholder="Optional reference number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMarkPaidTarget(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={markingSaving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                >
                  {markingSaving ? "Saving..." : "Confirm Paid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Payslip Detail Modal */}
      {viewPayslip && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto modal-content">
            <div className="flex items-center justify-between mb-5 bg-blue-50 p-5 -mx-6 -mt-6 rounded-t-2xl border-b border-blue-100">
              <div>
                <h3 className="text-lg font-bold text-blue-800">
                  Payslip Details
                </h3>
                <p className="text-xs text-blue-500">
                  {MONTHS[(viewPayslip.month || 1) - 1]} {viewPayslip.year}
                </p>
              </div>
              <button
                onClick={() => setViewPayslip(null)}
                className="text-blue-400 hover:text-blue-600 text-xl"
              >
                ✕
              </button>
            </div>
            {/* Pro-Rated Notice Banner */}
            {viewPayslip.isProRated && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">Pro-Rated / Partial Month Salary</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This salary is calculated from joining date{" "}
                    <strong>
                      {viewPayslip.joiningDateInMonth
                        ? new Date(viewPayslip.joiningDateInMonth).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "--"}
                    </strong>{" "}
                    to month-end ({viewPayslip.paidDays} days out of {viewPayslip.workingDays} total days).
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Formula: (Monthly Salary ÷ {viewPayslip.workingDays} days) × {viewPayslip.paidDays} days
                  </p>
                </div>
              </div>
            )}

            {isAdmin && viewPayslip.employeeId && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-800">
                  {viewPayslip.employeeId?.firstName
                    ? `${viewPayslip.employeeId.firstName} ${viewPayslip.employeeId.lastName || ""}`
                    : viewPayslip.employeeId?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {viewPayslip.employeeId?.email}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {[
                {
                  label: "Total Days in Month",
                  value: viewPayslip.workingDays,
                },
                {
                  label: viewPayslip.isProRated ? "Paid Days (Joining→Month End)" : "Working Days",
                  value: viewPayslip.paidDays ?? viewPayslip.workingDays,
                  highlight: viewPayslip.isProRated,
                },
                { label: "Present Days", value: viewPayslip.presentDays },
                { label: "Paid Leave Days", value: viewPayslip.paidLeaveDays },
                { label: "Unpaid Leave Days", value: viewPayslip.unpaidLeaveDays },
              ].map((r) => (
                <div
                  key={r.label}
                  className={`flex justify-between py-2 border-b border-gray-50 text-sm ${r.highlight ? "bg-amber-50 px-2 rounded" : ""}`}
                >
                  <span className={r.highlight ? "text-amber-700 font-medium" : "text-gray-500"}>{r.label}</span>
                  <span className={`font-medium ${r.highlight ? "text-amber-800" : "text-gray-800"}`}>{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-500">Gross Pay</span>
                <span className="font-semibold text-gray-800">
                  {fmtCurrency(viewPayslip.grossPay)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-500">Total Deductions</span>
                <span className="font-semibold text-red-600">
                  {fmtCurrency(viewPayslip.totalDeductions)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-500">LOP Deduction</span>
                <span className="font-semibold text-orange-600">
                  {fmtCurrency(viewPayslip.lopDeduction)}
                </span>
              </div>
              <div className="flex justify-between py-3 bg-green-50 px-3 rounded-xl text-sm">
                <span className="font-bold text-green-800">Net Pay</span>
                <span className="font-bold text-green-700 text-base">
                  {fmtCurrency(viewPayslip.netPay)}
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-500">Payment Status</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(viewPayslip.paymentStatus)}`}
                >
                  {viewPayslip.paymentStatus}
                </span>
              </div>
              {viewPayslip.paymentDate && (
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">Payment Date</span>
                  <span className="text-gray-700">
                    {fmtDate(viewPayslip.paymentDate)}
                  </span>
                </div>
              )}
              {viewPayslip.paymentMode && (
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">Payment Mode</span>
                  <span className="text-gray-700">
                    {viewPayslip.paymentMode}
                  </span>
                </div>
              )}
              {viewPayslip.transactionRef && (
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">Transaction Ref</span>
                  <span className="text-gray-700">
                    {viewPayslip.transactionRef}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setViewPayslip(null)}
              className="w-full mt-5 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

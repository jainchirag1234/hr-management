/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  getAllUsers,
  getSalaryStructure,
  createSalaryStructure,
  updateSalaryStructure,
  getSalaryRevisions,
  getAllSalaryStructures,
  updateBankDetailsApi,
  getUserById,
} from "../services/auth.service";


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

const REVISION_COLORS = {
  increment: "bg-green-50 text-green-700",
  promotion: "bg-blue-50 text-blue-700",
  correction: "bg-amber-50 text-amber-700",
  demotion: "bg-red-50 text-red-700",
};

const emptyForm = {
  basic: "",
  hra: "",
  bonus: "",
  allowances: { transport: "", medical: "", special: "" },
  deductions: { pf: "", esi: "", tax: "" },
  bankDetails: { bankName: "", accountNo: "", ifsc: "" },
  effectiveFrom: new Date().toISOString().slice(0, 10),
  revisionType: "correction",
  remarks: "",
};

export default function Salary() {
  const { user } = useContext(AuthContext);
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const [currentPage, setCurrentPage] = useState(1);
  const EMPLOYEES_PER_PAGE = 6;

  const [employees, setEmployees] = useState([]);
  const [allStructures, setAllStructures] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(
    isAdmin ? "" : user?._id || user?.id || "",
  );
  const [structure, setStructure] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountNo: "",
    ifsc: "",
  });
  const [bankDetails, setBankDetails] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("structure");
  const [form, setForm] = useState(emptyForm);

  // Load employees list for admin
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([getAllUsers(), getAllSalaryStructures()])
      .then(([usersRes, structsRes]) => {
        const list = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data?.data || usersRes.data?.users || [];
        setEmployees(list);
        const structs = structsRes.data?.data || [];
        setAllStructures(structs);
      })
      .catch(() => {});
  }, [isAdmin]);

  // Auto-load for employee
  useEffect(() => {
    if (!isAdmin && selectedEmpId) fetchStructure(selectedEmpId);
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [employees.length]);
  const fetchStructure = async (empId) => {
    if (!empId) return;
    setLoading(true);
    setError("");
    setStructure(null);
    setBankDetails(null);
    setRevisions([]);
    try {
      const [resStruct, resUser] = await Promise.allSettled([
        getSalaryStructure(empId),
        getUserById(empId),
      ]);

      if (resStruct.status === "fulfilled") {
        setStructure(resStruct.value.data?.data || null);
      } else if (resStruct.reason?.response?.status !== 404) {
        setError(
          resStruct.reason?.response?.data?.message ||
            "Failed to load structure",
        );
      }

      if (resUser.status === "fulfilled") {
        setBankDetails(resUser.value.data?.data?.bankDetails || null);
      }
    } catch (err) {
      console.log(err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async (empId) => {
    if (!empId) return;
    try {
      const res = await getSalaryRevisions(empId);
      setRevisions(res.data?.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const handleEmpSelect = (empId) => {
    setSelectedEmpId(empId);
    setStructure(null);
    setBankDetails(null);
    setRevisions([]);
    setShowForm(false);
    setShowBankForm(false);
    if (empId) fetchStructure(empId);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "revisions" && selectedEmpId && revisions.length === 0)
      fetchRevisions(selectedEmpId);
  };

  const openForm = () => {
    if (structure) {
      setForm({
        basic: structure.basic || "",
        hra: structure.hra || "",
        bonus: structure.bonus || "",
        allowances: {
          transport: structure.allowances?.transport || "",
          medical: structure.allowances?.medical || "",
          special: structure.allowances?.special || "",
        },
        deductions: {
          pf: structure.deductions?.pf || "",
          esi: structure.deductions?.esi || "",
          tax: structure.deductions?.tax || "",
        },
        bankDetails: {
          bankName: structure.bankDetails?.bankName || "",
          accountNo: structure.bankDetails?.accountNo || "",
          ifsc: structure.bankDetails?.ifsc || "",
        },
        effectiveFrom: new Date().toISOString().slice(0, 10),
        revisionType: "correction",
        remarks: "",
      });
    } else {
      setForm(emptyForm);
    }
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setForm((f) => ({ ...f, [parent]: { ...f[parent], [child]: value } }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const openBankForm = () => {
    setBankForm({
      bankName: bankDetails?.bankName || "",
      accountNo: bankDetails?.accountNo || "",
      ifsc: bankDetails?.ifsc || "",
    });
    setShowBankForm(true);
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await updateBankDetailsApi(selectedEmpId, {
        bankDetails: bankForm,
      });
      setBankDetails(res.data?.data || bankForm);
      setSuccess("Bank details updated successfully!");
      setShowBankForm(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update bank details");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = {
      employeeId: selectedEmpId,
      basic: Number(form.basic),
      hra: Number(form.hra),
      bonus: Number(form.bonus) || 0,
      allowances: {
        transport: Number(form.allowances.transport) || 0,
        medical: Number(form.allowances.medical) || 0,
        special: Number(form.allowances.special) || 0,
      },
      deductions: {
        pf: Number(form.deductions.pf) || 0,
        esi: Number(form.deductions.esi) || 0,
        tax: Number(form.deductions.tax) || 0,
      },
      bankDetails: form.bankDetails,
      effectiveFrom: form.effectiveFrom,
      ...(structure
        ? { revisionType: form.revisionType, remarks: form.remarks }
        : {}),
    };
    try {
      if (structure) {
        const res = await updateSalaryStructure(selectedEmpId, payload);
        setStructure(res.data?.data || structure);
        setSuccess("Salary structure updated successfully!");
      } else {
        const res = await createSalaryStructure(payload);
        setStructure(res.data?.data || null);
        setSuccess("Salary structure created successfully!");
      }
      setShowForm(false);
      setRevisions([]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const SelectedEmployee = employees.find(
    (e) => (e._id || e.id) === selectedEmpId,
  );

  const startIndex = (currentPage - 1) * EMPLOYEES_PER_PAGE;
  const currentEmployees = employees.slice(
    startIndex,
    startIndex + EMPLOYEES_PER_PAGE,
  );
  const totalPages = Math.ceil(employees.length / EMPLOYEES_PER_PAGE);

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto w-full page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Salary Structure
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage employee salary components & revisions
            </p>
          </div>
          {isAdmin && selectedEmpId && (
            <button
              onClick={openForm}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-blue-600 hover:bg-blue-700 transition shadow-sm"
            >
              {structure ? "✏ Revise Salary" : "+ Create Structure"}
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

        {/* Admin: Employee Cards View */}
        {isAdmin && !selectedEmpId && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                Employee Salaries
              </h2>
              <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                {employees.length} Employees
              </span>
            </div>
            {employees.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center">
                <p className="text-gray-500 text-sm">No employees found.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {currentEmployees.map((emp) => {
                    const empId = emp._id || emp.id;
                    const empStruct = allStructures.find(
                      (s) => (s.employeeId?._id || s.employeeId) === empId,
                    );
                    return (
                      <button
                        key={empId}
                        onClick={() => handleEmpSelect(empId)}
                        className="text-left bg-white border border-gray-100 hover:border-blue-300 hover:shadow-md rounded-2xl p-5 transition-all flex flex-col gap-4 group relative overflow-hidden"
                      >
                        <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-200"></span>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                            {emp.profileImage ? (
                              <img
                                src={emp.profileImage}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : emp.firstName ? (
                              emp.firstName.charAt(0).toUpperCase()
                            ) : (
                              emp.name?.charAt(0).toUpperCase() || "E"
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                              {emp.firstName
                                ? `${emp.firstName} ${emp.lastName || ""}`
                                : emp.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {emp.email}
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 flex justify-between items-center w-full">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                              Gross Salary
                            </p>
                            <p
                              className={`text-sm font-bold ${empStruct ? "text-gray-800" : "text-gray-400"}`}
                            >
                              {empStruct
                                ? fmtCurrency(empStruct.grossSalary)
                                : "Not Configured"}
                            </p>
                          </div>
                          {empStruct && (
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                                Net Pay (Est)
                              </p>
                              <p className="text-sm font-bold text-emerald-600">
                                {fmtCurrency(
                                  empStruct.grossSalary -
                                    (empStruct.totalDeductions || 0),
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-500">
                      Showing{" "}
                      <span className="font-medium">{startIndex + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(
                          startIndex + EMPLOYEES_PER_PAGE,
                          employees.length,
                        )}
                      </span>{" "}
                      of <span className="font-medium">{employees.length}</span>{" "}
                      employees
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Content Area */}
        {selectedEmpId && (
          <>
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedEmpId("");
                  setStructure(null);
                  setRevisions([]);
                }}
                className="mb-5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5 w-fit"
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
                    d="M10 19l-7-7m0 0l7-7m-7-7h18"
                  ></path>
                </svg>
                Back to Employees
              </button>
            )}
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
              {["structure", "revisions"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {tab === "structure"
                    ? "Salary Structure"
                    : "Revision History"}
                </button>
              ))}
            </div>

            {/* Structure Tab */}
            {activeTab === "structure" && (
              <>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6 shadow-sm">
                  <div className="px-5 py-4 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                    <h3 className="font-semibold text-blue-800 text-sm">
                      Bank Details
                    </h3>
                    {!isAdmin && (
                      <button
                        onClick={openBankForm}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                      >
                        {bankDetails ? "Edit Details" : "Add Bank Details"}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-6 px-5 py-4">
                    {bankDetails ? (
                      Object.entries(bankDetails).map(([k, v]) => (
                        <div key={k}>
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5 capitalize">
                            {k.replace(/([A-Z])/g, " $1")}
                          </p>
                          <p className="text-sm font-semibold text-gray-700">
                            {v || "--"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="w-full py-4 text-center">
                        <div className="text-4xl mb-3">🏦</div>
                        <p className="text-sm text-gray-500 mb-4">
                          No bank details added yet.
                        </p>
                        {!isAdmin && (
                          <button
                            onClick={openBankForm}
                            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
                          >
                            + Add Bank Details Now
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="skeleton"
                        style={{ height: 100 }}
                      />
                    ))}
                  </div>
                ) : !structure ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center">
                    <div className="text-4xl mb-3">💰</div>
                    <p className="text-gray-500 text-sm">
                      No active salary structure found.
                    </p>
                    {isAdmin && (
                      <button
                        onClick={openForm}
                        className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
                      >
                        + Create Structure
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      {[
                        {
                          label: "Basic",
                          value: fmtCurrency(structure.basic),
                          color: "from-blue-50 to-indigo-50",
                          text: "text-blue-700",
                          border: "border-blue-100",
                        },
                        {
                          label: "Gross Salary",
                          value: fmtCurrency(structure.grossSalary),
                          color: "from-emerald-50 to-teal-50",
                          text: "text-emerald-700",
                          border: "border-emerald-100",
                        },
                        {
                          label: "Total Deductions",
                          value: fmtCurrency(structure.totalDeductions),
                          color: "from-red-50 to-orange-50",
                          text: "text-red-700",
                          border: "border-red-100",
                        },
                        {
                          label: "Annual CTC",
                          value: fmtCurrency(structure.ctc),
                          color: "from-purple-50 to-fuchsia-50",
                          text: "text-purple-700",
                          border: "border-purple-100",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-xl px-4 py-5`}
                        >
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            {s.label}
                          </p>
                          <p className={`text-xl font-bold ${s.text}`}>
                            {s.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Detail Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Earnings */}
                      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-green-50">
                          <h3 className="font-semibold text-green-800 text-sm">
                            Earnings
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {[
                            { label: "Basic", value: structure.basic },
                            { label: "HRA", value: structure.hra },
                            { label: "Bonus", value: structure.bonus },
                            ...Object.entries(structure.allowances || {}).map(
                              ([k, v]) => ({
                                label: `Allowance – ${k}`,
                                value: v,
                              }),
                            ),
                          ].map((r) => (
                            <div
                              key={r.label}
                              className="flex justify-between px-5 py-3 text-sm"
                            >
                              <span className="text-gray-600">{r.label}</span>
                              <span className="font-semibold text-gray-800">
                                {fmtCurrency(r.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Deductions */}
                      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-red-50">
                          <h3 className="font-semibold text-red-800 text-sm">
                            Deductions
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {Object.entries(structure.deductions || {}).length ===
                          0 ? (
                            <p className="px-5 py-4 text-sm text-gray-400">
                              No deductions
                            </p>
                          ) : (
                            Object.entries(structure.deductions || {}).map(
                              ([k, v]) => (
                                <div
                                  key={k}
                                  className="flex justify-between px-5 py-3 text-sm"
                                >
                                  <span className="text-gray-600 capitalize">
                                    {k}
                                  </span>
                                  <span className="font-semibold text-red-700">
                                    {fmtCurrency(v)}
                                  </span>
                                </div>
                              ),
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-4">
                      Effective from: {fmtDate(structure.effectiveFrom)}
                    </p>
                  </>
                )}
              </>
            )}

            {/* Revisions Tab */}
            {activeTab === "revisions" && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">
                    Revision History
                  </h3>
                </div>
                {revisions.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No revisions found.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {revisions.map((rev) => (
                      <div
                        key={rev._id}
                        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <span
                            className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${REVISION_COLORS[rev.revisionType] || "bg-gray-100 text-gray-600"}`}
                          >
                            {rev.revisionType}
                          </span>
                          <p className="text-sm text-gray-700 mt-1">
                            {rev.remarks || "No remarks"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Effective: {fmtDate(rev.effectiveFrom)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${rev.percentageChange > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {rev.percentageChange > 0 ? "+" : ""}
                            {rev.percentageChange}%
                          </p>
                          <p className="text-xs text-gray-400">Change</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create / Revise Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto modal-content">
            <div className="flex items-center justify-between mb-5 bg-blue-50 p-5 -mx-6 -mt-6 rounded-t-2xl border-b border-blue-100">
              <h3 className="text-lg font-bold text-blue-800">
                {structure
                  ? `Revise Salary — ${SelectedEmployee?.name || "Employee"}`
                  : `Create Salary Structure — ${SelectedEmployee?.name || "Employee"}`}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-blue-400 hover:text-blue-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Basic *", name: "basic", required: true },
                  { label: "HRA *", name: "hra", required: true },
                  { label: "Bonus", name: "bonus" },
                ].map(({ label, name, required }) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      required={required}
                      min="0"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Allowances
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {["transport", "medical", "special"].map((k) => (
                    <div key={k}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">
                        {k}
                      </label>
                      <input
                        type="number"
                        name={`allowances.${k}`}
                        value={form.allowances[k]}
                        onChange={handleChange}
                        min="0"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Deductions
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {["pf", "esi", "tax"].map((k) => (
                    <div key={k}>
                      <label className="block text-xs text-gray-500 mb-1 uppercase">
                        {k}
                      </label>
                      <input
                        type="number"
                        name={`deductions.${k}`}
                        value={form.deductions[k]}
                        onChange={handleChange}
                        min="0"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Bank Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    ["bankName", "Bank Name"],
                    ["accountNo", "Account No"],
                    ["ifsc", "IFSC Code"],
                  ].map(([k, lbl]) => (
                    <div key={k}>
                      <label className="block text-xs text-gray-500 mb-1">
                        {lbl}
                      </label>
                      <input
                        type="text"
                        name={`bankDetails.${k}`}
                        value={form.bankDetails[k]}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    name="effectiveFrom"
                    value={form.effectiveFrom}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {structure && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Revision Type
                    </label>
                    <select
                      name="revisionType"
                      value={form.revisionType}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {["increment", "promotion", "correction", "demotion"].map(
                        (t) => (
                          <option key={t} value={t} className="capitalize">
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}
              </div>

              {structure && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={form.remarks}
                    onChange={handleChange}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : structure
                      ? "Update Structure"
                      : "Create Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Details Modal */}
      {showBankForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 modal-content">
            <div className="flex items-center justify-between mb-5 bg-blue-50 p-5 -mx-6 -mt-6 rounded-t-2xl border-b border-blue-100">
              <h3 className="text-lg font-bold text-blue-800">
                {bankDetails ? "Edit Bank Details" : "Add Bank Details"}
              </h3>
              <button
                onClick={() => setShowBankForm(false)}
                className="text-blue-400 hover:text-blue-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBankSubmit} className="flex flex-col gap-4">
              {[
                ["bankName", "Bank Name"],
                ["accountNo", "Account No"],
                ["ifsc", "IFSC Code"],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {lbl}
                  </label>
                  <input
                    type="text"
                    name={k}
                    value={bankForm[k]}
                    onChange={handleBankChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBankForm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

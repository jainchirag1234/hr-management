/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { getDepartments, getDesignations } from "../services/auth.service";

const GENDERS = ["Male", "Female", "Other"];

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Intern"];

const ROLES = ["Admin", "Employee"];

const STATUSES = ["Active", "Inactive", "Resigned", "Terminated"];

// Matches the backend UserSchema field-for-field
const emptyEmployee = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phoneNumber: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  joiningDate: "",
  department: "",
  designation: "",
  salary: "",
  employmentType: "",
  role: "Employee",
  status: "Active",
  emergencyContactName: "",
  emergencyContactNumber: "",
  profileImage: "",
};

// ISO / datetime string ko "YYYY-MM-DD" me convert karta hai
// taaki <input type="date" /> me value sahi se dikhe
const toDateInputValue = (value) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

// Backend se data alag-alag naming/shape me aa sakta hai
// Ye function un sab variations ko normalize karke flat form-state banata hai
const normalizeIncomingEmployee = (data) => {
  if (!data) return { ...emptyEmployee };

  const emergencyContact = data.emergencyContact || {};

  return {
    ...emptyEmployee,
    ...data,
    dateOfBirth: toDateInputValue(data.dateOfBirth ?? data.dob),
    gender: data.gender ?? data.sex ?? "",
    address:
      typeof data.address === "string"
        ? data.address
        : (data.address?.line ?? data.address?.fullAddress ?? ""),
    joiningDate: toDateInputValue(data.joiningDate ?? data.dateOfJoining),
    emergencyContactName:
      data.emergencyContactName ?? emergencyContact.name ?? "",
    emergencyContactNumber:
      data.emergencyContactNumber ??
      emergencyContact.number ??
      emergencyContact.phone ??
      "",
    password: "", // never prefill password
    salary:
      data.salary === null || data.salary === undefined ? "" : data.salary,
    profileImage: data.profileImage ?? "",
  };
};

// Image file ko Base64 string me convert karne ke liye helper
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function EmployeeForm({
  initialData = null,
  onSubmit,
  onCancel,
  mode = "admin",
  saving = false,
}) {
  const [form, setForm] = useState({ ...emptyEmployee });
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const isEdit = Boolean(initialData?._id || initialData?.id);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, desigRes] = await Promise.all([
          getDepartments(),
          getDesignations(),
        ]);
        setDepartments(
          deptRes.data?.data || deptRes.data?.departments || deptRes.data || [],
        );
        setDesignations(
          desigRes.data?.data ||
            desigRes.data?.designations ||
            desigRes.data ||
            [],
        );
      } catch (error) {
        console.error("Failed to fetch departments/designations", error);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const normalized = normalizeIncomingEmployee(initialData);
    setForm(normalized);
    setErrors({});
    // Agar existing employee ki photo hai toh preview set karo
    setImagePreview(normalized.profileImage || null);
    setImageError("");
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const newForm = { ...prev, [name]: value };
      if (name === "department") {
        newForm.designation = "";
      }
      return newForm;
    });

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  // Profile image select handler
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size check: max 5MB
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image size 5MB se zyada nahi honi chahiye.");
      return;
    }

    // Type check
    if (!file.type.startsWith("image/")) {
      setImageError("Sirf image file select karein (JPG, PNG, WEBP).");
      return;
    }

    setImageError("");

    try {
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
      setForm((prev) => ({ ...prev, profileImage: base64 }));
    } catch {
      setImageError("Image process nahi ho saki. Dobara try karein.");
    }
  };

  // Image hata do
  const handleRemoveImage = () => {
    setImagePreview(null);
    setForm((prev) => ({ ...prev, profileImage: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Backend ke required fields validate karo (user.controller.js ke hisaab se)
  const validate = () => {
    const next = {};

    // ---- Required fields (backend model ke hisaab se) ----
    if (!form.firstName?.trim()) next.firstName = "First Name required hai";
    if (!form.lastName?.trim()) next.lastName = "Last Name required hai";

    if (!form.email?.trim()) {
      next.email = "Email required hai";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      next.email = "Valid email address";
    }

    if (!form.phoneNumber?.trim()) {
      next.phoneNumber = "Phone Number required hai";
    } else if (!/^[0-9+\-\s]{7,15}$/.test(form.phoneNumber)) {
      next.phoneNumber = "Valid phone number ";
    }

    // Password sirf new employee create karte waqt required hai
    if (mode === "admin" && !isEdit && !form.password?.trim()) {
      next.password = "Password required hai";
    }

    if (!form.joiningDate) next.joiningDate = "Joining Date required hai";

    // ---- Format checks for optional fields ----
    if (
      form.emergencyContactNumber &&
      !/^[0-9+\-\s]{7,15}$/.test(form.emergencyContactNumber)
    ) {
      next.emergencyContactNumber = "Valid phone number ";
    }

    if (form.salary && isNaN(Number(form.salary))) {
      next.salary = "Valid number ";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender,
      address: form.address,
      joiningDate: form.joiningDate || null,
      department: form.department,
      designation: form.designation,
      employmentType: form.employmentType,
      emergencyContactName: form.emergencyContactName,
      emergencyContactNumber: form.emergencyContactNumber,
      salary: form.salary === "" ? undefined : Number(form.salary),
      profileImage: form.profileImage || undefined,
      ...(mode === "admin" ? { role: form.role, status: form.status } : {}),
      ...(form.password ? { password: form.password } : {}),
    };

    onSubmit?.({
      ...payload,
      id: initialData?._id || initialData?.id,
      _id: initialData?._id || initialData?.id,
    });
  };

  const fieldClass = (name) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition
     focus:ring-2 focus:ring-indigo-400
     disabled:opacity-60 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200 disabled:cursor-not-allowed
     ${errors[name] ? "border-red-500" : "border-gray-300"}`;

  // Avatar initials fallback
  const initials =
    `${form.firstName?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";

  // Selected department ke hisaab se filtered designations
  // (disabled logic aur options list dono ke liye use hoga)
  const filteredDesignations = designations.filter(
    (d) => d.department?.name === form.department,
  );
  const noDesignationsAvailable =
    !form.department || filteredDesignations.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="bg-white rounded-xl shadow-md border p-4 sm:p-6 w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold">
          {isEdit ? "Edit Employee" : "Add Employee"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <p className="text-gray-500 mb-5">
        {isEdit ? "Update employee details." : "Fill employee information."}
      </p>

      {/*
        Chrome/Edge autofill ko poori tarah block karne ke liye ek "decoy" trick:
        ye hidden fake fields real password/email fields se pehle rakh do,
        browser inhe target karta hai autofill ke liye, real fields ko chhod deta hai.
        Agar tumhe ye behavior chahiye toh niche wale 2 input uncomment kar dena
        aur real fields ke names alag rakhna (jaise "uname"/"pwd" ki jagah kuch aur).
      */}
      {/* <input type="text" name="fakeusernameremembered" style={{ display: "none" }} />
      <input type="password" name="fakepasswordremembered" style={{ display: "none" }} /> */}

      {/* ===== PROFILE PICTURE SECTION (top, left-aligned) ===== */}
      <div className="mb-5">
        <label className="block mb-1 font-medium">Profile Photo</label>
        <div className="flex flex-row items-center gap-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          {/* Avatar / Preview */}
          <div className="relative group flex-shrink-0">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Profile Preview"
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white text-sm font-bold select-none">
                {initials}
              </div>
            )}

            {/* Overlay camera icon on hover */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              title="Change photo"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          {/* Buttons + hint, left aligned next to avatar */}
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                {imagePreview ? "Change Photo" : "Upload Photo"}
              </button>

              {imagePreview && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center gap-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove
                </button>
              )}
            </div>

            <p className="text-[11px] text-gray-400 text-left">
              JPG, PNG or WEBP • Max 10MB
            </p>

            {imageError && (
              <p className="text-[11px] text-red-500 font-medium text-left">
                {imageError}
              </p>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <label className="block mb-1 font-medium">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="First Name"
            autoComplete="off"
            className={fieldClass("firstName")}
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block mb-1 font-medium">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            autoComplete="off"
            className={fieldClass("lastName")}
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1 font-medium">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="employee@gmail.com"
            autoComplete="off"
            className={fieldClass("email")}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Password - only when admin is creating a new employee */}
        {mode === "admin" && !isEdit && (
          <div>
            <label className="block mb-1 font-medium">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Set a password"
              // "off" ko Chrome jaise browsers largely ignore karte hain
              // password fields ke liye. "new-password" zyada reliably
              // browser ko autofill/suggest se rokta hai.
              autoComplete="new-password"
              className={fieldClass("password")}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>
        )}

        {/* Phone */}
        <div>
          <label className="block mb-1 font-medium">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder="+91 9876543210"
            autoComplete="off"
            className={fieldClass("phoneNumber")}
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block mb-1 font-medium">Date of Birth</label>
          <input
            type="date"
            name="dateOfBirth"
            value={form.dateOfBirth}
            onChange={handleChange}
            autoComplete="off"
            max={new Date().toISOString().split("T")[0]}
            className={fieldClass("dateOfBirth")}
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block mb-1 font-medium ">Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className={fieldClass("gender")}
          >
            <option value="">Select Gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Joining Date */}
        <div>
          <label className="block mb-1 font-medium">
            Joining Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="joiningDate"
            value={form.joiningDate}
            onChange={handleChange}
            autoComplete="off"
            max={new Date().toISOString().split("T")[0]}
            className={fieldClass("joiningDate")}
          />
          {errors.joiningDate && (
            <p className="text-red-500 text-sm mt-1">{errors.joiningDate}</p>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Address</label>
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Address"
            rows={2}
            autoComplete="off"
            className={fieldClass("address")}
          />
        </div>

        {/* Department */}
        <div>
          <label className="block mb-1 font-medium">Department</label>
          <select
            name="department"
            value={form.department}
            onChange={handleChange}
            className={fieldClass("department")}
            disabled={mode === "self"}
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Designation */}
        <div>
          <label className="block mb-1 font-medium">Designation</label>
          <select
            name="designation"
            value={form.designation}
            onChange={handleChange}
            className={fieldClass("designation")}
            disabled={mode === "self" || noDesignationsAvailable}
          >
            <option value="">Select Designation</option>
            {filteredDesignations.map((d) => (
              <option key={d._id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type */}
        <div>
          <label className="block mb-1 font-medium">Employment Type</label>
          <select
            name="employmentType"
            value={form.employmentType}
            onChange={handleChange}
            className={fieldClass("employmentType")}
            disabled={mode === "self"}
          >
            <option value="">Select Type</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Salary - admin only */}
        {mode === "admin" && (
          <div>
            <label className="block mb-1 font-medium">Salary</label>
            <input
              type="number"
              name="salary"
              value={form.salary}
              onChange={handleChange}
              placeholder="e.g. 50000"
              autoComplete="off"
              className={fieldClass("salary")}
            />
            {errors.salary && (
              <p className="text-red-500 text-sm mt-1">{errors.salary}</p>
            )}
          </div>
        )}

        {/* Role - admin only */}
        {mode === "admin" && (
          <div>
            <label className="block mb-1 font-medium">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className={fieldClass("role")}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status - admin only */}
        {mode === "admin" && (
          <div>
            <label className="block mb-1 font-medium">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={fieldClass("status")}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Emergency Contact Name */}
        <div>
          <label className="block mb-1 font-medium">
            Emergency Contact Name
          </label>
          <input
            type="text"
            name="emergencyContactName"
            value={form.emergencyContactName}
            onChange={handleChange}
            placeholder="Contact Name"
            autoComplete="off"
            className={fieldClass("emergencyContactName")}
          />
        </div>

        {/* Emergency Contact Number */}
        <div>
          <label className="block mb-1 font-medium">
            Emergency Contact Number
          </label>
          <input
            type="text"
            name="emergencyContactNumber"
            value={form.emergencyContactNumber}
            onChange={handleChange}
            placeholder="+91 9876543210"
            autoComplete="off"
            className={fieldClass("emergencyContactNumber")}
          />
          {errors.emergencyContactNumber && (
            <p className="text-red-500 text-sm mt-1">
              {errors.emergencyContactNumber}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Update Changes" : "Add Employee"}
        </button>
      </div>
    </form>
  );
}

export default EmployeeForm;

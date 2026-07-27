/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { getUserById } from "../services/auth.service";

function Profile() {
  const { user } = useContext(AuthContext);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // user.id ya user._id dono check karo
    const employeeId = user?.id || user?._id;

    if (!employeeId) {
      setLoading(false);
      setError("User not logged in.");
      return;
    }

    async function fetchEmployee() {
      try {
        setLoading(true);
        const res = await getUserById(employeeId);
        // Axios response: res.data.data (backend { success, data: user })
        const data = res.data?.data || res.data;
        setEmployee(data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch profile",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchEmployee();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-indigo-500">
        <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-16 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center p-16 text-gray-500">
        No employee data found.
      </div>
    );
  }

  const fullName =
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Avatar initials fallback
  const initials = [employee.firstName?.[0], employee.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <div className="w-full h-full min-h-[calc(100vh-80px)] bg-gray-50 p-4 sm:p-6 lg:p-8 flex justify-center items-start">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 w-full max-w-7xl">
        <div className="p-8 sm:p-12 flex flex-col gap-10 sm:gap-14">
          {/* Top Row: Profile (1/3) & Personal Info (2/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
            {/* Profile Overview */}
            <div className="lg:col-span-1 flex flex-col items-center text-center bg-gray-50/50 p-8 rounded-3xl border border-gray-100">
              <div className="relative mb-6">
                {employee.profileImage ? (
                  <img
                    src={employee.profileImage}
                    alt={fullName}
                    className="w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover ring-4 ring-indigo-50 shadow-lg bg-white"
                  />
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center ring-4 ring-indigo-50 shadow-lg">
                    <span className="text-6xl font-bold text-indigo-600">
                      {initials || "?"}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
                  <span
                    className={`block w-6 h-6 rounded-full ring-4 ring-white shadow-sm ${employee.status === "Active" ? "bg-green-500" : "bg-gray-400"}`}
                  ></span>
                </div>
              </div>

              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {fullName || "-"}
              </h2>
              <p className="text-indigo-600 font-bold text-lg mt-2">
                {employee.designation || "-"}
              </p>

              <div className="flex flex-col items-center gap-3 mt-6 w-full">
                <div className="w-full bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Dept
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {employee.department || "-"}
                  </span>
                </div>
                <div className="w-full bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Status
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      employee.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {employee.status || "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="lg:col-span-2 flex flex-col h-full justify-center">
              <Section title="Personal Information" icon="user">
                <ProfileField label="Email" value={employee.email} />
                <ProfileField
                  label="Phone Number"
                  value={employee.phoneNumber}
                />
                <ProfileField
                  label="Date of Birth"
                  value={formatDate(employee.dateOfBirth)}
                />
                <ProfileField label="Gender" value={employee.gender} />
                <ProfileField label="Address" value={employee.address} span />
              </Section>
            </div>
          </div>

          <hr className="border-gray-100 border-t-2" />

          {/* Bottom Row: Employment (1/2) & Emergency (1/2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            <div className="h-full">
              <Section title="Employment Details" icon="briefcase">
                <ProfileField label="Department" value={employee.department} />
                <ProfileField
                  label="Designation"
                  value={employee.designation}
                />
                <ProfileField
                  label="Employment Type"
                  value={employee.employmentType}
                />
                <ProfileField label="Role" value={employee.role} />
                <ProfileField
                  label="Joining Date"
                  value={formatDate(employee.joiningDate)}
                />
                <ProfileField
                  label="Salary"
                  value={
                    employee.salary
                      ? `₹ ${Number(employee.salary).toLocaleString("en-IN")}`
                      : "-"
                  }
                />
              </Section>
            </div>

            <div className="h-full">
              <Section title="Emergency Contact" icon="phone">
                <ProfileField
                  label="Contact Name"
                  value={employee.emergencyContactName}
                />
                <ProfileField
                  label="Contact Number"
                  value={employee.emergencyContactNumber}
                />
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  const getIcon = () => {
    switch (icon) {
      case "user":
        return (
          <svg
            className="w-6 h-6 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
      case "briefcase":
        return (
          <svg
            className="w-6 h-6 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case "phone":
        return (
          <svg
            className="w-6 h-6 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50/70 rounded-3xl p-6 sm:p-8 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200/80">
        <div className="p-3 bg-indigo-100 rounded-xl shadow-sm">
          {getIcon()}
        </div>
        <h3 className="text-xl font-extrabold text-gray-800">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6">
        {children}
      </div>
    </div>
  );
}

function ProfileField({ label, value, span }) {
  return (
    <div className={`flex flex-col group ${span ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">
        {label}
      </span>
      <span className="text-base font-semibold text-gray-900 break-words bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm group-hover:border-indigo-300 group-hover:shadow-md transition-all">
        {value || "-"}
      </span>
    </div>
  );
}

export default Profile;

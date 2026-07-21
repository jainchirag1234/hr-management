import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const role = (user?.role ?? "").toString().trim().toLowerCase();
  const isAdmin = role === "admin";

  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    setProfileOpen(false);
    if (typeof logout === "function") {
      logout();
    }
    navigate("/login");
  };

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
    .toUpperCase()
    .trim();

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-md w-full">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 lg:pl-0 pl-10">
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">
              {isAdmin ? "Hello Admin" : `Hello ${user.firstName}`}
            </h1>
            <p className="text-indigo-100 text-xs">
              {user?.firstName
                ? `Welcome back, ${user.firstName}`
                : "Welcome back"}
            </p>
          </div>
        </div>

        {/* Right side: Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center">
              <span className="text-white font-semibold text-xs">
                {isAdmin ? "A" : initials || "U"}
              </span>
            </div>
            <span className="text-white text-sm font-medium hidden sm:block">
              {isAdmin ? "Admin" : user?.firstName || "User"}
            </span>
            <svg
              className={`w-4 h-4 text-white transition-transform ${
                profileOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {isAdmin ? "Admin" : "Employee"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

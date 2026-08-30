import { Link } from "react-router-dom";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">HR</span>
              </div>
              <span className="text-gray-800 font-bold text-xl">HR Portal</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Simplify HR management with a modern, all-in-one solution designed
              to help teams work smarter, faster, and better.
            </p>
          </div>
          {/* Links and Features Container */}
          <div className="grid grid-cols-2 gap-8 sm:col-span-2 sm:gap-10">
            {/* Quick Links */}
            <div>
              <h4 className="text-gray-700 font-semibold text-sm mb-4 uppercase tracking-widest">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li>
                  <Link
                    to="/dashboard"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/employee"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    Employees
                  </Link>
                </li>
                <li>
                  <Link
                    to="/attendance"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    Attendance
                  </Link>
                </li>
                <li>
                  <Link
                    to="/leave"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    Leave Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="/department"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    Departments
                  </Link>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-gray-700 font-semibold text-sm mb-4 uppercase tracking-widest">
                Features
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li>
                  <Link
                    to="/announcement"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    Announcements
                  </Link>
                </li>
                <li>
                  <Link
                    to="/holiday"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    Holiday
                  </Link>
                </li>
                <li>
                  <Link
                    to="/designation"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    Designations
                  </Link>
                </li>
                <li>
                  <Link
                    to="/profile"
                    className="hover:text-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    My Profile
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100 bg-gray-50 px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            &copy; {year}{" "}
            <span className="font-semibold text-blue-700">HR Portal</span>. All
            rights reserved.
          </span>
          <span className="flex items-center gap-3">
            <span>Version 1.0.0</span>
            <span className="text-gray-300">|</span>
            <span>
              Powered by{" "}
              <span className="text-gray-500 font-medium">Ora Infotech</span>
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

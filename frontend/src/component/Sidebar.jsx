import {
  LayoutDashboard,
  IdCard,
  Building2,
  Briefcase,
  CalendarOff,
  Clock,
  CircleUserRound,
  CalendarDays,
  LogOut,
  Megaphone,
} from "lucide-react";
import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const MENU_CONFIG = {
  admin: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "employee", label: "Employee", icon: IdCard },
    { key: "department", label: "Department", icon: Building2 },
    { key: "designation", label: "Designation", icon: Briefcase },
    { key: "attendance", label: "Attendance", icon: Clock },
    { key: "leave", label: "Leave", icon: CalendarOff },
    { key: "holiday", label: "Holiday", icon: CalendarDays },
    { key: "announcement", label: "Announcement", icon: Megaphone },
  ],
  employee: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "attendance", label: "Attendance", icon: Clock },
    { key: "leave", label: "Leave", icon: CalendarOff },
    { key: "profile", label: "Profile", icon: CircleUserRound },
    { key: "holiday", label: "Holiday", icon: CalendarDays },
    { key: "announcement", label: "Announcement", icon: Megaphone },
  ],
};

export default function Sidebar({ role, activeKey, onSelect }) {
  const items = MENU_CONFIG[role] || [];
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout?.();
    navigate("/", { replace: true });
  };

  return (
    <aside className="w-full h-full bg-white border-r border-gray-200 flex flex-col gap-1 p-3">
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = activeKey === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-colors
                ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-gray-100 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {showLogoutConfirm &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-[100]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-4">
                <LogOut className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 text-center">
                Confirm Logout
              </h3>
              <p className="text-sm text-gray-500 text-center mt-2">
                Are you sure you want to logout?
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  );
}

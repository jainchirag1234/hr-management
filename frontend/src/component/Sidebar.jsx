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
import { useContext } from "react";
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

  const handleLogout = () => {
    logout?.();
    navigate("/", { replace: true });
  };

  return (
    <aside className="w-full h-full bg-white border-r border-gray-200 flex flex-col gap-1 p-3">
      <div className="text-xs text-gray-400 capitalize px-2 pb-3">
        {role === "admin" ? "Admin Panel" : "Employee Panel"}
      </div>

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
    </aside>
  );
}

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
  ChevronRight,
  ChevronDown,
  DollarSign,
  Wallet,
} from "lucide-react";
import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// Admin menu — Employee has children (Department & Designation)
const ADMIN_MENU = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    key: "employee",
    label: "Employee",
    icon: IdCard,
    children: [
      { key: "department", label: "Department", icon: Building2 },
      { key: "designation", label: "Designation", icon: Briefcase },
    ],
  },
  { key: "attendance", label: "Attendance", icon: Clock },
  { key: "leave", label: "Leave", icon: CalendarOff },
  { key: "salary", label: "Salary", icon: DollarSign },
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "holiday", label: "Holiday", icon: CalendarDays },
  { key: "announcement", label: "Announcement", icon: Megaphone },
];

const EMPLOYEE_MENU = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "attendance", label: "Attendance", icon: Clock },
  { key: "leave", label: "Leave", icon: CalendarOff },
  { key: "salary", label: "My Salary", icon: DollarSign },
  { key: "payroll", label: "My Payslips", icon: Wallet },
  { key: "profile", label: "Profile", icon: CircleUserRound },
  { key: "holiday", label: "Holiday", icon: CalendarDays },
  { key: "announcement", label: "Announcement", icon: Megaphone },
];

const MENU_CONFIG = { admin: ADMIN_MENU, employee: EMPLOYEE_MENU };

// Keys that belong to the Employee accordion group
const EMPLOYEE_CHILD_KEYS = ["employee", "department", "designation"];

export default function Sidebar({ role, activeKey, onSelect }) {
  const items = MENU_CONFIG[role] || [];
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Auto-open Employee accordion if a child page is active
  const [employeeOpen, setEmployeeOpen] = useState(
    EMPLOYEE_CHILD_KEYS.includes(activeKey),
  );

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    logout?.();
    navigate("/", { replace: true });
  };

  const renderItem = ({ key, label, icon: Icon, children }, idx) => {
    const isActive = activeKey === key;
    const hasChildren = children && children.length > 0;
    const isGroupActive =
      hasChildren && children.some((c) => c.key === activeKey);

    if (hasChildren) {
      const open = employeeOpen;
      return (
        <div key={key}>
          {/* Parent button */}
          <button
            onClick={() => {
              setEmployeeOpen((prev) => !prev);
              onSelect(key);
            }}
            className={`sidebar-link flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[14px] text-left transition-all duration-200 group
              ${
                isActive || isGroupActive
                  ? "active bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <span
              className={`flex-shrink-0 transition-transform duration-200 ${
                isActive || isGroupActive ? "" : "group-hover:scale-110"
              }`}
            >
              <Icon
                size={18}
                className={
                  isActive || isGroupActive
                    ? "text-white"
                    : "text-slate-400 group-hover:text-blue-600"
                }
                strokeWidth={isActive || isGroupActive ? 2.5 : 2}
              />
            </span>
            <span
              className={`flex-1 font-medium ${
                isActive || isGroupActive ? "text-white" : ""
              }`}
            >
              {label}
            </span>
            {/* Chevron toggles between down (open) and right (closed) */}
            <span
              className={`transition-transform duration-300 ${open ? "rotate-0" : "-rotate-90"}`}
            >
              <ChevronDown
                size={15}
                className={
                  isActive || isGroupActive
                    ? "text-white/80"
                    : "text-slate-400 group-hover:text-blue-600"
                }
              />
            </span>
          </button>

          {/* Accordion children */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: open ? `${children.length * 52}px` : "0px" }}
          >
            <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l-2 border-blue-100 pl-3 pb-1">
              {children.map(
                ({ key: cKey, label: cLabel, icon: CIcon }, cIdx) => {
                  const cActive = activeKey === cKey;
                  return (
                    <button
                      key={cKey}
                      onClick={() => onSelect(cKey)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] text-left transition-all duration-200 group
                      ${
                        cActive
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      style={{ animationDelay: `${cIdx * 30}ms` }}
                    >
                      <CIcon
                        size={15}
                        className={
                          cActive
                            ? "text-blue-600"
                            : "text-slate-400 group-hover:text-blue-500"
                        }
                        strokeWidth={cActive ? 2.5 : 2}
                      />
                      <span className="flex-1">{cLabel}</span>
                      {cActive && (
                        <ChevronRight className="text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>
      );
    }

    // Normal flat item
    return (
      <button
        key={key}
        onClick={() => onSelect(key)}
        className={`sidebar-link flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[14px] text-left transition-all duration-200 group
          ${
            isActive
              ? "active bg-blue-600 text-white shadow-md shadow-blue-500/30"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        style={{ animationDelay: `${idx * 30}ms` }}
      >
        <span
          className={`flex-shrink-0 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`}
        >
          <Icon
            size={18}
            className={
              isActive
                ? "text-white"
                : "text-slate-400 group-hover:text-blue-600"
            }
            strokeWidth={isActive ? 2.5 : 2}
          />
        </span>
        <span className={`flex-1 font-medium ${isActive ? "text-white" : ""}`}>
          {label}
        </span>
        {isActive && (
          <ChevronRight size={14} className="text-white/70 flex-shrink-0" />
        )}
      </button>
    );
  };

  return (
    <aside className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Brand / User area */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="min-w-0"></div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto p-3">
        {items.map((item, idx) => renderItem(item, idx))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[14px] text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group"
        >
          <LogOut
            size={18}
            className="text-red-400 group-hover:text-red-600 transition-colors"
            strokeWidth={2}
          />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-[100] modal-backdrop">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 modal-content">
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

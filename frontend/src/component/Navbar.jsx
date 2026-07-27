/* eslint-disable no-undef */
/* eslint-disable react-hooks/set-state-in-effect */
import { useContext, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/auth.service";

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getNotifIcon(type) {
  switch (type) {
    case "LEAVE_APPLIED":
      return "📝";
    case "LEAVE_APPROVED":
      return "✅";
    case "LEAVE_REJECTED":
      return "❌";
    case "LEAVE_CANCELLED":
      return "🚫";
    default:
      return "🔔";
  }
}

function Navbar() {
  const { user, logout, socket } = useContext(AuthContext);
  const navigate = useNavigate();

  const role = (user?.role ?? "").toString().trim().toLowerCase();
  const isAdmin = role === "admin";

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const pollRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ---- Fetch notifications from backend ----
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getMyNotifications();
      const data = res.data?.data || [];
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [user]);

  // Initial load + polling every 30s as fallback
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));

    // Fallback polling every 30 seconds
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications, user]);

  // ---- Socket.IO live notifications ----
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket]);

  // ---- Actions ----
  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const markOneRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

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

        {/* Right side: Notifications + Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* ---------------- Notification Bell ---------------- */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((o) => !o);
                setProfileOpen(false);
              }}
              className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
              aria-label="Notifications"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>

              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}

              {/* small live indicator dot */}
              {unreadCount > 0 && (
                <span
                  className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-indigo-600 bg-green-400"
                  title="New notification"
                />
              )}
            </button>

            {notifOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setNotifOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        Notifications
                      </p>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition"
                        >
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAll}
                          className="text-xs text-gray-400 hover:text-red-500 font-medium hover:underline transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-8 text-center">
                        <div className="inline-block w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-xs text-gray-400 mt-2">Loading...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-3xl mb-2">🔔</p>
                        <p className="text-sm text-gray-400">
                          No notifications yet
                        </p>
                        <p className="text-xs text-gray-300 mt-1">
                          You'll see updates here when something happens
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n._id}
                          onClick={() => !n.isRead && markOneRead(n._id)}
                          className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-gray-50 transition border-b border-gray-50 last:border-b-0 ${
                            !n.isRead ? "bg-indigo-50/60" : ""
                          }`}
                        >
                          <span className="text-lg mt-0.5 flex-shrink-0">
                            {getNotifIcon(n.type)}
                          </span>
                          <span className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 leading-snug line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {timeAgo(n.createdAt)}
                            </p>
                          </span>
                          {!n.isRead && (
                            <span className="mt-2 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {notifications.length > 5 && (
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
                      <p className="text-xs text-gray-400">
                        Showing {notifications.length} notifications
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ---------------- Profile Dropdown ---------------- */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen((o) => !o);
                setNotifOpen(false);
              }}
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
      </div>
    </nav>
  );
}

export default Navbar;

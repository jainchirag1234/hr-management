import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import Layout from "./component/Layout";
import Dashboard from "./pages/Dashboard";
import Department from "./pages/Department";
import Designation from "./pages/Designation";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Holiday from "./pages/Holiday";
import Announcement from "./pages/Announcement";
import Profile from "./pages/Profile";
import "./App.css";

// Agar user already logged in hai, login page pe mat jaane do
const PublicRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/" replace />;
  const role = (user.role || "employee").toLowerCase();
  return <Layout role={role}>{children}</Layout>;
};

// Only allows access if role is admin, otherwise redirects to dashboard
const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/" replace />;
  const role = (user.role || "employee").toLowerCase();
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Layout role={role}>{children}</Layout>;
};

// Allows access to multiple specified roles (e.g. admin + employee)
const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/" replace />;
  const role = (user.role || "employee").toLowerCase();
  if (!allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <Layout role={role}>{children}</Layout>;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/department"
        element={
          <AdminRoute>
            <Department />
          </AdminRoute>
        }
      />
      <Route
        path="/designation"
        element={
          <AdminRoute>
            <Designation />
          </AdminRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <RoleRoute allowedRoles={["admin", "employee"]}>
            <Attendance />
          </RoleRoute>
        }
      />
      <Route
        path="/leave"
        element={
          <RoleRoute allowedRoles={["admin", "employee"]}>
            <Leave />
          </RoleRoute>
        }
      />
      <Route
        path="/holiday"
        element={
          <RoleRoute allowedRoles={["admin", "employee"]}>
            <Holiday />
          </RoleRoute>
        }
      />
      <Route
        path="/announcement"
        element={
          <RoleRoute allowedRoles={["admin", "employee"]}>
            <Announcement />
          </RoleRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <RoleRoute allowedRoles={["employee"]}>
            <Profile />
          </RoleRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

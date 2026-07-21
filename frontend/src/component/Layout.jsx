// Layout.jsx
import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({ role, children }) {
  const location = useLocation();
  const activeKey = location.pathname.substring(1).toLowerCase() || "dashboard";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Mobile overlay - jab sidebar khula ho tab background dark */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-56 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Sidebar
          role={role}
          activeKey={activeKey}
          onSelect={(key) => {
            navigate(`/${key}`);
            setIsSidebarOpen(false);
          }}
        />
      </div>

      {/* Right side: Navbar + Main Content + Footer */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        {/* Top Navbar */}
        <div className="relative z-30">
          {/* Mobile sidebar toggle button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 focus:outline-none lg:hidden z-50"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Navbar role={role} />
        </div>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

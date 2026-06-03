import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import SidebarAdmin from "./SidebarAdmin";

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-page font-sans">
      <SidebarAdmin isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

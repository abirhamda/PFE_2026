import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-page font-sans">
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onToggleSidebar={() => {}} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

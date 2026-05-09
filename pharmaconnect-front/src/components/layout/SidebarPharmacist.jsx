import React from "react";
import { FileText, Home, LogOut, Package, Settings } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const SidebarItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        isActive
          ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      }`
    }
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

const SidebarPharmacist = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || user?.email || "Pharmacien";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-600 p-4 text-white shadow-lg">
            <p className="text-xs uppercase tracking-wider text-cyan-100">Pharmacien</p>
            <h2 className="mt-1 text-lg font-semibold">PharmaConnect</h2>
            <p className="mt-3 text-sm text-cyan-50">{displayName}</p>
          </div>

          <nav className="mt-6 flex-1 space-y-2">
            <SidebarItem to="/pharmacy/dashboard" icon={<Home size={18} />} label="Dashboard" />
            <SidebarItem to="/pharmacy/ordonnances" icon={<FileText size={18} />} label="Ordonnances" />
            <SidebarItem to="/pharmacy/supplier" icon={<Package size={18} />} label="Fournisseurs" />
            <SidebarItem to="/settings" icon={<Settings size={18} />} label="Parametres" />
          </nav>

          <button
            onClick={handleLogout}
            className="mt-4 flex items-center gap-3 rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut size={17} />
            <span>Deconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default SidebarPharmacist;

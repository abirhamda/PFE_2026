import React from "react";
import {
  Building2,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Package2,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const NavSection = ({ label }) => (
  <p className="text-[10px] font-semibold text-white/30 tracking-widest uppercase px-5 pt-5 pb-2">
    {label}
  </p>
);

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-5 py-2.5 text-sm border-l-2 transition-all ${
        isActive
          ? "bg-white/10 text-white border-[#4fa3e0]"
          : "text-white/60 hover:bg-white/5 hover:text-white border-transparent"
      }`
    }
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

const getInitials = (name) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const SidebarPharmacist = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || user?.email || "Pharmacien";
  const initials = getInitials(displayName);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:inset-auto lg:z-auto
          w-60 flex-shrink-0 bg-[#0f2d4a] text-white flex flex-col
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Stethoscope size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white leading-tight">MediCare</p>
            <p className="text-xs text-white/50 leading-tight">Plateforme médicale</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          <NavSection label="Pharmacien" />
          <NavItem to="/pharmacy/dashboard" icon={<Home size={16} />} label="Tableau de bord" />
          <NavItem to="/pharmacy/ordonnances" icon={<FileText size={16} />} label="Ordonnances" />
          <NavItem to="/pharmacy/stock" icon={<Package2 size={16} />} label="Stock" />
          <NavItem to="/pharmacy/demandes" icon={<ClipboardList size={16} />} label="Demandes" />
          <NavItem to="/pharmacy/fournisseurs" icon={<Building2 size={16} />} label="Fournisseurs" />

          <NavSection label="Compte" />
          <NavItem to="/pharmacy/profile" icon={<UserRound size={16} />} label="Profil" />
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/15 text-white text-sm font-medium flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
            <p className="text-xs text-white/50 leading-tight">Pharmacien</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white transition-colors flex-shrink-0"
            aria-label="Déconnexion"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default SidebarPharmacist;

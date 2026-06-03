import React, { useEffect, useState } from "react";
import { Bell, Building2, LayoutDashboard, LogOut, Package2, Stethoscope, UserRound } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import api from "../../lib/api";

const NavSection = ({ label }) => (
  <p className="text-[10px] font-semibold text-white/30 tracking-widest uppercase px-5 pt-5 pb-2">
    {label}
  </p>
);

const NavItem = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center justify-between px-5 py-2.5 text-sm border-l-2 transition-all ${
        isActive
          ? "bg-white/10 text-white border-[#4fa3e0]"
          : "text-white/60 hover:bg-white/5 hover:text-white border-transparent"
      }`
    }
  >
    <span className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </span>
    {badge > 0 && (
      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white font-medium">
        {badge}
      </span>
    )}
  </NavLink>
);

const getInitials = (name) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const SidebarSupplier = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const displayName = user?.name || user?.email || "Fournisseur";
  const initials = getInitials(displayName);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/suppliers/me/request-center");
        const pending = Array.isArray(res.data?.items)
          ? res.data.items.filter((item) => item.status === "en_attente")
          : [];
        setNotificationCount(pending.length);
      } catch (error) {
        console.error("Erreur recuperation notifications fournisseur:", error);
      }
    };

    fetchNotifications();
  }, [user?.id]);

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
          <NavSection label="Fournisseur" />
          <NavItem to="/supplier/dashboard" icon={<LayoutDashboard size={16} />} label="Tableau de bord" />
          <NavItem to="/supplier/demandes" icon={<Bell size={16} />} label="Demandes" badge={notificationCount} />
          <NavItem to="/supplier/pharmacies" icon={<Building2 size={16} />} label="Pharmacies" />
          <NavItem to="/supplier/produits" icon={<Package2 size={16} />} label="Produits" />

          <NavSection label="Compte" />
          <NavItem to="/supplier/profile" icon={<UserRound size={16} />} label="Profil" />
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/15 text-white text-sm font-medium flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
            <p className="text-xs text-white/50 leading-tight">Fournisseur</p>
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

export default SidebarSupplier;

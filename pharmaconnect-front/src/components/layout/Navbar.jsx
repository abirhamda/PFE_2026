import React from "react";
import { Bell, LogOut, Menu, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const ROLE_LABELS = {
  admin: "Admin",
  pharmacist: "Pharmacien",
  doctor: "Docteur",
  secretaire: "Secretaire",
  supplier: "Fournisseur",
  pation: "Patient",
};

const getDisplayName = (user) => {
  if (!user) return "Utilisateur";
  if (user.name) return user.name;
  const fullName = [user.prenom, user.nom].filter(Boolean).join(" ").trim();
  return fullName || user.email || "Utilisateur";
};

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  const role = String(user?.role || "").toLowerCase();
  const displayName = getDisplayName(user);
  const profilePath =
    role === "secretaire"
      ? "/secretaire/profile"
      : role === "doctor"
        ? "/docteur/profile"
        : role === "pation"
          ? "/patient/profile"
          : "/profile";
  const settingsPath =
    role === "secretaire"
      ? "/secretaire/settings"
      : role === "doctor"
        ? "/docteur/settings"
        : role === "pation"
          ? "/patient/settings"
          : "/settings";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-cyan-500 hover:text-cyan-700 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>

            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-900">PharmaConnect</p>
              <p className="text-xs text-slate-500">Plateforme healthcare operations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-cyan-500 hover:text-cyan-700"
              aria-label="Notifications"
            >
              <Bell size={17} />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 transition hover:border-cyan-500"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-teal-500 text-white">
                  <User size={16} />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{displayName}</p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[role] || "Role"}</p>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate(profilePath);
                    }}
                  >
                    <User size={15} />
                    Profil
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate(settingsPath);
                    }}
                  >
                    <Settings size={15} />
                    Parametres
                  </button>
                  <button
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    Deconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

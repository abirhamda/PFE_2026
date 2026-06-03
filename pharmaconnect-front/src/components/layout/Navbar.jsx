import React from "react";
import { ChevronDown, LogOut, Menu, Settings, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const ROLE_LABELS = {
  admin:      "Administrateur",
  pharmacist: "Pharmacien",
  doctor:     "Médecin",
  secretaire: "Secrétaire",
  supplier:   "Fournisseur",
  pation:     "Patient",
};

const PAGE_TITLES = {
  "/admin/dashboard":        { title: "Tableau de bord",      subtitle: "Vue générale de la plateforme" },
  "/admin/pharmacies":       { title: "Pharmacies",           subtitle: "Gestion des pharmacies partenaires" },
  "/admin/medecins":         { title: "Accès médecins",       subtitle: "Autorisation et contrôle des accès" },
  "/admin/suppliers":        { title: "Fournisseurs",         subtitle: "Gestion des fournisseurs" },
  "/admin/settings":         { title: "Paramètres",           subtitle: "Configuration du système" },
  "/docteur":                { title: "Tableau de bord",      subtitle: "Vue générale de votre activité" },
  "/docteur/rendezvous":     { title: "Rendez-vous",          subtitle: "Gestion du calendrier" },
  "/docteur/patients":       { title: "Patients",             subtitle: "Dossiers et fiches médicales" },
  "/docteur/ordonnances":    { title: "Ordonnances",          subtitle: "Prescriptions médicales" },
  "/medecin/analyse":        { title: "Analyse IA",           subtitle: "Module d'analyse radiologique IA" },
  "/docteur/analyse":        { title: "Analyse IA",           subtitle: "Module d'analyse radiologique IA" },
  "/docteur/secretaires":    { title: "Secrétaires",          subtitle: "Gestion de l'équipe administrative" },
  "/docteur/profile":        { title: "Profil",               subtitle: "Informations personnelles" },
  "/docteur/settings":       { title: "Paramètres",           subtitle: "Préférences" },
  "/pharmacy/dashboard":     { title: "Tableau de bord",      subtitle: "Vue générale de la pharmacie" },
  "/pharmacy/ordonnances":   { title: "Ordonnances",          subtitle: "Prescriptions reçues" },
  "/pharmacy/stock":         { title: "Stock",                subtitle: "Inventaire des médicaments" },
  "/pharmacy/demandes":      { title: "Demandes",             subtitle: "Commandes auprès des fournisseurs" },
  "/pharmacy/fournisseurs":  { title: "Fournisseurs",         subtitle: "Partenaires de livraison" },
  "/pharmacy/profile":       { title: "Profil",               subtitle: "Informations personnelles" },
  "/pharmacy/settings":      { title: "Paramètres",           subtitle: "Préférences" },
  "/supplier/dashboard":     { title: "Tableau de bord",      subtitle: "Activité fournisseur" },
  "/supplier/demandes":      { title: "Demandes",             subtitle: "Demandes des pharmacies" },
  "/supplier/pharmacies":    { title: "Pharmacies",           subtitle: "Réseau de distribution" },
  "/supplier/produits":      { title: "Produits",             subtitle: "Catalogue médicaments" },
  "/supplier/profile":       { title: "Profil",               subtitle: "Informations personnelles" },
  "/supplier/settings":      { title: "Paramètres",           subtitle: "Préférences" },
  "/secretaire/rendezvous":  { title: "Rendez-vous",          subtitle: "Calendrier du cabinet" },
  "/secretaire/patients":    { title: "Patients",             subtitle: "Registre des patients" },
  "/secretaire/ordonnances": { title: "Ordonnances",          subtitle: "Prescriptions" },
  "/secretaire/profile":     { title: "Profil",               subtitle: "Informations personnelles" },
  "/secretaire/settings":    { title: "Paramètres",           subtitle: "Préférences" },
  "/patient":                { title: "Mon espace santé",     subtitle: "Tableau de bord patient" },
  "/patient/discover":       { title: "Recherche",            subtitle: "Trouver un médecin" },
  "/patient/appointments":   { title: "Rendez-vous",          subtitle: "Mes consultations" },
  "/patient/ordonnances":    { title: "Ordonnances",          subtitle: "Mes prescriptions" },
  "/patient/documents":      { title: "Documents",            subtitle: "Mes fichiers médicaux" },
  "/patient/profile":        { title: "Profil",               subtitle: "Informations personnelles" },
  "/patient/settings":       { title: "Paramètres",           subtitle: "Préférences" },
  "/profile":                { title: "Profil",               subtitle: "Informations personnelles" },
  "/settings":               { title: "Paramètres",           subtitle: "Préférences" },
};

const getDisplayName = (user) => {
  if (!user) return "Utilisateur";
  if (user.name) return user.name;
  const fullName = [user.prenom, user.nom].filter(Boolean).join(" ").trim();
  return fullName || user.email || "Utilisateur";
};

const getInitials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  const role = String(user?.role || "").toLowerCase();
  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  const currentPage = PAGE_TITLES[location.pathname] || {
    title: "MediCare",
    subtitle: "Plateforme médicale",
  };

  const profilePath =
    role === "pharmacist" ? "/pharmacy/profile" :
    role === "supplier"   ? "/supplier/profile" :
    role === "secretaire" ? "/secretaire/profile" :
    role === "doctor"     ? "/docteur/profile" :
    role === "pation"     ? "/patient/profile" : "/profile";

  const settingsPath =
    role === "admin"      ? "/admin/settings" :
    role === "pharmacist" ? "/pharmacy/settings" :
    role === "supplier"   ? "/supplier/settings" :
    role === "secretaire" ? "/secretaire/settings" :
    role === "doctor"     ? "/docteur/settings" :
    role === "pation"     ? "/patient/settings" : "/settings";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0 z-20">
      {/* Left — page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-gray-50 transition-colors"
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-primary leading-tight">
            {currentPage.title}
          </h1>
          <p className="text-sm text-text-secondary leading-tight">{currentPage.subtitle}</p>
        </div>
      </div>

      {/* Right — status + user */}
      <div className="flex items-center gap-4">
        {/* AI model status badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-medical-success-bg text-medical-success text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-medical-success animate-pulse" />
          Modèle IA actif
        </div>

        <div className="w-px h-5 bg-border" />

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
            aria-expanded={showProfileMenu}
          >
            <div className="w-8 h-8 rounded-full bg-accent-light text-accent text-sm font-semibold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text-primary leading-tight">{displayName}</p>
              <p className="text-xs text-text-secondary leading-tight">
                {ROLE_LABELS[role] || "Utilisateur"}
              </p>
            </div>
            <ChevronDown size={14} className="text-text-muted" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-card rounded-card border border-border shadow-card-hover z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-text-primary">{displayName}</p>
                <p className="text-xs text-text-secondary">{ROLE_LABELS[role] || "Utilisateur"}</p>
              </div>
              <button
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate(profilePath);
                }}
              >
                <User size={15} />
                Profil
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate(settingsPath);
                }}
              >
                <Settings size={15} />
                Paramètres
              </button>
              <button
                className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-sm text-medical-danger hover:bg-medical-danger-bg transition-colors"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

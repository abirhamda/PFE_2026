import { Menu, Stethoscope, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const VisitorNavbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card shadow-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-sm flex-shrink-0">
            <Stethoscope size={20} />
          </div>
          <div>
            <p className="text-base font-semibold text-text-primary leading-tight">MediCare</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-text-muted leading-tight">Annuaire santé</p>
          </div>
        </Link>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-gray-50 transition-colors lg:hidden"
          aria-label="Ouvrir le menu visiteur"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/redirect"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 hover:border-accent/40 transition-colors"
              >
                Mon espace
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 hover:border-accent/40 transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/login?mode=register"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="border-t border-border bg-card px-4 py-3 shadow-card lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/redirect"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
                >
                  Mon espace
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-primary px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/login?mode=register"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default VisitorNavbar;

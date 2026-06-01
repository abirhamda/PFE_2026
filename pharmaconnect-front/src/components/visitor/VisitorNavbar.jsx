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
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-700 to-teal-600 text-white shadow-lg shadow-cyan-200/70">
            <Stethoscope size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">MediCare</p>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Annuaire sante</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 lg:hidden"
          aria-label="Ouvrir le menu visiteur"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/redirect"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
              >
                Mon espace
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
              >
                Connexion
              </Link>
              <Link
                to="/login?mode=register"
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-4 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/redirect"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  Mon espace
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-semibold text-white"
                >
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  Connexion
                </Link>
                <Link
                  to="/login?mode=register"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default VisitorNavbar;

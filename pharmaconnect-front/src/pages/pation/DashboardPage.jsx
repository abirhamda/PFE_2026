import { useEffect, useState } from "react";
import { CalendarDays, FileText, Search, UserCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

const StatCard = ({ title, value, icon }) => (
  <div className="bg-card rounded-card border border-border shadow-card p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</p>
        <p className="mt-2.5 text-3xl font-semibold text-text-primary">{value}</p>
      </div>
      <div className="rounded-lg bg-accent-light p-2.5 text-accent flex-shrink-0">{icon}</div>
    </div>
  </div>
);

const PatientDashboardPage = () => {
  const [profile, setProfile] = useState(null);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [ordonnancesCount, setOrdonnancesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [profileRes, appointmentsRes, ordonnancesRes] = await Promise.all([
          api.get("/patient-portal/me"),
          api.get("/patient-portal/appointments"),
          api.get("/patient-portal/ordonnances"),
        ]);

        setProfile(profileRes.data?.profile || null);
        setAppointmentsCount(Number(appointmentsRes.data?.count || 0));
        setOrdonnancesCount(Number(ordonnancesRes.data?.count || 0));
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Impossible de charger votre tableau de bord");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-primary rounded-card border border-primary/20 shadow-card p-5">
        <h1 className="text-xl font-semibold text-white">Espace patient</h1>
        <p className="mt-1 text-sm text-white/65">
          {profile ? `Bienvenue ${profile.prenom} ${profile.nom}` : "Suivez vos soins et rendez-vous."}
        </p>
      </div>

      {error && (
        <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
          {error}
        </div>
      )}

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard title="Rendez-vous"  value={loading ? "..." : appointmentsCount} icon={<CalendarDays size={18} />} />
        <StatCard title="Ordonnances"  value={loading ? "..." : ordonnancesCount}  icon={<FileText size={18} />} />
        <StatCard title="Profil"       value={loading ? "..." : profile ? "OK" : "-"} icon={<UserCircle2 size={18} />} />
      </section>

      {/* Quick links */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/patient/discover"
          className="bg-card rounded-card border border-border shadow-card p-5 hover:border-accent/30 hover:shadow-card-hover transition-all"
        >
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Search size={17} className="text-accent" />
            Chercher un medecin
          </p>
          <p className="mt-1.5 text-sm text-text-secondary">Par specialite, localisation, nom et distance.</p>
        </Link>
        <Link
          to="/patient/appointments"
          className="bg-card rounded-card border border-border shadow-card p-5 hover:border-accent/30 hover:shadow-card-hover transition-all"
        >
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
            <CalendarDays size={17} className="text-accent" />
            Mes rendez-vous
          </p>
          <p className="mt-1.5 text-sm text-text-secondary">Consulter vos reservations et votre historique.</p>
        </Link>
      </section>
    </div>
  );
};

export default PatientDashboardPage;

import { useEffect, useState } from "react";
import { CalendarDays, FileText, Search, UserCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

const StatCard = ({ title, value, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      </div>
      <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700">{icon}</div>
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
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold">Espace patient</h1>
        <p className="mt-1 text-sm text-cyan-100">
          {profile ? `Bienvenue ${profile.prenom} ${profile.nom}` : "Suivez vos soins et rendez-vous."}
        </p>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard title="Rendez-vous" value={loading ? "..." : appointmentsCount} icon={<CalendarDays size={18} />} />
        <StatCard title="Ordonnances" value={loading ? "..." : ordonnancesCount} icon={<FileText size={18} />} />
        <StatCard title="Profil" value={loading ? "..." : profile ? "OK" : "-"} icon={<UserCircle2 size={18} />} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link to="/patient/discover" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
          <p className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Search size={18} />
            Chercher un medecin
          </p>
          <p className="mt-1 text-sm text-slate-500">Par specialite, localisation, nom et distance.</p>
        </Link>
        <Link to="/patient/appointments" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
          <p className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CalendarDays size={18} />
            Mes rendez-vous
          </p>
          <p className="mt-1 text-sm text-slate-500">Consulter vos reservations et votre historique.</p>
        </Link>
      </section>
    </div>
  );
};

export default PatientDashboardPage;

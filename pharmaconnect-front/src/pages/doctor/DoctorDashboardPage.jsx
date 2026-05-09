import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Clock3, FileText, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import api from "../../lib/api";

const formatDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const monthBounds = (anchorDate) => {
  const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const last = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  return {
    from: formatDateKey(first),
    to: formatDateKey(last),
  };
};

const toHumanDateTime = (value) => {
  if (!value) return "--";
  const normalized = String(value).replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatCard = ({ icon, label, value, hint }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">{icon}</div>
    </div>
  </div>
);

const DoctorDashboardPage = () => {
  const { user } = useAuth();
  const doctorId = Number(user?.id || user?.entityId || 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [ordonnancesCount, setOrdonnancesCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);

  const todayKey = formatDateKey(new Date());
  const now = new Date();
  const { from, to } = monthBounds(now);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [appointmentsRes, patientsRes, waitingRes, ordonnancesRes] = await Promise.all([
          api.get("/appointments/calendar", { params: { from, to } }),
          api.get("/doctor-patients"),
          api.get("/appointments/waiting-room", { params: { date: todayKey } }),
          api.get("/ordonnances"),
        ]);

        const items = Array.isArray(appointmentsRes.data?.appointments) ? appointmentsRes.data.appointments : [];
        setAppointments(items);

        const patients = Array.isArray(patientsRes.data?.patients) ? patientsRes.data.patients : [];
        setPatientsCount(patients.length);

        setWaitingCount(Number(waitingRes.data?.waiting_count || 0));

        const ordonnances = Array.isArray(ordonnancesRes.data) ? ordonnancesRes.data : [];
        const doctorOrdonnances = ordonnances.filter((item) => Number(item.doctor_id || item.id_doctor) === doctorId);
        setOrdonnancesCount(doctorOrdonnances.length);
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Impossible de charger le tableau de bord medecin");
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) {
      load();
    } else {
      setLoading(false);
    }
  }, [doctorId, from, to, todayKey]);

  const todayAppointments = useMemo(
    () => appointments.filter((appointment) => String(appointment.appointment_at || "").slice(0, 10) === todayKey),
    [appointments, todayKey],
  );

  const createdBySecretariesCount = useMemo(
    () => todayAppointments.filter((item) => item.created_by_role === "secretaire").length,
    [todayAppointments],
  );

  const upcomingTodayAppointments = useMemo(
    () =>
      [...todayAppointments]
        .sort((left, right) => new Date(left.appointment_at).getTime() - new Date(right.appointment_at).getTime())
        .slice(0, 6),
    [todayAppointments],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <p className="text-xs uppercase tracking-wider text-cyan-100">Module medecin</p>
        <h1 className="mt-1 text-3xl font-bold">Tableau de bord clinique</h1>
        <p className="mt-1 text-sm text-cyan-100">
          Suivi des rendez-vous, patients, fiches et ordonnances dans un seul espace.
        </p>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CalendarDays size={18} />}
          label="Rendez-vous aujourd'hui"
          value={loading ? "..." : todayAppointments.length}
          hint={`${loading ? "..." : createdBySecretariesCount} emis par les secretaires`}
        />
        <StatCard
          icon={<Users size={18} />}
          label="Patients suivis"
          value={loading ? "..." : patientsCount}
          hint="Dossier medical unifie"
        />
        <StatCard
          icon={<Clock3 size={18} />}
          label="Salle d'attente (lecture)"
          value={loading ? "..." : waitingCount}
          hint="Mis a jour par la secretaire"
        />
        <StatCard
          icon={<FileText size={18} />}
          label="Ordonnances emises"
          value={loading ? "..." : ordonnancesCount}
          hint="Creation et impression incluses"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Stethoscope size={18} className="text-cyan-700" />
            <h2 className="text-lg font-semibold text-slate-900">Planning du jour</h2>
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Chargement...
            </div>
          ) : upcomingTodayAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Aucun rendez-vous prevu aujourd'hui.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTodayAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {appointment.patient_prenom} {appointment.patient_nom}
                      </p>
                      <p className="text-xs text-slate-500">{toHumanDateTime(appointment.appointment_at)}</p>
                    </div>
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                      {appointment.created_by_role === "secretaire" ? "Ajoute par secretaire" : "Ajoute par medecin"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Actions rapides</h2>
          <Link
            to="/docteur/rendezvous"
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Gerer les rendez-vous
            <ChevronRight size={16} />
          </Link>
          <Link
            to="/docteur/patients"
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ouvrir les patients et fiches
            <ChevronRight size={16} />
          </Link>
          <Link
            to="/docteur/ordonnances"
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Creer / imprimer une ordonnance
            <ChevronRight size={16} />
          </Link>
          <Link
            to="/docteur/secretaires"
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Gerer les secretaires
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default DoctorDashboardPage;

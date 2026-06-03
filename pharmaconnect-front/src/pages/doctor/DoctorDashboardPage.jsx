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
  <div className="bg-card rounded-card border border-border shadow-card p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
        <p className="mt-2.5 text-3xl font-semibold text-text-primary">{value}</p>
        {hint ? <p className="mt-1.5 text-xs text-text-secondary leading-snug">{hint}</p> : null}
      </div>
      <div className="rounded-lg bg-accent-light p-2.5 text-accent flex-shrink-0">{icon}</div>
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
    <div className="space-y-5">
      {error && (
        <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
          {error}
        </div>
      )}

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<CalendarDays size={18} />} label="Rendez-vous aujourd'hui" value={loading ? "..." : todayAppointments.length} hint={`${loading ? "..." : createdBySecretariesCount} emis par les secretaires`} />
        <StatCard icon={<Users size={18} />} label="Patients suivis" value={loading ? "..." : patientsCount} hint="Dossier medical unifie" />
        <StatCard icon={<Clock3 size={18} />} label="Salle d'attente" value={loading ? "..." : waitingCount} hint="Mis a jour par la secretaire" />
        <StatCard icon={<FileText size={18} />} label="Ordonnances emises" value={loading ? "..." : ordonnancesCount} hint="Creation et impression incluses" />
      </section>

      {/* Planning + actions */}
      <section className="grid gap-5 xl:grid-cols-[2fr,1fr]">
        <div className="bg-card rounded-card border border-border shadow-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Stethoscope size={17} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide">Planning du jour</h2>
          </div>

          {loading ? (
            <div className="rounded-card border border-dashed border-border bg-gray-50 p-6 text-center text-sm text-text-secondary">
              Chargement...
            </div>
          ) : upcomingTodayAppointments.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-gray-50 p-6 text-center text-sm text-text-secondary">
              Aucun rendez-vous prevu aujourd'hui.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingTodayAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-card border border-border bg-gray-50 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {appointment.patient_prenom} {appointment.patient_nom}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">{toHumanDateTime(appointment.appointment_at)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      appointment.created_by_role === "secretaire"
                        ? "bg-accent-light text-accent"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {appointment.created_by_role === "secretaire" ? "Par secretaire" : "Direct"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-card border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-text-primary tracking-wide mb-4">Actions rapides</h2>
          <div className="space-y-2">
            {[
              { to: "/docteur/rendezvous", label: "Gerer les rendez-vous" },
              { to: "/docteur/patients",   label: "Ouvrir les patients et fiches" },
              { to: "/docteur/ordonnances",label: "Creer / imprimer une ordonnance" },
              { to: "/docteur/secretaires",label: "Gerer les secretaires" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50 hover:border-accent/30 transition-colors"
              >
                {link.label}
                <ChevronRight size={15} className="text-text-muted" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DoctorDashboardPage;

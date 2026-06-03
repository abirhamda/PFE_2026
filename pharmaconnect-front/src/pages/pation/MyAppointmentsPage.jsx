import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, RefreshCcw, Stethoscope, XCircle } from "lucide-react";
import api from "../../lib/api";

const toHumanDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toHumanDate = (value) => {
  if (!value) return "--";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const toHumanTime = (value) => {
  if (!value) return "--";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const toMad = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)} MAD` : "-";
};

const MyAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  const loadAppointments = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await api.get("/patient-portal/appointments");
      const list = Array.isArray(response.data?.appointments) ? response.data.appointments : [];
      setAppointments(list);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les rendez-vous");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async () => {
    if (!cancelTarget) return;

    setCancelling(true);
    setError("");
    setMessage("");
    try {
      await api.delete(`/patient-portal/appointments/${cancelTarget.id}`);
      setAppointments((prev) => prev.filter((appointment) => appointment.id !== cancelTarget.id));
      setMessage("Rendez-vous annule avec succes.");
      setCancelTarget(null);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible d'annuler ce rendez-vous");
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const future = [];
    const history = [];
    for (const item of appointments) {
      const ts = new Date(String(item.appointment_at).replace(" ", "T")).getTime();
      if (!Number.isNaN(ts) && ts >= now) {
        future.push(item);
      } else {
        history.push(item);
      }
    }

    future.sort((a, b) => new Date(a.appointment_at).getTime() - new Date(b.appointment_at).getTime());
    history.sort((a, b) => new Date(b.appointment_at).getTime() - new Date(a.appointment_at).getTime());

    return { upcoming: future, past: history };
  }, [appointments]);

  const listToShow = activeTab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-primary rounded-card border border-primary/20 shadow-card px-5 py-4 flex items-center gap-3">
        <div className="rounded-lg bg-white/15 p-2 flex-shrink-0">
          <Stethoscope size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Mes rendez-vous</h1>
          <p className="text-sm text-white/65">Suivi de vos consultations reservees en ligne.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-card border-l-4 border-medical-success bg-medical-success-bg px-4 py-3 text-sm text-medical-success">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
          {error}
        </div>
      )}

      <div className="bg-card rounded-card border border-border shadow-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border bg-gray-50 p-1">
            {[
              { key: "upcoming", label: `A venir (${upcoming.length})` },
              { key: "past",     label: `Passes (${past.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === key ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadAppointments}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
          >
            <RefreshCcw size={13} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="rounded-card border border-dashed border-border bg-gray-50 p-6 text-center text-sm text-text-secondary">
            Chargement...
          </div>
        ) : listToShow.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-gray-50 p-6 text-center text-sm text-text-secondary">
            {activeTab === "upcoming" ? "Aucun rendez-vous a venir." : "Aucun rendez-vous passe."}
          </div>
        ) : (
          <div className="space-y-3">
            {listToShow.map((appointment) => {
              const canCancel = activeTab === "upcoming";

              return (
                <article key={appointment.id} className="rounded-card border border-border bg-gray-50/60 p-4 hover:border-accent/30 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        Dr. {appointment.doctor_prenom} {appointment.doctor_nom}
                      </p>
                      <p className="text-xs text-text-secondary">{appointment.doctor_specialty || "-"}</p>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="rounded-lg border border-accent-light bg-accent-light px-3 py-2 text-right">
                        <p className="text-[10px] uppercase tracking-wide text-accent">Date</p>
                        <p className="text-sm font-bold text-accent">{toHumanDate(appointment.appointment_at)}</p>
                        <p className="text-xs font-medium text-accent">{toHumanTime(appointment.appointment_at)}</p>
                      </div>

                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(appointment)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-medical-danger/30 bg-medical-danger-bg px-3 py-2 text-xs font-semibold text-medical-danger hover:bg-red-100 transition-colors"
                        >
                          <XCircle size={14} />
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-text-secondary md:grid-cols-2">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-text-muted" />
                      {toHumanDateTime(appointment.appointment_at)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock3 size={13} className="text-text-muted" />
                      Paiement: {toMad(appointment.payment_amount)}
                    </p>
                  </div>
                  {appointment.payment_doctor_comment && (
                    <p className="mt-2 rounded-lg border border-medical-warning-bg bg-medical-warning-bg px-2.5 py-2 text-xs text-medical-warning">
                      Commentaire medecin: {appointment.payment_doctor_comment}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-card border border-border bg-card p-5 shadow-card-hover">
            <h3 className="text-base font-semibold text-text-primary">Annuler le rendez-vous</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Dr. {cancelTarget.doctor_prenom} {cancelTarget.doctor_nom} - {toHumanDateTime(cancelTarget.appointment_at)}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-gray-50 disabled:opacity-60"
              >
                Garder
              </button>
              <button
                type="button"
                onClick={cancelAppointment}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 rounded-lg bg-medical-danger px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <XCircle size={14} />
                {cancelling ? "Annulation..." : "Annuler"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointmentsPage;

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, RefreshCcw, Stethoscope } from "lucide-react";
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
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  const loadAppointments = async () => {
    setLoading(true);
    setError("");
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
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/20 p-2.5">
            <Stethoscope size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Mes rendez-vous</h1>
            <p className="mt-1 text-sm text-cyan-100">Suivi de vos consultations reservees en ligne.</p>
          </div>
        </div>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                activeTab === "upcoming" ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              A venir ({upcoming.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("past")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                activeTab === "past" ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Passes ({past.length})
            </button>
          </div>

          <button
            type="button"
            onClick={loadAppointments}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={14} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Chargement...
          </div>
        ) : listToShow.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {activeTab === "upcoming" ? "Aucun rendez-vous a venir." : "Aucun rendez-vous passe."}
          </div>
        ) : (
          <div className="space-y-3">
            {listToShow.map((appointment) => (
              <article key={appointment.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Dr. {appointment.doctor_prenom} {appointment.doctor_nom}
                    </p>
                    <p className="text-xs text-slate-500">{appointment.doctor_specialty || "-"}</p>
                  </div>

                  <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-wide text-cyan-700">Date</p>
                    <p className="text-sm font-bold text-cyan-800">{toHumanDate(appointment.appointment_at)}</p>
                    <p className="text-xs font-semibold text-cyan-700">{toHumanTime(appointment.appointment_at)}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {toHumanDateTime(appointment.appointment_at)}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock3 size={14} />
                    Paiement: {toMad(appointment.payment_amount)}
                  </p>
                </div>
                {appointment.payment_doctor_comment && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                    Commentaire medecin: {appointment.payment_doctor_comment}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyAppointmentsPage;

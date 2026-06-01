import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

const SEARCH_SCOPES = [
  { value: "all", label: "Tout" },
  { value: "doctor", label: "Medecins" },
  { value: "pharmacy", label: "Pharmacies" },
];

const dayLabels = {
  0: "Dim",
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
};

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

const toDateOnlyKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getMondayStart = (sourceDate) => {
  const date = new Date(sourceDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (sourceDate, count) => {
  const date = new Date(sourceDate);
  date.setDate(date.getDate() + count);
  return date;
};

const formatWeekRange = (startDate) => {
  const endDate = addDays(startDate, 6);
  return `${startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} - ${endDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  })}`;
};

const prettyWorkingHours = (hours) => {
  if (!hours || typeof hours !== "object") return [];
  const lines = [];
  for (let day = 1; day <= 6; day += 1) {
    const cfg = hours[String(day)] || { enabled: false };
    lines.push(`${dayLabels[day]}: ${cfg.enabled ? `${cfg.start} - ${cfg.end}` : "ferme"}`);
  }
  const sunday = hours["0"] || { enabled: false };
  lines.push(`${dayLabels[0]}: ${sunday.enabled ? `${sunday.start} - ${sunday.end}` : "ferme"}`);
  return lines;
};

const buildWeekDays = (offset = 0) => {
  const start = getMondayStart(new Date());
  start.setDate(start.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
};

const DiscoverDoctorsPage = ({ publicMode = false }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canBook = !publicMode && isAuthenticated && role === "pation";

  const [scope, setScope] = useState("all");
  const [filters, setFilters] = useState({
    name: "",
    specialty: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [weekOffsetByDoctor, setWeekOffsetByDoctor] = useState({});
  const [pendingBooking, setPendingBooking] = useState(null);

  const loadResults = async (nextFilters = filters, nextScope = scope) => {
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const shouldLoadDoctors = nextScope !== "pharmacy";
      const shouldLoadPharmacies = nextScope !== "doctor";

      const doctorParams = {
        name: nextFilters.name.trim() || undefined,
        specialty: nextFilters.specialty.trim() || undefined,
        address: nextFilters.address.trim() || undefined,
        limit: 12,
      };

      const pharmacyParams = {
        name: nextFilters.name.trim() || undefined,
        address: nextFilters.address.trim() || undefined,
        limit: 12,
      };

      const [doctorsResponse, pharmaciesResponse] = await Promise.all([
        shouldLoadDoctors
          ? api.get("/patient-portal/doctors", { params: doctorParams })
          : Promise.resolve({ data: { doctors: [] } }),
        shouldLoadPharmacies
          ? api.get("/pharmacy/public-search", { params: pharmacyParams })
          : Promise.resolve({ data: { pharmacies: [] } }),
      ]);

      setDoctors(Array.isArray(doctorsResponse.data?.doctors) ? doctorsResponse.data.doctors : []);
      setPharmacies(Array.isArray(pharmaciesResponse.data?.pharmacies) ? pharmaciesResponse.data.pharmacies : []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les resultats");
      setDoctors([]);
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadPatientDefaults = async () => {
      if (!canBook) return;
      try {
        const response = await api.get("/patient-portal/me");
        const profile = response.data?.profile;
        if (!profile?.city) return;
        setFilters((prev) => ({
          ...prev,
          address: prev.address || profile.city || "",
        }));
      } catch (_error) {
        // no-op
      }
    };

    loadPatientDefaults();
  }, [canBook]);

  const handleScopeChange = (nextScope) => {
    setScope(nextScope);
    if (hasSearched) {
      loadResults(filters, nextScope);
    }
  };

  const requestBooking = (doctor, slotAt) => {
    setError("");
    setMessage("");
    if (!canBook) {
      setMessage("Connectez-vous comme patient pour reserver un rendez-vous.");
      return;
    }

    setPendingBooking({
      doctorId: doctor.doctor_id,
      doctorName: doctor.display_name,
      specialty: doctor.specialty,
      slotAt,
    });
  };

  const confirmBooking = async () => {
    if (!pendingBooking) return;

    const bookingKey = `${pendingBooking.doctorId}|${pendingBooking.slotAt}`;
    setBooking(bookingKey);
    setError("");
    setMessage("");

    try {
      await api.post("/patient-portal/appointments/book", {
        doctor_id: pendingBooking.doctorId,
        appointment_at: pendingBooking.slotAt,
      });
      setPendingBooking(null);
      setMessage("Rendez-vous reserve avec succes.");
      await loadResults();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Reservation impossible");
    } finally {
      setBooking("");
    }
  };

  const renderWeeklySlots = (doctor) => {
    const weekOffset = weekOffsetByDoctor[doctor.doctor_id] || 0;
    const weekDays = buildWeekDays(weekOffset);

    const slotsByDay = weekDays.reduce((acc, day) => {
      acc[toDateOnlyKey(day)] = [];
      return acc;
    }, {});

    for (const slot of doctor.available_slots || []) {
      const slotDate = new Date(String(slot).replace(" ", "T"));
      if (Number.isNaN(slotDate.getTime())) continue;
      const key = toDateOnlyKey(slotDate);
      if (slotsByDay[key]) slotsByDay[key].push(slot);
    }

    const totalWeekSlots = Object.values(slotsByDay).reduce((sum, items) => sum + items.length, 0);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() =>
              setWeekOffsetByDoctor((prev) => ({
                ...prev,
                [doctor.doctor_id]: Math.max(-2, (prev[doctor.doctor_id] || 0) - 1),
              }))
            }
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={14} />
          </button>
          <p className="text-xs font-semibold text-slate-600">Semaine {formatWeekRange(weekDays[0])}</p>
          <button
            type="button"
            onClick={() =>
              setWeekOffsetByDoctor((prev) => ({
                ...prev,
                [doctor.doctor_id]: Math.min(6, (prev[doctor.doctor_id] || 0) + 1),
              }))
            }
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {totalWeekSlots === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Aucun creneau en ligne pour cette semaine.
          </p>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {weekDays.map((day) => {
                const dayKey = toDateOnlyKey(day);
                const daySlots = slotsByDay[dayKey] || [];
                return (
                  <div key={dayKey} className="w-44 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="mb-1 text-xs font-semibold text-slate-700">
                      {day.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                    </p>
                    <div className="space-y-1">
                      {daySlots.length > 0 ? (
                        daySlots.slice(0, 6).map((slot) => {
                          const isBooking = booking === `${doctor.doctor_id}|${slot}`;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => requestBooking(doctor, slot)}
                              disabled={isBooking || !doctor.online_booking_enabled}
                              className="w-full rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-left text-[11px] font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-60"
                            >
                              {isBooking
                                ? "Reservation..."
                                : new Date(String(slot).replace(" ", "T")).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-slate-400">Aucun</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const showDoctors = scope !== "pharmacy";
  const showPharmacies = scope !== "doctor";
  const totalResults = doctors.length + pharmacies.length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/20 p-2.5">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Recherche medecins et pharmacies</h1>
            <p className="mt-1 text-sm text-cyan-100">Recherche par nom, specialite et adresse uniquement.</p>
          </div>
        </div>
      </section>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {SEARCH_SCOPES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleScopeChange(item.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                scope === item.value
                  ? "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            loadResults();
          }}
          className={`mt-4 grid gap-3 ${scope === "pharmacy" ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}
        >
          <input
            value={filters.name}
            onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={scope === "pharmacy" ? "Nom de la pharmacie" : "Nom du medecin ou pharmacie"}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          {scope !== "pharmacy" ? (
            <input
              value={filters.specialty}
              onChange={(event) => setFilters((prev) => ({ ...prev, specialty: event.target.value }))}
              placeholder="Specialite"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          ) : null}
          <input
            value={filters.address}
            onChange={(event) => setFilters((prev) => ({ ...prev, address: event.target.value }))}
            placeholder="Adresse ou ville"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            <Search size={15} />
            Rechercher
          </button>
        </form>
      </section>

      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          <Loader2 className="mx-auto mb-2 animate-spin" size={22} />
          Chargement des resultats...
        </div>
      ) : !hasSearched ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Lancez une recherche pour afficher les medecins et les pharmacies correspondants.
        </div>
      ) : totalResults === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aucun resultat ne correspond a vos criteres.
        </div>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Resultats</p>
              <p className="mt-1 text-sm text-slate-500">Affichage limite aux correspondances trouvees.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{totalResults} resultat(s)</span>
          </div>

          {showDoctors && doctors.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="text-cyan-700" size={18} />
                <h2 className="text-lg font-semibold text-slate-900">Medecins</h2>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {doctors.map((doctor) => (
                  <article key={doctor.doctor_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">Dr. {doctor.display_name}</p>
                        <p className="text-sm text-slate-500">{doctor.specialty}</p>
                      </div>
                      {doctor.distance_km !== null && (
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                          {doctor.distance_km} km
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p className="flex items-center gap-1.5">
                        <MapPin size={14} />
                        {doctor.address_line || "-"}, {doctor.city || "-"}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone size={14} />
                        {doctor.public_phone || "-"}
                      </p>
                      <p>Tarif: {doctor.consultation_fee !== null ? `${doctor.consultation_fee} MAD` : "-"}</p>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Horaires</p>
                      <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                        {prettyWorkingHours(doctor.working_hours).map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <CalendarDays size={15} />
                        Disponibilites en ligne
                      </p>

                      {doctor.online_booking_enabled && (doctor.available_slots || []).length > 0 ? (
                        <>{renderWeeklySlots(doctor)}</>
                      ) : (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          Aucune disponibilite en ligne (acces non active ou creneaux complets).
                        </p>
                      )}

                      {!canBook && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          Reservation en ligne reservee aux patients connectes.
                          <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="ml-1 font-semibold text-cyan-700 hover:text-cyan-800"
                          >
                            Se connecter
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {showPharmacies && pharmacies.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="text-cyan-700" size={18} />
                <h2 className="text-lg font-semibold text-slate-900">Pharmacies</h2>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {pharmacies.map((pharmacy) => (
                  <article key={pharmacy.id_pharmacie} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{pharmacy.nom_pharmacie}</p>
                        <p className="text-sm text-slate-500">{pharmacy.type_label || "Pharmacie"}</p>
                      </div>
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">Pharmacie</span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <p className="flex items-start gap-2">
                        <MapPin size={15} className="mt-0.5 shrink-0" />
                        <span>{[pharmacy.address_line, pharmacy.city].filter(Boolean).join(", ") || "Adresse non renseignee"}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone size={15} />
                        <span>{pharmacy.telephone || "Telephone non renseigne"}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail size={15} />
                        <span>{pharmacy.email || "Email non renseigne"}</span>
                      </p>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Responsable</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">{pharmacy.president_pharmacie || "Non renseigne"}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {pendingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirmer la reservation</h3>
            <p className="mt-2 text-sm text-slate-600">
              Dr. {pendingBooking.doctorName} ({pendingBooking.specialty})
            </p>
            <p className="mt-1 text-sm font-semibold text-cyan-700">{toHumanDateTime(pendingBooking.slotAt)}</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingBooking(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmBooking}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverDoctorsPage;

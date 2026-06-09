import { useEffect, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
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

const formatDoctorLabel = (ordonnance) => {
  const doctorName = [ordonnance.doctor_prenom, ordonnance.doctor_nom].filter(Boolean).join(" ").trim();
  if (!doctorName) return "Medecin supprime ou non renseigne";

  const specialty = String(ordonnance.doctor_specialty || "").trim();
  return specialty ? `Dr. ${doctorName} (${specialty})` : `Dr. ${doctorName}`;
};

const PatientOrdonnancesPage = () => {
  const [ordonnances, setOrdonnances] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOrdonnances = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/patient-portal/ordonnances");
      const list = Array.isArray(response.data?.ordonnances) ? response.data.ordonnances : [];
      setOrdonnances(list);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les ordonnances");
      setOrdonnances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdonnances();
  }, []);

  const filteredOrdonnances = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return ordonnances;
    return ordonnances.filter((item) => {
      const haystack = `${item.status || ""} ${item.ordonnance || ""} ${item.doctor_prenom || ""} ${
        item.doctor_nom || ""
      }`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [ordonnances, search]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold">Mes ordonnances</h1>
        <p className="mt-1 text-sm text-cyan-100">Consultez votre historique medical prescrit.</p>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher dans vos ordonnances"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Historique ({filteredOrdonnances.length})</h2>
        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Chargement...
          </div>
        ) : filteredOrdonnances.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            <FileText className="mx-auto mb-2" size={22} />
            Aucune ordonnance trouvee.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrdonnances.map((ordonnance) => (
              <article key={ordonnance.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">Ordonnance #{ordonnance.id}</p>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                    {ordonnance.status || "En attente"}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500">{formatDoctorLabel(ordonnance)}</p>
                <p className="text-xs text-slate-500">{toHumanDateTime(ordonnance.created_at)}</p>

                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {ordonnance.ordonnance}
                </pre>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PatientOrdonnancesPage;

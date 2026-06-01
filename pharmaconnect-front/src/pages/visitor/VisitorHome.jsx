import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Mail, MapPin, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import HomeInfoSection from "../../components/visitor/HomeInfoSection";
import ResultCard from "../../components/visitor/ResultCard";
import SearchBar from "../../components/visitor/SearchBar";
import VisitorNavbar from "../../components/visitor/VisitorNavbar";
import EmptyState from "../../components/modules/EmptyState";
import LoadingState from "../../components/modules/LoadingState";
import api from "../../lib/api";

const normalizeDoctorResult = (doctor) => ({
  id: `doctor-${doctor.doctor_id}`,
  entityType: "doctor",
  typeLabel: "Medecin",
  name: `Dr. ${doctor.display_name || `${doctor.prenom || ""} ${doctor.nom || ""}`.trim()}`.trim(),
  subtitle: doctor.specialty || "Specialite non renseignee",
  address: [doctor.address_line, doctor.city].filter(Boolean).join(", ") || "Adresse non renseignee",
  phone: doctor.public_phone || "Telephone non renseigne",
  meta: doctor.online_booking_enabled ? "Disponibilites en ligne visibles" : "Consultation sur demande",
  badge: doctor.distance_km !== null ? `${doctor.distance_km} km` : null,
  raw: doctor,
});

const normalizePharmacyResult = (pharmacy) => ({
  id: `pharmacy-${pharmacy.id_pharmacie}`,
  entityType: "pharmacy",
  typeLabel: "Pharmacie",
  name: pharmacy.nom_pharmacie,
  subtitle: pharmacy.type_label || "Pharmacie",
  address: [pharmacy.address_line, pharmacy.city].filter(Boolean).join(", ") || "Adresse non renseignee",
  phone: pharmacy.telephone || "Telephone non renseigne",
  meta: pharmacy.email || "Coordonnees publiques",
  badge: null,
  raw: pharmacy,
});

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildSearchSummary = ({ query, city, specialty, scope }) => {
  const parts = [];
  const trimmedQuery = String(query || "").trim();
  const trimmedCity = String(city || "").trim();
  const trimmedSpecialty = String(specialty || "").trim();

  if (trimmedQuery) {
    parts.push(trimmedQuery);
  }
  if (trimmedCity) {
    parts.push(`Ville: ${trimmedCity}`);
  }
  if (trimmedSpecialty && scope !== "pharmacy") {
    parts.push(`Specialite: ${trimmedSpecialty}`);
  }

  return parts.join(" | ");
};

const VisitorHome = ({ initialScope = "all" }) => {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [scope, setScope] = useState(initialScope);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearch, setLastSearch] = useState("");
  const [doctorResults, setDoctorResults] = useState([]);
  const [pharmacyResults, setPharmacyResults] = useState([]);

  const combinedResults = useMemo(() => {
    const merged = [];
    if (scope !== "pharmacy") {
      merged.push(...doctorResults.map(normalizeDoctorResult));
    }
    if (scope !== "doctor") {
      merged.push(...pharmacyResults.map(normalizePharmacyResult));
    }
    return merged;
  }, [doctorResults, pharmacyResults, scope]);

  const runSearch = async ({ nextQuery = query, nextCity = city, nextSpecialty = specialty, nextScope = scope } = {}) => {
    setLoading(true);
    setError("");
    setHasSearched(true);
    setSelectedResult(null);

    const trimmedQuery = String(nextQuery || "").trim();
    const trimmedCity = String(nextCity || "").trim();
    const trimmedSpecialty = String(nextSpecialty || "").trim();
    setLastSearch(
      buildSearchSummary({
        query: trimmedQuery,
        city: trimmedCity,
        specialty: trimmedSpecialty,
        scope: nextScope,
      }),
    );

    try {
      const shouldLoadDoctors = nextScope !== "pharmacy";
      const shouldLoadPharmacies = nextScope !== "doctor";

      const [doctorsResponse, pharmaciesResponse] = await Promise.all([
        shouldLoadDoctors
          ? api.get("/patient-portal/doctors", {
              params: {
                query: trimmedQuery || undefined,
                city: trimmedCity || undefined,
                specialty: trimmedSpecialty || undefined,
                limit: 10,
              },
            })
          : Promise.resolve({ data: { doctors: [] } }),
        shouldLoadPharmacies
          ? api.get("/pharmacy/public-search", {
              params: {
                query: trimmedQuery || undefined,
                city: trimmedCity || undefined,
                limit: 10,
              },
            })
          : Promise.resolve({ data: { pharmacies: [] } }),
      ]);

      setDoctorResults(Array.isArray(doctorsResponse.data?.doctors) ? doctorsResponse.data.doctors : []);
      setPharmacyResults(Array.isArray(pharmaciesResponse.data?.pharmacies) ? pharmaciesResponse.data.pharmacies : []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les resultats publics");
      setDoctorResults([]);
      setPharmacyResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (nextScope) => {
    setScope(nextScope);
    if (hasSearched) {
      runSearch({ nextScope, nextQuery: query, nextCity: city, nextSpecialty: specialty });
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <VisitorNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.22),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_38%,#f0fdfa_100%)] p-6 shadow-2xl shadow-cyan-950/10 sm:p-8 lg:p-12">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-teal-200/35 blur-3xl" />

          <div className="relative max-w-3xl">
            <p className="inline-flex rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-800">
              Acces public
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              {hasSearched ? "Resultats de votre recherche" : "Recherche de medecins et de pharmacies"}
            </h1>

            {!hasSearched ? (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Inscription
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/login"
                  className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-800"
                >
                  Connexion
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Seuls les resultats trouves sont affiches.</p>
            )}
          </div>

          <div className={`relative ${hasSearched ? "mt-8" : "mt-10"}`}>
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              city={city}
              onCityChange={setCity}
              specialty={specialty}
              onSpecialtyChange={setSpecialty}
              scope={scope}
              onScopeChange={handleScopeChange}
              onSubmit={() => runSearch()}
              isLoading={loading}
            />
          </div>
        </section>

        {!hasSearched ? (
          <div className="mt-8">
            <HomeInfoSection />
          </div>
        ) : null}

        {hasSearched ? (
          <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/80 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Resultats publics</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                {lastSearch ? `Resultats: "${lastSearch}"` : "Resultats"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">Consultation publique uniquement.</p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {combinedResults.length} resultat(s)
            </span>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="mt-8">
            {loading ? (
              <LoadingState message="Chargement..." />
            ) : combinedResults.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Aucun resultat"
                description="Aucun profil ne correspond a cette recherche."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {combinedResults.map((result) => (
                  <ResultCard key={result.id} result={result} onViewDetails={setSelectedResult} />
                ))}
              </div>
            )}
          </div>
          </section>
        ) : null}
      </main>

      {selectedResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-700">{selectedResult.typeLabel}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedResult.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedResult.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedResult(null)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-6 sm:px-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Adresse</p>
                  <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                    <MapPin className="mt-0.5 shrink-0 text-cyan-700" size={16} />
                    <span>{selectedResult.address}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Telephone</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{selectedResult.phone}</p>
                </div>
              </div>

              {selectedResult.entityType === "doctor" ? (
                <>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Biographie</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {selectedResult.raw.bio || "Aucune biographie publique n'a encore ete partagee pour ce medecin."}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Disponibilites visibles</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedResult.raw.available_slots || []).slice(0, 6).map((slot) => (
                        <span
                          key={slot}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          <Clock3 size={14} className="text-cyan-700" />
                          {formatDateTime(slot)}
                        </span>
                      ))}
                      {(!selectedResult.raw.available_slots || selectedResult.raw.available_slots.length === 0) && (
                        <span className="text-sm text-slate-500">Aucun creneau public affiche actuellement.</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
                    La prise de rendez-vous necessite un compte patient.
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Responsable</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedResult.raw.president_pharmacie || "Responsable non renseigne"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Email public</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      <Mail size={15} className="text-cyan-700" />
                      <span>{selectedResult.raw.email || "Email non renseigne"}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Les fonctions pharmacien necessitent une connexion.
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <Link
                  to={selectedResult.entityType === "doctor" ? "/login?mode=register" : "/login"}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {selectedResult.entityType === "doctor" ? "Inscription" : "Connexion"}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VisitorHome;

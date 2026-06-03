import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Mail, MapPin, SearchX, X } from "lucide-react";
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
  typeLabel: "Médecin",
  name: `Dr. ${doctor.display_name || `${doctor.prenom || ""} ${doctor.nom || ""}`.trim()}`.trim(),
  subtitle: doctor.specialty || "Spécialité non renseignée",
  address: [doctor.address_line, doctor.city].filter(Boolean).join(", ") || "Adresse non renseignée",
  phone: doctor.public_phone || "Téléphone non renseigné",
  meta: doctor.online_booking_enabled ? "Disponibilités en ligne visibles" : "Consultation sur demande",
  badge: doctor.distance_km !== null ? `${doctor.distance_km} km` : null,
  raw: doctor,
});

const normalizePharmacyResult = (pharmacy) => ({
  id: `pharmacy-${pharmacy.id_pharmacie}`,
  entityType: "pharmacy",
  typeLabel: "Pharmacie",
  name: pharmacy.nom_pharmacie,
  subtitle: pharmacy.type_label || "Pharmacie",
  address: [pharmacy.address_line, pharmacy.city].filter(Boolean).join(", ") || "Adresse non renseignée",
  phone: pharmacy.telephone || "Téléphone non renseigné",
  meta: pharmacy.email || "Coordonnées publiques",
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

  if (trimmedQuery) parts.push(trimmedQuery);
  if (trimmedCity) parts.push(`Ville: ${trimmedCity}`);
  if (trimmedSpecialty && scope !== "pharmacy") parts.push(`Spécialité: ${trimmedSpecialty}`);

  return parts.join(" · ");
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
    if (scope !== "pharmacy") merged.push(...doctorResults.map(normalizeDoctorResult));
    if (scope !== "doctor") merged.push(...pharmacyResults.map(normalizePharmacyResult));
    return merged;
  }, [doctorResults, pharmacyResults, scope]);

  const runSearch = async ({
    nextQuery = query,
    nextCity = city,
    nextSpecialty = specialty,
    nextScope = scope,
  } = {}) => {
    setLoading(true);
    setError("");
    setHasSearched(true);
    setSelectedResult(null);

    const trimmedQuery = String(nextQuery || "").trim();
    const trimmedCity = String(nextCity || "").trim();
    const trimmedSpecialty = String(nextSpecialty || "").trim();
    setLastSearch(buildSearchSummary({ query: trimmedQuery, city: trimmedCity, specialty: trimmedSpecialty, scope: nextScope }));

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
                include_availability: 1,
              },
            })
          : Promise.resolve({ data: { doctors: [] } }),
        shouldLoadPharmacies
          ? api.get("/pharmacy/public-search", {
              params: { query: trimmedQuery || undefined, city: trimmedCity || undefined, limit: 10 },
            })
          : Promise.resolve({ data: { pharmacies: [] } }),
      ]);

      setDoctorResults(Array.isArray(doctorsResponse.data?.doctors) ? doctorsResponse.data.doctors : []);
      setPharmacyResults(Array.isArray(pharmaciesResponse.data?.pharmacies) ? pharmaciesResponse.data.pharmacies : []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les résultats publics");
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
    <div className="min-h-screen bg-page font-sans">
      <VisitorNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

        {/* Hero section */}
        <section className="relative overflow-hidden rounded-card border border-primary/10 bg-primary px-6 py-10 shadow-card sm:px-8 lg:px-12 lg:py-14">
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-medical-success animate-pulse" />
              Accès public
            </span>
            <h1 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {hasSearched
                ? "Résultats de votre recherche"
                : "Trouvez votre médecin ou votre pharmacie"}
            </h1>

            {!hasSearched ? (
              <>
                <p className="mt-3 text-sm text-white/65 leading-relaxed max-w-xl">
                  Recherchez parmi les professionnels de santé disponibles en ligne — médecins, spécialistes et pharmacies partout en Tunisie.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    to="/login?mode=register"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
                  >
                    Créer un compte patient
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                  >
                    Connexion
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/60">Seuls les profils publics sont affichés.</p>
            )}
          </div>

          {/* Search bar */}
          <div className="relative mt-8">
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

        {/* Info section — shown before first search */}
        {!hasSearched && <HomeInfoSection />}

        {/* Results section */}
        {hasSearched && (
          <section className="bg-card rounded-card border border-border shadow-card p-5 sm:p-7">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-accent">Résultats publics</p>
                <h2 className="mt-1.5 text-xl font-semibold text-text-primary">
                  {lastSearch ? `"${lastSearch}"` : "Résultats"}
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">Consultation publique uniquement.</p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-text-secondary">
                {combinedResults.length} résultat(s)
              </span>
            </div>

            {error ? (
              <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
                {error}
              </div>
            ) : null}

            {loading ? (
              <LoadingState message="Chargement des résultats..." />
            ) : combinedResults.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Aucun résultat"
                description="Aucun profil ne correspond à cette recherche. Essayez d'autres critères."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {combinedResults.map((result) => (
                  <ResultCard key={result.id} result={result} onViewDetails={setSelectedResult} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Detail modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-card border border-border bg-card shadow-card-hover">

            {/* Modal header */}
            <div className="border-b border-border bg-primary px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
                    {selectedResult.typeLabel}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{selectedResult.name}</h3>
                  <p className="mt-0.5 text-sm text-white/65">{selectedResult.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedResult(null)}
                  className="rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 transition-colors flex-shrink-0"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="max-h-[70vh] overflow-y-auto space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 border border-border p-4">
                  <p className="text-[10px] uppercase tracking-wide text-text-secondary">Adresse</p>
                  <p className="mt-1.5 flex items-start gap-2 text-sm text-text-primary">
                    <MapPin className="mt-0.5 shrink-0 text-text-muted" size={14} />
                    <span>{selectedResult.address}</span>
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-border p-4">
                  <p className="text-[10px] uppercase tracking-wide text-text-secondary">Téléphone</p>
                  <p className="mt-1.5 text-sm font-medium text-text-primary">{selectedResult.phone}</p>
                </div>
              </div>

              {selectedResult.entityType === "doctor" ? (
                <>
                  <div className="rounded-lg bg-gray-50 border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary">Biographie</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      {selectedResult.raw.bio ||
                        "Aucune biographie publique n'a encore été partagée pour ce médecin."}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary mb-2">
                      Disponibilités visibles
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedResult.raw.available_slots || []).slice(0, 6).map((slot) => (
                        <span
                          key={slot}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 text-xs font-medium text-text-primary"
                        >
                          <Clock3 size={12} className="text-accent" />
                          {formatDateTime(slot)}
                        </span>
                      ))}
                      {(!selectedResult.raw.available_slots ||
                        selectedResult.raw.available_slots.length === 0) && (
                        <span className="text-sm text-text-secondary">
                          Aucun créneau public affiché actuellement.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-card border-l-4 border-accent bg-accent-light px-4 py-3 text-sm text-accent">
                    La prise de rendez-vous nécessite un compte patient.
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-gray-50 border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary">Responsable</p>
                    <p className="mt-1.5 text-sm text-text-primary">
                      {selectedResult.raw.president_pharmacie || "Responsable non renseigné"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary">Email public</p>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-text-primary">
                      <Mail size={13} className="text-text-muted" />
                      <span>{selectedResult.raw.email || "Email non renseigné"}</span>
                    </p>
                  </div>

                  <div className="rounded-card border-l-4 border-border bg-gray-50 px-4 py-3 text-sm text-text-secondary">
                    Les fonctions pharmacien nécessitent une connexion.
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedResult(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                <Link
                  to={selectedResult.entityType === "doctor" ? "/login?mode=register" : "/login"}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  {selectedResult.entityType === "doctor" ? "Créer un compte" : "Connexion"}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorHome;

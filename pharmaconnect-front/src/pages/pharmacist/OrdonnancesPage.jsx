import { useState } from "react";
import { CalendarDays, CreditCard, Eye, FileSearch, FileText, Search, UserRound } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/modules/EmptyState";
import InlineAlert from "../../components/modules/InlineAlert";
import LoadingState from "../../components/modules/LoadingState";
import ModalPanel from "../../components/modules/ModalPanel";
import ModuleHero from "../../components/modules/ModuleHero";
import { formatDate, formatDateTime, getErrorMessage, inputClassName, textareaClassName } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const SEARCH_MODE = {
  cin: "cin",
  identity: "identity",
};

export default function OrdonnancesPage() {
  const [searchMode, setSearchMode] = useState(SEARCH_MODE.cin);
  const [searchForm, setSearchForm] = useState({
    cin: "",
    nom: "",
    prenom: "",
    date_naissance: "",
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSearchForm((current) => ({ ...current, [name]: value }));
  };

  const resetSearch = () => {
    setSearchForm({ cin: "", nom: "", prenom: "", date_naissance: "" });
    setResults([]);
    setHasSearched(false);
    setError("");
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const params =
        searchMode === SEARCH_MODE.cin
          ? { cin: searchForm.cin.trim() }
          : {
              nom: searchForm.nom.trim(),
              prenom: searchForm.prenom.trim(),
              date_naissance: searchForm.date_naissance,
            };

      if (searchMode === SEARCH_MODE.cin && !params.cin) {
        throw new Error("Saisissez le CIN du patient.");
      }

      if (searchMode === SEARCH_MODE.identity && (!params.nom || !params.prenom || !params.date_naissance)) {
        throw new Error("Renseignez le nom, le prenom et la date de naissance.");
      }

      const response = await api.get("/ordonnances", { params });
      setResults(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Recherche impossible pour le moment."));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openOrdonnance = async (ordonnanceId) => {
    setDetailLoading(true);
    setOpeningId(ordonnanceId);
    setError("");

    try {
      const response = await api.get(`/ordonnances/${ordonnanceId}`);
      setSelectedOrdonnance(response.data || null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Impossible de charger cette ordonnance."));
    } finally {
      setDetailLoading(false);
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Consultation ciblée des ordonnances"
        description="Recherchez une ordonnance par CIN ou par identite patient."
      />

      <InlineAlert message={error} type="error" />

      {/* Search card */}
      <Card>
        <CardHeader>
          <CardTitle>Rechercher une ordonnance</CardTitle>
          <p className="mt-0.5 text-xs text-text-secondary">Choisissez le mode de recherche adapte au document presente par le patient.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { key: SEARCH_MODE.cin,      label: "Recherche par CIN" },
              { key: SEARCH_MODE.identity, label: "Recherche par identite" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSearchMode(key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  searchMode === key
                    ? "bg-primary text-white"
                    : "border border-border bg-card text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            {searchMode === SEARCH_MODE.cin ? (
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">CIN du patient</span>
                <input name="cin" value={searchForm.cin} onChange={handleChange} placeholder="Ex. 01234567" className={inputClassName} />
              </label>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Nom</span>
                  <input name="nom" value={searchForm.nom} onChange={handleChange} placeholder="Nom du patient" className={inputClassName} />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Prenom</span>
                  <input name="prenom" value={searchForm.prenom} onChange={handleChange} placeholder="Prenom du patient" className={inputClassName} />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Date de naissance</span>
                  <input name="date_naissance" type="date" value={searchForm.date_naissance} onChange={handleChange} className={inputClassName} />
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" leftIcon={<Search size={15} />} isLoading={loading}>Lancer la recherche</Button>
              <Button type="button" variant="outline" onClick={resetSearch}>Reinitialiser</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Resultats de recherche</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">Les ordonnances trouvees apparaissent uniquement apres validation de la recherche.</p>
          </div>
          {hasSearched ? (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {results.length} resultat(s)
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Recherche des ordonnances en cours..." />
          ) : !hasSearched ? (
            <EmptyState icon={FileSearch} title="Aucune recherche lancee" description="Renseignez les informations patient puis lancez la recherche pour afficher une ordonnance." />
          ) : results.length === 0 ? (
            <EmptyState icon={FileText} title="Aucune ordonnance trouvee" description="Verifiez les informations saisies ou demandez un justificatif complementaire au patient." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {results.map((ordonnance) => (
                <article key={ordonnance.id} className="bg-card rounded-card border border-border shadow-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {ordonnance.nom} {ordonnance.prenom}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">Ordonnance No {ordonnance.id}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" leftIcon={<Eye size={13} />} isLoading={detailLoading && openingId === ordonnance.id} onClick={() => openOrdonnance(ordonnance.id)}>
                      Voir
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        <CreditCard size={11} />CIN
                      </p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{ordonnance.cin || "Non renseigne"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        <CalendarDays size={11} />Date de creation
                      </p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{formatDateTime(ordonnance.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                      <UserRound size={11} />Medecin
                    </p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{ordonnance.doctor_name?.trim() || "Medecin non renseigne"}</p>
                    <p className="text-xs text-text-secondary">{ordonnance.doctor_specialty || "Specialite non renseignee"}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalPanel
        open={Boolean(selectedOrdonnance)}
        title={selectedOrdonnance ? `Ordonnance No ${selectedOrdonnance.id}` : "Ordonnance"}
        subtitle={selectedOrdonnance ? `${selectedOrdonnance.nom} ${selectedOrdonnance.prenom}` : ""}
        onClose={() => setSelectedOrdonnance(null)}
      >
        {selectedOrdonnance ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 border border-border px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Patient</p>
                <p className="mt-1.5 text-sm font-medium text-text-primary">
                  {selectedOrdonnance.nom} {selectedOrdonnance.prenom}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">CIN: {selectedOrdonnance.cin || "Non renseigne"}</p>
                <p className="mt-0.5 text-xs text-text-secondary">Date de naissance: {formatDate(selectedOrdonnance.patient_date_naissance)}</p>
              </div>

              <div className="rounded-lg bg-gray-50 border border-border px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Medecin</p>
                <p className="mt-1.5 text-sm font-medium text-text-primary">{selectedOrdonnance.doctor_name?.trim() || "Non renseigne"}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{selectedOrdonnance.doctor_specialty || "Specialite non renseignee"}</p>
                <p className="mt-0.5 text-xs text-text-secondary">Creee le {formatDateTime(selectedOrdonnance.created_at)}</p>
              </div>
            </div>

            <div className="rounded-card border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs font-semibold text-text-primary">Contenu de l'ordonnance</p>
              </div>
              <div className="px-4 py-4">
                <textarea readOnly value={selectedOrdonnance.ordonnance || ""} className={`${textareaClassName} border-0 bg-gray-50 focus:border-0 focus:ring-0 cursor-default`} />
              </div>
            </div>
          </div>
        ) : null}
      </ModalPanel>
    </div>
  );
}

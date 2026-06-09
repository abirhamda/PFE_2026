import { useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Eye,
  FileSearch,
  FileText,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/modules/EmptyState";
import InlineAlert from "../../components/modules/InlineAlert";
import LoadingState from "../../components/modules/LoadingState";
import ModalPanel from "../../components/modules/ModalPanel";
import ModuleHero from "../../components/modules/ModuleHero";
import {
  formatDate,
  formatDateTime,
  getErrorMessage,
  inputClassName,
  textareaClassName,
} from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const MODE = { cin: "cin", identity: "identity" };

export default function OrdonnancesPage() {
  const [searchMode, setSearchMode]         = useState(MODE.cin);
  const [searchForm, setSearchForm]         = useState({ cin: "", nom: "", prenom: "", date_naissance: "" });
  const [results, setResults]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [hasSearched, setHasSearched]       = useState(false);
  const [error, setError]                   = useState("");
  const [openingId, setOpeningId]           = useState(null);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchForm((p) => ({ ...p, [name]: value }));
  };

  const resetSearch = () => {
    setSearchForm({ cin: "", nom: "", prenom: "", date_naissance: "" });
    setResults([]);
    setHasSearched(false);
    setError("");
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const params =
        searchMode === MODE.cin
          ? { cin: searchForm.cin.trim() }
          : {
              nom:            searchForm.nom.trim(),
              prenom:         searchForm.prenom.trim(),
              date_naissance: searchForm.date_naissance,
            };

      if (searchMode === MODE.cin && !params.cin) throw new Error("Saisissez le CIN du patient.");
      if (searchMode === MODE.identity && (!params.nom || !params.prenom || !params.date_naissance))
        throw new Error("Renseignez le nom, le prénom et la date de naissance.");

      const res = await api.get("/ordonnances", { params });
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Recherche impossible pour le moment."));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openOrdonnance = async (id) => {
    setOpeningId(id);
    setError("");
    try {
      const res = await api.get(`/ordonnances/${id}`);
      setSelectedOrdonnance(res.data || null);
    } catch (err) {
      setError(getErrorMessage(err, "Impossible de charger cette ordonnance."));
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Consultation des ordonnances"
        description="Recherchez une ordonnance par CIN ou par identité patient pour délivrer les médicaments prescrits."
      />

      <InlineAlert message={error} type="error" />

      {/* ── Search card ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Rechercher une ordonnance</CardTitle>
          <p className="mt-0.5 text-xs text-text-secondary">Choisissez le mode de recherche adapté au document présenté par le patient.</p>
        </CardHeader>
        <CardContent>
          {/* Mode tabs */}
          <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-4">
            {[
              { key: MODE.cin,      label: "Par CIN",      icon: CreditCard },
              { key: MODE.identity, label: "Par identité", icon: UserRound  },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSearchMode(key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  searchMode === key
                    ? "bg-primary text-white"
                    : "border border-border bg-card text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            {searchMode === MODE.cin ? (
              <label className="space-y-1.5">
                <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">CIN du patient</span>
                <input
                  name="cin"
                  value={searchForm.cin}
                  onChange={handleChange}
                  placeholder="Ex. 01234567"
                  className={`${inputClassName} max-w-xs`}
                />
              </label>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Nom</span>
                  <input name="nom" value={searchForm.nom} onChange={handleChange} placeholder="Nom du patient" className={`${inputClassName} max-w-xs`} />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Prénom</span>
                  <input name="prenom" value={searchForm.prenom} onChange={handleChange} placeholder="Prénom" className={inputClassName} />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Date de naissance</span>
                  <input name="date_naissance" type="date" value={searchForm.date_naissance} onChange={handleChange} className={inputClassName} />
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" leftIcon={<Search size={15} />} isLoading={loading}>
                Rechercher
              </Button>
              <Button type="button" variant="outline" onClick={resetSearch}>
                Réinitialiser
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Results card ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Résultats</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">Les ordonnances s'affichent après validation de la recherche.</p>
          </div>
          {hasSearched ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {results.length} résultat{results.length !== 1 ? "s" : ""}
            </span>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingState message="Recherche des ordonnances en cours..." />
            </div>
          ) : !hasSearched ? (
            <div className="p-6">
              <EmptyState
                icon={FileSearch}
                title="Aucune recherche lancée"
                description="Renseignez les informations patient puis lancez la recherche."
              />
            </div>
          ) : results.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="Aucune ordonnance trouvée"
                description="Vérifiez les informations saisies ou demandez un justificatif complémentaire."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">N°</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Patient</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">CIN</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Médecin</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Date</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary text-right">Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((ord) => (
                    <tr key={ord.id} className="transition-colors hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">#{ord.id}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {ord.nom} {ord.prenom}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{ord.cin || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="text-text-primary">{ord.doctor_name?.trim() || "Non renseigné"}</p>
                        <p className="text-xs text-text-muted">{ord.doctor_specialty || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                        {formatDateTime(ord.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          leftIcon={<Eye size={13} />}
                          isLoading={openingId === ord.id}
                          onClick={() => openOrdonnance(ord.id)}
                        >
                          Voir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Ordonnance detail modal ───────────────────────────── */}
      <ModalPanel
        open={Boolean(selectedOrdonnance)}
        title={selectedOrdonnance ? `Ordonnance N° ${selectedOrdonnance.id}` : "Ordonnance"}
        subtitle={selectedOrdonnance ? `${selectedOrdonnance.nom} ${selectedOrdonnance.prenom}` : ""}
        onClose={() => setSelectedOrdonnance(null)}
      >
        {selectedOrdonnance ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Patient */}
              <div className="rounded-xl border border-border bg-gray-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                  <UserRound size={12} /> Patient
                </p>
                <p className="mt-1.5 text-sm font-semibold text-text-primary">
                  {selectedOrdonnance.nom} {selectedOrdonnance.prenom}
                </p>
                <div className="mt-1.5 space-y-0.5 text-xs text-text-secondary">
                  <p className="flex items-center gap-1"><CreditCard size={11} /> CIN : {selectedOrdonnance.cin || "Non renseigné"}</p>
                  <p className="flex items-center gap-1"><CalendarDays size={11} /> Né(e) le : {formatDate(selectedOrdonnance.patient_date_naissance)}</p>
                </div>
              </div>

              {/* Doctor */}
              <div className="rounded-xl border border-border bg-gray-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                  <Stethoscope size={12} /> Médecin prescripteur
                </p>
                <p className="mt-1.5 text-sm font-semibold text-text-primary">
                  {selectedOrdonnance.doctor_name?.trim() || "Non renseigné"}
                </p>
                <div className="mt-1.5 space-y-0.5 text-xs text-text-secondary">
                  <p>{selectedOrdonnance.doctor_specialty || "Spécialité non renseignée"}</p>
                  <p className="flex items-center gap-1"><CalendarDays size={11} /> Créée le {formatDateTime(selectedOrdonnance.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border bg-gray-50 px-4 py-2.5">
                <FileText size={14} className="text-text-muted" />
                <p className="text-xs font-semibold text-text-primary">Contenu de l'ordonnance</p>
              </div>
              <div className="px-4 py-4">
                <textarea
                  readOnly
                  value={selectedOrdonnance.ordonnance || ""}
                  rows={8}
                  className={`${textareaClassName} cursor-default border-0 bg-white focus:border-0 focus:ring-0`}
                />
              </div>
            </div>
          </div>
        ) : null}
      </ModalPanel>
    </div>
  );
}

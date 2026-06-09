import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Building2, Mail, Phone, Search, Send, Store, UserRound } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/modules/EmptyState";
import InlineAlert from "../../components/modules/InlineAlert";
import LoadingState from "../../components/modules/LoadingState";
import MetricCard from "../../components/modules/MetricCard";
import ModalPanel from "../../components/modules/ModalPanel";
import ModuleHero from "../../components/modules/ModuleHero";
import StatusPill from "../../components/modules/StatusPill";
import { getErrorMessage, inputClassName, textareaClassName } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const FILTERS = [
  ["all",        "Tous"],
  ["partenaire", "Partenaires"],
  ["en_attente", "En attente"],
  ["refusee",    "Refusés"],
  ["disponible", "Disponibles"],
];

const PARTNERSHIP_STATUS_STYLE = {
  partenaire:  "bg-emerald-100 text-emerald-700",
  en_attente:  "bg-amber-100 text-amber-700",
  refusee:     "bg-red-100 text-red-700",
  disponible:  "bg-gray-100 text-gray-600",
  disponible_supplier: "bg-gray-100 text-gray-600",
};

const PARTNERSHIP_STATUS_LABEL = {
  partenaire:  "Partenaire",
  en_attente:  "En attente",
  refusee:     "Refusé",
  disponible:  "Disponible",
  disponible_supplier: "Disponible",
};

export default function PharmacistSupplierPage() {
  const [items, setItems]               = useState([]);
  const [stats, setStats]               = useState({});
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState("");
  const deferredSearch                  = useDeferredValue(searchTerm);
  const [activeFilter, setActiveFilter] = useState("all");
  const [notice, setNotice]             = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [message, setMessage]           = useState("");
  const [submitting, setSubmitting]     = useState(false);

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/partnerships/directory", {
        params: deferredSearch.trim() ? { search: deferredSearch.trim() } : undefined,
      });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setStats(res.data?.stats || {});
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Impossible de charger l'annuaire fournisseur.") });
      setItems([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDirectory(); }, [deferredSearch]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.partnership_status === activeFilter);
  }, [activeFilter, items]);

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setSubmitting(true);
    try {
      await api.post("/partnerships/requests", {
        supplier_id: selectedSupplier.id,
        message: message.trim(),
      });
      setNotice({ type: "success", message: "Demande de partenariat envoyée avec succès." });
      setSelectedSupplier(null);
      setMessage("");
      await loadDirectory();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Envoi de la demande impossible.") });
    } finally {
      setSubmitting(false);
    }
  };

  const canRequest = (s) => s.partnership_status === "disponible" || s.partnership_status === "refusee";

  const pillStatus = (s) =>
    s.partnership_status === "disponible" ? "disponible_supplier" : s.partnership_status;

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Annuaire fournisseurs"
        description="Consultez les fournisseurs disponibles, visualisez leur profil et gérez vos demandes de partenariat."
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      {/* ── Metrics ───────────────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Fournisseurs" value={stats.total      || 0} helper="Annuaire disponible"                      tone="cyan" />
        <MetricCard icon={Store}     label="Partenaires"  value={stats.partenaires || 0} helper="Relations actives"                       tone="emerald" />
        <MetricCard icon={Send}      label="En attente"   value={stats.en_attente  || 0} helper="Demandes en cours"                      tone="amber" />
        <MetricCard icon={UserRound} label="Refusées"     value={stats.refuses     || 0} helper="Demandes à relancer"                    tone="rose" />
      </section>

      {/* ── Table card ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Réseau fournisseur</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">Vos partenaires sont affichés en priorité.</p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un fournisseur..."
                className={`${inputClassName} pl-9`}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeFilter === value
                      ? "bg-primary text-white"
                      : "border border-border bg-card text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingState message="Chargement des fournisseurs..." />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Building2}
                title="Aucun fournisseur à afficher"
                description={searchTerm ? "Aucun fournisseur ne correspond à cette recherche." : "Le répertoire fournisseur est vide pour le moment."}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Fournisseur</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Email</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Téléphone</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Relation</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((supplier) => {
                    const name = [supplier.prenom, supplier.nom].filter(Boolean).join(" ") || "Fournisseur";
                    const status = pillStatus(supplier);
                    return (
                      <tr key={supplier.id} className="transition-colors hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary">{name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-text-secondary">
                            <Mail size={12} className="flex-shrink-0 text-text-muted" />
                            {supplier.email || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-text-secondary">
                            <Phone size={12} className="flex-shrink-0 text-text-muted" />
                            {supplier.telephone || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PARTNERSHIP_STATUS_STYLE[status] || "bg-gray-100 text-gray-600"}`}>
                            {PARTNERSHIP_STATUS_LABEL[status] || status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSupplier(supplier)}
                            >
                              Voir
                            </Button>
                            {canRequest(supplier) ? (
                              <Button
                                type="button"
                                size="sm"
                                leftIcon={<Send size={12} />}
                                onClick={() => setSelectedSupplier(supplier)}
                              >
                                Partenariat
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Supplier detail / partnership request modal ───────── */}
      <ModalPanel
        open={Boolean(selectedSupplier)}
        title={selectedSupplier ? [selectedSupplier.prenom, selectedSupplier.nom].filter(Boolean).join(" ") || "Profil fournisseur" : "Profil fournisseur"}
        subtitle={selectedSupplier?.email || ""}
        onClose={() => { setSelectedSupplier(null); setMessage(""); }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setSelectedSupplier(null)}>Fermer</Button>
            {selectedSupplier && canRequest(selectedSupplier) ? (
              <Button type="submit" form="partnership-form" isLoading={submitting} leftIcon={<Send size={14} />}>Envoyer la demande</Button>
            ) : null}
          </div>
        }
      >
        {selectedSupplier ? (
          <div className="space-y-4">
            {/* Contact + Relation */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Contact</p>
                <div className="mt-2 space-y-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                    <Mail size={13} className="text-text-muted" /> {selectedSupplier.email || "Non renseigné"}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Phone size={13} className="text-text-muted" /> {selectedSupplier.telephone || "Non renseigné"}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Relation</p>
                <div className="mt-2">
                  <StatusPill status={pillStatus(selectedSupplier)} />
                </div>
              </div>
            </div>

            {selectedSupplier.request_message ? (
              <div className="rounded-xl border border-border bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Dernier message envoyé</p>
                <p className="mt-1.5 text-sm text-text-secondary">{selectedSupplier.request_message}</p>
              </div>
            ) : null}

            {selectedSupplier.response_note ? (
              <div className="rounded-xl border border-border bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Retour fournisseur</p>
                <p className="mt-1.5 text-sm text-text-secondary">{selectedSupplier.response_note}</p>
              </div>
            ) : null}

            {canRequest(selectedSupplier) ? (
              <form id="partnership-form" onSubmit={submitRequest} className="space-y-3">
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Message d'introduction</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={textareaClassName}
                    placeholder="Ex. Nous souhaitons établir un partenariat pour les produits à rotation rapide."
                  />
                </label>
              </form>
            ) : null}
          </div>
        ) : null}
      </ModalPanel>
    </div>
  );
}

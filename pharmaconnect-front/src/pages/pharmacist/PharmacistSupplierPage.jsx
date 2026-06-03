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
import { formatDateTime, getErrorMessage, inputClassName, textareaClassName } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const FILTERS = [
  ["all",        "Tous"],
  ["partenaire", "Partenaires"],
  ["en_attente", "Demandes en attente"],
  ["refusee",    "Refusees"],
  ["disponible", "Disponibles"],
];

export default function PharmacistSupplierPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [activeFilter, setActiveFilter] = useState("all");
  const [notice, setNotice] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDirectory = async () => {
      setLoading(true);
      try {
        const response = await api.get("/partnerships/directory", {
          params: deferredSearchTerm.trim() ? { search: deferredSearchTerm.trim() } : undefined,
        });
        setItems(Array.isArray(response.data?.items) ? response.data.items : []);
        setStats(response.data?.stats || {});
      } catch (requestError) {
        setNotice({ type: "error", message: getErrorMessage(requestError, "Impossible de charger l'annuaire fournisseur.") });
        setItems([]);
        setStats({});
      } finally {
        setLoading(false);
      }
    };
    loadDirectory();
  }, [deferredSearchTerm]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.partnership_status === activeFilter);
  }, [activeFilter, items]);

  const submitPartnershipRequest = async (event) => {
    event.preventDefault();
    if (!selectedSupplier) return;
    setSubmitting(true);
    try {
      await api.post("/partnerships/requests", { supplier_id: selectedSupplier.id, message: message.trim() });
      setNotice({ type: "success", message: "Demande de partenariat envoyee avec succes." });
      setSelectedSupplier(null);
      setMessage("");
      const refresh = await api.get("/partnerships/directory", {
        params: deferredSearchTerm.trim() ? { search: deferredSearchTerm.trim() } : undefined,
      });
      setItems(Array.isArray(refresh.data?.items) ? refresh.data.items : []);
      setStats(refresh.data?.stats || {});
    } catch (requestError) {
      setNotice({ type: "error", message: getErrorMessage(requestError, "Envoi de la demande impossible.") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Annuaire fournisseurs et partenariats"
        description="Identifiez les fournisseurs disponibles, consultez leur profil, envoyez des demandes de partenariat et visualisez votre reseau actif."
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Fournisseurs" value={stats.total || 0}        helper="Annuaire disponible pour votre pharmacie"         tone="cyan" />
        <MetricCard icon={Store}     label="Partenaires"  value={stats.partenaires || 0}  helper="Relations actives pour vos reapprovisionnements"  tone="emerald" />
        <MetricCard icon={Send}      label="En attente"   value={stats.en_attente || 0}   helper="Demandes de partenariat en cours"                 tone="amber" />
        <MetricCard icon={UserRound} label="Refusees"     value={stats.refuses || 0}      helper="Demandes a relancer ou requalifier"               tone="rose" />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Reseau fournisseur</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">Vos partenaires sont priorises, puis les fournisseurs disponibles.</p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Rechercher un fournisseur..." className={`${inputClassName} pl-9`} />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(([value, label]) => (
                <button key={value} type="button" onClick={() => setActiveFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activeFilter === value ? "bg-primary text-white" : "border border-border bg-card text-text-secondary hover:text-text-primary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Chargement des fournisseurs..." />
          ) : filteredItems.length === 0 ? (
            <EmptyState icon={Building2} title="Aucun fournisseur a afficher" description={searchTerm ? "Aucun fournisseur ne correspond a cette recherche." : "Le repertoire fournisseur est vide pour le moment."} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredItems.map((supplier) => (
                <article key={supplier.id} className="bg-card rounded-card border border-border shadow-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {[supplier.prenom, supplier.nom].filter(Boolean).join(" ") || "Fournisseur"}
                      </h3>
                      <p className="mt-0.5 text-xs text-text-secondary">Ajoute le {formatDateTime(supplier.created_at)}</p>
                    </div>
                    <StatusPill status={supplier.partnership_status === "disponible" ? "disponible_supplier" : supplier.partnership_status} />
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary"><Mail size={11} />Email</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{supplier.email || "Non renseigne"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary"><Phone size={11} />Telephone</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{supplier.telephone || "Non renseigne"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-border px-3 py-2.5 sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Produits actifs declares</p>
                      <p className="mt-1 text-lg font-semibold text-text-primary">{supplier.active_products || 0}</p>
                    </div>
                  </div>

                  {supplier.response_note ? (
                    <div className="mt-3 rounded-lg bg-gray-50 border border-border px-3 py-2.5 text-xs text-text-secondary">{supplier.response_note}</div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedSupplier(supplier)}>Voir le profil</Button>
                    {supplier.partnership_status === "disponible" || supplier.partnership_status === "refusee" ? (
                      <Button type="button" size="sm" onClick={() => setSelectedSupplier(supplier)} leftIcon={<Send size={13} />}>Demander un partenariat</Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalPanel
        open={Boolean(selectedSupplier)}
        title={selectedSupplier ? [selectedSupplier.prenom, selectedSupplier.nom].filter(Boolean).join(" ") || "Profil fournisseur" : "Profil fournisseur"}
        subtitle={selectedSupplier?.email || ""}
        onClose={() => { setSelectedSupplier(null); setMessage(""); }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setSelectedSupplier(null)}>Fermer</Button>
            {selectedSupplier && (selectedSupplier.partnership_status === "disponible" || selectedSupplier.partnership_status === "refusee") ? (
              <Button type="submit" form="partnership-form" isLoading={submitting} leftIcon={<Send size={14} />}>Envoyer la demande</Button>
            ) : null}
          </div>
        }
      >
        {selectedSupplier ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 border border-border px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Contact</p>
                <p className="mt-1.5 text-sm font-medium text-text-primary">{selectedSupplier.email || "Email non renseigne"}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{selectedSupplier.telephone || "Telephone non renseigne"}</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-border px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Relation</p>
                <div className="mt-1.5">
                  <StatusPill status={selectedSupplier.partnership_status === "disponible" ? "disponible_supplier" : selectedSupplier.partnership_status} />
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">{selectedSupplier.active_products || 0} produit(s) actif(s)</p>
              </div>
            </div>

            {selectedSupplier.request_message ? (
              <div className="rounded-lg border border-border bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Dernier message envoye</p>
                <p className="mt-1.5 text-sm text-text-secondary">{selectedSupplier.request_message}</p>
              </div>
            ) : null}

            {selectedSupplier.response_note ? (
              <div className="rounded-lg border border-border bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Retour fournisseur</p>
                <p className="mt-1.5 text-sm text-text-secondary">{selectedSupplier.response_note}</p>
              </div>
            ) : null}

            {(selectedSupplier.partnership_status === "disponible" || selectedSupplier.partnership_status === "refusee") ? (
              <form id="partnership-form" onSubmit={submitPartnershipRequest} className="space-y-3">
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Message d'introduction</span>
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} className={textareaClassName} placeholder="Ex. Nous souhaitons etablir un partenariat durable pour les produits a rotation rapide." />
                </label>
              </form>
            ) : null}
          </div>
        ) : null}
      </ModalPanel>
    </div>
  );
}

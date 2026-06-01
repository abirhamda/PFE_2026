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
import { formatDateTime, getErrorMessage, textareaClassName } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const FILTERS = [
  ["all", "Tous"],
  ["partenaire", "Partenaires"],
  ["en_attente", "Demandes en attente"],
  ["refusee", "Refusees"],
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
        setNotice({
          type: "error",
          message: getErrorMessage(requestError, "Impossible de charger l'annuaire fournisseur."),
        });
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
      await api.post("/partnerships/requests", {
        supplier_id: selectedSupplier.id,
        message: message.trim(),
      });

      setNotice({ type: "success", message: "Demande de partenariat envoyee avec succes." });
      setSelectedSupplier(null);
      setMessage("");

      const refresh = await api.get("/partnerships/directory", {
        params: deferredSearchTerm.trim() ? { search: deferredSearchTerm.trim() } : undefined,
      });

      setItems(Array.isArray(refresh.data?.items) ? refresh.data.items : []);
      setStats(refresh.data?.stats || {});
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Envoi de la demande impossible."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Annuaire fournisseurs et partenariats"
        description="Identifiez les fournisseurs disponibles, consultez leur profil, envoyez des demandes de partenariat et visualisez votre reseau actif dans le meme langage graphique que le reste de l'application."
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Fournisseurs" value={stats.total || 0} helper="Annuaire disponible pour votre pharmacie" tone="cyan" />
        <MetricCard icon={Store} label="Partenaires" value={stats.partenaires || 0} helper="Relations actives pour vos reapprovisionnements" tone="emerald" />
        <MetricCard icon={Send} label="En attente" value={stats.en_attente || 0} helper="Demandes de partenariat en cours de reponse" tone="amber" />
        <MetricCard icon={UserRound} label="Refusees" value={stats.refuses || 0} helper="Demandes a relancer ou requalifier" tone="rose" />
      </section>

      <Card className="border-slate-200/90 bg-white/95 shadow-md">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Reseau fournisseur</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Vos partenaires sont priorises, puis les fournisseurs disponibles a l'ouverture d'un nouveau partenariat.</p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher un fournisseur..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeFilter === value
                      ? "bg-cyan-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                  }`}
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
            <EmptyState
              icon={Building2}
              title="Aucun fournisseur a afficher"
              description={searchTerm ? "Aucun fournisseur ne correspond a cette recherche." : "Le repertoire fournisseur est vide pour le moment."}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredItems.map((supplier) => (
                <article key={supplier.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {[supplier.prenom, supplier.nom].filter(Boolean).join(" ") || "Fournisseur"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">Ajoute le {formatDateTime(supplier.created_at)}</p>
                    </div>
                    <StatusPill status={supplier.partnership_status === "disponible" ? "disponible_supplier" : supplier.partnership_status} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <Mail size={14} />
                        Email
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{supplier.email || "Non renseigne"}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <Phone size={14} />
                        Telephone
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{supplier.telephone || "Non renseigne"}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Produits actifs declares</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{supplier.active_products || 0}</p>
                    </div>
                  </div>

                  {supplier.response_note ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">{supplier.response_note}</div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedSupplier(supplier)}>
                      Voir le profil
                    </Button>
                    {supplier.partnership_status === "disponible" || supplier.partnership_status === "refusee" ? (
                      <Button type="button" size="sm" onClick={() => setSelectedSupplier(supplier)} leftIcon={<Send size={15} />}>
                        Demander un partenariat
                      </Button>
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
        onClose={() => {
          setSelectedSupplier(null);
          setMessage("");
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setSelectedSupplier(null)}>
              Fermer
            </Button>
            {selectedSupplier && (selectedSupplier.partnership_status === "disponible" || selectedSupplier.partnership_status === "refusee") ? (
              <Button type="submit" form="partnership-form" isLoading={submitting} leftIcon={<Send size={16} />}>
                Envoyer la demande
              </Button>
            ) : null}
          </div>
        }
      >
        {selectedSupplier ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Contact</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedSupplier.email || "Email non renseigne"}</p>
                <p className="mt-1 text-sm text-slate-600">{selectedSupplier.telephone || "Telephone non renseigne"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Relation</p>
                <div className="mt-2">
                  <StatusPill status={selectedSupplier.partnership_status === "disponible" ? "disponible_supplier" : selectedSupplier.partnership_status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{selectedSupplier.active_products || 0} produit(s) actif(s)</p>
              </div>
            </div>

            {selectedSupplier.request_message ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dernier message envoye</p>
                <p className="mt-2 text-sm text-slate-600">{selectedSupplier.request_message}</p>
              </div>
            ) : null}

            {selectedSupplier.response_note ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Retour fournisseur</p>
                <p className="mt-2 text-sm text-slate-600">{selectedSupplier.response_note}</p>
              </div>
            ) : null}

            {(selectedSupplier.partnership_status === "disponible" || selectedSupplier.partnership_status === "refusee") ? (
              <form id="partnership-form" onSubmit={submitPartnershipRequest} className="space-y-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Message d'introduction</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className={textareaClassName}
                    placeholder="Ex. Nous souhaitons etablir un partenariat durable pour les produits a rotation rapide."
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

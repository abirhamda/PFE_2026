import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Package2,
  Send,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
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

const EMPTY_FORM = { supplier_id: "", nom_medicament: "", quantite: 1, message: "" };

const FILTERS = [
  ["all",        "Toutes"],
  ["en_attente", "En attente"],
  ["acceptee",   "Acceptées"],
  ["recue",      "Reçues"],
  ["refusee",    "Refusées"],
  ["non_livree", "Non livrées"],
];

const STATUS_ROW = {
  en_attente: "",
  acceptee:   "bg-emerald-50",
  recue:      "bg-emerald-50/40",
  refusee:    "bg-red-50",
  non_livree: "bg-red-50/60",
};

export default function PharmacyDemandesPage() {
  const [demandes, setDemandes]         = useState([]);
  const [stats, setStats]               = useState({});
  const [suppliers, setSuppliers]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [notice, setNotice]             = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalOpen, setModalOpen]       = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [updatingId, setUpdatingId]     = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);

  const loadData = async () => {
    setLoading(true);
    try {
      const [demandesRes, suppliersRes] = await Promise.all([
        api.get("/demandes/me/pharmacy"),
        api.get("/partnerships/directory"),
      ]);
      setDemandes(Array.isArray(demandesRes.data?.demandes) ? demandesRes.data.demandes : []);
      setStats(demandesRes.data?.stats || {});
      setSuppliers(Array.isArray(suppliersRes.data?.items) ? suppliersRes.data.items : []);
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Impossible de charger les demandes.") });
      setDemandes([]);
      setStats({});
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const sortedSuppliers = useMemo(
    () =>
      [...suppliers].sort((a, b) => {
        const ap = a.partnership_status === "partenaire" ? 0 : 1;
        const bp = b.partnership_status === "partenaire" ? 0 : 1;
        return ap - bp || String(a.prenom || "").localeCompare(String(b.prenom || ""));
      }),
    [suppliers],
  );

  const filteredDemandes = useMemo(() => {
    if (activeFilter === "all") return demandes;
    return demandes.filter((d) => d.status === activeFilter);
  }, [activeFilter, demandes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.post("/demandes/create", {
        supplier_id:    Number(formData.supplier_id),
        nom_medicament: formData.nom_medicament.trim(),
        quantite:       Number(formData.quantite),
        message:        formData.message.trim(),
      });
      setNotice({ type: "success", message: "Demande envoyée avec succès." });
      setModalOpen(false);
      setFormData(EMPTY_FORM);
      await loadData();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Création de la demande impossible.") });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.put(`/demandes/${id}/status`, { status });
      setNotice({ type: "success", message: status === "recue" ? "Réception confirmée." : "Statut mis à jour." });
      await loadData();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Mise à jour impossible.") });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Demandes de réapprovisionnement"
        description="Envoyez des commandes à vos fournisseurs et suivez leur traitement jusqu'à la réception."
        actions={
          <Button
            variant="outline"
            className="bg-white text-primary hover:bg-gray-50 border-white"
            leftIcon={<Send size={15} />}
            onClick={() => setModalOpen(true)}
          >
            Nouvelle demande
          </Button>
        }
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      {/* ── Metrics ───────────────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Demandes"    value={stats.total      || 0} helper="Historique des demandes émises"       tone="cyan" />
        <MetricCard icon={Store}         label="En attente"  value={stats.en_attente  || 0} helper="En cours de traitement"              tone="amber" />
        <MetricCard icon={CheckCircle2}  label="Acceptées"   value={stats.acceptees   || 0} helper="Validées côté fournisseur"           tone="emerald" />
        <MetricCard icon={XCircle}       label="Refusées"    value={stats.refusees    || 0} helper="Demandes non abouties"               tone="rose" />
      </section>

      {/* ── Table card ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Suivi des demandes</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">Confirmez la réception ou signalez une non-livraison pour les commandes acceptées.</p>
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
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingState message="Chargement des demandes..." />
            </div>
          ) : filteredDemandes.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Truck}
                title="Aucune demande à afficher"
                description={activeFilter === "all" ? "Envoyez une première demande pour démarrer le suivi." : "Aucune demande dans ce statut."}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Médicament</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Fournisseur</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary text-right">Qté</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Date</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Statut</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDemandes.map((d) => (
                    <tr
                      key={d.id}
                      className={`transition-colors hover:bg-gray-50/60 ${STATUS_ROW[d.status] || ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{d.nom_medicament}</p>
                        {d.response_note ? (
                          <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{d.response_note}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-text-primary">{d.nom_fournisseur || "—"}</p>
                        <p className="text-xs text-text-muted">{d.fournisseur_email || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-text-primary">{d.quantite}</td>
                      <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{formatDateTime(d.created_at)}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={d.status} />
                      </td>
                      <td className="px-4 py-3">
                        {d.status === "acceptee" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="success"
                              isLoading={updatingId === d.id}
                              onClick={() => handleStatus(d.id, "recue")}
                            >
                              Reçue
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              isLoading={updatingId === d.id}
                              onClick={() => handleStatus(d.id, "non_livree")}
                            >
                              Non livrée
                            </Button>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── New demand modal ──────────────────────────────────── */}
      <ModalPanel
        open={modalOpen}
        title="Nouvelle demande de réapprovisionnement"
        subtitle="Choisissez un fournisseur partenaire ou disponible, puis détaillez le besoin."
        onClose={() => { if (!submitLoading) { setModalOpen(false); setFormData(EMPTY_FORM); } }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={submitLoading} onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="demande-form" isLoading={submitLoading} leftIcon={<Send size={15} />}>Envoyer</Button>
          </div>
        }
      >
        <form id="demande-form" onSubmit={handleCreate} className="space-y-4">
          <label className="space-y-1.5">
            <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Fournisseur cible</span>
            <select name="supplier_id" value={formData.supplier_id} onChange={handleChange} className={inputClassName} required>
              <option value="">Sélectionner un fournisseur</option>
              {sortedSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.prenom || ""} ${s.nom || ""}`.trim()} — {s.partnership_status === "partenaire" ? "Partenaire" : "Disponible"}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Nom du médicament</span>
              <input name="nom_medicament" value={formData.nom_medicament} onChange={handleChange} className={inputClassName} placeholder="Ex. Cefixime 200 mg" required />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Quantité souhaitée</span>
              <input name="quantite" type="number" min="1" value={formData.quantite} onChange={handleChange} className={inputClassName} required />
            </label>
            <div className="rounded-xl border-l-4 border-accent bg-accent/5 px-4 py-3 text-xs text-accent">
              Les fournisseurs partenaires sont affichés en tête pour accélérer les réapprovisionnements.
            </div>
          </div>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Message ou contexte</span>
            <textarea name="message" value={formData.message} onChange={handleChange} className={textareaClassName} placeholder="Ex. Rupture imminente, besoin urgent avant la fin de journée." />
          </label>
        </form>
      </ModalPanel>
    </div>
  );
}

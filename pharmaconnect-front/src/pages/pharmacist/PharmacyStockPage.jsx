import { useDeferredValue, useEffect, useState } from "react";
import {
  AlertTriangle,
  Minus,
  Package2,
  PencilLine,
  Plus,
  Search,
  Trash2,
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
import {
  formatCurrency,
  formatDateTime,
  getErrorMessage,
  inputClassName,
} from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const EMPTY_FORM = { nom: "", quantite: 0, prix: "", seuil_alerte: 10 };

const STATUS_ROW = {
  rupture:     "bg-red-50 border-l-4 border-l-red-400",
  faible_stock: "bg-amber-50 border-l-4 border-l-amber-400",
  disponible:  "",
};

const STATUS_LABEL = {
  rupture:     "Rupture",
  faible_stock: "Faible stock",
  disponible:  "Disponible",
};

export default function PharmacyStockPage() {
  const [items, setItems]               = useState([]);
  const [stats, setStats]               = useState({});
  const [searchTerm, setSearchTerm]     = useState("");
  const deferredSearch                  = useDeferredValue(searchTerm);
  const [loading, setLoading]           = useState(true);
  const [notice, setNotice]             = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [adjustingKey, setAdjustingKey] = useState("");
  const [deletingId, setDeletingId]     = useState(null);

  const loadStock = async (search = deferredSearch) => {
    setLoading(true);
    try {
      const res = await api.get("/medicaments", {
        params: search.trim() ? { search: search.trim() } : undefined,
      });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setStats(res.data?.stats || {});
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Impossible de charger le stock.") });
      setItems([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStock(); }, [deferredSearch]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);

  const openCreate = () => { setEditingItem(null); setFormData(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      nom: item.nom || "",
      quantite: Number(item.quantite || 0),
      prix: item.prix ?? "",
      seuil_alerte: Number(item.seuil_alerte || 10),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitLoading) return;
    setModalOpen(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const payload = {
        nom: formData.nom.trim(),
        quantite: Number(formData.quantite || 0),
        prix: formData.prix === "" ? null : Number(formData.prix),
        seuil_alerte: Number(formData.seuil_alerte || 10),
      };
      if (editingItem) {
        await api.put(`/medicaments/${editingItem.id}`, payload);
      } else {
        await api.post("/medicaments/me", payload);
      }
      setNotice({ type: "success", message: editingItem ? "Médicament mis à jour." : "Médicament ajouté." });
      closeModal();
      await loadStock();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Enregistrement impossible.") });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAdjust = async (item, delta) => {
    const key = `${item.id}:${delta}`;
    setAdjustingKey(key);
    try {
      await api.patch(`/medicaments/${item.id}/adjust`, { delta });
      await loadStock();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Ajustement impossible.") });
    } finally {
      setAdjustingKey("");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer ${item.nom} du stock ?`)) return;
    setDeletingId(item.id);
    try {
      await api.delete(`/medicaments/${item.id}`);
      setNotice({ type: "success", message: "Médicament supprimé." });
      await loadStock();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Suppression impossible.") });
    } finally {
      setDeletingId(null);
    }
  };

  const ruptureCount    = stats.rupture     || 0;
  const faibleCount     = stats.faible_stock || 0;

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Gestion du stock"
        description="Ajoutez, modifiez et surveillez vos médicaments. Les alertes de rupture sont signalées en temps réel."
        actions={
          <>
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => setSearchTerm("")}
            >
              Réinitialiser
            </Button>
            <Button
              variant="outline"
              className="bg-white text-primary hover:bg-gray-50 border-white"
              leftIcon={<Plus size={15} />}
              onClick={openCreate}
            >
              Ajouter un médicament
            </Button>
          </>
        }
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      {/* ── Stock alert banners ────────────────────────────────── */}
      {!loading && ruptureCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <XCircle size={18} className="mt-0.5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {ruptureCount} médicament{ruptureCount > 1 ? "s" : ""} en rupture de stock
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              Ces références sont épuisées. Passez une demande de réapprovisionnement dès que possible.
            </p>
          </div>
        </div>
      )}
      {!loading && faibleCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-700">
              {faibleCount} médicament{faibleCount > 1 ? "s" : ""} en stock faible
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              Ces références sont en dessous du seuil d'alerte. Anticipez le réapprovisionnement.
            </p>
          </div>
        </div>
      )}

      {/* ── Metric cards ──────────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package2} label="Références"   value={stats.total_medicaments || 0} helper="Total des médicaments suivis"          tone="cyan" />
        <MetricCard icon={Plus}     label="Disponibles"  value={stats.disponible        || 0} helper="Stock au-dessus du seuil d'alerte"    tone="emerald" />
        <MetricCard icon={AlertTriangle} label="Faible stock" value={faibleCount}        helper="Produits à surveiller"                    tone="amber" />
        <MetricCard icon={XCircle}  label="Ruptures"     value={ruptureCount}            helper="Références à réapprovisionner"            tone="rose" />
      </section>

      {/* ── Stock table ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Catalogue interne</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">La recherche s'applique uniquement au stock de votre pharmacie.</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un médicament..."
              className={`${inputClassName} pl-9`}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingState message="Chargement du stock..." />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Package2}
                title="Aucun médicament à afficher"
                description={searchTerm ? "Aucun résultat pour cette recherche." : "Commencez par ajouter vos premiers médicaments."}
                action={<Button size="sm" onClick={openCreate}>Ajouter un médicament</Button>}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Médicament</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary text-right">Qté</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary text-right">Seuil</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary text-right">Prix</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Statut</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Mis à jour</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-gray-50/60 ${STATUS_ROW[item.statut_stock] || ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-text-primary">{item.nom}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                        item.statut_stock === "rupture" ? "text-red-600" :
                        item.statut_stock === "faible_stock" ? "text-amber-600" :
                        "text-text-primary"
                      }`}>
                        {item.quantite}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{item.seuil_alerte}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{formatCurrency(item.prix)}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={item.statut_stock} />
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{formatDateTime(item.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Diminuer"
                            disabled={adjustingKey === `${item.id}:-1`}
                            onClick={() => handleAdjust(item, -1)}
                            className="rounded-lg border border-border bg-white p-1.5 text-text-secondary shadow-sm transition hover:border-gray-300 hover:text-text-primary disabled:opacity-50"
                          >
                            <Minus size={13} />
                          </button>
                          <button
                            type="button"
                            title="Augmenter"
                            disabled={adjustingKey === `${item.id}:1`}
                            onClick={() => handleAdjust(item, 1)}
                            className="rounded-lg border border-border bg-white p-1.5 text-text-secondary shadow-sm transition hover:border-gray-300 hover:text-text-primary disabled:opacity-50"
                          >
                            <Plus size={13} />
                          </button>
                          <button
                            type="button"
                            title="Modifier"
                            onClick={() => openEdit(item)}
                            className="rounded-lg border border-border bg-white p-1.5 text-accent shadow-sm transition hover:border-accent/40 hover:bg-accent/5"
                          >
                            <PencilLine size={13} />
                          </button>
                          <button
                            type="button"
                            title="Supprimer"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item)}
                            className="rounded-lg border border-border bg-white p-1.5 text-danger shadow-sm transition hover:border-danger/40 hover:bg-danger/5 disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit modal ──────────────────────────────────── */}
      <ModalPanel
        open={modalOpen}
        title={editingItem ? "Modifier le médicament" : "Ajouter un médicament"}
        subtitle={editingItem ? "Mettez à jour les informations du stock." : "Nouvelle référence pour votre pharmacie."}
        onClose={closeModal}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeModal} disabled={submitLoading}>Annuler</Button>
            <Button type="submit" form="stock-form" isLoading={submitLoading}>
              {editingItem ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        }
      >
        <form id="stock-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Nom du médicament</span>
            <input name="nom" value={formData.nom} onChange={handleChange} className={inputClassName} placeholder="Ex. Amoxicilline 500 mg" required />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Quantité</span>
            <input name="quantite" type="number" min="0" value={formData.quantite} onChange={handleChange} className={inputClassName} required />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Seuil d'alerte</span>
            <input name="seuil_alerte" type="number" min="0" value={formData.seuil_alerte} onChange={handleChange} className={inputClassName} required />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Prix (TND)</span>
            <input name="prix" type="number" min="0" step="0.01" value={formData.prix} onChange={handleChange} className={inputClassName} placeholder="Optionnel" />
          </label>
        </form>
      </ModalPanel>
    </div>
  );
}

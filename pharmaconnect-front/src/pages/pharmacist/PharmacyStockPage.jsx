import { useDeferredValue, useEffect, useState } from "react";
import { Minus, Package2, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/modules/EmptyState";
import InlineAlert from "../../components/modules/InlineAlert";
import LoadingState from "../../components/modules/LoadingState";
import MetricCard from "../../components/modules/MetricCard";
import ModalPanel from "../../components/modules/ModalPanel";
import ModuleHero from "../../components/modules/ModuleHero";
import StatusPill from "../../components/modules/StatusPill";
import { formatCurrency, formatDateTime, getErrorMessage, inputClassName } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const EMPTY_FORM = {
  nom: "",
  quantite: 0,
  prix: "",
  seuil_alerte: 10,
};

export default function PharmacyStockPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [adjustingKey, setAdjustingKey] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadStock = async (search = deferredSearchTerm) => {
    setLoading(true);

    try {
      const response = await api.get("/medicaments", {
        params: search.trim() ? { search: search.trim() } : undefined,
      });

      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      setStats(response.data?.stats || {});
    } catch (requestError) {
      setNotice({ type: "error", message: getErrorMessage(requestError, "Impossible de charger le stock.") });
      setItems([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [deferredSearchTerm]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openCreateModal = () => { setEditingItem(null); setFormData(EMPTY_FORM); setModalOpen(true); };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({ nom: item.nom || "", quantite: Number(item.quantite || 0), prix: item.prix ?? "", seuil_alerte: Number(item.seuil_alerte || 10) });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitLoading) return;
    setModalOpen(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSubmitLoading(true);

    try {
      const payload = {
        nom: formData.nom.trim(),
        quantite: Number(formData.quantite || 0),
        prix: formData.prix === "" ? null : Number(formData.prix),
        seuil_alerte: Number(formData.seuil_alerte || 10),
      };

      const response = editingItem
        ? await api.put(`/medicaments/${editingItem.id}`, payload)
        : await api.post("/medicaments/me", payload);

      setNotice({ type: "success", message: editingItem ? "Medicament mis a jour avec succes." : "Medicament ajoute avec succes." });
      setModalOpen(false);
      setEditingItem(null);
      setFormData(EMPTY_FORM);
      await loadStock();
    } catch (requestError) {
      setNotice({ type: "error", message: getErrorMessage(requestError, "Enregistrement impossible.") });
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
    } catch (requestError) {
      setNotice({ type: "error", message: getErrorMessage(requestError, "Ajustement de stock impossible.") });
    } finally {
      setAdjustingKey("");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer ${item.nom} du stock ?`)) return;

    setDeletingId(item.id);

    try {
      await api.delete(`/medicaments/${item.id}`);
      setNotice({ type: "success", message: "Medicament supprime du stock." });
      await loadStock();
    } catch (requestError) {
      setNotice({ type: "error", message: getErrorMessage(requestError, "Suppression impossible.") });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Gestion professionnelle du stock"
        description="Ajoutez, mettez a jour, recherchez et ajustez vos medicaments avec statuts de disponibilite automatiques."
        actions={
          <>
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setSearchTerm("")}>
              Reinitialiser la recherche
            </Button>
            <Button variant="outline" className="bg-white text-primary hover:bg-gray-50 border-white" leftIcon={<Plus size={15} />} onClick={openCreateModal}>
              Ajouter un medicament
            </Button>
          </>
        }
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package2} label="References"   value={stats.total_medicaments || 0} helper="Nombre total de medicaments suivis" tone="cyan" />
        <MetricCard icon={Plus}     label="Disponibles"  value={stats.disponible || 0}         helper="Stock au-dessus du seuil d'alerte" tone="emerald" />
        <MetricCard icon={Search}   label="Faible stock" value={stats.faible_stock || 0}       helper="Produits a surveiller"            tone="amber" />
        <MetricCard icon={Minus}    label="Ruptures"     value={stats.rupture || 0}            helper="References a reapprovisionner"    tone="rose" />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Catalogue interne</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">La recherche s'applique au stock de votre pharmacie uniquement.</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Rechercher un medicament..." className={`${inputClassName} pl-9`} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Chargement du stock..." />
          ) : items.length === 0 ? (
            <EmptyState icon={Package2} title="Aucun medicament a afficher" description={searchTerm ? "Aucun resultat pour cette recherche." : "Commencez par ajouter vos premiers medicaments au stock."} action={<Button size="sm" onClick={openCreateModal}>Ajouter un medicament</Button>} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="bg-card rounded-card border border-border shadow-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{item.nom}</h3>
                      <p className="mt-0.5 text-xs text-text-secondary">Mise a jour: {formatDateTime(item.updated_at)}</p>
                    </div>
                    <StatusPill status={item.statut_stock} />
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {[
                      { label: "Quantite", value: item.quantite },
                      { label: "Prix",     value: formatCurrency(item.prix) },
                      { label: "Seuil d'alerte", value: item.seuil_alerte },
                      { label: "Etat",     value: item.statut_stock === "rupture" ? "Rupture" : item.statut_stock === "faible_stock" ? "Faible stock" : "Disponible" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" leftIcon={<Minus size={14} />} isLoading={adjustingKey === `${item.id}:-1`} onClick={() => handleAdjust(item, -1)}>Diminuer</Button>
                    <Button type="button" size="sm" variant="outline" leftIcon={<Plus size={14} />}  isLoading={adjustingKey === `${item.id}:1`}  onClick={() => handleAdjust(item, 1)}>Augmenter</Button>
                    <Button type="button" size="sm" variant="primary" leftIcon={<PencilLine size={14} />} onClick={() => openEditModal(item)}>Modifier</Button>
                    <Button type="button" size="sm" variant="danger"  leftIcon={<Trash2 size={14} />} isLoading={deletingId === item.id} onClick={() => handleDelete(item)}>Supprimer</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalPanel
        open={modalOpen}
        title={editingItem ? "Modifier le medicament" : "Ajouter un medicament"}
        subtitle={editingItem ? "Mettez a jour les informations du stock." : "Creez une nouvelle reference pour votre pharmacie."}
        onClose={closeModal}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeModal} disabled={submitLoading}>Annuler</Button>
            <Button type="submit" form="stock-form" isLoading={submitLoading}>{editingItem ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        }
      >
        <form id="stock-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Nom du medicament</span>
            <input name="nom" value={formData.nom} onChange={handleChange} className={inputClassName} placeholder="Ex. Amoxicilline 500 mg" required />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Quantite</span>
            <input name="quantite" type="number" min="0" value={formData.quantite} onChange={handleChange} className={inputClassName} required />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Seuil d'alerte</span>
            <input name="seuil_alerte" type="number" min="0" value={formData.seuil_alerte} onChange={handleChange} className={inputClassName} required />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Prix (TND)</span>
            <input name="prix" type="number" min="0" step="0.01" value={formData.prix} onChange={handleChange} className={inputClassName} placeholder="Optionnel" />
          </label>
        </form>
      </ModalPanel>
    </div>
  );
}

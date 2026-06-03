import { useDeferredValue, useEffect, useState } from "react";
import { CheckCircle2, Package2, PencilLine, Plus, Search, Trash2, XCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/modules/EmptyState";
import InlineAlert from "../../components/modules/InlineAlert";
import LoadingState from "../../components/modules/LoadingState";
import MetricCard from "../../components/modules/MetricCard";
import ModalPanel from "../../components/modules/ModalPanel";
import ModuleHero from "../../components/modules/ModuleHero";
import StatusPill from "../../components/modules/StatusPill";
import { formatCurrency, formatDateTime, getErrorMessage, inputClassName, textareaClassName } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const EMPTY_FORM = { nom: "", description: "", prix: "", quantite_disponible: 0, unite: "", is_active: true };

const getStockStatus = (item) => {
  if (Number(item.quantite_disponible || 0) <= 0) return "rupture";
  if (Number(item.quantite_disponible || 0) <= 10) return "faible_stock";
  return "disponible";
};

export default function SupplierProductsPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [notice, setNotice] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadProducts = async (search = deferredSearchTerm) => {
    setLoading(true);
    try {
      const response = await api.get("/supplier-products/me", {
        params: search.trim() ? { search: search.trim() } : undefined,
      });
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      setStats(response.data?.stats || {});
    } catch (requestError) {
      setNotice({ type: "error", message: getErrorMessage(requestError, "Impossible de charger les produits fournisseur.") });
      setItems([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, [deferredSearchTerm]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openCreateModal = () => { setEditingItem(null); setFormData(EMPTY_FORM); setModalOpen(true); };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({ nom: item.nom || "", description: item.description || "", prix: item.prix ?? "", quantite_disponible: Number(item.quantite_disponible || 0), unite: item.unite || "", is_active: Boolean(item.is_active) });
    setModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSubmitLoading(true);
    try {
      const payload = {
        nom: formData.nom.trim(),
        description: formData.description.trim(),
        prix: formData.prix === "" ? null : Number(formData.prix),
        quantite_disponible: Number(formData.quantite_disponible || 0),
        unite: formData.unite.trim(),
        is_active: Boolean(formData.is_active),
      };
      if (editingItem) {
        await api.put(`/supplier-products/${editingItem.id}`, payload);
        setNotice({ type: "success", message: "Produit mis a jour avec succes." });
      } else {
        await api.post("/supplier-products/me", payload);
        setNotice({ type: "success", message: "Produit ajoute avec succes." });
      }
      setModalOpen(false);
      setEditingItem(null);
      setFormData(EMPTY_FORM);
      await loadProducts();
    } catch (requestError) {
      setNotice({ type: "error", message: getErrorMessage(requestError, "Enregistrement du produit impossible.") });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer le produit ${item.nom} ?`)) return;
    setDeletingId(item.id);
    try {
      await api.delete(`/supplier-products/${item.id}`);
      setNotice({ type: "success", message: "Produit supprime avec succes." });
      await loadProducts();
    } catch (requestError) {
      setNotice({ type: "error", message: getErrorMessage(requestError, "Suppression du produit impossible.") });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace fournisseur"
        title="Catalogue produits"
        description="Maintenez un catalogue propre, recherchable et exploitable pour piloter les demandes de reapprovisionnement."
        actions={
          <>
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setSearchTerm("")}>Reinitialiser</Button>
            <Button variant="outline" className="bg-white text-primary hover:bg-gray-50 border-white" leftIcon={<Plus size={15} />} onClick={openCreateModal}>Ajouter un produit</Button>
          </>
        }
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package2}    label="Produits"     value={stats.total || 0}       helper="Total des references fournisseur"         tone="cyan" />
        <MetricCard icon={CheckCircle2}label="Actifs"       value={stats.actifs || 0}       helper="Produits visibles pour l'exploitation"  tone="emerald" />
        <MetricCard icon={XCircle}     label="Ruptures"     value={stats.rupture || 0}      helper="Produits epuises a recharger"            tone="rose" />
        <MetricCard icon={Search}      label="Faible stock" value={stats.faible_stock || 0} helper="Produits sous le niveau de vigilance"    tone="amber" />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Produits disponibles</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">La recherche s'effectue sur le nom, la description et l'unite.</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Rechercher un produit..." className={`${inputClassName} pl-9`} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Chargement du catalogue..." />
          ) : items.length === 0 ? (
            <EmptyState icon={Package2} title="Aucun produit a afficher" description={searchTerm ? "Aucun resultat pour cette recherche." : "Ajoutez votre premier produit pour alimenter le catalogue."} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <article key={item.id} className="bg-card rounded-card border border-border shadow-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">{item.nom}</h3>
                        <p className="mt-0.5 text-xs text-text-secondary">Mis a jour le {formatDateTime(item.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={stockStatus} />
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.is_active ? "bg-accent-light text-accent" : "bg-gray-100 text-gray-600"}`}>
                          {item.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      <div className="rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Quantite</p>
                        <p className="mt-1 text-lg font-semibold text-text-primary">{item.quantite_disponible}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Prix</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{formatCurrency(item.prix)}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-gray-50 border border-border px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Description</p>
                      <p className="mt-1 text-xs text-text-secondary">{item.description || "Aucune description renseignee."}</p>
                      <p className="mt-0.5 text-xs font-medium text-text-primary">{item.unite ? `Unite: ${item.unite}` : "Unite non renseignee"}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <Button type="button" size="sm" variant="primary" leftIcon={<PencilLine size={13} />} onClick={() => openEditModal(item)}>Modifier</Button>
                      <Button type="button" size="sm" variant="danger"  leftIcon={<Trash2 size={13} />}    isLoading={deletingId === item.id} onClick={() => handleDelete(item)}>Supprimer</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalPanel
        open={modalOpen}
        title={editingItem ? "Modifier le produit" : "Ajouter un produit"}
        subtitle={editingItem ? "Ajustez la fiche produit." : "Creez une nouvelle reference disponible."}
        onClose={() => { if (!submitLoading) { setModalOpen(false); setEditingItem(null); setFormData(EMPTY_FORM); } }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={submitLoading} onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="product-form" isLoading={submitLoading}>{editingItem ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Nom du produit</span>
            <input name="nom" value={formData.nom} onChange={handleChange} className={inputClassName} placeholder="Ex. Paracetamol 500 mg" required />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Quantite disponible</span>
            <input name="quantite_disponible" type="number" min="0" value={formData.quantite_disponible} onChange={handleChange} className={inputClassName} required />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Unite</span>
            <input name="unite" value={formData.unite} onChange={handleChange} className={inputClassName} placeholder="Boite, flacon..." />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Prix (TND)</span>
            <input name="prix" type="number" min="0" step="0.01" value={formData.prix} onChange={handleChange} className={inputClassName} placeholder="Optionnel" />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Description</span>
            <textarea name="description" value={formData.description} onChange={handleChange} className={textareaClassName} placeholder="Informations utiles pour le traitement ou la vente." />
          </label>
          <label className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-border bg-gray-50 px-4 py-3 text-sm text-text-primary cursor-pointer hover:bg-gray-100 transition-colors">
            <input type="checkbox" name="is_active" checked={Boolean(formData.is_active)} onChange={handleChange} className="h-4 w-4 rounded border-border accent-primary" />
            Produit actif dans le catalogue
          </label>
        </form>
      </ModalPanel>
    </div>
  );
}

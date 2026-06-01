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

const EMPTY_FORM = {
  nom: "",
  description: "",
  prix: "",
  quantite_disponible: 0,
  unite: "",
  is_active: true,
};

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
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Impossible de charger les produits fournisseur."),
      });
      setItems([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [deferredSearchTerm]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      nom: item.nom || "",
      description: item.description || "",
      prix: item.prix ?? "",
      quantite_disponible: Number(item.quantite_disponible || 0),
      unite: item.unite || "",
      is_active: Boolean(item.is_active),
    });
    setModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
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
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Enregistrement du produit impossible."),
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer le produit ${item.nom} ?`)) {
      return;
    }

    setDeletingId(item.id);

    try {
      await api.delete(`/supplier-products/${item.id}`);
      setNotice({ type: "success", message: "Produit supprime avec succes." });
      await loadProducts();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Suppression du produit impossible."),
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <ModuleHero
        eyebrow="Espace fournisseur"
        title="Catalogue produits"
        description="Maintenez un catalogue propre, recherchable et exploitable pour piloter les demandes de reapprovisionnement sans friction."
        actions={
          <>
            <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => setSearchTerm("")}>
              Reinitialiser la recherche
            </Button>
            <Button variant="accent" className="bg-white text-cyan-700 hover:bg-cyan-50" leftIcon={<Plus size={16} />} onClick={openCreateModal}>
              Ajouter un produit
            </Button>
          </>
        }
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package2} label="Produits" value={stats.total || 0} helper="Total des references fournisseur" tone="cyan" />
        <MetricCard icon={CheckCircle2} label="Actifs" value={stats.actifs || 0} helper="Produits visibles pour l'exploitation" tone="emerald" />
        <MetricCard icon={XCircle} label="Ruptures" value={stats.rupture || 0} helper="Produits epuises a recharger ou desactiver" tone="rose" />
        <MetricCard icon={Search} label="Faible stock" value={stats.faible_stock || 0} helper="Produits sous le niveau de vigilance" tone="amber" />
      </section>

      <Card className="border-slate-200/90 bg-white/95 shadow-md">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Produits disponibles</CardTitle>
            <p className="mt-1 text-sm text-slate-500">La recherche s'effectue sur le nom, la description et l'unite du produit.</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Chargement du catalogue..." />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package2}
              title="Aucun produit a afficher"
              description={searchTerm ? "Aucun resultat pour cette recherche." : "Ajoutez votre premier produit pour alimenter le catalogue fournisseur."}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => {
                const stockStatus = getStockStatus(item);

                return (
                  <article key={item.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.nom}</h3>
                        <p className="mt-1 text-sm text-slate-500">Mise a jour le {formatDateTime(item.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={stockStatus} />
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.is_active ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-700"}`}>
                          {item.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantite</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{item.quantite_disponible}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Prix</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">{formatCurrency(item.prix)}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Description</p>
                      <p className="mt-2 text-sm text-slate-600">{item.description || "Aucune description renseignee."}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{item.unite ? `Unite: ${item.unite}` : "Unite non renseignee"}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button type="button" size="sm" variant="secondary" leftIcon={<PencilLine size={15} />} onClick={() => openEditModal(item)}>
                        Modifier
                      </Button>
                      <Button type="button" size="sm" variant="danger" leftIcon={<Trash2 size={15} />} isLoading={deletingId === item.id} onClick={() => handleDelete(item)}>
                        Supprimer
                      </Button>
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
        subtitle={editingItem ? "Ajustez la fiche produit sans quitter l'espace fournisseur." : "Creez une nouvelle reference disponible pour vos demandes."}
        onClose={() => {
          if (!submitLoading) {
            setModalOpen(false);
            setEditingItem(null);
            setFormData(EMPTY_FORM);
          }
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={submitLoading} onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="product-form" isLoading={submitLoading}>
              {editingItem ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Nom du produit</span>
            <input name="nom" value={formData.nom} onChange={handleChange} className={inputClassName} placeholder="Ex. Paracetamol 500 mg" required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Quantite disponible</span>
            <input name="quantite_disponible" type="number" min="0" value={formData.quantite_disponible} onChange={handleChange} className={inputClassName} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Unite</span>
            <input name="unite" value={formData.unite} onChange={handleChange} className={inputClassName} placeholder="Boite, flacon..." />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Prix (TND)</span>
            <input name="prix" type="number" min="0" step="0.01" value={formData.prix} onChange={handleChange} className={inputClassName} placeholder="Optionnel" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea name="description" value={formData.description} onChange={handleChange} className={textareaClassName} placeholder="Informations utiles pour le traitement ou la vente." />
          </label>
          <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="is_active" checked={Boolean(formData.is_active)} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500" />
            Produit actif dans le catalogue
          </label>
        </form>
      </ModalPanel>
    </div>
  );
}

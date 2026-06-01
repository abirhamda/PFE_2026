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
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Impossible de charger le stock."),
      });
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

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
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

      if (editingItem) {
        setNotice({ type: "success", message: "Medicament mis a jour avec succes." });
      } else {
        setNotice({ type: "success", message: "Medicament ajoute avec succes." });
      }

      setModalOpen(false);
      setEditingItem(null);
      setFormData(EMPTY_FORM);
      await loadStock();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Enregistrement impossible."),
      });
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
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Ajustement de stock impossible."),
      });
    } finally {
      setAdjustingKey("");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer ${item.nom} du stock ?`)) {
      return;
    }

    setDeletingId(item.id);

    try {
      await api.delete(`/medicaments/${item.id}`);
      setNotice({ type: "success", message: "Medicament supprime du stock." });
      await loadStock();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Suppression impossible."),
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Gestion professionnelle du stock"
        description="Ajoutez, mettez a jour, recherchez et ajustez vos medicaments dans une vue operationnelle claire avec statuts de disponibilite automatiques."
        actions={
          <>
            <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => setSearchTerm("")}>
              Reinitialiser la recherche
            </Button>
            <Button variant="accent" className="bg-white text-cyan-700 hover:bg-cyan-50" leftIcon={<Plus size={16} />} onClick={openCreateModal}>
              Ajouter un medicament
            </Button>
          </>
        }
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package2} label="References" value={stats.total_medicaments || 0} helper="Nombre total de medicaments suivis" tone="cyan" />
        <MetricCard icon={Plus} label="Disponibles" value={stats.disponible || 0} helper="Stock confortable au-dessus du seuil d'alerte" tone="emerald" />
        <MetricCard icon={Search} label="Faible stock" value={stats.faible_stock || 0} helper="Produits a surveiller dans les prochains mouvements" tone="amber" />
        <MetricCard icon={Minus} label="Ruptures" value={stats.rupture || 0} helper="References a reapprovisionner en priorite" tone="rose" />
      </section>

      <Card className="border-slate-200/90 bg-white/95 shadow-md">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Catalogue interne</CardTitle>
            <p className="mt-1 text-sm text-slate-500">La recherche s'applique au stock de votre pharmacie uniquement.</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un medicament..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Chargement du stock..." />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package2}
              title="Aucun medicament a afficher"
              description={searchTerm ? "Aucun resultat pour cette recherche." : "Commencez par ajouter vos premiers medicaments au stock."}
              action={
                <Button size="sm" onClick={openCreateModal}>
                  Ajouter un medicament
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{item.nom}</h3>
                      <p className="mt-1 text-sm text-slate-500">Derniere mise a jour: {formatDateTime(item.updated_at)}</p>
                    </div>
                    <StatusPill status={item.statut_stock} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantite</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{item.quantite}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Prix</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{formatCurrency(item.prix)}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Seuil d'alerte</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{item.seuil_alerte}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Etat</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {item.statut_stock === "rupture" ? "Rupture" : item.statut_stock === "faible_stock" ? "Faible stock" : "Disponible"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" leftIcon={<Minus size={15} />} isLoading={adjustingKey === `${item.id}:-1`} onClick={() => handleAdjust(item, -1)}>
                      Diminuer
                    </Button>
                    <Button type="button" size="sm" variant="outline" leftIcon={<Plus size={15} />} isLoading={adjustingKey === `${item.id}:1`} onClick={() => handleAdjust(item, 1)}>
                      Augmenter
                    </Button>
                    <Button type="button" size="sm" variant="secondary" leftIcon={<PencilLine size={15} />} onClick={() => openEditModal(item)}>
                      Modifier
                    </Button>
                    <Button type="button" size="sm" variant="danger" leftIcon={<Trash2 size={15} />} isLoading={deletingId === item.id} onClick={() => handleDelete(item)}>
                      Supprimer
                    </Button>
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
        subtitle={editingItem ? "Mettez a jour les informations du stock sans quitter la vue." : "Creez une nouvelle reference pour votre pharmacie."}
        onClose={closeModal}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeModal} disabled={submitLoading}>
              Annuler
            </Button>
            <Button type="submit" form="stock-form" isLoading={submitLoading}>
              {editingItem ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        }
      >
        <form id="stock-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Nom du medicament</span>
            <input name="nom" value={formData.nom} onChange={handleChange} className={inputClassName} placeholder="Ex. Amoxicilline 500 mg" required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Quantite</span>
            <input name="quantite" type="number" min="0" value={formData.quantite} onChange={handleChange} className={inputClassName} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Seuil d'alerte</span>
            <input name="seuil_alerte" type="number" min="0" value={formData.seuil_alerte} onChange={handleChange} className={inputClassName} required />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Prix (TND)</span>
            <input name="prix" type="number" min="0" step="0.01" value={formData.prix} onChange={handleChange} className={inputClassName} placeholder="Optionnel" />
          </label>
        </form>
      </ModalPanel>
    </div>
  );
}

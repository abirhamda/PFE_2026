import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Send, Store, Truck, XCircle } from "lucide-react";
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

const EMPTY_FORM = {
  supplier_id: "",
  nom_medicament: "",
  quantite: 1,
  message: "",
};

const FILTERS = [
  ["all", "Toutes"],
  ["en_attente", "En attente"],
  ["acceptee", "Acceptees"],
  ["recue", "Recues"],
  ["refusee", "Refusees"],
  ["non_livree", "Non livrees"],
];

export default function PharmacyDemandesPage() {
  const [demandes, setDemandes] = useState([]);
  const [stats, setStats] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadData = async () => {
    setLoading(true);

    try {
      const [demandesResponse, suppliersResponse] = await Promise.all([
        api.get("/demandes/me/pharmacy"),
        api.get("/partnerships/directory"),
      ]);

      setDemandes(Array.isArray(demandesResponse.data?.demandes) ? demandesResponse.data.demandes : []);
      setStats(demandesResponse.data?.stats || {});
      setSuppliers(Array.isArray(suppliersResponse.data?.items) ? suppliersResponse.data.items : []);
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Impossible de charger les demandes de reapprovisionnement."),
      });
      setDemandes([]);
      setStats({});
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const availableSuppliers = useMemo(
    () =>
      [...suppliers].sort((left, right) => {
        const leftPriority = left.partnership_status === "partenaire" ? 0 : 1;
        const rightPriority = right.partnership_status === "partenaire" ? 0 : 1;
        return leftPriority - rightPriority || String(left.prenom || "").localeCompare(String(right.prenom || ""));
      }),
    [suppliers],
  );

  const filteredDemandes = useMemo(() => {
    if (activeFilter === "all") return demandes;
    return demandes.filter((item) => item.status === activeFilter);
  }, [activeFilter, demandes]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleCreateDemande = async (event) => {
    event.preventDefault();
    setSubmitLoading(true);

    try {
      await api.post("/demandes/create", {
        supplier_id: Number(formData.supplier_id),
        nom_medicament: formData.nom_medicament.trim(),
        quantite: Number(formData.quantite),
        message: formData.message.trim(),
      });

      setNotice({ type: "success", message: "Demande de reapprovisionnement envoyee avec succes." });
      setModalOpen(false);
      setFormData(EMPTY_FORM);
      await loadData();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Creation de la demande impossible."),
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusUpdate = async (demandeId, status) => {
    setUpdatingId(demandeId);

    try {
      await api.put(`/demandes/${demandeId}/status`, { status });
      setNotice({
        type: "success",
        message: status === "recue" ? "Reception confirmee et stock mis a jour." : "Statut mis a jour avec succes.",
      });
      await loadData();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Mise a jour du statut impossible."),
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Demandes de reapprovisionnement"
        description="Envoyez vos demandes au fournisseur de votre choix, privilegiez vos partenaires et suivez les reponses jusqu'a la reception effective."
        actions={
          <Button variant="accent" className="bg-white text-cyan-700 hover:bg-cyan-50" leftIcon={<Send size={16} />} onClick={() => setModalOpen(true)}>
            Nouvelle demande
          </Button>
        }
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Demandes" value={stats.total || 0} helper="Historique des demandes emises par votre pharmacie" tone="cyan" />
        <MetricCard icon={Store} label="En attente" value={stats.en_attente || 0} helper="Demandes en cours de traitement fournisseur" tone="amber" />
        <MetricCard icon={CheckCircle2} label="Acceptees" value={stats.acceptees || 0} helper="Commandes validees cote fournisseur" tone="emerald" />
        <MetricCard icon={XCircle} label="Refusees" value={stats.refusees || 0} helper="Demandes refusees ou non abouties" tone="rose" />
      </section>

      <Card className="border-slate-200/90 bg-white/95 shadow-md">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Suivi des demandes</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Le pharmacien peut confirmer une reception ou signaler une non-livraison apres acceptation.</p>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Chargement des demandes..." />
          ) : filteredDemandes.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Aucune demande a afficher"
              description={activeFilter === "all" ? "Envoyez une premiere demande pour demarrer le suivi." : "Aucune demande dans ce statut pour le moment."}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredDemandes.map((demande) => {
                const canConfirm = demande.status === "acceptee";

                return (
                  <article key={demande.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{demande.nom_medicament}</h3>
                        <p className="mt-1 text-sm text-slate-500">Fournisseur: {demande.nom_fournisseur || "Non specifie"}</p>
                      </div>
                      <StatusPill status={demande.status} />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantite</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{demande.quantite}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Creation</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(demande.created_at)}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Coordonnees fournisseur</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{demande.fournisseur_email || "Email non renseigne"}</p>
                      <p className="mt-1 text-sm text-slate-500">{demande.fournisseur_telephone || "Telephone non renseigne"}</p>
                    </div>

                    {demande.response_note ? (
                      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">{demande.response_note}</div>
                    ) : null}

                    {canConfirm ? (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button type="button" size="sm" variant="success" isLoading={updatingId === demande.id} onClick={() => handleStatusUpdate(demande.id, "recue")}>
                          Marquer recue
                        </Button>
                        <Button type="button" size="sm" variant="danger" isLoading={updatingId === demande.id} onClick={() => handleStatusUpdate(demande.id, "non_livree")}>
                          Signaler non livree
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalPanel
        open={modalOpen}
        title="Nouvelle demande de reapprovisionnement"
        subtitle="Choisissez un fournisseur partenaire ou disponible, puis detaillez le besoin."
        onClose={() => {
          if (!submitLoading) {
            setModalOpen(false);
            setFormData(EMPTY_FORM);
          }
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={submitLoading} onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="demande-form" isLoading={submitLoading} leftIcon={<Send size={16} />}>
              Envoyer
            </Button>
          </div>
        }
      >
        <form id="demande-form" onSubmit={handleCreateDemande} className="space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Fournisseur cible</span>
            <select name="supplier_id" value={formData.supplier_id} onChange={handleChange} className={inputClassName} required>
              <option value="">Selectionner un fournisseur</option>
              {availableSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {`${supplier.prenom || ""} ${supplier.nom || ""}`.trim()} - {supplier.partnership_status === "partenaire" ? "Partenaire" : "Disponible"}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Nom du medicament</span>
              <input name="nom_medicament" value={formData.nom_medicament} onChange={handleChange} className={inputClassName} placeholder="Ex. Cefixime 200 mg" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Quantite souhaitee</span>
              <input name="quantite" type="number" min="1" value={formData.quantite} onChange={handleChange} className={inputClassName} required />
            </label>
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-cyan-800">
              Les fournisseurs partenaires apparaissent en tete pour accelerer les reapprovisionnements prioritaires.
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Message ou contexte</span>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              className={textareaClassName}
              placeholder="Ex. Rupture imminente, besoin urgent avant la fin de journee."
            />
          </label>
        </form>
      </ModalPanel>
    </div>
  );
}

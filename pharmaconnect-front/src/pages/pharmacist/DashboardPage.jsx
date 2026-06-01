import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, ClipboardList, FileSearch, Package2, Pill, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/modules/EmptyState";
import InlineAlert from "../../components/modules/InlineAlert";
import LoadingState from "../../components/modules/LoadingState";
import MetricCard from "../../components/modules/MetricCard";
import ModuleHero from "../../components/modules/ModuleHero";
import StatusPill from "../../components/modules/StatusPill";
import { formatDateTime, getErrorMessage } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const dashboardLinks = [
  {
    title: "Consulter les ordonnances",
    description: "Rechercher par CIN ou identite sans exposer toute la base d'ordonnances.",
    to: "/pharmacy/ordonnances",
  },
  {
    title: "Gerer le stock",
    description: "Ajouter, corriger et surveiller les niveaux de medicaments avec statut automatique.",
    to: "/pharmacy/stock",
  },
  {
    title: "Suivre les demandes",
    description: "Envoyer les reapprovisionnements et suivre les retours fournisseur.",
    to: "/pharmacy/demandes",
  },
  {
    title: "Piloter les fournisseurs",
    description: "Construire un reseau partenaire propre et trace.",
    to: "/pharmacy/fournisseurs",
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/pharmacy/me/dashboard");
        setDashboard(response.data || null);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Impossible de charger le dashboard pharmacien."));
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = dashboard?.stats || {};
  const recentStock = Array.isArray(dashboard?.recent_stock) ? dashboard.recent_stock : [];
  const recentDemandes = Array.isArray(dashboard?.recent_demandes) ? dashboard.recent_demandes : [];

  return (
    <div className="space-y-8">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Pilotage quotidien de la pharmacie"
        description="Suivez vos indicateurs critiques, detectez les tensions de stock et accedez rapidement aux workflows utiles sans disperser l'equipe."
        actions={
          <>
            <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/pharmacy/ordonnances")}>
              Rechercher une ordonnance
            </Button>
            <Button variant="accent" className="bg-white text-cyan-700 hover:bg-cyan-50" onClick={() => navigate("/pharmacy/stock")}>
              Ouvrir le stock
            </Button>
          </>
        }
      />

      <InlineAlert message={error} type="error" />

      {loading ? (
        <LoadingState message="Chargement du dashboard pharmacien..." />
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Pill} label="Medicaments en stock" value={stats.medicaments_en_stock || 0} helper="References actuellement suivies dans votre pharmacie" tone="cyan" />
            <MetricCard icon={AlertTriangle} label="Ruptures" value={stats.ruptures || 0} helper="Produits indisponibles a traiter rapidement" tone="rose" />
            <MetricCard icon={Truck} label="Demandes envoyees" value={stats.demandes_envoyees || 0} helper="Reapprovisionnements deja traces" tone="amber" />
            <MetricCard icon={FileSearch} label="Ordonnances consultees" value={stats.ordonnances_consultees || 0} helper="Historique de consultation par votre officine" tone="emerald" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-slate-200/90 bg-white/95 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Vigilance stock</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Les produits les plus sensibles remontent ici pour faciliter les arbitrages rapides.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/pharmacy/stock")}>
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentStock.length === 0 ? (
                  <EmptyState
                    icon={Package2}
                    title="Aucun medicament en stock"
                    description="Ajoutez vos premiers medicaments pour faire apparaitre les alertes et indicateurs."
                    action={
                      <Button size="sm" onClick={() => navigate("/pharmacy/stock")}>
                        Gerer le stock
                      </Button>
                    }
                  />
                ) : (
                  recentStock.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{item.nom}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Stock actuel: <span className="font-semibold text-slate-700">{item.quantite}</span> - Seuil d'alerte:{" "}
                            <span className="font-semibold text-slate-700">{item.seuil_alerte}</span>
                          </p>
                          <p className="mt-2 text-xs text-slate-500">Mise a jour: {formatDateTime(item.updated_at)}</p>
                        </div>
                        <StatusPill status={item.statut} />
                      </div>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200/90 bg-white/95 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Demandes recentes</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Vue rapide des derniers reapprovisionnements et de leur avancement.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/pharmacy/demandes")}>
                  Ouvrir le suivi
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentDemandes.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="Aucune demande recente"
                    description="Quand vous lancerez des demandes fournisseur, elles apparaitront ici avec leur statut."
                  />
                ) : (
                  recentDemandes.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{item.nom_medicament}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Quantite demandee: <span className="font-semibold text-slate-700">{item.quantite}</span>
                          </p>
                          <p className="mt-2 text-xs text-slate-500">Creee le {formatDateTime(item.created_at)}</p>
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      {item.response_note ? (
                        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">{item.response_note}</div>
                      ) : null}
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {dashboardLinks.map((link) => (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className="rounded-3xl border border-slate-200 bg-white/95 p-5 text-left shadow-md transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
              >
                <p className="text-lg font-semibold text-slate-900">{link.title}</p>
                <p className="mt-2 text-sm text-slate-500">{link.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
                  Ouvrir
                  <ArrowRight size={16} />
                </div>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, ClipboardList, Package2, Pill, Truck } from "lucide-react";
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
  { title: "Consulter les ordonnances", description: "Rechercher par CIN ou identite.", to: "/pharmacy/ordonnances" },
  { title: "Gerer le stock",            description: "Ajouter, corriger et surveiller les niveaux.", to: "/pharmacy/stock" },
  { title: "Suivre les demandes",       description: "Envoyer les reapprovisionnements et suivre les retours.", to: "/pharmacy/demandes" },
  { title: "Piloter les fournisseurs",  description: "Construire un reseau partenaire trace.", to: "/pharmacy/fournisseurs" },
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
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Pilotage quotidien de la pharmacie"
        description="Suivez vos indicateurs critiques, detectez les tensions de stock et accedez rapidement aux workflows utiles."
        actions={
          <>
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/pharmacy/ordonnances")}>
              Rechercher une ordonnance
            </Button>
            <Button variant="outline" className="bg-white text-primary hover:bg-gray-50 border-white" onClick={() => navigate("/pharmacy/stock")}>
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Pill}         label="Medicaments en stock"     value={stats.medicaments_en_stock || 0} helper="References actuellement suivies"          tone="cyan" />
            <MetricCard icon={AlertTriangle}label="Ruptures"                 value={stats.ruptures || 0}            helper="Produits indisponibles a traiter"         tone="rose" />
            <MetricCard icon={Truck}        label="Demandes envoyees"        value={stats.demandes_envoyees || 0}   helper="Reapprovisionnements traces"              tone="amber" />
            <MetricCard icon={Package2}     label="Stock faible"             value={stats.faible_stock || 0}        helper="References sous le seuil d'alerte"        tone="emerald" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Vigilance stock</CardTitle>
                  <p className="mt-0.5 text-xs text-text-secondary">Les produits les plus sensibles remontent ici.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/pharmacy/stock")}>Voir tout</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentStock.length === 0 ? (
                  <EmptyState icon={Package2} title="Aucun medicament en stock" description="Ajoutez vos premiers medicaments pour faire apparaitre les alertes." action={<Button size="sm" onClick={() => navigate("/pharmacy/stock")}>Gerer le stock</Button>} />
                ) : (
                  recentStock.map((item) => (
                    <article key={item.id} className="bg-card rounded-card border border-border shadow-card p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary">{item.nom}</h3>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            Stock: <span className="font-medium text-text-primary">{item.quantite}</span> · Seuil: <span className="font-medium text-text-primary">{item.seuil_alerte}</span>
                          </p>
                          <p className="mt-1 text-xs text-text-muted">Mis a jour: {formatDateTime(item.updated_at)}</p>
                        </div>
                        <StatusPill status={item.statut} />
                      </div>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Demandes recentes</CardTitle>
                  <p className="mt-0.5 text-xs text-text-secondary">Derniers reapprovisionnements et leur avancement.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/pharmacy/demandes")}>Ouvrir</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentDemandes.length === 0 ? (
                  <EmptyState icon={ClipboardList} title="Aucune demande recente" description="Quand vous lancerez des demandes, elles apparaitront ici." />
                ) : (
                  recentDemandes.map((item) => (
                    <article key={item.id} className="bg-card rounded-card border border-border shadow-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary">{item.nom_medicament}</h3>
                          <p className="mt-0.5 text-xs text-text-secondary">Quantite: <span className="font-medium text-text-primary">{item.quantite}</span></p>
                          <p className="mt-1 text-xs text-text-muted">Creee le {formatDateTime(item.created_at)}</p>
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      {item.response_note ? (
                        <div className="mt-3 rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-xs text-text-secondary">{item.response_note}</div>
                      ) : null}
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardLinks.map((link) => (
              <button key={link.to} type="button" onClick={() => navigate(link.to)} className="bg-card rounded-card border border-border shadow-card p-5 text-left hover:border-accent/30 hover:shadow-card-hover transition-all">
                <p className="text-sm font-semibold text-text-primary">{link.title}</p>
                <p className="mt-1.5 text-xs text-text-secondary">{link.description}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                  Ouvrir
                  <ArrowRight size={13} />
                </div>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

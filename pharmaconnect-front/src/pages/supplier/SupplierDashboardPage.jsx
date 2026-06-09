import { useEffect, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, ClipboardList, Clock3, Package2, XCircle } from "lucide-react";
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

const dashboardRoutes = [
  { title: "Centre des demandes",   description: "Traiter les demandes medicament et partenariat.", to: "/supplier/demandes" },
  { title: "Pharmacies partenaires",description: "Consulter les pharmacies actives.",                to: "/supplier/pharmacies" },
  { title: "Mes informations",      description: "Mettre a jour le profil fournisseur.",             to: "/supplier/profile" },
];

export default function SupplierDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/suppliers/me/dashboard");
        setDashboard(response.data || null);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Impossible de charger le dashboard fournisseur."));
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = dashboard?.stats || {};
  const recentMedicineRequests = Array.isArray(dashboard?.recent_medicament_requests) ? dashboard.recent_medicament_requests : [];
  const recentPartnershipRequests = Array.isArray(dashboard?.recent_partnership_requests) ? dashboard.recent_partnership_requests : [];

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace fournisseur"
        title="Pilotage des relations pharmacies"
        description="Centralisez les demandes recues, arbitrez rapidement les decisions commerciales et gardez une vision propre de vos partenariats."
        actions={
          <>
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/supplier/demandes")}>
              Ouvrir les demandes
            </Button>
            <Button variant="outline" className="bg-white text-primary hover:bg-gray-50 border-white" onClick={() => navigate("/supplier/pharmacies")}>
              Voir les pharmacies
            </Button>
          </>
        }
      />

      <InlineAlert message={error} type="error" />

      {loading ? (
        <LoadingState message="Chargement du dashboard fournisseur..." />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard icon={ClipboardList} label="Demandes recues"      value={stats.demandes_recues || 0}      helper="Flux total des demandes"          tone="cyan" />
            <MetricCard icon={Clock3}        label="En attente"           value={stats.en_attente || 0}           helper="Demandes qui attendent une decision" tone="amber" />
            <MetricCard icon={CheckCircle2}  label="Acceptees"            value={stats.acceptees || 0}            helper="Demandes validees"               tone="emerald" />
            <MetricCard icon={XCircle}       label="Refusees"             value={stats.refusees || 0}             helper="Demandes cloturees negativement" tone="rose" />
            <MetricCard icon={Building2}     label="Pharmacies partenaires" value={stats.pharmacies_partenaires || 0} helper="Reseau actif rattache" tone="slate" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Demandes medicament recentes</CardTitle>
                  <p className="mt-0.5 text-xs text-text-secondary">Les plus recentes pour ajuster vos priorites.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/supplier/demandes")}>Voir tout</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentMedicineRequests.length === 0 ? (
                  <EmptyState icon={Package2} title="Aucune demande medicament recente" description="Le flux s'alimentera automatiquement quand les pharmacies vous solliciteront." />
                ) : (
                  recentMedicineRequests.map((item) => (
                    <article key={item.id} className="bg-card rounded-card border border-border shadow-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary">{item.nom_medicament}</h3>
                          <p className="mt-0.5 text-xs text-text-secondary">Quantite: <span className="font-medium text-text-primary">{item.quantite}</span></p>
                          <p className="mt-1 text-xs text-text-muted">Creee le {formatDateTime(item.created_at)}</p>
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      {item.response_note ? <div className="mt-3 rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-xs text-text-secondary">{item.response_note}</div> : null}
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Demandes de partenariat</CardTitle>
                  <p className="mt-0.5 text-xs text-text-secondary">Nouvelles pharmacies a onboarder ou refuser.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/supplier/demandes")}>Traiter</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentPartnershipRequests.length === 0 ? (
                  <EmptyState icon={Building2} title="Aucune demande de partenariat recente" description="Les nouvelles demandes apparaitront ici des leur reception." />
                ) : (
                  recentPartnershipRequests.map((item) => (
                    <article key={item.id} className="bg-card rounded-card border border-border shadow-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary">Demande de partenariat</h3>
                          <p className="mt-0.5 text-xs text-text-secondary">Pharmacie ID: {item.pharmacie_id}</p>
                          <p className="mt-1 text-xs text-text-muted">Creee le {formatDateTime(item.created_at)}</p>
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      {item.response_note ? <div className="mt-3 rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-xs text-text-secondary">{item.response_note}</div> : null}
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {dashboardRoutes.map((item) => (
              <button key={item.to} type="button" onClick={() => navigate(item.to)} className="bg-card rounded-card border border-border shadow-card p-5 text-left hover:border-accent/30 hover:shadow-card-hover transition-all">
                <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                <p className="mt-1.5 text-xs text-text-secondary">{item.description}</p>
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

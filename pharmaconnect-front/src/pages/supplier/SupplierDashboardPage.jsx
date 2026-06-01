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
  {
    title: "Centre des demandes",
    description: "Traiter les demandes medicament et partenariat avec motif et tracabilite.",
    to: "/supplier/demandes",
  },
  {
    title: "Pharmacies partenaires",
    description: "Consulter les pharmacies actives et leurs demandes recentes.",
    to: "/supplier/pharmacies",
  },
  {
    title: "Catalogue produits",
    description: "Maintenir une offre disponible, structuree et exploitable par l'equipe.",
    to: "/supplier/produits",
  },
  {
    title: "Mes informations",
    description: "Mettre a jour le profil fournisseur sans sortir du module.",
    to: "/supplier/profile",
  },
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
    <div className="space-y-8">
      <ModuleHero
        eyebrow="Espace fournisseur"
        title="Pilotage des relations pharmacies"
        description="Centralisez les demandes recues, arbitrez rapidement les decisions commerciales et gardez une vision propre de vos partenariats et produits disponibles."
        actions={
          <>
            <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/supplier/demandes")}>
              Ouvrir les demandes
            </Button>
            <Button variant="accent" className="bg-white text-cyan-700 hover:bg-cyan-50" onClick={() => navigate("/supplier/produits")}>
              Gerer les produits
            </Button>
          </>
        }
      />

      <InlineAlert message={error} type="error" />

      {loading ? (
        <LoadingState message="Chargement du dashboard fournisseur..." />
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard icon={ClipboardList} label="Demandes recues" value={stats.demandes_recues || 0} helper="Flux total des demandes a traiter" tone="cyan" />
            <MetricCard icon={Clock3} label="En attente" value={stats.en_attente || 0} helper="Demandes qui attendent une decision" tone="amber" />
            <MetricCard icon={CheckCircle2} label="Acceptees" value={stats.acceptees || 0} helper="Demandes valides cote fournisseur" tone="emerald" />
            <MetricCard icon={XCircle} label="Refusees" value={stats.refusees || 0} helper="Demandes cloturees negativement" tone="rose" />
            <MetricCard icon={Building2} label="Pharmacies partenaires" value={stats.pharmacies_partenaires || 0} helper="Reseau actif rattache a votre compte" tone="slate" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-slate-200/90 bg-white/95 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Demandes medicament recentes</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Les demandes les plus recentes pour ajuster vos priorites de livraison.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/supplier/demandes")}>
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentMedicineRequests.length === 0 ? (
                  <EmptyState
                    icon={Package2}
                    title="Aucune demande medicament recente"
                    description="Le flux s'alimentera automatiquement quand les pharmacies commenceront a vous solliciter."
                  />
                ) : (
                  recentMedicineRequests.map((item) => (
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
                      {item.response_note ? <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">{item.response_note}</div> : null}
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200/90 bg-white/95 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Demandes de partenariat recentes</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Vue rapide sur les nouvelles pharmacies a onboarder ou a refuser.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/supplier/demandes")}>
                  Traiter
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentPartnershipRequests.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="Aucune demande de partenariat recente"
                    description="Les nouvelles demandes de partenariat apparaitront ici des leur reception."
                  />
                ) : (
                  recentPartnershipRequests.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">Demande de partenariat</h3>
                          <p className="mt-1 text-sm text-slate-500">Pharmacie ID: {item.pharmacie_id}</p>
                          <p className="mt-2 text-xs text-slate-500">Creee le {formatDateTime(item.created_at)}</p>
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      {item.response_note ? <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">{item.response_note}</div> : null}
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {dashboardRoutes.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="rounded-3xl border border-slate-200 bg-white/95 p-5 text-left shadow-md transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
              >
                <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm text-slate-500">{item.description}</p>
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

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ClipboardList, Package2, Send, Store, XCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/modules/EmptyState";
import InlineAlert from "../../components/modules/InlineAlert";
import LoadingState from "../../components/modules/LoadingState";
import MetricCard from "../../components/modules/MetricCard";
import ModalPanel from "../../components/modules/ModalPanel";
import ModuleHero from "../../components/modules/ModuleHero";
import StatusPill from "../../components/modules/StatusPill";
import { formatDateTime, getErrorMessage, textareaClassName } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const KIND_FILTERS = [
  ["all", "Toutes"],
  ["medicament", "Medicaments"],
  ["partenariat", "Partenariats"],
];

const STATUS_FILTERS = [
  ["all", "Tous statuts"],
  ["en_attente", "En attente"],
  ["acceptee", "Acceptees"],
  ["refusee", "Refusees"],
];

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState("acceptee");
  const [responseNote, setResponseNote] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);

  const loadRequests = async () => {
    setLoading(true);

    try {
      const response = await api.get("/suppliers/me/request-center");
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Impossible de charger le centre des demandes."),
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(
    () => ({
      total: items.length,
      en_attente: items.filter((item) => item.status === "en_attente").length,
      acceptees: items.filter((item) => item.status === "acceptee").length,
      refusees: items.filter((item) => item.status === "refusee").length,
      partenariats: items.filter((item) => item.request_kind === "partenariat").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (kindFilter !== "all" && item.request_kind !== kindFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, kindFilter, statusFilter]);

  const submitDecision = async (event) => {
    event.preventDefault();
    if (!decisionTarget) return;

    setDecisionLoading(true);

    try {
      if (decisionTarget.request_kind === "partenariat") {
        await api.put(`/partnerships/requests/${decisionTarget.id}/respond`, {
          status: decisionStatus,
          response_note: responseNote.trim(),
        });
      } else {
        await api.put(`/demandes/${decisionTarget.id}/status`, {
          status: decisionStatus,
          response_note: responseNote.trim(),
        });
      }

      setNotice({
        type: "success",
        message: `Demande ${decisionStatus === "acceptee" ? "acceptee" : "refusee"} avec succes.`,
      });
      setDecisionTarget(null);
      setResponseNote("");
      await loadRequests();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(requestError, "Decision impossible pour cette demande."),
      });
    } finally {
      setDecisionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <ModuleHero
        eyebrow="Espace fournisseur"
        title="Centre des demandes"
        description="Traitez au meme endroit les demandes de reapprovisionnement et les demandes de partenariat, avec une decision motivee et une lecture claire des pharmacies."
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={ClipboardList} label="Total" value={stats.total || 0} helper="Demandes visibles dans le module" tone="cyan" />
        <MetricCard icon={Send} label="En attente" value={stats.en_attente || 0} helper="Demandes a traiter immediatement" tone="amber" />
        <MetricCard icon={CheckCircle2} label="Acceptees" value={stats.acceptees || 0} helper="Demandes validees par votre equipe" tone="emerald" />
        <MetricCard icon={XCircle} label="Refusees" value={stats.refusees || 0} helper="Demandes refusees avec commentaire" tone="rose" />
        <MetricCard icon={Building2} label="Partenariats" value={stats.partenariats || 0} helper="Demandes relatives aux nouvelles pharmacies" tone="slate" />
      </section>

      <Card className="border-slate-200/90 bg-white/95 shadow-md">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Flux de decision</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Filtrez les demandes par nature ou par statut pour accelerer le traitement.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-wrap gap-2">
              {KIND_FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKindFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    kindFilter === value
                      ? "bg-cyan-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    statusFilter === value
                      ? "bg-slate-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Chargement des demandes..." />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aucune demande a afficher"
              description="Ajustez les filtres ou attendez l'arrivee de nouvelles demandes."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredItems.map((item) => {
                const isPending = item.status === "en_attente";
                const kindLabel = item.request_kind === "partenariat" ? "Partenariat" : "Medicament";

                return (
                  <article key={`${item.request_kind}-${item.id}`} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{item.label}</p>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{kindLabel}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Recue le {formatDateTime(item.created_at)}</p>
                      </div>
                      <StatusPill status={item.status} />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pharmacie</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.nom_pharmacie || "Non renseignee"}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.president_pharmacie || "Responsable non renseigne"}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantite / contact</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.quantite ? `${item.quantite} unite(s)` : "Demande relationnelle"}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.pharmacie_email || "Email non renseigne"}</p>
                      </div>
                    </div>

                    {item.response_note ? (
                      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">{item.response_note}</div>
                    ) : null}

                    {isPending ? (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="success"
                          onClick={() => {
                            setDecisionTarget(item);
                            setDecisionStatus("acceptee");
                            setResponseNote("");
                          }}
                        >
                          Accepter
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setDecisionTarget(item);
                            setDecisionStatus("refusee");
                            setResponseNote("");
                          }}
                        >
                          Refuser
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
        open={Boolean(decisionTarget)}
        title={decisionTarget ? `Decision - ${decisionTarget.label}` : "Decision"}
        subtitle={decisionTarget ? decisionTarget.nom_pharmacie || "" : ""}
        onClose={() => {
          if (!decisionLoading) {
            setDecisionTarget(null);
            setResponseNote("");
          }
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={decisionLoading} onClick={() => setDecisionTarget(null)}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="decision-form"
              isLoading={decisionLoading}
              variant={decisionStatus === "acceptee" ? "success" : "danger"}
            >
              {decisionStatus === "acceptee" ? "Confirmer l'acceptation" : "Confirmer le refus"}
            </Button>
          </div>
        }
      >
        {decisionTarget ? (
          <form id="decision-form" onSubmit={submitDecision} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Pharmacie</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{decisionTarget.nom_pharmacie || "Non renseignee"}</p>
                <p className="mt-1 text-sm text-slate-600">{decisionTarget.president_pharmacie || "Responsable non renseigne"}</p>
                <p className="mt-1 text-sm text-slate-600">{decisionTarget.pharmacie_telephone || "Telephone non renseigne"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Demande</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{decisionTarget.label}</p>
                <p className="mt-1 text-sm text-slate-600">{decisionTarget.quantite ? `${decisionTarget.quantite} unite(s)` : "Partenariat"}</p>
                <p className="mt-1 text-sm text-slate-600">Recue le {formatDateTime(decisionTarget.created_at)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDecisionStatus("acceptee")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  decisionStatus === "acceptee"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                Accepter
              </button>
              <button
                type="button"
                onClick={() => setDecisionStatus("refusee")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  decisionStatus === "refusee"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-700"
                }`}
              >
                Refuser
              </button>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Motif ou commentaire</span>
              <textarea
                value={responseNote}
                onChange={(event) => setResponseNote(event.target.value)}
                className={textareaClassName}
                placeholder="Ajoutez un motif, une condition de livraison ou une precision commerciale."
              />
            </label>
          </form>
        ) : null}
      </ModalPanel>
    </div>
  );
}

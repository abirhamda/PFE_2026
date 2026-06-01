import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  RefreshCw,
  Stethoscope,
  Truck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import api from "../../lib/api";

const isActiveRecord = (record) => Number(record?.is_active) === 1 || record?.is_active === true;

const formatDate = (value) => {
  if (!value) return "Date indisponible";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const getSafeLabel = (value, fallback) => {
  const label = String(value || "").trim();
  return label || fallback;
};

const toPercent = (value, total) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const buildMonthlySeries = (entries) => {
  const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
  });
  const now = new Date();
  const months = [];

  for (let index = 5; index >= 0; index -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    months.push({
      key,
      label: monthFormatter.format(monthDate),
      total: 0,
      doctors: 0,
      pharmacies: 0,
      suppliers: 0,
    });
  }

  const monthMap = Object.fromEntries(months.map((month) => [month.key, month]));

  entries.forEach((entry) => {
    const parsed = new Date(entry.created_at);
    if (Number.isNaN(parsed.getTime())) return;

    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
    const month = monthMap[key];
    if (!month) return;

    month.total += 1;
    month[entry.type] += 1;
  });

  return months;
};

const buildTopSpecialties = (doctors) => {
  const counts = doctors.reduce((accumulator, doctor) => {
    const specialty = getSafeLabel(doctor?.specialty, "Non renseignee");
    accumulator[specialty] = (accumulator[specialty] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr"))
    .slice(0, 5);
};

const StatCard = ({ title, value, subtitle, icon: Icon, accent }) => (
  <Card className="border-slate-200/90 bg-white/95 shadow-md">
    <CardContent className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-4xl font-semibold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 text-white shadow-lg ${accent}`}>
          <Icon size={24} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const InsightCard = ({ title, value, helper, icon: Icon, tone }) => (
  <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
    <div className="flex items-start gap-4">
      <div className={`rounded-2xl p-3 ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
        <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{helper}</p>
      </div>
    </div>
  </div>
);

const DistributionDonut = ({ items, total }) => {
  if (!total) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Aucune donnee disponible pour la repartition.
      </div>
    );
  }

  let progress = 0;
  const slices = items
    .map((item) => {
      const start = progress;
      progress += (item.count / total) * 100;
      return `${item.color} ${start}% ${progress}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div
        className="relative flex h-52 w-52 items-center justify-center rounded-full shadow-inner"
        style={{ background: `conic-gradient(${slices})` }}
      >
        <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Total</span>
          <span className="mt-1 text-4xl font-bold text-slate-900">{total}</span>
          <span className="mt-1 text-sm text-slate-500">partenaires</span>
        </div>
      </div>

      <div className="w-full space-y-3 lg:max-w-xs">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-semibold text-slate-800">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{item.count}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{toPercent(item.count, total)}% du portefeuille admin</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const EvolutionChart = ({ data }) => {
  const width = 520;
  const height = 220;
  const paddingX = 28;
  const paddingY = 24;
  const baselineY = height - paddingY;
  const maxValue = Math.max(...data.map((item) => item.total), 1);
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : paddingX + stepX * index;
    const y = baselineY - (item.total / maxValue) * chartHeight;
    return { x, y, total: item.total, label: item.label };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints =
    points.length > 0
      ? `${points[0].x},${baselineY} ${polylinePoints} ${points[points.length - 1].x},${baselineY}`
      : "";

  const axisLabels = Array.from({ length: 4 }, (_, index) => {
    const value = Math.round((maxValue * (3 - index)) / 3);
    const y = paddingY + (chartHeight / 3) * index;
    return { value, y };
  });

  return (
    <div>
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
          {axisLabels.map((tick) => (
            <g key={`${tick.value}-${tick.y}`}>
              <line x1={paddingX} x2={width - paddingX} y1={tick.y} y2={tick.y} stroke="#dbeafe" strokeDasharray="5 5" />
              <text x={6} y={tick.y + 4} fontSize="11" fill="#64748b">
                {tick.value}
              </text>
            </g>
          ))}

          {areaPoints ? <polygon points={areaPoints} fill="rgba(8, 145, 178, 0.10)" /> : null}

          {polylinePoints ? (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#0891b2"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="#0f172a" stroke="#ffffff" strokeWidth="3" />
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {data.map((item) => (
          <div key={item.key} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{item.total}</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.doctors} med. | {item.pharmacies} pharm. | {item.suppliers} fourn.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const RankingBars = ({ items, emptyLabel }) => {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {index + 1}. {item.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">{toPercent(item.count, maxValue)}% du niveau du leader</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">{item.count}</span>
          </div>

          <div className="mt-3 h-2.5 rounded-full bg-slate-200">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-teal-500"
              style={{ width: `${(item.count / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const StatusRows = ({ items }) => (
  <div className="space-y-4">
    {items.map((item) => (
      <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-2 text-white shadow-sm" style={{ background: item.color }}>
              <item.icon size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">
                {item.active} actifs sur {item.count}
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-900">{toPercent(item.active, item.count)}%</span>
        </div>

        <div className="mt-3 h-2.5 rounded-full bg-slate-200">
          <div className="h-2.5 rounded-full" style={{ width: `${toPercent(item.active, item.count)}%`, background: item.color }} />
        </div>
      </div>
    ))}
  </div>
);

export default function DashboardAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [doctorsResponse, pharmaciesResponse, suppliersResponse] = await Promise.all([
        api.get("/admin/doctors"),
        api.get("/admin/pharmacies"),
        api.get("/admin/suppliers"),
      ]);

      setDoctors(Array.isArray(doctorsResponse.data?.doctors) ? doctorsResponse.data.doctors : []);
      setPharmacies(Array.isArray(pharmaciesResponse.data) ? pharmaciesResponse.data : []);
      setSuppliers(Array.isArray(suppliersResponse.data) ? suppliersResponse.data : []);
      setError("");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error || requestError?.message || "Impossible de charger le tableau de bord admin",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totals = {
    doctors: doctors.length,
    pharmacies: pharmacies.length,
    suppliers: suppliers.length,
  };

  const activeTotals = {
    doctors: doctors.filter((record) => isActiveRecord(record)).length,
    pharmacies: pharmacies.filter((record) => isActiveRecord(record)).length,
    suppliers: suppliers.filter((record) => isActiveRecord(record)).length,
  };

  const globalTotal = totals.doctors + totals.pharmacies + totals.suppliers;
  const globalActive = activeTotals.doctors + activeTotals.pharmacies + activeTotals.suppliers;
  const globalInactive = globalTotal - globalActive;

  const portfolioMix = [
    {
      label: "Medecins",
      count: totals.doctors,
      active: activeTotals.doctors,
      icon: Stethoscope,
      color: "#0891b2",
    },
    {
      label: "Pharmacies",
      count: totals.pharmacies,
      active: activeTotals.pharmacies,
      icon: Building2,
      color: "#10b981",
    },
    {
      label: "Fournisseurs",
      count: totals.suppliers,
      active: activeTotals.suppliers,
      icon: Truck,
      color: "#f59e0b",
    },
  ];

  const allPartnerEntries = [
    ...doctors.map((record) => ({ type: "doctors", created_at: record.created_at })),
    ...pharmacies.map((record) => ({ type: "pharmacies", created_at: record.created_at })),
    ...suppliers.map((record) => ({ type: "suppliers", created_at: record.created_at })),
  ];

  const monthlySeries = buildMonthlySeries(allPartnerEntries);
  const topSpecialties = buildTopSpecialties(doctors);
  const leadingPortfolio = [...portfolioMix].sort((left, right) => right.count - left.count)[0];
  const leadingSpecialty = topSpecialties[0];
  const activationRate = toPercent(globalActive, globalTotal);
  const mostRecentMonth = [...monthlySeries].reverse().find((month) => month.total > 0) || monthlySeries[monthlySeries.length - 1];

  const recentActivity = [
    ...doctors.map((record) => ({
      id: `doctor-${record.id}`,
      label: `Dr ${record.prenom || ""} ${record.nom || ""}`.trim(),
      description: record.specialty || "Medecin",
      created_at: record.created_at,
      target: "/admin/doctors",
      type: "Medecin",
      accent: "bg-cyan-100 text-cyan-700",
    })),
    ...pharmacies.map((record) => ({
      id: `pharmacy-${record.id_pharmacie}`,
      label: record.nom_pharmacie,
      description: record.president_pharmacie || "Pharmacie",
      created_at: record.created_at,
      target: "/admin/pharmacies",
      type: "Pharmacie",
      accent: "bg-emerald-100 text-emerald-700",
    })),
    ...suppliers.map((record) => ({
      id: `supplier-${record.id}`,
      label: `${record.prenom || ""} ${record.nom || ""}`.trim(),
      description: record.email || "Fournisseur",
      created_at: record.created_at,
      target: "/admin/suppliers",
      type: "Fournisseur",
      accent: "bg-amber-100 text-amber-700",
    })),
  ]
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <p className="text-xs uppercase tracking-wider text-cyan-100">Module administrateur</p>
        <h1 className="mt-1 text-3xl font-bold">Tableau de bord administration</h1>
        <p className="mt-1 text-sm text-cyan-100">
          Vue de pilotage professionnelle pour suivre le volume, l'etat et les tendances des partenaires de l'application.
        </p>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="flex justify-end">
        <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={loadDashboard} isLoading={loading}>
          Actualiser
        </Button>
      </section>

      <section className="grid gap-5 xl:grid-cols-4">
        <StatCard
          title="Medecins"
          value={totals.doctors}
          subtitle={`${activeTotals.doctors} actifs`}
          icon={Stethoscope}
          accent="bg-gradient-to-br from-cyan-600 to-sky-600"
        />
        <StatCard
          title="Pharmacies"
          value={totals.pharmacies}
          subtitle={`${activeTotals.pharmacies} actives`}
          icon={Building2}
          accent="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Fournisseurs"
          value={totals.suppliers}
          subtitle={`${activeTotals.suppliers} actifs`}
          icon={Truck}
          accent="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatCard
          title="Couverture admin"
          value={globalTotal}
          subtitle={`${globalActive} actifs, ${globalInactive} inactifs`}
          icon={Users}
          accent="bg-gradient-to-br from-slate-700 to-slate-900"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          title="Categorie majoritaire"
          value={leadingPortfolio ? leadingPortfolio.label : "Aucune donnee"}
          helper={leadingPortfolio ? `${leadingPortfolio.count} comptes suivis actuellement.` : "Le portefeuille admin est vide."}
          icon={BarChart3}
          tone="bg-cyan-100 text-cyan-700"
        />
        <InsightCard
          title="Specialite dominante"
          value={leadingSpecialty ? leadingSpecialty.label : "Aucune specialite"}
          helper={leadingSpecialty ? `${leadingSpecialty.count} medecin(s) sur la meme specialite.` : "Ajoutez des medecins pour alimenter l'analyse."}
          icon={Stethoscope}
          tone="bg-emerald-100 text-emerald-700"
        />
        <InsightCard
          title="Taux d'activation"
          value={`${activationRate}%`}
          helper={
            mostRecentMonth
              ? `${mostRecentMonth.total} nouveau(x) partenaire(s) sur ${mostRecentMonth.label}.`
              : "Aucune evolution recente disponible."
          }
          icon={Activity}
          tone="bg-amber-100 text-amber-700"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200/90 bg-white/95 shadow-md">
          <CardContent className="p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Courbe d'evolution des partenaires</h2>
              <p className="mt-1 text-sm text-slate-500">
                Suivi des comptes medecins, pharmacies et fournisseurs ajoutes sur les six derniers mois.
              </p>
            </div>

            <div className="mt-6">
              <EvolutionChart data={monthlySeries} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white/95 shadow-md">
          <CardContent className="p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Repartition du portefeuille</h2>
              <p className="mt-1 text-sm text-slate-500">
                Vue immediate sur la categorie de partenaires la plus representee dans l'application.
              </p>
            </div>

            <div className="mt-6">
              <DistributionDonut items={portfolioMix} total={globalTotal} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/90 bg-white/95 shadow-md">
          <CardContent className="p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Specialites medecins les plus presentes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ideal pour voir rapidement les poles medicaux les plus forts de votre ecosysteme.
              </p>
            </div>

            <div className="mt-6">
              <RankingBars items={topSpecialties} emptyLabel="Aucune specialite disponible pour le moment." />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white/95 shadow-md">
          <CardContent className="p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Etat operationnel par module</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mesurez le taux d'activation reel pour prioriser les relances ou la moderation admin.
              </p>
            </div>

            <div className="mt-6">
              <StatusRows items={portfolioMix} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200/90 bg-white/95 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Activite recente</h2>
                <p className="mt-1 text-sm text-slate-500">Les derniers comptes crees ou visibles dans l'administration.</p>
              </div>
              <div className="hidden rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 sm:inline-flex">
                Supervision en direct
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {recentActivity.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Aucune activite a afficher pour le moment.
                </div>
              ) : (
                recentActivity.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => navigate(entry.target)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50/40"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.accent}`}>{entry.type}</span>
                        <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{entry.description}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{formatDate(entry.created_at)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white/95 shadow-md">
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold text-slate-900">Acces rapides</h2>
            <p className="mt-1 text-sm text-slate-500">Passez directement au module que vous voulez administrer.</p>

            <div className="mt-6 space-y-3">
              {[
                {
                  label: "Gerer les medecins",
                  helper: "Ajout, activation, recherche et suppression",
                  icon: Stethoscope,
                  target: "/admin/doctors",
                },
                {
                  label: "Gerer les pharmacies",
                  helper: "Suivi des comptes pharmaciens et officines",
                  icon: Building2,
                  target: "/admin/pharmacies",
                },
                {
                  label: "Gerer les fournisseurs",
                  helper: "Module admin complet pour les fournisseurs",
                  icon: Truck,
                  target: "/admin/suppliers",
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.target)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

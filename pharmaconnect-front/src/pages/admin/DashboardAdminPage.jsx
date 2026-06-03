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

const StatCard = ({ title, value, subtitle, icon: Icon, iconBg }) => (
  <div className="bg-card rounded-card border border-border shadow-card p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</p>
        <p className="mt-2.5 text-3xl font-semibold text-text-primary">{value}</p>
        <p className="mt-1.5 text-xs text-text-secondary">{subtitle}</p>
      </div>
      <div className={`rounded-lg p-2.5 flex-shrink-0 ${iconBg}`}>
        <Icon size={19} />
      </div>
    </div>
  </div>
);

const InsightCard = ({ title, value, helper, icon: Icon, tone }) => (
  <div className="bg-card rounded-card border border-border shadow-card p-5">
    <div className="flex items-start gap-4">
      <div className={`rounded-lg p-2.5 flex-shrink-0 ${tone}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">{title}</p>
        <p className="mt-1.5 text-lg font-semibold text-text-primary">{value}</p>
        <p className="mt-0.5 text-xs text-text-secondary leading-snug">{helper}</p>
      </div>
    </div>
  </div>
);

const DistributionDonut = ({ items, total }) => {
  if (!total) {
    return (
      <div className="rounded-card border border-dashed border-border bg-gray-50 px-4 py-10 text-center text-sm text-text-secondary">
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
        className="relative flex h-48 w-48 items-center justify-center rounded-full shadow-inner flex-shrink-0"
        style={{ background: `conic-gradient(${slices})` }}
      >
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">Total</span>
          <span className="mt-0.5 text-3xl font-bold text-text-primary">{total}</span>
          <span className="mt-0.5 text-xs text-text-secondary">partenaires</span>
        </div>
      </div>

      <div className="w-full space-y-2.5 lg:max-w-xs">
        {items.map((item) => (
          <div key={item.label} className="rounded-card border border-border bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-text-primary">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-text-primary">{item.count}</span>
            </div>
            <p className="mt-0.5 text-xs text-text-secondary pl-5.5">
              {toPercent(item.count, total)}% du portefeuille admin
            </p>
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
      <div className="rounded-card border border-border bg-gray-50 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
          {axisLabels.map((tick) => (
            <g key={`${tick.value}-${tick.y}`}>
              <line x1={paddingX} x2={width - paddingX} y1={tick.y} y2={tick.y} stroke="#dde3ec" strokeDasharray="5 5" />
              <text x={6} y={tick.y + 4} fontSize="11" fill="#5a6a7e">
                {tick.value}
              </text>
            </g>
          ))}

          {areaPoints ? <polygon points={areaPoints} fill="rgba(30, 111, 217, 0.08)" /> : null}

          {polylinePoints ? (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#1e6fd9"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="4" fill="#0f2d4a" stroke="#ffffff" strokeWidth="2.5" />
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {data.map((item) => (
          <div key={item.key} className="bg-card rounded-card border border-border shadow-card px-3 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-text-secondary">{item.label}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{item.total}</p>
            <p className="mt-0.5 text-[10px] text-text-muted">
              {item.doctors}m · {item.pharmacies}p · {item.suppliers}f
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
      <div className="rounded-card border border-dashed border-border bg-gray-50 px-4 py-10 text-center text-sm text-text-secondary">
        {emptyLabel}
      </div>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.label} className="bg-gray-50 rounded-lg border border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {index + 1}. {item.label}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">{toPercent(item.count, maxValue)}% du leader</p>
            </div>
            <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent flex-shrink-0">
              {item.count}
            </span>
          </div>

          <div className="mt-2.5 h-2 rounded-full bg-border">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${(item.count / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const StatusRows = ({ items }) => (
  <div className="space-y-3">
    {items.map((item) => (
      <div key={item.label} className="bg-gray-50 rounded-lg border border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 text-white flex-shrink-0" style={{ background: item.color }}>
              <item.icon size={14} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{item.label}</p>
              <p className="text-xs text-text-secondary">
                {item.active} actifs sur {item.count}
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-text-primary">{toPercent(item.active, item.count)}%</span>
        </div>

        <div className="mt-2.5 h-2 rounded-full bg-border">
          <div className="h-2 rounded-full" style={{ width: `${toPercent(item.active, item.count)}%`, background: item.color }} />
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
    { label: "Medecins",     count: totals.doctors,    active: activeTotals.doctors,    icon: Stethoscope, color: "#1e6fd9" },
    { label: "Pharmacies",   count: totals.pharmacies, active: activeTotals.pharmacies, icon: Building2,   color: "#0d6e4f" },
    { label: "Fournisseurs", count: totals.suppliers,  active: activeTotals.suppliers,  icon: Truck,       color: "#b45309" },
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
      accent: "bg-accent-light text-accent",
    })),
    ...pharmacies.map((record) => ({
      id: `pharmacy-${record.id_pharmacie}`,
      label: record.nom_pharmacie,
      description: record.president_pharmacie || "Pharmacie",
      created_at: record.created_at,
      target: "/admin/pharmacies",
      type: "Pharmacie",
      accent: "bg-medical-success-bg text-medical-success",
    })),
    ...suppliers.map((record) => ({
      id: `supplier-${record.id}`,
      label: `${record.prenom || ""} ${record.nom || ""}`.trim(),
      description: record.email || "Fournisseur",
      created_at: record.created_at,
      target: "/admin/suppliers",
      type: "Fournisseur",
      accent: "bg-medical-warning-bg text-medical-warning",
    })),
  ]
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .slice(0, 6);

  return (
    <div className="space-y-6">

      {/* Error */}
      {error ? (
        <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" variant="outline" leftIcon={<RefreshCw size={15} />} onClick={loadDashboard} isLoading={loading}>
          Actualiser
        </Button>
      </div>

      {/* Stat cards */}
      <section className="grid gap-4 xl:grid-cols-4">
        <StatCard title="Medecins"         value={totals.doctors}    subtitle={`${activeTotals.doctors} actifs`}    icon={Stethoscope} iconBg="bg-accent-light text-accent" />
        <StatCard title="Pharmacies"       value={totals.pharmacies} subtitle={`${activeTotals.pharmacies} actives`} icon={Building2}   iconBg="bg-medical-success-bg text-medical-success" />
        <StatCard title="Fournisseurs"     value={totals.suppliers}  subtitle={`${activeTotals.suppliers} actifs`}  icon={Truck}       iconBg="bg-medical-warning-bg text-medical-warning" />
        <StatCard title="Couverture admin" value={globalTotal}       subtitle={`${globalActive} actifs, ${globalInactive} inactifs`} icon={Users} iconBg="bg-gray-100 text-gray-600" />
      </section>

      {/* Insight cards */}
      <section className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          title="Categorie majoritaire"
          value={leadingPortfolio ? leadingPortfolio.label : "Aucune donnee"}
          helper={leadingPortfolio ? `${leadingPortfolio.count} comptes suivis.` : "Le portefeuille admin est vide."}
          icon={BarChart3}
          tone="bg-accent-light text-accent"
        />
        <InsightCard
          title="Specialite dominante"
          value={leadingSpecialty ? leadingSpecialty.label : "Aucune specialite"}
          helper={leadingSpecialty ? `${leadingSpecialty.count} medecin(s) sur cette specialite.` : "Ajoutez des medecins pour alimenter l'analyse."}
          icon={Stethoscope}
          tone="bg-medical-success-bg text-medical-success"
        />
        <InsightCard
          title="Taux d'activation"
          value={`${activationRate}%`}
          helper={
            mostRecentMonth
              ? `${mostRecentMonth.total} nouveau(x) partenaire(s) sur ${mostRecentMonth.label}.`
              : "Aucune evolution recente."
          }
          icon={Activity}
          tone="bg-medical-warning-bg text-medical-warning"
        />
      </section>

      {/* Charts row */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-card rounded-card border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-text-primary tracking-wide">Courbe d'evolution des partenaires</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Suivi des comptes sur les six derniers mois.</p>
          <div className="mt-5">
            <EvolutionChart data={monthlySeries} />
          </div>
        </div>

        <div className="bg-card rounded-card border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-text-primary tracking-wide">Repartition du portefeuille</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Vue immediate sur la categorie la plus representee.</p>
          <div className="mt-5">
            <DistributionDonut items={portfolioMix} total={globalTotal} />
          </div>
        </div>
      </section>

      {/* Ranking + Status */}
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="bg-card rounded-card border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-text-primary tracking-wide">Specialites medecins les plus presentes</h2>
          <p className="mt-0.5 text-xs text-text-secondary mb-4">Poles medicaux les plus forts de votre ecosysteme.</p>
          <RankingBars items={topSpecialties} emptyLabel="Aucune specialite disponible pour le moment." />
        </div>

        <div className="bg-card rounded-card border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-text-primary tracking-wide">Etat operationnel par module</h2>
          <p className="mt-0.5 text-xs text-text-secondary mb-4">Taux d'activation reel par categorie de partenaire.</p>
          <StatusRows items={portfolioMix} />
        </div>
      </section>

      {/* Activity + Quick access */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-card rounded-card border border-border shadow-card p-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary tracking-wide">Activite recente</h2>
              <p className="mt-0.5 text-xs text-text-secondary">Les derniers comptes crees dans l'administration.</p>
            </div>
            <span className="hidden bg-medical-success-bg text-medical-success text-xs font-medium px-3 py-1 rounded-full sm:inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-medical-success animate-pulse" />
              En direct
            </span>
          </div>

          <div className="space-y-2.5">
            {recentActivity.length === 0 ? (
              <div className="rounded-card border border-dashed border-border bg-gray-50 px-4 py-10 text-center text-sm text-text-secondary">
                Aucune activite a afficher pour le moment.
              </div>
            ) : (
              recentActivity.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => navigate(entry.target)}
                  className="flex w-full items-center justify-between rounded-card border border-border bg-gray-50/60 px-4 py-3.5 text-left transition-all hover:border-accent/30 hover:shadow-card"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.accent}`}>{entry.type}</span>
                      <p className="text-sm font-medium text-text-primary">{entry.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">{entry.description}</p>
                  </div>
                  <p className="text-xs text-text-muted flex-shrink-0 ml-3">{formatDate(entry.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-card border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-text-primary tracking-wide mb-1">Acces rapides</h2>
          <p className="text-xs text-text-secondary mb-5">Passez directement au module a administrer.</p>

          <div className="space-y-2.5">
            {[
              { label: "Gerer les medecins",    helper: "Ajout, activation, recherche",       icon: Stethoscope, target: "/admin/doctors" },
              { label: "Gerer les pharmacies",  helper: "Comptes pharmaciens et officines",    icon: Building2,   target: "/admin/pharmacies" },
              { label: "Gerer les fournisseurs",helper: "Module admin complet fournisseurs",   icon: Truck,       target: "/admin/suppliers" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.target)}
                className="flex w-full items-center justify-between rounded-card border border-border bg-gray-50 px-4 py-3.5 text-left transition-all hover:border-accent/30 hover:shadow-card"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-accent-light p-2.5 text-accent flex-shrink-0">
                    <item.icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">{item.helper}</p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-text-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

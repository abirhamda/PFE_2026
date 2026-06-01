import React from "react";

const statusMap = {
  disponible: "bg-emerald-100 text-emerald-700",
  faible_stock: "bg-amber-100 text-amber-700",
  rupture: "bg-rose-100 text-rose-700",
  en_attente: "bg-amber-100 text-amber-700",
  acceptee: "bg-emerald-100 text-emerald-700",
  recue: "bg-cyan-100 text-cyan-700",
  refusee: "bg-rose-100 text-rose-700",
  non_livree: "bg-slate-100 text-slate-700",
  partenaire: "bg-cyan-100 text-cyan-700",
  disponible_supplier: "bg-slate-100 text-slate-700",
};

const labels = {
  disponible: "Disponible",
  faible_stock: "Faible stock",
  rupture: "Rupture",
  en_attente: "En attente",
  acceptee: "Acceptee",
  recue: "Recue",
  refusee: "Refusee",
  non_livree: "Non livree",
  partenaire: "Partenaire",
  disponible_supplier: "Disponible",
};

export default function StatusPill({ status, children, className = "" }) {
  const key = status || "disponible_supplier";
  const tone = statusMap[key] || statusMap.disponible_supplier;
  const label = children || labels[key] || String(status || "Statut");

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone} ${className}`}>{label}</span>;
}

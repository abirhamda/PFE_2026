import React from "react";

const statusMap = {
  disponible:          "bg-medical-success-bg text-medical-success",
  faible_stock:        "bg-medical-warning-bg text-medical-warning",
  rupture:             "bg-medical-danger-bg text-medical-danger",
  en_attente:          "bg-medical-warning-bg text-medical-warning",
  acceptee:            "bg-medical-success-bg text-medical-success",
  recue:               "bg-accent-light text-accent",
  refusee:             "bg-medical-danger-bg text-medical-danger",
  non_livree:          "bg-gray-100 text-gray-600",
  partenaire:          "bg-accent-light text-accent",
  disponible_supplier: "bg-gray-100 text-gray-600",
};

const labels = {
  disponible:          "Disponible",
  faible_stock:        "Faible stock",
  rupture:             "Rupture",
  en_attente:          "En attente",
  acceptee:            "Acceptee",
  recue:               "Recue",
  refusee:             "Refusee",
  non_livree:          "Non livree",
  partenaire:          "Partenaire",
  disponible_supplier: "Disponible",
};

export default function StatusPill({ status, children, className = "" }) {
  const key = status || "disponible_supplier";
  const tone = statusMap[key] || statusMap.disponible_supplier;
  const label = children || labels[key] || String(status || "Statut");

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone} ${className}`}>
      {label}
    </span>
  );
}

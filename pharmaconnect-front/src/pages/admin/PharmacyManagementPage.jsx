import React from "react";
import { Building2 } from "lucide-react";
import AdminEntityPage from "../../components/admin/AdminEntityPage";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatStatus = (record) => ((Number(record?.is_active) === 1 || record?.is_active === true) ? "Actif" : "Inactif");

const pharmacyFields = [
  {
    name: "nom_pharmacie",
    label: "Nom de la pharmacie",
    required: true,
    placeholder: "Ex. Pharmacie El Medina",
  },
  {
    name: "president_pharmacie",
    label: "Nom du pharmacien responsable",
    required: true,
    placeholder: "Ex. Hela Trabelsi",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "pharmacie@medicare.tn",
  },
  {
    name: "telephone",
    label: "Telephone",
    required: true,
    placeholder: "73 000 000",
  },
  {
    name: "password",
    label: "Mot de passe",
    type: "password",
    required: true,
    addOnly: true,
    placeholder: "6 caracteres minimum",
  },
];

const pharmacySummaryFields = [
  { label: "Responsable", render: (record) => record.president_pharmacie || "Non renseigne" },
  { label: "Email", render: (record) => record.email || "Non renseigne" },
  { label: "Telephone", render: (record) => record.telephone || "Non renseigne" },
  { label: "Statut", render: formatStatus },
];

const pharmacyDetailFields = [
  { label: "Pharmacie", render: (record) => record.nom_pharmacie || "Non renseignee" },
  { label: "Pharmacien responsable", render: (record) => record.president_pharmacie || "Non renseigne" },
  { label: "Email", name: "email" },
  { label: "Telephone", name: "telephone" },
  { label: "Statut", render: formatStatus },
  { label: "Creation", render: (record) => record.created_at || "Non renseignee" },
];

const validatePharmacyForm = (values, mode) => {
  if (!emailRegex.test(String(values.email || "").trim())) {
    return "Le format de l'email est invalide";
  }

  if (mode === "add" && String(values.password || "").length < 6) {
    return "Le mot de passe doit contenir au moins 6 caracteres";
  }

  return "";
};

export default function PharmacyManagementPage() {
  return (
    <AdminEntityPage
      title="Gestion des Pharmacies"
      description="Gerez les comptes pharmaciens et les fiches pharmacies avec le meme langage visuel que le reste de l'application."
      entityLabel="Pharmacie"
      entityLabelPlural="Pharmacies"
      endpoint="/admin/pharmacies"
      icon={Building2}
      fields={pharmacyFields}
      detailFields={pharmacyDetailFields}
      summaryFields={pharmacySummaryFields}
      mapListResponse={(data) => (Array.isArray(data) ? data : [])}
      mapItemResponse={(data) => data?.pharmacy || null}
      buildCreatePayload={(values) => ({
        nom_pharmacie: values.nom_pharmacie.trim(),
        president_pharmacie: values.president_pharmacie.trim(),
        email: values.email.trim().toLowerCase(),
        telephone: values.telephone.trim(),
        password: values.password,
      })}
      buildUpdatePayload={(values) => ({
        nom_pharmacie: values.nom_pharmacie.trim(),
        president_pharmacie: values.president_pharmacie.trim(),
        email: values.email.trim().toLowerCase(),
        telephone: values.telephone.trim(),
      })}
      getRecordId={(record) => record.id_pharmacie}
      getRecordTitle={(record) => record.nom_pharmacie || "Pharmacie"}
      getRecordSubtitle={(record) => record.president_pharmacie || "Responsable non renseigne"}
      getSearchableText={(record) =>
        [record.nom_pharmacie, record.president_pharmacie, record.email, record.telephone].filter(Boolean).join(" ")
      }
      validateForm={validatePharmacyForm}
    />
  );
}

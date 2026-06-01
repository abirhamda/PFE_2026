import React from "react";
import { Truck } from "lucide-react";
import AdminEntityPage from "../../components/admin/AdminEntityPage";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatStatus = (record) => ((Number(record?.is_active) === 1 || record?.is_active === true) ? "Actif" : "Inactif");

const supplierFields = [
  { name: "nom", label: "Nom", required: true, placeholder: "Ex. Jlassi" },
  { name: "prenom", label: "Prenom", required: true, placeholder: "Ex. Marwa" },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "fournisseur@medicare.tn",
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

const supplierSummaryFields = [
  { label: "Email", render: (record) => record.email || "Non renseigne" },
  { label: "Telephone", render: (record) => record.telephone || "Non renseigne" },
  { label: "Statut", render: formatStatus },
  { label: "Type", render: () => "Fournisseur" },
];

const supplierDetailFields = [
  { label: "Nom complet", render: (record) => `${record.prenom || ""} ${record.nom || ""}`.trim() },
  { label: "Email", name: "email" },
  { label: "Telephone", name: "telephone" },
  { label: "Statut", render: formatStatus },
  { label: "Creation", render: (record) => record.created_at || "Non renseignee" },
  { label: "Role", render: () => "Fournisseur" },
];

const validateSupplierForm = (values, mode) => {
  if (!emailRegex.test(String(values.email || "").trim())) {
    return "Le format de l'email est invalide";
  }

  if (mode === "add" && String(values.password || "").length < 6) {
    return "Le mot de passe doit contenir au moins 6 caracteres";
  }

  return "";
};

export default function SupplierManagementPage() {
  return (
    <AdminEntityPage
      title="Gestion des Fournisseurs"
      description="L'administrateur peut maintenant gerer l'ensemble des fournisseurs: ajout, consultation, recherche, activation, desactivation et suppression."
      entityLabel="Fournisseur"
      entityLabelPlural="Fournisseurs"
      endpoint="/admin/suppliers"
      icon={Truck}
      fields={supplierFields}
      detailFields={supplierDetailFields}
      summaryFields={supplierSummaryFields}
      mapListResponse={(data) => (Array.isArray(data) ? data : [])}
      mapItemResponse={(data) => data?.supplier || null}
      buildCreatePayload={(values) => ({
        nom: values.nom.trim(),
        prenom: values.prenom.trim(),
        email: values.email.trim().toLowerCase(),
        telephone: values.telephone.trim(),
        password: values.password,
      })}
      buildUpdatePayload={(values) => ({
        nom: values.nom.trim(),
        prenom: values.prenom.trim(),
        email: values.email.trim().toLowerCase(),
        telephone: values.telephone.trim(),
      })}
      getRecordId={(record) => record.id}
      getRecordTitle={(record) => `${record.prenom || ""} ${record.nom || ""}`.trim()}
      getRecordSubtitle={(record) => record.email || "Email non renseigne"}
      getSearchableText={(record) =>
        [record.nom, record.prenom, record.email, record.telephone].filter(Boolean).join(" ")
      }
      validateForm={validateSupplierForm}
    />
  );
}

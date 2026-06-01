import React from "react";
import { Stethoscope } from "lucide-react";
import AdminEntityPage from "../../components/admin/AdminEntityPage";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatStatus = (record) => ((Number(record?.is_active) === 1 || record?.is_active === true) ? "Actif" : "Inactif");

const doctorFields = [
  { name: "nom", label: "Nom", required: true, placeholder: "Ex. Ben Salah" },
  { name: "prenom", label: "Prenom", required: true, placeholder: "Ex. Amine" },
  { name: "email", label: "Email", type: "email", required: true, placeholder: "medecin@medicare.tn" },
  {
    name: "motDePasse",
    label: "Mot de passe",
    type: "password",
    required: true,
    addOnly: true,
    placeholder: "6 caracteres minimum",
  },
  { name: "cin", label: "CIN", required: true, placeholder: "12345678" },
  { name: "specialite", sourceKey: "specialty", label: "Specialite", required: true, placeholder: "Cardiologie" },
];

const doctorSummaryFields = [
  { label: "Email", render: (record) => record.email || "Non renseigne" },
  { label: "CIN", render: (record) => record.cin || "Non renseigne" },
  { label: "Specialite", render: (record) => record.specialty || "Non renseignee" },
  { label: "Statut", render: formatStatus },
];

const doctorDetailFields = [
  { label: "Nom complet", render: (record) => `Dr ${record.prenom || ""} ${record.nom || ""}`.trim() },
  { label: "Specialite", render: (record) => record.specialty || "Non renseignee" },
  { label: "Email", name: "email" },
  { label: "CIN", name: "cin" },
  { label: "Statut", render: formatStatus },
  { label: "Creation", render: (record) => record.created_at || "Non renseignee" },
];

const validateDoctorForm = (values, mode) => {
  if (!emailRegex.test(String(values.email || "").trim())) {
    return "Le format de l'email est invalide";
  }

  if (String(values.cin || "").trim().length < 8) {
    return "Le CIN doit contenir au moins 8 caracteres";
  }

  if (mode === "add" && String(values.motDePasse || "").length < 6) {
    return "Le mot de passe doit contenir au moins 6 caracteres";
  }

  return "";
};

export default function DocteurPage() {
  return (
    <AdminEntityPage
      title="Gestion des Medecins"
      description="Ajoutez, consultez, recherchez, modifiez, activez ou supprimez les comptes medecins depuis une interface admin unifiee."
      entityLabel="Medecin"
      entityLabelPlural="Medecins"
      endpoint="/admin/doctors"
      icon={Stethoscope}
      fields={doctorFields}
      detailFields={doctorDetailFields}
      summaryFields={doctorSummaryFields}
      mapListResponse={(data) => (Array.isArray(data?.doctors) ? data.doctors : [])}
      mapItemResponse={(data) => data?.doctor || null}
      buildCreatePayload={(values) => ({
        firstName: values.prenom.trim(),
        lastName: values.nom.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.motDePasse,
        cin: values.cin.trim(),
        specialty: values.specialite.trim(),
      })}
      buildUpdatePayload={(values) => ({
        firstName: values.prenom.trim(),
        lastName: values.nom.trim(),
        email: values.email.trim().toLowerCase(),
        cin: values.cin.trim(),
        specialty: values.specialite.trim(),
      })}
      getRecordId={(record) => record.id}
      getRecordTitle={(record) => `Dr ${record.prenom || ""} ${record.nom || ""}`.trim()}
      getRecordSubtitle={(record) => record.specialty || "Specialite non renseignee"}
      getSearchableText={(record) =>
        [record.nom, record.prenom, record.email, record.cin, record.specialty].filter(Boolean).join(" ")
      }
      validateForm={validateDoctorForm}
    />
  );
}

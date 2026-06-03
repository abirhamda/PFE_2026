import React, { useEffect, useState } from "react";
import { Building2, Mail, MapPin, Phone, Save, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "../lib/api";
import { getErrorMessage, inputClassName } from "../components/modules/moduleUtils";

const buildInitialForm = (role, user) => ({
  prenom: user?.prenom || "",
  nom: user?.nom || "",
  name: user?.name || "",
  email: user?.email || "",
  phone: user?.phone || "",
  cin: user?.cin || "",
  date_naissance: user?.date_naissance || "",
  city: user?.city || "",
  nom_pharmacie: user?.nom_pharmacie || user?.name || "",
  president_pharmacie: user?.president_pharmacie || "",
  role,
});

const PAGE_COPY = {
  pharmacist: {
    title: "Profil pharmacie",
    description: "Mettez a jour les informations de votre officine et du pharmacien responsable.",
  },
  supplier: {
    title: "Profil fournisseur",
    description: "Maintenez des coordonnees propres pour vos partenaires et vos demandes.",
  },
  pation: {
    title: "Mon profil",
    description: "Mettez a jour vos informations personnelles.",
  },
  default: {
    title: "Mon profil",
    description: "Mettez a jour vos informations personnelles.",
  },
};

const InputWithIcon = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
    <input {...props} className={`${inputClassName} pl-9 ${props.className || ""}`} />
  </div>
);

const LabelText = ({ children }) => (
  <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{children}</span>
);

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const isPatient = role === "pation";
  const isPharmacist = role === "pharmacist";
  const isSupplier = role === "supplier";

  const [formData, setFormData] = useState(buildInitialForm(role, user));
  const [loading, setLoading] = useState(isPatient || isPharmacist || isSupplier);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData(buildInitialForm(role, user));
  }, [role, user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!isPatient && !isPharmacist && !isSupplier) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        if (isPatient) {
          const response = await api.get("/patient-portal/me");
          const profile = response.data?.profile;
          if (!profile) return;

          setFormData((current) => ({
            ...current,
            prenom: profile.prenom || "",
            nom: profile.nom || "",
            name: [profile.prenom, profile.nom].filter(Boolean).join(" ").trim(),
            email: profile.email || current.email,
            phone: profile.telephone || "",
            cin: profile.cin || "",
            date_naissance: profile.date_naissance || "",
            city: profile.city || "",
          }));
          return;
        }

        if (isPharmacist) {
          const response = await api.get("/pharmacy/me");
          const profile = response.data?.profile;
          if (!profile) return;

          setFormData((current) => ({
            ...current,
            nom_pharmacie: profile.nom_pharmacie || "",
            president_pharmacie: profile.president_pharmacie || "",
            email: profile.email || current.email,
            phone: profile.telephone || "",
            name: profile.nom_pharmacie || current.name,
          }));
          return;
        }

        const response = await api.get("/suppliers/me");
        const profile = response.data?.profile;
        if (!profile) return;

        setFormData((current) => ({
          ...current,
          prenom: profile.prenom || "",
          nom: profile.nom || "",
          name: [profile.prenom, profile.nom].filter(Boolean).join(" ").trim(),
          email: profile.email || current.email,
          phone: profile.telephone || "",
        }));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Impossible de charger le profil."));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isPatient, isPharmacist, isSupplier]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      if (isPatient) {
        await api.put("/patient-portal/me", {
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.phone || null,
          cin: formData.cin || null,
          date_naissance: formData.date_naissance || null,
          city: formData.city || null,
        });

        await updateProfile({
          ...user,
          ...formData,
          name: [formData.prenom, formData.nom].filter(Boolean).join(" ").trim(),
        });
        setMessage("Profil patient mis a jour.");
        return;
      }

      if (isPharmacist) {
        await api.put("/pharmacy/me/profile", {
          nom_pharmacie: formData.nom_pharmacie.trim(),
          president_pharmacie: formData.president_pharmacie.trim(),
          email: formData.email.trim(),
          telephone: formData.phone.trim(),
        });

        await updateProfile({
          ...user,
          nom_pharmacie: formData.nom_pharmacie.trim(),
          president_pharmacie: formData.president_pharmacie.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          name: formData.nom_pharmacie.trim(),
        });
        setMessage("Profil pharmacie mis a jour.");
        return;
      }

      if (isSupplier) {
        await api.put("/suppliers/me/profile", {
          nom: formData.nom.trim(),
          prenom: formData.prenom.trim(),
          email: formData.email.trim(),
          telephone: formData.phone.trim(),
        });

        await updateProfile({
          ...user,
          nom: formData.nom.trim(),
          prenom: formData.prenom.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          name: [formData.prenom, formData.nom].filter(Boolean).join(" ").trim(),
        });
        setMessage("Profil fournisseur mis a jour.");
        return;
      }

      await updateProfile({
        ...user,
        ...formData,
        name: formData.name || [formData.prenom, formData.nom].filter(Boolean).join(" ").trim(),
      });

      setMessage("Profil mis a jour.");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Mise a jour impossible."));
    } finally {
      setIsSaving(false);
    }
  };

  const copy = PAGE_COPY[role] || PAGE_COPY.default;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header card */}
      <div className="bg-primary rounded-card border border-primary/20 shadow-card px-5 py-4">
        <h1 className="text-lg font-semibold text-white">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-white/65">{copy.description}</p>
      </div>

      <div className="bg-card rounded-card border border-border shadow-card p-5">
        {message ? (
          <div className="mb-4 rounded-card border-l-4 border-medical-success bg-medical-success-bg px-4 py-3 text-sm text-medical-success">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="mb-4 rounded-card border border-dashed border-border bg-gray-50 px-4 py-3 text-sm text-text-secondary">
            Chargement du profil...
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isPharmacist ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 sm:col-span-2">
                  <LabelText>Nom de la pharmacie</LabelText>
                  <InputWithIcon icon={Building2} name="nom_pharmacie" value={formData.nom_pharmacie} onChange={handleChange} placeholder="Nom commercial de la pharmacie" />
                </label>

                <label className="space-y-1.5">
                  <LabelText>Pharmacien responsable</LabelText>
                  <InputWithIcon icon={UserRound} name="president_pharmacie" value={formData.president_pharmacie} onChange={handleChange} placeholder="Nom du responsable" />
                </label>

                <label className="space-y-1.5">
                  <LabelText>Telephone</LabelText>
                  <InputWithIcon icon={Phone} name="phone" value={formData.phone} onChange={handleChange} placeholder="Numero principal" />
                </label>
              </div>

              <label className="space-y-1.5">
                <LabelText>Email professionnel</LabelText>
                <InputWithIcon icon={Mail} name="email" type="email" value={formData.email} onChange={handleChange} placeholder="contact@pharmacie.tn" />
              </label>
            </>
          ) : isSupplier ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <LabelText>Prenom</LabelText>
                  <InputWithIcon icon={UserRound} name="prenom" value={formData.prenom} onChange={handleChange} />
                </label>
                <label className="space-y-1.5">
                  <LabelText>Nom</LabelText>
                  <InputWithIcon icon={UserRound} name="nom" value={formData.nom} onChange={handleChange} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <LabelText>Email professionnel</LabelText>
                  <InputWithIcon icon={Mail} name="email" type="email" value={formData.email} onChange={handleChange} />
                </label>
                <label className="space-y-1.5">
                  <LabelText>Telephone</LabelText>
                  <InputWithIcon icon={Phone} name="phone" value={formData.phone} onChange={handleChange} />
                </label>
              </div>
            </>
          ) : isPatient ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <LabelText>Prenom</LabelText>
                  <input name="prenom" value={formData.prenom} onChange={handleChange} className={inputClassName} />
                </label>
                <label className="space-y-1.5">
                  <LabelText>Nom</LabelText>
                  <input name="nom" value={formData.nom} onChange={handleChange} className={inputClassName} />
                </label>
                <label className="space-y-1.5">
                  <LabelText>Email</LabelText>
                  <InputWithIcon icon={Mail} name="email" type="email" value={formData.email} readOnly className="cursor-not-allowed bg-gray-50 text-text-muted" />
                </label>
                <label className="space-y-1.5">
                  <LabelText>Telephone</LabelText>
                  <InputWithIcon icon={Phone} name="phone" value={formData.phone} onChange={handleChange} />
                </label>
                <label className="space-y-1.5">
                  <LabelText>CIN</LabelText>
                  <input name="cin" value={formData.cin} onChange={handleChange} className={inputClassName} />
                </label>
                <label className="space-y-1.5">
                  <LabelText>Date de naissance</LabelText>
                  <input type="date" name="date_naissance" value={formData.date_naissance} onChange={handleChange} className={inputClassName} />
                </label>
              </div>

              <label className="space-y-1.5">
                <LabelText>Ville</LabelText>
                <InputWithIcon icon={MapPin} name="city" value={formData.city} onChange={handleChange} />
              </label>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <LabelText>Prenom</LabelText>
                  <input name="prenom" value={formData.prenom} onChange={handleChange} className={inputClassName} />
                </label>
                <label className="space-y-1.5">
                  <LabelText>Nom</LabelText>
                  <input name="nom" value={formData.nom} onChange={handleChange} className={inputClassName} />
                </label>
              </div>

              <label className="space-y-1.5">
                <LabelText>Nom affiche</LabelText>
                <InputWithIcon icon={UserRound} name="name" value={formData.name} onChange={handleChange} />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <LabelText>Email</LabelText>
                  <InputWithIcon icon={Mail} name="email" type="email" value={formData.email} onChange={handleChange} />
                </label>
                <label className="space-y-1.5">
                  <LabelText>Telephone</LabelText>
                  <InputWithIcon icon={Phone} name="phone" value={formData.phone} onChange={handleChange} />
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSaving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            <Save size={15} />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;

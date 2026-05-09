import React, { useEffect, useMemo, useState } from "react";
import { Mail, MapPin, Phone, Save, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "../lib/api";

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const isPatient = role === "pation";

  const initialData = useMemo(
    () => ({
      prenom: user?.prenom || "",
      nom: user?.nom || "",
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      cin: user?.cin || "",
      date_naissance: user?.date_naissance || "",
      city: user?.city || "",
    }),
    [user],
  );

  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(isPatient);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!isPatient) return;

    const loadPatientProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/patient-portal/me");
        const profile = response.data?.profile;
        if (!profile) return;
        setFormData((prev) => ({
          ...prev,
          prenom: profile.prenom || "",
          nom: profile.nom || "",
          name: [profile.prenom, profile.nom].filter(Boolean).join(" ").trim(),
          email: profile.email || prev.email,
          phone: profile.telephone || "",
          cin: profile.cin || "",
          date_naissance: profile.date_naissance || "",
          city: profile.city || "",
        }));
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Impossible de charger le profil patient");
      } finally {
        setLoading(false);
      }
    };

    loadPatientProfile();
  }, [isPatient]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const mergedName = formData.name || [formData.prenom, formData.nom].filter(Boolean).join(" ").trim();

      if (isPatient) {
        await api.put("/patient-portal/me", {
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.phone || null,
          cin: formData.cin || null,
          date_naissance: formData.date_naissance || null,
          city: formData.city || null,
        });
      }

      await updateProfile({
        ...user,
        ...formData,
        name: mergedName,
      });

      setMessage(isPatient ? "Profil patient mis a jour." : "Profil mis a jour localement.");
      setTimeout(() => setMessage(""), 2500);
    } catch (submitError) {
      setError(submitError.response?.data?.error || submitError.message || "Mise a jour impossible");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 to-teal-600 p-6 text-white shadow-xl">
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="mt-1 text-sm text-cyan-100">Mettez a jour vos informations personnelles.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {message && <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
        {error && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        {loading && (
          <div className="mb-4 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
            Chargement du profil...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Prenom</span>
              <input
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Nom</span>
              <input
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Nom affiche</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          </label>

          <label className="space-y-2" hidden={isPatient}>
            <span className="text-sm font-medium text-slate-700">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          </label>

          {isPatient && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-9 py-2 text-sm text-slate-500"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">CIN (optionnel)</span>
                <input
                  name="cin"
                  value={formData.cin}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Date de naissance</span>
                <input
                  type="date"
                  name="date_naissance"
                  value={formData.date_naissance}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Ville</span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </label>

            </div>
          )}

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Telephone</span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isSaving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ProfilePage;

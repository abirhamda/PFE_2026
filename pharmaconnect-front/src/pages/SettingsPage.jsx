import { useEffect, useState } from "react";
import { CalendarDays, Globe2, Save, Settings as SettingsIcon, ShieldCheck, Stethoscope } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "../lib/api";

const WORKING_DAYS = [
  { key: "1", label: "Lundi" },
  { key: "2", label: "Mardi" },
  { key: "3", label: "Mercredi" },
  { key: "4", label: "Jeudi" },
  { key: "5", label: "Vendredi" },
  { key: "6", label: "Samedi" },
  { key: "0", label: "Dimanche" },
];

const defaultWorkingHours = () => ({
  0: { enabled: false, start: "09:00", end: "17:00" },
  1: { enabled: true, start: "09:00", end: "17:00" },
  2: { enabled: true, start: "09:00", end: "17:00" },
  3: { enabled: true, start: "09:00", end: "17:00" },
  4: { enabled: true, start: "09:00", end: "17:00" },
  5: { enabled: true, start: "09:00", end: "17:00" },
  6: { enabled: true, start: "09:00", end: "13:00" },
});

const parseWorkingHours = (value) => {
  const defaults = defaultWorkingHours();
  if (!value) return defaults;

  let parsed = null;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch (_error) {
      parsed = null;
    }
  } else if (typeof value === "object") {
    parsed = value;
  }

  if (!parsed || typeof parsed !== "object") return defaults;

  const merged = { ...defaults };
  for (const { key } of WORKING_DAYS) {
    const source = parsed[key];
    if (!source || typeof source !== "object") continue;
    merged[key] = {
      enabled: Boolean(source.enabled),
      start: String(source.start || merged[key].start),
      end: String(source.end || merged[key].end),
    };
  }
  return merged;
};

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const Field = ({ label, children }) => (
  <label className="space-y-1.5">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {children}
  </label>
);

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const isProvider = role === "doctor" || role === "secretaire";

  const [loading, setLoading] = useState(isProvider);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [providerForm, setProviderForm] = useState({
    display_name: "",
    public_phone: "",
    address_line: "",
    city: "",
    consultation_fee: "",
    consultation_duration_min: 20,
    bio: "",
    online_visibility: false,
    online_booking_enabled: false,
    working_hours: defaultWorkingHours(),
  });

  const [genericForm, setGenericForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    language: "fr",
    notifications: true,
    emailNotifications: true,
  });

  useEffect(() => {
    setGenericForm((prev) => ({
      ...prev,
      name: user?.name || "",
      email: user?.email || "",
    }));
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (!isProvider) return;

    const loadProviderProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/patient-portal/provider-profile/me");
        const profile = response.data?.profile || {};
        setProviderForm({
          display_name: profile.display_name || "",
          public_phone: profile.public_phone || "",
          address_line: profile.address_line || "",
          city: profile.city || "",
          consultation_fee: profile.consultation_fee ?? "",
          consultation_duration_min: Number(profile.consultation_duration_min || 20),
          bio: profile.bio || "",
          online_visibility: Boolean(profile.online_visibility),
          online_booking_enabled: Boolean(profile.online_booking_enabled),
          working_hours: parseWorkingHours(profile.working_hours_json),
        });
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Impossible de charger les parametres publics");
      } finally {
        setLoading(false);
      }
    };

    loadProviderProfile();
  }, [isProvider]);

  const handleGenericSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateProfile({
        name: genericForm.name,
        email: genericForm.email,
      });
      setMessage("Parametres enregistres.");
    } catch (submitError) {
      setError(submitError.message || "Echec de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleProviderSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        display_name: providerForm.display_name || null,
        public_phone: providerForm.public_phone || null,
        address_line: providerForm.address_line || null,
        city: providerForm.city || null,
        consultation_fee: toNumberOrNull(providerForm.consultation_fee),
        consultation_duration_min: Number(providerForm.consultation_duration_min || 20),
        bio: providerForm.bio || null,
        online_visibility: Boolean(providerForm.online_visibility),
        online_booking_enabled: Boolean(providerForm.online_booking_enabled),
        working_hours: providerForm.working_hours,
      };

      await api.put("/patient-portal/provider-profile/me", payload);
      setMessage("Parametres publics mis a jour.");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Echec de mise a jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 to-teal-600 p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-white" />
          <h1 className="text-xl font-semibold text-white">Parametres</h1>
        </div>
      </section>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {isProvider ? (
        <form onSubmit={handleProviderSubmit} className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">
                <Globe2 size={16} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Profil public du cabinet</h2>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Chargement...
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nom affiche au public">
                  <input
                    value={providerForm.display_name}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, display_name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </Field>
                <Field label="Numero public">
                  <input
                    value={providerForm.public_phone}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, public_phone: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </Field>
                <Field label="Adresse complete">
                  <input
                    value={providerForm.address_line}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, address_line: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </Field>
                <Field label="Ville">
                  <input
                    value={providerForm.city}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, city: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </Field>
                <Field label="Tarif consultation (MAD)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={providerForm.consultation_fee}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, consultation_fee: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </Field>
                <Field label="Duree consultation (minutes)">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={providerForm.consultation_duration_min}
                    onChange={(event) =>
                      setProviderForm((prev) => ({
                        ...prev,
                        consultation_duration_min: Number(event.target.value) || 20,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </Field>
                <Field label="Presentation cabinet">
                  <textarea
                    value={providerForm.bio}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, bio: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </Field>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">
                <ShieldCheck size={16} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Acces patient en ligne</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Afficher le medecin publiquement</span>
                <input
                  type="checkbox"
                  checked={providerForm.online_visibility}
                  onChange={(event) =>
                    setProviderForm((prev) => ({ ...prev, online_visibility: event.target.checked }))
                  }
                  className="h-4 w-4 accent-cyan-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Autoriser la reservation en ligne</span>
                <input
                  type="checkbox"
                  checked={providerForm.online_booking_enabled}
                  onChange={(event) =>
                    setProviderForm((prev) => ({ ...prev, online_booking_enabled: event.target.checked }))
                  }
                  className="h-4 w-4 accent-cyan-600"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">
                <CalendarDays size={16} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Horaires publics</h2>
            </div>

            <div className="space-y-2">
              {WORKING_DAYS.map((day) => (
                <div key={day.key} className="grid items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 md:grid-cols-[140px,90px,1fr,1fr]">
                  <span className="text-sm font-medium text-slate-700">{day.label}</span>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={providerForm.working_hours[day.key]?.enabled || false}
                      onChange={(event) =>
                        setProviderForm((prev) => ({
                          ...prev,
                          working_hours: {
                            ...prev.working_hours,
                            [day.key]: {
                              ...(prev.working_hours[day.key] || { start: "09:00", end: "17:00" }),
                              enabled: event.target.checked,
                            },
                          },
                        }))
                      }
                      className="h-4 w-4 accent-cyan-600"
                    />
                    Actif
                  </label>
                  <input
                    type="time"
                    value={providerForm.working_hours[day.key]?.start || "09:00"}
                    onChange={(event) =>
                      setProviderForm((prev) => ({
                        ...prev,
                        working_hours: {
                          ...prev.working_hours,
                          [day.key]: {
                            ...(prev.working_hours[day.key] || { enabled: false, end: "17:00" }),
                            start: event.target.value,
                          },
                        },
                      }))
                    }
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="time"
                    value={providerForm.working_hours[day.key]?.end || "17:00"}
                    onChange={(event) =>
                      setProviderForm((prev) => ({
                        ...prev,
                        working_hours: {
                          ...prev.working_hours,
                          [day.key]: {
                            ...(prev.working_hours[day.key] || { enabled: false, start: "09:00" }),
                            end: event.target.value,
                          },
                        },
                      }))
                    }
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              <Save size={15} />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleGenericSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">
              <Stethoscope size={16} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Parametres generaux</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom">
              <input
                name="name"
                value={genericForm.name}
                onChange={(event) => setGenericForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                name="email"
                value={genericForm.email}
                onChange={(event) => setGenericForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Langue">
              <select
                name="language"
                value={genericForm.language}
                onChange={(event) => setGenericForm((prev) => ({ ...prev, language: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="fr">Francais</option>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Notifications in-app</span>
              <input
                type="checkbox"
                checked={genericForm.notifications}
                onChange={(event) => setGenericForm((prev) => ({ ...prev, notifications: event.target.checked }))}
                className="h-4 w-4 accent-cyan-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Notifications email</span>
              <input
                type="checkbox"
                checked={genericForm.emailNotifications}
                onChange={(event) =>
                  setGenericForm((prev) => ({ ...prev, emailNotifications: event.target.checked }))
                }
                className="h-4 w-4 accent-cyan-600"
              />
            </label>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
              disabled={saving}
            >
              <Save size={15} />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

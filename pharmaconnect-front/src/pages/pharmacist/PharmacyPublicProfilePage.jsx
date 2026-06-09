import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Globe, MapPin, Moon, Save, Store, Sun } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import LoadingState from "../../components/modules/LoadingState";
import ModuleHero from "../../components/modules/ModuleHero";
import { inputClassName } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const DAYS = [
  { key: "lundi",    label: "Lundi" },
  { key: "mardi",    label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi",    label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi",   label: "Samedi" },
  { key: "dimanche", label: "Dimanche" },
];

const DEFAULT_DAY = { open: true, ouverture: "08:00", fermeture: "18:00" };

const buildDefaultHours = () =>
  Object.fromEntries(
    DAYS.map(({ key }) => [key, { ...DEFAULT_DAY, open: key !== "dimanche" }]),
  );

export default function PharmacyPublicProfilePage() {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [notice, setNotice]       = useState(null);
  const [pharmacyName, setPharmacyName] = useState("");

  const [form, setForm] = useState({
    pharmacy_type: "day",
    opening_hours: buildDefaultHours(),
    address_line: "",
    city: "",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/pharmacy/me");
        const p   = res.data?.profile || res.data;
        setPharmacyName(p.nom_pharmacie || "");
        setForm({
          pharmacy_type: p.pharmacy_type  || "day",
          opening_hours: p.opening_hours  || buildDefaultHours(),
          address_line:  p.address_line   || "",
          city:          p.city           || "",
          latitude:      p.latitude  != null ? String(p.latitude)  : "",
          longitude:     p.longitude != null ? String(p.longitude) : "",
        });
      } catch {
        setNotice({ type: "error", message: "Impossible de charger le profil." });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const toggleDay = (day) =>
    setForm((prev) => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: { ...prev.opening_hours[day], open: !prev.opening_hours[day].open },
      },
    }));

  const setHour = (day, field, val) =>
    setForm((prev) => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: { ...prev.opening_hours[day], [field]: val },
      },
    }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/pharmacy/me/public-profile", {
        pharmacy_type: form.pharmacy_type,
        opening_hours: form.opening_hours,
        address_line:  form.address_line.trim() || null,
        city:          form.city.trim()         || null,
        latitude:      form.latitude  !== "" ? Number(form.latitude)  : null,
        longitude:     form.longitude !== "" ? Number(form.longitude) : null,
      });
      setNotice({ type: "success", message: "Profil public mis à jour avec succès." });
    } catch {
      setNotice({ type: "error", message: "Impossible de sauvegarder le profil public." });
    } finally {
      setSaving(false);
    }
  };

  const typeConfig = {
    day:   { label: "Pharmacie de jour",   badgeClass: "bg-amber-100 text-amber-700",   icon: Sun  },
    night: { label: "Pharmacie de nuit",   badgeClass: "bg-purple-100 text-purple-700", icon: Moon },
    both:  { label: "Jour et nuit",        badgeClass: "bg-blue-100 text-blue-700",     icon: Globe },
  };

  const hasCoords = form.latitude !== "" && form.longitude !== "";
  const mapsUrl   = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}&zoom=16`
    : null;
  const mapEmbed  = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.longitude) - 0.01},${Number(form.latitude) - 0.01},${Number(form.longitude) + 0.01},${Number(form.latitude) + 0.01}&layer=mapnik&marker=${form.latitude},${form.longitude}`
    : null;

  if (loading) return <LoadingState message="Chargement du profil public..." />;

  return (
    <div className="space-y-6">
      <ModuleHero
        eyebrow="Espace pharmacien"
        title="Profil public de la pharmacie"
        description="Ces informations sont visibles par les patients et visiteurs : horaires, type et localisation."
      />

      {notice ? (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notice.message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Pharmacy Type ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Type de pharmacie</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">Indiquez si vous assurez un service de jour, de nuit ou les deux.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: "day",   label: "Pharmacie de jour",  Icon: Sun,   desc: "Ouverte pendant les heures de jour" },
                { value: "night", label: "Pharmacie de nuit",  Icon: Moon,  desc: "Service nocturne disponible" },
                { value: "both",  label: "Jour et nuit",       Icon: Globe, desc: "Disponible 24h/24 ou horaires élargis" },
              ].map(({ value, label, Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, pharmacy_type: value }))}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    form.pharmacy_type === value
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-border bg-card hover:border-accent/40"
                  }`}
                >
                  <Icon size={20} className={form.pharmacy_type === value ? "text-accent" : "text-text-muted"} />
                  <p className={`mt-2 text-sm font-semibold ${form.pharmacy_type === value ? "text-accent" : "text-text-primary"}`}>{label}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Opening Hours ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Horaires d'ouverture</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">Activez les jours ouvrés et définissez les créneaux horaires.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {DAYS.map(({ key, label }) => {
                const day = form.opening_hours[key] || DEFAULT_DAY;
                return (
                  <div
                    key={key}
                    className={`flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                      day.open ? "border-border bg-card" : "border-dashed border-gray-200 bg-gray-50"
                    }`}
                  >
                    {/* Toggle + label */}
                    <div className="flex w-36 flex-shrink-0 items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleDay(key)}
                        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${day.open ? "bg-accent" : "bg-gray-300"}`}
                        aria-label={`Activer ${label}`}
                      >
                        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${day.open ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                      <span className={`text-sm font-medium ${day.open ? "text-text-primary" : "text-text-muted"}`}>{label}</span>
                    </div>

                    {day.open ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Clock size={13} className="text-text-muted" />
                        <input
                          type="time"
                          value={day.ouverture}
                          onChange={(e) => setHour(key, "ouverture", e.target.value)}
                          className={`${inputClassName} w-32`}
                        />
                        <span className="text-xs text-text-muted">—</span>
                        <input
                          type="time"
                          value={day.fermeture}
                          onChange={(e) => setHour(key, "fermeture", e.target.value)}
                          className={`${inputClassName} w-32`}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted italic">Fermé ce jour</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Location ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Localisation</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">L'adresse est affichée aux patients. Les coordonnées GPS permettent d'intégrer une carte.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Adresse</span>
                <input name="address_line" value={form.address_line} onChange={handleChange} className={inputClassName} placeholder="Ex. 12 Rue des Fleurs, Cité Olympique" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Ville</span>
                <input name="city" value={form.city} onChange={handleChange} className={inputClassName} placeholder="Ex. Sousse" />
              </label>
              <div />
              <label className="space-y-1.5">
                <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Latitude (optionnel)</span>
                <input name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange} className={inputClassName} placeholder="Ex. 35.8256" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Longitude (optionnel)</span>
                <input name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange} className={inputClassName} placeholder="Ex. 10.6369" />
              </label>

              {hasCoords ? (
                <div className="sm:col-span-2 space-y-3">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent underline underline-offset-2 hover:text-accent/80">
                    <MapPin size={14} />
                    Voir sur OpenStreetMap
                  </a>
                  <div className="overflow-hidden rounded-xl border border-border shadow-sm">
                    <iframe title="Carte pharmacie" src={mapEmbed} width="100%" height="220" style={{ border: 0 }} loading="lazy" />
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* ── Live Preview ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu patient</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">Voici comment votre pharmacie apparaîtra aux visiteurs et patients.</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-gray-50 p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Store size={22} className="text-accent" />
                </div>
                <div>
                  <p className="text-base font-semibold text-text-primary">{pharmacyName || "Nom de la pharmacie"}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeConfig[form.pharmacy_type]?.badgeClass}`}>
                    {typeConfig[form.pharmacy_type]?.label}
                  </span>
                </div>
              </div>

              {/* Address */}
              {(form.address_line || form.city) ? (
                <div className="flex items-start gap-2 text-sm text-text-secondary">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0 text-text-muted" />
                  <span>{[form.address_line, form.city].filter(Boolean).join(", ")}</span>
                </div>
              ) : null}

              {/* Schedule grid */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Horaires d'ouverture</p>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {DAYS.map(({ key, label }) => {
                    const day = form.opening_hours[key] || DEFAULT_DAY;
                    return (
                      <div key={key} className="flex items-center justify-between py-0.5 text-xs">
                        <span className={`font-medium ${day.open ? "text-text-primary" : "text-text-muted"}`}>{label}</span>
                        <span className={day.open ? "text-text-secondary" : "text-text-muted"}>
                          {day.open ? `${day.ouverture} – ${day.fermeture}` : "Fermé"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Submit ───────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pb-2">
          <Button type="submit" isLoading={saving} leftIcon={<Save size={15} />}>
            Sauvegarder le profil public
          </Button>
        </div>
      </form>
    </div>
  );
}

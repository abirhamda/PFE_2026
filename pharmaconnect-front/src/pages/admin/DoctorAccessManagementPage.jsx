import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  ShieldOff,
  Stethoscope,
  X,
} from "lucide-react";
import api from "../../lib/api";

const emptyDoctorForm = {
  nom: "",
  prenom: "",
  email: "",
  specialty: "",
  cin: "",
  password: "",
};

const isAuthorized = (doctor) => Number(doctor?.is_active) === 1 || doctor?.is_active === true;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
};

const extractError = (error, fallback) =>
  error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      active ? "bg-emerald-50 text-[#2e7d5e] ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
    }`}
  >
    {active ? <BadgeCheck size={13} /> : <ShieldOff size={13} />}
    {active ? "Autorise" : "Bloque"}
  </span>
);

const ModalShell = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 bg-[#1a3a5c] px-5 py-4 text-white">
        <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ConfirmModal = ({ doctor, nextActive, saving, onCancel, onConfirm }) => {
  if (!doctor) return null;

  return (
    <ModalShell title={nextActive ? "Autoriser le medecin" : "Bloquer le medecin"} onClose={onCancel}>
      <div className="space-y-5 p-5">
        <p className="text-sm leading-6 text-slate-700">
          Confirmer le changement de statut pour{" "}
          <span className="font-semibold text-slate-900">
            Dr {doctor.prenom} {doctor.nom}
          </span>
          .
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition disabled:opacity-60 ${
              nextActive ? "bg-[#2e7d5e] hover:bg-[#25664d]" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : null}
            {nextActive ? "Autoriser" : "Bloquer"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const DetailModal = ({ doctor, onClose }) => {
  if (!doctor) return null;

  const rows = [
    ["Nom", doctor.nom || "-"],
    ["Prenom", doctor.prenom || "-"],
    ["Email", doctor.email || "-"],
    ["Specialite", doctor.specialty || "-"],
    ["CIN", doctor.cin || "-"],
    ["Date inscription", formatDate(doctor.created_at)],
    ["Statut", isAuthorized(doctor) ? "Autorise" : "Bloque"],
  ];

  return (
    <ModalShell title="Details du medecin" onClose={onClose}>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
};

const AddDoctorModal = ({ open, form, saving, error, onChange, onSubmit, onClose }) => {
  if (!open) return null;

  return (
    <ModalShell title="Ajouter un medecin" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5 p-5">
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "nom", label: "Nom" },
            { key: "prenom", label: "Prenom" },
            { key: "email", label: "Email", type: "email", full: true },
            { key: "specialty", label: "Specialite" },
            { key: "cin", label: "CIN" },
            { key: "password", label: "Mot de passe", type: "password", full: true },
          ].map((field) => (
            <label key={field.key} className={field.full ? "block sm:col-span-2" : "block"}>
              <span className="mb-2 block text-sm font-semibold text-slate-700">{field.label}</span>
              <input
                type={field.type || "text"}
                value={form[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#1a3a5c] focus:ring-2 focus:ring-blue-100"
                required
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1a3a5c] px-4 text-sm font-semibold text-white transition hover:bg-[#14304c] disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Ajouter
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default function DoctorAccessManagementPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [detailDoctor, setDetailDoctor] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyDoctorForm);
  const [addError, setAddError] = useState("");

  const loadDoctors = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/doctors");
      setDoctors(Array.isArray(response.data?.doctors) ? response.data.doctors : []);
    } catch (requestError) {
      setDoctors([]);
      setError(extractError(requestError, "Impossible de charger les medecins"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const searchable = [doctor.nom, doctor.prenom, doctor.email].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = normalizedSearch ? searchable.includes(normalizedSearch) : true;
      const active = isAuthorized(doctor);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "authorized" && active) ||
        (statusFilter === "blocked" && !active);

      return matchesSearch && matchesStatus;
    });
  }, [doctors, searchTerm, statusFilter]);

  const selectedNextActive = selectedDoctor ? !isAuthorized(selectedDoctor) : false;

  const handleToggleStatus = async () => {
    if (!selectedDoctor) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await api.put(`/admin/doctors/${selectedDoctor.id}/status`, {
        active: selectedNextActive,
      });
      const updatedDoctor = response.data?.doctor;
      if (updatedDoctor) {
        setDoctors((previous) => previous.map((doctor) => (doctor.id === updatedDoctor.id ? updatedDoctor : doctor)));
      } else {
        await loadDoctors();
      }
      setMessage(`Acces medecin ${selectedNextActive ? "autorise" : "bloque"} avec succes.`);
      setSelectedDoctor(null);
    } catch (requestError) {
      setError(extractError(requestError, "Impossible de modifier le statut du medecin"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddDoctor = async (event) => {
    event.preventDefault();
    setAddError("");
    setSaving(true);

    try {
      const response = await api.post("/admin/doctors", {
        firstName: addForm.prenom.trim(),
        lastName: addForm.nom.trim(),
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        cin: addForm.cin.trim(),
        specialty: addForm.specialty.trim(),
      });
      const createdDoctor = response.data?.doctor;
      if (createdDoctor) {
        setDoctors((previous) => [createdDoctor, ...previous]);
      } else {
        await loadDoctors();
      }
      setMessage("Medecin ajoute avec succes.");
      setAddForm(emptyDoctorForm);
      setAddOpen(false);
    } catch (requestError) {
      setAddError(extractError(requestError, "Impossible d'ajouter le medecin"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg bg-[#1a3a5c] px-5 py-4 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
            <Stethoscope size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Administration IA</p>
            <h1 className="text-2xl font-semibold tracking-normal">Gestion des acces medecins</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#1a3a5c] transition hover:bg-blue-50"
        >
          <Plus size={16} />
          Ajouter un medecin
        </button>
      </section>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-[#2e7d5e]">
          {message}
        </div>
      ) : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher par nom ou email"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-10 text-sm text-slate-900 outline-none transition focus:border-[#1a3a5c] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Filter size={16} />
            Statut
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              { key: "all", label: "Tous" },
              { key: "authorized", label: "Autorises" },
              { key: "blocked", label: "Bloques" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  statusFilter === item.key ? "bg-[#1a3a5c] text-white" : "text-slate-600 hover:bg-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Prenom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Specialite</th>
                <th className="px-4 py-3">Date inscription</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      Chargement des medecins...
                    </span>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Aucun medecin trouve.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor) => {
                  const active = isAuthorized(doctor);

                  return (
                    <tr key={doctor.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{doctor.nom || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{doctor.prenom || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{doctor.email || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{doctor.specialty || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(doctor.created_at)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge active={active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDoctor(doctor)}
                            className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-white transition ${
                              active ? "bg-rose-600 hover:bg-rose-700" : "bg-[#2e7d5e] hover:bg-[#25664d]"
                            }`}
                          >
                            {active ? <ShieldOff size={14} /> : <BadgeCheck size={14} />}
                            {active ? "Bloquer" : "Autoriser"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailDoctor(doctor)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye size={14} />
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        doctor={selectedDoctor}
        nextActive={selectedNextActive}
        saving={saving}
        onCancel={() => setSelectedDoctor(null)}
        onConfirm={handleToggleStatus}
      />
      <DetailModal doctor={detailDoctor} onClose={() => setDetailDoctor(null)} />
      <AddDoctorModal
        open={addOpen}
        form={addForm}
        saving={saving}
        error={addError}
        onChange={(key, value) => setAddForm((previous) => ({ ...previous, [key]: value }))}
        onSubmit={handleAddDoctor}
        onClose={() => {
          setAddOpen(false);
          setAddError("");
        }}
      />
    </div>
  );
}

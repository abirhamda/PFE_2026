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
  Users,
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

const getDoctorInitials = (doctor) => {
  const name = [doctor.prenom, doctor.nom].filter(Boolean).join(" ") || "Dr";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      active
        ? "bg-medical-success-bg text-medical-success"
        : "bg-medical-danger-bg text-medical-danger"
    }`}
  >
    {active ? <BadgeCheck size={12} /> : <ShieldOff size={12} />}
    {active ? "Autorisé" : "Bloqué"}
  </span>
);

const ModalOverlay = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    {children}
  </div>
);

const ModalCard = ({ title, icon, onClose, children }) => (
  <ModalOverlay>
    <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-card-hover overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-text-primary">
          {icon}
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </ModalOverlay>
);

const LargeModalCard = ({ title, onClose, children }) => (
  <ModalOverlay>
    <div className="w-full max-w-2xl bg-card rounded-xl border border-border shadow-card-hover overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary text-white">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </ModalOverlay>
);

const ConfirmModal = ({ doctor, nextActive, saving, onCancel, onConfirm }) => {
  if (!doctor) return null;

  return (
    <ModalCard
      title={nextActive ? "Autoriser le médecin" : "Bloquer le médecin"}
      icon={nextActive ? <BadgeCheck size={16} className="text-medical-success" /> : <ShieldOff size={16} className="text-medical-danger" />}
      onClose={onCancel}
    >
      <div className="p-5 space-y-5">
        <p className="text-sm text-text-secondary leading-relaxed">
          Confirmer le changement de statut pour{" "}
          <span className="font-semibold text-text-primary">
            Dr {doctor.prenom} {doctor.nom}
          </span>
          .
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
              nextActive
                ? "bg-medical-success hover:bg-green-700"
                : "bg-medical-danger hover:bg-red-700"
            }`}
          >
            {saving && <Loader2 className="animate-spin" size={15} />}
            {nextActive ? "Autoriser" : "Bloquer"}
          </button>
        </div>
      </div>
    </ModalCard>
  );
};

const DetailModal = ({ doctor, onClose }) => {
  if (!doctor) return null;

  const rows = [
    ["Nom",              doctor.nom || "-"],
    ["Prénom",           doctor.prenom || "-"],
    ["Email",            doctor.email || "-"],
    ["Spécialité",       doctor.specialty || "-"],
    ["CIN",              doctor.cin || "-"],
    ["Date inscription", formatDate(doctor.created_at)],
    ["Statut",           isAuthorized(doctor) ? "Autorisé" : "Bloqué"],
  ];

  return (
    <LargeModalCard title="Détails du médecin" onClose={onClose}>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
            <p className="mt-1 break-words text-sm font-medium text-text-primary">{value}</p>
          </div>
        ))}
      </div>
    </LargeModalCard>
  );
};

const AddDoctorModal = ({ open, form, saving, error, onChange, onSubmit, onClose }) => {
  if (!open) return null;

  return (
    <LargeModalCard title="Ajouter un médecin" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5 p-5">
        {error && (
          <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "nom",      label: "Nom" },
            { key: "prenom",   label: "Prénom" },
            { key: "email",    label: "Email",          type: "email",    full: true },
            { key: "specialty",label: "Spécialité" },
            { key: "cin",      label: "CIN" },
            { key: "password", label: "Mot de passe",   type: "password", full: true },
          ].map((field) => (
            <label key={field.key} className={field.full ? "block sm:col-span-2" : "block"}>
              <span className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
                {field.label}
              </span>
              <input
                type={field.type || "text"}
                value={form[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-primary bg-card placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                required
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
            Ajouter
          </button>
        </div>
      </form>
    </LargeModalCard>
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
      setError(extractError(requestError, "Impossible de charger les médecins"));
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
      setMessage(`Accès médecin ${selectedNextActive ? "autorisé" : "bloqué"} avec succès.`);
      setSelectedDoctor(null);
    } catch (requestError) {
      setError(extractError(requestError, "Impossible de modifier le statut du médecin"));
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
      setMessage("Médecin ajouté avec succès.");
      setAddForm(emptyDoctorForm);
      setAddOpen(false);
    } catch (requestError) {
      setAddError(extractError(requestError, "Impossible d'ajouter le médecin"));
    } finally {
      setSaving(false);
    }
  };

  const totalCount      = doctors.length;
  const authorizedCount = doctors.filter(isAuthorized).length;
  const blockedCount    = doctors.filter((d) => !isAuthorized(d)).length;

  return (
    <div className="space-y-5">

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total médecins",  value: totalCount,      icon: <Users size={20} className="text-accent" />,           bg: "bg-accent-light" },
          { label: "Autorisés",       value: authorizedCount, icon: <BadgeCheck size={20} className="text-medical-success" />, bg: "bg-medical-success-bg" },
          { label: "Bloqués",         value: blockedCount,    icon: <ShieldOff size={20} className="text-medical-danger" />,  bg: "bg-medical-danger-bg" },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} className="bg-card rounded-card border border-border shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{label}</p>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
            </div>
            <p className="text-3xl font-semibold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-card border-l-4 border-medical-success bg-medical-success-bg p-4 text-sm text-medical-success">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg p-4 text-sm text-medical-danger">
          {error}
        </div>
      )}

      {/* Search + filter bar */}
      <div className="bg-card rounded-card border border-border shadow-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full border border-border rounded-lg px-10 py-2 text-sm text-text-primary bg-card placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Filter size={15} />
              Statut :
            </div>
            <div className="inline-flex rounded-lg border border-border bg-gray-50 p-1">
              {[
                { key: "all",        label: "Tous" },
                { key: "authorized", label: "Autorisés" },
                { key: "blocked",    label: "Bloqués" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === item.key
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={15} />
              Ajouter un médecin
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              {["Médecin", "Email", "Spécialité", "Inscription", "Statut", "Actions"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={17} />
                    Chargement des médecins...
                  </span>
                </td>
              </tr>
            ) : filteredDoctors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                  <Stethoscope size={28} className="mx-auto mb-2 text-text-muted" />
                  <p>Aucun médecin trouvé.</p>
                </td>
              </tr>
            ) : (
              filteredDoctors.map((doctor) => {
                const active = isAuthorized(doctor);

                return (
                  <tr key={doctor.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-light text-accent text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {getDoctorInitials(doctor)}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">
                            {[doctor.prenom, doctor.nom].filter(Boolean).join(" ") || "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">{doctor.email || "-"}</td>
                    <td className="px-4 py-3.5 text-text-secondary">{doctor.specialty || "-"}</td>
                    <td className="px-4 py-3.5 text-text-secondary">{formatDate(doctor.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge active={active} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDoctor(doctor)}
                          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors ${
                            active
                              ? "bg-medical-danger hover:bg-red-700"
                              : "bg-medical-success hover:bg-green-700"
                          }`}
                        >
                          {active ? <ShieldOff size={13} /> : <BadgeCheck size={13} />}
                          {active ? "Bloquer" : "Autoriser"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailDoctor(doctor)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-text-primary transition-colors hover:bg-gray-50"
                        >
                          <Eye size={13} />
                          Détails
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

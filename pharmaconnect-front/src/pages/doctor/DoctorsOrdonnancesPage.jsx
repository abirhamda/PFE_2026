import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  FileText,
  Pencil,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Stethoscope,
  Trash2,
  UserRoundSearch,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

const initialCreateForm = {
  patient_id: "",
  nom: "",
  prenom: "",
  cin: "",
  ordonnance: "",
};

const inputCls =
  "w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-card placeholder-text-muted outline-none transition focus:ring-2 focus:ring-accent/30 focus:border-accent";

const toHumanDateTime = (value) => {
  if (!value) return "--";
  const normalized = String(value).replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeOrdonnanceItem = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: Number(raw.id) || 0,
    doctor_id: Number(raw.doctor_id || raw.id_doctor) || null,
    nom: String(raw.nom || ""),
    prenom: String(raw.prenom || ""),
    cin: raw.cin ? String(raw.cin) : "",
    ordonnance: String(raw.ordonnance || ""),
    status: String(raw.status || "En attente"),
    created_at: raw.created_at ? String(raw.created_at) : null,
    patient_matricule: raw.patient_matricule ? String(raw.patient_matricule) : "",
  };
};

const getStatusBadgeClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "effectuée" || normalized === "effectuee") {
    return "bg-medical-success-bg text-medical-success";
  }
  return "bg-medical-warning-bg text-medical-warning";
};

const buildPrintableHtml = ({ ordonnance, doctorName }) => {
  const generatedAt = new Date().toLocaleString("fr-FR");
  const prescriptionText = escapeHtml(ordonnance.ordonnance).replace(/\n/g, "<br/>");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Ordonnance #${ordonnance.id}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: #0f1e2e;
      background: #f0f4f8;
    }
    .sheet {
      max-width: 840px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #dde3ec;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15,29,74,0.10);
    }
    .top {
      padding: 20px 24px;
      background: #0f2d4a;
      color: #fff;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: center;
    }
    .title { margin: 0; font-size: 24px; font-weight: 600; }
    .subtitle { margin-top: 4px; opacity: 0.65; font-size: 13px; }
    .id-pill {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }
    .body { padding: 22px 24px; display: grid; gap: 14px; }
    .block { border: 1px solid #dde3ec; border-radius: 8px; padding: 14px 16px; }
    .block-title {
      margin: 0 0 8px 0;
      color: #1e6fd9;
      font-size: 11px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .line { margin: 4px 0; font-size: 14px; }
    .label { color: #5a6a7e; font-weight: 600; }
    .rx { font-size: 32px; color: #0f2d4a; font-weight: 700; margin-bottom: 10px; font-family: Georgia, serif; }
    .prescription {
      min-height: 180px;
      border: 1px dashed #dde3ec;
      border-radius: 8px;
      padding: 14px;
      line-height: 1.65;
      font-size: 15px;
    }
    .footer { display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; margin-top: 18px; }
    .signature { width: 240px; text-align: center; border-top: 1px solid #dde3ec; padding-top: 8px; font-size: 12px; color: #5a6a7e; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border-radius: 0; border: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div>
        <h1 class="title">Ordonnance Médicale</h1>
        <div class="subtitle">Document de prescription professionnelle</div>
      </div>
      <div class="id-pill">Ordonnance #${ordonnance.id}</div>
    </div>

    <div class="body">
      <div class="block">
        <h2 class="block-title">Informations</h2>
        <div class="line"><span class="label">Médecin:</span> ${escapeHtml(doctorName)}</div>
        <div class="line"><span class="label">Patient:</span> ${escapeHtml(ordonnance.prenom)} ${escapeHtml(ordonnance.nom)}</div>
        <div class="line"><span class="label">Matricule:</span> ${escapeHtml(ordonnance.patient_matricule || "-")}</div>
        <div class="line"><span class="label">CIN:</span> ${escapeHtml(ordonnance.cin || "-")}</div>
        <div class="line"><span class="label">Date d'émission:</span> ${toHumanDateTime(ordonnance.created_at)}</div>
        <div class="line"><span class="label">Date d'impression:</span> ${generatedAt}</div>
      </div>

      <div class="block">
        <div class="rx">Rx</div>
        <div class="prescription">${prescriptionText || "-"}</div>
      </div>

      <div class="footer">
        <div class="line"><span class="label">Cachet / signature médecin</span></div>
        <div class="signature">${escapeHtml(doctorName)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
};

const EditOrdonnanceModal = ({ ordonnance, onClose, onSave }) => {
  const [form, setForm] = useState({
    nom: ordonnance?.nom || "",
    prenom: ordonnance?.prenom || "",
    cin: ordonnance?.cin || "",
    ordonnance: ordonnance?.ordonnance || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!ordonnance) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Mise a jour impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-3xl space-y-4 bg-card rounded-card border border-border shadow-card-hover p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Modifier l'ordonnance #{ordonnance.id}</h3>
            <p className="text-xs text-text-secondary mt-0.5">{toHumanDateTime(ordonnance.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
            Fermer
          </button>
        </div>

        {error && (
          <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          <input value={form.nom} onChange={(event) => setForm((prev) => ({ ...prev, nom: event.target.value }))} required placeholder="Nom" className={inputCls} />
          <input value={form.prenom} onChange={(event) => setForm((prev) => ({ ...prev, prenom: event.target.value }))} required placeholder="Prenom" className={inputCls} />
          <input value={ordonnance.patient_matricule || ""} disabled placeholder="Matricule" className={`${inputCls} bg-gray-50 text-text-muted cursor-not-allowed`} />
          <input value={form.cin} onChange={(event) => setForm((prev) => ({ ...prev, cin: event.target.value }))} placeholder="CIN (optionnel)" className={inputCls} />
        </div>

        <textarea
          value={form.ordonnance}
          onChange={(event) => setForm((prev) => ({ ...prev, ordonnance: event.target.value }))}
          required
          rows={10}
          placeholder="Prescription"
          className={`${inputCls} min-h-[200px] resize-y`}
        />

        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 transition-colors">
            <Save size={14} /> {saving ? "Mise a jour..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
};

const DoctorsOrdonnancesPage = () => {
  const { user, isLoading } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const isDoctor = role === "doctor";
  const isSecretary = role === "secretaire";
  const doctorName = user?.name || [user?.prenom, user?.nom].filter(Boolean).join(" ") || "Docteur";

  const [patients, setPatients] = useState([]);
  const [ordonnances, setOrdonnances] = useState([]);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingOrdonnance, setEditingOrdonnance] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      if (isDoctor) {
        const [patientsRes, ordonnancesRes] = await Promise.all([
          api.get("/doctor-patients"),
          api.get("/ordonnances"),
        ]);
        const patientsList = Array.isArray(patientsRes.data?.patients) ? patientsRes.data.patients : [];
        setPatients(patientsList);
        const ordonnancesList = (Array.isArray(ordonnancesRes.data) ? ordonnancesRes.data : [])
          .map(normalizeOrdonnanceItem)
          .filter(Boolean);
        setOrdonnances(
          ordonnancesList.sort(
            (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
          ),
        );
      } else {
        const ordonnancesRes = await api.get("/ordonnances");
        const ordonnancesList = (Array.isArray(ordonnancesRes.data) ? ordonnancesRes.data : [])
          .map(normalizeOrdonnanceItem)
          .filter(Boolean);
        setOrdonnances(
          ordonnancesList.sort(
            (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
          ),
        );
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les ordonnances");
      setPatients([]);
      setOrdonnances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
  }, [isLoading, isDoctor, isSecretary]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => Number(patient.id) === Number(createForm.patient_id)) || null,
    [patients, createForm.patient_id],
  );

  const safeOrdonnances = useMemo(
    () => (Array.isArray(ordonnances) ? ordonnances.filter((item) => item && typeof item === "object") : []),
    [ordonnances],
  );

  const counts = useMemo(() => {
    const pending = safeOrdonnances.filter(
      (item) => !["effectuee", "effectuée"].includes(String(item.status || "").toLowerCase()),
    ).length;
    const completed = safeOrdonnances.length - pending;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const currentMonth = safeOrdonnances.filter((item) => new Date(item.created_at || "").getTime() >= monthStart.getTime()).length;
    return { total: safeOrdonnances.length, pending, completed, currentMonth };
  }, [safeOrdonnances]);

  const filteredOrdonnances = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return safeOrdonnances.filter((item) => {
      const normalizedStatus = String(item.status || "").toLowerCase();
      if (statusFilter === "pending" && ["effectuee", "effectuée"].includes(normalizedStatus)) return false;
      if (statusFilter === "done" && !["effectuee", "effectuée"].includes(normalizedStatus)) return false;

      if (!needle) return true;
      const haystack = `${item.id || ""} ${item.nom || ""} ${item.prenom || ""} ${item.cin || ""} ${item.patient_matricule || ""} ${item.ordonnance || ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [safeOrdonnances, search, statusFilter]);

  const selectPatient = (patientIdValue) => {
    const patientId = Number(patientIdValue);
    const patient = patients.find((row) => Number(row.id) === patientId) || null;

    if (!patient) {
      setCreateForm((prev) => ({ ...prev, patient_id: "" }));
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      patient_id: String(patient.id),
      nom: patient.nom || "",
      prenom: patient.prenom || "",
      cin: patient.cin || "",
    }));
  };

  const createOrdonnance = async (event) => {
    event.preventDefault();
    if (!isDoctor) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const normalizedCin = String(createForm.cin || "").trim();
      if (normalizedCin && !/^\d{8}$/.test(normalizedCin)) {
        setError("Le CIN doit contenir exactement 8 chiffres");
        return;
      }

      await api.post("/ordonnances", {
        patient_id: createForm.patient_id ? Number(createForm.patient_id) : null,
        nom: createForm.nom,
        prenom: createForm.prenom,
        cin: normalizedCin || null,
        ordonnance: createForm.ordonnance,
      });

      setMessage("Ordonnance creee avec succes");
      setCreateForm(initialCreateForm);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Creation de l'ordonnance impossible");
    } finally {
      setSaving(false);
    }
  };

  const saveEditedOrdonnance = async (payload) => {
    const normalizedCin = String(payload.cin || "").trim();
    if (normalizedCin && !/^\d{8}$/.test(normalizedCin)) {
      const validationError = new Error("Validation");
      validationError.response = { data: { error: "Le CIN doit contenir exactement 8 chiffres" } };
      throw validationError;
    }

    await api.put(`/ordonnances/${editingOrdonnance.id}`, payload);
    setEditingOrdonnance(null);
    setMessage("Ordonnance mise a jour");
    await loadData();
  };

  const deleteOrdonnance = async (ordonnanceId) => {
    if (!isDoctor) return;
    if (!window.confirm("Supprimer cette ordonnance ?")) return;
    try {
      await api.delete(`/ordonnances/${ordonnanceId}`);
      setMessage("Ordonnance supprimee");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Suppression impossible");
    }
  };

  const printOrdonnance = (ordonnance) => {
    const popup = window.open("", "_blank", "width=920,height=720");
    if (!popup) {
      setError("Le navigateur a bloque l'ouverture de la fenetre d'impression.");
      return;
    }

    popup.document.open();
    popup.document.write(buildPrintableHtml({ ordonnance, doctorName }));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-card border border-border shadow-card p-8 text-center text-text-secondary text-sm">
        Chargement des ordonnances...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats header */}
      <div className="bg-primary rounded-card border border-primary/20 shadow-card p-5">
        <h1 className="text-lg font-semibold text-white">{isDoctor ? "Ordonnances du cabinet" : "Ordonnances des patients"}</h1>
        <p className="mt-1 text-sm text-white/65">
          {isDoctor ? "Creation, edition et impression avec un rendu professionnel." : "Consultation et impression des ordonnances du cabinet."}
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total",      value: counts.total },
            { label: "En attente", value: counts.pending },
            { label: "Effectuees", value: counts.completed },
            { label: "Ce mois",    value: counts.currentMonth },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2.5">
              <p className="text-xs text-white/60 uppercase tracking-wide">{stat.label}</p>
              <p className="mt-0.5 text-xl font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className="rounded-card border-l-4 border-medical-success bg-medical-success-bg px-4 py-3 text-sm text-medical-success">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
          {error}
        </div>
      )}

      {/* Create form */}
      {isDoctor && (
        <form onSubmit={createOrdonnance} className="bg-card rounded-card border border-border shadow-card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="rounded-lg bg-accent-light p-2 text-accent">
              <Stethoscope size={15} />
            </div>
            <h2 className="text-sm font-semibold text-text-primary">Créer une ordonnance</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-text-secondary uppercase tracking-wide">Patient</label>
              <select value={createForm.patient_id} onChange={(event) => selectPatient(event.target.value)} className={inputCls}>
                <option value="">Sélectionner un patient (optionnel)</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.prenom} {patient.nom} - {patient.matricule}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary uppercase tracking-wide">Nom</label>
              <input value={createForm.nom} onChange={(event) => setCreateForm((prev) => ({ ...prev, nom: event.target.value }))} required className={inputCls} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary uppercase tracking-wide">Prénom</label>
              <input value={createForm.prenom} onChange={(event) => setCreateForm((prev) => ({ ...prev, prenom: event.target.value }))} required className={inputCls} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary uppercase tracking-wide">CIN</label>
              <input value={createForm.cin} onChange={(event) => setCreateForm((prev) => ({ ...prev, cin: event.target.value }))} placeholder="Optionnel - 8 chiffres" className={inputCls} />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-text-secondary uppercase tracking-wide">Prescription</label>
              <textarea
                value={createForm.ordonnance}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, ordonnance: event.target.value }))}
                required
                rows={7}
                placeholder="Détaillez le traitement, la posologie, la durée et les recommandations..."
                className={`${inputCls} resize-y`}
              />
              <p className="mt-1 text-right text-xs text-text-muted">
                {String(createForm.ordonnance || "").length} caractères
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">
              {selectedPatient
                ? `Patient sélectionné: ${selectedPatient.prenom} ${selectedPatient.nom} (${selectedPatient.matricule})`
                : "Vous pouvez aussi saisir manuellement les informations patient."}
            </p>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 transition-colors flex-shrink-0">
              <Save size={14} /> {saving ? "Création..." : "Créer l'ordonnance"}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      <div className="bg-card rounded-card border border-border shadow-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Historique ({filteredOrdonnances.length})</h2>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <div className="relative min-w-[240px] flex-1 lg:flex-none">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher nom, matricule, CIN..."
                className={`${inputCls} pl-9`}
              />
            </div>

            <div className="inline-flex rounded-lg border border-border bg-gray-50 p-1">
              {[
                { key: "all",     label: "Tous" },
                { key: "pending", label: "En attente" },
                { key: "done",    label: "Effectuees" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === f.key ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button type="button" onClick={loadData} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors">
              <RefreshCcw size={13} /> Actualiser
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-card border border-dashed border-border bg-gray-50 p-8 text-center text-sm text-text-secondary">
            Chargement...
          </div>
        ) : filteredOrdonnances.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-gray-50 p-8 text-center text-text-secondary">
            <UserRoundSearch className="mx-auto mb-2 text-text-muted" size={22} />
            <p className="text-sm">Aucune ordonnance trouvée.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrdonnances.map((ordonnance) => (
              <article key={ordonnance.id} className="rounded-card border border-border bg-gray-50/60 p-4 hover:border-accent/30 hover:shadow-card transition-all">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">Ordonnance #{ordonnance.id}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(ordonnance.status)}`}>
                        {ordonnance.status || "En attente"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {ordonnance.prenom} {ordonnance.nom}
                    </p>
                    <p className="text-xs text-text-muted">
                      Matricule: <span className="font-medium text-text-secondary">{ordonnance.patient_matricule || "-"}</span>
                      {" · "}
                      CIN: <span className="font-medium text-text-secondary">{ordonnance.cin || "-"}</span>
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-secondary">
                    <CalendarClock size={12} />
                    {toHumanDateTime(ordonnance.created_at)}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border bg-gray-50 p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Prescription</p>
                  <pre className="max-h-36 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                    {ordonnance.ordonnance}
                  </pre>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => printOrdonnance(ordonnance)} className="inline-flex items-center gap-1.5 rounded-lg border border-accent-light bg-accent-light px-3 py-2 text-sm text-accent hover:bg-accent/10 transition-colors">
                    <Printer size={14} /> Imprimer
                  </button>
                  {isDoctor && (
                    <>
                      <button type="button" onClick={() => setEditingOrdonnance(ordonnance)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-gray-100 transition-colors">
                        <Pencil size={14} /> Modifier
                      </button>
                      <button type="button" onClick={() => deleteOrdonnance(ordonnance.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-medical-danger/30 bg-medical-danger-bg px-3 py-2 text-sm text-medical-danger hover:bg-red-100 transition-colors">
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {isDoctor && editingOrdonnance && (
        <EditOrdonnanceModal
          ordonnance={editingOrdonnance}
          onClose={() => setEditingOrdonnance(null)}
          onSave={saveEditedOrdonnance}
        />
      )}
    </div>
  );
};

export default DoctorsOrdonnancesPage;

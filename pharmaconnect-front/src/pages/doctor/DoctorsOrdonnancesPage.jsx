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
  if (normalized === "effectuÃ©e" || normalized === "effectuee") {
    return "bg-emerald-100 text-emerald-700";
  }
  return "bg-amber-100 text-amber-700";
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
      color: #0f172a;
      background: #f8fafc;
    }
    .sheet {
      max-width: 840px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
    }
    .top {
      padding: 20px 24px;
      background: linear-gradient(120deg, #0e7490, #0f766e);
      color: #fff;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: center;
    }
    .title {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0.4px;
      font-weight: 700;
    }
    .subtitle {
      margin-top: 4px;
      opacity: 0.9;
      font-size: 14px;
    }
    .id-pill {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }
    .body {
      padding: 22px 24px;
      display: grid;
      gap: 14px;
    }
    .block {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .block-title {
      margin: 0 0 8px 0;
      color: #0f766e;
      font-size: 13px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .line { margin: 4px 0; font-size: 14px; }
    .label { color: #475569; font-weight: 600; }
    .rx {
      font-size: 34px;
      color: #0f766e;
      font-weight: 700;
      margin-bottom: 10px;
      font-family: Georgia, "Times New Roman", serif;
    }
    .prescription {
      min-height: 180px;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 14px;
      line-height: 1.65;
      font-size: 15px;
      white-space: normal;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-end;
      margin-top: 18px;
    }
    .signature {
      width: 260px;
      text-align: center;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 12px;
      color: #475569;
    }
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
        <h1 class="title">Ordonnance MÃ©dicale</h1>
        <div class="subtitle">Document de prescription professionnelle</div>
      </div>
      <div class="id-pill">Ordonnance #${ordonnance.id}</div>
    </div>

    <div class="body">
      <div class="block">
        <h2 class="block-title">Informations</h2>
        <div class="line"><span class="label">MÃ©decin:</span> ${escapeHtml(doctorName)}</div>
        <div class="line"><span class="label">Patient:</span> ${escapeHtml(ordonnance.prenom)} ${escapeHtml(ordonnance.nom)}</div>
        <div class="line"><span class="label">Matricule:</span> ${escapeHtml(ordonnance.patient_matricule || "-")}</div>
        <div class="line"><span class="label">CIN:</span> ${escapeHtml(ordonnance.cin || "-")}</div>
        <div class="line"><span class="label">Date d'Ã©mission:</span> ${toHumanDateTime(ordonnance.created_at)}</div>
        <div class="line"><span class="label">Date d'impression:</span> ${generatedAt}</div>
      </div>

      <div class="block">
        <div class="rx">Rx</div>
        <div class="prescription">${prescriptionText || "-"}</div>
      </div>

      <div class="footer">
        <div class="line"><span class="label">Cachet / signature mÃ©decin</span></div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-3xl space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Modifier l&apos;ordonnance #{ordonnance.id}</h3>
            <p className="text-xs text-slate-500">{toHumanDateTime(ordonnance.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
            Fermer
          </button>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={form.nom}
            onChange={(event) => setForm((prev) => ({ ...prev, nom: event.target.value }))}
            required
            placeholder="Nom"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            value={form.prenom}
            onChange={(event) => setForm((prev) => ({ ...prev, prenom: event.target.value }))}
            required
            placeholder="Prenom"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            value={ordonnance.patient_matricule || ""}
            disabled
            placeholder="Matricule"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
          />
          <input
            value={form.cin}
            onChange={(event) => setForm((prev) => ({ ...prev, cin: event.target.value }))}
            placeholder="CIN (optionnel, 8 chiffres)"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>

        <textarea
          value={form.ordonnance}
          onChange={(event) => setForm((prev) => ({ ...prev, ordonnance: event.target.value }))}
          required
          rows={10}
          placeholder="Prescription"
          className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
            <Save size={15} /> {saving ? "Mise a jour..." : "Enregistrer"}
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
      (item) => !["effectuee", "effectuÃ©e"].includes(String(item.status || "").toLowerCase()),
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
      if (statusFilter === "pending" && ["effectuee", "effectuÃ©e"].includes(normalizedStatus)) return false;
      if (statusFilter === "done" && !["effectuee", "effectuÃ©e"].includes(normalizedStatus)) return false;

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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Chargement des ordonnances...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h1 className="text-3xl font-bold">{isDoctor ? "Ordonnances du cabinet" : "Ordonnances des patients"}</h1>
          <p className="mt-1 text-sm text-cyan-100">
            {isDoctor
              ? "CrÃ©ation, Ã©dition et impression avec un rendu professionnel."
              : "Consultation et impression des ordonnances du cabinet."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-cyan-100">Total</p>
              <p className="text-xl font-semibold">{counts.total}</p>
            </div>
            <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-cyan-100">En attente</p>
              <p className="text-xl font-semibold">{counts.pending}</p>
            </div>
            <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-cyan-100">EffectuÃ©es</p>
              <p className="text-xl font-semibold">{counts.completed}</p>
            </div>
            <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-cyan-100">Ce mois</p>
              <p className="text-xl font-semibold">{counts.currentMonth}</p>
            </div>
          </div>
        </div>
      </section>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      {isDoctor && (
        <section>
          <form onSubmit={createOrdonnance} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                <Stethoscope size={16} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">CrÃ©er une ordonnance</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</label>
                <select
                  value={createForm.patient_id}
                  onChange={(event) => selectPatient(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">SÃ©lectionner un patient (optionnel)</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.prenom} {patient.nom} - {patient.matricule}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</label>
                <input
                  value={createForm.nom}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, nom: event.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">PrÃ©nom</label>
                <input
                  value={createForm.prenom}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, prenom: event.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">CIN</label>
                <input
                  value={createForm.cin}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, cin: event.target.value }))}
                  placeholder="Optionnel - 8 chiffres"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prescription</label>
                <textarea
                  value={createForm.ordonnance}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, ordonnance: event.target.value }))}
                  required
                  rows={7}
                  placeholder="DÃ©taillez le traitement, la posologie, la durÃ©e, et les recommandations..."
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed"
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {String(createForm.ordonnance || "").length} caractÃ¨res
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {selectedPatient
                  ? `Patient sÃ©lectionnÃ©: ${selectedPatient.prenom} ${selectedPatient.nom} (${selectedPatient.matricule})`
                  : "Vous pouvez aussi saisir manuellement les informations patient."}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                <Save size={15} /> {saving ? "CrÃ©ation..." : "CrÃ©er l'ordonnance"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Historique ({filteredOrdonnances.length})</h2>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <div className="relative min-w-[260px] flex-1 lg:flex-none">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher nom, matricule, CIN, texte ou NÂ°"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>

            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === "pending" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                En attente
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("done")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === "done" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                EffectuÃ©es
              </button>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw size={14} /> Actualiser
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Chargement...</div>
        ) : filteredOrdonnances.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            <UserRoundSearch className="mx-auto mb-2" size={22} />
            Aucune ordonnance trouvÃ©e.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrdonnances.map((ordonnance) => (
              <article key={ordonnance.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-cyan-200 hover:shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-slate-900">Ordonnance #{ordonnance.id}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(ordonnance.status)}`}>
                        {ordonnance.status || "En attente"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {ordonnance.prenom} {ordonnance.nom}
                    </p>
                    <p className="text-xs text-slate-500">
                      Matricule: <span className="font-medium text-slate-700">{ordonnance.patient_matricule || "-"}</span>
                      {" Â· "}
                      CIN: <span className="font-medium text-slate-700">{ordonnance.cin || "-"}</span>
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    <CalendarClock size={13} />
                    {toHumanDateTime(ordonnance.created_at)}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Prescription</p>
                  <pre className="max-h-36 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {ordonnance.ordonnance}
                  </pre>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => printOrdonnance(ordonnance)}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-100"
                  >
                    <Printer size={15} /> Imprimer
                  </button>
                  {isDoctor && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingOrdonnance(ordonnance)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil size={15} /> Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOrdonnance(ordonnance.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 size={15} /> Supprimer
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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



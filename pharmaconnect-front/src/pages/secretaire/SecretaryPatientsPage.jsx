import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2, UserRoundPlus, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import PatientFicheModal from "../../components/patients/PatientFicheModal";

const initialForm = {
  nom: "",
  prenom: "",
  cin: "",
  telephone: "",
  date_naissance: "",
};

const inputCls =
  "w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-card placeholder-text-muted outline-none transition focus:ring-2 focus:ring-accent/30 focus:border-accent";

const PatientEditModal = ({ patient, onClose, onSave }) => {
  const [form, setForm] = useState({
    nom: patient?.nom || "",
    prenom: patient?.prenom || "",
    cin: patient?.cin || "",
    telephone: patient?.telephone || "",
    date_naissance: patient?.date_naissance || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        cin: form.cin || null,
        telephone: form.telephone || null,
        date_naissance: form.date_naissance || null,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Mise a jour impossible");
    } finally {
      setSaving(false);
    }
  };

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-card rounded-card border border-border shadow-card-hover p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">Modifier le patient</h3>
          <button type="button" onClick={onClose} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Fermer
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <input name="nom"       value={form.nom}       onChange={handleChange} placeholder="Nom"       required className={inputCls} />
          <input name="prenom"    value={form.prenom}    onChange={handleChange} placeholder="Prenom"    required className={inputCls} />
          <input name="cin"       value={form.cin}       onChange={handleChange} placeholder="CIN"                className={inputCls} />
          <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="Telephone"          className={inputCls} />
          <input name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange}            className={inputCls} />
        </div>

        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 transition-colors">
            <Pencil size={13} /> {saving ? "Mise a jour..." : "Mettre a jour"}
          </button>
        </div>
      </form>
    </div>
  );
};

const SecretaryPatientsPage = ({
  title = "Gestion des patients",
  subtitle = "",
}) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const prefillAppliedRef = useRef(false);
  const isDoctor = String(user?.role || "").toLowerCase() === "doctor";

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [selectedFiche, setSelectedFiche] = useState(null);
  const [selectedFichePatientId, setSelectedFichePatientId] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [creatingFreeNote, setCreatingFreeNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sortedPatients = useMemo(
    () =>
      [...patients].sort((a, b) => {
        const left = `${a.prenom || ""} ${a.nom || ""}`.toLowerCase();
        const right = `${b.prenom || ""} ${b.nom || ""}`.toLowerCase();
        return left.localeCompare(right);
      }),
    [patients],
  );

  const loadPatients = async (searchValue = search) => {
    setLoading(true);
    try {
      const response = await api.get("/doctor-patients", {
        params: { search: searchValue || undefined },
      });
      const list = Array.isArray(response.data?.patients) ? response.data.patients : [];
      setPatients(list);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les patients");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (String(searchParams.get("fromAppointment") || "") !== "1") return;

    const nom = String(searchParams.get("nom") || "").trim();
    const prenom = String(searchParams.get("prenom") || "").trim();
    if (!nom || !prenom) return;

    const cin = String(searchParams.get("cin") || "").trim();
    const telephone = String(searchParams.get("telephone") || "").trim();
    const rawBirthDate = String(searchParams.get("date_naissance") || "").trim();
    const date_naissance = /^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate) ? rawBirthDate : "";
    const appointmentId = String(searchParams.get("appointment_id") || "").trim();

    setForm({ nom, prenom, cin, telephone, date_naissance });
    setError("");
    setMessage(
      appointmentId
        ? `Nouveau patient pre-rempli depuis le rendez-vous #${appointmentId}.`
        : "Nouveau patient pre-rempli depuis un rendez-vous.",
    );
    prefillAppliedRef.current = true;
  }, [searchParams]);

  const resetForm = () => {
    setForm(initialForm);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/doctor-patients", {
        ...form,
        cin: form.cin || null,
        telephone: form.telephone || null,
        date_naissance: form.date_naissance || null,
      });
      setMessage("Patient ajoute avec succes");
      resetForm();
      await loadPatients();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Operation impossible");
    }
  };

  const onDelete = async (patientId) => {
    if (!window.confirm("Supprimer ce patient ?")) return;
    try {
      await api.delete(`/doctor-patients/${patientId}`);
      setMessage("Patient supprime avec succes");
      await loadPatients();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Suppression impossible");
    }
  };

  const onSaveEdit = async (payload) => {
    await api.put(`/doctor-patients/${editingPatient.id}`, payload);
    setEditingPatient(null);
    setMessage("Patient modifie avec succes");
    await loadPatients();
    if (selectedFichePatientId === editingPatient.id) {
      const refreshed = await api.get(`/doctor-patients/${editingPatient.id}/fiche`);
      setSelectedFiche(refreshed.data?.fiche || null);
    }
  };

  const openFiche = async (patientId) => {
    try {
      const response = await api.get(`/doctor-patients/${patientId}/fiche`);
      setSelectedFiche(response.data?.fiche || null);
      setSelectedFichePatientId(patientId);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger la fiche patient");
    }
  };

  const refreshFiche = async () => {
    if (!selectedFichePatientId) return;
    const response = await api.get(`/doctor-patients/${selectedFichePatientId}/fiche`);
    setSelectedFiche(response.data?.fiche || null);
  };

  const saveConsultationEntry = async (entry, payload) => {
    if (!isDoctor) return;
    if (entry.source_type === "appointment" && entry.appointment_id) {
      await api.put(`/appointments/${entry.appointment_id}`, payload);
    } else if (entry.source_type === "free_note" && selectedFichePatientId) {
      await api.put(`/doctor-patients/${selectedFichePatientId}/fiche-notes/${entry.source_id}`, payload);
    }
    await refreshFiche();
    setMessage("Fiche mise a jour avec succes");
  };

  const createFreeNote = async (payload) => {
    if (!isDoctor || !selectedFichePatientId) return;
    setCreatingFreeNote(true);
    try {
      await api.post(`/doctor-patients/${selectedFichePatientId}/fiche-notes`, payload);
      await refreshFiche();
      setMessage("Note de fiche ajoutee");
    } finally {
      setCreatingFreeNote(false);
    }
  };

  const deleteConsultationEntry = async (entry) => {
    if (!isDoctor) return;

    if (entry.source_type === "free_note" && selectedFichePatientId) {
      await api.delete(`/doctor-patients/${selectedFichePatientId}/fiche-notes/${entry.source_id}`);
    } else if (entry.source_type === "appointment" && entry.appointment_id) {
      await api.put(`/appointments/${entry.appointment_id}`, {
        doctor_notes: null,
        payment_doctor_comment: null,
      });
    }

    await refreshFiche();
    setMessage("Note supprimee avec succes");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-primary rounded-card border border-primary/20 shadow-card px-5 py-4">
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-white/65">{subtitle}</p> : null}
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

      {/* Add patient form */}
      <section className="bg-card rounded-card border border-border shadow-card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="rounded-lg bg-accent-light p-2 text-accent">
            <Plus size={15} />
          </div>
          <h2 className="text-sm font-semibold text-text-primary">Ajouter un patient</h2>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
          <input value={form.nom}           onChange={(event) => setForm((prev) => ({ ...prev, nom: event.target.value }))}           placeholder="Nom"       required className={inputCls} />
          <input value={form.prenom}        onChange={(event) => setForm((prev) => ({ ...prev, prenom: event.target.value }))}        placeholder="Prenom"    required className={inputCls} />
          <input value={form.cin}           onChange={(event) => setForm((prev) => ({ ...prev, cin: event.target.value }))}           placeholder="CIN"                className={inputCls} />
          <input value={form.telephone}     onChange={(event) => setForm((prev) => ({ ...prev, telephone: event.target.value }))}     placeholder="Telephone"          className={inputCls} />
          <input type="date" value={form.date_naissance} onChange={(event) => setForm((prev) => ({ ...prev, date_naissance: event.target.value }))} className={inputCls} />

          <div className="flex justify-end gap-2.5 md:col-span-3">
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors">
              <X size={13} /> Vider
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
              <Plus size={13} /> Ajouter patient
            </button>
          </div>
        </form>
      </section>

      {/* Patient list */}
      <section className="bg-card rounded-card border border-border shadow-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Liste des patients ({patients.length})</h2>
          <div className="flex gap-2.5 flex-wrap">
            <div className="relative w-full md:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") loadPatients(event.currentTarget.value); }}
                placeholder="Rechercher par nom, matricule, CIN..."
                className={`${inputCls} pl-9`}
              />
            </div>
            <button onClick={() => loadPatients(search)} className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors">
              Rechercher
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-card border border-dashed border-border bg-gray-50 p-8 text-center text-sm text-text-secondary">
            Chargement...
          </div>
        ) : sortedPatients.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-gray-50 p-8 text-center text-text-secondary">
            <UserRoundPlus className="mx-auto mb-2 text-text-muted" size={22} />
            <p className="text-sm">Aucun patient trouve.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    {["Patient", "Matricule", "Coordonnees", "Naissance", "Actions"].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-text-primary">{patient.prenom} {patient.nom}</p>
                        <p className="text-xs text-text-secondary">CIN: {patient.cin || "-"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent">
                          {patient.matricule}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary">{patient.telephone || "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary">{patient.date_naissance || "-"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openFiche(patient.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-accent-light bg-accent-light px-3 py-2 text-sm text-accent hover:bg-accent/10 transition-colors">
                            <Eye size={14} /> Fiche
                          </button>
                          <button onClick={() => setEditingPatient(patient)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-gray-100 transition-colors">
                            <Pencil size={14} /> Modifier
                          </button>
                          <button onClick={() => onDelete(patient.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-medical-danger/30 bg-medical-danger-bg px-3 py-2 text-sm text-medical-danger hover:bg-red-100 transition-colors">
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {selectedFiche && (
        <PatientFicheModal
          fiche={selectedFiche}
          onClose={() => {
            setSelectedFiche(null);
            setSelectedFichePatientId(null);
          }}
          isDoctor={isDoctor}
          onSaveConsultation={saveConsultationEntry}
          onCreateFreeNote={createFreeNote}
          onDeleteConsultation={deleteConsultationEntry}
          creatingFreeNote={creatingFreeNote}
        />
      )}

      {editingPatient && (
        <PatientEditModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSave={onSaveEdit}
        />
      )}
    </div>
  );
};

export default SecretaryPatientsPage;

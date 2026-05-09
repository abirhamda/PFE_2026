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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Modifier le patient</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Fermer
          </button>
        </div>

        {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-3 md:grid-cols-2">
          <input name="nom" value={form.nom} onChange={handleChange} placeholder="Nom" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Prenom" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input name="cin" value={form.cin} onChange={handleChange} placeholder="CIN" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="Telephone" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
            <Pencil size={14} /> {saving ? "Mise a jour..." : "Mettre a jour"}
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

    setForm({
      nom,
      prenom,
      cin,
      telephone,
      date_naissance,
    });
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
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 to-teal-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-cyan-100">{subtitle}</p> : null}
      </section>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
            <Plus size={15} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Ajouter un patient</h2>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
          <input value={form.nom} onChange={(event) => setForm((prev) => ({ ...prev, nom: event.target.value }))} placeholder="Nom" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input value={form.prenom} onChange={(event) => setForm((prev) => ({ ...prev, prenom: event.target.value }))} placeholder="Prenom" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input value={form.cin} onChange={(event) => setForm((prev) => ({ ...prev, cin: event.target.value }))} placeholder="CIN" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input value={form.telephone} onChange={(event) => setForm((prev) => ({ ...prev, telephone: event.target.value }))} placeholder="Telephone" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input type="date" value={form.date_naissance} onChange={(event) => setForm((prev) => ({ ...prev, date_naissance: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />

          <div className="flex justify-end gap-2 md:col-span-3">
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
              <X size={14} /> Vider
            </button>
            <button type="submit" className="inline-flex items-center gap-1 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">
              <Plus size={14} /> Ajouter patient
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Liste des patients ({patients.length})</h2>
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadPatients(event.currentTarget.value);
              }}
              placeholder="Rechercher par nom, prenom, matricule, CIN..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
          <button onClick={() => loadPatients(search)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            Rechercher
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Chargement...</div>
        ) : sortedPatients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            <UserRoundPlus className="mx-auto mb-2" size={22} />
            Aucun patient trouve.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Coordonnees</th>
                    <th className="px-4 py-3">Naissance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{patient.prenom} {patient.nom}</p>
                        <p className="text-xs text-slate-500">CIN: {patient.cin || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">{patient.matricule}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{patient.telephone || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{patient.date_naissance || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openFiche(patient.id)} className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-100">
                            <Eye size={15} /> Fiche
                          </button>
                          <button onClick={() => setEditingPatient(patient)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                            <Pencil size={15} /> Modifier
                          </button>
                          <button onClick={() => onDelete(patient.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">
                            <Trash2 size={15} /> Supprimer
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

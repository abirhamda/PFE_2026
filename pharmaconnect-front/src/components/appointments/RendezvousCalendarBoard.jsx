import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  Save,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import PatientFicheModal from "../patients/PatientFicheModal";

const HOLIDAYS = {
  "01-01": "Jour de l'an",
  "01-11": "Manifeste de l'independance",
  "05-01": "Fete du Travail",
  "07-30": "Fete du Trone",
  "08-14": "Oued Ed-Dahab",
  "08-20": "Revolution du Roi et du Peuple",
  "08-21": "Fete de la Jeunesse",
  "11-06": "Marche Verte",
  "11-18": "Fete de l'Independance",
};

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const todayKey = () => dateKey(new Date());

const fromDateValue = (value) => String(value || "").slice(0, 10);

const isSundayKey = (key) => {
  const date = new Date(`${key}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getDay() === 0;
};

const toHumanDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toHumanTime = (value) => {
  if (!value) return "--";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const toMad = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)} MAD` : "-";
};

const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const monthBounds = (monthAnchor) => {
  const start = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const end = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  return {
    from: dateKey(start),
    to: dateKey(end),
  };
};

const buildMonthCells = (monthAnchor) => {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(new Date(year, month, day));

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailing; i += 1) cells.push(null);

  return cells;
};

const initialForm = (day = todayKey()) => ({
  patient_id: null,
  patient_matricule: "",
  patient_nom: "",
  patient_prenom: "",
  patient_phone: "",
  patient_date_naissance: "",
  date: day,
  time: "09:00",
  payment_amount: "",
  payment_doctor_comment: "",
});

const EditAppointmentModal = ({ appointment, onClose, onSave, isDoctor, isSecretary }) => {
  const [form, setForm] = useState({
    patient_matricule: appointment?.patient_matricule || "",
    patient_nom: appointment?.patient_nom || "",
    patient_prenom: appointment?.patient_prenom || "",
    patient_phone: appointment?.patient_phone || "",
    patient_date_naissance: appointment?.patient_date_naissance || "",
    date: fromDateValue(appointment?.appointment_at) || todayKey(),
    time: toHumanTime(appointment?.appointment_at) === "--" ? "09:00" : toHumanTime(appointment?.appointment_at),
    payment_amount: appointment?.payment_amount ?? "",
    doctor_notes: appointment?.doctor_notes || "",
    payment_doctor_comment: appointment?.payment_doctor_comment || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isSundayKey(form.date)) {
        throw new Error("Le dimanche est ferme");
      }

      const payload = {
        patient_matricule: form.patient_matricule || null,
        patient_nom: form.patient_nom,
        patient_prenom: form.patient_prenom,
        patient_phone: form.patient_phone || null,
        patient_date_naissance: form.patient_date_naissance || null,
        appointment_at: `${form.date} ${form.time}:00`,
      };

      if (isSecretary) {
        payload.payment_amount = form.payment_amount === "" ? null : Number(form.payment_amount);
      }

      if (isDoctor) {
        payload.doctor_notes = form.doctor_notes || null;
        payload.payment_doctor_comment = form.payment_doctor_comment || null;
      }

      await onSave(payload);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || requestError?.message || "Mise a jour impossible");
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-3xl space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Modifier le rendez-vous</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Fermer
          </button>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.patient_matricule} onChange={(event) => setForm((prev) => ({ ...prev, patient_matricule: event.target.value }))} placeholder="Matricule" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input type="date" value={form.patient_date_naissance} onChange={(event) => setForm((prev) => ({ ...prev, patient_date_naissance: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input value={form.patient_nom} onChange={(event) => setForm((prev) => ({ ...prev, patient_nom: event.target.value }))} required placeholder="Nom" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input value={form.patient_prenom} onChange={(event) => setForm((prev) => ({ ...prev, patient_prenom: event.target.value }))} required placeholder="Prenom" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input value={form.patient_phone} onChange={(event) => setForm((prev) => ({ ...prev, patient_phone: event.target.value }))} placeholder="Telephone" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input type="time" value={form.time} onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />

          {isSecretary && (
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.payment_amount}
              onChange={(event) => setForm((prev) => ({ ...prev, payment_amount: event.target.value }))}
              placeholder="Paiement (MAD)"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          )}
        </div>

        {isDoctor && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Paiement enregistre par la secretaire:</span>{" "}
            {toMad(form.payment_amount)}
          </div>
        )}

        {isDoctor && (
          <>
            <textarea
              value={form.doctor_notes}
              onChange={(event) => setForm((prev) => ({ ...prev, doctor_notes: event.target.value }))}
              rows={3}
              placeholder="Notes medecin"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <textarea
              value={form.payment_doctor_comment}
              onChange={(event) => setForm((prev) => ({ ...prev, payment_doctor_comment: event.target.value }))}
              rows={2}
              placeholder="Commentaire paiement pour la secretaire"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
            <Save size={15} /> {saving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </form>
    </div>
  );
};

const RendezvousCalendarBoard = ({
  title,
  subtitle,
  canManageAppointments = false,
  canAdjustWaitingCount = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || "").toLowerCase();
  const isDoctor = role === "doctor";
  const isSecretary = role === "secretaire";

  const [monthAnchor, setMonthAnchor] = useState(firstDayOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(initialForm(todayKey()));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [ficheData, setFicheData] = useState(null);
  const [ficheAppointmentId, setFicheAppointmentId] = useState(null);
  const [creatingFreeNote, setCreatingFreeNote] = useState(false);

  const bounds = useMemo(() => monthBounds(monthAnchor), [monthAnchor]);
  const calendarCells = useMemo(() => buildMonthCells(monthAnchor), [monthAnchor]);

  const appointmentsByDay = useMemo(() => {
    const grouped = {};
    for (const appointment of appointments) {
      const key = fromDateValue(appointment.appointment_at);
      if (!key) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(appointment);
    }
    return grouped;
  }, [appointments]);

  const selectedAppointments = useMemo(() => {
    const list = [...(appointmentsByDay[selectedDay] || [])];
    list.sort((left, right) => {
      const l = new Date(String(left.appointment_at).replace(" ", "T")).getTime();
      const r = new Date(String(right.appointment_at).replace(" ", "T")).getTime();
      return l - r;
    });
    return list;
  }, [appointmentsByDay, selectedDay]);

  const selectedIsSunday = isSundayKey(selectedDay);

  const loadAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/appointments/calendar", {
        params: { from: bounds.from, to: bounds.to },
      });
      setAppointments(Array.isArray(response.data?.appointments) ? response.data.appointments : []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les rendez-vous");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWaitingCounter = async (date = selectedDay) => {
    setWaitingLoading(true);
    try {
      const response = await api.get("/appointments/waiting-room", { params: { date } });
      setWaitingCount(Number(response.data?.waiting_count || 0));
    } catch (_error) {
      setWaitingCount(0);
    } finally {
      setWaitingLoading(false);
    }
  };

  const loadPatients = async () => {
    if (!canManageAppointments) return;
    setPatientsLoading(true);
    try {
      const response = await api.get("/doctor-patients");
      setPatientOptions(Array.isArray(response.data?.patients) ? response.data.patients : []);
    } catch (_error) {
      setPatientOptions([]);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.from, bounds.to]);

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageAppointments]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, date: selectedDay }));
    loadWaitingCounter(selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const applyPatient = (patient) => {
    if (!patient) return;
    setForm((prev) => ({
      ...prev,
      patient_id: patient.id,
      patient_matricule: patient.matricule || "",
      patient_nom: patient.nom || "",
      patient_prenom: patient.prenom || "",
      patient_phone: patient.telephone || "",
      patient_date_naissance: patient.date_naissance || "",
    }));
  };

  const pickPatient = (value) => {
    const id = Number(value);
    if (!value || !Number.isInteger(id) || id <= 0) {
      setForm((prev) => ({
        ...prev,
        patient_id: null,
        patient_matricule: "",
        patient_nom: "",
        patient_prenom: "",
        patient_phone: "",
        patient_date_naissance: "",
      }));
      return;
    }
    const patient = patientOptions.find((item) => Number(item.id) === id) || null;
    if (patient) {
      applyPatient(patient);
      setMessage(`Patient ${patient.prenom} ${patient.nom} charge automatiquement.`);
    }
  };

  const onMatriculeInput = (value) => {
    setForm((prev) => ({ ...prev, patient_matricule: value }));
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized) return;
    const match = patientOptions.find(
      (item) => String(item.matricule || "").trim().toUpperCase() === normalized,
    );
    if (match) applyPatient(match);
  };

  const lookupMatricule = async () => {
    const matricule = String(form.patient_matricule || "").trim();
    if (!matricule) return;
    try {
      const response = await api.get(`/doctor-patients/by-matricule/${encodeURIComponent(matricule)}`);
      const patient = response.data?.patient;
      if (patient) {
        applyPatient(patient);
        setMessage(`Patient ${patient.prenom} ${patient.nom} charge via matricule ${patient.matricule}.`);
      }
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setMessage("Matricule non trouve: vous pouvez continuer avec un nouveau patient.");
        setForm((prev) => ({ ...prev, patient_id: null }));
      } else {
        setError(requestError.response?.data?.error || "Recherche matricule impossible");
      }
    }
  };

  const createAppointment = async (event) => {
    event.preventDefault();
    if (!canManageAppointments) return;
    if (selectedIsSunday || isSundayKey(form.date)) {
      setError("Le dimanche est ferme: impossible d'ajouter un rendez-vous.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        patient_id: form.patient_id,
        patient_matricule: form.patient_matricule || null,
        patient_nom: form.patient_nom,
        patient_prenom: form.patient_prenom,
        patient_phone: form.patient_phone || null,
        patient_date_naissance: form.patient_date_naissance || null,
        appointment_at: `${form.date} ${form.time}:00`,
      };

      if (isSecretary) {
        payload.payment_amount = form.payment_amount === "" ? null : Number(form.payment_amount);
      }
      if (isDoctor && form.payment_doctor_comment) {
        payload.payment_doctor_comment = form.payment_doctor_comment;
      }

      await api.post("/appointments", payload);
      setMessage("Rendez-vous ajoute avec succes");
      setForm(initialForm(form.date));
      await loadAppointments();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Creation du rendez-vous impossible");
    } finally {
      setSaving(false);
    }
  };

  const adjustCounter = async (delta) => {
    try {
      const response = await api.post("/appointments/waiting-room/adjust", { date: selectedDay, delta });
      setWaitingCount(Number(response.data?.waiting_count || 0));
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Mise a jour du compteur impossible");
    }
  };

  const removeAppointment = async (appointmentId) => {
    if (!canManageAppointments) return;
    if (!window.confirm("Supprimer ce rendez-vous ?")) return;
    try {
      await api.delete(`/appointments/${appointmentId}`);
      setMessage("Rendez-vous supprime");
      await loadAppointments();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Suppression impossible");
    }
  };

  const saveEditedAppointment = async (payload) => {
    if (!editingAppointment) return;
    await api.put(`/appointments/${editingAppointment.id}`, payload);
    setEditingAppointment(null);
    setMessage("Rendez-vous mis a jour");
    await loadAppointments();
  };

  const openFiche = async (appointmentId) => {
    try {
      const response = await api.get(`/appointments/${appointmentId}/fiche`);
      if (!response.data?.fiche?.patient) {
        setError("Impossible de charger la fiche patient");
        return;
      }
      setFicheAppointmentId(appointmentId);
      setFicheData(response.data.fiche);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Generation de fiche impossible");
    }
  };

  const openAddPatientPage = (appointment) => {
    if (!appointment) return;
    const targetPath = isDoctor ? "/docteur/patients" : "/secretaire/patients";
    const params = new URLSearchParams({
      fromAppointment: "1",
      appointment_id: String(appointment.id || ""),
      nom: String(appointment.patient_nom || ""),
      prenom: String(appointment.patient_prenom || ""),
      cin: String(appointment.patient_cin || ""),
      telephone: String(appointment.patient_phone || ""),
      date_naissance: String(appointment.patient_date_naissance || ""),
      patient_matricule: String(appointment.patient_matricule || ""),
    });

    navigate(`${targetPath}?${params.toString()}`);
  };

  const refreshOpenFiche = async () => {
    if (!ficheAppointmentId) return;
    const response = await api.get(`/appointments/${ficheAppointmentId}/fiche`);
    setFicheData(response.data?.fiche || null);
  };

  const saveConsultationFromFiche = async (entry, payload) => {
    if (!isDoctor) return;
    if (entry.source_type === "appointment" && entry.appointment_id) {
      await api.put(`/appointments/${entry.appointment_id}`, payload);
    } else if (entry.source_type === "free_note" && ficheData?.patient?.id) {
      await api.put(`/doctor-patients/${ficheData.patient.id}/fiche-notes/${entry.source_id}`, payload);
    }
    await refreshOpenFiche();
    await loadAppointments();
    setMessage("Fiche mise a jour");
  };

  const createFreeNoteFromFiche = async (payload) => {
    if (!isDoctor || !ficheData?.patient?.id) return;
    setCreatingFreeNote(true);
    try {
      await api.post(`/doctor-patients/${ficheData.patient.id}/fiche-notes`, payload);
      await refreshOpenFiche();
      setMessage("Note de fiche ajoutee");
    } finally {
      setCreatingFreeNote(false);
    }
  };

  const deleteConsultationFromFiche = async (entry) => {
    if (!isDoctor) return;

    if (entry.source_type === "free_note" && ficheData?.patient?.id) {
      await api.delete(`/doctor-patients/${ficheData.patient.id}/fiche-notes/${entry.source_id}`);
    } else if (entry.source_type === "appointment" && entry.appointment_id) {
      await api.put(`/appointments/${entry.appointment_id}`, {
        doctor_notes: null,
        payment_doctor_comment: null,
      });
    }

    await refreshOpenFiche();
    await loadAppointments();
    setMessage("Note supprimee avec succes");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-cyan-100">{subtitle}</p> : null}
      </section>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      {canManageAppointments && (
        <form onSubmit={createAppointment} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
              <Plus size={16} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Nouveau rendez-vous</h2>
          </div>

          {selectedIsSunday && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Dimanche selectionne: cabinet ferme, prise de rendez-vous desactivee.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={form.patient_id || ""}
              onChange={(event) => pickPatient(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm md:col-span-3"
            >
              <option value="">Nouveau patient (saisie manuelle)</option>
              {patientOptions.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.matricule} - {patient.prenom} {patient.nom}
                </option>
              ))}
            </select>

            <input
              list="patient-matricules"
              value={form.patient_matricule}
              onChange={(event) => onMatriculeInput(event.target.value)}
              onBlur={lookupMatricule}
              placeholder={patientsLoading ? "Chargement des matricules..." : "Matricule patient"}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm md:col-span-2"
            />
            <datalist id="patient-matricules">
              {patientOptions.map((patient) => (
                <option key={patient.id} value={patient.matricule}>
                  {patient.prenom} {patient.nom}
                </option>
              ))}
            </datalist>

            <input
              type="date"
              value={form.patient_date_naissance}
              onChange={(event) => setForm((prev) => ({ ...prev, patient_date_naissance: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.patient_nom}
              onChange={(event) => setForm((prev) => ({ ...prev, patient_nom: event.target.value }))}
              required
              placeholder="Nom patient"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.patient_prenom}
              onChange={(event) => setForm((prev) => ({ ...prev, patient_prenom: event.target.value }))}
              required
              placeholder="Prenom patient"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.patient_phone}
              onChange={(event) => setForm((prev) => ({ ...prev, patient_phone: event.target.value }))}
              placeholder="Telephone"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              required
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              type="time"
              value={form.time}
              onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
              required
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />

            {isSecretary && (
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.payment_amount}
                onChange={(event) => setForm((prev) => ({ ...prev, payment_amount: event.target.value }))}
                placeholder="Paiement recu (MAD)"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            )}
          </div>

          {isDoctor && (
            <textarea
              value={form.payment_doctor_comment}
              onChange={(event) => setForm((prev) => ({ ...prev, payment_doctor_comment: event.target.value }))}
              rows={2}
              placeholder="Commentaire paiement pour la secretaire"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          )}

          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={saving || selectedIsSunday} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
              <Save size={15} /> {saving ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </form>
      )}

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-cyan-700" />
              <h2 className="text-lg font-semibold text-slate-900">
                {monthAnchor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => setMonthAnchor(firstDayOfMonth(new Date()))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Aujourd'hui
              </button>
              <button type="button" onClick={() => setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Dimanche ferme</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Jour ferie</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-500">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((label) => (
              <div key={label} className="py-2">{label}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, index) => {
              if (!cell) {
                return <div key={`blank-${index}`} className="min-h-[96px] rounded-xl border border-transparent" />;
              }

              const key = dateKey(cell);
              const isToday = key === todayKey();
              const isSelected = key === selectedDay;
              const isSunday = cell.getDay() === 0;
              const list = appointmentsByDay[key] || [];
              const holidayCode = `${String(cell.getMonth() + 1).padStart(2, "0")}-${String(cell.getDate()).padStart(2, "0")}`;
              const holidayName = HOLIDAYS[holidayCode];

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`min-h-[96px] rounded-xl border p-2 text-left transition ${
                    isSunday
                      ? "border-rose-200 bg-rose-50/70"
                      : isSelected
                        ? "border-cyan-400 bg-cyan-50 shadow-sm"
                        : "border-slate-200 bg-slate-50/40 hover:border-cyan-200 hover:bg-cyan-50/40"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <span className={`text-sm font-semibold ${isSunday ? "text-rose-700" : "text-slate-900"}`}>
                      {cell.getDate()}
                    </span>
                    <div className="flex items-center gap-1">
                      {holidayName && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">Ferie</span>}
                      {isToday && <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] text-cyan-700">Auj</span>}
                    </div>
                  </div>

                  {isSunday ? (
                    <div className="rounded-md bg-white/70 px-1.5 py-1 text-[10px] font-medium text-rose-700">
                      Fermeture
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {list.slice(0, 2).map((appointment) => (
                        <div key={appointment.id} className="truncate rounded-md bg-white px-1.5 py-0.5 text-[10px] text-slate-600">
                          {toHumanTime(appointment.appointment_at)} - {appointment.patient_prenom}
                        </div>
                      ))}
                      {list.length > 2 && (
                        <div className="text-[10px] font-medium text-cyan-700">+ {list.length - 2} autres</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </h2>
            <button type="button" onClick={loadAppointments} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
              Actualiser
            </button>
          </div>

          {selectedIsSunday && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Dimanche: aucun nouveau rendez-vous.
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-teal-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-cyan-700">Compteur salle d'attente</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-3xl font-bold text-cyan-800">{waitingLoading ? "..." : waitingCount}</span>
              <div className="flex gap-2">
                {canAdjustWaitingCount ? (
                  <>
                    <button type="button" onClick={() => adjustCounter(-1)} className="inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50">
                      <ArrowDown size={14} /> -1
                    </button>
                    <button type="button" onClick={() => adjustCounter(1)} className="inline-flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                      <ArrowUp size={14} /> +1
                    </button>
                  </>
                ) : (
                  <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                    Lecture seule
                  </span>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Chargement...
            </div>
          ) : selectedAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Aucun rendez-vous ce jour.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppointments.map((appointment) => {
                const isNewPatient = !appointment.patient_id;
                return (
                  <div key={appointment.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {appointment.patient_prenom} {appointment.patient_nom}
                          </p>
                          {isNewPatient && (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                              Nouveau patient
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{toHumanDateTime(appointment.appointment_at)}</p>
                        {appointment.patient_matricule && (
                          <p className="text-xs text-cyan-700">Matricule: {appointment.patient_matricule}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      <p className="flex items-center gap-1">
                        <Clock3 size={13} /> Date naissance: {appointment.patient_date_naissance || "-"}
                      </p>
                      {appointment.patient_phone && <p>Tel: {appointment.patient_phone}</p>}
                      {appointment.doctor_notes && <p>Notes medecin: {appointment.doctor_notes}</p>}
                      <p>Paiement recu: {toMad(appointment.payment_amount)}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!isNewPatient && (
                        <button type="button" onClick={() => openFiche(appointment.id)} className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100">
                          <FileText size={13} /> Fiche patient
                        </button>
                      )}
                      {isNewPatient && canManageAppointments && (
                        <button
                          type="button"
                          onClick={() => openAddPatientPage(appointment)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                        >
                          <UserRoundPlus size={13} /> Ajouter a la liste
                        </button>
                      )}
                      {canManageAppointments && (
                        <>
                          <button type="button" onClick={() => setEditingAppointment(appointment)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Modifier
                          </button>
                          <button type="button" onClick={() => removeAppointment(appointment.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                            <Trash2 size={13} /> Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSave={saveEditedAppointment}
          isDoctor={isDoctor}
          isSecretary={isSecretary}
        />
      )}

      {ficheData && (
        <PatientFicheModal
          fiche={ficheData}
          onClose={() => {
            setFicheData(null);
            setFicheAppointmentId(null);
          }}
          isDoctor={isDoctor}
          onSaveConsultation={saveConsultationFromFiche}
          onCreateFreeNote={createFreeNoteFromFiche}
          onDeleteConsultation={deleteConsultationFromFiche}
          creatingFreeNote={creatingFreeNote}
        />
      )}
    </div>
  );
};

export default RendezvousCalendarBoard;

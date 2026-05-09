import { useMemo, useState } from "react";
import { FileText, Plus, Save, X } from "lucide-react";

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

const toMad = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)} MAD` : "-";
};

const labelClass =
  "inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600";

const PatientFicheModal = ({
  fiche,
  onClose,
  isDoctor = false,
  onSaveConsultation,
  onCreateFreeNote,
  onDeleteConsultation,
  creatingFreeNote = false,
}) => {
  const patient = fiche?.patient || {};
  const doctor = fiche?.doctor || {};
  const consultations = Array.isArray(fiche?.consultations) ? fiche.consultations : [];

  const sortedConsultations = useMemo(
    () =>
      [...consultations].sort((left, right) => {
        const l = new Date(String(left.entry_at || "").replace(" ", "T")).getTime();
        const r = new Date(String(right.entry_at || "").replace(" ", "T")).getTime();
        if (Number.isNaN(l) && Number.isNaN(r)) return 0;
        if (Number.isNaN(l)) return 1;
        if (Number.isNaN(r)) return -1;
        return r - l;
      }),
    [consultations],
  );

  const [drafts, setDrafts] = useState({});
  const [savingEntryId, setSavingEntryId] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState("");
  const [newDoctorNote, setNewDoctorNote] = useState("");
  const [newPaymentComment, setNewPaymentComment] = useState("");
  const [newEntryError, setNewEntryError] = useState("");

  const getDraft = (entry) =>
    drafts[entry.id] || {
      doctor_notes: entry.doctor_notes || "",
      payment_doctor_comment: entry.payment_doctor_comment || "",
    };

  const setDraft = (entryId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [entryId]: {
        ...(prev[entryId] || {}),
        ...patch,
      },
    }));
  };

  const saveEntry = async (entry) => {
    if (!isDoctor || !onSaveConsultation) return;
    const draft = getDraft(entry);
    setSavingEntryId(entry.id);
    try {
      await onSaveConsultation(entry, {
        doctor_notes: draft.doctor_notes || null,
        payment_doctor_comment: draft.payment_doctor_comment || null,
      });
    } finally {
      setSavingEntryId("");
    }
  };

  const createFreeNote = async () => {
    if (!isDoctor || !onCreateFreeNote) return;
    setNewEntryError("");
    if (!newDoctorNote.trim() && !newPaymentComment.trim()) {
      setNewEntryError("Veuillez saisir au moins une note.");
      return;
    }

    try {
      await onCreateFreeNote({
        doctor_notes: newDoctorNote.trim() || null,
        payment_doctor_comment: newPaymentComment.trim() || null,
      });
      setNewDoctorNote("");
      setNewPaymentComment("");
    } catch (error) {
      setNewEntryError(error?.response?.data?.error || "Ajout de note impossible");
    }
  };

  const deleteEntry = async (entry) => {
    if (!isDoctor || !onDeleteConsultation) return;
    const ok = window.confirm("Confirmer la suppression de cette note ?");
    if (!ok) return;

    setDeletingEntryId(entry.id);
    try {
      await onDeleteConsultation(entry);
    } finally {
      setDeletingEntryId("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Fiche patient</h3>
            <p className="text-xs text-slate-500">Historique medical et suivi de paiement</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <X size={14} /> Fermer
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Patient</p>
              <p className="mt-2"><span className={labelClass}>Matricule</span> <span className="ml-1">{patient.matricule || "-"}</span></p>
              <p><span className={labelClass}>Nom</span> <span className="ml-1">{patient.prenom || ""} {patient.nom || ""}</span></p>
              <p><span className={labelClass}>Date naissance</span> <span className="ml-1">{patient.date_naissance || "-"}</span></p>
              <p><span className={labelClass}>Telephone</span> <span className="ml-1">{patient.telephone || "-"}</span></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Docteur</p>
              <p className="mt-2"><span className={labelClass}>Nom</span> <span className="ml-1">Dr. {doctor.prenom || ""} {doctor.nom || ""}</span></p>
              <p><span className={labelClass}>Specialite</span> <span className="ml-1">{doctor.specialty || "-"}</span></p>
              <p><span className={labelClass}>Total entrees</span> <span className="ml-1">{sortedConsultations.length}</span></p>
            </div>
          </div>

          {isDoctor && patient?.id && (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-cyan-900">
                <FileText size={15} />
                <h4 className="text-sm font-semibold">Ajouter une note du jour</h4>
              </div>
              <p className="mb-3 text-xs text-cyan-800">
                La date est prise automatiquement au moment de l'ecriture.
              </p>

              {newEntryError && (
                <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {newEntryError}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <textarea
                  value={newDoctorNote}
                  onChange={(event) => setNewDoctorNote(event.target.value)}
                  rows={3}
                  placeholder="Note medecin"
                  className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm"
                />
                <textarea
                  value={newPaymentComment}
                  onChange={(event) => setNewPaymentComment(event.target.value)}
                  rows={3}
                  placeholder="Commentaire paiement pour la secretaire"
                  className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={createFreeNote}
                  disabled={creatingFreeNote}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                  <Plus size={14} />
                  {creatingFreeNote ? "Ajout..." : "Ajouter la note"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {sortedConsultations.length > 0 ? (
              sortedConsultations.map((entry) => {
                const draft = getDraft(entry);
                const isSaving = savingEntryId === entry.id;
                const isFreeNote = entry.source_type === "free_note";
                return (
                  <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {toHumanDateTime(entry.entry_at)}
                      </span>
                      <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
                        {isFreeNote ? "Note du jour" : "Rendez-vous"}
                      </span>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 lg:col-span-2">
                        <p><span className={labelClass}>Note medecin</span></p>
                        {isDoctor ? (
                          <textarea
                            value={draft.doctor_notes}
                            onChange={(event) =>
                              setDraft(entry.id, { doctor_notes: event.target.value })
                            }
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-slate-700">{entry.doctor_notes || "-"}</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p><span className={labelClass}>Paiement</span></p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{toMad(entry.payment_amount)}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p><span className={labelClass}>Commentaire medecin (paiement)</span></p>
                      {isDoctor ? (
                        <textarea
                          value={draft.payment_doctor_comment}
                          onChange={(event) =>
                            setDraft(entry.id, { payment_doctor_comment: event.target.value })
                          }
                          rows={2}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-slate-700">{entry.payment_doctor_comment || "-"}</p>
                      )}
                    </div>

                    {isDoctor && (
                      <div className={`mt-3 flex ${isFreeNote ? "justify-between" : "justify-end"}`}>
                        {isFreeNote && (
                          <button
                            type="button"
                            onClick={() => deleteEntry(entry)}
                            disabled={deletingEntryId === entry.id}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            title="Supprimer la note"
                          >
                            <X size={13} />
                            {deletingEntryId === entry.id ? "Suppression..." : "Supprimer note"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => saveEntry(entry)}
                          disabled={isSaving || deletingEntryId === entry.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                        >
                          <Save size={14} />
                          {isSaving ? "Enregistrement..." : "Enregistrer"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Aucune entree de fiche.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientFicheModal;

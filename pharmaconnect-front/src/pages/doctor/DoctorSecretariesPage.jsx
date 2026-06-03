import { useEffect, useMemo, useState } from "react";
import { Plus, Save, ToggleLeft, ToggleRight, Trash2, UserRoundPlus, Pencil } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../lib/api";

const initialForm = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  password: "",
};

const inputCls =
  "w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-card placeholder-text-muted outline-none transition focus:ring-2 focus:ring-accent/30 focus:border-accent";

const SecretaryEditModal = ({ secretary, onClose, onSave }) => {
  const [form, setForm] = useState({
    nom: secretary?.nom || "",
    prenom: secretary?.prenom || "",
    email: secretary?.email || "",
    telephone: secretary?.telephone || "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!secretary) return null;

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone || null,
      };
      if (String(form.password || "").trim()) {
        payload.password = form.password;
      }
      await onSave(payload);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Modification impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl bg-card rounded-card border border-border shadow-card-hover p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">Modifier la secretaire</h3>
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
          <input name="nom"       value={form.nom}       onChange={onChange} placeholder="Nom"       required    className={inputCls} />
          <input name="prenom"    value={form.prenom}    onChange={onChange} placeholder="Prenom"    required    className={inputCls} />
          <input type="email" name="email" value={form.email} onChange={onChange} placeholder="Email" required className={`${inputCls} md:col-span-2`} />
          <input name="telephone" value={form.telephone} onChange={onChange} placeholder="Telephone"             className={inputCls} />
          <input type="password" name="password" value={form.password} onChange={onChange} placeholder="Nouveau mot de passe (optionnel)" className={inputCls} />
        </div>

        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            <Save size={14} /> {saving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </form>
    </div>
  );
};

const DoctorSecretariesPage = () => {
  const { user } = useAuth();
  const doctorId = useMemo(() => Number(user?.entityId || user?.id || 0), [user]);

  const [secretaries, setSecretaries] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingSecretary, setEditingSecretary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSecretaries = async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const response = await api.get(`/secretaries/doctor/${doctorId}`);
      const list = Array.isArray(response.data?.secretaries) ? response.data.secretaries : [];
      setSecretaries(list);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les secretaires");
      setSecretaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecretaries();
  }, [doctorId]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const createSecretary = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post("/secretaries", form);
      setForm(initialForm);
      setMessage("Secretaire ajoutee avec succes");
      await loadSecretaries();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Creation impossible");
    } finally {
      setLoading(false);
    }
  };

  const saveSecretaryEdit = async (payload) => {
    await api.put(`/secretaries/${editingSecretary.id}`, payload);
    setEditingSecretary(null);
    setMessage("Secretaire mise a jour avec succes");
    await loadSecretaries();
  };

  const toggleStatus = async (secretary) => {
    try {
      const response = await api.put(`/secretaries/${secretary.id}/status`, {
        active: !Boolean(secretary.is_active),
      });
      const updated = response.data?.secretary;
      if (updated) {
        setSecretaries((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      } else {
        await loadSecretaries();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Mise a jour du statut impossible");
    }
  };

  const deleteSecretary = async (secretaryId) => {
    if (!window.confirm("Supprimer cette secretaire ?")) return;
    try {
      await api.delete(`/secretaries/${secretaryId}`);
      setSecretaries((prev) => prev.filter((row) => row.id !== secretaryId));
      setMessage("Secretaire supprimee avec succes");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Suppression impossible");
    }
  };

  return (
    <div className="space-y-5">
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

      {/* Add form */}
      <form onSubmit={createSecretary} className="bg-card rounded-card border border-border shadow-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-accent-light p-2 text-accent">
            <Plus size={16} />
          </div>
          <h2 className="text-sm font-semibold text-text-primary">Ajouter une secretaire</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <input name="nom"       value={form.nom}       onChange={onChange} placeholder="Nom"       required className={inputCls} />
          <input name="prenom"    value={form.prenom}    onChange={onChange} placeholder="Prenom"    required className={inputCls} />
          <input type="email" name="email" value={form.email} onChange={onChange} placeholder="Email" required className={inputCls} />
          <input name="telephone" value={form.telephone} onChange={onChange} placeholder="Telephone"          className={inputCls} />
          <input type="password" name="password" value={form.password} onChange={onChange} placeholder="Mot de passe" required className={`${inputCls} md:col-span-2`} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 transition-colors">
            <Plus size={15} /> {loading ? "Creation..." : "Ajouter"}
          </button>
        </div>
      </form>

      {/* List */}
      <section className="bg-card rounded-card border border-border shadow-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-text-primary tracking-wide">Liste des secretaires ({secretaries.length})</h2>

        {loading ? (
          <div className="rounded-card border border-dashed border-border bg-gray-50 p-8 text-center text-sm text-text-secondary">
            Chargement...
          </div>
        ) : secretaries.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-gray-50 p-8 text-center text-text-secondary">
            <UserRoundPlus className="mx-auto mb-2 text-text-muted" size={22} />
            <p className="text-sm">Aucune secretaire enregistree.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {secretaries.map((secretary) => (
              <div key={secretary.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-gray-50/60 px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {secretary.prenom} {secretary.nom}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {secretary.email}
                    {secretary.telephone ? ` · ${secretary.telephone}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingSecretary(secretary)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-gray-100 transition-colors">
                    <Pencil size={14} /> Modifier
                  </button>
                  <button onClick={() => toggleStatus(secretary)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-gray-100 transition-colors">
                    {secretary.is_active
                      ? <ToggleRight size={16} className="text-medical-success" />
                      : <ToggleLeft size={16} className="text-text-muted" />}
                    {secretary.is_active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => deleteSecretary(secretary.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-medical-danger/30 bg-medical-danger-bg px-3 py-2 text-sm text-medical-danger hover:bg-red-100 transition-colors">
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editingSecretary && (
        <SecretaryEditModal
          secretary={editingSecretary}
          onClose={() => setEditingSecretary(null)}
          onSave={saveSecretaryEdit}
        />
      )}
    </div>
  );
};

export default DoctorSecretariesPage;

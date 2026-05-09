import { useEffect, useMemo, useState } from "react";
import { Plus, ToggleLeft, ToggleRight, Trash2, UserRoundPlus, Pencil, Save } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../lib/api";

const initialForm = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  password: "",
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Modifier la secretaire</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Fermer
          </button>
        </div>

        {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="nom"
            value={form.nom}
            onChange={onChange}
            placeholder="Nom"
            required
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            name="prenom"
            value={form.prenom}
            onChange={onChange}
            placeholder="Prenom"
            required
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="Email"
            required
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm md:col-span-2"
          />
          <input
            name="telephone"
            value={form.telephone}
            onChange={onChange}
            placeholder="Telephone"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            placeholder="Nouveau mot de passe (optionnel)"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            <Save size={15} /> {saving ? "Enregistrement..." : "Sauvegarder"}
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
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 to-teal-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold">Mes secretaires</h1>
      </section>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      <form onSubmit={createSecretary} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Ajouter une secretaire</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input name="nom" value={form.nom} onChange={onChange} placeholder="Nom" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input name="prenom" value={form.prenom} onChange={onChange} placeholder="Prenom" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input type="email" name="email" value={form.email} onChange={onChange} placeholder="Email" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input name="telephone" value={form.telephone} onChange={onChange} placeholder="Telephone" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input type="password" name="password" value={form.password} onChange={onChange} placeholder="Mot de passe" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm md:col-span-2" />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
            <Plus size={16} /> {loading ? "Creation..." : "Ajouter"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Liste des secretaires ({secretaries.length})</h2>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Chargement...</div>
        ) : secretaries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            <UserRoundPlus className="mx-auto mb-2" size={24} />
            Aucune secretaire enregistree.
          </div>
        ) : (
          <div className="space-y-3">
            {secretaries.map((secretary) => (
              <div key={secretary.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {secretary.prenom} {secretary.nom}
                  </p>
                  <p className="text-sm text-slate-500">
                    {secretary.email}
                    {secretary.telephone ? ` - ${secretary.telephone}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSecretary(secretary)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={15} /> Modifier
                  </button>
                  <button
                    onClick={() => toggleStatus(secretary)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {secretary.is_active ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} className="text-slate-500" />}
                    {secretary.is_active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => deleteSecretary(secretary.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 size={15} /> Supprimer
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

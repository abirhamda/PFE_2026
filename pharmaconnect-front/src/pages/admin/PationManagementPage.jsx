import { useEffect, useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, UserRoundPlus } from 'lucide-react';
import api from '../../lib/api';

const initialForm = {
  nom: '',
  prenom: '',
  email: '',
  cin: '',
  telephone: '',
  date_naissance: '',
  password: '',
};

const PationManagementPage = () => {
  const [pations, setPations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPations = async () => {
    try {
      const response = await api.get('/pations');
      setPations(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Impossible de charger les pations');
    }
  };

  useEffect(() => {
    loadPations();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.post('/pations', form);
      setForm(initialForm);
      setMessage('Pation créé avec succès');
      await loadPations();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Création impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (pation) => {
    try {
      const response = await api.put(`/pations/${pation.id}/status`, {
        active: !Boolean(pation.is_active),
      });

      const updated = response.data?.pation;
      if (updated) {
        setPations((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      } else {
        await loadPations();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Changement de statut impossible');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce pation ?')) return;

    try {
      await api.delete(`/pations/${id}`);
      setPations((prev) => prev.filter((row) => row.id !== id));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Suppression impossible');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-extrabold">Gestion des Pations</h1>
        <p className="text-sm text-cyan-100">Création et administration du rôle pation</p>
      </section>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nouveau pation</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <input name="nom" value={form.nom} onChange={handleChange} placeholder="Nom" required className="rounded-xl border border-slate-200 px-4 py-3" />
          <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Prénom" required className="rounded-xl border border-slate-200 px-4 py-3" />
          <input name="cin" value={form.cin} onChange={handleChange} placeholder="CIN" required className="rounded-xl border border-slate-200 px-4 py-3" />
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" required className="rounded-xl border border-slate-200 px-4 py-3" />
          <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="Téléphone" className="rounded-xl border border-slate-200 px-4 py-3" />
          <input type="date" name="date_naissance" value={form.date_naissance} onChange={handleChange} className="rounded-xl border border-slate-200 px-4 py-3" />
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Mot de passe" required className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2" />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:from-cyan-700 hover:to-teal-700 disabled:opacity-60"
          >
            <Plus size={16} /> {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Liste des pations ({pations.length})</h2>
        <div className="space-y-3">
          {pations.map((pation) => (
            <div key={pation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {pation.prenom} {pation.nom}
                </p>
                <p className="text-sm text-slate-500">{pation.email} • CIN {pation.cin}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(pation)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {pation.is_active ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} className="text-slate-500" />}
                  {pation.is_active ? 'Actif' : 'Inactif'}
                </button>
                <button
                  onClick={() => handleDelete(pation.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            </div>
          ))}

          {pations.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              <UserRoundPlus className="mx-auto mb-2" size={24} />
              Aucun pation enregistré.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PationManagementPage;

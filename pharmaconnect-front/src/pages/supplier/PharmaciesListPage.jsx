import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Building2, Mail, Phone, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const PharmaciesListPage = () => {
  const { user } = useAuth();
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPharmacies = async () => {
      if (!user?.id) {
        setLoading(false);
        setError("Session utilisateur invalide.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
        const res = await axios.get(`/api/suppliers/${user.id}/pharmacies`, { headers });
        const pharmaciesData = res.data?.pharmacies || [];
        setPharmacies(pharmaciesData);
      } catch (fetchError) {
        console.error("Erreur recuperation pharmacies:", fetchError);
        setError(fetchError.response?.data?.error || "Impossible de recuperer les pharmacies partenaires.");
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacies();
  }, [user?.id, user?.token]);

  const totalPharmacies = useMemo(() => pharmacies.length, [pharmacies]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-700 border-t-transparent" />
        <p className="text-sm text-slate-600">Chargement des pharmacies partenaires...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-cyan-700 to-teal-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-semibold">Pharmacies partenaires</h1>
        <p className="mt-1 text-cyan-100">Acces direct a votre reseau de pharmacies connectees.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Building2 className="text-cyan-600" size={18} />
            <p className="text-sm font-medium">Total pharmacies</p>
          </div>
          <p className="mt-3 text-xl font-semibold text-slate-900">{totalPharmacies}</p>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pharmacies.map((pharmacy) => (
          <article key={pharmacy.pharmacy_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">{pharmacy.nom_pharmacie}</h2>
            <p className="text-xs text-slate-500">ID #{pharmacy.pharmacy_id}</p>

            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2">
                <Mail size={14} className="text-cyan-700" />
                {pharmacy.pharmacy_email || "-"}
              </p>
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-cyan-700" />
                {pharmacy.pharmacy_phone || "-"}
              </p>
              <p className="flex items-center gap-2">
                <User size={14} className="text-cyan-700" />
                {pharmacy.president_pharmacie || "-"}
              </p>
            </div>
          </article>
        ))}

        {!error && pharmacies.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Aucune pharmacie partenaire pour le moment.
          </div>
        )}
      </section>
    </div>
  );
};

export default PharmaciesListPage;

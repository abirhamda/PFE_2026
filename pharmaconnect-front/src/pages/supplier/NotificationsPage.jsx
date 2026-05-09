import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bell, CheckCircle, Clock, Package, XCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchNotifications = async () => {
    if (!user?.id) {
      setError("Session utilisateur invalide.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.get(`/api/notifications/fournisseur/${user.id}`, { headers });
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (fetchError) {
      console.error("Erreur recuperation notifications:", fetchError);
      setError(fetchError.response?.data?.error || "Impossible de recuperer les notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id, user?.token]);

  const updateStatus = async (notificationId, status) => {
    setUpdatingId(notificationId);

    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      await axios.put(`/api/notifications/update-status/${notificationId}`, { status }, { headers });

      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, status } : item)));
    } catch (updateError) {
      console.error("Erreur mise a jour status notification:", updateError);
      setError(updateError.response?.data?.error || "Erreur lors de la mise a jour du statut.");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(
    () => ({
      total: notifications.length,
      pending: notifications.filter((item) => item.status === "en_attente").length,
      accepted: notifications.filter((item) => item.status === "acceptee").length,
    }),
    [notifications],
  );

  const getStatusIcon = (status) => {
    if (status === "acceptee") return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (status === "refusee") return <XCircle className="h-4 w-4 text-rose-600" />;
    return <Clock className="h-4 w-4 text-amber-600" />;
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-cyan-700 to-teal-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-semibold">Notifications fournisseur</h1>
        <p className="mt-1 text-cyan-100">Traitez les demandes de reapprovisionnement envoyees par les pharmacies.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total" value={stats.total} icon={<Bell size={18} className="text-cyan-700" />} />
        <StatCard label="En attente" value={stats.pending} icon={<Clock size={18} className="text-amber-600" />} />
        <StatCard label="Acceptees" value={stats.accepted} icon={<CheckCircle size={18} className="text-emerald-600" />} />
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-700 border-t-transparent" />
            <p className="text-sm text-slate-600">Chargement des notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">Aucune notification disponible.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <article key={notif.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <Package size={16} className="text-cyan-700" />
                      {notif.nom_medicament}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">Quantite demandee: {notif.quantite}</p>
                    <p className="text-sm text-slate-500">{notif.nom_pharmacie || "Pharmacie inconnue"}</p>
                    {notif.message && <p className="mt-2 text-sm text-slate-600">{notif.message}</p>}
                  </div>

                  <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {getStatusIcon(notif.status)}
                    <span>{notif.status}</span>
                  </div>
                </div>

                {notif.status === "en_attente" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => updateStatus(notif.id, "acceptee")}
                      disabled={updatingId === notif.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {updatingId === notif.id ? "..." : "Accepter"}
                    </button>
                    <button
                      onClick={() => updateStatus(notif.id, "refusee")}
                      disabled={updatingId === notif.id}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      {updatingId === notif.id ? "..." : "Refuser"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const StatCard = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3 text-slate-700">
      {icon}
      <p className="text-sm font-medium">{label}</p>
    </div>
    <p className="mt-3 text-xl font-semibold text-slate-900">{value}</p>
  </div>
);

export default NotificationsPage;

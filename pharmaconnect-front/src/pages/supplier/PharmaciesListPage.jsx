import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Mail, Phone, Search, Store, Truck, UserRound, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/modules/EmptyState";
import InlineAlert from "../../components/modules/InlineAlert";
import LoadingState from "../../components/modules/LoadingState";
import MetricCard from "../../components/modules/MetricCard";
import ModuleHero from "../../components/modules/ModuleHero";
import StatusPill from "../../components/modules/StatusPill";
import { formatDateTime, getErrorMessage } from "../../components/modules/moduleUtils";
import api from "../../lib/api";

const mergePharmacies = (partners, demandes) => {
  const demandeMap = new Map((demandes || []).map((item) => [item.pharmacy_id, item]));

  return (partners || []).map((partner) => {
    const matched = demandeMap.get(partner.pharmacy_id);
    return {
      ...partner,
      medicaments_demandes: Array.isArray(matched?.medicaments_demandes) ? matched.medicaments_demandes : [],
    };
  });
};

export default function PharmaciesListPage() {
  const [pharmacies, setPharmacies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const loadPharmacies = async () => {
      setLoading(true);

      try {
        const profileResponse = await api.get("/suppliers/me");
        const supplierId = profileResponse.data?.profile?.id;

        if (!supplierId) {
          throw new Error("Identifiant fournisseur introuvable.");
        }

        const [partnersResponse, demandesResponse] = await Promise.all([
          api.get(`/suppliers/${supplierId}/pharmacies`),
          api.get(`/suppliers/${supplierId}/pharmacies/demandes`),
        ]);

        const partners = Array.isArray(partnersResponse.data?.pharmacies) ? partnersResponse.data.pharmacies : [];
        const demandes = Array.isArray(demandesResponse.data?.pharmacies) ? demandesResponse.data.pharmacies : [];

        setPharmacies(mergePharmacies(partners, demandes));
      } catch (requestError) {
        setNotice({
          type: "error",
          message: getErrorMessage(requestError, "Impossible de charger les pharmacies partenaires."),
        });
        setPharmacies([]);
      } finally {
        setLoading(false);
      }
    };

    loadPharmacies();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredPharmacies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return pharmacies;

    return pharmacies.filter((item) =>
      [item.nom_pharmacie, item.pharmacy_email, item.pharmacy_phone, item.president_pharmacie].filter(Boolean).join(" ").toLowerCase().includes(query),
    );
  }, [pharmacies, searchTerm]);

  const stats = useMemo(
    () => ({
      total: pharmacies.length,
      actifs: pharmacies.filter((item) => item.is_active).length,
      inactifs: pharmacies.filter((item) => !item.is_active).length,
      avecDemandes: pharmacies.filter((item) => item.medicaments_demandes.length > 0).length,
    }),
    [pharmacies],
  );

  return (
    <div className="space-y-8">
      <ModuleHero
        eyebrow="Espace fournisseur"
        title="Pharmacies partenaires"
        description="Consultez vos pharmacies rattachees, leurs coordonnees principales et un apercu des demandes medicament deja emises."
      />

      <InlineAlert message={notice?.message} type={notice?.type || "info"} />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Partenaires" value={stats.total || 0} helper="Pharmacies reliees a votre compte fournisseur" tone="cyan" />
        <MetricCard icon={CheckCircle2} label="Actives" value={stats.actifs || 0} helper="Comptes pharmacies actifs dans le systeme" tone="emerald" />
        <MetricCard icon={XCircle} label="Inactives" value={stats.inactifs || 0} helper="Comptes a regulariser ou reactiver" tone="rose" />
        <MetricCard icon={Truck} label="Avec demandes" value={stats.avecDemandes || 0} helper="Pharmacies ayant deja formule des besoins" tone="amber" />
      </section>

      <Card className="border-slate-200/90 bg-white/95 shadow-md">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Reseau partenaire</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Une lecture claire de vos comptes partenaires et de leur activite recente.</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher une pharmacie..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Chargement des pharmacies partenaires..." />
          ) : filteredPharmacies.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Aucune pharmacie a afficher"
              description={searchTerm ? "Aucun partenaire ne correspond a cette recherche." : "Votre reseau partenaire est vide pour le moment."}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredPharmacies.map((pharmacy) => (
                <article key={pharmacy.pharmacy_id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{pharmacy.nom_pharmacie}</h3>
                      <p className="mt-1 text-sm text-slate-500">Responsable: {pharmacy.president_pharmacie || "Non renseigne"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status="partenaire" />
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          pharmacy.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {pharmacy.is_active ? "Compte actif" : "Compte inactif"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <Mail size={14} />
                        Email
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{pharmacy.pharmacy_email || "Non renseigne"}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <Phone size={14} />
                        Telephone
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{pharmacy.pharmacy_phone || "Non renseigne"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      <UserRound size={14} />
                      Activite recente
                    </p>
                    {pharmacy.medicaments_demandes.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">Aucune demande medicament enregistree pour cette pharmacie.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {pharmacy.medicaments_demandes.slice(0, 3).map((demande) => (
                          <div key={demande.demande_id} className="rounded-2xl bg-slate-50 px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{demande.nom}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {demande.quantite} unite(s) - {formatDateTime(demande.created_at)}
                                </p>
                              </div>
                              <StatusPill status={demande.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

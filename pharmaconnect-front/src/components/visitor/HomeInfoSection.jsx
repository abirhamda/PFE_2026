import { ArrowRight, Building2, HeartPulse, ShieldCheck, Users2 } from "lucide-react";
import { Link } from "react-router-dom";

const galleryItems = [
  {
    title: "Recherche publique",
    description: "Recherche par nom, specialite ou pharmacie.",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Acces par profil",
    description: "Connexion medecin, secretaire, pharmacien, admin ou patient.",
    image:
      "https://images.unsplash.com/photo-1580281657527-47ea3939bdb4?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Donnees protegees",
    description: "Les ordonnances et informations personnelles ne sont pas accessibles en mode visiteur.",
    image:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=80",
  },
];

const advantages = [
  {
    icon: HeartPulse,
    title: "Recherche",
    description: "Recherche publique de medecins et de pharmacies.",
  },
  {
    icon: Building2,
    title: "Consultation publique",
    description: "Nom, specialite, adresse et telephone.",
  },
  {
    icon: ShieldCheck,
    title: "Acces reserve",
    description: "Ordonnances, rendez-vous et espaces metier apres connexion.",
  },
  {
    icon: Users2,
    title: "Compte patient",
    description: "Necessaire pour les fonctionnalites personnelles.",
  },
];

const HomeInfoSection = () => {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/80 sm:p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Informations</p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">
            Acces public a l'annuaire
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Cette page permet la recherche de medecins et de pharmacies. Les fonctions cliniques et administratives
            necessitent une connexion.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {advantages.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-3xl bg-slate-50 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/login/patient?mode=register"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Creer un compte patient
            <ArrowRight size={16} />
          </Link>
          <span className="text-sm text-slate-500">Les autres fonctions necessitent une connexion.</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {galleryItems.map((item, index) => (
          <article
            key={item.title}
            className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/80 ${
              index === 0 ? "sm:col-span-2 xl:col-span-1" : ""
            }`}
          >
            <div className="aspect-[16/10] overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default HomeInfoSection;

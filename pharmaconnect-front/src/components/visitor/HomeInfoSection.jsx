import { ArrowRight, Building2, HeartPulse, ShieldCheck, Users2 } from "lucide-react";
import { Link } from "react-router-dom";

const galleryItems = [
  {
    title: "Recherche publique",
    description: "Recherche par nom, spécialité ou pharmacie.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Accès par profil",
    description: "Connexion médecin, secrétaire, pharmacien, admin ou patient.",
    image: "https://images.unsplash.com/photo-1580281657527-47ea3939bdb4?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Données protégées",
    description: "Les ordonnances et informations personnelles ne sont pas accessibles en mode visiteur.",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=80",
  },
];

const advantages = [
  { icon: HeartPulse,  title: "Recherche",           description: "Recherche publique de médecins et de pharmacies." },
  { icon: Building2,   title: "Consultation publique",description: "Nom, spécialité, adresse et téléphone." },
  { icon: ShieldCheck, title: "Accès réservé",        description: "Ordonnances, rendez-vous et espaces métier après connexion." },
  { icon: Users2,      title: "Compte patient",       description: "Nécessaire pour les fonctionnalités personnelles." },
];

const HomeInfoSection = () => {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      {/* Left — info */}
      <div className="bg-card rounded-card border border-border shadow-card p-6 sm:p-7">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Informations</p>
          <h2 className="mt-3 text-2xl font-semibold text-text-primary sm:text-3xl">
            Accès public à l'annuaire
          </h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            Cette page permet la recherche de médecins et de pharmacies. Les fonctions cliniques et
            administratives nécessitent une connexion.
          </p>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-2">
          {advantages.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-lg bg-gray-50 border border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent">
                <Icon size={19} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-text-primary">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            to="/login/patient?mode=register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Créer un compte patient
            <ArrowRight size={15} />
          </Link>
          <span className="text-sm text-text-secondary">
            Les autres fonctions nécessitent une connexion.
          </span>
        </div>
      </div>

      {/* Right — gallery */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {galleryItems.map((item, index) => (
          <article
            key={item.title}
            className={`overflow-hidden rounded-card border border-border bg-card shadow-card ${
              index === 0 ? "sm:col-span-2 xl:col-span-1" : ""
            }`}
          >
            <div className="aspect-[16/9] overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default HomeInfoSection;

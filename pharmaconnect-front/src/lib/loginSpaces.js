export const ROLE_HOME_PATHS = {
  admin: "/admin/dashboard",
  pharmacist: "/pharmacy/dashboard",
  doctor: "/docteur",
  secretaire: "/secretaire/rendezvous",
  supplier: "/supplier/dashboard",
  pation: "/patient",
};

export const LOGIN_SPACES = [
  {
    slug: "medecin",
    role: "doctor",
    label: "Connexion Medecin",
    shortLabel: "Medecin",
    title: "Connexion medecin",
    description: "Acces aux rendez-vous, patients et ordonnances.",
    accentClassName: "from-cyan-700 via-sky-600 to-teal-600",
    allowRegister: false,
  },
  {
    slug: "secretaire",
    role: "secretaire",
    label: "Connexion Secretaire",
    shortLabel: "Secretaire",
    title: "Connexion secretaire",
    description: "Acces au planning, aux patients et au suivi administratif.",
    accentClassName: "from-teal-700 via-cyan-600 to-sky-600",
    allowRegister: false,
  },
  {
    slug: "pharmacien",
    role: "pharmacist",
    label: "Connexion Pharmacien",
    shortLabel: "Pharmacien",
    title: "Connexion pharmacien",
    description: "Acces au stock, aux ordonnances et aux demandes.",
    accentClassName: "from-cyan-800 via-cyan-700 to-emerald-600",
    allowRegister: false,
  },
  {
    slug: "admin",
    role: "admin",
    label: "Connexion Admin",
    shortLabel: "Admin",
    title: "Connexion admin",
    description: "Acces a l'administration des comptes et des structures.",
    accentClassName: "from-slate-900 via-slate-800 to-cyan-700",
    allowRegister: false,
  },
  {
    slug: "patient",
    role: "pation",
    label: "Connexion Patient",
    shortLabel: "Patient",
    title: "Connexion patient",
    description: "Acces aux rendez-vous et ordonnances.",
    accentClassName: "from-cyan-700 via-teal-600 to-emerald-500",
    allowRegister: true,
  },
];

export const GENERIC_LOGIN_SPACE = {
  slug: "general",
  role: null,
  label: "Connexion",
  shortLabel: "Connexion",
  title: "Connexion MediCare",
  description: "Choisissez un espace de connexion.",
  accentClassName: "from-cyan-700 via-teal-600 to-sky-600",
  allowRegister: true,
};

export const getLoginSpaceBySlug = (slug) =>
  LOGIN_SPACES.find((space) => space.slug === slug) || GENERIC_LOGIN_SPACE;

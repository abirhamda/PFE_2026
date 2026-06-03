import {
  ArrowLeft,
  CalendarDays,
  FileText,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_HOME_PATHS } from "../../lib/loginSpaces";
import api from "../../lib/api";

const initialRegisterForm = {
  nom: "",
  prenom: "",
  email: "",
  password: "",
  telephone: "",
  cin: "",
  date_naissance: "",
  city: "",
};

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

/* Map role slug → features shown on left panel */
const ROLE_FEATURES = {
  medecin: [
    { icon: CalendarDays, label: "Gestion des rendez-vous" },
    { icon: Users,        label: "Dossiers patients & fiches" },
    { icon: FileText,     label: "Création d'ordonnances" },
    { icon: Stethoscope,  label: "Analyse IA radiologique" },
  ],
  secretaire: [
    { icon: CalendarDays, label: "Planning du cabinet" },
    { icon: Users,        label: "Registre des patients" },
    { icon: FileText,     label: "Suivi des ordonnances" },
  ],
  pharmacien: [
    { icon: FileText,     label: "Consultation d'ordonnances" },
    { icon: ShieldCheck,  label: "Gestion du stock" },
    { icon: Users,        label: "Réseau fournisseurs" },
  ],
  admin: [
    { icon: ShieldCheck,  label: "Gestion des médecins" },
    { icon: Users,        label: "Gestion des pharmacies" },
    { icon: FileText,     label: "Tableau de bord admin" },
  ],
  patient: [
    { icon: CalendarDays, label: "Réservation de rendez-vous" },
    { icon: FileText,     label: "Mes ordonnances" },
    { icon: Users,        label: "Recherche de médecins" },
  ],
  general: [
    { icon: Stethoscope,  label: "Espace médecin & secrétaire" },
    { icon: ShieldCheck,  label: "Espace pharmacien & admin" },
    { icon: Users,        label: "Espace patient & fournisseur" },
  ],
};

const LoginForm = ({ space, defaultMode = "login" }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const canRegister = Boolean(space?.allowRegister);
  const resolvedDefaultMode =
    defaultMode === "forgot"
      ? "forgot"
      : canRegister && defaultMode === "register"
        ? "register"
        : "login";

  const [mode, setMode] = useState(resolvedDefaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState("");
  const [resetStep, setResetStep] = useState("request");

  useEffect(() => {
    setMode(resolvedDefaultMode);
    setResetStep("request");
  }, [resolvedDefaultMode, space?.slug]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
    if (nextMode !== "forgot") setResetStep("request");
  };

  const openForgotMode = () => {
    switchMode("forgot");
    setResetEmail(email.trim().toLowerCase());
    setResetCode("");
    setResetPassword("");
    setResetPasswordConfirmation("");
    setResetStep("request");
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    try {
      const response = await api.post("/login", { email, password });
      const { user, token } = response.data;
      login({ ...user, token });
      navigate(ROLE_HOME_PATHS[user?.role] || "/redirect", { replace: true });
    } catch (loginError) {
      setError(loginError.response?.data?.error || "Échec de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    try {
      await api.post("/patient-portal/register", registerForm);
      setSuccess("Compte patient créé. Vous pouvez maintenant vous connecter.");
      setRegisterForm(initialRegisterForm);
      setMode("login");
      setEmail(registerForm.email);
    } catch (registerError) {
      setError(registerError.response?.data?.error || "Inscription impossible");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetRequest = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    const targetEmail = resetEmail.trim().toLowerCase();
    setResetEmail(targetEmail);
    try {
      const response = await api.post("/forgot-password", { email: targetEmail });
      setSuccess(response.data?.message || "Si un compte existe avec cet email, un code a été envoyé.");
      setResetStep("reset");
    } catch (resetError) {
      setError(resetError.response?.data?.error || "Demande de réinitialisation impossible");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (resetPassword !== resetPasswordConfirmation) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post("/reset-password", {
        email: resetEmail.trim().toLowerCase(),
        code: resetCode,
        newPassword: resetPassword,
      });
      setSuccess(response.data?.message || "Mot de passe réinitialisé avec succès");
      setEmail(resetEmail.trim().toLowerCase());
      setPassword("");
      setResetCode("");
      setResetPassword("");
      setResetPasswordConfirmation("");
      setResetStep("request");
      setMode("login");
    } catch (resetError) {
      setError(resetError.response?.data?.error || "Réinitialisation impossible");
    } finally {
      setIsLoading(false);
    }
  };

  const formSubmitHandler =
    mode === "login"
      ? handleLoginSubmit
      : mode === "register"
        ? handleRegisterSubmit
        : resetStep === "request"
          ? handlePasswordResetRequest
          : handlePasswordResetSubmit;

  const submitLabel = (() => {
    if (isLoading) {
      if (mode === "login") return "Connexion...";
      if (mode === "register") return "Inscription...";
      return resetStep === "request" ? "Envoi du code..." : "Réinitialisation...";
    }
    if (mode === "login") return "Se connecter";
    if (mode === "register") return "Créer mon compte";
    return resetStep === "request" ? "Envoyer le code" : "Réinitialiser le mot de passe";
  })();

  const modeIcon =
    mode === "login"
      ? <ShieldCheck size={22} />
      : mode === "forgot"
        ? <KeyRound size={22} />
        : <UserPlus size={22} />;

  const features = ROLE_FEATURES[space?.slug] || ROLE_FEATURES.general;

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-4xl overflow-hidden rounded-card border border-border bg-card shadow-card-hover flex flex-col lg:flex-row">

        {/* ── LEFT PANEL — branding ─────────────────────── */}
        <div className="bg-primary lg:w-[42%] flex-shrink-0 flex flex-col px-8 py-10 relative overflow-hidden">
          {/* Background orbs */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />

          {/* Logo */}
          <div className="relative flex items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 flex-shrink-0">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-white leading-tight">MediCare</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/50 leading-tight">
                Plateforme médicale
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="relative flex-1">
            <div className="mb-2 inline-flex rounded-lg bg-white/15 p-2.5">
              {modeIcon}
              <span className="sr-only">{space.title}</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-white leading-snug">
              {space.title}
            </h1>
            <p className="mt-2 text-sm text-white/65 leading-relaxed">
              {space.description}
            </p>

            {/* Feature list */}
            <ul className="mt-8 space-y-3">
              {features.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 flex-shrink-0">
                    <Icon size={14} className="text-white/80" />
                  </span>
                  <span className="text-sm text-white/75">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Back link */}
          <Link
            to="/"
            className="relative mt-10 inline-flex items-center gap-2 text-xs font-medium text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft size={13} />
            Retour à l'accueil
          </Link>
        </div>

        {/* ── RIGHT PANEL — form ────────────────────────── */}
        <div className="flex flex-col flex-1">
          {/* Tabs */}
          <div className="border-b border-border px-8 py-4 bg-gray-50/60 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-gray-100 hover:text-text-primary"
              }`}
            >
              Connexion
            </button>

            {canRegister && (
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "register"
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-gray-100 hover:text-text-primary"
                }`}
              >
                Inscription patient
              </button>
            )}

            <Link
              to="/"
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors"
            >
              Annuaire public
            </Link>
          </div>

          {/* Form */}
          <form onSubmit={formSubmitHandler} className="flex-1 space-y-5 px-8 py-7">

            {/* Alerts */}
            {error && (
              <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-card border-l-4 border-medical-success bg-medical-success-bg px-4 py-3 text-sm text-medical-success">
                {success}
              </div>
            )}

            {/* ── Login ── */}
            {mode === "login" && (
              <>
                <label className="block space-y-1.5">
                  <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Email
                  </span>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      size={16}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="nom@exemple.com"
                      autoComplete="email"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Mot de passe
                  </span>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      size={16}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Votre mot de passe"
                      autoComplete="current-password"
                      className={`${inputCls} pl-9 pr-20`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-accent hover:text-primary transition-colors"
                    >
                      {showPassword ? "Masquer" : "Afficher"}
                    </button>
                  </div>
                </label>

                <div className="text-right -mt-2">
                  <button
                    type="button"
                    onClick={openForgotMode}
                    className="text-sm font-medium text-accent hover:text-primary transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </>
            )}

            {/* ── Forgot password ── */}
            {mode === "forgot" && (
              <>
                <label className="block space-y-1.5">
                  <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Email
                  </span>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      size={16}
                    />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      readOnly={resetStep === "reset"}
                      placeholder="nom@exemple.com"
                      className={`${inputCls} pl-9 ${resetStep === "reset" ? "bg-gray-50 text-text-muted cursor-not-allowed" : ""}`}
                    />
                  </div>
                </label>

                {resetStep === "reset" && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setResetStep("request"); setSuccess(""); setError(""); }}
                      className="text-sm font-medium text-accent hover:text-primary transition-colors -mt-2"
                    >
                      Changer l'email
                    </button>

                    <label className="block space-y-1.5">
                      <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                        Code reçu par email
                      </span>
                      <input
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className={`${inputCls} text-center text-lg font-semibold tracking-[0.35em]`}
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                        Nouveau mot de passe
                      </span>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                          type="password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Nouveau mot de passe"
                          className={`${inputCls} pl-9`}
                        />
                      </div>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                        Confirmer le mot de passe
                      </span>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                          type="password"
                          value={resetPasswordConfirmation}
                          onChange={(e) => setResetPasswordConfirmation(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Confirmer le mot de passe"
                          className={`${inputCls} pl-9`}
                        />
                      </div>
                    </label>
                  </>
                )}
              </>
            )}

            {/* ── Register ── */}
            {mode === "register" && (
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { field: "nom",            placeholder: "Nom",              type: "text",     full: false },
                  { field: "prenom",         placeholder: "Prénom",           type: "text",     full: false },
                  { field: "email",          placeholder: "Email",            type: "email",    full: true  },
                  { field: "password",       placeholder: "Mot de passe (6 min)", type: "password", full: true },
                  { field: "telephone",      placeholder: "Téléphone",        type: "text",     full: false },
                  { field: "cin",            placeholder: "CIN (optionnel)",  type: "text",     full: false },
                  { field: "date_naissance", placeholder: "Date de naissance",type: "date",     full: false },
                  { field: "city",           placeholder: "Ville",            type: "text",     full: false },
                ].map(({ field, placeholder, type, full }) => (
                  <input
                    key={field}
                    type={type}
                    value={registerForm[field]}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    required={["nom","prenom","email","password"].includes(field)}
                    minLength={field === "password" ? 6 : undefined}
                    placeholder={placeholder}
                    className={`${inputCls} ${full ? "md:col-span-2" : ""}`}
                  />
                ))}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                </svg>
              )}
              {submitLabel}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
              >
                Retour à la connexion
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

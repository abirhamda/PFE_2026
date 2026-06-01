import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck, UserPlus } from "lucide-react";
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

const LoginForm = ({ space, defaultMode = "login" }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const canRegister = Boolean(space?.allowRegister);
  const resolvedDefaultMode =
    defaultMode === "forgot" ? "forgot" : canRegister && defaultMode === "register" ? "register" : "login";

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

    if (nextMode !== "forgot") {
      setResetStep("request");
    }
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
      setError(loginError.response?.data?.error || "Echec de connexion");
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
      setSuccess("Compte patient cree. Vous pouvez maintenant vous connecter.");
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
      setSuccess(response.data?.message || "Si un compte existe avec cet email, un code a ete envoye.");
      setResetStep("reset");
    } catch (resetError) {
      setError(resetError.response?.data?.error || "Demande de reinitialisation impossible");
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

      setSuccess(response.data?.message || "Mot de passe reinitialise avec succes");
      setEmail(resetEmail.trim().toLowerCase());
      setPassword("");
      setResetCode("");
      setResetPassword("");
      setResetPasswordConfirmation("");
      setResetStep("request");
      setMode("login");
    } catch (resetError) {
      setError(resetError.response?.data?.error || "Reinitialisation impossible");
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
      return resetStep === "request" ? "Envoi du code..." : "Reinitialisation...";
    }

    if (mode === "login") return "Se connecter";
    if (mode === "register") return "Creer mon compte";
    return resetStep === "request" ? "Envoyer le code" : "Reinitialiser le mot de passe";
  })();

  const headerIcon =
    mode === "login" ? <ShieldCheck size={22} /> : mode === "forgot" ? <KeyRound size={22} /> : <UserPlus size={22} />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-slate-900/40">
        <div className={`bg-gradient-to-r ${space.accentClassName} px-8 py-8 text-white`}>
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 transition hover:bg-white/20"
          >
            <ArrowLeft size={14} />
            Retour
          </Link>

          <div className="mb-3 inline-flex rounded-xl bg-white/20 p-2.5">
            {headerIcon}
          </div>
          <h1 className="text-3xl font-semibold">{space.title}</h1>
          <p className="mt-2 text-sm leading-6 text-cyan-50">{space.description}</p>
        </div>

        <div className="border-b border-slate-200 px-8 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                mode === "login" ? "bg-cyan-100 text-cyan-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Connexion
            </button>

            {canRegister ? (
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  mode === "register" ? "bg-cyan-100 text-cyan-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Inscription patient
              </button>
            ) : null}

            <Link to="/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Annuaire public
            </Link>
          </div>
        </div>

        <form onSubmit={formSubmitHandler} className="space-y-5 px-8 py-7">
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          {success ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          {mode === "login" ? (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="nom@exemple.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Mot de passe</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Votre mot de passe"
                    className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 pr-20 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-cyan-700"
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
              </label>

              <div className="-mt-2 text-right">
                <button
                  type="button"
                  onClick={openForgotMode}
                  className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-800"
                >
                  Mot de passe oublie ?
                </button>
              </div>
            </>
          ) : mode === "forgot" ? (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                    readOnly={resetStep === "reset"}
                    placeholder="nom@exemple.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </label>

              {resetStep === "reset" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep("request");
                      setSuccess("");
                      setError("");
                    }}
                    className="-mt-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-800"
                  >
                    Changer l'email
                  </button>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Code recu par email</span>
                    <input
                      value={resetCode}
                      onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-lg font-semibold tracking-[0.35em] text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Nouveau mot de passe</span>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(event) => setResetPassword(event.target.value)}
                        required
                        minLength={8}
                        placeholder="Nouveau mot de passe"
                        className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Confirmer le mot de passe</span>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                      <input
                        type="password"
                        value={resetPasswordConfirmation}
                        onChange={(event) => setResetPasswordConfirmation(event.target.value)}
                        required
                        minLength={8}
                        placeholder="Confirmer le mot de passe"
                        className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      />
                    </div>
                  </label>
                </>
              ) : null}
            </>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={registerForm.nom}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, nom: event.target.value }))}
                required
                placeholder="Nom"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                value={registerForm.prenom}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, prenom: event.target.value }))}
                required
                placeholder="Prenom"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                required
                placeholder="Email"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm md:col-span-2"
              />
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                required
                minLength={6}
                placeholder="Mot de passe"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm md:col-span-2"
              />
              <input
                value={registerForm.telephone}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, telephone: event.target.value }))}
                placeholder="Telephone"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                value={registerForm.cin}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, cin: event.target.value }))}
                placeholder="CIN (optionnel)"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                type="date"
                value={registerForm.date_naissance}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, date_naissance: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                value={registerForm.city}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="Ville"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r ${space.accentClassName} px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {submitLabel}
          </button>

          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Retour a la connexion
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default LoginForm;

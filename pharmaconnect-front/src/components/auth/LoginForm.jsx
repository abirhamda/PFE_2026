import { useState } from "react";
import { Lock, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
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

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await api.post("/login", { email, password });
      const { user, token } = response.data;
      login({ ...user, token });
      navigate("/", { replace: true });
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-slate-900/40">
        <div className="bg-gradient-to-r from-cyan-700 to-teal-600 px-8 py-8 text-white">
          <div className="mb-3 inline-flex rounded-xl bg-white/20 p-2.5">
            {mode === "login" ? <ShieldCheck size={22} /> : <UserPlus size={22} />}
          </div>
          <h1 className="text-2xl font-semibold">PharmaConnect</h1>
          <p className="mt-1 text-sm text-cyan-100">
            {mode === "login" ? "Connectez-vous a votre espace securise" : "Creation de compte patient"}
          </p>
        </div>

        <div className="border-b border-slate-200 px-8 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                mode === "login" ? "bg-cyan-100 text-cyan-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                mode === "register" ? "bg-cyan-100 text-cyan-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Inscription patient
            </button>
            <button
              type="button"
              onClick={() => navigate("/doctors")}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Voir les medecins
            </button>
          </div>
        </div>

        <form
          onSubmit={mode === "login" ? handleLoginSubmit : handleRegisterSubmit}
          className="space-y-5 px-8 py-7"
        >
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

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
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-700 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-800 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? mode === "login"
                ? "Connexion..."
                : "Inscription..."
              : mode === "login"
                ? "Se connecter"
                : "Creer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;

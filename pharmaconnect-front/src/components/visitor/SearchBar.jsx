import { Loader2, MapPin, Search, Sparkles, Stethoscope } from "lucide-react";

const SEARCH_SCOPES = [
  { value: "all", label: "Tout" },
  { value: "doctor", label: "Medecins" },
  { value: "pharmacy", label: "Pharmacies" },
];

const SearchBar = ({
  query,
  onQueryChange,
  city,
  onCityChange,
  specialty,
  onSpecialtyChange,
  scope,
  onScopeChange,
  onSubmit,
  isLoading,
}) => {
  const showSpecialtyField = scope !== "pharmacy";

  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-2xl shadow-cyan-950/10 backdrop-blur md:p-5">
      <div className={`grid gap-3 ${showSpecialtyField ? "xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto]" : "xl:grid-cols-[1.4fr_1fr_auto]"}`}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Nom du medecin ou de la pharmacie"
            className="h-16 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 pl-14 pr-4 text-base text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          />
        </div>

        <div className="relative">
          <MapPin className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Ville"
            className="h-16 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 pl-14 pr-4 text-base text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          />
        </div>

        {showSpecialtyField ? (
          <div className="relative">
            <Stethoscope className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              value={specialty}
              onChange={(event) => onSpecialtyChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Specialite"
              className="h-16 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 pl-14 pr-4 text-base text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="inline-flex h-16 min-w-[13rem] items-center justify-center gap-2 rounded-[1.5rem] bg-slate-950 px-6 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          {isLoading ? "Recherche..." : "Lancer la recherche"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {SEARCH_SCOPES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onScopeChange(item.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              scope === item.value
                ? "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;

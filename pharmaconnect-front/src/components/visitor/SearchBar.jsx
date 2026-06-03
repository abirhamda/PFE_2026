import { Loader2, MapPin, Search, Sparkles, Stethoscope } from "lucide-react";

const SEARCH_SCOPES = [
  { value: "all",      label: "Tout" },
  { value: "doctor",   label: "Médecins" },
  { value: "pharmacy", label: "Pharmacies" },
];

const inputCls =
  "h-14 w-full rounded-lg border border-border bg-card pl-11 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

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

  const handleKey = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="bg-card rounded-card border border-border shadow-card-hover p-4 sm:p-5">
      <div
        className={`grid gap-3 ${
          showSpecialtyField
            ? "xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto]"
            : "xl:grid-cols-[1.4fr_1fr_auto]"
        }`}
      >
        {/* Query */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            size={17}
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKey}
            placeholder="Nom du médecin ou de la pharmacie"
            className={inputCls}
          />
        </div>

        {/* City */}
        <div className="relative">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            size={17}
          />
          <input
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            onKeyDown={handleKey}
            placeholder="Ville"
            className={inputCls}
          />
        </div>

        {/* Specialty */}
        {showSpecialtyField && (
          <div className="relative">
            <Stethoscope
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              size={17}
            />
            <input
              value={specialty}
              onChange={(event) => onSpecialtyChange(event.target.value)}
              onKeyDown={handleKey}
              placeholder="Spécialité"
              className={inputCls}
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}
          {isLoading ? "Recherche..." : "Lancer la recherche"}
        </button>
      </div>

      {/* Scope pills */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SEARCH_SCOPES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onScopeChange(item.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === item.value
                ? "bg-accent-light text-accent"
                : "bg-gray-100 text-text-secondary hover:bg-gray-200 hover:text-text-primary"
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

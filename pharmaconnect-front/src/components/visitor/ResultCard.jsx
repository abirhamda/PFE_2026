import { ChevronRight, MapPin, Phone, Pill, Stethoscope } from "lucide-react";

const ResultCard = ({ result, onViewDetails }) => {
  const isDoctor = result.entityType === "doctor";
  const Icon = isDoctor ? Stethoscope : Pill;

  return (
    <article className="group relative bg-card rounded-card border border-border shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all duration-200 p-5 overflow-hidden">
      {/* Active accent bar on hover */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-light text-accent flex-shrink-0">
            <Icon size={22} />
          </div>

          <div>
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
              {result.typeLabel}
            </span>
            <h3 className="mt-2 text-base font-semibold text-text-primary leading-snug">
              {result.name}
            </h3>
            <p className="mt-0.5 text-sm text-text-secondary">{result.subtitle}</p>
          </div>
        </div>

        {result.badge && (
          <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent flex-shrink-0">
            {result.badge}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-text-secondary">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 shrink-0 text-text-muted" size={14} />
          <span>{result.address}</span>
        </p>
        <p className="flex items-start gap-2">
          <Phone className="mt-0.5 shrink-0 text-text-muted" size={14} />
          <span>{result.phone}</span>
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{result.meta}</p>
        <button
          type="button"
          onClick={() => onViewDetails(result)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          Voir détails
          <ChevronRight size={14} />
        </button>
      </div>
    </article>
  );
};

export default ResultCard;

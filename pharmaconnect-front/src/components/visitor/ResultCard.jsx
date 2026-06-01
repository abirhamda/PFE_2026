import { ChevronRight, MapPin, Phone, Pill, Stethoscope } from "lucide-react";

const ResultCard = ({ result, onViewDetails }) => {
  const isDoctor = result.entityType === "doctor";
  const Icon = isDoctor ? Stethoscope : Pill;

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 transition duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/60">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-sky-500 opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-100 text-cyan-700">
            <Icon size={24} />
          </div>

          <div>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {result.typeLabel}
            </span>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">{result.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{result.subtitle}</p>
          </div>
        </div>

        {result.badge ? (
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">{result.badge}</span>
        ) : null}
      </div>

      <div className="mt-5 space-y-3 text-sm text-slate-600">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 shrink-0 text-cyan-700" size={16} />
          <span>{result.address}</span>
        </p>
        <p className="flex items-start gap-2">
          <Phone className="mt-0.5 shrink-0 text-cyan-700" size={16} />
          <span>{result.phone}</span>
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{result.meta}</p>
        <button
          type="button"
          onClick={() => onViewDetails(result)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Voir details
          <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
};

export default ResultCard;

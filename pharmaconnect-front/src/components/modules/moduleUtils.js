export const inputClassName =
  "w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-card placeholder-text-muted outline-none transition focus:ring-2 focus:ring-accent/30 focus:border-accent";

export const textareaClassName = `${inputClassName} min-h-[120px] resize-y`;

export const formatDateTime = (value) => {
  if (!value) return "Date non renseignee";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

export const formatDate = (value) => {
  if (!value) return "Date non renseignee";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(parsed);
};

export const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Prix non renseigne";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 2,
  }).format(amount);
};

export const sortByDateDesc = (items, field = "created_at") =>
  [...items].sort((left, right) => new Date(right?.[field] || 0) - new Date(left?.[field] || 0));

export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

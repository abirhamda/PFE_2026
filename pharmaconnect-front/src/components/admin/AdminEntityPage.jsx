import React, { useEffect, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import Button from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import api from "../../lib/api";

const isActiveRecord = (record) => Number(record?.is_active) === 1 || record?.is_active === true;

const extractError = (error, fallback) =>
  error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

const formatDate = (value) => {
  if (!value) return "Non disponible";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const buildInitialValues = (fields, mode) =>
  fields.reduce((accumulator, field) => {
    if (mode === "add" && field.editOnly) return accumulator;
    if (mode === "edit" && field.addOnly) return accumulator;

    accumulator[field.name] = field.defaultValue ?? "";
    return accumulator;
  }, {});

const buildEditValues = (fields, record) =>
  fields.reduce((accumulator, field) => {
    if (field.addOnly) return accumulator;
    const sourceKey = field.sourceKey || field.name;
    accumulator[field.name] = record?.[sourceKey] ?? field.defaultValue ?? "";
    return accumulator;
  }, {});

const inputCls =
  "w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-card placeholder-text-muted outline-none transition focus:ring-2 focus:ring-accent/30 focus:border-accent";

const FormField = ({ field, value, onChange }) => {
  const commonProps = {
    id: field.name,
    name: field.name,
    value: value ?? "",
    placeholder: field.placeholder,
    onChange,
    className: inputCls,
  };

  return (
    <div className={field.fullWidth ? "md:col-span-2 xl:col-span-3" : ""}>
      <label htmlFor={field.name} className="mb-1.5 block text-xs font-medium text-text-secondary uppercase tracking-wide">
        {field.label}
      </label>

      {field.type === "textarea" ? (
        <textarea {...commonProps} rows={field.rows || 4} />
      ) : (
        <input {...commonProps} type={field.type || "text"} />
      )}

      {field.helperText && <p className="mt-1.5 text-xs text-text-muted">{field.helperText}</p>}
    </div>
  );
};

const DetailModal = ({ open, loading, record, title, onClose, detailFields }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-card border border-border bg-card shadow-card-hover">
        <div className="flex items-start justify-between border-b border-border bg-primary px-6 py-5 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Consultation</p>
            <h3 className="mt-0.5 text-lg font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-card border border-dashed border-border bg-gray-50 px-4 py-10 text-text-secondary">
              <RefreshCw className="animate-spin" size={16} />
              <span className="text-sm">Chargement des details...</span>
            </div>
          ) : !record ? (
            <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
              Impossible de charger les details.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {detailFields.map((field) => {
                const value = field.render ? field.render(record) : record?.[field.name];

                return (
                  <div key={field.label} className="rounded-lg border border-border bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">{field.label}</p>
                    <p className="mt-1.5 break-words text-sm font-medium text-text-primary">{value || "Non renseigne"}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, hint, icon }) => (
  <div className="bg-card rounded-card border border-border shadow-card p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-text-primary">{value}</p>
        {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
      </div>
      <div className="rounded-lg bg-accent-light p-2.5 text-accent flex-shrink-0">{icon}</div>
    </div>
  </div>
);

function AdminEntityPage({
  title,
  description,
  entityLabel,
  entityLabelPlural,
  endpoint,
  icon: Icon,
  fields,
  detailFields,
  summaryFields,
  mapListResponse,
  mapItemResponse,
  buildCreatePayload,
  buildUpdatePayload,
  getRecordId,
  getRecordTitle,
  getRecordSubtitle,
  getSearchableText,
  validateForm,
}) {
  const addDefaults = buildInitialValues(fields, "add");
  const editDefaults = buildInitialValues(fields, "edit");

  const [records, setRecords] = useState([]);
  const [createForm, setCreateForm] = useState(addDefaults);
  const [editForm, setEditForm] = useState(editDefaults);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailTitle, setDetailTitle] = useState("");

  const loadRecords = async () => {
    try {
      setLoadingList(true);
      const response = await api.get(endpoint);
      const nextRecords = mapListResponse(response.data) || [];
      setRecords(nextRecords);
      setError("");
    } catch (requestError) {
      setRecords([]);
      setError(extractError(requestError, `Erreur lors du chargement des ${entityLabelPlural.toLowerCase()}`));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [endpoint]);

  const totalCount = records.length;
  const activeCount = records.filter((record) => isActiveRecord(record)).length;
  const filteredRecords = records.filter((record) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = normalizedSearch ? getSearchableText(record).toLowerCase().includes(normalizedSearch) : true;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActiveRecord(record)) ||
      (statusFilter === "inactive" && !isActiveRecord(record));

    return matchesSearch && matchesStatus;
  });

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((previous) => ({ ...previous, [name]: value }));
  };

  const runValidation = (values, mode) => {
    const relevantFields = fields.filter((field) => !(mode === "add" ? field.editOnly : field.addOnly));

    for (const field of relevantFields) {
      if (field.required && !String(values?.[field.name] || "").trim()) {
        return `Le champ ${field.label} est obligatoire`;
      }
    }

    const customError = validateForm?.(values, mode);
    if (customError) return customError;

    return "";
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

    const validationError = runValidation(createForm, "add");
    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      const response = await api.post(endpoint, buildCreatePayload(createForm));
      const createdRecord = mapItemResponse(response.data);

      if (createdRecord) {
        setRecords((previous) => [createdRecord, ...previous]);
      } else {
        await loadRecords();
      }

      setCreateForm(addDefaults);
      setActiveTab("list");
      setMessage(`${entityLabel} ajoute avec succes.`);
      setError("");
    } catch (requestError) {
      setError(extractError(requestError, `Erreur lors de l'ajout du ${entityLabel.toLowerCase()}`));
      setMessage("");
    } finally {
      setSaving(false);
    }
  };

  const handleEditStart = (record) => {
    setEditingId(getRecordId(record));
    setEditForm(buildEditValues(fields, record));
    setActiveTab("edit");
    setMessage("");
    setError("");
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    const validationError = runValidation(editForm, "edit");
    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put(`${endpoint}/${editingId}`, buildUpdatePayload(editForm));
      const updatedRecord = mapItemResponse(response.data);

      if (updatedRecord) {
        setRecords((previous) =>
          previous.map((record) => (getRecordId(record) === editingId ? updatedRecord : record)),
        );
      } else {
        await loadRecords();
      }

      setEditingId(null);
      setEditForm(editDefaults);
      setActiveTab("list");
      setMessage(`${entityLabel} modifie avec succes.`);
      setError("");
    } catch (requestError) {
      setError(extractError(requestError, `Erreur lors de la modification du ${entityLabel.toLowerCase()}`));
      setMessage("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(`Supprimer ${getRecordTitle(record)} ?`);
    if (!confirmed) return;

    try {
      await api.delete(`${endpoint}/${getRecordId(record)}`);
      setRecords((previous) => previous.filter((item) => getRecordId(item) !== getRecordId(record)));
      setMessage(`${entityLabel} supprime avec succes.`);
      setError("");
    } catch (requestError) {
      setError(extractError(requestError, `Erreur lors de la suppression du ${entityLabel.toLowerCase()}`));
      setMessage("");
    }
  };

  const handleToggleStatus = async (record) => {
    const nextActive = !isActiveRecord(record);

    try {
      const response = await api.put(`${endpoint}/${getRecordId(record)}/status`, {
        active: nextActive,
      });

      const updatedRecord = mapItemResponse(response.data);
      if (updatedRecord) {
        setRecords((previous) =>
          previous.map((item) => (getRecordId(item) === getRecordId(record) ? updatedRecord : item)),
        );
      } else {
        await loadRecords();
      }

      setMessage(`${entityLabel} ${nextActive ? "active" : "desactive"} avec succes.`);
      setError("");
    } catch (requestError) {
      setError(extractError(requestError, `Erreur lors du changement de statut du ${entityLabel.toLowerCase()}`));
      setMessage("");
    }
  };

  const handleViewDetails = async (record) => {
    const recordId = getRecordId(record);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailRecord(null);
    setDetailTitle(getRecordTitle(record));

    try {
      const response = await api.get(`${endpoint}/${recordId}`);
      setDetailRecord(mapItemResponse(response.data) || null);
    } catch (requestError) {
      setError(extractError(requestError, `Erreur lors du chargement du ${entityLabel.toLowerCase()}`));
    } finally {
      setDetailLoading(false);
    }
  };

  const renderForm = (mode) => {
    const isEdit = mode === "edit";
    const values = isEdit ? editForm : createForm;
    const onChange = isEdit ? handleEditChange : handleCreateChange;
    const relevantFields = fields.filter((field) => !(isEdit ? field.addOnly : field.editOnly));
    const submitHandler = isEdit ? handleEditSubmit : handleCreateSubmit;

    return (
      <div className="bg-card rounded-card border border-border shadow-card p-5">
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-lg bg-accent-light p-2.5 text-accent flex-shrink-0">
            {isEdit ? <Pencil size={20} /> : <Plus size={20} />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {isEdit ? `Modifier ${entityLabel.toLowerCase()}` : `Ajouter ${entityLabel.toLowerCase()}`}
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {isEdit
                ? "Mettez a jour les informations principales puis sauvegardez."
                : "Renseignez les informations du compte pour le rendre utilisable immediatement."}
            </p>
          </div>
        </div>

        <form onSubmit={submitHandler} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {relevantFields.map((field) => (
            <FormField key={field.name} field={field} value={values[field.name]} onChange={onChange} />
          ))}

          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap justify-end gap-3 pt-2">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setEditForm(editDefaults);
                  setActiveTab("list");
                }}
              >
                Annuler
              </Button>
            )}

            <Button type="submit" variant="primary" isLoading={saving}>
              {isEdit ? "Sauvegarder" : "Creer le compte"}
            </Button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="space-y-5">

      {message && (
        <div className="rounded-card border-l-4 border-medical-success bg-medical-success-bg px-4 py-3 text-sm text-medical-success">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg px-4 py-3 text-sm text-medical-danger">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label={`Total ${entityLabelPlural.toLowerCase()}`}
          value={totalCount}
          hint="Comptes enregistres"
          icon={<Icon size={17} />}
        />
        <SummaryCard
          label="Comptes actifs"
          value={activeCount}
          hint={`${Math.max(totalCount - activeCount, 0)} inactifs`}
          icon={<BadgeCheck size={17} />}
        />
        <SummaryCard
          label="Resultats filtres"
          value={filteredRecords.length}
          hint="Liste visible actuelle"
          icon={<Search size={17} />}
        />
      </section>

      {/* Tab bar */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-card border border-border bg-gray-50 p-1.5 shadow-card">
          {[
            { key: "list", label: `Liste des ${entityLabelPlural.toLowerCase()}` },
            { key: "add", label: `Ajouter ${entityLabel.toLowerCase()}` },
            ...(editingId ? [{ key: "edit", label: `Modifier ${entityLabel.toLowerCase()}` }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button type="button" variant="outline" leftIcon={<RefreshCw size={15} />} onClick={loadRecords}>
          Actualiser
        </Button>
      </section>

      {activeTab === "add" && renderForm("add")}
      {activeTab === "edit" && editingId && renderForm("edit")}

      {activeTab === "list" && (
        <>
          {/* Search + filter */}
          <section className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`Rechercher ${entityLabel.toLowerCase()}...`}
                className={`${inputCls} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputCls}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs uniquement</option>
              <option value="inactive">Inactifs uniquement</option>
            </select>

            <div className="rounded-lg border border-border bg-gray-50 px-4 py-2.5 text-sm text-text-secondary">
              {filteredRecords.length} visible(s)
            </div>
          </section>

          {loadingList ? (
            <div className="flex items-center justify-center gap-3 rounded-card border border-dashed border-border bg-gray-50 px-4 py-16 text-text-secondary">
              <RefreshCw className="animate-spin" size={16} />
              <span className="text-sm">Chargement en cours...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-gray-50 px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-text-muted">
                <ShieldAlert size={22} />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Aucun resultat</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Modifiez la recherche ou ajoutez un nouveau compte {entityLabel.toLowerCase()}.
              </p>
            </div>
          ) : (
            <section className="grid gap-4 xl:grid-cols-2">
              {filteredRecords.map((record) => (
                <div key={getRecordId(record)} className="bg-card rounded-card border border-border shadow-card overflow-hidden">
                  {/* Card header */}
                  <div className="bg-primary px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="rounded-lg bg-white/15 p-2 flex-shrink-0">
                          <Icon size={18} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-white leading-tight break-words">
                            {getRecordTitle(record)}
                          </h3>
                          <p className="mt-0.5 text-xs text-white/60 break-all">{getRecordSubtitle(record)}</p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${
                          isActiveRecord(record)
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-medical-danger/20 bg-medical-danger-bg text-medical-danger"
                        }`}
                      >
                        {isActiveRecord(record) ? <BadgeCheck size={12} /> : <UserX size={12} />}
                        {isActiveRecord(record) ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5 space-y-4">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {summaryFields.map((field) => (
                        <div key={field.label} className="rounded-lg border border-border bg-gray-50 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-wide text-text-secondary">{field.label}</p>
                          <p className="mt-1 break-words text-sm font-medium text-text-primary">{field.render(record)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-accent-light bg-accent-light/40 px-3 py-2.5 text-xs text-accent">
                      Cree le {formatDate(record.created_at)}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <Button type="button" variant="outline" size="sm" leftIcon={<Eye size={14} />} onClick={() => handleViewDetails(record)}>
                        Voir
                      </Button>
                      <Button
                        type="button"
                        variant={isActiveRecord(record) ? "outline" : "success"}
                        size="sm"
                        leftIcon={<Activity size={14} />}
                        onClick={() => handleToggleStatus(record)}
                      >
                        {isActiveRecord(record) ? "Desactiver" : "Activer"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleEditStart(record)}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-medical-success bg-medical-success-bg text-medical-success text-xs font-medium hover:bg-green-100 transition-colors"
                      >
                        <Pencil size={13} /> Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(record)}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-medical-danger bg-medical-danger-bg text-medical-danger text-xs font-medium hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      <DetailModal
        open={detailOpen}
        loading={detailLoading}
        record={detailRecord}
        title={detailTitle}
        onClose={() => setDetailOpen(false)}
        detailFields={detailFields}
      />
    </div>
  );
}

export default AdminEntityPage;

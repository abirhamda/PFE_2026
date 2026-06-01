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

const FormField = ({ field, value, onChange }) => {
  const commonProps = {
    id: field.name,
    name: field.name,
    value: value ?? "",
    placeholder: field.placeholder,
    onChange,
    className:
      "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100",
  };

  return (
    <div className={field.fullWidth ? "md:col-span-2 xl:col-span-3" : ""}>
      <label htmlFor={field.name} className="mb-2 block text-sm font-semibold text-slate-700">
        {field.label}
      </label>

      {field.type === "textarea" ? (
        <textarea {...commonProps} rows={field.rows || 4} />
      ) : (
        <input {...commonProps} type={field.type || "text"} />
      )}

      {field.helperText && <p className="mt-2 text-xs text-slate-500">{field.helperText}</p>}
    </div>
  );
};

const DetailModal = ({ open, loading, record, title, onClose, detailFields }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 px-6 py-5 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Consultation</p>
            <h3 className="mt-1 text-2xl font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-slate-600">
              <RefreshCw className="animate-spin" size={18} />
              <span>Chargement des details...</span>
            </div>
          ) : !record ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Impossible de charger les details.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {detailFields.map((field) => {
                const value = field.render ? field.render(record) : record?.[field.name];

                return (
                  <div key={field.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
                    <p className="mt-2 break-words text-sm font-medium text-slate-800">{value || "Non renseigne"}</p>
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
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">{icon}</div>
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
      <Card className="overflow-hidden border-slate-200/90 bg-white/95 shadow-xl shadow-cyan-900/5">
        <CardContent className="p-8">
          <div className="mb-8 flex items-start gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-600 p-3 text-white shadow-lg">
              {isEdit ? <Pencil size={24} /> : <Plus size={24} />}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                {isEdit ? `Modifier ${entityLabel.toLowerCase()}` : `Ajouter ${entityLabel.toLowerCase()}`}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isEdit
                  ? "Mettez a jour les informations principales puis sauvegardez."
                  : "Renseignez les informations du compte pour le rendre utilisable immediatement."}
              </p>
            </div>
          </div>

          <form onSubmit={submitHandler} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <p className="text-xs uppercase tracking-wider text-cyan-100">Module administrateur</p>
        <h1 className="mt-1 text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-cyan-100">{description}</p>
      </section>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label={`Total ${entityLabelPlural.toLowerCase()}`}
          value={totalCount}
          hint="Comptes enregistres"
          icon={<Icon size={18} />}
        />
        <SummaryCard
          label="Comptes actifs"
          value={activeCount}
          hint={`${Math.max(totalCount - activeCount, 0)} inactifs`}
          icon={<BadgeCheck size={18} />}
        />
        <SummaryCard
          label="Resultats filtres"
          value={filteredRecords.length}
          hint="Liste visible actuelle"
          icon={<Search size={18} />}
        />
      </section>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
          {[
            { key: "list", label: `Liste des ${entityLabelPlural.toLowerCase()}` },
            { key: "add", label: `Ajouter ${entityLabel.toLowerCase()}` },
            ...(editingId ? [{ key: "edit", label: `Modifier ${entityLabel.toLowerCase()}` }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-cyan-700 text-white shadow-lg shadow-cyan-900/10"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={loadRecords}>
          Actualiser
        </Button>
      </section>

      {activeTab === "add" && renderForm("add")}
      {activeTab === "edit" && editingId && renderForm("edit")}

      {activeTab === "list" && (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.2fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`Rechercher ${entityLabel.toLowerCase()}...`}
                className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs uniquement</option>
              <option value="inactive">Inactifs uniquement</option>
            </select>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              {filteredRecords.length} visible(s)
            </div>
          </section>

          {loadingList ? (
            <Card className="border-slate-200/90 bg-white/95 shadow-sm">
              <CardContent className="flex items-center justify-center gap-3 px-6 py-16 text-slate-600">
                <RefreshCw className="animate-spin" size={18} />
                <span>Chargement en cours...</span>
              </CardContent>
            </Card>
          ) : filteredRecords.length === 0 ? (
            <Card className="border-slate-200/90 bg-white/95 shadow-sm">
              <CardContent className="px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <ShieldAlert size={28} />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-800">Aucun resultat</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Modifiez la recherche ou ajoutez un nouveau compte {entityLabel.toLowerCase()}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <section className="grid gap-5 xl:grid-cols-2">
              {filteredRecords.map((record) => (
                <Card key={getRecordId(record)} className="overflow-hidden border-slate-200/90 bg-white/95 shadow-md">
                  <CardContent className="p-0">
                    <div className="px-4 pt-4">
                      <div className="rounded-2xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 px-4 py-3 text-white shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex items-start gap-4">
                          <div className="rounded-2xl bg-white/20 p-2.5 backdrop-blur-sm">
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="break-words text-xl font-semibold leading-tight">{getRecordTitle(record)}</h3>
                            <p className="mt-0.5 break-all text-sm text-cyan-100">{getRecordSubtitle(record)}</p>
                          </div>
                        </div>

                        <div
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                            isActiveRecord(record)
                              ? "border-emerald-200/60 bg-emerald-400/15 text-emerald-50"
                              : "border-rose-200/60 bg-rose-400/15 text-rose-50"
                          }`}
                        >
                          {isActiveRecord(record) ? <BadgeCheck size={14} /> : <UserX size={14} />}
                          {isActiveRecord(record) ? "Actif" : "Inactif"}
                        </div>
                      </div>
                    </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {summaryFields.map((field) => (
                          <div key={field.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{field.label}</p>
                            <p className="mt-1 break-words text-sm font-medium text-slate-800">{field.render(record)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-cyan-50/60 px-4 py-3 text-sm text-cyan-800">
                        Cree le {formatDate(record.created_at)}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <Button type="button" variant="outline" leftIcon={<Eye size={15} />} onClick={() => handleViewDetails(record)}>
                          Voir
                        </Button>
                        <Button
                          type="button"
                          variant={isActiveRecord(record) ? "outline" : "success"}
                          leftIcon={<Activity size={15} />}
                          onClick={() => handleToggleStatus(record)}
                        >
                          {isActiveRecord(record) ? "Desactiver" : "Activer"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          leftIcon={<Pencil size={15} />}
                          onClick={() => handleEditStart(record)}
                          className="!border-emerald-500 !bg-white !text-emerald-600 hover:!border-emerald-600 hover:!bg-emerald-50 hover:!text-emerald-700 focus-visible:!ring-emerald-500"
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          leftIcon={<Trash2 size={15} />}
                          onClick={() => handleDelete(record)}
                          className="!border-rose-500 !bg-white !text-rose-600 hover:!border-rose-600 hover:!bg-rose-50 hover:!text-rose-700 focus-visible:!ring-rose-500"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Clipboard,
  Download,
  FileText,
  Flame,
  ImagePlus,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UploadCloud,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../lib/api";

const AI_ANALYSIS_ENDPOINT = import.meta.env.VITE_AI_ANALYSIS_ENDPOINT || "/ai/analyse";

const PATHOLOGIES = [
  "Atelectasis",
  "Cardiomegaly",
  "Consolidation",
  "Edema",
  "Enlarged Cardiomediastinum",
  "Fracture",
  "Lung Lesion",
  "Lung Opacity",
  "No Finding",
  "Pleural Effusion",
  "Pleural Other",
  "Pneumonia",
  "Pneumothorax",
  "Support Devices",
];

const normalizeProbability = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(1, numericValue > 1 ? numericValue / 100 : numericValue));
};

const toPercent = (value) => Math.round(normalizeProbability(value) * 100);

const getProbabilityTone = (probability) => {
  const percent = toPercent(probability);
  if (percent < 30) {
    return { text: "text-medical-success", bar: "bg-emerald-500" };
  }
  if (percent <= 60) {
    return { text: "text-medical-warning", bar: "bg-amber-400" };
  }
  return { text: "text-medical-danger", bar: "bg-red-500" };
};

const normalizeDetections = (payload) => {
  const source =
    payload?.pathologies ||
    payload?.detections ||
    payload?.predictions ||
    payload?.probabilities ||
    payload?.resultats ||
    [];

  const probabilities = new Map();

  if (Array.isArray(source)) {
    source.forEach((item) => {
      const name = item?.name || item?.label || item?.pathology || item?.pathologie || item?.className;
      const probability = item?.probability ?? item?.score ?? item?.probabilite ?? item?.value;
      if (name) {
        probabilities.set(String(name), normalizeProbability(probability));
      }
    });
  } else if (source && typeof source === "object") {
    Object.entries(source).forEach(([name, probability]) => {
      probabilities.set(String(name), normalizeProbability(probability));
    });
  }

  return PATHOLOGIES.map((name) => ({
    name,
    probability: probabilities.get(name) ?? 0,
  }));
};

const normalizeImageSource = (value) => {
  if (!value) return "";
  const source = String(value);
  if (source.startsWith("data:image/") || source.startsWith("http") || source.startsWith("/")) {
    return source;
  }
  if (/\.(png|jpe?g|webp)$/i.test(source)) {
    return `/${source.replace(/^\/+/, "")}`;
  }
  return `data:image/jpeg;base64,${source}`;
};

const normalizeAnalysisResponse = (payload) => ({
  detections: normalizeDetections(payload),
  gradcamImage:
    normalizeImageSource(
      payload?.gradcamImage ||
        payload?.gradcam_image ||
        payload?.gradcam ||
        payload?.heatmap ||
        payload?.heatmapImage ||
        payload?.heatmap_image,
    ) || "",
  report:
    payload?.report ||
    payload?.rapport ||
    payload?.medicalReport ||
    payload?.rapport_medical ||
    "Aucun rapport n'a ete retourne par le service IA.",
});

const isDoctorActive = (value) => value === true || Number(value) === 1 || String(value).toLowerCase() === "true";

const formatFileSize = (size) => {
  if (!size) return "0 Ko";
  return `${Math.max(1, Math.round(size / 1024))} Ko`;
};

const AccessDenied = ({ checking }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
      {checking
        ? <Loader2 size={28} className="text-text-muted animate-spin" />
        : <Lock size={28} className="text-text-muted" />
      }
    </div>
    <div>
      <h2 className="text-lg font-semibold text-text-primary">
        {checking ? "Vérification de l'accès" : "Accès au module IA bloqué"}
      </h2>
      <p className="text-sm text-text-secondary mt-1 max-w-sm">
        {checking
          ? "Contrôle du statut médecin en cours."
          : "Votre compte médecin doit être autorisé par un administrateur pour utiliser cette analyse."}
      </p>
    </div>
    {!checking && (
      <a
        href="mailto:admin@medicare.fr"
        className="text-sm text-accent hover:underline"
      >
        Contacter l'administrateur
      </a>
    )}
  </div>
);

const DetectionTable = ({ detections }) => (
  <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-border">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Pathologie
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Probabilité
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Statut
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {detections.map((detection) => {
          const percent = toPercent(detection.probability);
          const tone = getProbabilityTone(detection.probability);
          const detected = percent > 50;

          return (
            <tr key={detection.name} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3.5 font-medium text-text-primary">{detection.name}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percent}%` }} />
                  </div>
                  <span className={`w-10 text-right text-sm font-semibold ${tone.text}`}>{percent}%</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                {detected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-medical-danger-bg text-medical-danger">
                    Détecté
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Non détecté
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const HeatmapPanel = ({ gradcamImage }) => (
  <div className="space-y-4">
    <div className="overflow-hidden rounded-card border border-border bg-gray-950">
      {gradcamImage ? (
        <img
          src={gradcamImage}
          alt="Carte thermique GradCAM"
          className="mx-auto max-h-[500px] w-full object-contain"
        />
      ) : (
        <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-400">
          Carte thermique non retournée par le service IA.
        </div>
      )}
    </div>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="flex items-center gap-3 rounded-card border border-medical-danger-bg bg-medical-danger-bg px-4 py-3 text-medical-danger">
        <span className="h-3 w-3 rounded-full bg-red-500 flex-shrink-0" />
        Rouge = zone très suspecte
      </div>
      <div className="flex items-center gap-3 rounded-card border border-accent-light bg-accent-light px-4 py-3 text-accent">
        <span className="h-3 w-3 rounded-full bg-accent flex-shrink-0" />
        Bleu = zone normale
      </div>
    </div>
  </div>
);

const ReportPanel = ({ report, detections, onCopy, copied }) => {
  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 16;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    const topDetections = detections
      .filter((detection) => toPercent(detection.probability) > 50)
      .sort((left, right) => right.probability - left.probability);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 45, 74);
    doc.setFontSize(16);
    doc.text("Rapport médical IA - Radio thoracique", margin, 18);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, margin, 26);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Détections principales", margin, 38);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const detectionText =
      topDetections.length > 0
        ? topDetections.map((item) => `- ${item.name}: ${toPercent(item.probability)}%`).join("\n")
        : "Aucune pathologie au-dessus du seuil de 50%.";
    doc.text(doc.splitTextToSize(detectionText, maxWidth), margin, 45);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Rapport", margin, 66);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(report || "", maxWidth), margin, 73);
    doc.save(`rapport-ia-radio-${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-text-primary">
          <FileText size={17} />
          <h3 className="text-sm font-semibold">Rapport médical</h3>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">{report}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
        >
          <Clipboard size={15} />
          {copied ? "Rapport copié" : "Copier le rapport"}
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Download size={15} />
          Télécharger PDF
        </button>
      </div>
    </div>
  );
};

export default function MedicalAiAnalysisPage() {
  const inputRef = useRef(null);
  const { user } = useAuth();
  const [accessChecking, setAccessChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("detections");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifyAccess = async () => {
      if (String(user?.role || "").toLowerCase() !== "doctor") {
        if (mounted) {
          setIsAuthorized(false);
          setAccessChecking(false);
        }
        return;
      }

      try {
        const doctorId = Number(user?.id || user?.entityId || 0);
        if (!doctorId) {
          throw new Error("Identifiant medecin manquant");
        }

        const response = await api.get(`/doctors/${doctorId}`);
        const doctor = response.data?.doctor || response.data;
        if (mounted) {
          setIsAuthorized(isDoctorActive(doctor?.is_active));
        }
      } catch (_requestError) {
        if (mounted) {
          setIsAuthorized(isDoctorActive(user?.is_active));
        }
      } finally {
        if (mounted) {
          setAccessChecking(false);
        }
      }
    };

    verifyAccess();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const detectedCount = useMemo(
    () => (result ? result.detections.filter((item) => toPercent(item.probability) > 50).length : 0),
    [result],
  );

  const selectFile = (file) => {
    setError("");
    setResult(null);
    setActiveTab("detections");

    if (!file) return;
    if (!["image/jpeg", "image/jpg"].includes(file.type)) {
      setSelectedFile(null);
      setError("Veuillez sélectionner une image JPG.");
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const resetAnalysis = () => {
    setSelectedFile(null);
    setResult(null);
    setError("");
    setCopied(false);
    setActiveTab("detections");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const runAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError("");
    setResult(null);
    setCopied(false);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("file", selectedFile);

      const response = await api.post(AI_ANALYSIS_ENDPOINT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(normalizeAnalysisResponse(response.data || {}));
      setActiveTab("detections");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.response?.data?.message ||
          requestError.response?.data?.detail ||
          (requestError.code === "ERR_NETWORK"
            ? "Service IA indisponible. Demarrez ai-service sur http://127.0.0.1:8000 puis reessayez."
            : "Analyse impossible. Verifiez que le service IA est demarre et que l'endpoint est configure."),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyReport = async () => {
    if (!result?.report) return;
    await navigator.clipboard.writeText(result.report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (!isAuthorized) {
    return (
      <div className="bg-card rounded-card border border-border shadow-card p-6">
        <AccessDenied checking={accessChecking} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="bg-card rounded-card border border-border shadow-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
              <BrainCircuit size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Module IA médical
              </p>
              <h1 className="text-lg font-semibold text-text-primary">
                Analyse de radio thoracique
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-medical-success-bg bg-medical-success-bg px-3 py-2 text-sm text-medical-success font-medium w-fit">
            <ShieldCheck size={16} />
            Accès médecin autorisé
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-card border-l-4 border-medical-danger bg-medical-danger-bg p-4 text-sm text-medical-danger">
          {error}
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.85fr),minmax(540px,1.35fr)]">

        {/* Left column */}
        <div className="space-y-4">

          {/* Upload zone */}
          <div className="bg-card rounded-card border border-border shadow-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-text-primary tracking-wide">Radiographie</h3>
              <p className="text-xs text-text-secondary mt-0.5">JPG uniquement · max 20 MB</p>
            </div>
            <div
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-accent bg-accent-light/30"
                  : "border-border hover:border-accent hover:bg-accent-light/20"
              }`}
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud size={32} className="text-text-muted mb-3" />
              <p className="text-sm font-medium text-text-primary">
                Glissez une image ici
              </p>
              <p className="text-xs text-text-secondary mt-1 mb-4">ou cliquez pour parcourir</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="inline-flex items-center gap-2 border border-border bg-card text-text-primary text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ImagePlus size={15} />
                Parcourir
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg"
                className="hidden"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-card rounded-card border border-border shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-text-primary">
                <Stethoscope size={16} />
                <h3 className="text-sm font-semibold tracking-wide">Radio sélectionnée</h3>
              </div>
              {selectedFile && (
                <button
                  type="button"
                  onClick={resetAnalysis}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors"
                  aria-label="Retirer l'image"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {previewUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-card border border-border bg-gray-950">
                  <img
                    src={previewUrl}
                    alt="Prévisualisation de la radio"
                    className="max-h-[380px] w-full object-contain grayscale"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="break-all font-medium text-text-primary">{selectedFile.name}</span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-card border border-dashed border-border bg-gray-50 text-sm text-text-muted">
                Aucune image sélectionnée
              </div>
            )}
          </div>

          {/* Analyze button */}
          <button
            type="button"
            onClick={runAnalysis}
            disabled={!selectedFile || isAnalyzing}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing
              ? <><Loader2 className="animate-spin" size={17} /> Analyse en cours...</>
              : <><BrainCircuit size={17} /> Lancer l'analyse</>
            }
          </button>
        </div>

        {/* Right column — results */}
        <div className="bg-card rounded-card border border-border shadow-card p-5">
          {isAnalyzing ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center gap-4 text-primary">
              <Loader2 className="animate-spin" size={34} />
              <p className="text-sm font-medium text-text-secondary">Analyse en cours...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Results header */}
              <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Résultats IA
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold text-text-primary">
                    {detectedCount} pathologie{detectedCount > 1 ? "s" : ""} au-dessus du seuil
                  </h2>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 border-b border-border -mb-4 -mx-5 px-5">
                  {[
                    { key: "detections", label: "Détections",      icon: <BrainCircuit size={14} /> },
                    { key: "heatmap",    label: "Carte thermique", icon: <Flame size={14} /> },
                    { key: "report",     label: "Rapport",         icon: <FileText size={14} /> },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 cursor-pointer transition-colors ${
                        activeTab === tab.key
                          ? "font-medium text-primary border-primary"
                          : "text-text-secondary border-transparent hover:text-text-primary"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                {activeTab === "detections" && <DetectionTable detections={result.detections} />}
                {activeTab === "heatmap" && <HeatmapPanel gradcamImage={result.gradcamImage} />}
                {activeTab === "report" && (
                  <ReportPanel
                    report={result.report}
                    detections={result.detections}
                    onCopy={copyReport}
                    copied={copied}
                  />
                )}
              </div>

              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={resetAnalysis}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
                >
                  <RefreshCw size={15} />
                  Nouvelle analyse
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-gray-50 text-center text-text-secondary">
              <BrainCircuit size={36} className="text-text-muted" />
              <p className="text-sm font-medium">Les résultats apparaîtront ici après l'analyse.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
    return {
      text: "text-[#2e7d5e]",
      bar: "bg-[#2e7d5e]",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    };
  }
  if (percent <= 60) {
    return {
      text: "text-amber-700",
      bar: "bg-amber-500",
      bg: "bg-amber-50",
      border: "border-amber-200",
    };
  }
  return {
    text: "text-rose-700",
    bar: "bg-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  };
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

const HeaderBand = () => (
  <section className="rounded-lg bg-[#1a3a5c] px-5 py-4 text-white shadow-sm">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Module IA medical</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal">Analyse de radio thoracique</h1>
      </div>
      <div className="flex w-fit items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm">
        <ShieldCheck size={17} />
        <span>Acces medecin autorise</span>
      </div>
    </div>
  </section>
);

const AccessDenied = ({ checking }) => (
  <div className="space-y-5">
    <HeaderBand />
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <div className="flex items-start gap-3">
        {checking ? <Loader2 className="mt-0.5 animate-spin" size={22} /> : <AlertTriangle className="mt-0.5" size={22} />}
        <div>
          <h2 className="text-lg font-semibold tracking-normal">
            {checking ? "Verification de l'acces" : "Acces au module IA bloque"}
          </h2>
          <p className="mt-1 text-sm">
            {checking
              ? "Controle du statut medecin en cours."
              : "Votre compte medecin doit etre autorise par un administrateur pour utiliser cette analyse."}
          </p>
        </div>
      </div>
    </section>
  </div>
);

const DetectionTable = ({ detections }) => (
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Pathologie</th>
            <th className="px-4 py-3">Probabilite</th>
            <th className="px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {detections.map((detection) => {
            const percent = toPercent(detection.probability);
            const tone = getProbabilityTone(detection.probability);
            const detected = percent > 50;

            return (
              <tr key={detection.name} className={detected ? "bg-rose-50/50" : "bg-white"}>
                <td className="px-4 py-3 font-medium text-slate-900">{detection.name}</td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[220px] items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={`w-11 text-right font-semibold ${tone.text}`}>{percent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {detected ? (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      Detecte
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Non detecte
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const HeatmapPanel = ({ gradcamImage }) => (
  <div className="space-y-4">
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
      {gradcamImage ? (
        <img src={gradcamImage} alt="Carte thermique GradCAM" className="mx-auto max-h-[560px] w-full object-contain" />
      ) : (
        <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-300">
          Carte thermique non retournee par le service IA.
        </div>
      )}
    </div>
    <div className="grid gap-3 text-sm md:grid-cols-2">
      <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
        <span className="h-3 w-3 rounded-full bg-rose-600" />
        Rouge = zone tres suspecte
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
        <span className="h-3 w-3 rounded-full bg-blue-600" />
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
    doc.setTextColor(26, 58, 92);
    doc.setFontSize(16);
    doc.text("Rapport medical IA - Radio thoracique", margin, 18);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Genere le ${new Date().toLocaleString("fr-FR")}`, margin, 26);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detections principales", margin, 38);

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
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-[#1a3a5c]">
          <FileText size={18} />
          <h3 className="text-base font-semibold tracking-normal">Rapport medical</h3>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{report}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Clipboard size={16} />
          {copied ? "Rapport copie" : "Copier le rapport"}
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1a3a5c] px-4 text-sm font-semibold text-white transition hover:bg-[#14304c]"
        >
          <Download size={16} />
          Telecharger PDF
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
      setError("Veuillez selectionner une image JPG.");
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
          "Analyse impossible. Verifiez que le service IA est demarre et que l'endpoint est configure.",
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
    return <AccessDenied checking={accessChecking} />;
  }

  return (
    <div className="space-y-5">
      <HeaderBand />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.85fr),minmax(540px,1.35fr)]">
        <div className="space-y-5">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed bg-white p-5 shadow-sm transition ${
              isDragging ? "border-[#2e7d5e] bg-emerald-50" : "border-slate-300"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1a3a5c] text-white">
                <UploadCloud size={26} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-normal text-slate-900">Importer une radio thoracique</h2>
                <p className="mt-1 text-sm text-slate-500">Image JPG uniquement</p>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ImagePlus size={16} />
                Choisir une image
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

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#1a3a5c]">
                <Stethoscope size={17} />
                <h2 className="text-base font-semibold tracking-normal">Radio selectionnee</h2>
              </div>
              {selectedFile ? (
                <button
                  type="button"
                  onClick={resetAnalysis}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Retirer l'image"
                >
                  <X size={17} />
                </button>
              ) : null}
            </div>

            {previewUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-black">
                  <img
                    src={previewUrl}
                    alt="Previsualisation de la radio"
                    className="max-h-[420px] w-full object-contain grayscale"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="break-all font-medium text-slate-700">{selectedFile.name}</span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                Aucune image selectionnee
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={!selectedFile || isAnalyzing}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2e7d5e] px-4 text-sm font-semibold text-white transition hover:bg-[#25664d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
            {isAnalyzing ? "Analyse en cours..." : "Analyser"}
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {isAnalyzing ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 text-[#1a3a5c]">
              <Loader2 className="animate-spin" size={34} />
              <p className="text-sm font-semibold">Analyse en cours...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resultats IA</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-900">
                    {detectedCount} pathologie{detectedCount > 1 ? "s" : ""} au-dessus du seuil
                  </h2>
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {[
                    { key: "detections", label: "Detections", icon: <BrainCircuit size={15} /> },
                    { key: "heatmap", label: "Carte thermique", icon: <Flame size={15} /> },
                    { key: "report", label: "Rapport", icon: <FileText size={15} /> },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        activeTab === tab.key ? "bg-[#1a3a5c] text-white" : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "detections" ? <DetectionTable detections={result.detections} /> : null}
              {activeTab === "heatmap" ? <HeatmapPanel gradcamImage={result.gradcamImage} /> : null}
              {activeTab === "report" ? (
                <ReportPanel report={result.report} detections={result.detections} onCopy={copyReport} copied={copied} />
              ) : null}

              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={resetAnalysis}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw size={16} />
                  Nouvelle analyse
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500">
              <BrainCircuit size={36} className="text-slate-400" />
              <p className="text-sm font-medium">Les resultats apparaitront ici apres analyse.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

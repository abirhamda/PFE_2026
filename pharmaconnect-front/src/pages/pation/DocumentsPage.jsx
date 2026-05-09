import { useEffect, useState } from "react";
import { File, FolderOpen } from "lucide-react";
import api from "../../lib/api";

const PatientDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/patient-portal/documents");
      const list = Array.isArray(response.data?.documents) ? response.data.documents : [];
      setDocuments(list);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Impossible de charger les documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold">Mes documents</h1>
        <p className="mt-1 text-sm text-cyan-100">Espace pour vos comptes-rendus et documents medicaux.</p>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Chargement...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            <FolderOpen className="mx-auto mb-2" size={22} />
            Aucun document disponible pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <article key={document.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <File size={16} className="text-cyan-700" />
                  <p className="font-semibold text-slate-900">{document.title}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{document.description || "-"}</p>
                {document.file_url && (
                  <a
                    href={document.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                  >
                    Ouvrir le document
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PatientDocumentsPage;

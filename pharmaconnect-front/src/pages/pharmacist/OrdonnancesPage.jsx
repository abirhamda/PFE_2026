"use client"

import { useState, useEffect } from "react"
import api from "../../lib/api"
import { Search, FileText, User, Calendar, CheckCircle, Clock, AlertCircle, Eye } from "lucide-react"

const OrdonnancesPage = () => {
  const [ordonnances, setOrdonnances] = useState([])
  const [searchNom, setSearchNom] = useState("")
  const [searchPrenom, setSearchPrenom] = useState("")
  const [searchCin, setSearchCin] = useState("")
  const [searchTriggered, setSearchTriggered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null)

  useEffect(() => {
    fetchOrdonnances()
  }, [])

  const fetchOrdonnances = async () => {
    try {
      setLoading(true)
      const res = await api.get("/ordonnances")
      setOrdonnances(Array.isArray(res.data) ? res.data : [])
      setError("")
    } catch (error) {
      console.error("Erreur lors du chargement des ordonnances :", error)
      setError("Erreur lors du chargement des ordonnances")
      setOrdonnances([])
    } finally {
      setLoading(false)
    }
  }

  const handleEffectuer = async (id) => {
    try {
      await api.put(`/ordonnances/${id}/status`, { status: "Effectuée" })
      setOrdonnances((prev) => prev.map((ord) => (ord.id === id ? { ...ord, status: "Effectuée" } : ord)))
      setMessage(`Ordonnance N°${id} marquée comme effectuée avec succès !`)
      setError("")
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      console.error(error)
      setError("Erreur lors de la mise à jour du statut")
      setMessage("")
    }
  }

  const handleSearch = () => {
    setSearchTriggered(true)
  }

  const clearSearch = () => {
    setSearchNom("")
    setSearchPrenom("")
    setSearchCin("")
    setSearchTriggered(false)
  }

  const pendingOrdonnances = ordonnances.filter((ord) => ord.status !== "Effectuée")
  const completedOrdonnances = ordonnances.filter((ord) => ord.status === "Effectuée")

  const filtered = pendingOrdonnances.filter(
    (ord) =>
      ord.nom.toLowerCase().includes(searchNom.toLowerCase()) &&
      ord.prenom.toLowerCase().includes(searchPrenom.toLowerCase()) &&
      ord.cin.includes(searchCin),
  )

  const displayedOrdonnances = activeTab === "pending" ? filtered : completedOrdonnances

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Beautiful Header Section */}
      <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white py-8 px-6 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Gestion des Ordonnances</h1>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-orange-400 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingOrdonnances.length}</p>
                  <p className="text-blue-100 text-sm">En Attente</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-green-400 p-2 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedOrdonnances.length}</p>
                  <p className="text-blue-100 text-sm">Effectuées</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-blue-400 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ordonnances.length}</p>
                  <p className="text-blue-100 text-sm">Total</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Success/Error Messages */}
        {message && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-green-800 font-medium">{message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Beautiful Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/20 inline-flex">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
              }`}
            >
              <Clock className="w-5 h-5" />
              Ordonnances en attente ({pendingOrdonnances.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "completed"
                  ? "bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Ordonnances effectuées ({completedOrdonnances.length})
            </button>
          </div>
        </div>

        {/* Search Bar - Only show for pending tab */}
        {activeTab === "pending" && (
          <div className="mb-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <Search className="w-6 h-6 text-[#1D10FA]" />
              <h3 className="text-xl font-bold text-gray-800">Rechercher une ordonnance</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nom du patient</label>
                <input
                  type="text"
                  placeholder="Nom"
                  value={searchNom}
                  onChange={(e) => setSearchNom(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Prénom du patient</label>
                <input
                  type="text"
                  placeholder="Prénom"
                  value={searchPrenom}
                  onChange={(e) => setSearchPrenom(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">CIN du patient</label>
                <input
                  type="text"
                  placeholder="CIN"
                  value={searchCin}
                  onChange={(e) => setSearchCin(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 opacity-0">Actions</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSearch}
                    className="flex-1 bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white px-4 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Rechercher
                  </button>
                  <button
                    onClick={clearSearch}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                  >
                    Effacer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 max-w-md mx-auto">
              <div className="animate-spin w-12 h-12 border-4 border-[#1D10FA] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Chargement des ordonnances...</p>
            </div>
          </div>
        ) : displayedOrdonnances.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {activeTab === "pending" ? "Aucune ordonnance en attente" : "Aucune ordonnance effectuée"}
            </h3>
            <p className="text-gray-500">
              {searchTriggered && activeTab === "pending"
                ? "Essayez avec d'autres termes de recherche"
                : activeTab === "pending"
                  ? "Toutes les ordonnances ont été traitées"
                  : "Aucune ordonnance n'a encore été effectuée"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {displayedOrdonnances.map((ord, index) => (
              <div
                key={ord.id}
                className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl shadow-xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Ordonnance N°{ord.id}</h2>
                        <p className="text-blue-100 text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Émise le {new Date(ord.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        ord.status === "Effectuée" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {ord.status === "Effectuée" ? "Effectuée" : "En attente"}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Patient Information */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-[#1D10FA]" />
                        Informations Patient
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-16">Nom:</span>
                          <span className="font-semibold text-gray-800">{ord.nom}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-16">Prénom:</span>
                          <span className="font-semibold text-gray-800">{ord.prenom}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-16">CIN:</span>
                          <span className="font-semibold text-gray-800">{ord.cin}</span>
                        </div>
                      </div>
                    </div>

                    {/* Prescription */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#1D10FA]" />
                        Prescription
                      </h3>
                      <div className="bg-white rounded-lg p-4 max-h-32 overflow-y-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{ord.ordonnance}</pre>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedOrdonnance(ord)}
                      className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Voir détails
                    </button>

                    {ord.status !== "Effectuée" && (
                      <button
                        onClick={() => handleEffectuer(ord.id)}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marquer comme effectuée
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescription Details Modal */}
      {selectedOrdonnance && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Détails de l'Ordonnance N°{selectedOrdonnance.id}</h3>
                    <p className="text-blue-100 text-sm">
                      {selectedOrdonnance.nom} {selectedOrdonnance.prenom}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrdonnance(null)}
                  className="text-white/80 hover:text-white transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Informations Patient</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p>
                      <strong>Nom complet:</strong> {selectedOrdonnance.nom} {selectedOrdonnance.prenom}
                    </p>
                    <p>
                      <strong>CIN:</strong> {selectedOrdonnance.cin}
                    </p>
                    <p>
                      <strong>Date d'émission:</strong>{" "}
                      {new Date(selectedOrdonnance.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Prescription Complète</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <pre className="text-gray-700 whitespace-pre-wrap font-mono text-sm">
                      {selectedOrdonnance.ordonnance}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => setSelectedOrdonnance(null)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
              >
                Fermer
              </button>
              {selectedOrdonnance.status !== "Effectuée" && (
                <button
                  onClick={() => {
                    handleEffectuer(selectedOrdonnance.id)
                    setSelectedOrdonnance(null)
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold transition-all duration-200"
                >
                  Marquer comme effectuée
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default OrdonnancesPage



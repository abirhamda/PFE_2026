"use client"

import { useState } from "react"
import axios from "axios"
import { FileText, User, CreditCard, Save, CheckCircle, AlertCircle, Calendar, Clock, Pill } from "lucide-react"

const NewPrescription = () => {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    cin: "",
    ordonnance: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // Get doctor ID from authentication system
  const doctorId = localStorage.getItem("entityId") || sessionStorage.getItem("entityId") || localStorage.getItem("userId") || sessionStorage.getItem("userId") || 1

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = () => {
    const { nom, prenom, cin, ordonnance } = formData
    if (!nom.trim() || !prenom.trim() || !cin.trim() || !ordonnance.trim()) {
      setError("Tous les champs sont obligatoires")
      return false
    }
    if (cin.length < 8) {
      setError("Le CIN doit contenir au moins 8 caractères")
      return false
    }
    if (ordonnance.length < 10) {
      setError("La prescription doit être plus détaillée")
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (!validateForm()) return

    setLoading(true)
    try {
      const newOrdonnance = {
        id_doctor: Number.parseInt(doctorId),
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        cin: formData.cin.trim(),
        ordonnance: formData.ordonnance.trim(),
        status: "En attente",
      }

      console.log("Sending prescription:", newOrdonnance)
      const response = await axios.post("/api/ordonnances", newOrdonnance)
      console.log("Response:", response.data)

      setMessage("Prescription ajoutée avec succès !")
      setFormData({
        nom: "",
        prenom: "",
        cin: "",
        ordonnance: "",
      })

      // Clear success message after 5 seconds
      setTimeout(() => setMessage(""), 5000)
    } catch (error) {
      console.error("Erreur lors de l'ajout de la prescription :", error)
      if (error.response) {
        setError(`Erreur: ${error.response.data.error || "Erreur du serveur"}`)
      } else if (error.request) {
        setError("Erreur: Impossible de contacter le serveur")
      } else {
        setError("Erreur lors de l'ajout de la prescription.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Beautiful Header Section - Simplifié sans les informations du médecin */}
      <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white py-8 px-6 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Nouvelle Prescription</h1>
              </div>
            </div>

            {/* Date uniquement dans le coin droit */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">{new Date().toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
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

        {/* Main Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-[#1D10FA] p-3 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Formulaire de Prescription</h2>
                <p className="text-gray-600">Remplissez les informations du patient et la prescription</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid gap-8">
              {/* Patient Information Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <User className="w-6 h-6 text-[#1D10FA]" />
                  Informations du Patient
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="nom" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#1D10FA]" />
                      Nom du Patient
                    </label>
                    <input
                      type="text"
                      id="nom"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Nom de famille"
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20 disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="prenom" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#1D10FA]" />
                      Prénom du Patient
                    </label>
                    <input
                      type="text"
                      id="prenom"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Prénom"
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20 disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="cin" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#1D10FA]" />
                      Numéro CIN
                    </label>
                    <input
                      type="text"
                      id="cin"
                      name="cin"
                      value={formData.cin}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Numéro de carte d'identité nationale"
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Prescription Section */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Pill className="w-6 h-6 text-[#1D10FA]" />
                  Prescription Médicale
                </h3>
                <div className="space-y-2">
                  <label htmlFor="ordonnance" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#1D10FA]" />
                    Détails de l'Ordonnance
                  </label>
                  <textarea
                    id="ordonnance"
                    name="ordonnance"
                    value={formData.ordonnance}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    rows={8}
                    placeholder="Saisissez ici les détails de la prescription médicale..."
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20 disabled:opacity-50 font-mono text-sm resize-vertical min-h-[200px]"
                  />
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                    <span>Soyez précis dans vos instructions</span>
                    <span>{formData.ordonnance.length} caractères</span>
                  </div>
                </div>
              </div>

              {/* Prescription Summary */}
              {(formData.nom || formData.prenom || formData.cin) && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#1D10FA]" />
                    Résumé de la Prescription
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Patient:</span>
                      <p className="text-gray-800">
                        {formData.prenom} {formData.nom}
                        {formData.cin && ` (CIN: ${formData.cin})`}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Date:</span>
                      <p className="text-gray-800 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date().toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#1D10FA] to-purple-600 hover:from-purple-600 hover:to-[#1D10FA] text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3 text-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <Clock className="w-5 h-5" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Ajouter la Prescription
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

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

export default NewPrescription



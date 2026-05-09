"use client"

import { useEffect, useState } from "react"
import {
  Package,
  Search,
  Eye,
  Minus,
  Send,
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  User,
  TrendingUp,
  Calendar,
  Clock,
  Truck,
  Mail,
  Phone,
  XCircle,
} from "lucide-react"

const DashboardImproved = () => {
  // États pour les médicaments
  const [medicaments, setMedicaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMed, setSelectedMed] = useState(null)
  const [activeTab, setActiveTab] = useState("medicaments")
  const [message, setMessage] = useState("")
  const [formError, setFormError] = useState("")

  // États pour le popup de demande
  const [showDemandePopup, setShowDemandePopup] = useState(false)
  const [selectedMedicamentDemande, setSelectedMedicamentDemande] = useState(null)
  const [quantiteDemande, setQuantiteDemande] = useState("")
  const [popupLoading, setPopupLoading] = useState(false)
  const [popupError, setPopupError] = useState("")

  // États pour le popup d'ajout de médicament
  const [showAddMedicamentPopup, setShowAddMedicamentPopup] = useState(false)
  const [addMedicamentData, setAddMedicamentData] = useState({
    nom: "",
    prix: "",
  })
  const [addMedicamentLoading, setAddMedicamentLoading] = useState(false)
  const [addMedicamentError, setAddMedicamentError] = useState("")

  // États pour le popup de modification de médicament
  const [showModifyMedicamentPopup, setShowModifyMedicamentPopup] = useState(false)
  const [selectedMedicamentModify, setSelectedMedicamentModify] = useState(null)
  const [modifyMedicamentData, setModifyMedicamentData] = useState({
    nom: "",
    prix: "",
  })
  const [modifyMedicamentLoading, setModifyMedicamentLoading] = useState(false)
  const [modifyMedicamentError, setModifyMedicamentError] = useState("")

  // États pour les demandes (données statiques)
  const [demandes, setDemandes] = useState([])
  const [demandesStats, setDemandesStats] = useState({})
  const [demandesLoading, setDemandesLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  useEffect(() => {
    loadStaticData()
  }, [])

  useEffect(() => {
    if (activeTab === "demandes") {
      loadStaticDemandes()
    }
  }, [activeTab])

  const loadStaticData = () => {
    setLoading(true)

    // Données statiques des médicaments
    const staticMedicaments = [
      {
        id: 1,
        nom: "Paracétamol",
        quantite: 25,
        prix: 2.5,
        status: "critical",
        currentStock: 25,
        maxStock: 500,
        expiryDate: new Date(2025, 6, 15),
      },
      {
        id: 2,
        nom: "Amoxicilline",
        quantite: 150,
        prix: 8.75,
        status: "normal",
        currentStock: 150,
        maxStock: 500,
        expiryDate: new Date(2025, 8, 20),
      },
      {
        id: 3,
        nom: "Ibuprofène",
        quantite: 80,
        prix: 3.2,
        status: "normal",
        currentStock: 80,
        maxStock: 500,
        expiryDate: new Date(2025, 5, 10),
      },
      {
        id: 4,
        nom: "Aspirine",
        quantite: 30,
        prix: 1.8,
        status: "critical",
        currentStock: 30,
        maxStock: 500,
        expiryDate: new Date(2025, 7, 25),
      },
    ]

    setTimeout(() => {
      setMedicaments(staticMedicaments)
      setLoading(false)
    }, 1000)
  }

  const loadStaticDemandes = () => {
    setDemandesLoading(true)

    // Données statiques des demandes - seulement 2 demandes
    const staticDemandes = [
      {
        id: 1,
        nom_medicament: "Paracétamol",
        quantite: 50,
        status: "en_attente",
        nom_fournisseur: "mohamed bnr",
        president_pharmacie: "Dr Omaya",
        fournisseur_email: "mohamed@pharmaconnect.com",
        fournisseur_telephone: "25879614",
        created_at: "2024-01-15T10:30:00Z",
      },
      {
        id: 2,
        nom_medicament: "Aspirine",
        quantite: 30,
        status: "refusee",
        nom_fournisseur: "mohamed bnr",
        president_pharmacie: "Dr Omaya",
        fournisseur_email: "mohamed@pharmaconnect.com",
        fournisseur_telephone: "25879614",
        created_at: "2024-01-12T16:45:00Z",
      },
      // Nouvelle demande ajoutée ici
      {
        id:4, // ID unique
        nom_medicament: "Aspirine",
        quantite: 130,
        status: "acceptee",
        nom_fournisseur: "mohamed bnr", // Vous pouvez changer cela si nécessaire
        president_pharmacie: "Dr Omaya", // Vous pouvez changer cela si nécessaire
        fournisseur_email: "mohamed@pharmaconnect.com", // Vous pouvez changer cela si nécessaire
        fournisseur_telephone: "25879614", // Vous pouvez changer cela si nécessaire
        created_at: "07/07/2025", // Date spécifiée
      },
    ]

    const stats = {
      total: staticDemandes.length,
      en_attente: staticDemandes.filter((d) => d.status === "en_attente").length,
      acceptees: staticDemandes.filter((d) => d.status === "acceptee").length,
      recues: staticDemandes.filter((d) => d.status === "reçue").length,
      refusees: staticDemandes.filter((d) => d.status === "refusee").length,
    }

    setTimeout(() => {
      setDemandes(staticDemandes)
      setDemandesStats(stats)
      setDemandesLoading(false)
    }, 1000)
  }

  const diminuerQuantite = (id, currentQuantite) => {
    if (currentQuantite <= 0) return

    const nouvelleQuantite = currentQuantite - 1
    setMedicaments((prev) =>
      prev.map((m) => (m.id === id ? { ...m, currentStock: nouvelleQuantite, quantite: nouvelleQuantite } : m)),
    )
    setMessage("Quantité mise à jour avec succès!")
    setTimeout(() => setMessage(""), 3000)
  }

  const ouvrirPopupDemande = (medicament) => {
    setSelectedMedicamentDemande(medicament)
    setShowDemandePopup(true)
    setQuantiteDemande("")
    setPopupError("")
  }

  const fermerPopupDemande = () => {
    setShowDemandePopup(false)
    setSelectedMedicamentDemande(null)
    setQuantiteDemande("")
    setPopupError("")
  }

  // Fonctions pour l'ajout de médicament
  const ouvrirPopupAjoutMedicament = () => {
    setShowAddMedicamentPopup(true)
    setAddMedicamentData({ nom: "", prix: "" })
    setAddMedicamentError("")
  }

  const fermerPopupAjoutMedicament = () => {
    setShowAddMedicamentPopup(false)
    setAddMedicamentData({ nom: "", prix: "" })
    setAddMedicamentError("")
  }

  // Fonctions pour la modification de médicament
  const ouvrirPopupModificationMedicament = (medicament) => {
    setSelectedMedicamentModify(medicament)
    setModifyMedicamentData({
      nom: medicament.nom,
      prix: medicament.prix.toString(),
    })
    setShowModifyMedicamentPopup(true)
    setModifyMedicamentError("")
  }

  const fermerPopupModificationMedicament = () => {
    setShowModifyMedicamentPopup(false)
    setSelectedMedicamentModify(null)
    setModifyMedicamentData({ nom: "", prix: "" })
    setModifyMedicamentError("")
  }

  const modifierMedicament = (e) => {
    e.preventDefault()

    // Validation
    if (!modifyMedicamentData.nom.trim()) {
      setModifyMedicamentError("Le nom du médicament est requis")
      return
    }

    if (!modifyMedicamentData.prix || Number.parseFloat(modifyMedicamentData.prix) <= 0) {
      setModifyMedicamentError("Le prix doit être un nombre positif")
      return
    }

    // Vérifier si le nom existe déjà (sauf pour le médicament actuel)
    const medicamentExiste = medicaments.some(
      (m) =>
        m.id !== selectedMedicamentModify.id && m.nom.toLowerCase() === modifyMedicamentData.nom.trim().toLowerCase(),
    )

    if (medicamentExiste) {
      setModifyMedicamentError("Ce nom de médicament existe déjà")
      return
    }

    setModifyMedicamentLoading(true)
    setModifyMedicamentError("")

    // Simulation de modification
    setTimeout(() => {
      setMedicaments((prev) =>
        prev.map((m) =>
          m.id === selectedMedicamentModify.id
            ? {
                ...m,
                nom: modifyMedicamentData.nom.trim(),
                prix: Number.parseFloat(modifyMedicamentData.prix),
              }
            : m,
        ),
      )

      fermerPopupModificationMedicament()
      setMessage(`Médicament "${modifyMedicamentData.nom}" modifié avec succès !`)
      setTimeout(() => setMessage(""), 3000)
      setModifyMedicamentLoading(false)
    }, 1500)
  }

  const ajouterNouveauMedicament = (e) => {
    e.preventDefault()

    // Validation
    if (!addMedicamentData.nom.trim()) {
      setAddMedicamentError("Le nom du médicament est requis")
      return
    }

    if (!addMedicamentData.prix || Number.parseFloat(addMedicamentData.prix) <= 0) {
      setAddMedicamentError("Le prix doit être un nombre positif")
      return
    }

    // Vérifier si le médicament existe déjà
    const medicamentExiste = medicaments.some((m) => m.nom.toLowerCase() === addMedicamentData.nom.trim().toLowerCase())

    if (medicamentExiste) {
      setAddMedicamentError("Ce médicament existe déjà dans votre stock")
      return
    }

    setAddMedicamentLoading(true)
    setAddMedicamentError("")

    // Simulation d'ajout
    setTimeout(() => {
      const nouveauMedicament = {
        id: Date.now(),
        nom: addMedicamentData.nom.trim(),
        prix: Number.parseFloat(addMedicamentData.prix),
        quantite: 0,
        currentStock: 0,
        maxStock: 500,
        status: "critical", // Nouveau médicament commence avec stock 0 donc critique
        expiryDate: new Date(2025, 11, 31), // Date d'expiration par défaut
      }

      setMedicaments((prev) => [nouveauMedicament, ...prev])
      fermerPopupAjoutMedicament()
      setMessage(`Médicament "${nouveauMedicament.nom}" ajouté avec succès !`)
      setTimeout(() => setMessage(""), 3000)
      setAddMedicamentLoading(false)
    }, 1500)
  }

  const envoyerDemandeAvecPopup = (e) => {
    e.preventDefault()
    if (!quantiteDemande || quantiteDemande <= 0) {
      setPopupError("Veuillez saisir une quantité valide")
      return
    }

    setPopupLoading(true)
    setPopupError("")

    // Simulation d'envoi de demande
    setTimeout(() => {
      const nouvelleDemande = {
        id: Date.now(),
        nom_medicament: selectedMedicamentDemande.nom,
        quantite: Number.parseInt(quantiteDemande),
        status: "en_attente",
        nom_fournisseur: "Pharmacie Ibnou Sina",
        president_pharmacie: "Dr Omaya",
        fournisseur_email: "sina@pharmaconnect.com",
        fournisseur_telephone: "+21652745574",
        created_at: new Date().toISOString(),
      }

      setDemandes((prev) => [nouvelleDemande, ...prev])
      setDemandesStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        en_attente: prev.en_attente + 1,
      }))

      fermerPopupDemande()
      setMessage("Demande envoyée avec succès !")
      setTimeout(() => setMessage(""), 3000)
      setPopupLoading(false)
    }, 2000)
  }

  const updateDemandeStatus = (demandeId, newStatus) => {
    setUpdatingStatus(demandeId)

    // Simulation de mise à jour
    setTimeout(() => {
      setDemandes((prev) => prev.map((d) => (d.id === demandeId ? { ...d, status: newStatus } : d)))

      // Recalculer les stats
      const updatedDemandes = demandes.map((d) => (d.id === demandeId ? { ...d, status: newStatus } : d))
      const newStats = {
        total: updatedDemandes.length,
        en_attente: updatedDemandes.filter((d) => d.status === "en_attente").length,
        acceptees: updatedDemandes.filter((d) => d.status === "acceptee").length,
        recues: updatedDemandes.filter((d) => d.status === "reçue").length,
        refusees: updatedDemandes.filter((d) => d.status === "refusee").length,
      }
      setDemandesStats(newStats)

      setMessage("Statut mis à jour avec succès!")
      setTimeout(() => setMessage(""), 3000)
      setUpdatingStatus(null)
    }, 1000)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800"
      case "critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDemandeStatusIcon = (status) => {
    switch (status) {
      case "en_attente":
        return <Clock className="w-5 h-5 text-orange-500" />
      case "acceptee":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "reçue":
        return <Truck className="w-5 h-5 text-blue-500" />
      case "refusee":
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getDemandeStatusColor = (status) => {
    switch (status) {
      case "en_attente":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "acceptee":
        return "bg-green-100 text-green-800 border-green-200"
      case "reçue":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "refusee":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getDemandeStatusText = (status) => {
    switch (status) {
      case "en_attente":
        return "En attente"
      case "acceptee":
        return "Acceptée"
      case "reçue":
        return "Reçue"
      case "refusee":
        return "Refusée"
      default:
        return status
    }
  }

  const StatusButton = ({ status, currentStatus, demandeId, label, icon }) => {
    const isActive = currentStatus === status
    const isUpdating = updatingStatus === demandeId

    return (
      <button
        onClick={() => updateDemandeStatus(demandeId, status)}
        disabled={isUpdating || isActive}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive ? `${getDemandeStatusColor(status)} shadow-md` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${isActive ? "cursor-default" : ""}`}
      >
        {isUpdating ? (
          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          icon
        )}
        {isUpdating ? "..." : label}
      </button>
    )
  }

  const filtered = medicaments.filter((m) => m.nom.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredDemandes = demandes.filter((d) =>
    `${d.nom_medicament} ${d.nom_fournisseur}`.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const stats = {
    total: medicaments.length,
    normal: medicaments.filter((m) => m.status === "normal").length,
    critical: medicaments.filter((m) => m.status === "critical").length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white py-6 px-8 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Dashboard Pharmacie</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-gray-600">Total Médicaments</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.normal}</p>
              <p className="text-gray-600">Stock Normal</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.critical}</p>
              <p className="text-gray-600">Stock Critique</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{demandesStats.en_attente || 0}</p>
              <p className="text-gray-600">Demandes en attente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-md border border-gray-200 inline-flex">
          <button
            onClick={() => setActiveTab("medicaments")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "medicaments"
                ? "bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Package className="w-5 h-5" />
            Stock Médicaments
          </button>
          <button
            onClick={() => setActiveTab("demandes")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "demandes"
                ? "bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Send className="w-5 h-5" />
            Mes Demandes
          </button>
          <button
            onClick={() => setActiveTab("ajouter")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "ajouter"
                ? "bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Plus className="w-5 h-5" />
            Ajouter Médicament
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg shadow-md animate-fade-in">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
            <p className="text-green-800 font-medium">{message}</p>
          </div>
        </div>
      )}

      {formError && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-md animate-fade-in">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <p className="text-red-800 font-medium">{formError}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === "medicaments" ? (
        <div className="max-w-7xl mx-auto">
          {/* Search Bar and Add Button */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Rechercher un médicament..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 focus:border-[#1D10FA] rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des médicaments...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200">
              <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun médicament trouvé</h3>
              <p className="text-gray-500">
                {searchTerm ? "Essayez avec d'autres termes de recherche" : "Aucun médicament en stock"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{m.nom}</h2>
                          <p className="text-blue-100 text-sm">Médicament</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium bg-white/20 border border-white/30`}>
                        {m.status === "normal" ? "Normal" : "Critique"}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>
                          Stock: {m.currentStock}/{m.maxStock}
                        </span>
                        <span className="font-medium">{((m.currentStock / m.maxStock) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${m.status === "critical" ? "bg-red-500" : "bg-green-500"}`}
                          style={{ width: `${(m.currentStock / m.maxStock) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">
                          <strong>Prix:</strong> {Number(m.prix).toFixed(2)} TND
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedMed(m)}
                        className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Détails
                      </button>
                      <button
                        onClick={() => diminuerQuantite(m.id, m.currentStock)}
                        disabled={m.currentStock <= 0}
                        className={`flex-1 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2 ${
                          m.currentStock > 0
                            ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <Minus className="w-4 h-4" />
                        Diminuer
                      </button>
                      <button
                        onClick={() => ouvrirPopupDemande(m)}
                        className="flex-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Demander
                      </button>
                    </div>
                    <div className="mt-2">
                      <button
                        onClick={() => ouvrirPopupModificationMedicament(m)}
                        className="w-full bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        Modifier
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "demandes" ? (
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Rechercher une demande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 focus:border-[#1D10FA] rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {demandesLoading ? (
            <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des demandes...</p>
            </div>
          ) : filteredDemandes.length === 0 ? (
            <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200">
              <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Send className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune demande trouvée</h3>
              <p className="text-gray-500">
                {searchTerm
                  ? "Essayez avec d'autres termes de recherche"
                  : "Vous n'avez envoyé aucune demande pour le moment."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDemandes.map((demande) => (
                <div
                  key={demande.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{demande.nom_medicament}</h2>
                          <p className="text-blue-100 text-sm">Demande #{demande.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-white/20 border-white/30">
                        {getDemandeStatusIcon(demande.status)}
                        <span className="text-sm font-medium text-white">{getDemandeStatusText(demande.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex items-center gap-3 text-gray-600">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">
                          <strong>Quantité:</strong> {demande.quantite}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">
                          <strong>Fournisseur:</strong> {demande.nom_fournisseur || "Non spécifié"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">
                          <strong>Demandé le:</strong> {new Date(demande.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>

                    {/* Informations du fournisseur */}
                    {demande.nom_fournisseur && demande.nom_fournisseur !== "Non spécifié" && (
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-6 border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Informations du fournisseur
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          {demande.fournisseur_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{demande.fournisseur_email}</span>
                            </div>
                          )}
                          {demande.fournisseur_telephone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{demande.fournisseur_telephone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <StatusButton
                        status="en_attente"
                        currentStatus={demande.status}
                        demandeId={demande.id}
                        label="En attente"
                        icon={<Clock className="w-4 h-4" />}
                      />
                      <StatusButton
                        status="reçue"
                        currentStatus={demande.status}
                        demandeId={demande.id}
                        label="Reçue"
                        icon={<Truck className="w-4 h-4" />}
                      />
                      <StatusButton
                        status="refusee"
                        currentStatus={demande.status}
                        demandeId={demande.id}
                        label="Refusée"
                        icon={<XCircle className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "ajouter" ? (
        <div className="max-w-3xl mx-auto bg-white/70 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500 p-3 rounded-full">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Ajouter un Médicament</h1>
              <p className="text-gray-500">Remplissez les informations ci-dessous</p>
            </div>
          </div>

          <form onSubmit={ajouterNouveauMedicament} className="grid gap-6">
            <div className="space-y-2">
              <label htmlFor="nom_medicament" className="block text-gray-700 font-medium">Nom du Médicament</label>
              <div className="relative">
                <input
                  type="text"
                  value={addMedicamentData.nom}
                  onChange={(e) => setAddMedicamentData({ ...addMedicamentData, nom: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Paracétamol, Amoxicilline..."
                  required
                />
                <Package className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="prix_medicament" className="block text-gray-700 font-medium">Prix (TND)</label>
              <div className="relative">
                <input
                  type="number"
                  value={addMedicamentData.prix}
                  onChange={(e) => setAddMedicamentData({ ...addMedicamentData, prix: e.target.value })}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 2.50"
                  required
                />
                <TrendingUp className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" />
              </div>
            </div>

            {addMedicamentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-700 text-sm">{addMedicamentError}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={addMedicamentLoading}
              className="mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {addMedicamentLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Ajouter le médicament
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div></div>
      )}

      {/* Modal détails médicament */}
      {selectedMed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{selectedMed.nom}</h3>
                <button
                  onClick={() => setSelectedMed(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantité:</span>
                <span className="font-medium">{selectedMed.currentStock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prix:</span>
                <span className="font-medium">{Number(selectedMed.prix).toFixed(2)} TND</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date d'expiration:</span>
                <span className="font-medium">{selectedMed.expiryDate.toLocaleDateString()}</span>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                onClick={() => setSelectedMed(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP D'AJOUT DE MÉDICAMENT */}
      {showAddMedicamentPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Header du popup */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Ajouter un médicament</h2>
                    <p className="text-blue-100 text-sm">Nouveau médicament dans votre stock</p>
                  </div>
                </div>
                <button
                  onClick={fermerPopupAjoutMedicament}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Contenu du popup */}
            <form onSubmit={ajouterNouveauMedicament} className="p-6">
              {/* Champ nom du médicament */}
              <div className="mb-6">
                <label htmlFor="nom_medicament" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du médicament *
                </label>
                <input
                  type="text"
                  id="nom_medicament"
                  value={addMedicamentData.nom}
                  onChange={(e) => setAddMedicamentData({ ...addMedicamentData, nom: e.target.value })}
                  required
                  disabled={addMedicamentLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-blue-500 transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                  placeholder="Ex: Paracétamol, Amoxicilline..."
                />
              </div>

              {/* Champ prix */}
              <div className="mb-6">
                <label htmlFor="prix_medicament" className="block text-sm font-semibold text-gray-700 mb-2">
                  Prix (TND) *
                </label>
                <input
                  type="number"
                  id="prix_medicament"
                  value={addMedicamentData.prix}
                  onChange={(e) => setAddMedicamentData({ ...addMedicamentData, prix: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                  disabled={addMedicamentLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-blue-500 transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                  placeholder="Ex: 2.50"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={fermerPopupAjoutMedicament}
                  disabled={addMedicamentLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addMedicamentLoading || !addMedicamentData.nom.trim() || !addMedicamentData.prix}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addMedicamentLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Ajouter le médicament
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP DE DEMANDE */}
      {showDemandePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Header du popup */}
            <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Faire une demande</h2>
                    <p className="text-blue-100 text-sm">{selectedMedicamentDemande?.nom}</p>
                  </div>
                </div>
                <button
                  onClick={fermerPopupDemande}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Contenu du popup */}
            <form onSubmit={envoyerDemandeAvecPopup} className="p-6">
              {/* Informations du médicament */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6 border border-blue-200">
                <h3 className="font-semibold text-gray-800 mb-2">Détails de la demande</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Médicament:</span>
                    <span className="font-medium text-gray-800">{selectedMedicamentDemande?.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock actuel:</span>
                    <span
                      className={`font-medium ${selectedMedicamentDemande?.status === "critical" ? "text-red-600" : "text-green-600"}`}
                    >
                      {selectedMedicamentDemande?.currentStock}
                    </span>
                  </div>
                  {selectedMedicamentDemande?.prix && (
                    <div className="flex justify-between">
                      <span>Prix unitaire:</span>
                      <span className="font-medium text-gray-800">{selectedMedicamentDemande.prix} TND</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Champ quantité */}
              <div className="mb-6">
                <label htmlFor="quantite" className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantité demandée *
                </label>
                <input
                  type="number"
                  id="quantite"
                  value={quantiteDemande}
                  onChange={(e) => setQuantiteDemande(e.target.value)}
                  min="1"
                  required
                  disabled={popupLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20 disabled:opacity-50"
                  placeholder="Entrez la quantité souhaitée"
                />
              </div>

              {/* Calcul du total si prix disponible */}
              {selectedMedicamentDemande?.prix && quantiteDemande && (
                <div className="bg-green-50 rounded-lg p-3 mb-6 border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-medium">Total estimé:</span>
                    <span className="text-green-800 font-bold text-lg">
                      {(
                        Number.parseFloat(selectedMedicamentDemande.prix) * Number.parseInt(quantiteDemande || 0)
                      ).toFixed(2)}{" "}
                      TND
                    </span>
                  </div>
                </div>
              )}

              {/* Message d'erreur */}
              {popupError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-700 text-sm">{popupError}</span>
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={fermerPopupDemande}
                  disabled={popupLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={popupLoading || !quantiteDemande}
                  className="flex-1 bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {popupLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer la demande
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP DE MODIFICATION DE MÉDICAMENT */}
      {showModifyMedicamentPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Header du popup */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Modifier le médicament</h2>
                    <p className="text-orange-100 text-sm">{selectedMedicamentModify?.nom}</p>
                  </div>
                </div>
                <button
                  onClick={fermerPopupModificationMedicament}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Contenu du popup */}
            <form onSubmit={modifierMedicament} className="p-6">
              {/* Champ nom du médicament */}
              <div className="mb-6">
                <label htmlFor="modify_nom_medicament" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du médicament *
                </label>
                <input
                  type="text"
                  id="modify_nom_medicament"
                  value={modifyMedicamentData.nom}
                  onChange={(e) => setModifyMedicamentData({ ...modifyMedicamentData, nom: e.target.value })}
                  required
                  disabled={modifyMedicamentLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-yellow-500 transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-200 disabled:opacity-50"
                  placeholder="Ex: Paracétamol, Amoxicilline..."
                />
              </div>

              {/* Champ prix */}
              <div className="mb-6">
                <label htmlFor="modify_prix_medicament" className="block text-sm font-semibold text-gray-700 mb-2">
                  Prix (TND) *
                </label>
                <input
                  type="number"
                  id="modify_prix_medicament"
                  value={modifyMedicamentData.prix}
                  onChange={(e) => setModifyMedicamentData({ ...modifyMedicamentData, prix: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                  disabled={modifyMedicamentLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-yellow-500 transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-200 disabled:opacity-50"
                  placeholder="Ex: 2.50"
                />
              </div>

              {/* Message d'erreur */}
              {modifyMedicamentError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-700 text-sm">{modifyMedicamentError}</span>
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={fermerPopupModificationMedicament}
                  disabled={modifyMedicamentLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modifyMedicamentLoading || !modifyMedicamentData.nom.trim() || !modifyMedicamentData.prix}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {modifyMedicamentLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Modification...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      Modifier le médicament
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default DashboardImproved



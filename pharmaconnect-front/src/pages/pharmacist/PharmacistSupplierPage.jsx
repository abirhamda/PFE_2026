import React, { useState, useEffect } from "react"
import axios from "axios"
import {
  User,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Plus,
  Lock,
  Search,
  Trash,
  Pencil,
  ChevronUp,
  ChevronDown
} from "lucide-react"

const PharmacistSupplierPage = () => {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    telephone: "",
  })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [suppliers, setSuppliers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("list")

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await axios.get("/api/suppliers")
        setSuppliers(res.data)
      } catch (err) {
        console.error(err)
        setError("Erreur lors du chargement des fournisseurs.")
      }
    }

    fetchSuppliers()
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post("/api/suppliers", formData)
      setSuppliers((prev) => [...prev, res.data.supplier])
      setMessage("Fournisseur ajouté avec succès !")
      setError("")
      setFormData({ nom: "", prenom: "", email: "", password: "", telephone: "" })
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      console.error(err)
      const errorMsg = err.response?.data?.error || "Erreur lors de l'ajout du fournisseur."
      setError(errorMsg)
      setTimeout(() => setError(""), 3000)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) return
    try {
      await axios.delete(`/api/suppliers/${id}`)
      setSuppliers((prev) => prev.filter((s) => s.id !== id))
      setMessage("Fournisseur supprimé avec succès")
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      console.error(err)
      setError("Erreur lors de la suppression.")
      setTimeout(() => setError(""), 3000)
    }
  }

  const toggleStatus = async (id, currentStatus) => {
    setLoading(true)
    try {
      const res = await axios.put(`/api/suppliers/${id}/status`, {
        active: !currentStatus
      })
      setSuppliers(prev => prev.map(s => 
        s.id === id ? { ...s, is_active: !currentStatus } : s
      ))
      setMessage(`Fournisseur ${!currentStatus ? "activé" : "désactivé"} avec succès`)
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      console.error(err)
      setError("Erreur lors du changement de statut")
      setTimeout(() => setError(""), 3000)
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter((s) =>
    `${s.nom} ${s.prenom} ${s.email} ${s.telephone}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 px-8 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Gestion des Fournisseurs</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {suppliers.filter(s => s.is_active).length}
              </p>
              <p className="text-gray-600">Fournisseurs Actifs</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{suppliers.length}</p>
              <p className="text-gray-600">Total Fournisseurs</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Search className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredSuppliers.length}</p>
              <p className="text-gray-600">Résultats Recherche</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-md border border-gray-200 inline-flex">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "list"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            Liste des fournisseurs
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "add"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Plus className="w-5 h-5" />
            Ajouter un fournisseur
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

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-md animate-fade-in">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === "list" ? (
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Rechercher un fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 focus:border-blue-600 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Suppliers List */}
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200">
              <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <User className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun fournisseur trouvé</h3>
              <p className="text-gray-500">
                {searchTerm
                  ? "Essayez avec d'autres termes de recherche"
                  : "Commencez par ajouter votre premier fournisseur"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3 rounded-full">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">
                          {supplier.prenom} {supplier.nom}
                        </h2>
                        <p className="text-blue-100 text-sm">Fournisseur Partenaire</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-gray-600">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{supplier.email}</span>
                      </div>

                      <div className="flex items-center gap-3 text-gray-600">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{supplier.telephone}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            supplier.is_active
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${supplier.is_active ? "bg-green-400" : "bg-red-400"}`}
                          />
                          {supplier.is_active ? "Actif" : "Inactif"}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Modifier
                      </button>

                      <button
                        onClick={() => toggleStatus(supplier.id, supplier.is_active)}
                        disabled={loading}
                        className={`flex-1 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2 ${
                          supplier.is_active
                            ? "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
                            : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                        }`}
                      >
                        {supplier.is_active ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                        {supplier.is_active ? "Désactiver" : "Activer"}
                      </button>

                      <button
                        onClick={() => handleDelete(supplier.id)}
                        disabled={loading}
                        className="flex-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2"
                      >
                        <Trash className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto bg-white/70 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-500 p-3 rounded-full">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Ajouter un Fournisseur</h1>
              <p className="text-gray-500">Remplissez les informations ci-dessous</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6">
            {[
              { name: "nom", type: "text", label: "Nom", icon: <User className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" /> },
              { name: "prenom", type: "text", label: "Prénom", icon: <User className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" /> },
              { name: "email", type: "email", label: "Email", icon: <Mail className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" /> },
              { name: "password", type: "password", label: "Mot de passe", icon: <Lock className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" /> },
              { name: "telephone", type: "tel", label: "Téléphone", icon: <Phone className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" /> },
            ].map(({ name, type, label, icon }) => (
              <div className="space-y-2" key={name}>
                <label className="block text-gray-700 font-medium">{label}</label>
                <div className="relative">
                  <input
                    type={type}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder={label}
                    required
                  />
                  {icon}
                </div>
              </div>
            ))}

            <button
              type="submit"
              className="mt-4 w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Ajouter le fournisseur
            </button>
          </form>
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

export default PharmacistSupplierPage

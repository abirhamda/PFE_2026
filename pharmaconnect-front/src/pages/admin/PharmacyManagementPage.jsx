"use client"

import { useState, useEffect } from "react"
import axios from "axios"

const PharmacyManagementPage = () => {
  const [formData, setFormData] = useState({
    nom_pharmacie: "",
    email: "",
    telephone: "",
    password: "",
    president_pharmacie: "",
  })
  const [editingPharmacy, setEditingPharmacy] = useState(null)
  const [editFormData, setEditFormData] = useState({
    nom_pharmacie: "",
    email: "",
    telephone: "",
    president_pharmacie: "",
  })
  const [pharmacies, setPharmacies] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("list")

  useEffect(() => {
    fetchPharmacies()
  }, [])

  const fetchPharmacies = async () => {
    try {
      setListLoading(true)
      const token = localStorage.getItem("token") || sessionStorage.getItem("token")
      if (!token) {
        setError("Vous devez être connecté en tant qu'administrateur")
        setPharmacies([])
        return
      }

      const response = await axios.get("/api/admin/pharmacies", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setPharmacies(Array.isArray(response.data) ? response.data : [])
      setError("")
    } catch (err) {
      console.error("Erreur chargement pharmacies:", err)
      setError("Erreur lors du chargement des pharmacies")
      setPharmacies([])
    } finally {
      setListLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    })
  }

  const validateForm = (data) => {
    const { nom_pharmacie, email, telephone, president_pharmacie } = data
    if (!nom_pharmacie || !email || !telephone || !president_pharmacie) {
      setError("Tous les champs sont obligatoires")
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Format d'email invalide")
      return false
    }

    return true
  }

  const validateAddForm = () => {
    const { password } = formData
    if (!validateForm(formData)) return false

    if (!password) {
      setError("Le mot de passe est obligatoire")
      return false
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")
    setError("")

    if (!validateAddForm()) return

    setLoading(true)
    const token = localStorage.getItem("token") || sessionStorage.getItem("token")

    if (!token) {
      setError("Vous devez être connecté en tant qu'administrateur")
      setLoading(false)
      return
    }

    try {
      const res = await axios.post("/api/admin/pharmacies", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      setMessage(`Pharmacie "${formData.nom_pharmacie}" créée avec succès !`)
      setFormData({
        nom_pharmacie: "",
        email: "",
        telephone: "",
        password: "",
        president_pharmacie: "",
      })
      fetchPharmacies()
      setTimeout(() => setActiveTab("list"), 1500)
    } catch (err) {
      console.error("Erreur création pharmacie:", err)
      const errorMessage = err.response?.data?.error || err.message
      if (errorMessage.includes("email existe déjà")) {
        setError("Une pharmacie ou un compte avec cet email existe déjà")
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (pharmacy) => {
    setEditingPharmacy(pharmacy.id_pharmacie)
    setEditFormData({
      nom_pharmacie: pharmacy.nom_pharmacie,
      email: pharmacy.email,
      telephone: pharmacy.telephone,
      president_pharmacie: pharmacy.president_pharmacie,
    })
    setActiveTab("edit")
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setMessage("")
    setError("")

    if (!validateForm(editFormData)) return

    setLoading(true)
    const token = localStorage.getItem("token") || sessionStorage.getItem("token")

    if (!token) {
      setError("Vous devez être connecté en tant qu'administrateur")
      setLoading(false)
      return
    }

    try {
      const response = await axios.put(`/api/admin/pharmacies/${editingPharmacy}`, editFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      setMessage(`Pharmacie "${editFormData.nom_pharmacie}" modifiée avec succès !`)
      setEditingPharmacy(null)
      setEditFormData({
        nom_pharmacie: "",
        email: "",
        telephone: "",
        president_pharmacie: "",
      })
      fetchPharmacies()
      setActiveTab("list")
    } catch (err) {
      console.error("Erreur modification pharmacie:", err)
      const errorMessage = err.response?.data?.error || err.message
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setEditingPharmacy(null)
    setEditFormData({
      nom_pharmacie: "",
      email: "",
      telephone: "",
      president_pharmacie: "",
    })
    setActiveTab("list")
  }

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette pharmacie ?")) {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token")
        await axios.delete(`/api/admin/pharmacies/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setPharmacies(pharmacies.filter((p) => p.id_pharmacie !== id))
        setMessage("Pharmacie supprimée avec succès")
        setError("")
      } catch (err) {
        console.error("Erreur suppression pharmacie:", err)
        setError("Erreur lors de la suppression de la pharmacie")
      }
    }
  }

  const toggleActive = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token")
      const response = await axios.put(
        `/api/admin/pharmacies/${id}/status`,
        {
          active: !currentStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (response.data.pharmacy) {
        setPharmacies(pharmacies.map((pharmacy) => (pharmacy.id_pharmacie === id ? response.data.pharmacy : pharmacy)))
        setMessage(`Statut de la pharmacie ${!currentStatus ? "activé" : "désactivé"}`)
        setError("")
      }
    } catch (err) {
      console.error("Erreur changement statut pharmacie:", err)
      setError("Erreur lors du changement de statut")
    }
  }

  const isPharmacyActive = (pharmacy) => Number(pharmacy?.is_active) === 1 || pharmacy?.is_active === true

  const filteredPharmacies = pharmacies.filter(
    (p) =>
      p.nom_pharmacie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.president_pharmacie.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Beautiful Header Section */}
      <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white py-8 px-6 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold">Gestion des Pharmacies</h1>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-green-400 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold">{pharmacies.filter((p) => isPharmacyActive(p)).length}</p>
                  <p className="text-blue-100 text-sm">Pharmacies Actives</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-blue-400 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredPharmacies.length}</p>
                  <p className="text-blue-100 text-sm">Résultats Recherche</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-purple-400 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold">{new Set(pharmacies.map((p) => p.president_pharmacie)).size}</p>
                  <p className="text-blue-100 text-sm">Présidents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Success/Error Messages with beautiful styling */}
        {message && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-green-800 font-medium">{message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Beautiful Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/20 inline-flex">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "list"
                  ? "bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white shadow-lg"
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
              Liste des pharmacies
            </button>

            <button
              onClick={() => setActiveTab("add")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "add"
                  ? "bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajouter une pharmacie
            </button>

            {editingPharmacy && (
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "edit"
                    ? "bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Modifier la pharmacie
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {activeTab === "list" ? (
          <>
            {/* Beautiful Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Rechercher une pharmacie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {listLoading ? (
              <div className="text-center py-16">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 max-w-md mx-auto">
                  <svg className="animate-spin w-12 h-12 text-[#1D10FA] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-gray-600 font-medium">Chargement des pharmacies...</p>
                </div>
              </div>
            ) : filteredPharmacies.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune pharmacie trouvée</h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? "Essayez avec d'autres termes de recherche"
                    : "Commencez par ajouter votre première pharmacie"}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPharmacies.map((pharmacy, index) => (
                  <div
                    key={pharmacy.id_pharmacie}
                    className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl shadow-xl"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Card Header with Gradient */}
                    <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 p-6 text-white">
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{pharmacy.nom_pharmacie}</h2>
                          <p className="text-blue-100 text-sm">Pharmacie Partenaire</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6">
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-gray-600">
                          <svg className="w-4 h-4 text-[#1D10FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="text-sm">{pharmacy.email}</span>
                        </div>

                        <div className="flex items-center gap-3 text-gray-600">
                          <svg className="w-4 h-4 text-[#1D10FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          <span className="text-sm">{pharmacy.telephone}</span>
                        </div>

                        <div className="flex items-center gap-3 text-gray-600">
                          <svg className="w-4 h-4 text-[#1D10FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          <span className="text-sm">{pharmacy.president_pharmacie}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                              isPharmacyActive(pharmacy)
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isPharmacyActive(pharmacy) ? "bg-green-400" : "bg-red-400"
                              }`}
                            ></div>
                            {isPharmacyActive(pharmacy) ? "Active" : "Désactivée"}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(pharmacy.id_pharmacie, isPharmacyActive(pharmacy))}
                          className={`flex-1 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2 ${
                            isPharmacyActive(pharmacy)
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
                              : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                          }`}
                        >
                          {isPharmacyActive(pharmacy) ? "Désactiver" : "Activer"}
                        </button>

                        <button
                          onClick={() => handleEditClick(pharmacy)}
                          className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2"
                        >
                          Modifier
                        </button>

                        <button
                          onClick={() => handleDelete(pharmacy.id_pharmacie)}
                          className="flex-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-medium rounded-lg transition-all duration-200 py-2 px-3 flex items-center justify-center gap-2"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeTab === "add" ? (
          /* Beautiful Add Pharmacy Form */
          <div className="shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Ajouter une nouvelle pharmacie</h2>
                  <p className="text-gray-600">Remplissez les informations de la pharmacie</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1D10FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Nom de la pharmacie
                  </label>
                  <input
                    type="text"
                    name="nom_pharmacie"
                    placeholder="Nom de la pharmacie"
                    value={formData.nom_pharmacie}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1D10FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email professionnel"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1D10FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    placeholder="Numéro de téléphone"
                    value={formData.telephone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1D10FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Mot de passe sécurisé"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1D10FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Président de la pharmacie
                  </label>
                  <input
                    type="text"
                    name="president_pharmacie"
                    placeholder="Nom du président"
                    value={formData.president_pharmacie}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-[#1D10FA] to-purple-600 hover:from-purple-600 hover:to-[#1D10FA] text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Créer la pharmacie
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Edit Pharmacy Form */
          <div className="shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Modifier la pharmacie</h2>
                  <p className="text-gray-600">Modifiez les informations de la pharmacie</p>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Nom de la pharmacie
                  </label>
                  <input
                    type="text"
                    name="nom_pharmacie"
                    placeholder="Nom de la pharmacie"
                    value={editFormData.nom_pharmacie}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email professionnel"
                    value={editFormData.email}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    placeholder="Numéro de téléphone"
                    value={editFormData.telephone}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Président de la pharmacie
                  </label>
                  <input
                    type="text"
                    name="president_pharmacie"
                    placeholder="Nom du président"
                    value={editFormData.president_pharmacie}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-red-600 hover:to-orange-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Modification en cours...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Sauvegarder les modifications
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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

export default PharmacyManagementPage



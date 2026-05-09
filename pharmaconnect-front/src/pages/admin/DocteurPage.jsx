"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import Button from "../../components/ui/Button"
import { Card, CardContent } from "../../components/ui/Card"
import Input from "../../components/ui/Input"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog"

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([])
  const [newDoctor, setNewDoctor] = useState({
    nom: "",
    prenom: "",
    email: "",
    motDePasse: "",
    cin: "",
    specialite: "",
  })
  const [editingDoctor, setEditingDoctor] = useState(null)
  const [editDoctor, setEditDoctor] = useState({
    nom: "",
    prenom: "",
    email: "",
    cin: "",
    specialite: "",
  })
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [doctorToDelete, setDoctorToDelete] = useState(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("list")

  const fetchDoctors = async () => {
    try {
      const res = await axios.get("/api/doctors")
      setDoctors(Array.isArray(res.data.doctors) ? res.data.doctors : [])
      setError("")
    } catch (err) {
      console.error("Erreur chargement médecins:", err)
      setError("Erreur lors du chargement des médecins")
      setDoctors([])
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [])

  const addDoctor = async () => {
    const { nom, prenom, email, motDePasse, cin, specialite } = newDoctor

    if (!nom || !prenom || !email || !motDePasse || !cin || !specialite) {
      setError("Veuillez remplir tous les champs")
      return
    }

    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await axios.post("/api/doctors", {
        firstName: prenom,
        lastName: nom,
        email,
        password: motDePasse,
        cin,
        specialty: specialite,
      })

      if (response.data.doctor) {
        setDoctors([response.data.doctor, ...doctors])
        setMessage("Médecin ajouté avec succès")
        setNewDoctor({
          nom: "",
          prenom: "",
          email: "",
          motDePasse: "",
          cin: "",
          specialite: "",
        })
      } else {
        setError("Erreur: Réponse du serveur incomplète")
      }
    } catch (err) {
      console.error("Erreur ajout médecin:", err)
      setError(err.response?.data?.error || "Erreur lors de l'ajout du médecin")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (doctor) => {
    setEditingDoctor(doctor.id)
    setEditDoctor({
      nom: doctor.nom,
      prenom: doctor.prenom,
      email: doctor.email,
      cin: doctor.cin,
      specialite: doctor.specialty,
    })
    setActiveTab("edit")
  }

  const updateDoctor = async () => {
    const { nom, prenom, email, cin, specialite } = editDoctor

    if (!nom || !prenom || !email || !cin || !specialite) {
      setError("Veuillez remplir tous les champs")
      return
    }

    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await axios.put(`/api/doctors/${editingDoctor}`, {
        firstName: prenom,
        lastName: nom,
        email,
        cin,
        specialty: specialite,
      })

      if (response.data.doctor) {
        setDoctors(doctors.map((doc) => (doc.id === editingDoctor ? response.data.doctor : doc)))
        setMessage("Médecin modifié avec succès")
        setEditingDoctor(null)
        setEditDoctor({
          nom: "",
          prenom: "",
          email: "",
          cin: "",
          specialite: "",
        })
        setActiveTab("list")
      } else {
        setError("Erreur: Réponse du serveur incomplète")
      }
    } catch (err) {
      console.error("Erreur modification médecin:", err)
      setError(err.response?.data?.error || "Erreur lors de la modification du médecin")
    } finally {
      setIsLoading(false)
    }
  }

  const cancelEdit = () => {
    setEditingDoctor(null)
    setEditDoctor({
      nom: "",
      prenom: "",
      email: "",
      cin: "",
      specialite: "",
    })
    setActiveTab("list")
  }

  const handleDeleteClick = (id) => {
    setDoctorToDelete(id)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/doctors/${doctorToDelete}`)
      setDoctors(doctors.filter((doc) => doc.id !== doctorToDelete))
      setMessage("Médecin supprimé avec succès")
      setError("")
      setDialogOpen(false)
      setDoctorToDelete(null)
    } catch (err) {
      console.error("Erreur suppression médecin:", err)
      setError("Erreur lors de la suppression du médecin")
    }
  }

  const toggleActive = async (id, currentStatus) => {
    try {
      const response = await axios.put(`/api/doctors/${id}/status`, {
        active: !currentStatus,
      })

      if (response.data.doctor) {
        setDoctors(doctors.map((doc) => (doc.id === id ? response.data.doctor : doc)))
        setMessage(`Statut du médecin ${!currentStatus ? "activé" : "désactivé"}`)
        setError("")
      }
    } catch (err) {
      console.error("Erreur changement statut médecin:", err)
      setError("Erreur lors du changement de statut")
    }
  }

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.cin.includes(searchTerm),
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold">Gestion des Médecins</h1>
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
                  <p className="text-2xl font-bold">{doctors.filter((d) => d.is_active).length}</p>
                  <p className="text-blue-100 text-sm">Médecins Actifs</p>
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold">{doctors.length}</p>
                  <p className="text-blue-100 text-sm">Total Médecins</p>
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
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredDoctors.length}</p>
                  <p className="text-blue-100 text-sm">Résultats Recherche</p>
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
              Liste des médecins
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
              Ajouter un médecin
            </button>

            {editingDoctor && (
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
                Modifier le médecin
              </button>
            )}
          </div>
        </div>

        {activeTab === "add" && (
          <Card className="mb-8 shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Ajouter un nouveau médecin</h2>
                  <p className="text-gray-600">Remplissez les informations du médecin</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Nom
                  </label>
                  <Input
                    placeholder="Nom du médecin"
                    value={newDoctor.nom}
                    onChange={(e) => setNewDoctor({ ...newDoctor, nom: e.target.value })}
                    className="border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Prénom
                  </label>
                  <Input
                    placeholder="Prénom du médecin"
                    value={newDoctor.prenom}
                    onChange={(e) => setNewDoctor({ ...newDoctor, prenom: e.target.value })}
                    className="border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </label>
                  <Input
                    placeholder="Email professionnel"
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Mot de passe
                  </label>
                  <Input
                    placeholder="Mot de passe sécurisé"
                    type="password"
                    value={newDoctor.motDePasse}
                    onChange={(e) => setNewDoctor({ ...newDoctor, motDePasse: e.target.value })}
                    className="border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      />
                    </svg>
                    CIN
                  </label>
                  <Input
                    placeholder="Numéro CIN"
                    value={newDoctor.cin}
                    onChange={(e) => setNewDoctor({ ...newDoctor, cin: e.target.value })}
                    className="border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                    Spécialité
                  </label>
                  <Input
                    placeholder="Spécialité médicale"
                    value={newDoctor.specialite}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialite: e.target.value })}
                    className="border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={addDoctor}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#1D10FA] to-purple-600 hover:from-purple-600 hover:to-[#1D10FA] text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                >
                  {isLoading ? (
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
                      Ajout en cours...
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
                      Ajouter le médecin
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "edit" && editingDoctor && (
          <Card className="mb-8 shadow-xl border-0 bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-8">
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
                  <h2 className="text-2xl font-bold text-gray-800">Modifier le médecin</h2>
                  <p className="text-gray-600">Modifiez les informations du médecin</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Nom
                  </label>
                  <Input
                    placeholder="Nom du médecin"
                    value={editDoctor.nom}
                    onChange={(e) => setEditDoctor({ ...editDoctor, nom: e.target.value })}
                    className="border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Prénom
                  </label>
                  <Input
                    placeholder="Prénom du médecin"
                    value={editDoctor.prenom}
                    onChange={(e) => setEditDoctor({ ...editDoctor, prenom: e.target.value })}
                    className="border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </label>
                  <Input
                    placeholder="Email professionnel"
                    type="email"
                    value={editDoctor.email}
                    onChange={(e) => setEditDoctor({ ...editDoctor, email: e.target.value })}
                    className="border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      />
                    </svg>
                    CIN
                  </label>
                  <Input
                    placeholder="Numéro CIN"
                    value={editDoctor.cin}
                    onChange={(e) => setEditDoctor({ ...editDoctor, cin: e.target.value })}
                    className="border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                    Spécialité
                  </label>
                  <Input
                    placeholder="Spécialité médicale"
                    value={editDoctor.specialite}
                    onChange={(e) => setEditDoctor({ ...editDoctor, specialite: e.target.value })}
                    className="border-2 border-gray-200 focus:border-orange-500 transition-colors duration-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <Button
                  onClick={cancelEdit}
                  className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler
                </Button>
                <Button
                  onClick={updateDoctor}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-red-600 hover:to-orange-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                >
                  {isLoading ? (
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
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "list" && (
          <>
            {/* Beautiful Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Rechercher un médecin..."
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

            {/* Beautiful Doctors Grid */}
            {filteredDoctors.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun médecin trouvé</h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? "Essayez avec d'autres termes de recherche"
                    : "Commencez par ajouter votre premier médecin à l'équipe"}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredDoctors.map((doc, index) => (
                  <Card
                    key={doc.id}
                    className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm overflow-hidden"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="p-0">
                      {/* Card Header with Gradient */}
                      <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 p-6 text-white">
                        <div className="flex items-center gap-4">
                          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold">
                              {doc.nom} {doc.prenom}
                            </h2>
                            <p className="text-blue-100 text-sm">{doc.specialty}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6">
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-3 text-gray-600">
                            <svg
                              className="w-4 h-4 text-[#1D10FA]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-sm">{doc.email}</span>
                          </div>

                          <div className="flex items-center gap-3 text-gray-600">
                            <svg
                              className="w-4 h-4 text-[#1D10FA]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                              />
                            </svg>
                            <span className="text-sm">{doc.cin}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                doc.is_active
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${doc.is_active ? "bg-green-400" : "bg-red-400"}`}
                              ></div>
                              {doc.is_active ? "Actif" : "Désactivé"}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => toggleActive(doc.id, doc.is_active)}
                            className={`flex-1 text-sm font-medium rounded-lg transition-all duration-200 ${
                              doc.is_active
                                ? "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
                                : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                            }`}
                          >
                            {doc.is_active ? "Désactiver" : "Activer"}
                          </Button>

                          <Button
                            variant="secondary"
                            onClick={() => handleEditClick(doc)}
                            className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 text-sm font-medium rounded-lg transition-all duration-200"
                          >
                            Modifier
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteClick(doc.id)}
                            className="flex-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-medium rounded-lg transition-all duration-200"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={confirmDelete}
        message="Êtes-vous sûr de vouloir supprimer ce médecin ?"
      />

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


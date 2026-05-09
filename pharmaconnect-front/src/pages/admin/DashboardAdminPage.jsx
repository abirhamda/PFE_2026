"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Users, Store, Activity, TrendingUp, TrendingDown, UserCheck, AlertCircle } from 'lucide-react'

const StatCard = ({ title, value, change, changeType, icon, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <div
              className={`flex items-center mt-2 text-sm ${
                changeType === "increase" ? "text-green-600" : "text-red-600"
              }`}
            >
              {changeType === "increase" ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={`bg-gradient-to-r ${colorClasses[color]} p-4 rounded-xl`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </div>
  )
}

const ActivityItem = ({ icon, title, description, time, type = "info" }) => {
  const typeColors = {
    info: "bg-blue-100 text-blue-600",
    success: "bg-green-100 text-green-600",
    warning: "bg-orange-100 text-orange-600",
    error: "bg-red-100 text-red-600",
  }

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200">
      <div className={`p-2 rounded-lg ${typeColors[type]}`}>{icon}</div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-gray-600 text-sm">{description}</p>
        <p className="text-gray-400 text-xs mt-1">{time}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    doctors: { total: 0, active: 0, inactive: 0 },
    pharmacies: { total: 0, active: 0, inactive: 0 },
  })

  const [recentData, setRecentData] = useState({
    doctors: [],
    pharmacies: [],
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Fonction pour récupérer les données réelles
  const fetchRealData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token") || sessionStorage.getItem("token")

      if (!token) {
        setError("Token d'authentification manquant")
        return
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      // Récupérer les médecins
      console.log("🔍 Récupération des médecins...")
      const doctorsResponse = await axios.get("/api/doctors", { headers })
      const doctors = Array.isArray(doctorsResponse.data.doctors)
        ? doctorsResponse.data.doctors
        : Array.isArray(doctorsResponse.data)
          ? doctorsResponse.data
          : []

      // Récupérer les pharmacies
      console.log("🔍 Récupération des pharmacies...")
      const pharmaciesResponse = await axios.get("/api/admin/pharmacies", { headers })
      const pharmacies = Array.isArray(pharmaciesResponse.data) ? pharmaciesResponse.data : []

      console.log("✅ Données récupérées:", { doctors: doctors.length, pharmacies: pharmacies.length })

      // Calculer les statistiques des médecins
      const doctorsActive = doctors.filter((doctor) => doctor.is_active === 1 || doctor.is_active === true).length
      const doctorsInactive = doctors.length - doctorsActive

      // Calculer les statistiques des pharmacies
      const pharmaciesActive = pharmacies.filter(
        (pharmacy) => pharmacy.is_active === 1 || pharmacy.is_active === true,
      ).length
      const pharmaciesInactive = pharmacies.length - pharmaciesActive

      // Mettre à jour les stats
      setStats({
        doctors: {
          total: doctors.length,
          active: doctorsActive,
          inactive: doctorsInactive,
        },
        pharmacies: {
          total: pharmacies.length,
          active: pharmaciesActive,
          inactive: pharmaciesInactive,
        },
      })

      // Garder les données récentes pour les activités
      setRecentData({
        doctors: doctors.slice(0, 5), // Les 5 derniers médecins
        pharmacies: pharmacies.slice(0, 5), // Les 5 dernières pharmacies
      })

      setError("")
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des données:", error)
      setError("Erreur lors du chargement des données")
      // Données par défaut en cas d'erreur
      setStats({
        doctors: { total: 0, active: 0, inactive: 0 },
        pharmacies: { total: 0, active: 0, inactive: 0 },
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRealData()
    // Actualiser les données toutes les 5 minutes
    const interval = setInterval(fetchRealData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Générer les activités récentes basées sur les vraies données
  const generateRecentActivities = () => {
    const activities = []

    // Ajouter les médecins récents
    recentData.doctors.slice(0, 2).forEach((doctor, index) => {
      activities.push({
        icon: <UserCheck className="w-4 h-4" />,
        title: "Médecin ajouté",
        description: `Dr. ${doctor.prenom} ${doctor.nom} - ${doctor.specialty}`,
        time: `Ajouté récemment`,
        type: "success",
      })
    })

    // Ajouter les pharmacies récentes
    recentData.pharmacies.slice(0, 2).forEach((pharmacy, index) => {
      activities.push({
        icon: <Store className="w-4 h-4" />,
        title: "Pharmacie ajoutée",
        description: `${pharmacy.nom_pharmacie} - ${pharmacy.president_pharmacie}`,
        time: `Ajoutée récemment`,
        type: "info",
      })
    })

    return activities.slice(0, 4) // Limiter à 4 activités
  }

  const recentActivities = generateRecentActivities()

  // Calculer le taux d'activité global
  const totalEntities = stats.doctors.total + stats.pharmacies.total
  const totalActive = stats.doctors.active + stats.pharmacies.active
  const activityRate = totalEntities > 0 ? ((totalActive / totalEntities) * 100).toFixed(1) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Chargement des données réelles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Beautiful Header Section */}
      <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white py-8 px-6 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Tableau de Bord</h1>
              <p className="text-blue-100 text-lg">Vue d'ensemble de votre système de gestion</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-300 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-300" />
                <p className="text-red-100">{error}</p>
              </div>
            </div>
          )}

          {/* Quick Stats in Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-green-400 p-2 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalActive}</p>
                  <p className="text-blue-100 text-sm">Entités Actives</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-blue-400 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEntities}</p>
                  <p className="text-blue-100 text-sm">Total Entités</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-purple-400 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activityRate}%</p>
                  <p className="text-blue-100 text-sm">Taux d'Activité</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={fetchRealData}
            disabled={loading}
            className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
          >
            <Activity className="w-4 h-4" />
            {loading ? "Actualisation..." : "Actualiser"}
          </button>
        </div>

        {/* Main Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Médecins"
            value={stats.doctors.total}
            change={stats.doctors.total > 0 ? "Données réelles" : "Aucune donnée"}
            changeType="increase"
            icon={<Users className="w-6 h-6" />}
            color="blue"
          />

          <StatCard
            title="Médecins Actifs"
            value={stats.doctors.active}
            change={`${stats.doctors.inactive} inactifs`}
            changeType={stats.doctors.active > stats.doctors.inactive ? "increase" : "decrease"}
            icon={<UserCheck className="w-6 h-6" />}
            color="green"
          />

          <StatCard
            title="Pharmacies"
            value={stats.pharmacies.total}
            change={stats.pharmacies.total > 0 ? "Données réelles" : "Aucune donnée"}
            changeType="increase"
            icon={<Store className="w-6 h-6" />}
            color="purple"
          />
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Répartition par Catégorie</h3>
            <div className="space-y-6">
              {/* Doctors Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">Médecins</span>
                  <span className="text-gray-600">
                    {stats.doctors.active}/{stats.doctors.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: stats.doctors.total > 0 ? `${(stats.doctors.active / stats.doctors.total) * 100}%` : "0%",
                    }}
                  ></div>
                </div>
              </div>

              {/* Pharmacies Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">Pharmacies</span>
                  <span className="text-gray-600">
                    {stats.pharmacies.active}/{stats.pharmacies.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{
                      width:
                        stats.pharmacies.total > 0
                          ? `${(stats.pharmacies.active / stats.pharmacies.total) * 100}%`
                          : "0%",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Actions Rapides</h3>
            <div className="space-y-3">
              <button
                onClick={() => (window.location.href = "/admin/doctors")}
                className="w-full bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white p-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Gérer les médecins
              </button>

              <button
                onClick={() => (window.location.href = "/admin/pharmacies")}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white p-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <Store className="w-4 h-4" />
                Gérer les pharmacies
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Activité Récente</h3>
            <button className="text-[#1D10FA] hover:text-purple-600 font-medium text-sm">Voir tout</button>
          </div>

          <div className="space-y-2">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => <ActivityItem key={index} {...activity} />)
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune activité récente</p>
                <p className="text-sm">Les nouvelles activités apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

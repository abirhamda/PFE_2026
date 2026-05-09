import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

import LoginPage from './pages/auth/LoginPage';

import DashboardPage from './pages/pharmacist/DashboardPage';
import OrdonnancesPage from './pages/pharmacist/OrdonnancesPage';
import PharmacistSupplierPage from './pages/pharmacist/PharmacistSupplierPage';

import PharmacyManagementPage from './pages/admin/PharmacyManagementPage';
import DashboardAdminPage from './pages/admin/DashboardAdminPage';
import DocteurPage from './pages/admin/DocteurPage';

import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage';
import DoctorsOrdonnancesPage from './pages/doctor/DoctorsOrdonnancesPage';
import DoctorRendezvousPage from './pages/doctor/DoctorRendezvousPage';
import DoctorSecretariesPage from './pages/doctor/DoctorSecretariesPage';
import DoctorPatientsPage from './pages/doctor/DoctorPatientsPage';

import SecretaryRendezvousPage from './pages/secretaire/SecretaryRendezvousPage';
import SecretaryPatientsPage from './pages/secretaire/SecretaryPatientsPage';
import SecretaryOrdonnancesPage from './pages/secretaire/SecretaryOrdonnancesPage';

import PharmaciesListPage from './pages/supplier/PharmaciesListPage';
import NotificationsPage from './pages/supplier/NotificationsPage';

import PatientDashboardPage from './pages/pation/DashboardPage';
import DiscoverDoctorsPage from './pages/pation/DiscoverDoctorsPage';
import PatientAppointmentsPage from './pages/pation/MyAppointmentsPage';
import PatientOrdonnancesPage from './pages/pation/OrdonnancesPage';
import PatientDocumentsPage from './pages/pation/DocumentsPage';

import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

import AdminLayout from './components/layout/AdminLayout';
import PharmacistLayout from './components/layout/PharmacistLayout';
import SupplierLayout from './components/layout/SupplierLayout';
import DoctorLayout from './components/layout/DoctorLayout';
import MainLayout from './components/layout/MainLayout';
import SecretaryLayout from './components/layout/SecretaryLayout';
import PationLayout from './components/layout/PationLayout';

import ProtectedRoute from './components/auth/ProtectedRoute';

const RoleBasedRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'pharmacist':
      return <Navigate to="/pharmacy/dashboard" replace />;
    case 'doctor':
      return <Navigate to="/docteur" replace />;
    case 'secretaire':
      return <Navigate to="/secretaire/rendezvous" replace />;
    case 'supplier':
      return <Navigate to="/supplier" replace />;
    case 'pation':
      return <Navigate to="/patient" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/doctors" element={<DiscoverDoctorsPage publicMode />} />
          <Route path="/" element={<RoleBasedRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<DashboardAdminPage />} />
              <Route path="/pharmacies" element={<PharmacyManagementPage />} />
              <Route path="/admin/pharmacies" element={<PharmacyManagementPage />} />
              <Route path="/admin/doctors" element={<DocteurPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['pharmacist']} />}>
            <Route element={<PharmacistLayout />}>
              <Route path="/pharmacy/dashboard" element={<DashboardPage />} />
              <Route path="/pharmacy/ordonnances" element={<OrdonnancesPage />} />
              <Route path="/pharmacy/supplier" element={<PharmacistSupplierPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['supplier']} />}>
            <Route element={<SupplierLayout />}>
              <Route path="/supplier" element={<PharmaciesListPage />} />
              <Route path="/supplier/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route element={<DoctorLayout />}>
              <Route path="/docteur" element={<DoctorDashboardPage />} />
              <Route path="/docteur/ordonnances" element={<DoctorsOrdonnancesPage />} />
              <Route path="/docteur/rendezvous" element={<DoctorRendezvousPage />} />
              <Route path="/docteur/patients" element={<DoctorPatientsPage />} />
              <Route path="/docteur/secretaires" element={<DoctorSecretariesPage />} />
              <Route path="/docteur/profile" element={<ProfilePage />} />
              <Route path="/docteur/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['secretaire']} />}>
            <Route element={<SecretaryLayout />}>
              <Route path="/secretaire" element={<Navigate to="/secretaire/rendezvous" replace />} />
              <Route path="/secretaire/rendezvous" element={<SecretaryRendezvousPage />} />
              <Route path="/secretaire/patients" element={<SecretaryPatientsPage />} />
              <Route path="/secretaire/ordonnances" element={<SecretaryOrdonnancesPage />} />
              <Route path="/secretaire/profile" element={<ProfilePage />} />
              <Route path="/secretaire/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['pation']} />}>
            <Route element={<PationLayout />}>
              <Route path="/patient" element={<PatientDashboardPage />} />
              <Route path="/patient/discover" element={<DiscoverDoctorsPage />} />
              <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
              <Route path="/patient/ordonnances" element={<PatientOrdonnancesPage />} />
              <Route path="/patient/documents" element={<PatientDocumentsPage />} />
              <Route path="/patient/profile" element={<ProfilePage />} />
              <Route path="/patient/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'pharmacist', 'doctor', 'supplier', 'secretaire', 'pation']} />}>
            <Route element={<MainLayout />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

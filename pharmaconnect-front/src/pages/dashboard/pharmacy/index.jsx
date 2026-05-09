import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { PackageCheck, AlertCircle, Search } from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';

const PharmacyDashboard = () => {
  return (
    <ProtectedRoute allowedRoles={['pharmacist', 'pharmacy']}>
      <MainLayout>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Bienvenue sur le tableau de bord Pharmacien</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-red-500 border-l-4">
              <CardContent className="flex items-center gap-4 py-6">
                <AlertCircle className="text-red-500" size={32} />
                <div>
                  <h2 className="font-semibold">Médicaments expirants</h2>
                  <p className="text-sm text-gray-500">3 produits doivent être vérifiés</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500 border-l-4">
              <CardContent className="flex items-center gap-4 py-6">
                <PackageCheck className="text-yellow-500" size={32} />
                <div>
                  <h2 className="font-semibold">Ruptures potentielles</h2>
                  <p className="text-sm text-gray-500">2 médicaments à surveiller</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500 border-l-4">
              <CardContent className="flex items-center gap-4 py-6">
                <Search className="text-blue-500" size={32} />
                <div>
                  <h2 className="font-semibold">Recherche rapide</h2>
                  <Button className="mt-2">Accéder</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default PharmacyDashboard;
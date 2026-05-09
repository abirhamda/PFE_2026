// components/pharmacy/PharmacyDashboard.jsx
import React from 'react';

export default function PharmacyDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bienvenue sur le Dashboard Pharmacie</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow-md rounded-xl p-4 border-l-4 border-green-500">
          <h2 className="text-lg font-semibold">Stock actuel</h2>
          <p className="text-gray-600">125 médicaments</p>
        </div>

        <div className="bg-white shadow-md rounded-xl p-4 border-l-4 border-yellow-500">
          <h2 className="text-lg font-semibold">Alertes de péremption</h2>
          <p className="text-gray-600">3 médicaments expirent bientôt</p>
        </div>

        <div className="bg-white shadow-md rounded-xl p-4 border-l-4 border-red-500">
          <h2 className="text-lg font-semibold">Ruptures de stock</h2>
          <p className="text-gray-600">2 médicaments en rupture</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Dernières ordonnances</h2>
        <ul className="bg-white p-4 rounded-xl shadow-md">
          <li className="border-b py-2">Ordonnance #1325 - Patient: Ali M.</li>
          <li className="border-b py-2">Ordonnance #1324 - Patient: Salma T.</li>
          <li className="py-2">Ordonnance #1323 - Patient: Anis R.</li>
        </ul>
      </div>
    </div>
  );
}

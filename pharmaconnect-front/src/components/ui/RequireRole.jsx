import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";


const RequireRole = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // Si l'utilisateur n'est pas connecté
  if (!user) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Si l'utilisateur n'a pas un des rôles autorisés
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // Sinon, accès autorisé
  return children;
};

export default RequireRole;

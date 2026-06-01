import React from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";
import { useAuth } from "../../hooks/useAuth";
import { getLoginSpaceBySlug } from "../../lib/loginSpaces";

const LoginPage = () => {
  const { roleSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const loginSpace = getLoginSpaceBySlug(roleSlug);

  const requestedMode = searchParams.get("mode");
  const defaultMode =
    requestedMode === "register" && loginSpace.allowRegister
      ? "register"
      : requestedMode === "forgot"
        ? "forgot"
        : "login";

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/redirect" replace />;
  }

  return <LoginForm space={loginSpace} defaultMode={defaultMode} />;
};

export default LoginPage;

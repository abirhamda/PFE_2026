import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext();

const STORAGE_USER_KEY = 'medicare_auth_user';
const STORAGE_MODE_KEY = 'medicare_auth_mode';
const LEGACY_STORAGE_USER_KEY = 'pharmaconnect_auth_user';
const LEGACY_STORAGE_MODE_KEY = 'pharmaconnect_auth_mode';
const ALLOWED_ROLES = new Set(['admin', 'pharmacist', 'doctor', 'supplier', 'secretaire', 'pation']);

const normalizeBase64Url = (value) => {
  const padding = value.length % 4;
  const padded = value + (padding ? '='.repeat(4 - padding) : '');
  return padded.replace(/-/g, '+').replace(/_/g, '/');
};

const decodeJwtPayload = (token) => {
  try {
    const payloadPart = String(token || '').split('.')[1];
    if (!payloadPart) {
      return null;
    }
    return JSON.parse(atob(normalizeBase64Url(payloadPart)));
  } catch (_error) {
    return null;
  }
};

const isTokenStillValid = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }
  return Date.now() < payload.exp * 1000;
};

const normalizeUser = (candidate) => {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const id = Number(candidate.id ?? candidate.userId);
  const userId = Number(candidate.userId ?? candidate.id);
  const role = String(candidate.role || '').toLowerCase();
  const token = String(candidate.token || '');

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  if (!Number.isFinite(userId) || userId <= 0) {
    return null;
  }
  if (!ALLOWED_ROLES.has(role)) {
    return null;
  }
  if (!token || !isTokenStillValid(token)) {
    return null;
  }

  return {
    ...candidate,
    id,
    userId,
    role,
    token,
  };
};

const readUser = (storage, mode) => {
  try {
    const savedMode = storage.getItem(STORAGE_MODE_KEY) || storage.getItem(LEGACY_STORAGE_MODE_KEY);
    if (savedMode !== mode) {
      return null;
    }

    const persisted = storage.getItem(STORAGE_USER_KEY) || storage.getItem(LEGACY_STORAGE_USER_KEY);
    if (!persisted) {
      return null;
    }

    const parsed = JSON.parse(persisted);
    return normalizeUser(parsed);
  } catch (_error) {
    return null;
  }
};

const clearStorage = (storage) => {
  storage.removeItem(STORAGE_USER_KEY);
  storage.removeItem(STORAGE_MODE_KEY);
  storage.removeItem(LEGACY_STORAGE_USER_KEY);
  storage.removeItem(LEGACY_STORAGE_MODE_KEY);
  storage.removeItem('role');
  storage.removeItem('token');
  storage.removeItem('userId');
  storage.removeItem('entityId');
  storage.removeItem('email');
  storage.removeItem('name');
  storage.removeItem('nom');
  storage.removeItem('prenom');
};

const persistUser = (storage, user, mode) => {
  if (!user) {
    clearStorage(storage);
    return;
  }

  storage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  storage.setItem(STORAGE_MODE_KEY, mode);
  storage.setItem('role', user.role || '');
  storage.setItem('token', user.token || '');
  storage.setItem('userId', String(user.userId || user.id || ''));
  storage.setItem('entityId', String(user.id || ''));
  storage.setItem('email', user.email || '');
  storage.setItem('name', user.name || '');
  storage.setItem('nom', user.nom || '');
  storage.setItem('prenom', user.prenom || '');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = readUser(sessionStorage, 'session') || readUser(localStorage, 'local');
    if (storedUser) {
      setUser(storedUser);
    } else {
      clearStorage(localStorage);
      clearStorage(sessionStorage);
    }
    setIsLoading(false);
  }, []);

  const login = (authUser, options = { rememberMe: false }) => {
    const normalizedUser = normalizeUser({
      ...authUser,
      token: authUser?.token || authUser?.accessToken,
    });

    if (!normalizedUser) {
      throw new Error('Auth payload is invalid or expired');
    }

    const useSession = options?.rememberMe === false;
    const targetStorage = useSession ? sessionStorage : localStorage;
    const alternateStorage = useSession ? localStorage : sessionStorage;
    const targetMode = useSession ? 'session' : 'local';

    clearStorage(alternateStorage);
    persistUser(targetStorage, normalizedUser, targetMode);
    setUser(normalizedUser);
  };

  const logout = () => {
    setUser(null);
    clearStorage(localStorage);
    clearStorage(sessionStorage);
  };

  const updateProfile = async (partialData) => {
    const updatedUser = {
      ...user,
      ...partialData,
    };

    setUser(updatedUser);

    const usesLocalStorage =
      localStorage.getItem(STORAGE_MODE_KEY) === 'local' || localStorage.getItem(LEGACY_STORAGE_MODE_KEY) === 'local';
    const targetStorage = usesLocalStorage ? localStorage : sessionStorage;
    const mode = usesLocalStorage ? 'local' : 'session';
    persistUser(targetStorage, updatedUser, mode);

    return updatedUser;
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      isAuthenticated: Boolean(user?.token),
      isLoading,
      login,
      logout,
      updateProfile,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

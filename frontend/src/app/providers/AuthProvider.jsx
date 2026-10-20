import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { authApi } from "../../services/api/authApi";
import { tokenStorage } from "../../services/storage/tokenStorage";
import { pendingRegistration, PARTNER_ROLES } from '../../services/storage/pendingRegistration';

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.getToken());
  const [currentUser, setCurrentUser] = useState(() => tokenStorage.getUser());
  const [loading, setLoading] = useState(() =>
    Boolean(tokenStorage.getToken() && !tokenStorage.getUser()),
  );

  // Refetch on load so permission changes made by an admin reach cached sessions.
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    authApi
      .getMe()
      .then((response) => {
        if (cancelled) return;
        setCurrentUser(response.data);
        tokenStorage.setUser(response.data);
      })
      .catch((error) => {
        if (cancelled) return;
        const rejected = error.status === 401 || error.status === 403;
        if (rejected || !tokenStorage.getUser()) {
          tokenStorage.clear();
          setToken(null);
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const persistAuth = useCallback((response) => {
    pendingRegistration.clear();
    if (response.token) {
      tokenStorage.setToken(response.token);
      setToken(response.token);
    }
    if (response.user) {
      tokenStorage.setUser(response.user);
      setCurrentUser(response.user);
    }
    return response.user;
  }, []);

  const confirmPartnerRegistration = useCallback(response => {
    if (response.user?.status !== 'PENDING' || response.user?.approvalStatus !== 'PENDING' || !PARTNER_ROLES.includes(response.user?.role) || response.registration?.role !== response.user.role) throw new Error('Máy chủ chưa xác nhận tài khoản chờ xét duyệt. Vui lòng thử lại.');
    const registration = pendingRegistration.save(response.registration);
    tokenStorage.clear(); setToken(null); setCurrentUser(null);
    return { ...response.user, registration };
  }, []);

  const login = useCallback(
    async (payload) => {
      const response = await authApi.login(payload);
      return persistAuth(response);
    },
    [persistAuth],
  );

  const register = useCallback(async (payload) => {
    const response = await authApi.register(payload);
    if (response.registration?.status === 'DRAFT') { pendingRegistration.clear(); return response; }
    if (PARTNER_ROLES.includes(payload.role_name)) return confirmPartnerRegistration(response);
    if (response.verificationRequired) return response;
    return persistAuth(response);
  }, [persistAuth, confirmPartnerRegistration]);

  const updateCurrentUser = useCallback((updates) => {
    setCurrentUser((user) => {
      const updatedUser = { ...user, ...updates };
      tokenStorage.setUser(updatedUser);
      return updatedUser;
    });
  }, []);

  const becomePartner = useCallback(async (payload) => {
    const response = await authApi.becomePartner(payload);
    if (response.registration?.status === 'DRAFT') { pendingRegistration.clear(); return response; }
    return confirmPartnerRegistration(response);
  }, [confirmPartnerRegistration]);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      currentUser,
      loading,
      isAuthenticated: Boolean(token && currentUser),
      login,
      register,
      becomePartner,
      updateCurrentUser,
      logout,
    }),
    [
      token,
      currentUser,
      loading,
      login,
      register,
      becomePartner,
      updateCurrentUser,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

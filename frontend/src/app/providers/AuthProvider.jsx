import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { authApi } from "../../services/api/authApi";
import { tokenStorage } from "../../services/storage/tokenStorage";

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.getToken());
  const [currentUser, setCurrentUser] = useState(() => tokenStorage.getUser());
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.getToken() && !tokenStorage.getUser()));

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      if (!token || currentUser) return;
      try {
        setLoading(true);
        const response = await authApi.getMe();
        const user = response.data;
        if (!cancelled) {
          setCurrentUser(user);
          tokenStorage.setUser(user);
        }
      } catch {
        tokenStorage.clear();
        if (!cancelled) {
          setToken(null);
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [token, currentUser]);

  const persistAuth = useCallback((response) => {
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

  const login = useCallback(async (payload) => {
    const response = await authApi.login(payload);
    return persistAuth(response);
  }, [persistAuth]);

  const register = useCallback(async (payload) => {
    const response = await authApi.register(payload);
    return persistAuth(response);
  }, [persistAuth]);

  const becomePartner = useCallback(async (payload) => {
    const response = await authApi.becomePartner(payload);
    return persistAuth(response);
  }, [persistAuth]);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setCurrentUser(null);
  }, []);

  const value = useMemo(() => ({
    token,
    currentUser,
    loading,
    isAuthenticated: Boolean(token && currentUser),
    login,
    register,
    becomePartner,
    logout
  }), [token, currentUser, loading, login, register, becomePartner, logout]);


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

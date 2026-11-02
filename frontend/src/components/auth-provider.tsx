"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearToken, getToken, setToken, type User } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  unreadNotifications: number;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmation: string,
  ) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshUnreadNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshUnreadNotifications = useCallback(async () => {
    try {
      const response = await api.notifications({ unread: true });
      setUnreadNotifications(response.meta?.unread_count ?? 0);
    } catch {
      // The inbox badge is best-effort and must not block the rest of the app.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!getToken()) {
        setReady(true);
        return;
      }

      try {
        const response = await api.me();
        if (!cancelled) {
          setUser(response.data);
          await refreshUnreadNotifications();
        }
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [refreshUnreadNotifications]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.data.token);
    setUser(response.data.user);
    void refreshUnreadNotifications();
    return response.data.user;
  }, [refreshUnreadNotifications]);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      confirmation: string,
    ) => {
      const response = await api.register(name, email, password, confirmation);
      setToken(response.data.token);
      setUser(response.data.user);
      void refreshUnreadNotifications();
      return response.data.user;
    },
    [refreshUnreadNotifications],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Token may already be invalid; clearing locally is enough.
    }
    clearToken();
    setUser(null);
    setUnreadNotifications(0);
  }, []);

  const refresh = useCallback(async () => {
    const response = await api.me();
    setUser(response.data);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      unreadNotifications,
      login,
      register,
      logout,
      refresh,
      refreshUnreadNotifications,
    }),
    [
      user,
      ready,
      unreadNotifications,
      login,
      register,
      logout,
      refresh,
      refreshUnreadNotifications,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }

  return context;
}

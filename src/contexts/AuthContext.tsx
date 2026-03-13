import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole = "admin" | "gestor" | "vendedor" | "operacional" | "financeiro" | "leitura";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const DEFAULT_ROLE: UserRole = "vendedor";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>(DEFAULT_ROLE);
  const [isLoading, setIsLoading] = useState(true);

  // Cache auth data to avoid re-fetching on every navigation
  const cachedUserIdRef = useRef<string | null>(null);

  const loadUserContext = useCallback(async (userId: string | null, forceRefresh = false) => {
    if (!userId) {
      setProfile(null);
      setRole(DEFAULT_ROLE);
      cachedUserIdRef.current = null;
      return;
    }

    // Skip re-fetch if already loaded for this user
    if (!forceRefresh && cachedUserIdRef.current === userId && profile) {
      return;
    }

    try {
      const ROLE_PRIORITY: Record<string, number> = {
        admin: 0, gestor: 1, financeiro: 2, operacional: 3, vendedor: 4, leitura: 5,
      };

      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId),
      ]);

      if (profileRes.error) console.error("Profile fetch error:", profileRes.error);
      if (rolesRes.error) console.error("Role fetch error:", rolesRes.error);

      setProfile((profileRes.data as Profile | null) ?? null);

      // Pick the highest-priority role when user has multiple
      const roles = (rolesRes.data ?? []) as { role: string }[];
      const bestRole = roles
        .sort((a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99))[0]?.role;
      setRole((bestRole as UserRole) ?? DEFAULT_ROLE);
      cachedUserIdRef.current = userId;
    } catch (error) {
      console.error("Auth context load error:", error);
      setProfile(null);
      setRole(DEFAULT_ROLE);
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;
    const AUTH_BOOT_TIMEOUT_MS = 6000;

    const applySession = (session: Session | null) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (currentUser) {
        void loadUserContext(currentUser.id);
      } else {
        setProfile(null);
        setRole(DEFAULT_ROLE);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    const bootTimeout = window.setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, AUTH_BOOT_TIMEOUT_MS);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        applySession(session ?? null);
      })
      .catch((error) => {
        console.error("Auth session bootstrap error:", error);
        if (isMounted) setIsLoading(false);
      })
      .finally(() => {
        window.clearTimeout(bootTimeout);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(bootTimeout);
      subscription.unsubscribe();
    };
  }, [loadUserContext]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, role, isAuthenticated: !!user, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
}


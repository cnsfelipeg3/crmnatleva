import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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

  const loadUserContext = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      setRole(DEFAULT_ROLE);
      return;
    }

    const [profileRes, roleRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (profileRes.error) console.error("Profile fetch error:", profileRes.error);
    if (roleRes.error) console.error("Role fetch error:", roleRes.error);

    setProfile((profileRes.data as Profile | null) ?? null);
    setRole((roleRes.data?.role as UserRole) ?? DEFAULT_ROLE);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async (session: Session | null) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      try {
        await loadUserContext(currentUser?.id ?? null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateSession(session);
    });

    void (async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      await hydrateSession(session ?? null);
    })();

    return () => {
      isMounted = false;
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


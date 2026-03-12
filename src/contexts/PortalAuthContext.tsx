import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface PortalAccess {
  id: string;
  client_id: string;
  must_change_password: boolean;
  first_login_at: string | null;
}

interface PortalAuthContextType {
  user: User | null;
  portalAccess: PortalAccess | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  markPasswordChanged: () => void;
}

const PortalAuthContext = createContext<PortalAuthContextType | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPortalAccess = async (userId: string) => {
    const { data } = await supabase
      .from("portal_access")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();
    if (data) {
      setPortalAccess(data as unknown as PortalAccess);
      if (!data.first_login_at) {
        await supabase
          .from("portal_access")
          .update({ first_login_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await fetchPortalAccess(u.id);
      } else {
        setPortalAccess(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPortalAccess(null);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error && portalAccess) {
      await supabase
        .from("portal_access")
        .update({ must_change_password: false })
        .eq("id", portalAccess.id);
      setPortalAccess({ ...portalAccess, must_change_password: false });
    }
    return { error: error?.message || null };
  };

  const markPasswordChanged = () => {
    if (portalAccess) setPortalAccess({ ...portalAccess, must_change_password: false });
  };

  return (
    <PortalAuthContext.Provider
      value={{
        user,
        portalAccess,
        isAuthenticated: !!user && !!portalAccess,
        isLoading,
        signIn,
        signOut,
        updatePassword,
        markPasswordChanged,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be within PortalAuthProvider");
  return ctx;
}

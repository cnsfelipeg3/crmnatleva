import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface PortalAccess {
  id: string;
  client_id: string;
  must_change_password: boolean;
  first_login_at: string | null;
  is_admin?: boolean;
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
    try {
      const { data, error } = await (supabase as any)
        .from("portal_access")
        .select("id, client_id, must_change_password, first_login_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Portal access fetch error:", error);
        setPortalAccess(null);
        return;
      }

      if (!data) {
        setPortalAccess(null);
        return;
      }

      setPortalAccess({
        id: data.id,
        client_id: data.client_id,
        must_change_password: data.must_change_password,
        first_login_at: data.first_login_at,
      });

      if (!data.first_login_at) {
        void (supabase as any)
          .from("portal_access")
          .update({ first_login_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    } catch (error) {
      console.error("Portal access bootstrap error:", error);
      setPortalAccess(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const AUTH_BOOT_TIMEOUT_MS = 6000;

    const applySession = (session: { user: User | null } | null) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (currentUser) {
        void fetchPortalAccess(currentUser.id);
      } else {
        setPortalAccess(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session ?? null);
    });

    const bootTimeout = window.setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, AUTH_BOOT_TIMEOUT_MS);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        applySession(session ?? null);
      })
      .catch((error) => {
        console.error("Portal auth session bootstrap error:", error);
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
      await (supabase as any)
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

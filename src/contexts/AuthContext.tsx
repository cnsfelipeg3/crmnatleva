import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "gestor" | "vendedor" | "operacional" | "financeiro" | "leitura";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: Record<string, AuthUser & { password: string }> = {
  "admin@natleva.com": { id: "1", name: "Admin NatLeva", email: "admin@natleva.com", role: "admin", password: "123456" },
  "vendedor@natleva.com": { id: "2", name: "João Silva", email: "vendedor@natleva.com", role: "vendedor", password: "123456" },
  "financeiro@natleva.com": { id: "3", name: "Maria Costa", email: "financeiro@natleva.com", role: "financeiro", password: "123456" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("natleva_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, _password: string) => {
    const found = MOCK_USERS[email];
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem("natleva_user", JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("natleva_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
}

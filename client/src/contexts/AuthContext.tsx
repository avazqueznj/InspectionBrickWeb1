import { createContext, useContext, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  userId: string;
  companyId: string | null;
  isSuperuser: boolean;
  customerAdminAccess: boolean;
  locationId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (userId: string, companyId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Fetch current user from session
  const { data: sessionUser, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  // Sync user state with query result
  useEffect(() => {
    setUser(sessionUser ?? null);
  }, [sessionUser]);

  const loginMutation = useMutation({
    mutationFn: async ({ userId, companyId, password }: { userId: string; companyId: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, companyId, password }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Login failed");
      }
      
      return response.json();
    },
    onSuccess: (data: { user: AuthUser }) => {
      setUser(data.user);
      queryClient.clear();
    },
  });

  const login = async (userId: string, companyId: string, password: string) => {
    await loginMutation.mutateAsync({ userId, companyId, password });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

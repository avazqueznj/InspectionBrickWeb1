import { createContext, useContext, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setAuthToken, clearAuthToken, getAuthToken } from "@/lib/queryClient";
import { jwtDecode } from "jwt-decode";

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

interface JWTPayload {
  userId: string;
  companyId: string | null;
  isSuperuser: boolean;
  customerAdminAccess: boolean;
  locationId: string | null;
  exp: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getUserFromToken(): AuthUser | null {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      clearAuthToken();
      return null;
    }
    
    return {
      userId: decoded.userId,
      companyId: decoded.companyId,
      isSuperuser: decoded.isSuperuser,
      customerAdminAccess: decoded.customerAdminAccess || false,
      locationId: decoded.locationId || null,
    };
  } catch (error) {
    console.error("Failed to decode token:", error);
    clearAuthToken();
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(getUserFromToken);
  const [isLoading, setIsLoading] = useState(false);

  // Check token on mount and periodically
  useEffect(() => {
    const checkToken = () => {
      const currentUser = getUserFromToken();
      setUser(currentUser);
    };
    
    // Check every minute for token expiration
    const interval = setInterval(checkToken, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ userId, companyId, password }: { userId: string; companyId: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, companyId, password }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Login failed");
      }
      
      return response.json();
    },
    onSuccess: (data: { token: string; user: AuthUser }) => {
      setAuthToken(data.token);
      setUser(data.user);
      queryClient.clear(); // Clear any cached data from previous user
    },
  });

  const login = async (userId: string, companyId: string, password: string) => {
    await loginMutation.mutateAsync({ userId, companyId, password });
  };

  const logout = () => {
    clearAuthToken();
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

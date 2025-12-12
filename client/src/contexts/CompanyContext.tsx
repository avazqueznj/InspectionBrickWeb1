import { createContext, useContext, useState, useEffect } from "react";
import type { Company } from "@shared/schema";
import { useAuth } from "./AuthContext";

interface CompanyContextType {
  selectedCompany: string | null;
  setSelectedCompany: (companyId: string) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  isLoading: boolean;
  canSwitchCompany: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedCompany, setSelectedCompanyState] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Superusers can switch companies, others cannot
  const canSwitchCompany = user?.isSuperuser === true;

  useEffect(() => {
    if (!user) return;
    
    // For superusers, check localStorage or wait for companies to load
    if (canSwitchCompany) {
      const stored = localStorage.getItem("selectedCompany");
      if (stored) {
        setSelectedCompanyState(stored);
        setIsLoading(false);
      }
      // If no stored company, keep loading until companies are fetched
    } else {
      // For regular users and customer admins, use their assigned company
      if (user.companyId) {
        setSelectedCompanyState(user.companyId);
      }
      setIsLoading(false);
    }
  }, [user, canSwitchCompany]);

  const setSelectedCompany = (companyId: string) => {
    // Only allow switching if user is superuser
    if (!canSwitchCompany) {
      return;
    }
    setSelectedCompanyState(companyId);
    localStorage.setItem("selectedCompany", companyId);
  };

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        setSelectedCompany,
        companies,
        setCompanies,
        isLoading,
        canSwitchCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}

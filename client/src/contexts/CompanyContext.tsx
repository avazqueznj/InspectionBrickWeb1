import { createContext, useContext, useState, useEffect } from "react";
import type { Company } from "@shared/schema";

interface CompanyContextType {
  selectedCompany: string | null;
  setSelectedCompany: (companyId: string) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("selectedCompany");
    if (stored) {
      setSelectedCompanyState(stored);
    }
    setIsLoading(false);
  }, []);

  const setSelectedCompany = (companyId: string) => {
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

import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { useEffect } from "react";
import type { Company } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function CompanySelector() {
  const { selectedCompany, setSelectedCompany, companies, setCompanies, canSwitchCompany } = useCompany();

  const { data: companiesData } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  useEffect(() => {
    if (companiesData) {
      setCompanies(companiesData);
      if (!selectedCompany && companiesData.length > 0) {
        setSelectedCompany(companiesData[0].id);
      }
    }
  }, [companiesData, setCompanies, selectedCompany, setSelectedCompany]);

  if (!companies || companies.length === 0 || !selectedCompany) {
    return null;
  }

  const selectedCompanyObj = companies.find(c => c.id === selectedCompany);

  // For users who cannot switch companies (everyone except avazquez), show company name as text
  if (!canSwitchCompany) {
    return (
      <div className="flex items-center gap-2" data-testid="company-selector">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm font-medium text-foreground px-3 py-1.5">
          {selectedCompanyObj?.id || selectedCompany}
        </div>
      </div>
    );
  }

  // For avazquez, show full dropdown
  return (
    <div className="flex items-center gap-2" data-testid="company-selector">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedCompany}
        onValueChange={setSelectedCompany}
      >
        <SelectTrigger 
          className="w-[180px] h-9 bg-background border-border"
          data-testid="select-company-trigger"
        >
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem 
              key={company.id} 
              value={company.id}
              data-testid={`company-option-${company.id}`}
            >
              {company.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

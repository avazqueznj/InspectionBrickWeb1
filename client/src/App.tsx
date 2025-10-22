import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { TopBar } from "@/components/TopBar";
import Inspections from "@/pages/Inspections";
import Users from "@/pages/Users";
import Assets from "@/pages/Assets";
import InspectionTypes from "@/pages/InspectionTypes";
import Login from "@/pages/Login";
import ComingSoon from "@/pages/ComingSoon";
import NotFound from "@/pages/not-found";
import { Wrench } from "lucide-react";

function ProtectedRouter() {
  return (
    <Switch>
      <Route path="/" component={Inspections} />
      <Route path="/defects">
        {() => (
          <ComingSoon
            title="Defects/Repairs"
            description="Manage and track all defects and repair records"
            icon={Wrench}
          />
        )}
      </Route>
      <Route path="/assets" component={Assets} />
      <Route path="/users" component={Users} />
      <Route path="/inspection-types" component={InspectionTypes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <CompanyProvider>
      <div className="flex flex-col h-screen">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <ProtectedRouter />
        </main>
      </div>
    </CompanyProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

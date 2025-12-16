import { Switch, Route, Redirect, useLocation } from "wouter";
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
import Locations from "@/pages/Locations";
import InspectionTypes from "@/pages/InspectionTypes";
import Defects from "@/pages/Defects";
import Layouts from "@/pages/Layouts";
import DeviceTokens from "@/pages/DeviceTokens";
import AdminSettings from "@/pages/AdminSettings";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function ProtectedRouter() {
  return (
    <Switch>
      <Route path="/" component={Inspections} />
      <Route path="/defects" component={Defects} />
      <Route path="/assets" component={Assets} />
      <Route path="/users" component={Users} />
      <Route path="/locations" component={Locations} />
      <Route path="/inspection-types" component={InspectionTypes} />
      <Route path="/layouts" component={Layouts} />
      <Route path="/device-tokens" component={DeviceTokens} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Handle redirects based on auth state
  useEffect(() => {
    if (!isLoading) {
      // Redirect to /login if not authenticated and not already there
      if (!user && location !== "/login") {
        setLocation("/login");
      }
      // Redirect to home if authenticated and on login page
      else if (user && location === "/login") {
        setLocation("/");
      }
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show login page for /login route
  if (location === "/login") {
    return <Login />;
  }

  // Redirect to login if not authenticated (belt and suspenders with useEffect above)
  if (!user) {
    return <Login />;
  }

  return (
    <CompanyProvider>
      <div className="flex flex-col h-screen">
        <TopBar />
        <main className="flex-1 overflow-auto">
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

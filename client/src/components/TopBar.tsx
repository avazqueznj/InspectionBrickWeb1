import { Link, useLocation } from "wouter";
import { CompanySelector } from "./CompanySelector";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import logoUrl from "@assets/FBricklogo_1761093196077.png";

const menuItems = [
  { path: "/", label: "Inspections" },
  { path: "/defects", label: "Defects/Repairs" },
  { path: "/assets", label: "Assets" },
  { path: "/users", label: "Users" },
  { path: "/inspection-types", label: "Inspection Types" },
  { path: "/layouts", label: "Layouts" },
];

export function TopBar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card border-border">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Inspection Brick" className="h-10" />
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-colors
                    hover-elevate active-elevate-2
                    ${isActive 
                      ? 'bg-accent text-accent-foreground' 
                      : 'text-muted-foreground'
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\//g, '-')}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <CompanySelector />
          
          {user && (
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user.userId}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

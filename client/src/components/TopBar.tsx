import { Link, useLocation } from "wouter";
import { CompanySelector } from "./CompanySelector";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, ChevronDown, Settings, Smartphone, FileText, Layers } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoUrl from "@assets/FBricklogo_1761093196077.png";

const mainMenuItems = [
  { path: "/", label: "Inspections" },
  { path: "/defects", label: "Defects/Repairs" },
  { path: "/assets", label: "Assets" },
  { path: "/users", label: "Users" },
];

const customerAdminItems = [
  { path: "/inspection-types", label: "Inspection Types", icon: FileText },
  { path: "/layouts", label: "Layouts", icon: Layers },
];

const adminItems = [
  { path: "/device-tokens", label: "Device Tokens", icon: Smartphone },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

export function TopBar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const canAccessCustomerAdmin = user?.isSuperuser || user?.customerAdminAccess;
  const canAccessAdmin = user?.isSuperuser;
  
  const isCustomerAdminActive = customerAdminItems.some(item => location === item.path);
  const isAdminActive = adminItems.some(item => location === item.path);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card border-border">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Inspection Brick" className="h-10" />
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {mainMenuItems.map((item) => {
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
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.label}
                </Link>
              );
            })}
            
            {canAccessCustomerAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-colors
                      hover-elevate active-elevate-2 flex items-center gap-1
                      ${isCustomerAdminActive 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground'
                      }
                    `}
                    data-testid="nav-customer-admin"
                  >
                    Customer Admin
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {customerAdminItems.map((item) => (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        href={item.path}
                        className="flex items-center gap-2 cursor-pointer"
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {canAccessAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-colors
                      hover-elevate active-elevate-2 flex items-center gap-1
                      ${isAdminActive 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground'
                      }
                    `}
                    data-testid="nav-admin"
                  >
                    Admin
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {adminItems.map((item) => (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        href={item.path}
                        className="flex items-center gap-2 cursor-pointer"
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

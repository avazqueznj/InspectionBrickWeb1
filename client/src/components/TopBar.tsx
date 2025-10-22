import { Link, useLocation } from "wouter";
import { Box } from "lucide-react";

const menuItems = [
  { path: "/", label: "Inspections" },
  { path: "/defects", label: "Defects/Repairs" },
  { path: "/assets", label: "Assets" },
  { path: "/users", label: "Users" },
  { path: "/inspection-types", label: "Inspection Types" },
];

export function TopBar() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Box className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Inspection Brick</h1>
        </div>
        
        <nav className="ml-12 hidden md:flex items-center gap-1">
          {menuItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
              >
                <a
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
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

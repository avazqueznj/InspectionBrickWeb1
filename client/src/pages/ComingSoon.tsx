import { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

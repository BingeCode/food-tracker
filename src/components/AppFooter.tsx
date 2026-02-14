import { cn } from "@/lib/utils";
import { type LucideIcon, Calendar, BookOpen } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

const items: NavItem[] = [
  { label: "Log", icon: Calendar, path: "/log" },
  { label: "Rezepte/Zutaten", icon: BookOpen, path: "/recipes" },
];

export function AppFooter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="flex h-16 max-w-md mx-auto items-center justify-around px-4">
        {items.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== "/log" && pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 p-2 rounded-md transition-colors w-20",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}>
              <item.icon className={cn("h-6 w-6", isActive && "stroke-2")} />
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

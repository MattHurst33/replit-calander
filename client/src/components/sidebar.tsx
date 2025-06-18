import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  Mail, 
  Settings, 
  User,
  TrendingUp,
  UserX
} from "lucide-react";

const navigationItems = [
  { path: "/", label: "Dashboard", icon: BarChart3 },
  { path: "/calendar-integration", label: "Calendar Integration", icon: Calendar },
  { path: "/qualification-rules", label: "Qualification Rules", icon: Filter },
  { path: "/analytics", label: "Analytics", icon: TrendingUp },
  { path: "/no-show-analytics", label: "No-Show Analytics", icon: UserX },
  { path: "/email-reports", label: "Email Reports", icon: Mail },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center px-6 py-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white text-sm" size={16} />
            </div>
            <span className="text-xl font-semibold text-slate-900">DataFlow</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-brand-50 text-brand-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <Icon 
                  className={`mr-3 ${isActive ? 'text-brand-500' : ''}`} 
                  size={16} 
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
              <User className="text-slate-600 text-sm" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">John Doe</p>
              <p className="text-xs text-slate-500">john@company.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

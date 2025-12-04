import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, FileText, LogOut, ClipboardList, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMemo } from 'react';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  matchPaths?: string[];
}

const baseNavItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/units', icon: Building2, label: 'Units', matchPaths: ['/admin/units'] },
  { to: '/admin/tasks', icon: ClipboardList, label: 'Tasks', matchPaths: ['/admin/tasks', '/admin/tasks/chores', '/admin/tasks/schedule'] },
  { to: '/admin/requests', icon: FileText, label: 'Requests' },
];

const superAdminNavItems: NavItem[] = [
  { to: '/admin/users', icon: Users, label: 'Users' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = useMemo(() => {
    return isSuperAdmin ? [...baseNavItems, ...superAdminNavItems] : baseNavItems;
  }, [isSuperAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Rentably Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const { to, icon: Icon, label, end, matchPaths } = item;

            // Custom active state: check matchPaths or use NavLink's default
            const isCustomActive = matchPaths?.some((path) => location.pathname.startsWith(path)) ?? false;

            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => {
                  const active = matchPaths ? isCustomActive : isActive;
                  return `flex flex-col items-center px-4 py-2 text-xs font-medium transition-colors ${
                    active
                      ? 'text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`;
                }}
              >
                <Icon className="w-6 h-6 mb-1" />
                {label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tropels', label: 'Tropeles' },
  { to: '/signals', label: 'Señales' },
  { to: '/sectors', label: 'Sectores' },
];

export function AppShell() {
  const { logout, user } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-56 flex-shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-700">
          <p className="text-xs text-slate-400">TropelCare</p>
          <p className="font-semibold text-white truncate">{user?.displayName ?? ''}</p>
          <p className="text-xs text-slate-400">{user?.teamCode ?? ''}</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="w-full rounded px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white text-left"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

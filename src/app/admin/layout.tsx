'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { LogOut, Shield, Loader2 } from 'lucide-react';

interface AdminCtx {
  role: 'admin' | 'superadmin';
  tenants: TenantRow[];
  activeTenant: string;
  setActiveTenant: (id: string) => void;
}

interface TenantRow {
  id: string;
  name: string;
  domain: string;
  branding: Record<string, unknown>;
  ai_config: Record<string, unknown>;
  features: Record<string, unknown>;
  welcome_config: Record<string, unknown>;
  agent_name: string | null;
  is_active: boolean;
}

const AdminContext = createContext<AdminCtx | null>(null);
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminLayout');
  return ctx;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [adminRole, setAdminRole] = useState<'admin' | 'superadmin' | null>(null);
  const [checking, setChecking] = useState(true);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [activeTenant, setActiveTenant] = useState('');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Check admin role when user changes
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setChecking(false); setAdminRole(null); return; }

    // First check admin role, then fetch tenants
    fetch('/api/admin/me')
      .then(r => { if (!r.ok) throw new Error('not admin'); return r.json(); })
      .then((data: { admin: { role: 'admin' | 'superadmin' } }) => {
        setAdminRole(data.admin.role);
        return fetch('/api/admin/tenants');
      })
      .then(r => r.json())
      .then((data: { tenants: TenantRow[] }) => {
        setTenants(data.tenants ?? []);
        if (data.tenants?.length > 0 && !activeTenant) {
          setActiveTenant(data.tenants[0].id);
        }
      })
      .catch(() => setAdminRole(null))
      .finally(() => setChecking(false));
  }, [user, authLoading, activeTenant]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const result = await login(email, password);
    if (result.error) {
      setLoginError(result.error);
    }
    setLoginLoading(false);
  };

  // Loading state
  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Not logged in - show login form
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500">Hypoteeka AI</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  placeholder="********"
                  required
                />
              </div>
              {loginError && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium text-sm hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {loginLoading ? 'Ověřuji...' : 'Přihlásit se'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not admin
  if (!adminRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900 mb-2">Přístup odepřen</h1>
          <p className="text-sm text-gray-500 mb-4">
            Účet <strong>{user.email}</strong> nemá admin oprávnění.
          </p>
          <button
            onClick={() => logout()}
            className="px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition-all"
          >
            Odhlásit se
          </button>
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <AdminContext.Provider value={{ role: adminRole, tenants, activeTenant, setActiveTenant }}>
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">Admin</span>
            </div>
            {/* Tenant selector */}
            <select
              value={activeTenant}
              onChange={e => setActiveTenant(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium bg-gray-50 outline-none focus:border-violet-400"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{user.email}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium uppercase">{adminRole}</span>
            <button onClick={() => logout()} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </header>
        {children}
      </div>
    </AdminContext.Provider>
  );
}

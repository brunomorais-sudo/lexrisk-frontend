import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Building2, FolderOpen, Settings, LogOut,
  Scale, Brain, TableIcon, Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems: Record<string, { to: string; icon: any; label: string }[]> = {
  office_admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clientes', icon: Building2, label: 'Clientes' },
    { to: '/processos', icon: FolderOpen, label: 'Processos' },
    { to: '/importacao-lote', icon: TableIcon, label: 'Importação em Lote' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ],
  law_firm_admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clientes', icon: Building2, label: 'Clientes' },
    { to: '/processos', icon: FolderOpen, label: 'Processos' },
    { to: '/importacao-lote', icon: TableIcon, label: 'Importação em Lote' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ],
  lawyer: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clientes', icon: Building2, label: 'Clientes' },
    { to: '/processos', icon: FolderOpen, label: 'Processos' },
    { to: '/importacao-lote', icon: TableIcon, label: 'Importação em Lote' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ],
  client_user: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
    { to: '/processos', icon: FolderOpen, label: 'Meus Processos' },
    { to: '/contato', icon: Phone, label: 'Contato' },
  ],
};

export function AppSidebar() {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!role || !user) return null;

  const baseItems = navItems[role] || navItems['law_firm_admin'];
  const isPro = user.plan === 'pro' || user.plan === 'enterprise';
  const isStaff = role !== 'client_user';
  const items = isStaff && isPro
    ? [
        ...baseItems.slice(0, -1),
        { to: '/assistente', icon: Brain, label: 'Assistente' },
        ...baseItems.slice(-1),
      ]
    : baseItems;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
    : user.email.substring(0, 2).toUpperCase();

  const roleLabel = role === 'client_user' ? 'Cliente'
    : role === 'lawyer' ? 'Advogado'
    : 'Admin';

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-nav-bg">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-nav-hover">
        <Scale className="h-7 w-7 text-nav-active" />
        <div>
          <h1 className="text-base font-bold text-nav-foreground">LexRisk</h1>
          <p className="text-[10px] text-nav-muted tracking-wider uppercase">Trabalhista AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map(item => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn('nav-link', active && 'nav-link-active')}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-nav-hover p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nav-active text-xs font-bold text-primary-foreground shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-nav-foreground truncate">{user.full_name || user.email}</p>
            <p className="text-[10px] text-nav-muted">{roleLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="text-nav-muted hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

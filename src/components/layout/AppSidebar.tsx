import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Building2, FolderOpen, Settings, LogOut,
  Scale, Bell, ChevronDown, Phone, Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { users, memberships } from '@/data/mock-data';

const navItems = {
  office_admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clientes', icon: Building2, label: 'Clientes' },
    { to: '/processos', icon: FolderOpen, label: 'Processos' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ],
  lawyer: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clientes', icon: Building2, label: 'Clientes' },
    { to: '/processos', icon: FolderOpen, label: 'Processos' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ],
  client_user: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
    { to: '/processos', icon: FolderOpen, label: 'Meus Processos' },
    { to: '/contato', icon: Phone, label: 'Contato' },
  ],
};

export function AppSidebar() {
  const { user, role, logout, switchUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!role || !user) return null;

  const baseItems = navItems[role] || [];
  const isPro = user.plan === 'pro' || user.plan === 'enterprise';
  const isStaff = role === 'office_admin' || role === 'lawyer';
  const items = isStaff && isPro
    ? [
        ...baseItems.slice(0, -1),
        { to: '/assistente', icon: Brain, label: 'Assistente' },
        ...baseItems.slice(-1),
      ]
    : baseItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Demo user switcher
  const demoUsers = users.map(u => {
    const mem = memberships.find(m => m.user_id === u.id);
    return { ...u, role: mem?.role };
  });

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

      {/* Demo User Switcher */}
      <div className="border-t border-nav-hover p-3">
        <p className="mb-2 px-3 text-[10px] uppercase tracking-wider text-nav-muted">Demo: Trocar Usuário</p>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-nav-foreground hover:bg-nav-hover transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nav-active text-xs font-bold text-primary-foreground">
              {user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium truncate">{user.full_name}</p>
              <p className="text-[10px] text-nav-muted">
                {role === 'office_admin' ? 'Admin' : role === 'lawyer' ? 'Advogado' : 'Cliente'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-nav-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {demoUsers.map(u => (
              <DropdownMenuItem key={u.id} onClick={() => { switchUser(u.id); navigate('/dashboard'); }}>
                <div>
                  <p className="text-sm font-medium">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.email} • {u.role === 'office_admin' ? 'Admin' : u.role === 'lawyer' ? 'Advogado' : 'Cliente'}</p>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

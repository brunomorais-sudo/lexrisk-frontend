import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  FileCheck2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Hourglass,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type NotificationType =
  | 'import_done'
  | 'risk_high'
  | 'financial_update'
  | 'deadline'
  | 'analysis_pending'
  | 'info';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  createdAt: Date;
  read: boolean;
};

// Mapeamento tipo → ícone + cor (usa tokens semânticos do design system)
const TYPE_STYLES: Record<
  NotificationType,
  { icon: LucideIcon; iconClass: string; bgClass: string }
> = {
  import_done: {
    icon: FileCheck2,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-100 dark:bg-emerald-950/40',
  },
  risk_high: {
    icon: AlertTriangle,
    iconClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
  },
  financial_update: {
    icon: TrendingUp,
    iconClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-950/40',
  },
  deadline: {
    icon: Clock,
    iconClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-100 dark:bg-amber-950/40',
  },
  analysis_pending: {
    icon: Hourglass,
    iconClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-100 dark:bg-orange-950/40',
  },
  info: {
    icon: Info,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
};


// Demo seed — substituir por dados reais (Supabase realtime) quando o backend estiver pronto
const seed: Notification[] = [
  {
    id: 'n1',
    type: 'import_done',
    title: 'Importação concluída',
    description: 'O processo 0001234-56.2024.5.02.0001 foi analisado.',
    createdAt: new Date(Date.now() - 1000 * 60 * 12),
    read: false,
  },
  {
    id: 'n2',
    type: 'risk_high',
    title: 'Risco alto detectado',
    description: 'Score 82/100 em processo recém-importado.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: false,
  },
  {
    id: 'n3',
    type: 'financial_update',
    title: 'Atualização monetária recalculada',
    description: 'Selic acumulada atualizada até este mês.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    read: true,
  },
];

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h atrás`;
  const d = Math.floor(h / 24);
  return `${d} d atrás`;
}

export function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>(seed);
  const unread = items.filter((n) => !n.read).length;

  // Detecta processos sem análise há mais de 3 dias e injeta como notificação
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        const { data: stale, error } = await supabase
          .from('processes')
          .select('id, process_number, created_at')
          .lt('created_at', threeDaysAgo);

        if (error || !stale || cancelled) return;

        const ids = stale.map((p) => p.id);
        if (ids.length === 0) return;

        const { data: analyses } = await supabase
          .from('process_analyses')
          .select('process_id')
          .in('process_id', ids);

        const analyzed = new Set((analyses ?? []).map((a) => a.process_id));
        const pending = stale.filter((p) => !analyzed.has(p.id));
        if (pending.length === 0 || cancelled) return;

        const newItems: Notification[] = pending.map((p) => {
          const days = Math.floor(
            (Date.now() - new Date(p.created_at).getTime()) / (24 * 60 * 60 * 1000),
          );
          return {
            id: `pending-${p.id}`,
            type: 'analysis_pending',
            title: 'Análise pendente há mais de 3 dias',
            description: `Processo ${p.process_number} aguarda análise da IA (${days} dias).`,
            createdAt: new Date(p.created_at),
            read: false,
          };
        });

        setItems((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const merged = [...newItems.filter((n) => !existingIds.has(n.id)), ...prev];
          return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        });
      } catch {
        // silencia — notificações são opcionais
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
              aria-hidden
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} não lidas` : 'Tudo em dia'}
            </p>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={markAllRead}
            >
              <Check className="mr-1 h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const style = TYPE_STYLES[n.type];
                const Icon = style.icon;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        !n.read && 'bg-muted/30',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          style.bgClass,
                        )}
                        aria-hidden
                      >
                        <Icon className={cn('h-4 w-4', style.iconClass)} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm font-medium text-foreground">
                            {n.title}
                          </p>
                          {!n.read && (
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                              aria-label="Não lida"
                            />
                          )}
                        </div>
                        {n.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {n.description}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

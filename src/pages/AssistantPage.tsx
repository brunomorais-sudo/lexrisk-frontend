import { Link } from 'react-router-dom';
import { Brain, Lock, CheckCircle2, Pencil, XCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserMemory } from '@/hooks/useUserMemory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AcaoFeedbackDoc } from '@/lib/memoria';

const TIPO_DOC_LABEL: Record<string, string> = {
  peticao: 'Petição',
  recurso: 'Recurso',
  email_cliente: 'E-mail ao cliente',
  resumo_executivo: 'Resumo executivo',
};

function FeedbackIcon({ acao }: { acao: AcaoFeedbackDoc }) {
  if (acao === 'aceito') return <CheckCircle2 className="h-4 w-4 text-risk-low" />;
  if (acao === 'editado') return <Pencil className="h-4 w-4 text-risk-medium" />;
  return <XCircle className="h-4 w-4 text-risk-high" />;
}

function fmtDate(ts: string) {
  try {
    return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return ts;
  }
}

export default function AssistantPage() {
  const { user } = useAuth();
  const memory = useUserMemory();

  const plan = user?.plan ?? 'starter';
  const isPro = plan === 'pro' || plan === 'enterprise';

  if (!isPro) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card className="border-2 border-dashed">
          <CardHeader className="items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Recurso exclusivo Pro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              O painel "Seu Assistente Jurídico" aprende com seu uso e mostra teses
              preferidas, padrões de acordo e histórico de decisões. Disponível nos
              planos <strong>Pro</strong> e <strong>Enterprise</strong>.
            </p>
            <Button asChild size="lg">
              <Link to="/planos">
                <Sparkles className="mr-2 h-4 w-4" />
                Fazer upgrade
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Seu Assistente Jurídico</h1>
          <p className="text-sm text-muted-foreground">
            Memória aprendida a partir do seu uso da plataforma.
          </p>
        </div>
      </header>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Casos analisados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{memory.casos_analisados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Última atualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {memory.ultima_atualizacao ? fmtDate(memory.ultima_atualizacao) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Teses Preferidas */}
      <Card>
        <CardHeader>
          <CardTitle>Teses Preferidas</CardTitle>
        </CardHeader>
        <CardContent>
          {memory.teses_preferidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tese registrada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {memory.teses_preferidas.map((t, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border bg-card p-3 text-sm">
                  <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Padrões de Acordo */}
      <Card>
        <CardHeader>
          <CardTitle>Padrões de Acordo Aprendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {memory.padroes_acordo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum padrão identificado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Faixa de Valor</TableHead>
                  <TableHead className="text-right">Frequência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memory.padroes_acordo.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.pedido}</TableCell>
                    <TableCell>{p.faixa}</TableCell>
                    <TableCell className="text-right">{p.frequencia}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Feedbacks */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Feedbacks em Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          {memory.feedbacks_docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum feedback registrado.</p>
          ) : (
            <ul className="divide-y">
              {memory.feedbacks_docs.slice(0, 10).map((f, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                  <FeedbackIcon acao={f.acao} />
                  <span className="font-medium">
                    {TIPO_DOC_LABEL[f.tipo_doc] ?? f.tipo_doc}
                  </span>
                  <span className="text-muted-foreground capitalize">{f.acao}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{fmtDate(f.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

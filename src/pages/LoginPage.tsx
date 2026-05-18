import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email);
      setEmail(normalizedEmail);
      const success = await login(normalizedEmail, password);

      if (success) {
        toast.success('Login realizado com sucesso');
        navigate('/dashboard', { replace: true });
      } else {
        setError('E-mail ou senha inválidos. Use uma das contas demo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    setError('');
    setEmail(normalizedEmail);
    setPassword('demo');
    setLoading(true);
    try {
      const success = await login(normalizedEmail, 'demo');
      if (success) {
        toast.success('Login realizado com sucesso');
        navigate('/dashboard', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">LexRisk</h1>
              <p className="text-xs text-muted-foreground">Trabalhista AI</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Acessar plataforma</h2>
          <p className="mt-2 text-sm text-muted-foreground">Entre com suas credenciais para continuar</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required className="mt-1.5"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {import.meta.env.VITE_DEMO_MODE === 'true' && (
            <div className="mt-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Acesso rápido (demo)</p>
              <div className="space-y-2">
                <button onClick={() => quickLogin('ricardo@machadoferreira.adv.br')} className="w-full rounded-lg border bg-card px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors">
                  <span className="font-medium">Dr. Ricardo Machado</span>
                  <span className="ml-2 text-xs text-muted-foreground">Admin do Escritório</span>
                </button>
                <button onClick={() => quickLogin('camila@machadoferreira.adv.br')} className="w-full rounded-lg border bg-card px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors">
                  <span className="font-medium">Dra. Camila Ferreira</span>
                  <span className="ml-2 text-xs text-muted-foreground">Advogada</span>
                </button>
                <button onClick={() => quickLogin('marina@techbrasil.com.br')} className="w-full rounded-lg border bg-card px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors">
                  <span className="font-medium">Marina Costa</span>
                  <span className="ml-2 text-xs text-muted-foreground">Cliente - TechBrasil</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right - Brand */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-secondary p-12">
        <div className="max-w-md text-center">
          <Scale className="mx-auto h-16 w-16 text-primary" />
          <h2 className="mt-6 text-3xl font-bold text-secondary-foreground">Análise Inteligente de Processos Trabalhistas</h2>
          <p className="mt-4 text-secondary-foreground/70">
            Prós e contras fundamentados. Score de risco justificado. Chat especialista. Geração de documentos.
          </p>
        </div>
      </div>
    </div>
  );
}

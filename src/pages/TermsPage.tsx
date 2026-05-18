import { Link } from 'react-router-dom';
import { Scale, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="font-bold">LexRisk</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 2 de maio de 2026
        </p>

        <section className="prose prose-sm mt-8 max-w-none dark:prose-invert">
          <h2>1. Objeto</h2>
          <p>
            O LexRisk é uma plataforma de análise de risco em processos
            trabalhistas destinada exclusivamente a escritórios de advocacia e
            departamentos jurídicos corporativos atuando na defesa do empregador.
          </p>

          <h2>2. Confidencialidade dos Processos</h2>
          <p>
            Os documentos e dados dos processos são restritos ao escritório
            usuário e aos clientes vinculados. O LexRisk não compartilha
            documentos brutos, nomes das partes, CPFs, valores específicos ou
            qualquer outro dado pessoal com terceiros.
          </p>

          <h2 className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            3. Coleta Anônima para Melhoria da IA (opcional)
          </h2>
          <p>
            Mediante seu <strong>consentimento explícito</strong>, podemos
            coletar de forma <strong>totalmente anonimizada</strong> os
            seguintes metadados dos processos analisados:
          </p>
          <ul>
            <li>Tipo / classificação do processo (ex: horas extras, equiparação salarial)</li>
            <li>Tribunal e fase processual (conhecimento, recursal, execução)</li>
            <li>Score de risco atribuído pela IA e nível de confiança</li>
            <li>Padrões agregados de teses e acordos (sem valores nominais)</li>
          </ul>
          <p>
            <strong>Nunca</strong> são coletados: nomes das partes, números
            CNJ, CPF/CNPJ, conteúdo de petições, documentos enviados, ou
            qualquer dado que permita identificar pessoas, empresas ou processos
            específicos.
          </p>
          <p>
            Esses metadados anônimos são usados apenas para treinar e refinar os
            modelos de risco e sugestão de teses, beneficiando todos os
            usuários da plataforma.
          </p>
          <p>
            O consentimento é <strong>opcional</strong> e não bloqueia o uso da
            plataforma. Você pode <strong>conceder ou revogar</strong> a
            qualquer momento em <em>Configurações → Perfil</em>. A revogação
            interrompe imediatamente novas coletas.
          </p>

          <h2>4. Responsabilidade Profissional</h2>
          <p>
            As análises geradas pela IA são <strong>apoio à decisão</strong> e
            não substituem o julgamento técnico do(a) advogado(a) responsável.
          </p>
        </section>

        <div className="mt-10 flex gap-3">
          <Button asChild variant="outline">
            <Link to="/">Voltar</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Criar conta</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

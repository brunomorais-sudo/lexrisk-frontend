import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Scale, Brain, BarChart3, Users, FileText, Database,
  ArrowRight, Check, AlertTriangle, Clock, TrendingDown, ShieldAlert,
  Mail, Phone, MapPin, Star,
} from 'lucide-react';
import { motion } from 'framer-motion';

const problems = [
  {
    icon: AlertTriangle,
    title: 'Provisões trabalhistas imprecisas',
    description: 'Estimativas baseadas em achismo geram surpresas no balanço e desgaste com auditoria.',
  },
  {
    icon: Clock,
    title: 'Análise manual consome horas',
    description: 'Advogados gastam dias lendo petições para classificar risco — tempo que custa caro.',
  },
  {
    icon: TrendingDown,
    title: 'Cliente sem visibilidade do risco',
    description: 'Empresas reclamam da falta de relatórios executivos claros sobre seu passivo.',
  },
  {
    icon: ShieldAlert,
    title: 'Decisões sem fundamento estruturado',
    description: 'Acordo ou litígio? Sem prós e contras objetivos, a estratégia vira aposta.',
  },
];

const features = [
  { icon: Brain, title: 'Análise com IA Jurídica', description: 'Pipeline de 8 etapas que extrai pedidos, valida provas e fundamenta a defesa do empregador.' },
  { icon: BarChart3, title: 'Score de Risco Explicável', description: 'Classificação Alto / Médio / Baixo com justificativa, prós e contras ANTES do score.' },
  { icon: Users, title: 'Portal do Cliente', description: 'Empresa acessa seus processos com linguagem executiva e gráficos de exposição financeira.' },
  { icon: FileText, title: 'Relatório PDF em 1 Clique', description: 'Resumo executivo profissional com capa, análise e próximos passos pronto para enviar.' },
  { icon: Database, title: 'Integração DataJud (CNJ)', description: 'Importa andamentos oficiais do CNJ direto na ficha do processo, sem digitação manual.' },
  { icon: Scale, title: 'Multi-tenant Seguro', description: 'Isolamento total por escritório e por cliente, com RLS e auditoria de acessos críticos.' },
];

const plans = [
  {
    name: 'Starter',
    price: 'R$ 297',
    period: '/mês',
    description: 'Para escritórios começando a estruturar o contencioso trabalhista.',
    features: ['1 escritório', 'Até 50 processos ativos', '2 usuários advogados', 'Análise IA + Score de Risco', 'Relatório PDF executivo', 'Suporte por e-mail'],
    cta: 'Começar agora',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 'R$ 697',
    period: '/mês',
    description: 'Para bancas que precisam escalar análise e atender mais clientes.',
    features: ['Tudo do Starter', 'Até 200 processos ativos', '3 usuários advogados', 'Portal do cliente ilimitado', 'Integração DataJud (CNJ)', 'Chat especialista IA', 'Suporte prioritário'],
    cta: 'Falar com vendas',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    description: 'Volume alto, múltiplas filiais e integrações personalizadas.',
    features: ['Processos ilimitados', 'Usuários ilimitados', 'SSO corporativo', 'Integrações sob medida', 'SLA dedicado', 'Onboarding assistido', 'Gerente de conta'],
    cta: 'Solicitar proposta',
    highlighted: false,
  },
];

const testimonials = [
  {
    quote: 'Reduzimos em 70% o tempo de análise inicial. Hoje entregamos parecer de risco no mesmo dia que recebemos a citação.',
    author: 'Dra. Camila Ferreira',
    role: 'Sócia, Machado & Ferreira Advocacia',
  },
  {
    quote: 'Pela primeira vez nossa diretoria entende o passivo trabalhista sem precisar de glossário. O relatório executivo virou rotina mensal.',
    author: 'Marina Souza',
    role: 'Head Jurídico, TechBrasil',
  },
  {
    quote: 'Os prós e contras estruturados pela IA mudaram como decidimos acordo vs litígio. Estratégia ficou muito mais defensável.',
    author: 'Dr. André Lima',
    role: 'Coordenador de Contencioso',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[hsl(222_47%_6%)] text-[hsl(210_40%_98%)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[hsl(222_47%_6%)]/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold">LexRisk</span>
              <span className="ml-1 text-xs text-blue-300">Trabalhista AI</span>
            </div>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#problemas" className="text-sm text-white/70 hover:text-white">Problemas</a>
            <a href="#features" className="text-sm text-white/70 hover:text-white">Funcionalidades</a>
            <a href="#planos" className="text-sm text-white/70 hover:text-white">Planos</a>
            <a href="#contato" className="text-sm text-white/70 hover:text-white">Contato</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">Entrar</Button>
            </Link>
            <a href="#contato">
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                Solicitar demo
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-600/30 via-blue-500/10 to-transparent blur-3xl" />
          <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <div className="container py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              IA Jurídica para Contencioso Trabalhista Empresarial
            </div>
            <h1 className="bg-gradient-to-br from-white via-white to-blue-200 bg-clip-text text-5xl font-bold leading-tight tracking-tight text-transparent lg:text-6xl">
              Reduza em até 70% o risco trabalhista do seu cliente
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Plataforma de IA para escritórios de advocacia que analisa processos trabalhistas, calcula score de risco
              fundamentado e entrega relatório executivo pronto para o cliente — em minutos, não dias.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#contato">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 px-8 hover:from-blue-600 hover:to-blue-700">
                  Solicitar demonstração <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  Acessar plataforma
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/50">
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-400" /> Sem cartão de crédito</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-400" /> Setup em 24h</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-400" /> Dados isolados por cliente</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problems */}
      <section id="problemas" className="border-t border-white/10 bg-[hsl(222_47%_8%)] py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold lg:text-4xl">Você reconhece estas dores?</h2>
            <p className="mt-4 text-white/60">
              O contencioso trabalhista virou caixa-preta para o cliente — e operação artesanal para o escritório.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {problems.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 transition hover:border-blue-500/30"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="mt-1 text-sm text-white/60">{p.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/10 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              FUNCIONALIDADES
            </div>
            <h2 className="text-3xl font-bold lg:text-4xl">Tudo que seu escritório precisa em um só lugar</h2>
            <p className="mt-4 text-white/60">
              Da análise inicial ao relatório executivo do cliente, com IA treinada para defesa do empregador.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 transition hover:border-blue-500/40"
              >
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/5 blur-2xl transition group-hover:bg-blue-500/10" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-700/20 ring-1 ring-blue-500/30">
                    <f.icon className="h-6 w-6 text-blue-300" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="border-t border-white/10 bg-[hsl(222_47%_8%)] py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              PLANOS
            </div>
            <h2 className="text-3xl font-bold lg:text-4xl">Escolha o plano ideal para seu escritório</h2>
            <p className="mt-4 text-white/60">Sem fidelidade. Cancele quando quiser. Atualize conforme cresce.</p>
          </div>
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlighted
                    ? 'border-blue-500/50 bg-gradient-to-br from-blue-600/20 via-blue-500/5 to-transparent shadow-2xl shadow-blue-500/10'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 text-xs font-semibold">
                    MAIS POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-2 text-sm text-white/60">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-white/50">{plan.period}</span>}
                </div>
                <a href="#contato" className="mt-6 block">
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </a>
                <ul className="mt-8 space-y-3">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                      <span className="text-white/80">{feat}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/10 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold lg:text-4xl">Quem já usa, recomenda</h2>
            <p className="mt-4 text-white/60">Escritórios e departamentos jurídicos que transformaram sua operação.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6"
              >
                <div className="flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, idx) => <Star key={idx} className="h-4 w-4 fill-current" />)}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-white/80">"{t.quote}"</blockquote>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="text-sm font-semibold">{t.author}</div>
                  <div className="text-xs text-white/50">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="contato" className="border-t border-white/10 bg-gradient-to-br from-blue-600/20 via-[hsl(222_47%_8%)] to-[hsl(222_47%_6%)] py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent p-12 text-center">
            <h2 className="text-3xl font-bold lg:text-4xl">Pronto para reduzir seu risco trabalhista?</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Agende uma demonstração de 30 minutos e veja a IA analisar um processo real do seu acervo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="mailto:contato@lexrisk.com.br">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 px-8 hover:from-blue-600 hover:to-blue-700">
                  Solicitar demonstração <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="https://wa.me/5511999999999">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  Falar no WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[hsl(222_47%_5%)] py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-bold">LexRisk</div>
                  <div className="text-xs text-blue-300">Trabalhista AI</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/50">
                IA jurídica para escritórios que defendem empregadores no contencioso trabalhista.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Produto</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/60">
                <li><a href="#features" className="hover:text-white">Funcionalidades</a></li>
                <li><a href="#planos" className="hover:text-white">Planos</a></li>
                <li><Link to="/login" className="hover:text-white">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Empresa</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white">Sobre</a></li>
                <li><a href="#" className="hover:text-white">Termos de uso</a></li>
                <li><a href="#" className="hover:text-white">Privacidade</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Contato</h4>
              <ul className="mt-4 space-y-3 text-sm text-white/60">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-400" /> contato@lexrisk.com.br</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-blue-400" /> (11) 9 9999-9999</li>
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-400" /> São Paulo, SP</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/40">
            © {new Date().getFullYear()} LexRisk Trabalhista AI. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

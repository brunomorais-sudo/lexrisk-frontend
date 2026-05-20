import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { usePjeCredentials } from "@/hooks/usePjeCredentials";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function PjeCredentialsForm() {
  const { credenciais, isLoading, isSaving, isTesting, error: hookError, buscarCredenciais, salvarCredenciais, testarLogin } = usePjeCredentials();
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [oab, setOab] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [testeStatus, setTesteStatus] = useState<"idle" | "ok" | "error">("idle");
  const [testeMsg, setTesteMsg] = useState<string | null>(null);

  useEffect(() => {
    buscarCredenciais().then((creds) => {
      if (creds) { setCpf(formatCpf(creds.cpf)); setNome(creds.nome ?? ""); setOab(creds.oab ?? ""); }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSalvarETestar = async () => {
    setTesteStatus("idle"); setTesteMsg(null);
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) { toast.error("CPF inválido — informe 11 dígitos"); return; }
    if (!senha) { toast.error("Informe a senha do PDPJ"); return; }
    const teste = await testarLogin(cpfDigits, senha);
    if (!teste.ok) { setTesteStatus("error"); setTesteMsg(teste.error ?? "Credenciais inválidas"); toast.error("Falha na autenticação — credenciais não salvas"); return; }
    const saved = await salvarCredenciais({ cpf: cpfDigits, senha, nome: nome || undefined, oab: oab || undefined });
    if (saved) { setTesteStatus("ok"); setTesteMsg(`Conectado com sucesso${teste.expiresIn ? ` (token válido por ${Math.round(teste.expiresIn / 60)} min)` : ""}`); setSenha(""); toast.success("Credenciais PDPJ salvas e verificadas"); }
    else { toast.error("Não foi possível salvar as credenciais"); }
  };

  const isProcessing = isSaving || isTesting;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary shrink-0" />
        <div>
          <h3 className="font-semibold text-sm">Credenciais PDPJ / PJe</h3>
          <p className="text-xs text-muted-foreground">Login único utilizado para acessar o PJe em todos os tribunais federados ao PDPJ.</p>
        </div>
      </div>
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
          Suas credenciais são armazenadas de forma protegida e utilizadas exclusivamente para consultas em seu nome. Nunca são compartilhadas.
        </AlertDescription>
      </Alert>
      {testeStatus === "ok" && (<Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"><CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" /><AlertDescription className="text-xs text-green-700 dark:text-green-300">{testeMsg}</AlertDescription></Alert>)}
      {testeStatus === "error" && (<Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertDescription className="text-xs">{testeMsg}</AlertDescription></Alert>)}
      {hookError && testeStatus === "idle" && (<Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertDescription className="text-xs">{hookError}</AlertDescription></Alert>)}
      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando credenciais salvas…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pje-cpf">CPF <span className="text-destructive">*</span></Label>
            <Input id="pje-cpf" type="text" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} maxLength={14} disabled={isProcessing} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pje-senha">Senha PDPJ <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input id="pje-senha" type={showSenha ? "text" : "password"} placeholder={credenciais?.temSenha ? "•••••••• (deixe em branco para manter)" : "Sua senha do PDPJ"} value={senha} onChange={(e) => setSenha(e.target.value)} disabled={isProcessing} className="pr-10" />
              <button type="button" onClick={() => setShowSenha((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pje-nome">Nome completo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input id="pje-nome" type="text" placeholder="Ex: João da Silva" value={nome} onChange={(e) => setNome(e.target.value)} disabled={isProcessing} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pje-oab">OAB <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input id="pje-oab" type="text" placeholder="Ex: AM12345" value={oab} onChange={(e) => setOab(e.target.value)} disabled={isProcessing} />
          </div>
        </div>
      )}
      {!isLoading && (
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSalvarETestar} disabled={isProcessing} className="gap-2">
            {isProcessing ? (<><Loader2 className="h-4 w-4 animate-spin" />{isTesting ? "Testando login…" : "Salvando…"}</>) : (<><CheckCircle2 className="h-4 w-4" />Salvar e Testar</>)}
          </Button>
          {credenciais?.atualizadoEm && (<span className="text-xs text-muted-foreground">Última atualização: {new Date(credenciais.atualizadoEm).toLocaleDateString("pt-BR")}</span>)}
        </div>
      )}
    </div>
  );
}

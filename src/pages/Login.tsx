import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-9 bg-foreground rounded-md flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-lg">OFFICECUP 26</span>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
            <TabsTrigger value="reset">Esqueci</TabsTrigger>
          </TabsList>
          <TabsContent value="signin"><SignInForm /></TabsContent>
          <TabsContent value="signup"><SignUpForm /></TabsContent>
          <TabsContent value="reset"><ResetForm /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Credenciais inválidas", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field id="si-email" label="E-mail" type="email" value={email} onChange={setEmail} />
      <Field id="si-pw" label="Senha" type="password" value={password} onChange={setPassword} />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Senha precisa de pelo menos 6 caracteres");
    setLoading(true);
    try {
      const u = await signup(email, password, name);
      toast.success("Conta criada!", { description: u.is_admin ? "Você é o primeiro usuário: admin." : "Bem-vindo!" });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Erro ao criar conta", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field id="su-name" label="Nome completo" value={name} onChange={setName} />
      <Field id="su-email" label="E-mail" type="email" value={email} onChange={setEmail} />
      <Field id="su-pw" label="Senha (mín. 6)" type="password" value={password} onChange={setPassword} />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando…" : "Criar conta"}
      </Button>
    </form>
  );
}

function ResetForm() {
  const reset = useAuthStore((s) => s.resetPassword);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Senha precisa de pelo menos 6 caracteres");
    setLoading(true);
    try {
      await reset(email, password);
      toast.success("Senha atualizada", { description: "Use a nova senha para entrar." });
    } catch (err) {
      toast.error("Erro", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-xs text-muted-foreground">
        Como esta é uma base local, defina uma nova senha diretamente.
      </p>
      <Field id="re-email" label="E-mail" type="email" value={email} onChange={setEmail} />
      <Field id="re-pw" label="Nova senha (mín. 6)" type="password" value={password} onChange={setPassword} />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Salvando…" : "Definir nova senha"}
      </Button>
    </form>
  );
}

function Field({ id, label, type = "text", value, onChange }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-mono uppercase tracking-widest">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}
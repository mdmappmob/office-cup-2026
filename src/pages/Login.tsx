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
  const [tab, setTab] = useState<"signin" | "signup" | "reset">("signin");
  const [prefillEmail, setPrefillEmail] = useState("");

  // Store invite code from URL so Perfil page can auto-join
  const inviteParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("invite")
      : null;
  useEffect(() => {
    if (inviteParam) sessionStorage.setItem("pending_invite", inviteParam);
  }, [inviteParam]);

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-6"
      suppressHydrationWarning
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm"
        suppressHydrationWarning
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="size-9 bg-foreground rounded-md flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-lg">OFFICECUP 26</span>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
            <TabsTrigger value="reset">Esqueci</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <SignInForm initialEmail={prefillEmail} />
          </TabsContent>
          <TabsContent value="signup">
            <SignUpForm />
          </TabsContent>
          <TabsContent value="reset">
            <ResetForm
              onDone={(email) => {
                setPrefillEmail(email);
                setTab("signin");
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SignInForm({ initialEmail }: { initialEmail: string }) {
  const navigate = useNavigate();
  const ready = useAuthStore((s) => s.ready);
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return toast.error("Base local ainda inicializando, aguarde…");
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
    <form className="space-y-4" onSubmit={submit} suppressHydrationWarning>
      <Field
        id="si-email"
        label="E-mail"
        type="email"
        autoComplete="username"
        value={email}
        onChange={setEmail}
      />
      <Field
        id="si-pw"
        label="Senha"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const ready = useAuthStore((s) => s.ready);
  const signup = useAuthStore((s) => s.signup);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return toast.error("Base local ainda inicializando, aguarde…");
    if (password.length < 6) return toast.error("Senha precisa de pelo menos 6 caracteres");
    setLoading(true);
    try {
      const u = await signup(email, password, name);
      toast.success("Conta criada!", {
        description: u.is_admin ? "Você é o primeiro usuário: admin." : "Bem-vindo!",
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Erro ao criar conta", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="space-y-4" onSubmit={submit} suppressHydrationWarning>
      <Field
        id="su-name"
        label="Nome completo"
        autoComplete="name"
        value={name}
        onChange={setName}
      />
      <Field
        id="su-email"
        label="E-mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <Field
        id="su-pw"
        label="Senha (mín. 6)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando…" : "Criar conta"}
      </Button>
    </form>
  );
}

function ResetForm({ onDone }: { onDone: (email: string) => void }) {
  const ready = useAuthStore((s) => s.ready);
  const reset = useAuthStore((s) => s.resetPassword);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return toast.error("Base local ainda inicializando, aguarde…");
    if (password.length < 6) return toast.error("Senha precisa de pelo menos 6 caracteres");
    setLoading(true);
    try {
      await reset(email, password);
      toast.success("Senha local atualizada", { description: "Entre com a nova senha." });
      onDone(email.trim().toLowerCase());
      setPassword("");
    } catch (err) {
      toast.error("Erro", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="space-y-4" onSubmit={submit} suppressHydrationWarning>
      <p className="text-xs text-muted-foreground">
        Como esta é uma base local, defina uma nova senha diretamente.
      </p>
      <Field
        id="re-email"
        label="E-mail"
        type="email"
        autoComplete="username"
        value={email}
        onChange={setEmail}
      />
      <Field
        id="re-pw"
        label="Nova senha (mín. 6)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Salvando…" : "Definir nova senha"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2" suppressHydrationWarning>
      <Label htmlFor={id} className="text-xs font-mono uppercase tracking-widest">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        suppressHydrationWarning
      />
    </div>
  );
}

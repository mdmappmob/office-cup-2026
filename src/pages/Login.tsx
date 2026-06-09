import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error("Credenciais inválidas", { description: error.message });
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Senha precisa de pelo menos 6 caracteres");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);
    if (error) return toast.error("Erro ao criar conta", { description: error.message });
    toast.success("Conta criada!", { description: "Confirme seu e-mail se solicitado e faça login." });
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
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("E-mail enviado", { description: "Verifique sua caixa de entrada." });
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field id="re-email" label="E-mail" type="email" value={email} onChange={setEmail} />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando…" : "Enviar link"}
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
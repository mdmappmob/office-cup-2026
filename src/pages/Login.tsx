import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { initSqliteRepo, isSqliteReady, sqliteLogin } from "@/lib/db/sqlite-repo";
import { SQLITE_DB_NAME } from "@/lib/db/config";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ricardo@firma.com");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSqliteReady()) {
      initSqliteRepo(SQLITE_DB_NAME).catch((e) => console.error(e));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isSqliteReady()) await initSqliteRepo(SQLITE_DB_NAME);
      const user = sqliteLogin(email.trim(), password);
      if (!user) {
        toast.error("Credenciais inválidas", { description: "Verifique e-mail e senha." });
        return;
      }
      useAuthStore.getState().setUser(user);
      useAppStore.getState().setCurrentUser(user.id, user.is_admin);
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-9 bg-foreground rounded-md flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-lg">OFFICECUP 26</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tighter mb-1">Entrar no bolão</h1>
        <p className="text-sm text-muted-foreground mb-6">Acesse com seu e-mail corporativo</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-widest">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw" className="text-xs font-mono uppercase tracking-widest">Senha</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground mt-4 text-center font-mono">
          dica: usuários seed têm senha <span className="font-bold">demo</span>
        </p>
        <div className="text-xs text-muted-foreground mt-6 text-center">
          Quer criar um bolão? <Link to="/criar-bolao" className="text-primary font-medium">Comece aqui</Link>
        </div>
      </div>
    </div>
  );
}
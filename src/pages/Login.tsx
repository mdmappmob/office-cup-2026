import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const navigate = useNavigate();
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
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/dashboard" });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-widest">Email</Label>
            <Input id="email" type="email" defaultValue="ricardo@firma.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw" className="text-xs font-mono uppercase tracking-widest">Senha</Label>
            <Input id="pw" type="password" defaultValue="demo" />
          </div>
          <Button type="submit" className="w-full">Entrar</Button>
        </form>
        <div className="text-xs text-muted-foreground mt-6 text-center">
          Quer criar um bolão? <Link to="/criar-bolao" className="text-primary font-medium">Comece aqui</Link>
        </div>
      </div>
    </div>
  );
}
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

export function CriarBolaoPage() {
  const [name, setName] = useState("Bolão da Diretoria 2026");
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="size-4 text-primary" />
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Etapa 1 de 2</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tighter mb-2">Crie seu bolão corporativo</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Você será o admin, podendo liberar membros e gerenciar pagamentos.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest">Nome do bolão</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => navigate({ to: "/pagamento" })}>
            Continuar para pagamento
          </Button>
        </div>
      </div>
    </div>
  );
}
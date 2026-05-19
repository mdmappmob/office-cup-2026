import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";

export function PagamentoPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="size-4 text-primary" />
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Etapa 2 de 2</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tighter mb-2">Ativar bolão</h1>
        <p className="text-sm text-muted-foreground mb-6">Cobrança única para liberar a liga.</p>
        <div className="border border-border rounded-lg p-4 mb-6 bg-muted/40">
          <div className="flex justify-between mb-2">
            <span className="text-sm">Plano OfficeCup Liga</span>
            <span className="font-mono font-bold">R$ 19,99</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2"><CheckCircle2 className="size-3 text-accent" /> Até 50 membros</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="size-3 text-accent" /> Copilot das Zebras incluso</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="size-3 text-accent" /> Dashboard gamificado</li>
          </ul>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            toast.success("Pagamento confirmado", { description: "Link de convite gerado." });
            navigate({ to: "/gestao" });
          }}
        >
          Confirmar pagamento simulado
        </Button>
      </div>
    </div>
  );
}
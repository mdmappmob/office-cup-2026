import { createFileRoute } from "@tanstack/react-router";
import { PagamentoPage } from "@/pages/Pagamento";

export const Route = createFileRoute("/pagamento")({
  component: PagamentoPage,
});
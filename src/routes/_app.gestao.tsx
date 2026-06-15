import { createFileRoute } from "@tanstack/react-router";
import { GestaoPage } from "@/pages/Gestao";

export const Route = createFileRoute("/_app/gestao")({
  component: GestaoPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { CriarBolaoPage } from "@/pages/CriarBolao";

export const Route = createFileRoute("/criar-bolao")({
  component: CriarBolaoPage,
});
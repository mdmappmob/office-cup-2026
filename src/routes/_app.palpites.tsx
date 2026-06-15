import { createFileRoute } from "@tanstack/react-router";
import { PalpitesPage } from "@/pages/Palpites";

export const Route = createFileRoute("/_app/palpites")({
  component: PalpitesPage,
});

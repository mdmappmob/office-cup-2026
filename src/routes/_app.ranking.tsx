import { createFileRoute } from "@tanstack/react-router";
import { RankingPage } from "@/pages/Ranking";

export const Route = createFileRoute("/_app/ranking")({
  component: RankingPage,
});
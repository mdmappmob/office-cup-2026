import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { Trophy, Calendar, MapPin, Users, Target, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OfficeCup 2026 — Bolão da Copa do Mundo" },
      {
        name: "description",
        content:
          "Participe do bolão corporativo da Copa do Mundo 2026. Faça palpites nos 104 jogos, acompanhe o ranking e dispute o título no escritório.",
      },
      { property: "og:title", content: "OfficeCup 2026 — Bolão da Copa do Mundo" },
      {
        property: "og:description",
        content:
          "Bolão corporativo da Copa do Mundo 2026: 48 seleções, 104 jogos, 3 países-sede. Entre, palpite e dispute o topo do ranking.",
      },
    ],
  }),
  component: HomePage,
});

const HOSTS = [
  { name: "Canadá", iso: "ca" },
  { name: "México", iso: "mx" },
  { name: "Estados Unidos", iso: "us" },
];

const STATS = [
  { icon: Users, label: "Seleções", value: "48" },
  { icon: Target, label: "Jogos", value: "104" },
  { icon: MapPin, label: "Países-sede", value: "3" },
  { icon: Calendar, label: "Início", value: "11/06" },
];

function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-foreground rounded-md flex items-center justify-center">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span className="font-bold tracking-tight">OFFICECUP 26</span>
          </div>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Ir para o painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/login">Criar conta</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
            style={{ backgroundImage: "url(/copa2026.png)" }}
          />
          <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/70 border border-border rounded-full px-3 py-1 mb-6">
              <Trophy className="size-3" />
              FIFA World Cup · 11.JUN — 19.JUL.2026
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.95] max-w-3xl">
              O bolão do seu escritório para a Copa do Mundo 2026.
            </h1>
            <p className="mt-6 text-lg text-foreground/80 max-w-2xl">
              48 seleções, 104 jogos, três países-sede. Palpite em cada partida, acumule pontos e
              veja quem é o craque de plantão entre os colegas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Button asChild size="lg">
                  <Link to="/palpites">Fazer meus palpites</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link to="/login">Entrar no bolão</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/login">Já tenho conta</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="size-10 rounded-md bg-background border border-border flex items-center justify-center">
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight">{value}</div>
                  <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    {label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
            Países-sede
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {HOSTS.map((h) => (
              <div
                key={h.iso}
                className="border border-border rounded-xl p-6 flex items-center gap-4 bg-card"
              >
                <img
                  src={`https://flagcdn.com/${h.iso}.svg`}
                  alt={`Bandeira ${h.name}`}
                  className="w-12 h-8 object-cover rounded-sm border border-border"
                />
                <div>
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Host nation
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
            Como funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                n: "01",
                t: "Crie sua conta",
                d: "Cadastro em segundos — só seu nome, e-mail e senha.",
              },
              {
                n: "02",
                t: "Palpite nos 104 jogos",
                d: "Da fase de grupos à final. Pontos por placar exato, vencedor e zebras. A cada fase a pontuação é multiplicada: 16-avos ×2, Oitavas ×3 e assim até a Final ×6.",
              },
              {
                n: "03",
                t: "Suba no ranking",
                d: "Acompanhe a apuração em tempo real e dispute o topo com seu time.",
              },
            ].map((s) => (
              <div key={s.n} className="border border-border rounded-xl p-6 bg-card">
                <div className="text-xs font-mono text-muted-foreground mb-3">{s.n}</div>
                <div className="font-semibold mb-1">{s.t}</div>
                <div className="text-sm text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span>OfficeCup 2026</span>
          <span>Bolão corporativo · Sem fins lucrativos</span>
        </div>
      </footer>
    </div>
  );
}

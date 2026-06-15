import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { mockProfiles } from "@/mocks/profiles";
import { supabase } from "@/lib/supabase/client";

export function RankingPage() {
  const authUser = useAuthStore((s) => s.user);
  const members = useAppStore((s) => s.members);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const loadFromSupabase = useAppStore((s) => s.loadFromSupabase);
  const sorted = [...members].sort((a, b) => b.total_points - a.total_points);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [leagueName, setLeagueName] = useState("");

  useEffect(() => {
    supabase
      .from("leagues")
      .select("name")
      .limit(1)
      .then(({ data }) => { if (data?.[0]) setLeagueName(data[0].name); })
      .catch(() => {});
    loadFromSupabase();
  }, []);

  useEffect(() => {
    const uids = [...new Set(members.map((m) => m.user_id).filter(Boolean))];
    if (uids.length === 0) return;
    const mock = Object.fromEntries(
      mockProfiles.map((p) => [p.id, p.full_name]),
    );
    const map: Record<string, string> = { ...mock };
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uids.filter((id) => !mock[id]))
      .then(({ data }) => {
        for (const p of data ?? []) map[p.id] = p.full_name;
        setProfiles(map);
      })
      .catch(() => setProfiles(map));
  }, [members, authUser?.id]);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter">Ranking da Firma</h1>
        <p className="text-sm text-muted-foreground">
          Classificação geral dos participantes do bolão.
        </p>
      </header>

      <Card>
        <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              {leagueName || "Bolão da Diretoria 2026"}
            </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 font-mono text-[10px] uppercase tracking-widest">
                  Pos
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                  Membro
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                  Status
                </TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest">
                  Pontos
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((m, idx) => {
                const isMe = m.user_id === currentUserId || m.user_id === authUser?.id;
                const name = profiles[m.user_id] ?? authUser?.full_name ?? "Usuário local";
                return (
                  <TableRow key={m.id} className={isMe ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono">{String(idx + 1).padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                          {name
                            ?.split(" ")
                            .map((x) => x[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <span className={isMe ? "font-bold text-primary" : "font-semibold"}>
                          {name}
                          {isMe && " (você)"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.has_paid_admin ? (
                        <Badge className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/15">
                          PAGO
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-dashed text-muted-foreground">
                          PENDENTE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {m.total_points}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

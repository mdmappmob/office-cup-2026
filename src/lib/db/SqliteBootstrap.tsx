import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { initSqliteRepo, getSqliteName, sqliteListMatches, onSqliteReady } from "./sqlite-repo";
import { useAppStore } from "@/store/app-store";

/**
 * Em browser não existe "caminho de arquivo SQLite". Pedimos um *nome*
 * para a base — ele identifica o registro persistido no IndexedDB.
 */
export function SqliteBootstrap() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const saved = getSqliteName();
    if (saved) {
      initSqliteRepo(saved).catch((e) => console.error("[sqlite] init falhou", e));
    } else {
      setOpen(true);
    }
  }, []);

  // Hidrata a store com os dados do SQLite (substituindo o seed in-memory de mocks)
  useEffect(() => {
    const hydrate = () => {
      const rows = sqliteListMatches();
      if (rows.length > 0) useAppStore.setState({ matches: rows });
    };
    const off = onSqliteReady(hydrate);
    return off;
  }, []);

  const submit = async () => {
    const v = name.trim() || "officecup-2026";
    await initSqliteRepo(v);
    const rows = sqliteListMatches();
    if (rows.length > 0) useAppStore.setState({ matches: rows });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Configurar base SQLite</DialogTitle>
          <DialogDescription>
            Informe um nome para a base. Os dados ficam persistidos localmente no IndexedDB e na próxima visita serão carregados automaticamente — sem recriar tabelas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="db-name">Nome da base</Label>
          <Input
            id="db-name"
            placeholder="ex.: officecup-2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button onClick={submit}>Criar / Abrir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { TEAM_ISO } from "@/lib/teams";
import * as Flags from "country-flag-icons/react/3x2";

/**
 * Renderiza a bandeira do time como SVG. Independe da fonte de emojis do SO
 * (resolve o caso em que Windows não renderiza 🇧🇷). Aceita o nome do time
 * (preferido) ou diretamente o ISO-2.
 */
export function Flag({
  team,
  iso,
  className = "",
  size = 20,
  title,
}: {
  team?: string;
  iso?: string;
  className?: string;
  size?: number;
  title?: string;
}) {
  const code = (iso ?? (team ? TEAM_ISO[team] : "") ?? "").toUpperCase();
  const Component = (Flags as Record<string, React.ComponentType<{ title?: string; className?: string }>>)[code];
  if (!Component) {
    return (
      <span
        aria-label={title ?? team ?? code}
        className={`inline-block bg-muted text-[10px] font-mono font-bold uppercase text-muted-foreground rounded-sm text-center ${className}`}
        style={{ width: size * 1.5, height: size, lineHeight: `${size}px` }}
      >
        {code || "?"}
      </span>
    );
  }
  return (
    <span
      aria-label={title ?? team ?? code}
      className={`inline-block overflow-hidden rounded-sm border border-border/40 align-middle ${className}`}
      style={{ width: size * 1.5, height: size }}
    >
      <Component title={title ?? team ?? code} className="block w-full h-full" />
    </span>
  );
}
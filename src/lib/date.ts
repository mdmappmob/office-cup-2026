export function fmtTime(dateStr: string, tz: string): string {
  return new Date(dateStr).toLocaleString("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(dateStr: string, tz: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
  });
}

export function fmtDateTime(dateStr: string, tz: string): string {
  return new Date(dateStr).toLocaleString("pt-BR", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

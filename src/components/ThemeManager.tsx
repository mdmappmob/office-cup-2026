import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

export function ThemeManager() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}

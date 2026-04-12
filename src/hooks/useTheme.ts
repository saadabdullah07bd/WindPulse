import { useEffect, useState } from "react";

export type ThemeName = "light" | "dark" | "midnight" | "ocean" | "rose" | "monochrome" | "forest" | "sand";

export const THEMES: { id: ThemeName; label: string; preview: string }[] = [
  { id: "light", label: "Light", preview: "bg-[hsl(30,15%,90%)]" },
  { id: "dark", label: "Dark", preview: "bg-[hsl(25,12%,8%)]" },
  { id: "midnight", label: "Midnight", preview: "bg-[hsl(230,25%,10%)]" },
  { id: "ocean", label: "Ocean", preview: "bg-[hsl(200,30%,12%)]" },
  { id: "rose", label: "Rosé", preview: "bg-[hsl(340,20%,92%)]" },
  { id: "monochrome", label: "Mono", preview: "bg-[hsl(0,0%,7%)]" },
  { id: "forest", label: "Forest", preview: "bg-[hsl(150,20%,10%)]" },
  { id: "sand", label: "Sand", preview: "bg-[hsl(35,20%,93%)]" },
];

const ALL_THEME_CLASSES = THEMES.map(t => t.id).filter(id => id !== "light");

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("windpulse-theme") as ThemeName | null;
    if (saved && THEMES.some(t => t.id === saved)) return saved;
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...ALL_THEME_CLASSES);
    if (theme !== "light") root.classList.add(theme);
    localStorage.setItem("windpulse-theme", theme);
  }, [theme]);

  const dark = theme !== "light" && theme !== "rose" && theme !== "sand";

  return {
    theme,
    dark,
    setTheme: setThemeState,
    toggle: () => setThemeState(t => t === "light" ? "dark" : "light"),
  };
}

export type ThemeName = "light";

export function useTheme() {
  return {
    theme: "light" as ThemeName,
    dark: false,
    setTheme: (_t: ThemeName) => {},
    toggle: () => {},
  };
}

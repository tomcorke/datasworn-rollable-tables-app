export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "datasworn.theme";

export function resolveTheme(
  savedTheme: string | null,
  prefersDark: boolean,
): Theme {
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return prefersDark ? "dark" : "light";
}

export function getSavedTheme(
  storage?: Pick<Storage, "getItem"> | null,
): Theme | null {
  try {
    const saved = (storage ?? window.localStorage).getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(matchMedia?: typeof window.matchMedia): Theme {
  try {
    return (matchMedia ?? window.matchMedia)("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export function persistTheme(
  theme: Theme,
  storage?: Pick<Storage, "setItem"> | null,
): void {
  try {
    (storage ?? window.localStorage).setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still applies for this page when storage is blocked.
  }
}

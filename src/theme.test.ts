import { describe, expect, it, vi } from "vitest";
import {
  getSavedTheme,
  getSystemTheme,
  persistTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "./theme";

describe("theme helpers", () => {
  it("resolves a saved choice before the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("uses the system preference without treating invalid storage as a choice", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("invalid", false)).toBe("light");
  });

  it("handles unavailable storage and matchMedia", () => {
    const blockedStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(getSavedTheme(blockedStorage)).toBeNull();
    expect(
      getSystemTheme(() => {
        throw new Error("unavailable");
      }),
    ).toBe("light");
  });

  it("persists only when explicitly called", () => {
    const setItem = vi.fn();
    const storage = { setItem };

    expect(resolveTheme(null, true)).toBe("dark");
    expect(setItem).not.toHaveBeenCalled();

    persistTheme("light", storage);
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");
  });

  it("ignores blocked persistence", () => {
    expect(() =>
      persistTheme("dark", {
        setItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
  });
});

import { describe, expect, test } from "bun:test"
import { isValidDesktopTheme, loadThemeFromUrl } from "./loader"

const seeds = {
  neutral: "#111111",
  primary: "#222222",
  success: "#333333",
  warning: "#444444",
  error: "#555555",
  info: "#666666",
  interactive: "#777777",
  diffAdd: "#888888",
  diffDelete: "#999999",
}

const palette = {
  neutral: "#111111",
  ink: "#222222",
  primary: "#333333",
  success: "#444444",
  warning: "#555555",
  error: "#666666",
  info: "#777777",
}

describe("isValidDesktopTheme", () => {
  test("accepts themes with seed and palette variants", () => {
    expect(
      isValidDesktopTheme({
        name: "Theme",
        id: "custom-theme",
        light: { seeds },
        dark: { palette },
      }),
    ).toBe(true)
  })

  test("accepts schema-compatible token overrides", () => {
    expect(
      isValidDesktopTheme({
        name: "Theme",
        id: "custom-theme",
        light: { seeds, overrides: { background: "var(--surface-base)" }, v2Overrides: { surface: "oklch(0 0 0)" } },
        dark: { palette },
      }),
    ).toBe(true)
  })

  test("rejects invalid ids, incomplete colors, and conflicting variants", () => {
    expect(isValidDesktopTheme({ name: "Theme", id: "Custom Theme", light: { seeds }, dark: { seeds } })).toBe(false)
    expect(
      isValidDesktopTheme({
        name: "Theme",
        id: "custom-theme",
        light: { seeds: { ...seeds, primary: "red" } },
        dark: { seeds },
      }),
    ).toBe(false)
    expect(isValidDesktopTheme({ name: "Theme", id: "custom-theme", light: { seeds, palette }, dark: { seeds } })).toBe(
      false,
    )
  })
})

describe("loadThemeFromUrl", () => {
  test("rejects non-HTTP URLs", async () => {
    expect(await loadThemeFromUrl("file:///theme.json")).toEqual({ ok: false, error: "url" })
  })
})

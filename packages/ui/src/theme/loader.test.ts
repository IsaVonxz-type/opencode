import { describe, expect, test } from "bun:test"
import { isValidDesktopTheme, loadDesktopTheme } from "./loader"

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

describe("loadDesktopTheme", () => {
  test("converts a TUI theme file into a Desktop theme", () => {
    const theme = loadDesktopTheme(
      {
        defs: {
          base: "#111111",
          foreground: "#eeeeee",
          accent: "#445566",
        },
        theme: {
          background: "base",
          text: "foreground",
          primary: { light: "accent", dark: "#778899" },
          success: "#228844",
          warning: "#ccaa22",
          error: "#cc3344",
          info: "#3377cc",
          syntaxComment: "#777777",
        },
      },
      "custom-theme",
    )

    expect(theme?.id).toBe("custom-theme")
    expect(theme?.light.palette).toMatchObject({
      neutral: "#111111",
      ink: "#eeeeee",
      primary: "#445566",
    })
    expect(theme?.dark.palette).toMatchObject({
      neutral: "#111111",
      ink: "#eeeeee",
      primary: "#778899",
    })
    expect(theme?.light.overrides?.["syntax-comment"]).toBe("#777777")
  })

  test("converts repository TUI theme files from the shared themes directory", async () => {
    const source: unknown = await Bun.file(new URL("../../../../.opencode/themes/mytheme.json", import.meta.url)).json()
    const theme = loadDesktopTheme(source, "mytheme")

    expect(theme).toMatchObject({
      id: "mytheme",
      light: { palette: { neutral: "#ECEFF4", primary: "#5E81AC", accent: "#8FBCBB" } },
      dark: { palette: { neutral: "#2E3440", primary: "#88C0D0", accent: "#8FBCBB" } },
      name: "Mytheme",
    })
    expect(theme?.dark.overrides?.["background-base"]).toBe("#2E3440")
  })
})

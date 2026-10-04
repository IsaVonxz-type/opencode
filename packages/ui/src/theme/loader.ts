import type {
  DesktopTheme,
  HexColor,
  ResolvedTheme,
  ResolvedV2Theme,
  ThemePaletteColors,
  ThemeSeedColors,
} from "./types"
import { resolveThemeVariant, themeToCss } from "./resolve"
import { resolveThemeVariantV2, themeV2ToCss } from "./v2/resolve"

let activeTheme: DesktopTheme | null = null
const THEME_STYLE_ID = "opencode-theme"

function ensureLoaderStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null
  if (existing) {
    return existing
  }
  const element = document.createElement("style")
  element.id = THEME_STYLE_ID
  document.head.appendChild(element)
  return element
}

export function applyTheme(theme: DesktopTheme, themeId?: string): void {
  activeTheme = theme
  const lightTokens = resolveThemeVariant(theme.light, false)
  const darkTokens = resolveThemeVariant(theme.dark, true)
  const lightV2Tokens = resolveThemeVariantV2(theme.light, false)
  const darkV2Tokens = resolveThemeVariantV2(theme.dark, true)
  const targetThemeId = themeId ?? theme.id
  const css = buildThemeCss(lightTokens, darkTokens, lightV2Tokens, darkV2Tokens, targetThemeId)
  const themeStyleElement = ensureLoaderStyleElement()
  themeStyleElement.textContent = css
  document.documentElement.setAttribute("data-theme", targetThemeId)
}

function buildThemeCss(
  light: ResolvedTheme,
  dark: ResolvedTheme,
  lightV2: ResolvedV2Theme,
  darkV2: ResolvedV2Theme,
  themeId: string,
): string {
  const isDefaultTheme = themeId === "oc-2"
  const lightCss = `${themeToCss(light)}\n  ${themeV2ToCss(lightV2)}`
  const darkCss = `${themeToCss(dark)}\n  ${themeV2ToCss(darkV2)}`

  if (isDefaultTheme) {
    return `
:root {
  color-scheme: light;
  --text-mix-blend-mode: multiply;

  ${lightCss}

  @media (prefers-color-scheme: dark) {
    color-scheme: dark;
    --text-mix-blend-mode: plus-lighter;

    ${darkCss}
  }
}
`
  }

  return `
html[data-theme="${themeId}"] {
  color-scheme: light;
  --text-mix-blend-mode: multiply;

  ${lightCss}

  @media (prefers-color-scheme: dark) {
    color-scheme: dark;
    --text-mix-blend-mode: plus-lighter;

    ${darkCss}
  }
}
`
}

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const THEME_ID_PATTERN = /^[a-z0-9-]+$/
const COLOR_VALUE_PATTERN = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|var\(--[a-z0-9-]+\))$/
const SEED_KEYS: (keyof ThemeSeedColors)[] = [
  "neutral",
  "primary",
  "success",
  "warning",
  "error",
  "info",
  "interactive",
  "diffAdd",
  "diffDelete",
]
const PALETTE_KEYS: (keyof ThemePaletteColors)[] = [
  "neutral",
  "ink",
  "primary",
  "success",
  "warning",
  "error",
  "info",
  "accent",
  "interactive",
  "diffAdd",
  "diffDelete",
]
const TUI_OVERRIDES: Record<string, string> = {
  primary: "surface-interactive-base",
  secondary: "surface-interactive-weak",
  accent: "syntax-constant",
  text: "text-base",
  textMuted: "text-weak",
  selectedListItemText: "text-on-interactive-base",
  background: "background-base",
  backgroundPanel: "surface-raised-base",
  backgroundElement: "surface-base",
  backgroundMenu: "surface-float-base",
  border: "border-weak-base",
  borderActive: "border-strong-base",
  borderSubtle: "border-weaker-base",
  diffAdded: "text-diff-add-base",
  diffRemoved: "text-diff-delete-base",
  diffAddedBg: "surface-diff-add-base",
  diffRemovedBg: "surface-diff-delete-base",
  diffContextBg: "surface-diff-unchanged-base",
  markdownText: "markdown-text",
  markdownHeading: "markdown-heading",
  markdownLink: "markdown-link",
  markdownLinkText: "markdown-link-text",
  markdownCode: "markdown-code",
  markdownBlockQuote: "markdown-block-quote",
  markdownEmph: "markdown-emph",
  markdownStrong: "markdown-strong",
  markdownHorizontalRule: "markdown-horizontal-rule",
  markdownListItem: "markdown-list-item",
  markdownListEnumeration: "markdown-list-enumeration",
  markdownImage: "markdown-image",
  markdownImageText: "markdown-image-text",
  markdownCodeBlock: "markdown-code-block",
  syntaxComment: "syntax-comment",
  syntaxKeyword: "syntax-keyword",
  syntaxFunction: "syntax-function",
  syntaxVariable: "syntax-variable",
  syntaxString: "syntax-string",
  syntaxNumber: "syntax-number",
  syntaxType: "syntax-type",
  syntaxOperator: "syntax-operator",
  syntaxPunctuation: "syntax-punctuation",
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isHexColor(value: unknown): value is HexColor {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value)
}

function validColors(value: unknown, keys: string[], required: string[], pattern: RegExp) {
  if (!record(value)) return false
  if (Object.keys(value).some((key) => !keys.includes(key))) return false
  return (
    required.every((key) => typeof value[key] === "string" && pattern.test(value[key])) &&
    Object.values(value).every((color) => typeof color === "string" && pattern.test(color))
  )
}

function isValidVariant(value: unknown) {
  if (!record(value)) return false
  const hasSeeds = "seeds" in value
  const hasPalette = "palette" in value
  if (hasSeeds === hasPalette) return false
  if (hasSeeds && !validColors(value.seeds, SEED_KEYS, SEED_KEYS, HEX_COLOR_PATTERN)) return false
  if (
    hasPalette &&
    !validColors(
      value.palette,
      PALETTE_KEYS,
      ["neutral", "ink", "primary", "success", "warning", "error", "info"],
      HEX_COLOR_PATTERN,
    )
  ) {
    return false
  }
  if (value.overrides !== undefined) {
    if (!record(value.overrides)) return false
    if (Object.values(value.overrides).some((color) => typeof color !== "string" || !COLOR_VALUE_PATTERN.test(color))) {
      return false
    }
  }
  if (value.v2Overrides !== undefined) {
    if (!record(value.v2Overrides)) return false
    if (Object.values(value.v2Overrides).some((color) => typeof color !== "string")) return false
  }
  return true
}

export function isValidDesktopTheme(value: unknown): value is DesktopTheme {
  if (!record(value)) return false
  if (typeof value.name !== "string" || typeof value.id !== "string" || !THEME_ID_PATTERN.test(value.id)) return false
  if (value.$schema !== undefined && typeof value.$schema !== "string") return false
  return isValidVariant(value.light) && isValidVariant(value.dark)
}

export function loadDesktopTheme(value: unknown, id: string): DesktopTheme | undefined {
  if (isValidDesktopTheme(value)) return value
  if (!record(value) || !record(value.theme)) return undefined
  if (!THEME_ID_PATTERN.test(id)) return undefined

  const colors = value.theme
  const defs = record(value.defs) ? value.defs : {}
  const colorValue = (input: unknown, mode: "light" | "dark", visited: string[]): HexColor | undefined => {
    if (isHexColor(input)) return input
    if (typeof input === "string") {
      if (input === "none" || input === "transparent" || visited.includes(input)) return undefined
      const reference = Object.hasOwn(defs, input) ? defs[input] : colors[input]
      if (reference === undefined) return undefined
      return colorValue(reference, mode, [...visited, input])
    }
    if (!record(input)) return undefined
    return colorValue(input[mode] ?? input.dark ?? input.light, mode, visited)
  }
  const color = (name: string, mode: "light" | "dark"): HexColor | undefined => {
    const input = colors[name]
    if (typeof input === "number") return undefined
    return colorValue(input, mode, [])
  }

  const palette = (mode: "light" | "dark") => ({
    neutral: color("background", mode) ?? "#f7f7f7",
    ink: color("text", mode) ?? "#171311",
    primary: color("primary", mode) ?? "#dcde8d",
    success: color("success", mode) ?? "#12c905",
    warning: color("warning", mode) ?? "#ffdc17",
    error: color("error", mode) ?? "#fc533a",
    info: color("info", mode) ?? "#a753ae",
    accent: color("accent", mode),
    interactive: color("primary", mode),
    diffAdd: color("diffAdded", mode),
    diffDelete: color("diffRemoved", mode),
  })
  const overrides = (mode: "light" | "dark") =>
    Object.fromEntries(
      Object.entries(TUI_OVERRIDES).flatMap(([source, target]) => {
        const value = color(source, mode)
        return value ? [[target, value]] : []
      }),
    )

  return {
    $schema: "https://opencode.ai/desktop-theme.json",
    id,
    name: id.replace(/(^|-)([a-z])/g, (match) => match.toUpperCase()).replaceAll("-", " "),
    light: { palette: palette("light"), overrides: overrides("light") },
    dark: { palette: palette("dark"), overrides: overrides("dark") },
  }
}

export function getActiveTheme(): DesktopTheme | null {
  const activeId = document.documentElement.getAttribute("data-theme")
  if (!activeId) {
    return null
  }
  if (activeTheme?.id === activeId) {
    return activeTheme
  }
  return null
}

export function removeTheme(): void {
  activeTheme = null
  const existingElement = document.getElementById(THEME_STYLE_ID)
  if (existingElement) {
    existingElement.remove()
  }
  document.documentElement.removeAttribute("data-theme")
}

export function setColorScheme(scheme: "light" | "dark" | "auto"): void {
  if (scheme === "auto") {
    document.documentElement.style.removeProperty("color-scheme")
  } else {
    document.documentElement.style.setProperty("color-scheme", scheme)
  }
}

import type { DesktopTheme, ResolvedTheme, ResolvedV2Theme, ThemePaletteColors, ThemeSeedColors } from "./types"
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

export type LoadThemeResult = { ok: true; theme: DesktopTheme } | { ok: false; error: "network" | "invalid" | "url" }

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

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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

export async function loadThemeFromUrl(url: string): Promise<LoadThemeResult> {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return { ok: false, error: "url" }
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return { ok: false, error: "url" }

  const response = await fetch(target).catch(() => undefined)
  if (!response?.ok) return { ok: false, error: "network" }

  const json = await response.json().catch(() => undefined)
  if (!isValidDesktopTheme(json)) return { ok: false, error: "invalid" }
  return { ok: true, theme: json }
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

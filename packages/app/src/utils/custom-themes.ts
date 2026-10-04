import { loadDesktopTheme, type DesktopTheme } from "@opencode-ai/ui/theme"

type ThemeSourceSDK = {
  client: {
    path: {
      get: (input: { directory: string }) => Promise<{ data?: { config?: string; worktree?: string } }>
    }
  }
  createClient: (input: { directory: string; throwOnError: true }) => {
    file: {
      list: (input: { path: string }) => Promise<{ data?: { type: string; name: string; path: string }[] }>
      read: (input: { path: string }) => Promise<{ data?: { type: "text" | "binary"; content: string } }>
    }
  }
}

export async function loadCustomThemes(input: { sdk: ThemeSourceSDK; directory: string }) {
  const pathInfo = (await input.sdk.client.path.get({ directory: input.directory }).catch(() => undefined))?.data
  const sources = [
    ...(pathInfo?.config ? [{ directory: pathInfo.config, path: "themes" }] : []),
    ...(pathInfo?.worktree ? [{ directory: pathInfo.worktree, path: ".opencode/themes" }] : []),
    { directory: input.directory, path: ".opencode/themes" },
  ].filter(
    (source, index, all) =>
      all.findIndex((item) => item.directory === source.directory && item.path === source.path) === index,
  )

  const themes = new Map<string, { id: string; theme: DesktopTheme }>()
  for (const source of sources) {
    const sdk = input.sdk.createClient({ directory: source.directory, throwOnError: true })
    const entries = (await sdk.file.list({ path: source.path }).catch(() => undefined))?.data ?? []
    const loaded = await Promise.all(
      entries
        .filter((entry) => entry.type === "file" && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const content = (await sdk.file.read({ path: entry.path }).catch(() => undefined))?.data
          if (!content || content.type !== "text") return undefined
          try {
            const value: unknown = JSON.parse(content.content)
            const theme = loadDesktopTheme(value, entry.name.slice(0, -".json".length))
            if (!theme) return undefined
            return { id: theme.id, theme }
          } catch {
            return undefined
          }
        }),
    )
    loaded.forEach((theme) => theme && themes.set(theme.id, theme))
  }
  return [...themes.values()]
}

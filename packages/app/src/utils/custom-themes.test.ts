import { expect, test } from "bun:test"
import { loadCustomThemes } from "./custom-themes"

const makeTheme = (background: string) => ({
  defs: { background },
  theme: {
    background: "background",
    text: "#eeeeee",
    primary: "#222222",
    success: "#333333",
    warning: "#444444",
    error: "#555555",
    info: "#666666",
  },
})

test("loads global and project themes with project files taking precedence", async () => {
  const directories: string[] = []
  const themes = await loadCustomThemes({
    directory: "/project",
    sdk: {
      client: {
        path: {
          get: async () => ({ data: { config: "/config", worktree: "/project" } }),
        },
      },
      createClient: (input) => {
        directories.push(input.directory)
        return {
          file: {
            list: async () => ({
              data: [{ type: "file", name: "shared-theme.json", path: "themes/shared-theme.json" }],
            }),
            read: async () => ({
              data: {
                type: "text",
                content: JSON.stringify(makeTheme(input.directory === "/config" ? "#111111" : "#222222")),
              },
            }),
          },
        }
      },
    },
  })

  expect(directories).toEqual(["/config", "/project"])
  expect(themes).toHaveLength(1)
  expect(themes[0]).toMatchObject({
    id: "shared-theme",
    theme: { name: "Shared Theme", id: "shared-theme", dark: { palette: { neutral: "#222222" } } },
  })
})

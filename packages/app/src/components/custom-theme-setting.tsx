import { createStore } from "solid-js/store"
import { Button } from "@opencode-ai/ui/button"
import { TextField } from "@opencode-ai/ui/text-field"
import { useTheme } from "@opencode-ai/ui/theme/context"
import { useLanguage } from "@/context/language"

export function CustomThemeSetting() {
  const language = useLanguage()
  const theme = useTheme()
  const [state, setState] = createStore({ url: theme.customThemeUrl(), loading: false, error: "" })

  const load = async () => {
    setState({ loading: true, error: "" })
    const result = await theme.setCustomThemeFromUrl(state.url.trim())
    setState({
      loading: false,
      error: result.ok
        ? ""
        : language.t(
            result.error === "network"
              ? "settings.general.row.customTheme.error.network"
              : result.error === "url"
                ? "settings.general.row.customTheme.error.url"
                : "settings.general.row.customTheme.error.invalid",
          ),
    })
  }

  return (
    <div class="flex w-full flex-col gap-2 sm:w-[320px]">
      <div class="flex items-center gap-2">
        <TextField
          data-action="settings-custom-theme-url"
          label={language.t("settings.general.row.customTheme.title")}
          hideLabel
          type="url"
          value={state.url}
          onChange={(url) => setState("url", url)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !state.loading && state.url.trim()) void load()
          }}
          placeholder={language.t("settings.general.row.customTheme.placeholder")}
          spellcheck={false}
          autocorrect="off"
          autocomplete="url"
          autocapitalize="off"
          class="text-12-regular"
          disabled={state.loading}
          error={state.error}
        />
        <Button
          size="small"
          variant="secondary"
          disabled={state.loading || !state.url.trim()}
          onClick={() => void load()}
        >
          {language.t(
            state.loading ? "settings.general.row.customTheme.loading" : "settings.general.row.customTheme.load",
          )}
        </Button>
      </div>
      <Button
        size="small"
        variant="ghost"
        class="self-end"
        disabled={state.loading || !theme.customThemeUrl()}
        onClick={() => {
          theme.removeCustomTheme()
          setState({ url: "", error: "" })
        }}
      >
        {language.t("settings.general.row.customTheme.remove")}
      </Button>
    </div>
  )
}

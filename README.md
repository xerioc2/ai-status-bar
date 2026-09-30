# AIUP: AI Service Status

Reported AI service incidents in one VS Code status bar item. Hover for provider reports, affected components, incident severity, response stage, latest update, and last checked time. Click to open **AI Status** as a collapsible section in the Explorer sidebar, alongside Outline and Timeline. It starts collapsed; collapse its header when you want it tucked away, or right-click the header and uncheck AI Status to hide it. Each provider has a 30-day incident-history graph. Select its name to open the official status page, hover or keyboard-focus a daily bar for incidents, and expand **Report details** for the current report. The view updates automatically and includes a Refresh button.

The graphs show **days with reported incidents**. A colored bar does not mean the service was down all day; its color represents the worst published incident impact overlapping that UTC day. Green means no incident in the returned feed for that day. Faint outlines mean history is unavailable; striped bars mean an incident has unknown impact. Colors follow your VS Code theme, and hovering or focusing a bar shows its date and incident details. Dates before the oldest returned incident remain unknown, and empty feeds never produce invented green history. Feeds are bounded and may omit incidents; these graphs are not measured uptime and do not reproduce official uptime percentages. History is provider-wide, not per product, and scheduled-maintenance history is not included. The last bar covers only the portion of that date included in the fetched report.

Claude, GitHub, and Cursor history is cached for 30 minutes independently of current status; failed optional history requests preserve current status and any cached graph. **Report details** shows when history was fetched. OpenAI and Perplexity require the incident feed for current status, so those feeds stay fresh on every poll. Refreshes preserve expanded report sections, scroll position, keyboard focus, and dashboard edits.

**This extension reports only what providers publish.** “No reported incidents” is not a guarantee of availability. Reports can lag real problems and may cover products beyond the AI tool you use. Unknown means the status API could not be read or returned an unexpected value; it does not mean the provider is down.

## Supported providers

Anthropic (Claude), OpenAI (ChatGPT / Codex), GitHub (including Copilot), Cursor, and Perplexity. Google Gemini and DeepSeek are not yet supported; see [provider reconnaissance](PROVIDER_RECON.md) for verified endpoints and limitations.

## Status bar

| Indicator | Meaning |
| --- | --- |
| Checkmark · AI | All enabled providers report no incidents |
| Warning · AI: count | Providers reporting degradation, partial outage, or maintenance |
| Error · AI: count | At least one provider reports a major outage |
| Question mark · AI | Unknown coverage, with no known reported issues; also used when none are enabled |

The count is affected providers, not incidents. Reported issues take precedence over unknowns. Mixed clear/unknown results show a question mark; the tooltip always lists each provider separately. Active incidents with unspecified impact receive a warning. Scheduled future maintenance does not count as a current incident.

## Install

Requires VS Code **1.138.0 or newer**. This project is preparing its first Marketplace release; no Marketplace listing is claimed yet.

To install a packaged build, run **Extensions: Install from VSIX...** from the Command Palette and select `ai-provider-status-monitor-0.1.0.vsix`, or run `code --install-extension ai-provider-status-monitor-0.1.0.vsix`. To build that file from source, use `npm ci` then `npm run package`.

## Run locally

Development requires Node.js 22 or newer and VS Code 1.138.0 or newer.

```sh
npm ci
npm test
npm run lint
```

Open this directory in VS Code and press **F5**, using **Run AI Status Bar**. The launch task compiles TypeScript and opens an Extension Development Host. On Windows with PowerShell script restrictions, use `npm.cmd` instead of `npm` in terminal commands.

The default launch runs without attaching a debugger and disables other installed extensions in the development window. Choose **Debug AI Status Bar** when you need breakpoints. If an older development window shows “Extension host did not start in 10 seconds,” close it, stop the previous launch in the original window, and start **Run AI Status Bar** again. Reloading that stalled window reuses its debugger-waiting launch arguments.

## Dashboard and settings

Open **AI Status: Open Dashboard** from the Command Palette, or click **Open Dashboard** in the AI Status sidebar header. The editor page puts status and history first. Expand **Customize providers** for provider checkboxes and compact up/down ordering buttons. Click **Save changes** to apply your selection and order everywhere; **Reset changes** restores saved settings. Unsaved edits survive switching tabs while the page is open. Closing the dashboard discards unsaved edits. Opening it again focuses the existing tab when one is already open.

Use the **Choose Providers** button in the AI Status section header to check which providers appear. Use **Order Providers** to move them with the row's up/down arrows, then press Enter to save (Escape cancels). The sidebar and status-bar tooltip immediately follow that order. Choices are saved in user settings unless the workspace already overrides the provider list, in which case that override is updated.

In multi-root workspaces, AI Status consistently uses the first workspace folder's settings. If that folder has a provider override, saves update that same folder; other folders are left unchanged. Otherwise, the workspace override or user setting is used.

| Setting | Default | Description |
| --- | --- | --- |
| `aiStatus.enabledProviders` | All verified providers | IDs in display order: `anthropic`, `openai`, `github`, `cursor`, `perplexity`. Set `[]` to disable monitoring. Unknown and duplicate IDs are ignored. |
| `aiStatus.pollIntervalMinutes` | `3` | At least `1` minute; invalid values fall back to 3. |

```json
{
  "aiStatus.enabledProviders": ["anthropic", "openai", "github"],
  "aiStatus.pollIntervalMinutes": 3
}
```

Settings apply without reloading. Provider selection updates immediately; checks respect a one-minute cooldown even after reconfiguration. A settings change or manual refresh during cooldown queues a check for the first allowed moment, at most one minute after the last check started. Scheduled checks are timed from the latest check instead of skipped when a timer fires early. Disabling the extension aborts requests and clears timers and listeners.

Commands in the Command Palette:

- **AI Status: Refresh** — check now, subject to the one-minute minimum; concurrent refreshes share a request cycle.
- **AI Status: Show Details** — reveal the provider history in the Explorer sidebar.
- **AI Status: Open Dashboard** — open the full editor page with provider preferences and history.
- **AI Status: Choose Providers** — choose which providers appear and are polled.
- **AI Status: Order Providers** — arrange enabled providers using up/down arrows.

## Privacy and network behavior

Requests time out after 10 seconds. Failures replace previously successful status with Unknown. No authentication, telemetry, backend, notifications, or runtime dependencies. Requests go directly to enabled providers' official status APIs; their operators receive ordinary HTTP connection metadata. Each open VS Code window runs its own checks. No workspace files or source code are sent. Icons are bundled locally. Clicking an external link opens the relevant site in your browser.

## Development

Suggestions and bug reports are welcome in [GitHub issues](https://github.com/xerioc2/ai-status-bar/issues), and contributions are welcome via pull requests. Both views include links to the repository and contribution guide. Provider icons are bundled locally; attribution is in [resources/icons/README.md](resources/icons/README.md).

See [CONTRIBUTING.md](CONTRIBUTING.md). `npm test` runs offline Mocha unit tests; `npm run test:extension` runs tests in a downloaded VS Code host using the standard VS Code test tools.

The API types are pinned to the minimum supported VS Code release, and the extension-host suite defaults to that version. CI also tests current stable VS Code.

## License and affiliation

[AIUP on GitHub](https://github.com/xerioc2/ai-status-bar) is released under the [MIT license](LICENSE). Bundled provider icons retain their [Simple Icons CC0 license and attribution](resources/icons/README.md). Provider names and logos belong to their respective owners. This project is independent and is not affiliated with or endorsed by those providers. The extension's own icon is original project artwork.

# Contributing

Keep adapters small, parsers pure, and wording honest. Provider-specific code must not enter the poller or UI. There are no runtime dependencies.

## Add a Statuspage provider

1. Find the provider's official status page and fetch its public `/api/v2/summary.json` and `/api/v2/incidents.json` endpoints. Verify the summary is JSON with components, status, and incidents, and the history has dated incident records. Save real responses as `test/fixtures/<id>.json` and `test/fixtures/<id>-all.json` and record the date, platform, endpoints, and scope in `PROVIDER_RECON.md`. Never infer current status by scraping HTML.
2. Add one entry in `src/providers/registry.ts`:

   ```ts
   { id: 'example', icon: 'example.svg', displayName: 'Example AI', statusPageUrl: 'https://status.example.com', platform: 'statuspage' },
   ```

   Add the local SVG to `resources/icons/` and record its source and license there. Icons are optional; omit `icon` if no suitable asset is available. The webviews resolve registry metadata into local resource URLs; no UI ID list or CSS edits are needed.
3. Update the default provider list in `package.json` in the same order as the registry, and update the README provider list. Registry tests enforce unique IDs, matching defaults, icon assets, and both fixtures. Fixture tests discover registry entries automatically and accept captures taken during outages; do not alter a real response to make it green.
4. Run the verification commands below. Synthetic tests should cover semantics; real fixtures test structure, valid output, and non-mutation. Record fixture capture times in `PROVIDER_RECON.md`.

For an incident.io compatibility API, verify and save both summary and `/api/v2/incidents.json` responses. Use `platform: 'incidentio'` and name the second fixture `<id>-all.json`. This mode fetches both feeds and filters resolved history. Do not assume the unresolved endpoint exists. An incomplete or failed feed makes the whole provider Unknown.

## Add a platform adapter

Create a directory under `src/providers/`. Implement the `StatusProvider` interface (`id`, `displayName`, `statusPageUrl`, `fetchStatus(signal)`). Honor the supplied AbortSignal for every request, check HTTP status, and throw on transport errors or invalid payloads. The poller owns timeout, error conversion, rate limiting, and lifecycle.

Put parsing in a separate pure mapper accepting unknown JSON, identity, and check time, returning `ServiceStatus`. Keep level and incident stage separate. Unexpected severity maps to Unknown; unexpected incident stage currently maps conservatively to Investigating with Unknown impact because the four-stage model has no Unknown stage. Map maintenance stages to their nearest response stage and document the choice. Never silently turn malformed data into an all-clear.

Add the platform name to `StatusPlatform` in `StatusProvider.ts` and choose the new adapter by `definition.platform` in `createProviders` (`registry.ts`). No poller or UI modifications should be needed. Add real fixture tests and synthetic tests for all upstream values, malformed data, resolved history, and active maintenance. Do not guess severity from incident prose.

## Source layout

- `src/core`: common model, severity ordering, and shared reported-incident minimum severity.
- `src/providers`: definitions, HTTP adapters, and pure mapping.
- `src/services/StatusPoller.ts`: independent concurrent checks and disposable lifecycle.
- `src/ui`: pure formatting and VS Code rendering. Status labels and status bar theme keys live in `formatters.ts`; provider logo metadata lives in the registry. Webview layout and chart colors live in `resources/styles.css`; `webviewPage.ts` holds shared CSP, resource URLs, and script setup.
- `src/projectMetadata.ts`: derives webview project links from the shipped `package.json`.
- `src/config/settings.ts`: settings validation.
- `src/extension.ts`: activation wiring only.

The poller owns cycle timers and request controllers and is registered in `context.subscriptions`. The Statuspage adapter additionally bounds optional history with a short timeout. Every cycle aborts remaining signal-bound work on completion, failure, or cancellation. Update subscriptions, views, commands, and configuration listeners are disposable. Do not add unowned timers or listeners.

The history views use escaped provider text, local nonce-restricted scripts, and a restrictive content security policy. `detailsHtml.ts` renders responsive daily bars; `historyMapper.ts` handles UTC day intervals independently from current status. No external chart library, telemetry, or browser-side remote requests are used.

The editor dashboard reuses the same history renderer and adds a script for provider preferences. `StatusPage.ts` validates messages before saving settings; `resources/status-page.js` owns the unsaved form draft. Both views use `resources/history-view.js` to preserve expanded reports, scroll, and focus when graph rows update. Provider ordering is computed in `providerSelection.ts` and sent to the dashboard. Webview delivery is disposal-safe. The extension-host suite exercises the real browser DOM and isolated two-folder settings fixtures; no personal settings are changed. Test both views when changing the shared renderer.

Keep provider instances alive across settings changes so the 30-minute optional history cache survives reordering. Only Atlassian Statuspage history is optional; incident.io history remains required on every check because summary omits current incidents. A failed optional history request is retried after 5 minutes; a cancelled one is retried on the next check. Cached graphs retain their original fetch time and never extrapolate current uptime. Poll scheduling uses one replaceable deadline timer; cooldown requests reschedule instead of dropping work.

## Verify

```sh
npm ci
npm run typecheck
npm test
npm run lint
npm run format:check
npm run test:extension
npm run package
```

The TypeScript/Mocha and `@vscode/test-cli` / `@vscode/test-electron` tools match the standard VS Code generator approach. Offline tests use no live APIs. The extension-host suite downloads VS Code on first run and needs a graphical desktop. Live fixtures must not be rewritten during ordinary tests.

Development uses Node.js 22 or newer. The minimum VS Code version is 1.138.0 and `@types/vscode` is pinned to that exact API version. Tests default to the manifest minimum; set `VSCODE_TEST_VERSION=stable` to test the latest stable release. CI tests both versions on Linux with Xvfb. Raise the engine floor and pinned types together only after testing the new floor.

Use two spaces, UTF-8, and LF as described in `.editorconfig`. `npm run format` normalizes line endings, final newlines, and trailing whitespace; `format:check` enforces those rules in CI. This deliberately preserves the existing TypeScript layout instead of reformatting working code. ESLint handles code correctness. Captured fixtures and vendor icons are excluded from whitespace rewriting.

`npm run package` uses the locked development-only `@vscode/vsce` tool. Install the generated VSIX in a separate profile for a smoke test. Check activation, provider settings, sidebar, dashboard, and icon loading. Package output excludes tests, development tools, and source maps. The Marketplace publisher is `MichaelBlythe`, separate from the GitHub account `xerioc2`. Packaging does not publish or create a publisher.

The neutral Marketplace icon is original project artwork; `scripts/create-icon.ps1` regenerates `resources/icon.png` on Windows. Provider logos retain separate attribution and must not become the extension's own branding.

## Deferred history recovery

Malformed individual history dates currently make the graph unavailable, while valid current status remains visible. Skipping such incidents could mark an affected day green because their time range is unknown. Per-entry recovery is deferred until the history model can explicitly represent uncertain coverage; current-status parsing must remain conservative.

The test CLI's Mocha dependency is overridden to the project's Mocha 12 version to avoid vulnerable transitive dependencies in Mocha 11. Validate both test commands when updating that override.

For a manual smoke test, press F5, hover the item, run Refresh and Show Details, change enabled providers and interval, then disable networking for a check. Confirm Unknown replaces old clear results, a provider's error does not hide others, and reloading or disabling the extension leaves no timers or stale UI.

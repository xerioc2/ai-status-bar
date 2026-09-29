# Contributing

Keep adapters small, parsers pure, and wording honest. Provider-specific code must not enter the poller or UI. There are no runtime dependencies.

## Add a Statuspage provider

1. Find the provider's official status page and fetch its public `/api/v2/summary.json` and `/api/v2/incidents.json` endpoints. Verify the summary is JSON with components, status, and incidents, and the history has dated incident records. Save real responses as `test/fixtures/<id>.json` and `test/fixtures/<id>-all.json` and record the date, platform, endpoints, and scope in `PROVIDER_RECON.md`. Never infer current status by scraping HTML.
2. Add one entry in `src/providers/registry.ts`:

   ```ts
   { id: 'example', displayName: 'Example AI', statusPageUrl: 'https://status.example.com', platform: 'statuspage' },
   ```

   This is the only runtime code change needed. The registry supplies default enabled providers; neither the poller nor the UI needs editing. The fixture test discovers registry entries automatically. Refresh the README provider list and the settings UI's `package.json` default list when preparing a release.
3. Run `npm test` and `npm run lint`.

For an incident.io compatibility API, verify and save both summary and `/api/v2/incidents.json` responses. Use `platform: 'incidentio'` and name the second fixture `<id>-all.json`. This mode fetches both feeds and filters resolved history. Do not assume the unresolved endpoint exists. An incomplete or failed feed makes the whole provider Unknown.

## Add a platform adapter

Create a directory under `src/providers/`. Implement the `StatusProvider` interface (`id`, `displayName`, `statusPageUrl`, `fetchStatus(signal)`). Honor the supplied AbortSignal for every request, check HTTP status, and throw on transport errors or invalid payloads. The poller owns timeout, error conversion, rate limiting, and lifecycle.

Put parsing in a separate pure mapper accepting unknown JSON, identity, and check time, returning `ServiceStatus`. Keep level and incident stage separate. Unexpected severity maps to Unknown; unexpected incident stage currently maps conservatively to Investigating with Unknown impact because the four-stage model has no Unknown stage. Map maintenance stages to their nearest response stage and document the choice. Never silently turn malformed data into an all-clear.

Extend the registry's platform construction branch to instantiate the new adapter. No poller or UI modifications should be needed. Add real fixture tests and synthetic tests for all upstream values, malformed data, resolved history, and active maintenance. Do not guess severity from incident prose.

## Source layout

- `src/core`: common model and severity ordering.
- `src/providers`: definitions, HTTP adapters, and pure mapping.
- `src/services/StatusPoller.ts`: independent concurrent checks and disposable lifecycle.
- `src/ui`: pure formatting and VS Code rendering. All labels, icons, and theme keys live in `formatters.ts`.
- `src/config/settings.ts`: settings validation.
- `src/extension.ts`: activation wiring only.

All timers and request controllers are owned by the poller, which is registered in `context.subscriptions`. Its update subscription, view, commands, and configuration listener are also registered there. Do not add unowned timers or listeners.

The history panel uses a script-free webview with escaped provider text and a restrictive content security policy. `detailsHtml.ts` renders responsive daily bars; `historyMapper.ts` handles UTC day intervals independently from current status. Historical graphs and a webview were added following the user's request after the original v1 scope. No external chart library, telemetry, or browser-side network requests are used.

The editor dashboard reuses the same history renderer and adds a local, nonce-restricted script for provider preferences. `StatusPage.ts` validates messages before saving settings; `resources/status-page.js` owns the unsaved form draft. Poll updates replace only the graph rows, preserving edits and focus. The sidebar stays script-free. Test both the sidebar and dashboard when changing the shared renderer.

## Verify

```sh
npm ci
npm test
npm run lint
npm run test:extension
```

The TypeScript/Mocha and `@vscode/test-cli` / `@vscode/test-electron` tools match the standard VS Code generator approach. Offline tests use no live APIs. The extension-host suite downloads VS Code on first run and needs a graphical desktop. Live fixtures must not be rewritten during ordinary tests.

The test CLI's Mocha dependency is overridden to the project's Mocha 12 version to avoid vulnerable transitive dependencies in Mocha 11. Validate both test commands when updating that override.

For a manual smoke test, press F5, hover the item, run Refresh and Show Details, change enabled providers and interval, then disable networking for a check. Confirm Unknown replaces old clear results, a provider's error does not hide others, and reloading or disabling the extension leaves no timers or stale UI.

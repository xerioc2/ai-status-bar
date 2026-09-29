# Provider reconnaissance

Verified with live HTTP requests on 2026-09-28, before implementing adapters. Fixtures are the actual responses, not examples from documentation. No HTML is scraped by the extension.

| Provider | Official status page | Platform | Machine-readable endpoint(s) | Supported | Findings |
| --- | --- | --- | --- | --- | --- |
| Anthropic / Claude | https://status.claude.com | Atlassian Statuspage | `/api/v2/summary.json` | Yes | HTTP 200; components, incidents, scheduled maintenance. Saved as `anthropic.json`. |
| OpenAI / ChatGPT / Codex | https://status.openai.com | incident.io, Statuspage compatibility API | `/api/v2/summary.json`, `/api/v2/incidents.json` | Yes | Both HTTP 200. Summary omits incidents; fetch history separately and exclude resolved incidents. `/api/v2/incidents/unresolved.json` returns 404. Saved as `openai.json`, `openai-all.json`. |
| GitHub / Copilot | https://www.githubstatus.com | Atlassian Statuspage | `/api/v2/summary.json` | Yes | HTTP 200; includes Copilot and other GitHub services. Reports the whole provider, not only Copilot. Saved as `github.json`. |
| Cursor | https://status.cursor.com | Atlassian Statuspage | `/api/v2/summary.json` | Yes | HTTP 200; documented at https://status.cursor.com/api. Saved as `cursor.json`. |
| Google / Gemini | https://aistudio.google.com/status | Google custom application | No usable public status API verified | Not yet supported | Status page and `/status/summary.json` both return HTML, not JSON. Do not confuse the cryptocurrency exchange's status.gemini.com with Google. |
| Perplexity | https://status.perplexity.com | incident.io, Statuspage compatibility API | `/api/v2/summary.json`, `/api/v2/incidents.json` | Yes | Both HTTP 200. Summary omits incidents; unresolved endpoint returns 404. Saved as `perplexity.json`, `perplexity-all.json`. |
| DeepSeek | https://status.deepseek.com | Flashduty | `/history.rss` | Not yet supported | Summary/status JSON endpoints return 404. RSS is verified (HTTP 200), saved as `deepseek-rss.xml`; it contains historical incident updates but no structured component severity snapshot. Deferred until a reliable adapter can represent current severity without inferring it from prose. |

Sources: the official status pages above; [Cursor API documentation](https://status.cursor.com/api); [Google developer forum pointing to AI Studio status](https://discuss.ai.google.dev/t/gemini-api-up-down-status-tracker/63575); [Perplexity migration announcement](https://status.perplexity.com/default); [OpenAI incident.io page](https://statuspage.incident.io/openai-1/history). DeepSeek's official page identifies Flashduty as its platform.

Coverage limitations: provider-wide rollups can include products beyond the AI tool you use. Status reports can lag real incidents. Compatibility incident history may be bounded by the upstream service. All fixtures reflect one observation; synthetic tests cover states absent from that observation. Reverify endpoints before adding providers or changing platform assumptions.

## History graphs follow-up

On 2026-09-28 (local date), also fetched `/api/v2/incidents.json` from Claude, GitHub, and Cursor: all returned HTTP 200 with 50 incident records. Saved as `anthropic-all.json`, `github-all.json`, and `cursor-all.json`. OpenAI and Perplexity history endpoints were already verified above. Summary is fetched each polling cycle; optional Claude/GitHub/Cursor history is cached for 30 minutes. OpenAI/Perplexity incident feeds remain required and fresh on every cycle because they supply current incidents. Current status and historical severity are mapped independently; malformed historical dates suppress the graph without suppressing a valid current report.

Graphs cover the latest 30 UTC dates using the available feed. No complete 30-day coverage or uptime percentage is assumed. Days before the oldest returned record are unknown. The daily level is the worst incident impact overlapping that date, including resolved incidents, using published update dates to handle migrated records. These are provider-wide incident summaries, not the component uptime calculations on the official websites. Scheduled maintenance history is not fetched.

import { StatusProvider } from './StatusProvider';
import { StatuspageProvider } from './statuspage/StatuspageProvider';

export const providerDefinitions = [
  { id: 'anthropic', displayName: 'Anthropic (Claude)', statusPageUrl: 'https://status.claude.com', platform: 'statuspage' },
  { id: 'openai', displayName: 'OpenAI (ChatGPT / Codex)', statusPageUrl: 'https://status.openai.com', platform: 'incidentio' },
  { id: 'github', displayName: 'GitHub (including Copilot)', statusPageUrl: 'https://www.githubstatus.com', platform: 'statuspage' },
  { id: 'cursor', displayName: 'Cursor', statusPageUrl: 'https://status.cursor.com', platform: 'statuspage' },
  { id: 'perplexity', displayName: 'Perplexity', statusPageUrl: 'https://status.perplexity.com', platform: 'incidentio' }
] as const;

export function createProviders(ids: readonly string[]): StatusProvider[] {
  return [...new Set(ids)].flatMap(id => {
    const definition = providerDefinitions.find(definition => definition.id === id);
    return definition ? [definition] : [];
  })
    .map(definition => new StatuspageProvider(definition, definition.platform === 'incidentio'));
}

import { ProviderDefinition, StatusProvider } from './StatusProvider';
import { StatuspageProvider } from './statuspage/StatuspageProvider';

// To add a provider, add a row here. See PROVIDER_RECON.md before adding one.
export const providerDefinitions: readonly ProviderDefinition[] = [
  { id: 'anthropic', displayName: 'Anthropic (Claude)', statusPageUrl: 'https://status.claude.com', platform: 'statuspage' },
  { id: 'openai', displayName: 'OpenAI (ChatGPT / Codex)', statusPageUrl: 'https://status.openai.com', platform: 'incidentio' },
  { id: 'github', displayName: 'GitHub (including Copilot)', statusPageUrl: 'https://www.githubstatus.com', platform: 'statuspage' },
  { id: 'cursor', displayName: 'Cursor', statusPageUrl: 'https://status.cursor.com', platform: 'statuspage' },
  { id: 'perplexity', displayName: 'Perplexity', statusPageUrl: 'https://status.perplexity.com', platform: 'incidentio' }
];

export const providerIds = providerDefinitions.map(provider => provider.id);

export function providerName(id: string): string {
  return providerDefinitions.find(provider => provider.id === id)?.displayName ?? id;
}

export function createProviders(ids: readonly string[]): StatusProvider[] {
  return [...new Set(ids)].flatMap(id => providerDefinitions.filter(definition => definition.id === id))
    .map(definition => new StatuspageProvider(definition));
}

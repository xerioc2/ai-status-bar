import { ProviderDefinition, StatusProvider } from './StatusProvider';
import { StatuspageProvider } from './statuspage/StatuspageProvider';

// To add a provider, add a row here. See PROVIDER_RECON.md before adding one.
export const providerDefinitions: readonly ProviderDefinition[] = [
  { id: 'anthropic', icon: 'anthropic.svg', displayName: 'Anthropic (Claude)', statusPageUrl: 'https://status.claude.com', platform: 'statuspage' },
  { id: 'openai', icon: 'openai.svg', displayName: 'OpenAI (ChatGPT / Codex)', statusPageUrl: 'https://status.openai.com', platform: 'incidentio' },
  { id: 'github', icon: 'github.svg', displayName: 'GitHub (including Copilot)', statusPageUrl: 'https://www.githubstatus.com', platform: 'statuspage' },
  { id: 'cursor', icon: 'cursor.svg', displayName: 'Cursor', statusPageUrl: 'https://status.cursor.com', platform: 'statuspage' },
  { id: 'perplexity', icon: 'perplexity.svg', displayName: 'Perplexity', statusPageUrl: 'https://status.perplexity.com', platform: 'incidentio' }
];

export const providerIds = providerDefinitions.map(provider => provider.id);

export function providerName(id: string): string {
  return providerDefinitions.find(provider => provider.id === id)?.displayName ?? id;
}

export function createProviders(ids: readonly string[]): StatusProvider[] {
  return [...new Set(ids)].flatMap(id => providerDefinitions.filter(definition => definition.id === id))
    .map(definition => {
      const platform = definition.platform;
      switch (platform) {
        case 'statuspage':
        case 'incidentio': return new StatuspageProvider(definition);
        default: {
          const unhandled: never = platform;
          throw new Error(`Unsupported status platform: ${unhandled}`);
        }
      }
    });
}

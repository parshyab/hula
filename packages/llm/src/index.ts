import { ClaudeModel, OnPremModel } from './adapters';
import { MockModel } from './mock';
import type { ModelGateway } from './types';

export * from './types';
export { MockModel } from './mock';
export { ClaudeModel, OnPremModel } from './adapters';

export interface GatewayConfig {
  provider: 'mock' | 'claude' | 'onprem';
  anthropicApiKey?: string;
  anthropicModel?: string;
  onpremUrl?: string;
}

let singleton: ModelGateway | undefined;

/** Resolve the configured gateway. Defaults to the offline MockModel. */
export function getGateway(cfg: GatewayConfig): ModelGateway {
  if (singleton) return singleton;
  switch (cfg.provider) {
    case 'claude':
      singleton = new ClaudeModel({ apiKey: cfg.anthropicApiKey, model: cfg.anthropicModel ?? 'claude' });
      break;
    case 'onprem':
      singleton = new OnPremModel({ url: cfg.onpremUrl });
      break;
    case 'mock':
    default:
      singleton = new MockModel();
  }
  return singleton;
}

/** Test helper: drop the cached gateway. */
export function resetGateway(): void {
  singleton = undefined;
}

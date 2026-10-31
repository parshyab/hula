import type { ModelGateway } from './types';

/**
 * Adapter slots for real models. They are intentionally stubs in Phase 0 — the
 * system runs fully offline on the MockModel. Each throws a clear error if
 * selected before it is implemented, so a misconfiguration fails loudly.
 *
 * The Claude adapter (development) and an India-hosted / on-prem open-weights
 * adapter are wired in later phases. App code never imports a vendor SDK; only
 * these files will.
 */
export class ClaudeModel implements ModelGateway {
  readonly name: string;
  constructor(_opts: { apiKey?: string; model: string }) {
    this.name = _opts.model;
  }
  async generate(): Promise<never> {
    throw new Error(
      'ClaudeModel is a Phase 0 stub. Set LLM_PROVIDER=mock, or implement this adapter.',
    );
  }
  async embed(): Promise<never> {
    throw new Error('ClaudeModel.embed is a Phase 0 stub.');
  }
}

export class OnPremModel implements ModelGateway {
  readonly name = 'onprem';
  constructor(_opts: { url?: string }) {}
  async generate(): Promise<never> {
    throw new Error(
      'OnPremModel is a Phase 0 stub. Set LLM_PROVIDER=mock, or implement this adapter.',
    );
  }
  async embed(): Promise<never> {
    throw new Error('OnPremModel.embed is a Phase 0 stub.');
  }
}

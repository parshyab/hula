import { createHash } from 'node:crypto';
import type { GenerateRequest, GenerateResult, ModelGateway, ToolCall, ToolDef } from './types';

/**
 * Deterministic, offline model used as the Phase 0 default. It exercises the
 * real tool-calling loop without any network: given tools and a user question,
 * it routes to the best-matching tool (by keyword overlap with the tool's
 * description); once a tool result is present it presents that result as the
 * answer. No randomness, so agent evals are reproducible.
 */
export class MockModel implements ModelGateway {
  readonly name = 'mock-1';

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const toolResults = req.messages.filter((m) => m.role === 'tool');

    // Phase 1 of the loop: pick a tool to answer the question, if one fits.
    if (req.tools?.length && toolResults.length === 0 && lastUser) {
      const tool = pickTool(req.tools, lastUser.content);
      if (tool) {
        const call: ToolCall = { id: `call_${toolResults.length + 1}`, name: tool.name, arguments: {} };
        return { text: '', toolCalls: [call], modelUsed: this.name };
      }
    }

    // Phase 2: a tool has run — present its result as the answer.
    if (toolResults.length > 0) {
      const latest = toolResults[toolResults.length - 1]!;
      return { text: latest.content, modelUsed: this.name };
    }

    // No tool fit the question — a safe, honest fallback.
    return {
      text: "I can help with your payslip, leave balance, your profile and HR policies. I couldn't find a source for that — shall I raise a query with HR?",
      modelUsed: this.name,
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Deterministic pseudo-embedding (16-dim). Not used for real retrieval in
    // Phase 0 — placeholder so the interface is complete.
    return texts.map((t) => {
      const digest = createHash('sha256').update(t).digest();
      return Array.from({ length: 16 }, (_, i) => digest[i % digest.length]! / 255);
    });
  }
}

function pickTool(tools: ToolDef[], userText: string): ToolDef | undefined {
  const text = userText.toLowerCase();
  let best: { tool: ToolDef; score: number } | undefined;
  for (const tool of tools) {
    const tokens = `${tool.name} ${tool.description}`
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4);
    const score = new Set(tokens.filter((w) => text.includes(w))).size;
    if (score > 0 && (!best || score > best.score)) best = { tool, score };
  }
  return best?.tool;
}

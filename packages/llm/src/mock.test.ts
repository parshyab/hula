import { describe, expect, it } from 'vitest';
import { MockModel } from './mock';
import type { ToolDef } from './types';

const tools: ToolDef[] = [
  { name: 'getLeaveBalance', description: 'leave balance remaining days', parameters: {} },
  { name: 'getProfile', description: 'employee profile details', parameters: {} },
];

describe('MockModel', () => {
  it('routes to a tool when the question matches', async () => {
    const m = new MockModel();
    const r = await m.generate({
      messages: [{ role: 'user', content: 'how much leave do I have?' }],
      tools,
    });
    expect(r.toolCalls?.[0]?.name).toBe('getLeaveBalance');
    expect(r.modelUsed).toBe('mock-1');
  });

  it('presents the tool result as the final answer', async () => {
    const m = new MockModel();
    const r = await m.generate({
      messages: [
        { role: 'user', content: 'how much leave do I have?' },
        { role: 'assistant', content: '' },
        { role: 'tool', name: 'getLeaveBalance', toolCallId: 'call_1', content: 'You have 30 EL.' },
      ],
      tools,
    });
    expect(r.text).toBe('You have 30 EL.');
    expect(r.toolCalls).toBeUndefined();
  });

  it('falls back honestly when no tool fits', async () => {
    const m = new MockModel();
    const r = await m.generate({ messages: [{ role: 'user', content: 'what is the weather' }], tools });
    expect(r.text).toMatch(/raise a query with HR/);
  });
});

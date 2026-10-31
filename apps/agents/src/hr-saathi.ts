import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ChatMessage, ToolDef } from '@saathi/llm';
import type { Locale } from '@saathi/config';
import type { PolicyHit, SaathiAnswer, SaathiDeps } from './types';

const SYSTEM_PROMPT = readFileSync(
  fileURLToPath(new URL('../prompts/hr-saathi.md', import.meta.url)),
  'utf8',
);

/**
 * HR Saathi's fixed, read-only tool set. Each is scoped to the requesting user.
 * There is deliberately NO tool to approve, pay, score, or touch disciplinary /
 * POSH content — that invariant is checked by an eval.
 */
const TOOLS: ToolDef[] = [
  {
    name: 'getLeaveBalance',
    description: 'leave balance remaining earned casual days entitlement',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getProfile',
    description: 'profile employee grade unit designation posting details',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'searchPolicy',
    description: 'policy rules leave medical ltc conduct clause citation entitlement',
    parameters: { type: 'object', properties: {} },
  },
];

const POLICY_MISS: Record<Locale, string> = {
  en: "I couldn't find that in the policy knowledge base, so I won't guess. Shall I raise a query with HR for you?",
  hi: 'यह मुझे नीति ज्ञान-कोष में नहीं मिला, इसलिए मैं अनुमान नहीं लगाऊँगा। क्या मैं आपके लिए HR से प्रश्न उठाऊँ?',
  as: 'এইটো মই নীতি জ্ঞান-ভঁৰালত বিচাৰি নাপালোঁ, গতিকে অনুমান নকৰোঁ। মই আপোনাৰ বাবে HR ৰ ওচৰত প্ৰশ্ন উত্থাপন কৰিম নে?',
};

function leaveText(locale: Locale, el: number, cl: number, clause: string): string {
  switch (locale) {
    case 'hi':
      return `आपके पास ${el} दिन अर्जित अवकाश और ${cl} दिन आकस्मिक अवकाश है। (नियम ${clause})`;
    case 'as':
      return `আপোনাৰ ${el} দিন অৰ্জিত ছুটী আৰু ${cl} দিন নৈমিত্তিক ছুটী আছে। (নিয়ম ${clause})`;
    default:
      return `You have ${el} days of Earned Leave and ${cl} days of Casual Leave. (Policy ${clause})`;
  }
}

interface ToolOutcome {
  content: string;
  citedClause: string | null;
}

/**
 * Runs HR Saathi for one question: a bounded tool-calling loop over the model
 * gateway. The model requests a tool; we execute the (user-scoped) tool, record
 * it to the audit log, feed the result back, and let the model phrase the answer.
 */
export async function runHrSaathi(deps: SaathiDeps): Promise<SaathiAnswer> {
  const { subject, question, locale, gateway } = deps;
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];

  let citedClause: string | null = null;
  const toolsUsed: string[] = [];

  for (let step = 0; step < 3; step++) {
    const res = await gateway.generate({ messages, tools: TOOLS });

    if (!res.toolCalls?.length) {
      await deps.recordAudit({
        actorType: 'agent',
        actorId: subject.userId,
        action: 'saathi.answer',
        inputs: { question, locale },
        outputs: { toolsUsed },
        citedClause,
        modelUsed: res.modelUsed,
      });
      return { answer: res.text, citedClause, modelUsed: res.modelUsed, toolsUsed };
    }

    for (const call of res.toolCalls) {
      const outcome = await executeTool(call.name, deps);
      toolsUsed.push(call.name);
      if (outcome.citedClause) citedClause = outcome.citedClause;

      await deps.recordAudit({
        actorType: 'agent',
        actorId: subject.userId,
        action: `saathi.tool.${call.name}`,
        resourceType: 'employee',
        resourceId: subject.empCode ?? null,
        inputs: { question, locale },
        outputs: { summary: outcome.content.slice(0, 200) },
        citedClause: outcome.citedClause,
        modelUsed: res.modelUsed,
      });

      messages.push({ role: 'assistant', content: '', name: call.name, toolCallId: call.id });
      messages.push({ role: 'tool', name: call.name, toolCallId: call.id, content: outcome.content });
    }
  }

  // Loop guard — should not happen with the deterministic mock.
  return {
    answer: 'I need a moment — please try rephrasing your question.',
    citedClause,
    modelUsed: gateway.name,
    toolsUsed,
  };
}

async function executeTool(name: string, deps: SaathiDeps): Promise<ToolOutcome> {
  const { subject, locale } = deps;
  switch (name) {
    case 'getLeaveBalance': {
      if (!subject.empCode) return { content: POLICY_MISS[locale], citedClause: null };
      const lv = await deps.getLeaveBalance(subject.empCode);
      if (!lv) return { content: POLICY_MISS[locale], citedClause: null };
      return { content: leaveText(locale, lv.earnedLeave, lv.casualLeave, lv.clauseRef), citedClause: lv.clauseRef };
    }
    case 'getProfile': {
      if (!subject.empCode) return { content: POLICY_MISS[locale], citedClause: null };
      const p = await deps.getProfile(subject.empCode);
      if (!p) return { content: POLICY_MISS[locale], citedClause: null };
      return {
        content: `${p.firstName} ${p.lastName}, ${p.designation ?? 'Employee'} (${p.grade ?? '—'}) — ${p.unit ?? '—'}. Code ${p.empCode}.`,
        citedClause: null,
      };
    }
    case 'searchPolicy': {
      const hit: PolicyHit | null = await deps.searchPolicy(deps.question, locale);
      if (!hit) return { content: POLICY_MISS[locale], citedClause: null };
      return { content: `${hit.content} (clause ${hit.clauseRef})`, citedClause: hit.clauseRef };
    }
    default:
      return { content: POLICY_MISS[locale], citedClause: null };
  }
}

/** Exposed for the guardrail eval: the exact tool names HR Saathi can call. */
export const HR_SAATHI_TOOL_NAMES = TOOLS.map((t) => t.name);

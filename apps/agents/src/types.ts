import type { Subject } from '@saathi/auth';
import type { Locale } from '@saathi/config';
import type { ModelGateway } from '@saathi/llm';

/** Human-readable employee profile passed to the agent (masked PII only). */
export interface ProfileView {
  empCode: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  unit: string | null;
  designation: string | null;
}

export interface LeaveView {
  earnedLeave: number;
  casualLeave: number;
  clauseRef: string;
  ruleVersion: string;
}

export interface PolicyHit {
  clauseRef: string;
  heading: string;
  content: string;
}

export interface AuditInput {
  actorType: 'agent';
  actorId: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  inputs?: unknown;
  outputs?: unknown;
  citedClause?: string | null;
  modelUsed?: string | null;
}

/**
 * Everything HR Saathi needs, injected by the caller (the API). The agent
 * package stays free of DB/HTTP coupling — data access and audit are functions
 * passed in, which also makes the agent trivially testable.
 */
export interface SaathiDeps {
  subject: Subject;
  question: string;
  locale: Locale;
  gateway: ModelGateway;
  recordAudit: (input: AuditInput) => Promise<void>;
  getProfile: (empCode: string) => Promise<ProfileView | null>;
  getLeaveBalance: (empCode: string) => Promise<LeaveView | null>;
  searchPolicy: (query: string, lang: Locale) => Promise<PolicyHit | null>;
}

export interface SaathiAnswer {
  answer: string;
  citedClause: string | null;
  modelUsed: string;
  /** Names of the tools the agent actually ran, for the Why? drawer. */
  toolsUsed: string[];
}

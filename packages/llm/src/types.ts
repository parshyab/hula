/**
 * The model gateway interface. ALL app and agent code talks to models through
 * this — never a vendor SDK directly. Adapters (mock, Claude, on-prem) implement
 * it, so the model can be swapped per environment without touching callers.
 */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** For role==='tool': which tool call this result answers. */
  toolCallId?: string;
  /** For role==='tool': the tool name. */
  name?: string;
}

/** A tool the model may call. `parameters` is a JSON Schema object. */
export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  /** Final assistant text (empty when the model is only requesting tool calls). */
  text: string;
  /** Tool calls the model wants executed before it can answer. */
  toolCalls?: ToolCall[];
  /** Identifier of the model that produced this, recorded in the audit log. */
  modelUsed: string;
}

export interface ModelGateway {
  /** Stable identifier recorded against every agent action. */
  readonly name: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
  embed(texts: string[]): Promise<number[][]>;
}

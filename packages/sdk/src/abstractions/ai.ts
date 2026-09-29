/**
 * AI Provider Abstraction Layer
 * Provider-agnostic abstraction for LLM inference.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. AI models may interpret, organize, structure, and summarize intent and evidence.
 * 2. AI models must NEVER be granted authority to autonomously impose financial penalties,
 *    freeze non-disputed funds, or render final binding arbitration rulings.
 */

import type { NaturalLanguageIntent, DisputeDocket } from '@trustmesh/types';

export interface ParsedTransactionTerms {
  title: string;
  description: string;
  deliverables: string[];
  suggestedEscrowAmount: string;
  suggestedCurrency: string;
  suggestedDeadlineDays: number;
  confidenceScore: number;
}

export interface DisputeOrganizationReport {
  factualTimeline: { timestamp: string; event: string }[];
  identifiedContradictions: string[];
  evidenceComparisonSummary: string;
  neutralDocketSummary: string;
}

export interface IAIProvider {
  /**
   * Translate unstructured natural language intent into a structured transaction draft
   */
  parseIntentToTransactionTerms(intent: NaturalLanguageIntent): Promise<ParsedTransactionTerms>;

  /**
   * Organize and summarize conflicting evidence packets for the human judge network
   */
  organizeDisputeEvidence(docket: DisputeDocket, evidenceTexts: string[]): Promise<DisputeOrganizationReport>;

  /**
   * Extract key factual deliverables from submitted text/code evidence
   */
  summarizeEvidence(content: string, contextDescription: string): Promise<string>;
}

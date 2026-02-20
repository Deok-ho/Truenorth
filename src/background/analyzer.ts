import type { ParsedDocument, AnalysisResult, SimilarDocument, CoherenceCheck, ValueHierarchy, KpiNode, FeedbackRule } from '@shared/types';
import { ANALYSIS_STEPS } from '@shared/constants';

/** Derive result label from proportional score ratio */
function deriveResult(score: number, weight: number): 'PASS' | 'WARN' | 'FAIL' {
  if (weight <= 0) return 'WARN';
  const ratio = score / weight;
  if (ratio >= 0.8) return 'PASS';
  if (ratio >= 0.4) return 'WARN';
  return 'FAIL';
}

/** Ensures each check has weight/score/evidence_refs fields (proportional scoring).
 *  Trusts LLM-returned weights (adaptive criteria); normalizes sum to 100 if needed. */
function normalizeChecks(checks: any[]): CoherenceCheck[] {
  // Calculate raw weight total for proportional normalization
  const rawWeights = checks.map((c: any) =>
    typeof c.weight === 'number' && c.weight > 0 ? c.weight : 20,
  );
  const totalRaw = rawWeights.reduce((s, w) => s + w, 0);

  // Proportionally adjust weights so they sum to exactly 100
  let adjustedWeights: number[];
  if (totalRaw !== 100 && totalRaw > 0) {
    adjustedWeights = rawWeights.map((w) => Math.round((w * 100) / totalRaw));
    // Fix rounding residual on the largest weight
    const residual = 100 - adjustedWeights.reduce((s, w) => s + w, 0);
    if (residual !== 0) {
      const maxIdx = adjustedWeights.indexOf(Math.max(...adjustedWeights));
      adjustedWeights[maxIdx] += residual;
    }
  } else {
    adjustedWeights = rawWeights;
  }

  return checks.map((c: any, i: number) => {
    const weight = adjustedWeights[i];
    const rawScore = typeof c.score === 'number' ? c.score : -1;
    const llmResult = ['PASS', 'WARN', 'FAIL'].includes(c.result) ? c.result : 'WARN';
    const score = rawScore >= 0
      ? Math.min(Math.round(rawScore), weight)
      : llmResult === 'PASS' ? weight : llmResult === 'WARN' ? Math.round(weight * 0.5) : 0;
    const result = deriveResult(score, weight);
    const evidence_refs = Array.isArray(c.evidence_refs)
      ? c.evidence_refs.filter((r: any) => typeof r === 'string' && r.length > 0)
      : [];
    return { item: c.item, result, detail: c.detail, weight, score, evidence_refs };
  });
}
import {
  saveDocument,
  findSimilarDocuments,
  getCoherenceRules,
  updateDocumentAnalysis,
} from './api/supabase';
import { analyzeDocument as llmAnalyze } from './api/openai';
import { extractAllAttachments } from './attachmentReader';

/**
 * Generates a local fallback ID when Supabase is unavailable.
 */
function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Runs the full analysis pipeline on a parsed approval document.
 *
 * Supabase steps (1, 2, 4) are optional — the pipeline still works
 * with only an OpenAI API key configured.
 *
 * Steps:
 * 1. Save document to Supabase (optional)
 * 2. Find similar documents by topic overlap (optional)
 * 3. Run GPT-4o coherence/quality analysis (required)
 * 4. Update Supabase with results (optional)
 *
 * @param parsedDoc - The parsed document to analyze
 * @param sendProgress - Callback to send progress updates (step number, message)
 */
export async function analyzeDocument(
  parsedDoc: ParsedDocument,
  sendProgress: (step: number, msg: string) => void,
): Promise<AnalysisResult> {
  // ── Step 1: Save document to Supabase (optional) ──
  sendProgress(1, ANALYSIS_STEPS[0].label);

  let docId: string;
  try {
    const result = await saveDocument(parsedDoc);
    docId = result.id;
  } catch (err) {
    // Supabase unavailable — use local ID and continue
    console.warn('[ApprovalGraph] Supabase save skipped:', err);
    docId = generateLocalId();
  }

  // ── Step 2: Find similar documents (optional) ──
  sendProgress(2, ANALYSIS_STEPS[1].label);

  let similarDocs: SimilarDocument[] = [];
  let preliminaryTopics: string[] = [];

  try {
    // Generate preliminary topics from document content for similarity search
    preliminaryTopics = extractPreliminaryTopics(parsedDoc);
    const rawSimilar = await findSimilarDocuments(preliminaryTopics, docId);
    similarDocs = rawSimilar as SimilarDocument[];
  } catch (err) {
    // Non-critical — continue without similar docs
    console.warn('[ApprovalGraph] Similar doc search failed:', err);
  }

  // ── Step 3: Run LLM analysis (required) ──
  sendProgress(3, ANALYSIS_STEPS[2].label);

  let analysisOutput: {
    summary: any;
    coherence: any;
    recommendation: string;
    topics: string[];
    similar_docs_insight: string;
    causal_chains?: any[];
    value_hierarchy?: any;
    predicted_questions?: string[];
  };

  try {
    let coherenceRules: any[] = [];
    try {
      coherenceRules = await getCoherenceRules();
    } catch {
      // Supabase unavailable — use empty rules
    }

    // Load user feedback rules for false-positive prevention
    let feedbackRules: FeedbackRule[] = [];
    try {
      const fbStored = await chrome?.storage?.local?.get('feedback_rules');
      feedbackRules = fbStored?.feedback_rules ?? [];
    } catch { /* continue */ }

    // Extract text from supported attachments (Excel → CSV, etc.)
    let attachmentTexts: Array<{ name: string; content: string }> = [];
    try {
      if (parsedDoc.attachments && parsedDoc.attachments.length > 0) {
        attachmentTexts = await extractAllAttachments(parsedDoc.attachments);
      }
    } catch {
      // Non-critical — continue without attachment data
    }

    analysisOutput = await llmAnalyze(parsedDoc, similarDocs, coherenceRules, attachmentTexts, feedbackRules);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AI 분석 실패: ${message}`);
  }

  // ── Step 4: Update Supabase and build result (optional) ──
  sendProgress(4, ANALYSIS_STEPS[3].label);

  try {
    await updateDocumentAnalysis(docId, {
      summary: analysisOutput.summary,
      coherence: analysisOutput.coherence,
      recommendation: analysisOutput.recommendation,
      topics: analysisOutput.topics,
      similar_docs_insight: analysisOutput.similar_docs_insight,
    });
  } catch (err) {
    // Non-critical — the analysis result is still valid even if the update fails
    console.warn('[ApprovalGraph] Document analysis update failed:', err);
  }

  // Enrich similar docs with the LLM-generated insight
  const enrichedSimilarDocs: SimilarDocument[] = similarDocs.map((doc) => ({
    ...doc,
    insight: analysisOutput.similar_docs_insight || '',
  }));

  // Normalize causal chains from LLM output (legacy) or derive from value hierarchy
  const rawChains = Array.isArray(analysisOutput.causal_chains)
    ? analysisOutput.causal_chains
    : [];
  let causalChains = rawChains
    .filter((c: any) => c?.keyword && Array.isArray(c?.chain) && c.chain.length >= 2)
    .map((c: any) => ({
      keyword: String(c.keyword),
      chain: c.chain.map(String),
      kpis: Array.isArray(c.kpis) ? c.kpis.map(String) : [],
      impact: ['high', 'medium', 'low'].includes(c.impact) ? c.impact : 'medium',
    }));

  // Derive causal chain from value hierarchy so content script click panels work
  const vh = normalizeValueHierarchy(analysisOutput.value_hierarchy);
  if (causalChains.length === 0 && vh && vh.valueChain.length >= 2) {
    causalChains = [{
      keyword: vh.valueChain[0], // 기안 항목 (first = most concrete)
      chain: vh.valueChain,
      kpis: vh.kpis.map((k) => k.name),
      impact: vh.impactScore,
    }];
  }

  // Normalize predicted questions
  const predictedQuestions = Array.isArray(analysisOutput.predicted_questions)
    ? analysisOutput.predicted_questions.filter((q: any) => typeof q === 'string').slice(0, 3)
    : [];

  const result: AnalysisResult = {
    docId,
    summary: {
      request: analysisOutput.summary?.request || '',
      basis: analysisOutput.summary?.basis || '',
      expected_effect: analysisOutput.summary?.expected_effect || '',
    },
    coherence: (() => {
      const rawChecks = Array.isArray(analysisOutput.coherence?.checks)
        ? analysisOutput.coherence.checks
        : [];
      const checks = normalizeChecks(rawChecks);
      const sumScores = checks.reduce((s, c) => s + c.score, 0);
      return {
        overall_score: Math.round(sumScores),
        checks,
      };
    })(),
    similarDocs: enrichedSimilarDocs,
    recommendation: analysisOutput.recommendation || '',
    topics: Array.isArray(analysisOutput.topics) ? analysisOutput.topics : preliminaryTopics,
    causalChains,
    valueHierarchy: vh,
    analyzedAt: new Date().toISOString(),
    predictedQuestions,
  };

  return result;
}

/**
 * Extracts preliminary topic keywords from a parsed document
 * for use in similarity search before full LLM analysis.
 */
function extractPreliminaryTopics(doc: ParsedDocument): string[] {
  const topics: string[] = [];

  // Use doc_type as a topic
  if (doc.doc_type) {
    topics.push(doc.doc_type.trim());
  }

  // Extract keywords from the subject
  if (doc.subject) {
    const subjectWords = doc.subject
      .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    // Take up to 3 keywords from the subject
    topics.push(...subjectWords.slice(0, 3));
  }

  // Use department as a topic
  if (doc.requester_dept) {
    topics.push(doc.requester_dept.trim());
  }

  return [...new Set(topics)].slice(0, 5);
}

/**
 * Normalizes the LLM value_hierarchy output into a typed ValueHierarchy.
 */
function normalizeValueHierarchy(raw: any): ValueHierarchy | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.business_goal || !Array.isArray(raw.value_chain) || raw.value_chain.length < 2) return null;

  const kpis: KpiNode[] = Array.isArray(raw.kpis)
    ? raw.kpis
        .filter((k: any) => k?.name)
        .map((k: any) => ({
          name: String(k.name),
          current: String(k.current || '미측정'),
          target: String(k.target || '미설정'),
          relevance: ['high', 'medium', 'low'].includes(k.relevance) ? k.relevance : 'medium',
        }))
    : [];

  return {
    businessGoal: String(raw.business_goal),
    goalDescription: String(raw.goal_description || ''),
    kpis,
    valueChain: raw.value_chain.map(String),
    impactScore: ['high', 'medium', 'low'].includes(raw.impact_score) ? raw.impact_score : 'medium',
  };
}

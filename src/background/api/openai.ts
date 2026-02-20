import type { ParseRule, ParsedDocument, GroupwareType, FeedbackRule } from '@shared/types';
import { buildParseRulePrompt, buildAnalysisPrompt, buildTextExtractionPrompt } from '@lib/prompts';
import { MIN_BODY_LENGTH, stripHeaderFromRawText } from '@shared/constants';

/** Derive result label from proportional score */
function deriveResult(score: number, weight: number): 'PASS' | 'WARN' | 'FAIL' {
  if (weight <= 0) return 'WARN';
  const ratio = score / weight;
  if (ratio >= 0.8) return 'PASS';
  if (ratio >= 0.4) return 'WARN';
  return 'FAIL';
}

/** Fallback score when LLM doesn't provide one */
function fallbackScore(result: string, weight: number): number {
  if (result === 'PASS') return weight;
  if (result === 'WARN') return Math.round(weight * 0.5);
  return 0;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const PARSE_RULE_MODEL = 'gpt-4o';
const ANALYSIS_MODEL = 'gpt-4o';

/**
 * Retrieves the OpenAI API key from chrome.storage.local.
 * Throws if the key is not configured.
 */
export async function getApiKey(): Promise<string> {
  let apiKey = '';

  try {
    const stored = await chrome?.storage?.local?.get(['openai_api_key']);
    if (stored?.openai_api_key) {
      apiKey = stored.openai_api_key;
    }
  } catch {
    // chrome.storage not available
  }

  if (!apiKey) {
    throw new Error(
      'OpenAI API 키가 설정되지 않았습니다. ' +
        '확장 프로그램 설정에서 API 키를 입력하세요.',
    );
  }

  return apiKey;
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' | 'auto' } };

type ChatMessage =
  | { role: 'system' | 'assistant'; content: string }
  | { role: 'user'; content: string | ContentPart[] };

/**
 * Makes a raw fetch request to the OpenAI Chat Completions API.
 * Supports both text-only and multimodal (Vision) messages.
 */
export async function callChatCompletion(params: {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature?: number;
  response_format?: { type: string };
}): Promise<string> {
  const apiKey = await getApiKey();

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.max_tokens,
      temperature: params.temperature ?? 0.2,
      response_format: params.response_format,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const statusText = response.statusText || 'Unknown error';
    throw new Error(
      `OpenAI API 오류 (${response.status} ${statusText}): ${errorBody}`,
    );
  }

  const json = await response.json();

  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI 응답에 content가 없습니다.');
  }

  return content;
}

/**
 * Generates CSS parse rules from raw DOM HTML using GPT-4o.
 * Returns a ParseRule object with CSS selectors for each document field.
 */
export async function generateParseRule(domHtml: string): Promise<ParseRule> {
  const { system, user } = buildParseRulePrompt(domHtml);

  const content = await callChatCompletion({
    model: PARSE_RULE_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 1000,
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`LLM 응답 JSON 파싱 실패: ${content.slice(0, 200)}`);
  }

  // Validate and normalize the parse rule
  const rule: ParseRule = {
    subject: typeof parsed.subject === 'string' ? parsed.subject : '',
    body: typeof parsed.body === 'string' ? parsed.body : '',
    doc_type: typeof parsed.doc_type === 'string' ? parsed.doc_type : '',
    requester_name:
      typeof parsed.requester_name === 'string' ? parsed.requester_name : '',
    requester_dept:
      typeof parsed.requester_dept === 'string' ? parsed.requester_dept : '',
    approval_line:
      typeof parsed.approval_line === 'string' ? parsed.approval_line : '',
    created_at:
      typeof parsed.created_at === 'string' ? parsed.created_at : '',
  };

  return rule;
}

/**
 * Determines whether the parsed document needs text-based fallback extraction.
 */
function needsFallback(doc: ParsedDocument): boolean {
  return !doc.body || doc.body.trim().length < MIN_BODY_LENGTH || !doc.subject;
}

/**
 * Extracts structured document fields from raw text using GPT-4o.
 * Used as a fallback when CSS selector-based parsing fails.
 */
async function extractDocumentFromText(
  rawText: string,
  groupware?: GroupwareType,
): Promise<{
  doc_type: string;
  subject: string;
  body: string;
  requester_name: string;
  requester_dept: string;
  created_at: string;
}> {
  const { system, user } = buildTextExtractionPrompt(rawText, groupware);

  const content = await callChatCompletion({
    model: PARSE_RULE_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 2000,
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { doc_type: '', subject: '', body: '', requester_name: '', requester_dept: '', created_at: '' };
  }

  return {
    doc_type: typeof parsed.doc_type === 'string' ? parsed.doc_type : '',
    subject: typeof parsed.subject === 'string' ? parsed.subject : '',
    body: typeof parsed.body === 'string' ? parsed.body : '',
    requester_name: typeof parsed.requester_name === 'string' ? parsed.requester_name : '',
    requester_dept: typeof parsed.requester_dept === 'string' ? parsed.requester_dept : '',
    created_at: typeof parsed.created_at === 'string' ? parsed.created_at : '',
  };
}

/**
 * Analyzes a parsed approval document using GPT-4o.
 * Supports multimodal: text + body images (tables pasted as images).
 * Returns structured analysis including summary, coherence, recommendation, and topics.
 */
export async function analyzeDocument(
  doc: ParsedDocument,
  similarDocs: any[],
  rules: any[],
  attachmentTexts?: Array<{ name: string; content: string }>,
  feedbackRules?: FeedbackRule[],
): Promise<{
  summary: any;
  coherence: any;
  recommendation: string;
  topics: string[];
  similar_docs_insight: string;
  causal_chains?: any[];
  value_hierarchy?: any;
  predicted_questions?: string[];
}> {
  // Fallback: if CSS parsing was insufficient and rawText is available
  if (needsFallback(doc) && doc.rawText) {
    // Body fallback: use rawText with header stripping (no extra API call needed)
    if (!doc.body || doc.body.trim().length < MIN_BODY_LENGTH) {
      doc.body = stripHeaderFromRawText(doc.rawText, doc.subject);
    }
    // Metadata fallback: only call LLM extraction when subject is missing
    if (!doc.subject) {
      const extracted = await extractDocumentFromText(doc.rawText, doc.groupware);
      if (extracted.subject) doc.subject = extracted.subject;
      if (!doc.requester_name && extracted.requester_name) doc.requester_name = extracted.requester_name;
      if (!doc.requester_dept && extracted.requester_dept) doc.requester_dept = extracted.requester_dept;
      if (!doc.doc_type && extracted.doc_type) doc.doc_type = extracted.doc_type;
      if (!doc.created_at && extracted.created_at) doc.created_at = extracted.created_at;
    }
  }

  const { system, user } = buildAnalysisPrompt(doc, similarDocs, rules, feedbackRules);

  // Build user message — text + optional images + optional attachment data
  let userText = user;

  // Append extracted attachment data (Excel CSV, etc.)
  if (attachmentTexts && attachmentTexts.length > 0) {
    const attSection = attachmentTexts
      .map((a) => `=== 첨부: ${a.name} ===\n${a.content.slice(0, 3000)}`)
      .join('\n\n');
    userText += `\n\n=== 첨부파일 데이터 (추출) ===\n${attSection}`;
  }

  // If body images exist, use multimodal content parts
  const hasImages = doc.bodyImages && doc.bodyImages.length > 0;

  let userMessage: ChatMessage;
  if (hasImages) {
    const parts: ContentPart[] = [
      { type: 'text', text: userText + '\n\n아래 이미지는 본문에 포함된 표/차트입니다. 표의 모든 셀 데이터를 읽어서 분석에 반영하세요.' },
    ];
    for (const dataUrl of doc.bodyImages!) {
      parts.push({
        type: 'image_url',
        image_url: { url: dataUrl, detail: 'low' },
      });
    }
    userMessage = { role: 'user', content: parts };
  } else {
    userMessage = { role: 'user', content: userText };
  }

  const content = await callChatCompletion({
    model: ANALYSIS_MODEL,
    messages: [
      { role: 'system', content: system },
      userMessage,
    ],
    max_tokens: 5000,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`분석 결과 JSON 파싱 실패: ${content.slice(0, 200)}`);
  }

  // Validate and normalize the analysis result
  const summary = parsed.summary || {
    request: '',
    basis: '',
    expected_effect: '',
  };

  const coherence = parsed.coherence || { overall_score: 0, checks: [] };
  if (typeof coherence.overall_score !== 'number') {
    coherence.overall_score = 0;
  }
  if (!Array.isArray(coherence.checks)) {
    coherence.checks = [];
  }

  // Normalize each check with weight/score/evidence_refs (proportional scoring)
  // Trust LLM-returned weights (adaptive criteria); fallback to 20 (100/5)
  coherence.checks = coherence.checks.map((check: any) => {
    const item = typeof check.item === 'string' ? check.item : '';
    const weight =
      typeof check.weight === 'number' && check.weight > 0
        ? check.weight
        : 20;

    // Trust the LLM's proportional score if provided, clamp to [0, weight]
    const rawScore = typeof check.score === 'number' ? check.score : -1;
    const llmResult = ['PASS', 'WARN', 'FAIL'].includes(check.result) ? check.result : null;
    const score = rawScore >= 0
      ? Math.min(Math.round(rawScore), weight)
      : fallbackScore(llmResult || 'WARN', weight);

    // Derive result from actual score ratio, not LLM's label (ensures consistency)
    const result = deriveResult(score, weight);

    const evidence_refs = Array.isArray(check.evidence_refs)
      ? check.evidence_refs.filter((r: any) => typeof r === 'string' && r.length > 0)
      : [];
    return {
      item,
      result,
      detail: typeof check.detail === 'string' ? check.detail : '',
      weight,
      score,
      evidence_refs,
    };
  });

  // Recalculate overall_score from individual scores for consistency
  const sumScores = coherence.checks.reduce(
    (sum: number, c: any) => sum + c.score,
    0,
  );
  coherence.overall_score = Math.round(sumScores);

  const recommendation =
    typeof parsed.recommendation === 'string' ? parsed.recommendation : '';

  const topics = Array.isArray(parsed.topics)
    ? parsed.topics.filter((t: any) => typeof t === 'string')
    : [];

  const similar_docs_insight =
    typeof parsed.similar_docs_insight === 'string'
      ? parsed.similar_docs_insight
      : '';

  // Normalize causal chains from LLM output
  const causal_chains = Array.isArray(parsed.causal_chains)
    ? parsed.causal_chains
    : [];

  // Normalize value hierarchy
  const value_hierarchy = parsed.value_hierarchy || null;

  // Normalize predicted questions
  const predicted_questions = Array.isArray(parsed.predicted_questions)
    ? parsed.predicted_questions.filter((q: any) => typeof q === 'string').slice(0, 3)
    : [];

  return {
    summary,
    coherence,
    recommendation,
    topics,
    similar_docs_insight,
    causal_chains,
    value_hierarchy,
    predicted_questions,
  };
}

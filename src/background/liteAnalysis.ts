import type {
  ParsedDocument,
  AnalysisResult,
  LiteCheckItem,
  CoherenceCheck,
  FeedbackRule,
} from '@shared/types';
import { LITE_ANALYSIS_STEPS, stripHeaderFromRawText } from '@shared/constants';
import { callChatCompletion } from './api/openai';

// ─── Lite Prompt (Adaptive) ───

function getLiteSystemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `당신은 기업 결재 문서의 기본 오류를 빠르게 검사하고, 핵심 내용을 요약하는 전문가입니다.
오늘 날짜는 ${today}입니다.

★★★ 적응형 검사 지시 ★★★
문서 전체를 먼저 읽고, 이 문서의 성격과 목적을 파악하세요.
그 다음, 아래 검사 기준 풀에서 이 문서에 가장 적합한 3~5개를 선택하세요.
선택한 기준들의 가중치(weight) 합계는 반드시 100이어야 합니다.

[검사 기준 풀]
- 오탈자: 맞춤법, 오타 검사 (실질적 내용 오류만)
- 수치검증: 본문에 언급된 금액/수치가 일관되고 정확한지
- 날짜검증: 날짜 표기(연월일)가 올바르고 논리적인지
- 고유명사: 회사명, 부서명, 인명 등이 일관되고 정확한지
- 결재라인: 결재자 순서가 적절하고 누락이 없는지
- 데이터 정합성: 표/테이블 내 수치 합계, 비율, 전월대비 등의 계산 정확도
- 서식 통일성: 숫자/단위/날짜 표기 형식의 통일성
- 참조 정합성: 본문과 첨부/표 간 상호 참조의 일치 여부

[기준 선택 가이드]
- 데이터/수치 중심 문서(비용 보고, 판촉비, 실적 보고 등): 데이터 정합성, 수치검증, 서식 통일성 우선
- 일반 품의서/기안서: 오탈자, 수치검증, 날짜검증 우선
- 신청 문서(휴가, 경조 등): 날짜검증, 고유명사, 결재라인 우선
- 협조 문서: 오탈자, 고유명사, 참조 정합성 우선

★★★ 오탐 방지 규칙 (반드시 준수) ★★★

[검사 범위 — 매우 중요]
- 검사 대상은 오직 "=== 본문 ===" 섹션의 텍스트만입니다.
- 문서 헤더 메타데이터(품의번호, 기안부서, 기안자, 작성일자, 수신참조, 시행일자 등)는 검사 대상이 아닙니다.
- "=== 페이지 전체 텍스트 ===" 섹션은 보조 참고용일 뿐, 여기에 포함된 헤더/메뉴/시스템 텍스트를 오류로 판정하지 마세요.

[오탈자 판정 시 주의]
- 그룹웨어 시스템(비즈박스, 하이웍스 등)의 HTML 렌더링 아티팩트를 오탈자로 판정하지 마세요.
- 글자 사이 비정상 공백(예: '품의 번 호', '기안 부 서', '결 재', '주식 회사', '수신 참 조')은 HTML 테이블 렌더링 문제이지 실제 오타가 아닙니다. 이런 패턴이 보이면 무조건 무시하세요.
- 띄어쓰기 오류는 절대 판정하지 마세요. 한국어 띄어쓰기는 그룹웨어 시스템과 입력 환경에 따라 다릅니다.
- 기안번호/문서번호/품의번호 필드는 시스템이 자동 생성한 값이므로 오류 대상이 절대 아닙니다.
- 오탈자는 본문 내 실질적 내용 오류(잘못된 단어, 명백한 오타)만 판정하세요.
- 오탈자 지적 시 반드시 해당 단어를 본문에서 '따옴표'로 인용하고, 올바른 표기를 함께 제시하세요.

[날짜검증 판정 시 주의]
- 작성일(기안일)이 오늘보다 과거인 것은 완전히 정상입니다. 문서는 작성 후 결재까지 시간이 걸립니다.
- ★ 보고 기간(출고기간, 집계기간, 정산기간 등)과 작성일/결재일이 다른 것은 완전히 정상입니다. 예: 1월 데이터를 2월에 보고하는 것은 당연합니다. 이것을 "날짜 불일치"로 판정하지 마세요.
- 날짜검증에서 확인할 것: 존재하지 않는 날짜(예: 2월 30일), 본문 내 날짜 간 모순, 시작일>종료일 등
- "작성일이 과거여서 논리적이지 않다"는 판정은 절대 금지
- "보고 기간과 결재일이 다르다"는 판정도 절대 금지

[결재라인 판정 시 주의]
- 결재선 정보는 이미 파싱되어 "=== 결재선 ===" 섹션에 제공됩니다. 이 데이터를 기준으로 판단하세요.
- 결재자 이름, 직위, 상태가 제공되어 있으면 "누락"으로 판정하지 마세요.
- 원문 페이지에서는 결재선 테이블에 직위와 이름이 표시되어 있을 수 있습니다.

[고유명사 판정 시 주의 — 날조 절대 금지]
- ★★★ "혼용"을 지적하려면, 서로 다른 두 표기가 본문에 모두 실제로 존재해야 합니다.
- 본문에 없는 표기를 만들어내어 "혼용"이라고 판정하는 것은 절대 금지입니다.
- 지적할 때 반드시 두 표기 모두를 본문에서 인용하세요. 한쪽만 인용하고 다른 쪽을 추측하면 안 됩니다.
- ★ "주식회사 OO"와 "OO"는 혼용이 아닙니다. 전체 상호와 약칭을 함께 쓰는 것은 정상적인 비즈니스 관행입니다.
- ★ "주식회사 OO"와 "(주)OO"도 혼용이 아닙니다. 같은 회사의 다른 표기 형식일 뿐입니다.
- "일부 고유명사가 일관되지 않음" 같은 모호한 판정 금지. 구체적 인용 필수.
- 문서 헤더의 회사명/부서명 표기는 시스템이 생성한 것이므로 본문 고유명사 검사 대상이 아닙니다.
- 품의번호/문서번호에 포함된 회사명(예: "주식회사OO-부서-2026-0001")은 시스템 생성 값이므로 고유명사 검사 대상이 아닙니다.

[표 데이터 처리]
- 본문이 표(테이블) 위주로 구성된 경우, 텍스트가 셀 단위로 나열될 수 있습니다.
- 이 경우 텍스트 순서에서 표의 구조를 유추하여 데이터를 해석하세요.
- 숫자, 날짜, 금액 등 데이터가 나열되어 있으면 표 데이터로 간주하고 분석하세요.

[전체 공통 규칙]
- 모든 FAIL/WARN 판정에는 반드시 본문에서 직접 인용한 구체적 근거가 있어야 합니다.
- detail에는 반드시 본문에서 발견한 구체적 사례를 '따옴표'로 인용하세요.
- ★ 날조 금지: 본문에 없는 텍스트를 만들어내서 오류라고 판정하면 안 됩니다.
- ★ 자기모순 금지: detail에서 "문제없음", "올바름", "맞습니다" 등으로 서술하면서 result를 FAIL/WARN으로 부여하지 마세요. 문제를 발견하지 못했으면 반드시 PASS를 부여해야 합니다.

각 항목에 대해:
- category: 선택한 기준명 (위 풀에서 선택)
- result: "PASS" (문제 없음), "WARN" (경미한 문제), "FAIL" (명확한 오류)
- detail: 발견된 문제를 구체적으로 설명. 문제 없으면 "이상 없음"
- weight: 이 기준의 가중치 (모든 항목 weight 합계 = 100)

추가로:
- basis: 이 문서의 기안 근거(왜 이 문서를 작성했는지)를 1~2문장으로 요약
- expected_effect: 이 문서가 승인되면 기대되는 효과를 1~2문장으로 요약
- predictedQuestions: 결재자가 할 수 있는 예상 질문 3개 (간결하게)

반드시 아래 JSON 형식으로만 응답하세요:
{
  "checks": [
    { "category": "선택한 기준명", "result": "PASS|WARN|FAIL", "detail": "설명", "weight": 30 },
    { "category": "선택한 기준명", "result": "PASS|WARN|FAIL", "detail": "설명", "weight": 25 },
    { "category": "선택한 기준명", "result": "PASS|WARN|FAIL", "detail": "설명", "weight": 25 },
    { "category": "선택한 기준명", "result": "PASS|WARN|FAIL", "detail": "설명", "weight": 20 }
  ],
  "basis": "기안 근거 요약",
  "expected_effect": "기대 효과 요약",
  "predictedQuestions": ["예상 질문 1", "예상 질문 2", "예상 질문 3"]
}`;
}

function buildLiteUserPrompt(doc: ParsedDocument, feedbackRules: FeedbackRule[] = []): string {
  const approvalLine =
    doc.approval_line.length > 0
      ? doc.approval_line
          .map((a) => `- ${a.name} (${a.position}) [${a.status}]`)
          .join('\n')
      : '결재선 정보 없음';

  const hasBody = doc.body && doc.body.trim().length >= 20;
  const bodyText = hasBody
    ? doc.body
    : (doc.rawText ? stripHeaderFromRawText(doc.rawText, doc.subject) : '본문 내용 없음');

  const feedbackSection = feedbackRules.length > 0
    ? `\n=== 사용자 피드백 규칙 (반드시 준수) ===\n이전 분석에서 사용자가 오탐으로 신고한 항목입니다. 동일한 판정을 반복하지 마세요.\n${feedbackRules.map(f => `- ${f.category}: ${f.userMessage}`).join('\n')}\n`
    : '';

  return `아래 결재 문서를 검사하세요.

=== 문서 헤더 (시스템 자동 생성 — 검사 대상 아님) ===
문서 종류: ${doc.doc_type || '미지정'}
제목: ${doc.subject || '없음'}
기안자: ${doc.requester_name || '없음'} (${doc.requester_dept || '부서 미상'})
작성일: ${doc.created_at || '없음'}

=== 결재선 ===
${approvalLine}

=== 본문 (검사 대상) ===
${bodyText.slice(0, 4000)}

${hasBody && doc.rawText ? `=== 페이지 전체 텍스트 (보조 참고용 — 헤더/메뉴/시스템 텍스트 포함, 오류 판정 금지) ===\n${doc.rawText.slice(0, 4000)}` : ''}${feedbackSection}`;
}

// ─── Lite Check → CoherenceCheck Mapping (Adaptive) ───

function normalizeLiteWeights(checks: LiteCheckItem[]): number[] {
  const rawWeights = checks.map((c) =>
    typeof c.weight === 'number' && c.weight > 0 ? c.weight : 20,
  );
  const total = rawWeights.reduce((s, w) => s + w, 0);

  if (total !== 100 && total > 0) {
    const adjusted = rawWeights.map((w) => Math.round((w * 100) / total));
    const residual = 100 - adjusted.reduce((s, w) => s + w, 0);
    if (residual !== 0) {
      const maxIdx = adjusted.indexOf(Math.max(...adjusted));
      adjusted[maxIdx] += residual;
    }
    return adjusted;
  }
  return rawWeights;
}

function liteCheckToCoherenceCheck(check: LiteCheckItem, weight: number): CoherenceCheck {
  const score =
    check.result === 'PASS'
      ? weight
      : check.result === 'WARN'
        ? Math.round(weight * 0.5)
        : 0;

  return {
    item: check.category,
    result: check.result,
    detail: check.detail,
    weight,
    score,
  };
}

// ─── Main Entry Point ───

/**
 * Generates a local fallback ID when Supabase is unavailable.
 */
function generateLocalId(): string {
  return `lite-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Runs the Lite analysis pipeline on a parsed approval document.
 * Uses GPT-4o-mini for low-cost, fast checking with adaptive criteria selection.
 * Reuses the same OpenAI API key as Pro analysis — no separate key needed.
 */
export async function analyzeLite(
  parsedDoc: ParsedDocument,
  sendProgress: (step: number, msg: string) => void,
): Promise<AnalysisResult> {
  // Step 1: Prepare + load feedback rules
  sendProgress(1, LITE_ANALYSIS_STEPS[0].label);

  let feedbackRules: FeedbackRule[] = [];
  try {
    const stored = await chrome?.storage?.local?.get('feedback_rules');
    feedbackRules = stored?.feedback_rules ?? [];
  } catch { /* continue */ }

  const userPrompt = buildLiteUserPrompt(parsedDoc, feedbackRules);

  // Step 2: Call GPT-4o-mini
  sendProgress(2, LITE_ANALYSIS_STEPS[1].label);

  let liteChecks: LiteCheckItem[];
  let liteBasis = '';
  let liteExpectedEffect = '';
  let litePredictedQuestions: string[] = [];

  try {
    const rawResponse = await callChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: getLiteSystemPrompt() },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    let parsed: any;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      throw new Error(`Lite 분석 JSON 파싱 실패: ${rawResponse.slice(0, 200)}`);
    }

    if (!Array.isArray(parsed.checks)) {
      throw new Error('Lite 분석 결과에 checks 배열이 없습니다.');
    }

    liteChecks = parsed.checks.map((c: any) => ({
      category: typeof c.category === 'string' ? c.category : '검사항목',
      result: ['PASS', 'WARN', 'FAIL'].includes(c.result) ? c.result : 'WARN',
      detail: typeof c.detail === 'string' ? c.detail : '',
      weight: typeof c.weight === 'number' && c.weight > 0 ? c.weight : undefined,
    }));

    // Extract additional fields from the response
    liteBasis = typeof parsed.basis === 'string' ? parsed.basis : '';
    liteExpectedEffect = typeof parsed.expected_effect === 'string' ? parsed.expected_effect : '';
    litePredictedQuestions = Array.isArray(parsed.predictedQuestions)
      ? parsed.predictedQuestions.filter((q: any) => typeof q === 'string').slice(0, 3)
      : [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Lite AI 분석 실패: ${message}`);
  }

  // Normalize weights to sum 100 and convert to CoherenceCheck
  const normalizedWeights = normalizeLiteWeights(liteChecks);
  const coherenceChecks = liteChecks.map((check, i) =>
    liteCheckToCoherenceCheck(check, normalizedWeights[i]),
  );
  const overallScore = Math.round(
    coherenceChecks.reduce((sum, c) => sum + c.score, 0),
  );

  const issueCount = liteChecks.filter((c) => c.result !== 'PASS').length;

  const result: AnalysisResult = {
    docId: generateLocalId(),
    mode: 'lite',
    summary: {
      request: parsedDoc.subject || '',
      basis: liteBasis,
      expected_effect: liteExpectedEffect,
    },
    coherence: {
      overall_score: overallScore,
      checks: coherenceChecks,
    },
    similarDocs: [],
    recommendation:
      issueCount === 0
        ? '기본 검사 항목에서 문제가 발견되지 않았습니다.'
        : `${issueCount}건의 검토 사항이 발견되었습니다.`,
    topics: [],
    causalChains: [],
    valueHierarchy: null,
    analyzedAt: new Date().toISOString(),
    predictedQuestions: litePredictedQuestions.length > 0 ? litePredictedQuestions : undefined,
  };

  return result;
}

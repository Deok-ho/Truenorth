import type { ParsedDocument, GroupwareType, FeedbackRule } from '@shared/types';
import { getDocCategory, stripHeaderFromRawText, type DocCategory } from '@shared/constants';

/**
 * Builds the system + user prompts for generating CSS parse rules
 * from raw DOM HTML.
 */
export function buildParseRulePrompt(domHtml: string): {
  system: string;
  user: string;
} {
  const system = `당신은 HTML DOM 분석 전문가입니다.
주어진 HTML을 분석하여 결재 문서의 각 필드를 추출할 수 있는 CSS 선택자를 JSON으로 생성하세요.

반드시 아래 필드에 대한 CSS 선택자를 포함해야 합니다:
- subject: 문서 제목 (결재 문서의 제목/건명)
- body: 본문 내용 (기안 내용 전체)
- doc_type: 문서 종류 (품의서, 지출결의서, 휴가신청서 등)
- requester_name: 기안자 이름
- requester_dept: 기안자 부서
- approval_line: 결재선/결재 현황 영역 (결재자 목록, 결재 현황, 결재 진행 상태가 포함된 테이블/리스트/카드 영역. "결재", "합의", "승인", "기안" 등의 텍스트와 사람 이름이 있는 영역)
- created_at: 기안일/작성일

응답은 반드시 아래 형식의 JSON만 출력하세요. 다른 텍스트를 포함하지 마세요.
{
  "subject": "CSS 선택자",
  "body": "CSS 선택자",
  "doc_type": "CSS 선택자",
  "requester_name": "CSS 선택자",
  "requester_dept": "CSS 선택자",
  "approval_line": "CSS 선택자",
  "created_at": "CSS 선택자"
}

선택자 작성 규칙:
1. 가능한 한 구체적인 선택자를 사용하세요 (ID > class > tag).
2. 그룹웨어 시스템의 공통 패턴을 활용하세요.
3. 해당 필드를 찾을 수 없으면 빈 문자열 ""을 사용하세요.
4. 선택자는 document.querySelector()로 실행 가능해야 합니다.`;

  const user = `아래 HTML에서 결재 문서 필드를 추출할 CSS 선택자를 JSON으로 생성하세요.

HTML:
\`\`\`html
${domHtml}
\`\`\``;

  return { system, user };
}

// ─── Category-specific prompt helpers ───

function buildSummaryInstruction(category: DocCategory): string {
  switch (category) {
    case 'application':
      return `1. summary: 문서 요약
   - request: 신청 내용 (무엇을 신청하는 문서인가)
   - basis: 근거 (신청 자격/규정 근거)
   - expected_effect: 기대 효과 (승인 시 예상되는 결과)`;
    case 'report':
      return `1. summary: 문서 요약
   - request: 보고 내용 (무엇을 보고하는 문서인가)
   - basis: 근거 (보고 배경/수행 경위)
   - expected_effect: 성과/후속조치 (수행 결과 및 향후 계획)`;
    case 'cooperation':
      return `1. summary: 문서 요약
   - request: 요청 내용 (무엇을 요청/안내하는 문서인가)
   - basis: 근거 (요청 배경/필요성)
   - expected_effect: 기대 효과 (협조 시 예상되는 결과)`;
    default:
      return `1. summary: 문서 요약
   - request: 요청 사항 (무엇을 요청하는 문서인가)
   - basis: 근거 (왜 이 요청이 필요한가)
   - expected_effect: 기대 효과 (승인 시 예상되는 결과)`;
  }
}

function buildValueHierarchyInstruction(category: DocCategory): string {
  switch (category) {
    case 'application':
      return `6. value_hierarchy: 이 신청이 조직에 기여하는 가치 계층 구조 (단일 객체)
   - 이 신청 문서가 궁극적으로 달성하려는 조직 가치 1개를 식별 (예: 직원 복리후생, 조직 역량 강화 등)
   - 해당 가치와 연결되는 측정 가능한 지표를 1~3개 도출
   - 신청 항목에서 조직 가치까지의 가치사슬을 3~4단계로 구성
   - 반드시 중복 없이, 하나의 통합된 계층 구조로 생성할 것`;
    case 'report':
      return `6. value_hierarchy: 이 보고서의 성과 가치 계층 구조 (단일 객체)
   - 이 보고 내용이 궁극적으로 기여하는 사업목표 1개를 식별
   - 해당 목표와 연결되는 측정 가능한 성과 KPI를 2~4개 도출
   - 수행 항목에서 사업목표까지의 가치사슬을 3~5단계로 구성
   - 반드시 중복 없이, 하나의 통합된 계층 구조로 생성할 것`;
    case 'cooperation':
      return `6. value_hierarchy: 이 협조 요청의 비즈니스 가치 계층 구조 (단일 객체)
   - 이 협조 요청이 궁극적으로 달성하려는 사업목표 1개를 식별
   - 해당 목표와 연결되는 측정 가능한 KPI를 1~3개 도출
   - 요청 항목에서 사업목표까지의 가치사슬을 3~4단계로 구성
   - 반드시 중복 없이, 하나의 통합된 계층 구조로 생성할 것`;
    default:
      return `6. value_hierarchy: 이 기안의 비즈니스 가치 계층 구조 (단일 객체)
   - 이 기안 문서가 궁극적으로 달성하려는 사업목표 1개를 식별
   - 해당 목표와 연결되는 측정 가능한 KPI를 2~4개 도출
   - 기안 항목에서 사업목표까지의 가치사슬을 3~5단계로 구성
   - 반드시 중복 없이, 하나의 통합된 계층 구조로 생성할 것`;
  }
}

function buildPredictedQuestionsInstruction(category: DocCategory): string {
  switch (category) {
    case 'application':
      return `7. predicted_questions: 결재자 예상 질문 (문자열 배열, 정확히 3개)
   - 이 신청서를 결재하는 결재권자의 관점에서 제기할 수 있는 핵심 질문 3개
   - 신청 자격 확인, 업무 공백 대처, 규정 준수 여부에 초점
   - 예: "잔여 연차가 충분한지?", "부재 시 업무 대리자가 지정되었는지?"`;
    case 'report':
      return `7. predicted_questions: 결재자 예상 질문 (문자열 배열, 정확히 3개)
   - 이 보고서를 결재하는 결재권자의 관점에서 제기할 수 있는 핵심 질문 3개
   - 성과 측정, 비용 대비 효과, 후속 계획 구체성에 초점
   - 예: "출장 성과를 어떻게 측정할 것인지?", "후속 조치의 구체적 일정은?"`;
    case 'cooperation':
      return `7. predicted_questions: 결재자 예상 질문 (문자열 배열, 정확히 3개)
   - 이 협조전을 검토하는 수신부서의 관점에서 제기할 수 있는 핵심 질문 3개
   - 요청 범위의 적절성, 기한의 합리성, 수신 부서의 역할 범위에 초점
   - 예: "요청 범위가 우리 부서 소관인지?", "제시된 기한이 현실적인지?"`;
    default:
      return `7. predicted_questions: 결재자 예상 질문 (문자열 배열, 정확히 3개)
   - 이 문서를 결재하는 결재권자(팀장/부서장/임원)의 관점에서 제기할 수 있는 핵심 질문 3개
   - 문서의 약점이나 보완이 필요한 부분에 초점
   - 예: "예산 5,000만원의 산출 근거가 무엇인지?", "기존 시스템과의 호환성은 검증했는지?"`;
  }
}

/**
 * Builds prompts for extracting structured document fields from raw text.
 * Used as a fallback when CSS selector-based parsing fails.
 */
export function buildTextExtractionPrompt(
  rawText: string,
  groupware?: GroupwareType,
): { system: string; user: string } {
  const system = `당신은 한국 기업 결재 문서 분석 전문가입니다.
주어진 텍스트는 그룹웨어 결재 문서 페이지에서 추출한 원문 텍스트입니다.
이 텍스트에서 아래 필드를 추출하여 JSON으로 반환하세요.

추출 필드:
- doc_type: 문서 종류 (품의서, 지출결의서, 휴가신청서, 업무보고서 등)
- subject: 문서 제목
- body: 본문 내용 (결재선/헤더/메뉴 텍스트 제외, 실질적 본문만)
- requester_name: 기안자 이름
- requester_dept: 기안자 부서
- created_at: 기안일/작성일 (YYYY-MM-DD 형식 또는 원본 그대로)

추출 규칙:
1. 텍스트에서 명확히 식별 가능한 정보만 추출합니다.
2. 식별할 수 없는 필드는 빈 문자열 ""로 반환합니다.
3. body에는 그룹웨어 메뉴, 결재선 테이블, 헤더/푸터 텍스트를 제외하고 실질적 본문만 포함합니다.
4. 결재선 영역의 이름/직위/상태 텍스트는 body에서 제외합니다.

응답 형식 (JSON만 출력, 다른 텍스트 금지):
{
  "doc_type": "문서 종류",
  "subject": "제목",
  "body": "본문 내용",
  "requester_name": "기안자 이름",
  "requester_dept": "기안자 부서",
  "created_at": "작성일"
}`;

  const gwNote = groupware && groupware !== 'unknown'
    ? `\n그룹웨어: ${groupware}`
    : '';

  const user = `아래 텍스트에서 결재 문서 필드를 추출하세요.${gwNote}

텍스트:
"""
${rawText}
"""`;

  return { system, user };
}

/**
 * Builds the system + user prompts for analyzing a parsed approval document.
 * Uses adaptive criteria selection — LLM chooses the most relevant 3-5 criteria
 * from a pool based on the document's content and purpose.
 */
export function buildAnalysisPrompt(
  doc: ParsedDocument,
  similarDocs: any[],
  rules: any[],
  feedbackRules?: FeedbackRule[],
): {
  system: string;
  user: string;
} {
  const category = getDocCategory(doc.doc_type || '');

  const system = `당신은 기업 결재 문서 품질 분석 전문가입니다.
주어진 결재 문서를 분석하여 아래 항목을 JSON으로 반환하세요.

분석 항목:
${buildSummaryInstruction(category)}

2. coherence: 정합성 분석 (적응형 평가, 총 100점)

   ★★★ 적응형 평가 지시 ★★★
   문서 전체를 먼저 읽고, 이 문서의 성격과 목적을 파악하세요.
   그 다음, 아래 평가 기준 풀에서 이 문서에 가장 적합한 3~5개를 선택하세요.
   선택한 기준들의 가중치(weight) 합계는 반드시 100이어야 합니다.
   문서 유형에 맞지 않는 기준은 선택하지 마세요.

   [평가 기준 풀]
   - 논리적 완결성: 제목-본문 일치, 필수 구성요소 존재, 논리 흐름의 일관성
   - 근거 충실성: 주장에 대한 데이터/사례/규정 근거 제시 여부
   - 데이터 완결성: 필수 데이터 포인트 누락 여부, 표/수치의 완성도
   - 수치 정합성: 숫자 간 일관성(합계 검증, 전월대비 등), 계산 정확도
   - 5W1H 명확성: Who/What/When/Where/Why/How 명시 여부
   - 형식 적합성: 결재선 적절성, 첨부파일 존재, 양식 준수
   - 실행 가능성: 제안 내용의 현실성, 일정/예산의 타당성
   - 비용 효율성: 투입 대비 효과, 예산 적정성
   - 선례 비교: 유사 문서와의 일관성 (유사문서 제공 시)

   [기준 선택 가이드]
   - 데이터/수치 중심 문서(비용 보고, 실적 보고, 판촉비 등): 데이터 완결성, 수치 정합성 우선
   - 제안/기획 문서(품의서, 사업계획 등): 논리적 완결성, 근거 충실성 우선
   - 신청 문서(휴가, 경조 등): 5W1H 명확성, 형식 적합성 우선
   - 보고 문서(출장보고, 업무보고 등): 근거 충실성, 논리적 완결성 우선
   - 협조 문서(업무협조전, 자료요청 등): 5W1H 명확성, 실행 가능성 우선

   - overall_score: 전체 정합성 점수 (0~100 정수) — 각 항목 score의 합계와 동일해야 함
   - checks: 항목별 검사 결과 배열 (선택한 3~5개 항목)
     각 항목: { "item": "선택한 기준명", "result": "PASS|WARN|FAIL", "detail": "상세설명", "weight": 배점, "score": 획득점수, "evidence_refs": ["원문 인용1", "원문 인용2"] }

     ※ 점수 산출 규칙 (비례 점수제):
     - score는 0 ~ weight 사이의 정수. 세부 기준 충족 비율에 비례하여 산출
     - result 판정: score ≥ weight×0.8 → "PASS", score ≥ weight×0.4 → "WARN", 나머지 → "FAIL"
     - overall_score = 모든 항목의 score 합계 (0~100)
     - 모든 항목의 weight 합계는 반드시 100

     ★★★ 핵심 규칙 ★★★

     [엄격 평가 원칙]
     - PASS는 해당 항목이 완벽할 때만 부여. 조금이라도 부족하면 WARN
     - "대체로 양호", "전반적으로 적절" 같은 모호한 판단으로 PASS를 주지 말 것
     - 각 항목의 세부 기준을 하나씩 체크하고, 하나라도 미달이면 WARN 이하
     - 100점 만점 분석 결과가 나오는 경우는 극히 드물어야 함

     [evidence_refs와 detail 작성 시 반드시 지킬 것]

     [evidence_refs 규칙 — 필수]
     - 반드시 "본문(body)" 텍스트에서 직접 복사한 원문 구절만 사용
     - 제목(subject)만 반복 인용하는 것은 금지. 본문 내용을 인용해야 함
     - 각 요소는 본문에서 그대로 복사한 연속된 텍스트 (15~80자)
     - 최소 2개, 최대 5개. 빈 배열 금지
     - 좋은 예: ["향후 3년간 약 15% 절감 효과가 예상됩니다", "시행일: 2025년 4월 1일"]
     - 나쁜 예: ["사무실 이전 건"] ← 제목만 인용한 것은 부적절

     [detail 작성 규칙]
     - 판정 근거를 구체적으로 서술. "잘 갖추어져 있음" 같은 모호한 표현 금지
     - 반드시 본문의 어떤 부분이 근거인지 '따옴표'로 원문을 인용할 것
     - 부족한 부분은 "~이 누락됨", "~이 불명확함"처럼 구체적으로 적시

     ★★★ 오탐 방지 규칙 ★★★

     [검사 범위 — 매우 중요]
     - 검사 대상은 오직 "=== 본문 ===" 섹션의 텍스트입니다.
     - 문서 헤더 메타데이터(품의번호, 기안부서, 기안자, 작성일자, 수신참조, 시행일자 등)는 검사 대상이 아닙니다.
     - "=== 페이지 전체 텍스트 ===" 섹션은 보조 참고용일 뿐, 여기의 헤더/메뉴/시스템 텍스트를 오류로 판정하지 마세요.

     [렌더링 아티팩트]
     - 그룹웨어(비즈박스, 하이웍스 등) HTML 렌더링 아티팩트를 문서 오류로 판정하지 마세요.
       글자 사이 비정상 공백(예: '품의 번 호', '기안 부 서', '주식 회사', '수신 참 조')은 HTML 테이블 렌더링 문제입니다. 이런 패턴이 보이면 무조건 무시하세요.
     - 띄어쓰기 오류는 절대 판정 대상이 아닙니다. 한국어 띄어쓰기는 입력 환경에 따라 다릅니다.
     - 기안번호/문서번호/품의번호 필드는 시스템이 자동 생성한 값이므로 오류 대상이 절대 아닙니다.

     [표 데이터 분석]
     - "=== 표 데이터 (마크다운) ===" 섹션이 제공되면, 이 표의 모든 셀 데이터를 읽어서 수치 정합성, 합계 검증 등에 활용하세요.
     - 표가 없더라도 본문 텍스트에서 수치/금액이 나열되어 있으면 데이터로 해석하세요.
     - 본문이 표(테이블) 위주로 구성된 경우, 텍스트가 셀 단위로 나열될 수 있습니다. 텍스트 순서에서 표의 구조를 유추하여 해석하세요.

     [고유명사 — 날조 절대 금지]
     - ★ "혼용"을 지적하려면, 서로 다른 두 표기가 본문에 모두 실제로 존재해야 합니다.
     - 본문에 없는 표기를 만들어내어 "혼용"이라고 판정하는 것은 절대 금지입니다.
     - 지적할 때 반드시 두 표기 모두를 본문에서 인용하세요. 한쪽만 인용하고 다른 쪽을 추측하면 안 됩니다.
     - ★ "주식회사 OO"와 "OO"는 혼용이 아닙니다. 전체 상호와 약칭을 함께 쓰는 것은 정상적인 비즈니스 관행입니다.
     - ★ "주식회사 OO"와 "(주)OO"도 혼용이 아닙니다. 같은 회사의 다른 표기 형식일 뿐입니다.
     - 문서 헤더의 회사명/부서명은 시스템 생성 값이므로 대상이 아닙니다.
     - 품의번호/문서번호에 포함된 회사명(예: "주식회사OO-부서-2026-0001")은 시스템 생성 값이므로 고유명사 검사 대상이 아닙니다.

     [날짜/기간]
     - 작성일(기안일)이 오늘보다 과거인 것은 정상입니다 (작성→결재에 시간 소요).
     - ★ 보고 기간(출고기간, 집계기간, 정산기간 등)과 작성일/결재일이 다른 것은 완전히 정상입니다. 예: 1월 데이터를 2월에 보고하는 것은 당연합니다. 이것을 "날짜 불일치"로 판정하지 마세요.
     - "보고 기간과 결재일이 다르다"는 판정은 절대 금지입니다.

     [기타]
     - 결재선 정보는 "=== 결재선 ===" 섹션에 이미 파싱되어 제공됩니다. 이 데이터를 기준으로 판단하세요.
     - 모든 FAIL/WARN 판정에는 반드시 본문에서 직접 인용한 구체적 근거가 있어야 합니다.
     - ★ 날조 금지: 본문에 없는 텍스트를 만들어내서 오류라고 판정하면 안 됩니다.
     - ★ 자기모순 금지: detail에서 "문제없음", "올바름", "맞습니다" 등으로 서술하면서 result를 FAIL/WARN으로 부여하지 마세요. 문제를 발견하지 못했으면 반드시 PASS를 부여해야 합니다.

3. similar_docs_insight: 유사문서 분석 인사이트 (문자열)
   - 유사 문서들과 비교하여 현재 문서의 특이점, 개선 가능성 서술

4. recommendation: 종합 추천 의견 (문자열)
   - 결재자에게 전달할 종합 의견 (승인 권장/보완 필요/반려 사유 등)

5. topics: 주제 태그 배열 (문자열 배열)
   - 문서 분류용 주제 키워드 3~5개

${buildValueHierarchyInstruction(category)}

   구조:
   {
     "business_goal": "최종 사업목표/조직가치",
     "goal_description": "이 목표의 배경과 맥락 (1~2문장)",
     "kpis": [
       { "name": "KPI명", "current": "현재 수치/상태", "target": "목표 수치/상태", "relevance": "high|medium|low" }
     ],
     "value_chain": ["기안 항목(투입)", "직접 효과", "중간 성과", "최종 목표"],
     "impact_score": "high|medium|low"
   }

   규칙:
   - business_goal: 문서에서 유추 가능한 가장 상위의 목표 1개
   - kpis: 각 KPI는 현재값과 목표값이 문서에 명시된 경우 그대로 인용, 없으면 합리적 추정
   - value_chain: 가장 구체적 항목 → ... → 가장 추상적 목표 순서로 작성
   - impact_score: 이 문서가 목표 달성에 기여하는 정도

${buildPredictedQuestionsInstruction(category)}

응답은 반드시 아래 형식의 JSON만 출력하세요. checks 배열에 선택한 3~5개 항목이 포함되어야 합니다:
{
  "summary": { "request": "...", "basis": "...", "expected_effect": "..." },
  "coherence": {
    "overall_score": 75,
    "checks": [
      { "item": "기준명1", "result": "WARN", "detail": "...", "weight": 30, "score": 20, "evidence_refs": ["본문에서 복사한 원문1", "본문에서 복사한 원문2"] },
      { "item": "기준명2", "result": "PASS", "detail": "...", "weight": 25, "score": 25, "evidence_refs": ["근거 원문", "기대효과 원문"] },
      { "item": "기준명3", "result": "WARN", "detail": "...", "weight": 25, "score": 15, "evidence_refs": ["원문1", "원문2"] },
      { "item": "기준명4", "result": "PASS", "detail": "...", "weight": 10, "score": 10, "evidence_refs": ["원문"] },
      { "item": "기준명5", "result": "WARN", "detail": "...", "weight": 10, "score": 5, "evidence_refs": ["유사 문서가 없습니다"] }
    ]
  },
  "similar_docs_insight": "...",
  "recommendation": "...",
  "topics": ["...", "..."],
  "value_hierarchy": {
    "business_goal": "목표",
    "goal_description": "목표 설명",
    "kpis": [{ "name": "KPI명", "current": "현재", "target": "목표", "relevance": "high" }],
    "value_chain": ["항목", "직접 효과", "중간 성과", "목표"],
    "impact_score": "high"
  },
  "predicted_questions": ["질문1", "질문2", "질문3"]
}`;

  const similarDocsText =
    similarDocs.length > 0
      ? similarDocs
          .map(
            (d, i) =>
              `[유사문서 ${i + 1}] 제목: ${d.subject || '없음'}, 종류: ${d.doc_type || '없음'}, ` +
              `상태: ${d.status || '없음'}, 정합성: ${d.coherence_score ?? 'N/A'}, ` +
              `요약: ${d.summary?.request || '없음'}`,
          )
          .join('\n')
      : '유사 문서가 없습니다.';

  const rulesText =
    rules.length > 0
      ? rules
          .map(
            (r, i) =>
              `[규칙 ${i + 1}] ${r.name || r.rule_name || '규칙'}: ${r.description || r.rule_description || ''}`,
          )
          .join('\n')
      : '추가 정합성 규칙이 없습니다.';

  const attachmentsText =
    doc.attachments && doc.attachments.length > 0
      ? doc.attachments
          .map((a, i) => `[첨부 ${i + 1}] ${a.name} (${a.type}, ${a.size || '크기 미상'})`)
          .join('\n')
      : '첨부파일 없음';

  const hasBody = doc.body && doc.body.trim().length >= 20;
  const bodyText = hasBody
    ? doc.body
    : (doc.rawText ? stripHeaderFromRawText(doc.rawText, doc.subject) : '본문 내용 없음');

  const user = `아래 결재 문서를 분석하세요.

=== 문서 헤더 (시스템 자동 생성 — 검사 대상 아님) ===
문서 종류: ${doc.doc_type || '미지정'}
제목: ${doc.subject || '없음'}
기안자: ${doc.requester_name || '없음'} (${doc.requester_dept || '부서 미상'})
작성일: ${doc.created_at || '없음'}

=== 결재선 ===
${
  doc.approval_line.length > 0
    ? doc.approval_line
        .map((a) => `- ${a.name} (${a.position}) [${a.status}]`)
        .join('\n')
    : '결재선 정보 없음'
}

=== 본문 (검사 대상) ===
${bodyText}

${doc.tableMarkdown ? `=== 표 데이터 (마크다운) ===\n${doc.tableMarkdown}` : ''}

${hasBody && doc.rawText ? `=== 페이지 전체 텍스트 (보조 참고용 — 헤더/메뉴/시스템 텍스트 포함, 오류 판정 금지) ===\n${doc.rawText}` : ''}
=== 첨부파일 ===
${attachmentsText}

=== 유사 문서 ===
${similarDocsText}

${feedbackRules && feedbackRules.length > 0
    ? `=== 사용자 피드백 규칙 (최우선 준수) ===\n이전 분석에서 사용자가 오탐으로 신고한 항목입니다. 동일한 판정을 반복하지 마세요.\n${feedbackRules.map(f => `- ${f.category}: ${f.userMessage}`).join('\n')}\n\n`
    : ''}=== 정합성 규칙 ===
${rulesText}`;

  return { system, user };
}

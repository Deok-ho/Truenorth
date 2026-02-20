import type { GroupwareType, GroupwareSignature } from '@shared/types';

/**
 * Mapping of groupware systems to their URL patterns and DOM signatures.
 */
const GROUPWARE_SIGNATURES: Record<
  Exclude<GroupwareType, 'unknown'>,
  GroupwareSignature
> = {
  bizbox_alpha: {
    urlPatterns: [
      /icube\./i,
      /douzone\./i,
      /bizbox\./i,
      /biz-box\./i,
    ],
    domSignatures: [
      '#icubeWrap',
      '.bizbox-wrap',
      '[data-bizbox]',
      '#douzone-app',
    ],
  },
  hiworks: {
    urlPatterns: [
      /hiworks\./i,
      /office\.hiworks\./i,
    ],
    domSignatures: [
      '#hiworks-app',
      '.hiworks-container',
      '[data-hiworks]',
      '.hw-wrap',
    ],
  },
  daou_office: {
    urlPatterns: [
      /daouoffice\./i,
      /daoums\./i,
      /daou\./i,
    ],
    domSignatures: [
      '#daouoffice-app',
      '.daou-wrap',
      '[data-daou]',
      '.daoums-container',
    ],
  },
  flow: {
    urlPatterns: [
      /flow\.team/i,
      /flowteam\./i,
    ],
    domSignatures: [
      '#flow-app',
      '.flow-container',
      '[data-flow]',
      '.flow-wrap',
    ],
  },
  amaranth10: {
    urlPatterns: [
      /amaranth/i,
      /wehago\./i,
    ],
    domSignatures: [
      '#amaranth-app',
      '.amaranth-wrap',
      '[data-amaranth]',
      '.wehago-container',
      '#wehago-app',
    ],
  },
};

/**
 * Detects the groupware type by inspecting the current page URL and DOM.
 *
 * For localhost, also checks the `data-groupware` attribute on <body> or <html>.
 */
export function detectGroupware(): GroupwareType {
  const url = window.location.href;

  // --- Localhost: check data-groupware attribute ---
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    const bodyAttr = document.body?.getAttribute('data-groupware');
    const htmlAttr = document.documentElement?.getAttribute('data-groupware');
    const attrValue = bodyAttr || htmlAttr;

    if (attrValue) {
      const normalized = attrValue.toLowerCase().trim();
      const validTypes: GroupwareType[] = [
        'bizbox_alpha',
        'hiworks',
        'daou_office',
        'flow',
        'amaranth10',
      ];
      if (validTypes.includes(normalized as GroupwareType)) {
        return normalized as GroupwareType;
      }
    }
  }

  // --- URL pattern matching ---
  for (const [type, signature] of Object.entries(GROUPWARE_SIGNATURES)) {
    for (const pattern of signature.urlPatterns) {
      if (pattern.test(url)) {
        return type as GroupwareType;
      }
    }
  }

  // --- DOM signature matching ---
  for (const [type, signature] of Object.entries(GROUPWARE_SIGNATURES)) {
    for (const selector of signature.domSignatures) {
      try {
        if (document.querySelector(selector)) {
          return type as GroupwareType;
        }
      } catch {
        // Invalid selector — skip
      }
    }
  }

  // --- Meta tag fallback (e.g. saved HTML pages) ---
  const ogTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
  if (/bizbox|비즈박스/i.test(ogTitle)) return 'bizbox_alpha';
  if (/hiworks|하이웍스/i.test(ogTitle)) return 'hiworks';
  if (/daou|다우/i.test(ogTitle)) return 'daou_office';
  if (/flow/i.test(ogTitle)) return 'flow';
  if (/amaranth|아마란스|wehago/i.test(ogTitle)) return 'amaranth10';

  // --- Title tag fallback ---
  const pageTitle = document.title || '';
  if (/bizbox|비즈박스|전자결재.*duzon|duzon.*전자결재/i.test(pageTitle)) return 'bizbox_alpha';

  return 'unknown';
}

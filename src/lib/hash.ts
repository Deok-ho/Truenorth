import { MAX_DOM_DEPTH } from '@shared/constants';

/**
 * Walks the DOM tree up to a maximum depth and produces a structural
 * skeleton string that represents tag hierarchy without text content.
 *
 * Example output: "div>table>tr>td,td,td;tr>td,td,td"
 */
export function extractDOMSkeleton(rootElement: Element, maxDepth: number = MAX_DOM_DEPTH): string {
  function walk(el: Element, depth: number): string {
    if (depth >= maxDepth) {
      return el.tagName.toLowerCase();
    }

    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.children);

    if (children.length === 0) {
      return tag;
    }

    const childSkeletons = children.map((child) => walk(child, depth + 1));
    return `${tag}>${childSkeletons.join(',')}`;
  }

  return walk(rootElement, 0);
}

/**
 * Produces a SHA-256 hex digest of the given skeleton string.
 * Uses the Web Crypto API (available in both content scripts and service workers).
 */
export async function hashSkeleton(skeleton: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(skeleton);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

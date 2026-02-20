import type { ParseRule } from '@shared/types';
import {
  getParserRule,
  saveParserRule,
  incrementRuleUseCount,
} from './api/supabase';

/**
 * In-memory cache for parse rules.
 * Key format: `${domHash}::${groupwareType}`
 */
const memoryCache = new Map<string, ParseRule>();

/**
 * Builds a consistent cache key from hash and groupware type.
 */
function cacheKey(domHash: string, groupwareType: string): string {
  return `${domHash}::${groupwareType}`;
}

/**
 * Retrieves a cached parse rule.
 *
 * Lookup order:
 * 1. In-memory Map (fast, ephemeral within service worker lifecycle)
 * 2. Supabase persistent storage (survives restarts)
 *
 * If found in Supabase, the rule is also cached in memory and its
 * use_count is incremented.
 */
export async function getCachedRule(
  domHash: string,
  groupwareType: string,
): Promise<ParseRule | null> {
  const key = cacheKey(domHash, groupwareType);

  // 1. Check in-memory cache
  const memoryHit = memoryCache.get(key);
  if (memoryHit) {
    return memoryHit;
  }

  // 2. Check Supabase persistent cache
  try {
    const dbResult = await getParserRule(domHash, groupwareType);

    if (dbResult) {
      // Store in memory for future lookups
      memoryCache.set(key, dbResult.selectors);

      // Increment use count asynchronously (fire-and-forget)
      incrementRuleUseCount(dbResult.id).catch(() => {
        // Non-critical — ignore errors
      });

      return dbResult.selectors;
    }
  } catch (err) {
    console.warn('[ApprovalGraph] Supabase cache lookup failed:', err);
  }

  return null;
}

/**
 * Stores a parse rule in both in-memory cache and Supabase.
 */
export async function cacheRule(
  domHash: string,
  groupwareType: string,
  rule: ParseRule,
): Promise<void> {
  const key = cacheKey(domHash, groupwareType);

  // 1. Always update in-memory cache
  memoryCache.set(key, rule);

  // 2. Persist to Supabase (best-effort)
  try {
    await saveParserRule(domHash, groupwareType, rule);
  } catch (err) {
    console.warn('[ApprovalGraph] Supabase cache write failed:', err);
    // In-memory cache still holds the value, so this is non-fatal
  }
}

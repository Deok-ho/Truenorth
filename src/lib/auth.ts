import { getSupabaseClient } from '@lib/supabase';
import type { UserProfile } from '@shared/types';

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const USER_STORAGE_KEY = 'truenorth_user';

/**
 * Initiates Google OAuth sign-in via chrome.identity API.
 * Returns the authenticated user profile after upserting to Supabase.
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  const token = await getGoogleAccessToken(true);
  const googleProfile = await fetchGoogleProfile(token);
  const user = await upsertUser(googleProfile);

  // Persist user to chrome.storage for session continuity
  await chrome.storage.local.set({ [USER_STORAGE_KEY]: user });

  return user;
}

/**
 * Returns the currently signed-in user from chrome.storage,
 * or null if not signed in.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const data = await chrome.storage.local.get(USER_STORAGE_KEY);
    return data[USER_STORAGE_KEY] || null;
  } catch {
    return null;
  }
}

/**
 * Signs out the current user.
 * Revokes the Google token and clears local storage.
 */
export async function signOut(): Promise<void> {
  try {
    const token = await getGoogleAccessToken(false);
    if (token) {
      // Revoke the token on Google's side (POST to avoid token in URL/logs)
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `token=${encodeURIComponent(token)}`,
      });
      // Remove cached token from Chrome identity
      await chrome.identity.removeCachedAuthToken({ token });
    }
  } catch {
    // Best-effort revocation
  }

  await chrome.storage.local.remove(USER_STORAGE_KEY);
}

/**
 * Gets a Google OAuth access token using chrome.identity.
 * @param interactive - If true, shows the consent screen if needed.
 */
async function getGoogleAccessToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || '인증 실패'));
        return;
      }
      if (!token) {
        reject(new Error('Google 인증 토큰을 받지 못했습니다.'));
        return;
      }
      resolve(token);
    });
  });
}

/**
 * Fetches the Google user profile using an access token.
 */
async function fetchGoogleProfile(
  accessToken: string,
): Promise<{ sub: string; email: string; name: string; picture: string }> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google 프로필 조회 실패 (${response.status})`);
  }

  const data = await response.json();
  return {
    sub: data.sub,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    picture: data.picture || '',
  };
}

/**
 * Upserts a user in Supabase from Google profile data.
 * Uses the upsert_user RPC function.
 */
async function upsertUser(
  profile: { sub: string; email: string; name: string; picture: string },
): Promise<UserProfile> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('upsert_user', {
    p_google_id: profile.sub,
    p_email: profile.email,
    p_display_name: profile.name,
    p_avatar_url: profile.picture,
  });

  if (error) {
    throw new Error(`사용자 등록 실패: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('사용자 등록 응답이 비어있습니다.');
  }

  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    displayName: row.display_name || profile.name,
    avatarUrl: row.avatar_url || profile.picture,
    plan: row.plan as 'free' | 'pro' | 'enterprise',
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

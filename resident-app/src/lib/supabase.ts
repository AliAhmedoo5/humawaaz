import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let clerkGetToken: (() => Promise<string | null>) | null = null;

export const setClerkTokenProvider = (provider: () => Promise<string | null>) => {
  clerkGetToken = provider;
};

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const headers = new Headers(options?.headers);
  if (clerkGetToken) {
    // Request a token using the Supabase JWT template
    const token = await clerkGetToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return fetch(url, { ...options, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch,
  },
});

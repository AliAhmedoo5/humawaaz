import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hbuzjssuzwdaanrccrsg.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhidXpqc3N1endkYWFucmNjcnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzM0NzksImV4cCI6MjA5NjUwOTQ3OX0.PhI7qTDaiOfLSy8S9OjJcQnwzVCJAH6k8-8xbZAZH60';

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

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-expo';
import { supabase, setClerkTokenProvider } from '../lib/supabase';

interface Profile {
  id: string; // This will map to Clerk's user.id
  full_name: string | null;
  role: 'citizen' | 'official' | 'admin';
  is_verified: boolean;
  uc_id: string | null;
  avatar_url: string | null;
  verification_status?: 'pending' | 'verified' | 'rejected';
  document_url?: string | null;
}

interface AuthContextType {
  user: any; // Clerk User
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setClerkTokenProvider(() => getToken({ template: 'supabase' }));
  }, [getToken]);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  async function fetchProfile(userId: string) {
    try {
      setLoadingProfile(true);
      // Wait, we need to pass the clerk token if we use RLS. 
      // For now, we will just fetch it directly assuming public read or authenticated read
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data as Profile);
      } else if (user) {
        // Fallback: If Supabase profile doesn't exist (e.g. signup crash), construct it from Clerk metadata
        const missingProfile = {
          id: user.id,
          full_name: user.unsafeMetadata?.full_name as string || 'Resident',
          role: 'citizen',
          is_verified: true,
          uc_id: user.unsafeMetadata?.uc_id as string || null,
          verification_status: 'pending',
        };
        
        // Self-heal: Insert the missing profile so RLS policies don't fail!
        try {
          await supabase.from('profiles').insert(missingProfile);
        } catch(e) { console.log('Self-heal insert failed', e); }

        setProfile({ ...missingProfile, avatar_url: null } as Profile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Fallback on error
      if (user) {
        setProfile({
          id: user.id,
          full_name: user.unsafeMetadata?.full_name as string || 'Resident',
          role: 'citizen',
          is_verified: true,
          uc_id: user.unsafeMetadata?.uc_id as string || null,
          avatar_url: null,
        });
      } else {
        setProfile(null);
      }
    } finally {
      setLoadingProfile(false);
    }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    if (isUserLoaded) {
      if (user?.id) {
        fetchProfile(user.id);
      } else {
        setProfile(null);
        setLoadingProfile(false);
      }
    }
  }, [user?.id, isUserLoaded]);

  const signOut = async () => {
    try {
      await clerkSignOut();
      setProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const loading = !isUserLoaded || loadingProfile;

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

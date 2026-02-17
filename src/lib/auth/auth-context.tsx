'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/browser';
import { getBrowserId } from '@/lib/browser-id';
import type { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface UserProfile {
  id: string;
  displayName?: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  city?: string;
  age?: number;
  monthlyIncome?: number;
  partnerIncome?: number;
  purpose?: string;
  notes?: string;
}

type OAuthProvider = 'google' | 'facebook' | 'apple';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name?: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  loginWithOAuth: (provider: OAuthProvider) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<{ error?: string }>;
  forgotPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? '',
    name: user.user_metadata?.name,
  };
}

// Claim anonymous sessions for a logged-in user
async function claimSessions(tenantId?: string) {
  try {
    const authorId = getBrowserId();
    await fetch('/api/sessions/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId, tenantId }),
    });
  } catch { /* non-critical */ }
}

async function fetchProfileFromApi(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile ?? null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const p = await fetchProfileFromApi();
    setProfile(p);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    // Get initial session
    supabase.auth.getUser().then(({ data }) => {
      const mapped = mapUser(data.user);
      setUser(mapped);
      setLoading(false);
      if (mapped) {
        // User is logged in: claim anonymous sessions + load profile
        claimSessions();
        fetchProfileFromApi().then(setProfile);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const mapped = mapUser(session?.user ?? null);
      setUser(mapped);
      if (mapped) {
        claimSessions();
        fetchProfileFromApi().then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };

    // Refresh client-side session
    const supabase = createSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getUser();
    const mapped = mapUser(sessionData.user);
    setUser(mapped);
    if (mapped) {
      await claimSessions();
      fetchProfileFromApi().then(setProfile);
    }
    return {};
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    if (data.needsConfirmation) return { needsConfirmation: true };

    // Auto-login after signup
    const supabase = createSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getUser();
    const mapped = mapUser(sessionData.user);
    setUser(mapped);
    if (mapped) {
      await claimSessions();
      fetchProfileFromApi().then(setProfile);
    }
    return {};
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return {};
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { message: data.message };
  }, []);

  const loginWithOAuth = useCallback(async (provider: OAuthProvider) => {
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, loginWithOAuth, logout, changePassword, forgotPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

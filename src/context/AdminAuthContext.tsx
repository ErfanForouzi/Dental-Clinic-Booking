import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AdminAuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  recheckAdminAccess: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

/**
 * Checks whether the authenticated user's id exists in `admin_users.user_id`.
 * Never checks by email or any other table.
 */
async function checkIsAdminUserId(userId: string): Promise<{ isAdmin: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { isAdmin: false, error: error.message };
  }

  return { isAdmin: Boolean(data && data.user_id === userId) };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const checkCounterRef = useRef(0);

  const verifySessionAndAdmin = useCallback(async (activeSession: Session | null) => {
    const requestId = ++checkCounterRef.current;

    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAuthError(null);
      setLoading(false);
      return;
    }

    if (!activeSession?.user) {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAuthError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSession(activeSession);
    setUser(activeSession.user);
    setAuthError(null);

    const result = await checkIsAdminUserId(activeSession.user.id);

    // Ignore stale async checks if a newer auth transition occurred
    if (requestId !== checkCounterRef.current) return;

    setIsAdmin(result.isAdmin);
    setAuthError(result.error ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
          setLoading(false);
          return;
        }
        await verifySessionAndAdmin(data.session);
      } catch (err) {
        if (!mounted) return;
        setAuthError(err instanceof Error ? err.message : 'Unable to verify session.');
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      void verifySessionAndAdmin(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [verifySessionAndAdmin]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isSupabaseConfigured) {
        return {
          ok: false,
          error: 'Supabase environment variables are not configured yet.',
        };
      }

      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLoading(false);
        return { ok: false, error: error.message };
      }

      const authenticatedUser = data.user ?? data.session?.user ?? null;
      if (!authenticatedUser) {
        setLoading(false);
        return { ok: false, error: 'Sign in succeeded, but user session could not be loaded.' };
      }

      const requestId = ++checkCounterRef.current;
      setSession(data.session);
      setUser(authenticatedUser);

      const adminCheck = await checkIsAdminUserId(authenticatedUser.id);
      if (requestId !== checkCounterRef.current) {
        return { ok: true };
      }

      setIsAdmin(adminCheck.isAdmin);
      setAuthError(adminCheck.error ?? null);
      setLoading(false);

      return { ok: true };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setAuthError(null);
    setLoading(false);
  }, []);

  const recheckAdminAccess = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.auth.getSession();
    await verifySessionAndAdmin(data.session);
  }, [verifySessionAndAdmin]);

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        user,
        isAdmin,
        loading,
        authError,
        signIn,
        signOut,
        recheckAdminAccess,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return ctx;
}

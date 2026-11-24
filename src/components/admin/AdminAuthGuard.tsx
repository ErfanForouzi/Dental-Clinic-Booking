import { Navigate, Outlet } from 'react-router-dom';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { AdminLayout } from './AdminLayout';

export function AdminAuthGuard() {
  const { user, isAdmin, loading, authError, signOut } = useAdminAuth();

  if (!isSupabaseConfigured) {
    return <Navigate to="/admin/login" replace />;
  }

  // Wait until BOTH session hydration and admin_users.user_id check finish.
  // Never redirect back to login while verification is in progress.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F8FB] px-5 text-center">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#DCE6F0] bg-white px-8 py-10 shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-[#0F766E]" />
          <div>
            <p className="font-display text-base font-semibold text-[#0D223A]">
              Verifying administrator access
            </p>
            <p className="mt-1 text-xs text-[#4E647B]">
              Checking your Supabase session and clinic permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F8FB] px-5">
        <div className="w-full max-w-md rounded-2xl border border-[#DCE6F0] bg-white p-8 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <h1 className="mt-5 font-display text-xl font-bold text-[#0D223A]">
            Admin access required
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-[#0D223A]">
            You are signed in, but you are not authorized as an admin.
          </p>

          <p className="mt-2 text-xs leading-relaxed text-[#4E647B]">
            Your Supabase user account ({user.email}) is authenticated, but its user ID is not
            listed in <span className="font-mono text-[#0D223A]">admin_users.user_id</span>.
          </p>

          {authError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              Permission check error: {authError}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0D223A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1B3654]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
            <a
              href="/"
              className="inline-flex items-center rounded-lg border border-[#DCE6F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
            >
              Return to Clinic Website
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Lock,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { ClinicImage } from '../../components/ClinicImage';
import { SupabaseConfigNotice } from '../../components/SupabaseConfigNotice';
import { CLINIC_MEDIA } from '../../config/media';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading, authError, signIn, signOut } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn(email, password);
      if (!result.ok) {
        setFormError(result.error || 'Sign in failed. Please check your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FB] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Architectural Visual Panel (Desktop) */}
      <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between overflow-hidden bg-[#0D223A] p-10 text-white">
        <div className="absolute inset-0">
          <ClinicImage
            src={CLINIC_MEDIA.heroSuite.src}
            alt={CLINIC_MEDIA.heroSuite.alt}
            loading="eager"
            className="h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D223A] via-[#0D223A]/75 to-[#0D223A]/50" />
        </div>

        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#B7CBE0] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Public Website
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-xs font-semibold tracking-wide text-[#5EEAD4]">
            Clinic Operations Portal
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight leading-tight">
            Manage appointments, clinical services, and scheduling in one workspace.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#C6D8EA]">
            Changes saved to services, business hours, blocked dates, and clinic settings take
            effect immediately across the public patient booking experience.
          </p>
        </div>

        <div className="relative z-10 text-xs text-[#8DB3D4]">
          Protected by Supabase Authentication &amp; role verification
        </div>
      </div>

      {/* Right Sign-In Column */}
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:col-span-7">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4E647B] hover:text-[#0D223A]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Website
            </Link>
          </div>

          {!isSupabaseConfigured ? (
            <SupabaseConfigNotice context="admin" />
          ) : loading && !submitting ? (
            <div className="rounded-2xl border border-[#DCE6F0] bg-white p-8 text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#0F766E]" />
              <p className="mt-4 font-display text-base font-semibold text-[#0D223A]">
                Checking session and admin permissions...
              </p>
              <p className="mt-1 text-xs text-[#4E647B]">Please wait a moment.</p>
            </div>
          ) : user && !isAdmin ? (
            <div className="rounded-2xl border border-[#DCE6F0] bg-white p-8 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h1 className="mt-5 font-display text-xl font-bold text-[#0D223A]">
                Not authorized for admin dashboard
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#0D223A]">
                You are signed in, but you are not authorized as an admin.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#4E647B]">
                Signed in as <span className="font-medium text-[#0D223A]">{user.email}</span>. Ask
                your clinic administrator to add your user ID to{' '}
                <span className="font-mono text-[#0D223A]">admin_users</span>.
              </p>

              {authError && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                  {authError}
                </div>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0D223A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1B3654]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
                <Link
                  to="/"
                  className="rounded-lg border border-[#DCE6F0] px-4 py-2.5 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
                >
                  Public Site
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#DCE6F0] bg-white p-7 sm:p-9 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6F4F1] text-[#0F766E]">
                <Lock className="h-5 w-5" />
              </div>

              <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-[#0D223A]">
                Admin Sign In
              </h1>
              <p className="mt-1.5 text-sm text-[#4E647B]">
                Sign in with your Supabase administrator account to manage clinic operations.
              </p>

              {formError && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="admin-email"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Email address
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@clinic.com"
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Password
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

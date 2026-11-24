import { Database, KeyRound } from 'lucide-react';

interface SupabaseConfigNoticeProps {
  context?: 'public' | 'admin';
}

export function SupabaseConfigNotice({ context = 'public' }: SupabaseConfigNoticeProps) {
  return (
    <div className="rounded-2xl border border-[#DCE6F0] bg-[#F4F8FB] p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#DCE6F0] text-[#0F766E]">
          {context === 'admin' ? (
            <KeyRound className="h-5 w-5" />
          ) : (
            <Database className="h-5 w-5" />
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[#0D223A]">
            Connect your Supabase project to load live clinic data
          </h3>
          <p className="text-sm leading-relaxed text-[#4E647B] max-w-2xl">
            {context === 'admin'
              ? 'Admin sign-in uses live Supabase Authentication and checks admin_users.user_id. Add your Supabase environment variables to enable authentication and clinic management.'
              : 'Services, clinic settings, working hours, and live appointment availability are loaded directly from Supabase without placeholder data.'}
          </p>
          <div className="rounded-xl border border-[#DCE6F0] bg-white p-4 font-mono text-xs text-[#0D223A] space-y-1.5 overflow-x-auto">
            <div>VITE_SUPABASE_URL=https://your-project-ref.supabase.co</div>
            <div>VITE_SUPABASE_ANON_KEY=your-publishable-anon-key</div>
          </div>
          <p className="text-xs text-[#4E647B]">
            Need to create the tables first? Run <span className="font-mono text-[#0D223A]">supabase/schema.sql</span> in your Supabase SQL Editor, then add your Supabase Auth user UUID to <span className="font-mono text-[#0D223A]">admin_users</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

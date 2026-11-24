import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarOff,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { fetchClinicSettings } from '../../lib/clinicApi';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: typeof LayoutDashboard;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Overview', end: true, icon: LayoutDashboard },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/admin/services', label: 'Services', icon: Stethoscope },
  { to: '/admin/hours', label: 'Business Hours', icon: Clock },
  { to: '/admin/blocked-dates', label: 'Blocked Dates', icon: CalendarOff },
  { to: '/admin/settings', label: 'Clinic Settings', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAdminAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clinicName, setClinicName] = useState('Harborview Dental');

  useEffect(() => {
    let active = true;
    fetchClinicSettings()
      .then((settings) => {
        if (active && settings?.clinic_name) {
          setClinicName(settings.clinic_name);
        }
      })
      .catch(() => {
        // Keep fallback name silently if settings haven't been created yet
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const currentNav =
    ADMIN_NAV_ITEMS.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    ) ?? ADMIN_NAV_ITEMS[0];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-[#DCE6F0]">
      <div className="flex h-16 items-center justify-between border-b border-[#EAF2F7] px-6">
        <Link
          to="/admin"
          onClick={() => setSidebarOpen(false)}
          className="font-display text-base font-bold tracking-tight text-[#0D223A] truncate"
        >
          {clinicName}
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="lg:hidden rounded-lg p-1.5 text-[#4E647B] hover:bg-[#F4F8FB]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-[#6E849C]">
          Clinic Management
        </p>
        <nav aria-label="Admin sidebar navigation" className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E6F4F1] text-[#0F766E]'
                      : 'text-[#4E647B] hover:bg-[#F4F8FB] hover:text-[#0D223A]'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#EAF2F7] p-4 space-y-2">
        <div className="rounded-xl bg-[#F4F8FB] px-3.5 py-2.5">
          <p className="text-[11px] font-medium text-[#6E849C]">Signed in admin</p>
          <p className="mt-0.5 truncate text-xs font-medium text-[#0D223A]">
            {user?.email ?? 'Authenticated Admin'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-[#4E647B] transition-colors hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#0D223A] flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0D223A]/40 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 w-[268px] max-w-[85vw] h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#DCE6F0] bg-white/95 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden rounded-lg border border-[#DCE6F0] p-2 text-[#0D223A] hover:bg-[#F4F8FB]"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-[#6E849C] whitespace-nowrap">
                Clinic Portal
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-[#B7CBE0]">
                /
              </span>
              <span className="font-display font-semibold text-[#0D223A] truncate">
                {currentNav.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F0] bg-white px-3.5 py-2 text-xs font-medium text-[#0D223A] transition-colors hover:bg-[#F4F8FB] whitespace-nowrap shrink-0"
            >
              <span>Public Site</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#4E647B]" />
            </Link>
          </div>
        </header>

        <main className="flex-1 px-5 py-7 sm:px-8 lg:py-9">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  clinicName: string;
  onBookClick: () => void;
}

export function Navbar({ clinicName, onBookClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleBook = () => {
    setMobileOpen(false);
    onBookClick();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#DCE6F0]/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-8 px-5 sm:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-[#0D223A] whitespace-nowrap shrink-0 transition-opacity hover:opacity-80"
        >
          {clinicName}
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4E647B]"
        >
          <a
            href="#services"
            className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#0D223A]"
          >
            Services
          </a>
          <a
            href="#about"
            className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#0D223A]"
          >
            About
          </a>
          <a
            href="#booking"
            className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#0D223A]"
          >
            Schedule
          </a>
          <Link
            to="/admin"
            className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#0D223A]"
          >
            Admin
          </Link>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleBook}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#0F766E] px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#115E59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
          >
            Book Appointment
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="inline-flex md:hidden items-center justify-center rounded-lg border border-[#DCE6F0] p-2 text-[#0D223A] hover:bg-[#F4F8FB]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#DCE6F0] bg-white px-5 py-4">
          <nav className="flex flex-col gap-1">
            <a
              href="#services"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
            >
              Services
            </a>
            <a
              href="#about"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
            >
              About
            </a>
            <a
              href="#booking"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
            >
              Schedule
            </a>
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
            >
              Admin Portal
            </Link>
            <button
              type="button"
              onClick={handleBook}
              className="mt-2 w-full rounded-lg bg-[#0F766E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#115E59]"
            >
              Book Appointment
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

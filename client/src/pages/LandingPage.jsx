import { Link } from 'react-router-dom';
import logoIcon from '../assets/logo.png';
import collegeBg from '../assets/college-bg.png';
import {
  HiOutlineClipboardDocumentCheck,
  HiOutlineShieldCheck,
  HiOutlineBellAlert,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';

const FEATURES = [
  {
    icon: HiOutlineClipboardDocumentCheck,
    title: 'Submission Tracking',
    description: 'Students submit clearance items digitally and track every step in real time.',
  },
  {
    icon: HiOutlineShieldCheck,
    title: 'Multi-Stage Approval',
    description: 'Clearances flow through teachers, section heads, class incharges, and HOD sequentially.',
  },
  {
    icon: HiOutlineBellAlert,
    title: 'Real-Time Notifications',
    description: 'Instant alerts when items are approved, rejected, or require attention.',
  },
  {
    icon: HiOutlineSquares2X2,
    title: 'Role-Based Dashboards',
    description: 'Every role sees exactly what they need — nothing more, nothing less.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="w-full border-b border-border-subtle bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoIcon} alt="ClearMate" className="h-10 w-auto object-contain" />
            <span className="text-xl font-extrabold text-ink-primary tracking-wide font-display">
              CLEARMATE
            </span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold px-4 py-1.5 rounded-md bg-brand/10 text-brand hover:bg-brand hover:text-white transition-all duration-150"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero with Exact Uploaded College Background */}
      <section className="relative min-h-[560px] sm:min-h-[620px] flex items-center justify-center overflow-hidden bg-white">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${collegeBg})` }}
        />
        
        {/* Soft Fades for seamless blend */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/40 to-white backdrop-blur-[1px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white shadow-lg">
            <span>🏫</span> SBJIT College Clearance System
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight font-display drop-shadow-sm">
            Paperless clearance, from first{' '}
            <br className="hidden sm:block" />
            submission to final signature
          </h1>
          <p className="mt-5 text-base sm:text-xl text-slate-800 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-sm">
            ClearMate digitises the entire student clearance workflow — submissions,
            multi-level approvals, and certificate generation — so nothing slips
            through the cracks.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-brand hover:bg-brand-hover text-white text-base font-semibold rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2"
            >
              Sign in to continue →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-xl font-semibold text-ink-primary text-center mb-10">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <feature.icon className="w-5 h-5 text-brand mb-3" />
                <h3 className="text-sm font-semibold text-ink-primary mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border-subtle bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="ClearMate" className="h-8 w-auto object-contain" />
            <span className="text-base font-extrabold text-ink-primary tracking-wide font-display">
              CLEARMATE
            </span>
          </div>
          <p className="text-xs text-ink-muted">
            &copy; {new Date().getFullYear()} Institution Name. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

import InstituteHeader from './InstituteHeader';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

/**
 * DashboardLayout — the standard app shell for all authenticated pages.
 * Provides top institutional header + persistent sidebar + top navbar + content area.
 *
 * @param {Object} props
 * @param {string} props.title - The page title shown in the navbar
 * @param {React.ReactNode} props.children - The page content
 */
export default function DashboardLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top Institute Header strip spanning full width */}
      <InstituteHeader />

      {/* Main app layout underneath top header */}
      <div className="flex-1 flex relative items-start">
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          <Navbar title={title} />

          <main className="p-3 sm:p-5 md:p-8 max-w-7xl mx-auto w-full transition-all duration-150">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

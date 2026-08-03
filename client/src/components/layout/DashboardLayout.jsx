import Sidebar from './Sidebar';
import Navbar from './Navbar';

/**
 * DashboardLayout — the standard app shell for all authenticated pages.
 * Provides the persistent sidebar + top navbar + scrollable content area.
 *
 * @param {Object} props
 * @param {string} props.title - The page title shown in the navbar
 * @param {React.ReactNode} props.children - The page content
 */
export default function DashboardLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="md:pl-60">
        <Navbar title={title} />

        <main className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

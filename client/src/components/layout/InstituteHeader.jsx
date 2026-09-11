import { Link } from 'react-router-dom';
import sbjainEmblem from '../../assets/sbjain-emblem.png';

/**
 * InstituteHeader — Top institutional header strip for S.B. Jain Institute.
 * Sits at the very top of the page above the CLEARMATE sidebar and navbar.
 */
export default function InstituteHeader() {
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm relative z-40">
      <div className="w-full px-4 sm:px-6 md:px-8 py-2.5 flex items-center justify-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left">
          {/* S.B. Jain Emblem Logo */}
          <Link to="/" className="shrink-0">
            <img
              src={sbjainEmblem}
              alt="S.B. Jain Logo"
              className="h-12 sm:h-14 md:h-16 w-auto object-contain"
            />
          </Link>

          {/* Institute Text & Accreditation Details */}
          <div className="flex flex-col items-center sm:items-start justify-center min-w-0">
            <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-x-2 gap-y-0.5">
              <span className="text-base sm:text-xl md:text-2xl font-extrabold text-[#2e2a6e] tracking-tight font-serif">
                S.B. Jain Institute
              </span>
              <span className="text-xs sm:text-base font-normal text-[#2e2a6e] tracking-tight">
                of Technology, Management & Research
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
              <span className="inline-block px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white bg-[#e91e3c] rounded uppercase tracking-wider shadow-xs">
                An Autonomous Institute
              </span>
            </div>

            <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[#1a7a3c] mt-0.5 truncate">
              Affiliated to R. T. M. Nagpur University
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

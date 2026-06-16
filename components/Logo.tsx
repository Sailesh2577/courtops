// CourtOps brand mark: a badminton shuttlecock drawn pointing down so its cork
// reads as a map pin. The product answers "which court, who's next, where" so
// the shuttle that doubles as a location pin is the whole idea in one glyph.
// Monochrome on currentColor, so it inherits whatever color it sits on (white
// on the green brand chip, green on a plain surface).

export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* feather skirt, faint fill for depth */}
      <path
        d="M5 9.5 Q16 3.5 27 9.5 L19.5 18 L12.5 18 Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M5 9.5 Q16 3.5 27 9.5 L19.5 18 L12.5 18 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {/* feather ribs */}
      <path
        d="M16 4.2 L16 18 M10.4 6.1 L13.7 18 M21.6 6.1 L18.3 18"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* cork, tapered to the pin point */}
      <path
        d="M12.5 18 L19.5 18 L17.4 24.6 Q16 27.8 14.6 24.6 Z"
        fill="currentColor"
      />
    </svg>
  );
}

// The full lockup: the mark in its rounded green chip plus the wordmark.
export function Logo({
  size = 34,
  showName = true,
}: {
  size?: number;
  showName?: boolean;
}) {
  return (
    <span className="logo">
      <span className="logo-chip" style={{ width: size, height: size }}>
        <LogoMark size={size * 0.62} />
      </span>
      {showName && <span className="logo-name">CourtOps</span>}
    </span>
  );
}

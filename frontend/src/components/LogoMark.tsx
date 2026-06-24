type LogoMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Icon mark: Instrument Serif S + ascending bars + growth arc.
 * No embedded wordmark — stays legible from favicon to hero.
 */
export function LogoMark({ className = "", title }: LogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      <path
        d="M10 43C16 28 32 17 49 15"
        stroke="#6fa384"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />

      <text
        x="1"
        y="42"
        fill="#1a4d3a"
        fontFamily="'Instrument Serif', Georgia, 'Times New Roman', serif"
        fontSize="40"
        fontWeight="400"
      >
        S
      </text>

      <rect x="37" y="35" width="3.5" height="9" rx="1" fill="#6fa384" />
      <rect x="42.5" y="29" width="3.5" height="15" rx="1" fill="#6fa384" />
      <rect x="48" y="21" width="3.5" height="23" rx="1" fill="#2f7d5a" />

      <path
        d="M49 15L45.8 14.2L47.2 18"
        stroke="#2f7d5a"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

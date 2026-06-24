type LogoMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Icon mark: ascending comp bars in a soft rounded tile.
 * No letterforms — the wordmark carries the name.
 */
export function LogoMark({ className = "", title }: LogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      <rect x="1" y="1" width="38" height="38" rx="10" fill="#e8f5ee" />
      <rect x="1" y="1" width="38" height="38" rx="10" stroke="#c5dfd0" strokeWidth="1.5" />

      <rect x="8" y="22" width="6" height="10" rx="2" fill="#6fa384" />
      <rect x="17" y="16" width="6" height="16" rx="2" fill="#2f7d5a" />
      <rect x="26" y="9" width="6" height="23" rx="2" fill="#1a4d3a" />
    </svg>
  );
}

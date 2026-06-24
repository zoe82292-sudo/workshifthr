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
      <rect x="1" y="1" width="38" height="38" rx="10" stroke="#c5dfd0" strokeWidth="1" />

      <rect x="9" y="23" width="5" height="9" rx="1.5" fill="#6fa384" />
      <rect x="17.5" y="17" width="5" height="15" rx="1.5" fill="#2f7d5a" />
      <rect x="26" y="11" width="5" height="21" rx="1.5" fill="#1a4d3a" />
    </svg>
  );
}

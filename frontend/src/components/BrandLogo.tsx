type BrandLogoProps = {
  size?: "nav" | "hero" | "loading";
  className?: string;
  onClick?: () => void;
};

const SIZE_CLASS = {
  nav: "brand-logo--nav",
  hero: "brand-logo--hero",
  loading: "brand-logo--loading",
} as const;

export function BrandLogo({ size = "nav", className = "", onClick }: BrandLogoProps) {
  const image = (
    <img
      className={`brand-logo__image ${SIZE_CLASS[size]}`}
      src="/logo.png"
      alt="WorkShift HR"
      width={size === "hero" ? 168 : size === "loading" ? 128 : 56}
      height={size === "hero" ? 168 : size === "loading" ? 128 : 56}
    />
  );

  if (onClick) {
    return (
      <button
        className={`brand-logo brand-logo--button ${SIZE_CLASS[size]} ${className}`.trim()}
        type="button"
        onClick={onClick}
        aria-label="WorkShift HR home"
      >
        {image}
      </button>
    );
  }

  return <div className={`brand-logo ${SIZE_CLASS[size]} ${className}`.trim()}>{image}</div>;
}

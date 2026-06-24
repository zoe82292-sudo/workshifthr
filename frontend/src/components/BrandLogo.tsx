import { LogoMark } from "./LogoMark";

type BrandLogoProps = {
  size?: "nav" | "hero" | "loading";
  layout?: "icon" | "lockup";
  className?: string;
  onClick?: () => void;
};

export function BrandLogo({
  size = "nav",
  layout,
  className = "",
  onClick,
}: BrandLogoProps) {
  const showLockup = layout ?? (size === "hero");
  const sizeClass = `brand-logo--${size}`;
  const layoutClass = showLockup ? "brand-logo--lockup" : "brand-logo--icon";

  const content = (
    <>
      <LogoMark
        className="brand-logo__mark"
        title={showLockup ? undefined : "ShiftWorksHR"}
      />
      {showLockup ? (
        <span className="brand-logo__wordmark">
          ShiftWorks<span className="brand-logo__wordmark-hr">HR</span>
        </span>
      ) : null}
    </>
  );

  const classes = `brand-logo ${sizeClass} ${layoutClass} ${className}`.trim();

  if (onClick) {
    return (
      <button
        className={`${classes} brand-logo--button`.trim()}
        type="button"
        onClick={onClick}
        aria-label="ShiftWorksHR home"
      >
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}

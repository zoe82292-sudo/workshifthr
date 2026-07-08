import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

type DemoVideoBrowserFrameProps = {
  children: ReactNode;
  path?: string;
  showBrand?: boolean;
};

export function DemoVideoBrowserFrame({
  children,
  path = "shiftworkshr.com",
  showBrand = false,
}: DemoVideoBrowserFrameProps) {
  return (
    <div className="demo-video-browser">
      <header className="demo-video-browser__bar">
        <div className="demo-video-browser__dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p className="demo-video-browser__url">{path}</p>
        {showBrand ? <BrandLogo size="nav" layout="icon" className="demo-video-browser__brand" /> : null}
      </header>
      <div className="demo-video-browser__body">{children}</div>
    </div>
  );
}

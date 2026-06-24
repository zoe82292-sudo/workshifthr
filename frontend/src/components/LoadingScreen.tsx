import { BrandLogo } from "./BrandLogo";

export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <BrandLogo size="loading" />
      <p>Loading WorkShift HR...</p>
    </div>
  );
}

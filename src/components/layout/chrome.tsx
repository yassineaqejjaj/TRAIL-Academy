"use client";
import { usePathname } from "next/navigation";

/** Hides the public header/footer on focused areas (course player, admin). */
export function Chrome({ hideOn, children }: { hideOn: string[]; children: React.ReactNode }) {
  const pathname = usePathname();
  return hideOn.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? null : <>{children}</>;
}

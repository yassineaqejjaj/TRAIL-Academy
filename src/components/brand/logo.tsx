import Image from "next/image";

/** Light and dark logos; CSS (globals.css) shows the one that matches the active theme, so there is no flash and no client JS. */
export function Logo({ height = 44, priority = false }: { height?: number; priority?: boolean }) {
  const width = Math.round(height * (720 / 292));
  const common = { width, height, priority } as const;
  return (
    <span className="relative inline-flex shrink-0 items-center" style={{ height }}>
      <Image src="/brand/logo-light.png" alt="" {...common} className="logo-light h-auto" style={{ height, width }} />
      <Image src="/brand/logo-dark.png" alt="" {...common} className="logo-dark h-auto" style={{ height, width }} />
    </span>
  );
}

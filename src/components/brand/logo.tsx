import Image from "next/image";

/** Both logos are rendered; CSS (globals.css) shows the one made for the active theme, so there is no flash and no client JS. */
export function Logo({ height = 44, priority = false }: { height?: number; priority?: boolean }) {
  const width = Math.round(height * (720 / 292));
  const common = { width, height, priority, style: { height, width } } as const;
  return (
    <span className="inline-flex shrink-0 items-center" style={{ height }}>
      <Image src="/brand/logo-dark.png" alt="" {...common} className="logo-dark h-auto" />
      <Image src="/brand/logo-light.png" alt="" {...common} className="logo-light h-auto" />
    </span>
  );
}

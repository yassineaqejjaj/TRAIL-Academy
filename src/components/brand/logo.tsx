import Image from "next/image";

/** The dark-background logo: the whole site is dark (see globals.css). `logo-light.png` stays in public/brand for documents and print. */
export function Logo({ height = 44, priority = false }: { height?: number; priority?: boolean }) {
  const width = Math.round(height * (720 / 292));
  return <Image src="/brand/logo-dark.png" alt="" width={width} height={height} priority={priority} style={{ height, width }} className="h-auto shrink-0" />;
}

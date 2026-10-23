import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export function Container({ className, ...p }: ComponentProps<"div">) {
  return <div className={clsx("mx-auto w-full max-w-[1200px] px-4 sm:px-8", className)} {...p} />;
}

export const kickerCls = "text-[13px] font-semibold uppercase tracking-[0.08em]";

/** Page section. `tone="surface"` gives the white, ruled band used to separate content blocks. */
export function Section({ title, kicker, intro, children, className, id, tone }: { title?: string; kicker?: string; intro?: string; children: ReactNode; className?: string; id?: string; tone?: "surface" }) {
  return (
    <section id={id} className={clsx(tone === "surface" && "border-y border-border bg-surface")}>
      <Container className={clsx("py-16 sm:py-20", className)}>
        {(title || kicker) && (
          <header className="mb-10 max-w-3xl">
            {kicker && <p className={clsx(kickerCls, "mb-2 text-accent")}>{kicker}</p>}
            {title && <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>}
            {intro && <p className="mt-3 text-muted">{intro}</p>}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}

const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 py-3 text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";
const variants = {
  primary: "bg-primary text-primary-fg hover:opacity-90",
  accent: "bg-accent text-white hover:opacity-90 dark:text-[#06201f]",
  secondary: "border border-fg bg-transparent text-fg hover:bg-surface-2",
  ghost: "text-fg hover:bg-surface-2",
};

export function ButtonLink({ href, variant = "primary", className, ...p }: { href: string; variant?: keyof typeof variants } & Omit<ComponentProps<typeof Link>, "href">) {
  return <Link href={href} className={clsx(btn, variants[variant], className)} {...p} />;
}

export function Button({ variant = "primary", className, ...p }: { variant?: keyof typeof variants } & ComponentProps<"button">) {
  return <button className={clsx(btn, variants[variant], className)} {...p} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "warn"; children: ReactNode }) {
  const tones = { neutral: "bg-surface-2 text-muted", accent: "bg-accent-soft text-accent-ink", warn: "bg-warn-soft text-warn" };
  return <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold", tones[tone])}>{children}</span>;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={clsx("rounded-2xl border border-border bg-surface p-6", className)} {...p} />;
}

/** Pill filter / toggle (min 44px touch target). */
export function Chip({ href, active, children }: { href: string; active?: boolean; children: ReactNode }) {
  return <Link href={href} aria-current={active ? "true" : undefined} className={clsx("inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium", active ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface hover:bg-surface-2")}>{children}</Link>;
}

export function Notice({ tone = "warn", title, children }: { tone?: "warn" | "info"; title: string; children: ReactNode }) {
  return (
    <div role="note" className={clsx("rounded-xl border p-4 text-sm", tone === "warn" ? "border-warn/30 bg-warn-soft text-fg" : "border-accent/30 bg-accent-soft text-fg")}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-muted">{children}</div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-muted p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-muted">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded bg-border">
      <div className="h-full rounded bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="border-b border-border">
      {items.map((i) => (
        <details key={i.q} className="group border-t border-border py-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
            {i.q}
            <span aria-hidden className="text-muted transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-muted">{i.a}</p>
        </details>
      ))}
    </div>
  );
}

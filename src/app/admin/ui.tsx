import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import { Button, Notice } from "@/components/ui";

export const inputCls = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return <div className="mb-6" role={error ? "alert" : "status"}><Notice tone={error ? "warn" : "info"} title={error ? "Erreur" : "Enregistré"}>{error ?? ok}</Notice></div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block text-sm font-medium">{label}{children}{hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}</label>;
}
export const Input = ({ className, ...p }: ComponentProps<"input">) => <input className={clsx(inputCls, className)} {...p} />;
export const Textarea = ({ className, rows = 4, ...p }: ComponentProps<"textarea">) => <textarea rows={rows} className={clsx(inputCls, className)} {...p} />;
export const Select = ({ className, ...p }: ComponentProps<"select">) => <select className={clsx(inputCls, className)} {...p} />;
export function Check({ label, ...p }: { label: string } & ComponentProps<"input">) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...p} /> {label}</label>;
}

export function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mt-8 glass rounded-2xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2>{actions}</div>
      {children}
    </section>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto glass rounded-2xl">
      <table className="w-full min-w-[640px] text-sm"><thead className="bg-surface-2 text-left"><tr>{head.map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{children}</tbody></table>
    </div>
  );
}

/** Small POST form wrapping a single button (reorder, delete, toggle…). */
export function ActionButton({ action, label, variant = "secondary", children }: { action: (fd: FormData) => Promise<void>; label: string; variant?: "secondary" | "ghost" | "primary" | "accent"; children?: ReactNode }) {
  return <form action={action} className="inline">{children}<Button type="submit" variant={variant} className="px-3 py-1.5" aria-label={label} title={label}>{label}</Button></form>;
}

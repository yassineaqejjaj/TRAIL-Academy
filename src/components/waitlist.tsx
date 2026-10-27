"use client";
import { useState } from "react";
import { InterestForm } from "@/components/interest-form";

/** Waiting list: the person picks what they want to be told about (a module or a path), then leaves an e-mail with consent. */
export function WaitlistForm({ options, defaultSlug }: { options: { slug: string; label: string; group: string }[]; defaultSlug?: string }) {
  const [slug, setSlug] = useState(defaultSlug ?? options[0]?.slug ?? "");
  const groups = Array.from(new Set(options.map((o) => o.group)));
  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor="waitlist-choice" className="mb-2 block text-sm font-semibold">Ce qui vous intéresse</label>
        <select id="waitlist-choice" value={slug} onChange={(e) => setSlug(e.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg">
          {groups.map((g) => <optgroup key={g} label={g}>{options.filter((o) => o.group === g).map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</optgroup>)}
        </select>
      </div>
      <InterestForm key={slug} kind="course_launch" courseSlug={slug} label="Votre e-mail" submitLabel="Être informé de l'ouverture" />
    </div>
  );
}

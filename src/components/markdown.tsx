import ReactMarkdown from "react-markdown";
import { slugify, textOf } from "@/lib/slug";
import { MermaidDiagram } from "./mermaid-diagram";

function isMermaid(node: unknown): boolean {
  const child = Array.isArray(node) ? node[0] : node;
  return Boolean((child as { props?: { className?: string } } | null)?.props?.className?.includes("language-mermaid"));
}

/**
 * Renders instructor-authored Markdown. Raw HTML is never rendered (react-markdown escapes it) and
 * unsafe URL schemes such as javascript: are neutralised by its default URL transform.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className ?? "max-w-[72ch] space-y-4 text-[17px] leading-[1.7] [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-7 [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.92em] [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-hairline [&_pre]:bg-inset [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:bg-accent-soft [&_blockquote]:px-4 [&_blockquote]:py-2 [&_hr]:border-hairline [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:border-hairline [&_td]:p-2 [&_th]:border [&_th]:border-hairline [&_th]:p-2 [&_th]:text-left"}>
      <ReactMarkdown components={{
        code: ({ className: cn, children: c, ...rest }) => (/language-mermaid/.test(cn ?? "") ? <MermaidDiagram chart={String(c).replace(/\n$/, "")} /> : <code className={cn} {...rest}>{c}</code>),
        h2: ({ children: c }) => <h2 id={slugify(textOf(c))} className="scroll-mt-24">{c}</h2>,
        h3: ({ children: c }) => <h3 id={slugify(textOf(c))} className="scroll-mt-24">{c}</h3>,
        pre: ({ children: c }) => (isMermaid(c) ? <>{c}</> : <pre>{c}</pre>),
        a: ({ href, children: c }) => <a href={href} rel="noopener noreferrer nofollow" target={href?.startsWith("http") ? "_blank" : undefined}>{c}</a> }}>{children}</ReactMarkdown>
    </div>
  );
}

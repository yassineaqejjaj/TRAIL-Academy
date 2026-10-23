import ReactMarkdown from "react-markdown";
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
    <div className={className ?? "space-y-4 leading-7 [&_a]:text-accent [&_a]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-2 [&_pre]:p-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4"}>
      <ReactMarkdown components={{
        code: ({ className: cn, children: c, ...rest }) => (/language-mermaid/.test(cn ?? "") ? <MermaidDiagram chart={String(c).replace(/\n$/, "")} /> : <code className={cn} {...rest}>{c}</code>),
        pre: ({ children: c }) => (isMermaid(c) ? <>{c}</> : <pre>{c}</pre>),
        a: ({ href, children: c }) => <a href={href} rel="noopener noreferrer nofollow" target={href?.startsWith("http") ? "_blank" : undefined}>{c}</a> }}>{children}</ReactMarkdown>
    </div>
  );
}

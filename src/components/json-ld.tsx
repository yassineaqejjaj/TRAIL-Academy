/** Renders schema.org data. `<` is escaped so content can never close the script tag; the script type is inert under the CSP. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

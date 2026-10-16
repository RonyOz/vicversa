import { renderToStaticMarkup } from "react-dom/server";
import { fontFaceCss } from "./fonts.js";
import type { ResolvedDocument } from "./resolve.js";
import { baseStyles } from "./templates/kit.js";
import type { LoadedTemplate } from "./templates/registry.js";

/** A complete, self-contained HTML document: no external requests, ever. */
export async function buildHtml(doc: ResolvedDocument, template: LoadedTemplate): Promise<string> {
  const { definition, theme } = template;
  const faces = await fontFaceCss(definition.fonts);
  const body = renderToStaticMarkup(<definition.Page doc={doc} theme={theme} />);

  return `<!doctype html>
<html lang="${doc.lang}">
<head>
<meta charset="utf-8">
<title>${doc.name}</title>
<style>
${faces}
</style>
<style>
${baseStyles(theme)}

${definition.styles(theme)}
</style>
</head>
<body>${body}</body>
</html>`;
}

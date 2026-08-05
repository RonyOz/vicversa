import { renderToStaticMarkup } from "react-dom/server";
import { fontFaceCss } from "./fonts.js";
import type { ResolvedDocument } from "./resolve.js";
import { Cv } from "./template/Cv.js";
import { styles } from "./template/styles.js";
import type { Theme } from "./theme.js";

/** A complete, self-contained HTML document: no external requests, ever. */
export async function buildHtml(doc: ResolvedDocument, theme: Theme): Promise<string> {
  const faces = await fontFaceCss();
  const body = renderToStaticMarkup(<Cv doc={doc} theme={theme} />);

  return `<!doctype html>
<html lang="${doc.lang}">
<head>
<meta charset="utf-8">
<title>${doc.name}</title>
<style>
${faces}
</style>
<style>
${styles(theme)}
</style>
</head>
<body>${body}</body>
</html>`;
}

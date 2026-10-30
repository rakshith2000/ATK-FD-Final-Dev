const KB_ARTICLE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif; font-size: 14px; line-height: 1.7; color: #24292f; }
  h1 { font-size: 1.75em; font-weight: 700; margin: 0.8em 0 0.4em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h2 { font-size: 1.4em; font-weight: 600; margin: 0.7em 0 0.35em; }
  h3 { font-size: 1.15em; font-weight: 600; margin: 0.6em 0 0.3em; }
  p { margin: 0.5em 0; }
  ul, ol { padding-left: 1.8em; margin: 0.5em 0; }
  li { margin: 0.25em 0; line-height: 1.6; }
  a { color: #0969da; text-decoration: underline; }
  strong, b { font-weight: 600; }
  em, i { font-style: italic; }
  u { text-decoration: underline; }
`;

export const buildArticleHtml = (body: string, title?: string): string => {
  const safeTitle = title || "Knowledge Article";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style>${KB_ARTICLE_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
};

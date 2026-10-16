import { useEffect, useRef, useState } from "react";

/** A4 in CSS pixels at 96 dpi: the size the CV page is laid out at. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

/**
 * The real CV page (same HTML the PDF is printed from), scaled down to fit
 * its column. Scaling the whole page keeps line breaks exactly as printed;
 * shrinking the iframe instead would reflow the text.
 */
export function CvPreview({ src, title, thumbnail = false }: { src: string; title: string; thumbnail?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry!.contentRect.width / PAGE_WIDTH));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={box} className={`cv-box${thumbnail ? " thumb" : ""}`} style={{ height: PAGE_HEIGHT * scale }}>
      <iframe
        src={src}
        title={title}
        tabIndex={thumbnail ? -1 : undefined}
        loading="lazy"
        style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${scale})` }}
      />
    </div>
  );
}

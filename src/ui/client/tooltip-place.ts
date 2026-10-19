const GAP = 8;
const EDGE = 8;

/**
 * Where a tooltip of `size` goes for a target `rect`: centered above it,
 * below when there is no room above, never past the viewport edges. With
 * `side = "right"` (sidebar icons) it sits beside the target instead.
 */
export function placeTooltip(
  rect: { left: number; right: number; top: number; bottom: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  side: "auto" | "right" = "auto",
): { left: number; top: number; place: "top" | "bottom" | "right" } {
  if (side === "right") {
    const middle = (rect.top + rect.bottom) / 2;
    const top = Math.min(Math.max(middle - size.height / 2, EDGE), viewport.height - size.height - EDGE);
    return { left: rect.right + GAP, top, place: "right" };
  }
  const center = (rect.left + rect.right) / 2;
  const left = Math.min(Math.max(center - size.width / 2, EDGE), viewport.width - size.width - EDGE);
  const above = rect.top - GAP - size.height;
  return above >= EDGE
    ? { left, top: above, place: "top" }
    : { left, top: rect.bottom + GAP, place: "bottom" };
}

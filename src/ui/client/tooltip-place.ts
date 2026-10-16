const GAP = 8;
const EDGE = 8;

/**
 * Where a tooltip of `size` goes for a target `rect`: centered above it,
 * below when there is no room above, never past the viewport edges.
 */
export function placeTooltip(
  rect: { left: number; right: number; top: number; bottom: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number; place: "top" | "bottom" } {
  const center = (rect.left + rect.right) / 2;
  const left = Math.min(Math.max(center - size.width / 2, EDGE), viewport.width - size.width - EDGE);
  const above = rect.top - GAP - size.height;
  return above >= EDGE
    ? { left, top: above, place: "top" }
    : { left, top: rect.bottom + GAP, place: "bottom" };
}

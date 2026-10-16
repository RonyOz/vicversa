import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { placeTooltip } from "./tooltip-place.js";

/**
 * One tooltip for the whole app. Any element with `data-tip="…"` gets it on
 * hover and on keyboard focus; the first line is the title, the rest detail.
 * Delegated listeners instead of a wrapper per element, because the timeline
 * and calendar draw hundreds of small marks.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number; place: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current: Element | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;

    const target = (event: Event) => (event.target instanceof Element ? event.target.closest("[data-tip]") : null);
    const hide = () => {
      clearTimeout(timer);
      current = null;
      visible = false;
      setTip(null);
    };
    const enter = (event: Event) => {
      const element = target(event);
      if (element === current) return;
      current = element;
      clearTimeout(timer);
      if (!element) return hide();
      // A short delay on the first tooltip avoids flashes while the pointer
      // crosses the page; moving between tipped elements is instant.
      timer = setTimeout(
        () => {
          visible = true;
          setTip({ text: element.getAttribute("data-tip") ?? "", rect: element.getBoundingClientRect() });
        },
        visible ? 0 : 140,
      );
    };
    const leaveWindow = (event: PointerEvent) => {
      if (!event.relatedTarget) hide();
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && hide();

    document.addEventListener("pointerover", enter);
    document.addEventListener("focusin", enter);
    document.addEventListener("focusout", hide);
    document.addEventListener("pointerout", leaveWindow);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", hide, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("pointerout", leaveWindow);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!tip || !box.current) return setPosition(null);
    const { width, height } = box.current.getBoundingClientRect();
    setPosition(placeTooltip(tip.rect, { width, height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [tip]);

  if (!tip) return null;
  const [title, ...rest] = tip.text.split("\n");
  return (
    <div
      ref={box}
      role="tooltip"
      className={`tooltip ${position?.place ?? "top"}`}
      style={position ? { left: position.left, top: position.top } : { visibility: "hidden", left: 0, top: 0 }}
    >
      <strong>{title}</strong>
      {rest.length > 0 && <span>{rest.join("\n")}</span>}
    </div>
  );
}

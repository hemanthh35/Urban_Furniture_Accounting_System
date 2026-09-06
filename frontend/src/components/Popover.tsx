import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface Props {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  estimatedHeight?: number;
  minWidth?: number;
}

// Renders a dropdown/calendar popup at document.body via a portal, positioned
// with `fixed` from the anchor's own on-screen position. A modal's scrollable
// body clips and stretches to fit any absolutely-positioned child that
// overflows it - which is exactly what made a popup opened near the bottom of
// a form force the whole modal to grow a scrollbar. Escaping to a portal with
// `position: fixed` sidesteps that entirely, since fixed positioning is never
// part of an ancestor's scrollable content area. Flips above the field
// instead of below when there isn't room, and closes on scroll/resize rather
// than trying to reposition mid-scroll.
export default function Popover({ anchorRef, open, onClose, children, className, estimatedHeight = 320, minWidth }: Props) {
  const [style, setStyle] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const openUp = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight;
    const width = minWidth ? Math.max(rect.width, minWidth) : rect.width;
    setStyle({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      // Keep a too-narrow anchor (e.g. a compact date-range field) from
      // pushing the popup off past the right edge of the viewport.
      left: Math.min(rect.left, window.innerWidth - width - 8),
      width,
      openUp,
    });

    function close(e: Event) {
      // A 'scroll' event doesn't bubble, so this only ever fires (in the
      // capture phase) for the element actually being scrolled. Scrolling
      // *inside* the popup's own list (e.g. a long dropdown) must not close
      // it - only scrolling something outside it (the modal body, the page)
      // should, since that's what would otherwise leave the popup detached
      // from its anchor field.
      if (popupRef.current && popupRef.current.contains(e.target as Node)) return;
      onClose();
    }
    // capture:true catches scrolling inside any ancestor (a modal body, a
    // page section), not just the window itself.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, anchorRef, estimatedHeight, onClose]);

  if (!open || !style) return null;

  return createPortal(
    <div
      ref={popupRef}
      className={className}
      style={{
        position: "fixed",
        top: style.openUp ? undefined : style.top,
        bottom: style.openUp ? window.innerHeight - style.top : undefined,
        left: style.left,
        width: style.width,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

const Magnifier = ({ lensSize = 300, scale = 2 }) => {
  const enabled = useSelector(
    (state) => state.accessibility.magnifierEnabled
  );

  const overlayRef = useRef(null);
  const clonedRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (enabled) createOverlay();
    else removeOverlay();

    return removeOverlay;
  }, [enabled]);

  const createOverlay = () => {
    if (overlayRef.current) return;

    // Prevent default scroll/zoom gestures globally
    document.body.style.touchAction = "none";
    document.documentElement.style.touchAction = "none";

    const overlay = document.createElement("div");
    overlay.className = "__magnifier_overlay";

    Object.assign(overlay.style, {
      position: "fixed",
      width: `${lensSize}px`,
      height: `${lensSize}px`,
      borderRadius: "50%",
      overflow: "hidden",
      pointerEvents: "none",   // ← lens never blocks touches
      zIndex: 999999,
      border: "4px solid white",
      background: "#fff",
      display: "none",
      touchAction: "none",
    });

    const clone = document.createElement("div");
    Object.assign(clone.style, {
      position: "absolute",
      width: "100vw",
      height: "100vh",
      transformOrigin: "0 0",
      pointerEvents: "none",
    });

    overlay.appendChild(clone);
    document.body.appendChild(overlay);

    overlayRef.current = overlay;
    clonedRef.current = clone;

    // ─── Unified move handler ──────────────────────────────────────────────
    // Accepts both PointerEvent (mouse / stylus) and TouchEvent (finger).
    // Listening on `window` with `capture: true` means we see the event
    // BEFORE any modal backdrop/overlay can stop propagation.
    const moveOverlay = (x, y) => {
      overlay.style.display = "block";
      overlay.style.left = `${x - lensSize / 2}px`;
      overlay.style.top = `${y - lensSize / 2}px`;

      const tx = lensSize / 2 / scale - x;
      const ty = lensSize / 2 / scale - y;
      clone.style.transform = `scale(${scale}) translate(${tx}px, ${ty}px)`;
    };

    const onPointerMove = (e) => {
      moveOverlay(e.clientX, e.clientY);
    };

    // Finger touch — use first touch point
    const onTouchMove = (e) => {
      // e.preventDefault() stops the page from scrolling while magnifying
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) moveOverlay(touch.clientX, touch.clientY);
    };

    const onTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch) moveOverlay(touch.clientX, touch.clientY);
    };

    // Capture phase + passive:false so preventDefault() works on touch
    window.addEventListener("pointermove", onPointerMove, { capture: true });
    window.addEventListener("touchmove",   onTouchMove,   { capture: true, passive: false });
    window.addEventListener("touchstart",  onTouchStart,  { capture: true, passive: false });

    // Store refs for cleanup
    overlay.__onPointerMove = onPointerMove;
    overlay.__onTouchMove   = onTouchMove;
    overlay.__onTouchStart  = onTouchStart;

    intervalRef.current = setInterval(updateClone, 120);
    updateClone();
  };

  const updateClone = () => {
    if (!clonedRef.current) return;

    const root = document.getElementById("root");
    if (!root) return;

    const cloneNode = root.cloneNode(true);
    cloneNode.querySelectorAll("*").forEach((el) => {
      el.style.pointerEvents = "none";
    });

    clonedRef.current.innerHTML = "";
    clonedRef.current.appendChild(cloneNode);
  };

  const removeOverlay = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    window.removeEventListener("pointermove", overlay.__onPointerMove, { capture: true });
    window.removeEventListener("touchmove",   overlay.__onTouchMove,   { capture: true });
    window.removeEventListener("touchstart",  overlay.__onTouchStart,  { capture: true });

    document.body.style.touchAction = "";
    document.documentElement.style.touchAction = "";

    clearInterval(intervalRef.current);
    overlay.remove();

    overlayRef.current = null;
    clonedRef.current = null;
  };

  return null;
};

export default Magnifier;
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
    document.body.style.touchAction = "none";

    const overlay = document.createElement("div");
    overlay.className = "__magnifier_overlay";

    Object.assign(overlay.style, {
      position: "fixed",
      width: `${lensSize}px`,
      height: `${lensSize}px`,
      borderRadius: "50%",
      overflow: "hidden",
      pointerEvents: "none",
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
    

const onMove = (e) => {
  const x = e.clientX;
  const y = e.clientY;

  overlay.style.display = "block";
  overlay.style.left = `${x - lensSize / 2}px`;
  overlay.style.top = `${y - lensSize / 2}px`;

  const tx = lensSize / 2 / scale - x;
  const ty = lensSize / 2 / scale - y;

  clone.style.transform = `scale(${scale}) translate(${tx}px, ${ty}px)`;
};

 document.addEventListener("pointermove", onMove);
    overlay.__onMove = onMove;

    intervalRef.current = setInterval(updateClone, 120);
    updateClone();
  };

  const updateClone = () => {
    if (!clonedRef.current) return;

    const root = document.getElementById("root");
    const cloneNode = root.cloneNode(true);

    cloneNode.querySelectorAll("*").forEach(el => {
  el.style.pointerEvents = "none";
});


    clonedRef.current.innerHTML = "";
    clonedRef.current.appendChild(cloneNode);
  };

  const removeOverlay = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    document.removeEventListener("pointermove", overlay.__onMove);
    document.body.style.touchAction = "";
    clearInterval(intervalRef.current);

    overlay.remove();
    overlayRef.current = null;
    clonedRef.current = null;
  };

  return null; // 👈 IMPORTANT: renders nothing
};

export default Magnifier;

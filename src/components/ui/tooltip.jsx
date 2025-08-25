// src/components/ui/tooltip.jsx
import React, {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  useEffect,
} from "react";

/**
 * Minimal, dependency-free tooltip components compatible with:
 * import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
 *
 * Usage:
 * <TooltipProvider>
 *   <Tooltip>
 *     <TooltipTrigger asChild>
 *       <button>Hover me</button>
 *     </TooltipTrigger>
 *     <TooltipContent side="top">Helpful text here</TooltipContent>
 *   </Tooltip>
 * </TooltipProvider>
 */

const Ctx = createContext(null);

export function TooltipProvider({ children }) {
  // Provided for API compatibility (could hold global options later)
  return <>{children}</>;
}

export function Tooltip({ children, delayDuration = 0 }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef(null);
  const timer = useRef(null);

  // escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const api = {
    id,
    open,
    setOpen,
    triggerRef,
    delayDuration,
    openWithDelay() {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setOpen(true), delayDuration);
    },
    closeNow() {
      clearTimeout(timer.current);
      setOpen(false);
    },
  };

  return (
    <Ctx.Provider value={api}>
      <span style={{ position: "relative", display: "inline-block" }}>{children}</span>
    </Ctx.Provider>
  );
}

export function TooltipTrigger({ asChild = false, children }) {
  const ctx = useContext(Ctx);
  if (!ctx) return children;

  const pass = {
    ref: ctx.triggerRef,
    "aria-describedby": ctx.open ? ctx.id : undefined,
    onMouseEnter: (e) => {
      children?.props?.onMouseEnter?.(e);
      ctx.openWithDelay();
    },
    onMouseLeave: (e) => {
      children?.props?.onMouseLeave?.(e);
      ctx.closeNow();
    },
    onFocus: (e) => {
      children?.props?.onFocus?.(e);
      ctx.setOpen(true);
    },
    onBlur: (e) => {
      children?.props?.onBlur?.(e);
      ctx.setOpen(false);
    },
  };

  return asChild && React.isValidElement(children)
    ? React.cloneElement(children, pass)
    : (
      <button type="button" {...pass} style={{ background: "transparent", border: 0 }}>
        {children}
      </button>
    );
}

function sideStyle(side, offset) {
  const base = {
    position: "absolute",
    zIndex: 1000,
    background: "#2b0c28",
    color: "#fff",
    padding: "8px 10px",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    fontSize: 14,
    lineHeight: 1.35,
    maxWidth: 280,
    pointerEvents: "none",
  };
  switch (side) {
    case "bottom":
      return { ...base, top: `calc(100% + ${offset}px)`, left: "50%", transform: "translateX(-50%)" };
    case "left":
      return { ...base, left: `-${offset}px`, transform: "translate(-100%, -50%)", top: "50%" };
    case "right":
      return { ...base, left: `calc(100% + ${offset}px)`, top: "50%", transform: "translateY(-50%)" };
    case "top":
    default:
      return { ...base, bottom: `calc(100% + ${offset}px)`, left: "50%", transform: "translateX(-50%)" };
  }
}

function arrowStyleFor(side) {
  const common = {
    position: "absolute",
    width: 10,
    height: 10,
    background: "#2b0c28",
    transform: "rotate(45deg)",
  };
  switch (side) {
    case "bottom":
      return { ...common, top: -5, left: "50%", marginLeft: -5 };
    case "left":
      return { ...common, right: -5, top: "50%", marginTop: -5 };
    case "right":
      return { ...common, left: -5, top: "50%", marginTop: -5 };
    case "top":
    default:
      return { ...common, bottom: -5, left: "50%", marginLeft: -5 };
  }
}

export function TooltipContent({
  children,
  side = "top",
  sideOffset = 8,
  style,
  className,
}) {
  const ctx = useContext(Ctx);
  if (!ctx || !ctx.open) return null;

  const s = { ...sideStyle(side, sideOffset), ...style };
  const arrow = arrowStyleFor(side);

  return (
    <div role="tooltip" id={ctx.id} className={className} style={s}>
      {children}
      <span style={arrow} />
    </div>
  );
}

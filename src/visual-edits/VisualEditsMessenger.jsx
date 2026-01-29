"use client";

import { useEffect, useState, useRef } from "react";

export const CHANNEL = "ORCHIDS_HOVER_v1";
const VISUAL_EDIT_MODE_KEY = "orchids_visual_edit_mode";
const FOCUSED_ELEMENT_KEY = "orchids_focused_element";

let _orchidsLastMsg = "";
const postMessageDedup = (data) => {
  try {
    const key = JSON.stringify(data);
    if (key === _orchidsLastMsg) return;
    _orchidsLastMsg = key;
  } catch {
  }
  window.parent.postMessage(data, "*");
};

const BOX_PADDING = 4;

const isTextEditable = (element) => {
  const tagName = element.tagName.toLowerCase();
  const editableTags = [
    "p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "li", "td", "th", "label", "a", "button",
  ];

  if (
    element.contentEditable === "true" ||
    tagName === "input" ||
    tagName === "textarea"
  ) {
    return true;
  }

  if (editableTags.includes(tagName) && element.textContent?.trim()) {
    const hasDirectText = Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );

    if (
      element.childElementCount === 0 ||
      (element.childElementCount <= 1 && hasDirectText)
    ) {
      return true;
    }
  }

  return false;
};

const extractDirectTextContent = (element) => {
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
    }
  }
  return text;
};

const parseOrchidsId = (orchidsId) => {
  const parts = orchidsId.split(":");
  if (parts.length < 3) return null;

  const column = parseInt(parts.pop() || "0");
  const line = parseInt(parts.pop() || "0");
  const filePath = parts.join(":");

  if (isNaN(line) || isNaN(column)) return null;

  return { filePath, line, column };
};

const getCurrentStyles = (element) => {
  const computed = window.getComputedStyle(element);

  const normalizeValue = (value, property) => {
    if (property === "backgroundColor") {
      if (
        value === "rgba(0, 0, 0, 0)" ||
        value === "rgb(0, 0, 0, 0)" ||
        value === "transparent" ||
        value === ""
      ) {
        return "transparent";
      }
    }

    if (property === "backgroundImage" && (value === "none" || value === "")) {
      return "none";
    }

    if (property === "textDecoration") {
      if (value.includes("none") || value === "") {
        return "none";
      }
    }

    if (property === "fontStyle" && (value === "normal" || value === "")) {
      return "normal";
    }

    if (property === "fontWeight") {
      const weight = parseInt(value);
      if (!isNaN(weight)) {
        return String(weight);
      }
      return value || "400";
    }

    if (property === "opacity" && (value === "1" || value === "")) {
      return "1";
    }

    if (
      (property.includes("padding") || property.includes("margin")) &&
      (value === "0px" || value === "0")
    ) {
      return "0";
    }

    if (property === "borderRadius" && (value === "0px" || value === "0")) {
      return "0";
    }

    if (
      property === "letterSpacing" &&
      (value === "normal" || value === "0px")
    ) {
      return "normal";
    }

    if (property === "gap" && (value === "normal" || value === "0px")) {
      return "normal";
    }

    return value;
  };

  return {
    fontSize: normalizeValue(computed.fontSize, "fontSize"),
    color: normalizeValue(computed.color, "color"),
    fontWeight: normalizeValue(computed.fontWeight, "fontWeight"),
    fontStyle: normalizeValue(computed.fontStyle, "fontStyle"),
    textDecoration: normalizeValue(computed.textDecoration, "textDecoration"),
    textAlign: normalizeValue(computed.textAlign, "textAlign"),
    lineHeight: normalizeValue(computed.lineHeight, "lineHeight"),
    letterSpacing: normalizeValue(computed.letterSpacing, "letterSpacing"),
    paddingLeft: normalizeValue(computed.paddingLeft, "paddingLeft"),
    paddingRight: normalizeValue(computed.paddingRight, "paddingRight"),
    paddingTop: normalizeValue(computed.paddingTop, "paddingTop"),
    paddingBottom: normalizeValue(computed.paddingBottom, "paddingBottom"),
    marginLeft: normalizeValue(computed.marginLeft, "marginLeft"),
    marginRight: normalizeValue(computed.marginRight, "marginRight"),
    marginTop: normalizeValue(computed.marginTop, "marginTop"),
    marginBottom: normalizeValue(computed.marginBottom, "marginBottom"),
    backgroundColor: normalizeValue(computed.backgroundColor, "backgroundColor"),
    backgroundImage: normalizeValue(computed.backgroundImage, "backgroundImage"),
    borderRadius: normalizeValue(computed.borderRadius, "borderRadius"),
    fontFamily: normalizeValue(computed.fontFamily, "fontFamily"),
    opacity: normalizeValue(computed.opacity, "opacity"),
    display: normalizeValue(computed.display, "display"),
    flexDirection: normalizeValue(computed.flexDirection, "flexDirection"),
    alignItems: normalizeValue(computed.alignItems, "alignItems"),
    justifyContent: normalizeValue(computed.justifyContent, "justifyContent"),
    gap: normalizeValue(computed.gap, "gap"),
  };
};

const normalizeImageSrc = (input) => {
  if (!input) return "";
  try {
    const url = new URL(input, window.location.origin);
    if (url.pathname === "/_next/image") {
      const real = url.searchParams.get("url");
      if (real) return decodeURIComponent(real);
    }
    return url.href;
  } catch {
    return input;
  }
};

const wrapMultiline = (text) => {
  if (text.includes("\n")) {
    const escaped = text.replace(/\n/g, "\\n");
    return `{\`${escaped}\`}`;
  }
  return text;
};

export default function VisualEditsMessenger() {
  const [hoverBox, setHoverBox] = useState(null);
  const [hoverBoxes, setHoverBoxes] = useState([]);
  const [focusBox, setFocusBox] = useState(null);
  const [focusedElementId, setFocusedElementId] = useState(null);
  const [isVisualEditMode, setIsVisualEditMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(VISUAL_EDIT_MODE_KEY);
      return stored === "true";
    }
    return false;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const [hoverTag, setHoverTag] = useState(null);
  const [focusTag, setFocusTag] = useState(null);
  const isResizingRef = useRef(false);
  const lastHitElementRef = useRef(null);
  const lastHitIdRef = useRef(null);
  const focusedElementRef = useRef(null);
  const isVisualEditModeRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const originalContentRef = useRef("");
  const originalSrcRef = useRef("");
  const focusedImageElementRef = useRef(null);
  const editingElementRef = useRef(null);
  const wasEditableRef = useRef(false);
  const styleElementRef = useRef(null);
  const originalStylesRef = useRef({});
  const appliedStylesRef = useRef(new Map());
  const hasStyleChangesRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const pendingCleanupRef = useRef(null);

  const loadedFontFamilies = useRef(new Set());
  const persistentFontMap = useRef(new Map());
  const persistentFontTimeouts = useRef(new Map());

  useEffect(() => {
    isVisualEditModeRef.current = isVisualEditMode;
    if (typeof window !== "undefined") {
      localStorage.setItem(VISUAL_EDIT_MODE_KEY, String(isVisualEditMode));
    }
  }, [isVisualEditMode]);

  useEffect(() => {
    if (isVisualEditMode) {
      window.parent.postMessage(
        { type: CHANNEL, msg: "VISUAL_EDIT_MODE_ACK", active: true },
        "*"
      );
      window.parent.postMessage(
        { type: CHANNEL, msg: "VISUAL_EDIT_MODE_RESTORED", active: true },
        "*"
      );

      setTimeout(() => {
        if (typeof window !== "undefined") {
          const focusedData = localStorage.getItem(FOCUSED_ELEMENT_KEY);
          if (focusedData) {
            try {
              const { id } = JSON.parse(focusedData);
              const element = document.querySelector(`[data-orchids-id="${id}"]`);
              if (element) {
                const rect = element.getBoundingClientRect();
                const clickEvent = new MouseEvent("click", {
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top + rect.height / 2,
                  bubbles: true,
                  cancelable: true,
                });
                element.dispatchEvent(clickEvent);
              }
            } catch {
            }
          }
        }
      }, 500);
    }
  }, []);

  const expandBox = (rect) => ({
    top: rect.top - BOX_PADDING,
    left: rect.left - BOX_PADDING,
    width: rect.width + BOX_PADDING * 2,
    height: rect.height + BOX_PADDING * 2,
  });

  const updateFocusBox = () => {
    if (focusedElementRef.current) {
      const r = focusedElementRef.current.getBoundingClientRect();
      setFocusBox(expandBox(r));
    }
  };

  useEffect(() => {
    if (isVisualEditMode && !styleElementRef.current) {
      const style = document.createElement("style");
      style.textContent = `
        [contenteditable="true"]:focus { outline: none !important; box-shadow: none !important; }
        [contenteditable="true"] { cursor: text !important; }
        [contenteditable="true"]::selection { background-color: rgba(59, 130, 246, 0.3); }
        [contenteditable="true"] [contenteditable="false"] { user-select: none !important; opacity: 0.7 !important; cursor: default !important; }
        [data-orchids-protected="true"] { user-select: none !important; }
      `;
      document.head.appendChild(style);
      styleElementRef.current = style;
    } else if (!isVisualEditMode && styleElementRef.current) {
      styleElementRef.current.remove();
      styleElementRef.current = null;
    }
    return () => {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
    };
  }, [isVisualEditMode]);

  const protectChildElements = (element) => {
    element.querySelectorAll("*").forEach((child) => {
      child.contentEditable = "false";
      child.setAttribute("data-orchids-protected", "true");
      child.style.userSelect = "none";
    });
  };

  const restoreChildElements = (element) => {
    element.querySelectorAll('[data-orchids-protected="true"]').forEach((child) => {
      child.removeAttribute("contenteditable");
      child.removeAttribute("data-orchids-protected");
      child.style.userSelect = "";
    });
  };

  const handleTextChange = (element) => {
    if (element !== editingElementRef.current) return;
    const orchidsId = element.getAttribute("data-orchids-id");
    if (!orchidsId) return;

    let newText;
    let oldText = originalContentRef.current;

    if (element.childElementCount > 0) {
      newText = extractDirectTextContent(element);
    } else {
      newText = element.innerText || element.textContent || "";
    }

    if (newText !== oldText) {
      const parsed = parseOrchidsId(orchidsId);
      if (!parsed) return;
      postMessageDedup({
        type: CHANNEL,
        msg: "TEXT_CHANGED",
        id: orchidsId,
        oldText: wrapMultiline(oldText),
        newText: wrapMultiline(newText),
        filePath: parsed.filePath,
        line: parsed.line,
        column: parsed.column,
      });
      originalContentRef.current = newText;
    }
  };

  const handleStyleChange = (element, styles) => {
    const orchidsId = element.getAttribute("data-orchids-id");
    if (!orchidsId) return;
    const allMatchingElements = document.querySelectorAll(`[data-orchids-id="${orchidsId}"]`);
    allMatchingElements.forEach((el) => {
      Object.entries(styles).forEach(([property, value]) => {
        const cssProp = property.replace(/([A-Z])/g, "-$1").toLowerCase();
        let finalValue = value;
        if (property === "backgroundColor" && (value === "transparent" || value === "rgba(0, 0, 0, 0)")) {
          finalValue = "transparent";
        }
        if ((property === "backgroundColor" && finalValue === "transparent") || (property === "backgroundImage" && value === "none") || (property === "textDecoration" && value === "none") || (property === "fontStyle" && value === "normal") || (property === "opacity" && value === "1") || ((property.includes("padding") || property.includes("margin")) && value === "0") || (property === "borderRadius" && value === "0") || (property === "letterSpacing" && value === "normal") || (property === "gap" && value === "normal")) {
          el.style.removeProperty(cssProp);
        } else {
          el.style.setProperty(cssProp, finalValue, "important");
        }
      });
    });
    const existingStyles = appliedStylesRef.current.get(orchidsId) || {};
    appliedStylesRef.current.set(orchidsId, { ...existingStyles, ...styles });
    hasStyleChangesRef.current = true;
    requestAnimationFrame(updateFocusBox);
  };

  const handleStyleBlur = (element) => {
    if (!hasStyleChangesRef.current) return;
    const orchidsId = element.getAttribute("data-orchids-id");
    if (!orchidsId) return;
    const parsed = parseOrchidsId(orchidsId);
    if (!parsed) return;
    const appliedStyles = appliedStylesRef.current.get(orchidsId);
    if (!appliedStyles || Object.keys(appliedStyles).length === 0) return;
    postMessageDedup({
      type: CHANNEL,
      msg: "STYLE_BLUR",
      id: orchidsId,
      styles: appliedStyles,
      className: element.getAttribute("class") || "",
      filePath: parsed.filePath,
      line: parsed.line,
      column: parsed.column,
    });
    hasStyleChangesRef.current = false;
  };

  const flushImageSrcChange = () => {
    const imgElement = focusedImageElementRef.current;
    if (!imgElement) return;
    const orchidsId = imgElement.getAttribute("data-orchids-id");
    if (!orchidsId) return;
    const parsed = parseOrchidsId(orchidsId);
    if (!parsed) return;
    const newSrc = normalizeImageSrc(imgElement.src);
    const oldSrc = normalizeImageSrc(originalSrcRef.current);
    if (!newSrc || newSrc === oldSrc) return;
    postMessageDedup({
      type: CHANNEL,
      msg: "IMAGE_BLUR",
      id: orchidsId,
      oldSrc,
      newSrc,
      filePath: parsed.filePath,
      line: parsed.line,
      column: parsed.column,
    });
    originalSrcRef.current = newSrc;
    focusedImageElementRef.current = null;
  };

  useEffect(() => {
    function handleMessage(e) {
      if (e.data?.type === "ORCHIDS_STYLE_UPDATE") {
        const { elementId, styles } = e.data;
        const allMatchingElements = document.querySelectorAll(`[data-orchids-id="${elementId}"]`);
        if (allMatchingElements.length > 0) {
          const fam = styles.fontFamily;
          if (fam) {
            const familyKey = fam.replace(/['\s]+/g, "+");
            if (!loadedFontFamilies.current.has(familyKey)) {
              const link = document.createElement("link");
              link.rel = "stylesheet";
              link.href = `https://fonts.googleapis.com/css2?family=${familyKey}:wght@400&display=swap`;
              document.head.appendChild(link);
              loadedFontFamilies.current.add(familyKey);
            }
            persistentFontMap.current.set(elementId, fam);
            const tid = setTimeout(() => {
              persistentFontMap.current.delete(elementId);
              persistentFontTimeouts.current.delete(elementId);
            }, 2000);
            persistentFontTimeouts.current.set(elementId, tid);
          }
          allMatchingElements.forEach((element) => {
            if (focusedElementRef.current === element) handleStyleChange(element, styles);
            else {
              Object.entries(styles).forEach(([prop, val]) => {
                const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
                let fVal = String(val);
                if (prop === "backgroundColor" && (val === "transparent" || val === "rgba(0,0,0,0)")) fVal = "transparent";
                if ((prop === "backgroundColor" && fVal === "transparent") || (prop === "backgroundImage" && val === "none") || (prop === "textDecoration" && val === "none") || (prop === "fontStyle" && val === "normal") || (prop === "opacity" && val === "1") || ((prop.includes("padding") || prop.includes("margin")) && val === "0") || (prop === "borderRadius" && val === "0") || (prop === "letterSpacing" && val === "normal") || (prop === "gap" && val === "normal")) element.style.removeProperty(cssProp);
                else element.style.setProperty(cssProp, fVal, "important");
              });
            }
          });
        }
      } else if (e.data?.type === "ORCHIDS_IMAGE_UPDATE") {
        const { elementId, src, oldSrc } = e.data;
        let element = null;
        document.querySelectorAll(`[data-orchids-id="${elementId}"]`).forEach((el) => {
          if (el.tagName.toLowerCase() === "img") {
            if (!element) element = el;
            if (oldSrc && normalizeImageSrc(oldSrc) === normalizeImageSrc(el.src)) element = el;
          }
        });
        if (element) {
          element.removeAttribute("srcset");
          element.src = src;
          originalSrcRef.current = normalizeImageSrc(src);
          focusedImageElementRef.current = element;
          element.onload = updateFocusBox;
        }
      } else if (e.data?.type === "RESIZE_ELEMENT") {
        const { elementId, width, height } = e.data;
        const element = document.querySelector(`[data-orchids-id="${elementId}"]`);
        if (element && focusedElementRef.current === element) {
          element.style.setProperty("width", `${width}px`, "important");
          element.style.setProperty("height", `${height}px`, "important");
          updateFocusBox();
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleResizeStart = (e, handle) => {
    if (!focusedElementRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = focusedElementRef.current.getBoundingClientRect();
    setHoverBox(null);
    lastHitElementRef.current = null;
    document.body.style.pointerEvents = "none";
    document.querySelectorAll(".resize-handle").forEach((h) => h.style.pointerEvents = "auto");
    setIsResizing(true);
    isResizingRef.current = true;
    setResizeHandle(handle);
    setResizeStart({ x: e.clientX, y: e.clientY, width: rect.width, height: rect.height });
  };

  useEffect(() => {
    if (!isResizing || !resizeStart || !resizeHandle || !focusedElementRef.current) return;
    const handleMouseMove = (e) => {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      let nw = resizeStart.width;
      let nh = resizeStart.height;
      if (resizeHandle.includes("e")) nw = resizeStart.width + dx;
      if (resizeHandle.includes("w")) nw = resizeStart.width - dx;
      if (resizeHandle.includes("s")) nh = resizeStart.height + dy;
      if (resizeHandle.includes("n")) nh = resizeStart.height - dy;
      const parent = focusedElementRef.current.parentElement;
      if (parent) {
        const pr = parent.getBoundingClientRect();
        const ps = window.getComputedStyle(parent);
        const mw = pr.width - (parseFloat(ps.paddingLeft) || 0) - (parseFloat(ps.paddingRight) || 0);
        const mh = pr.height - (parseFloat(ps.paddingTop) || 0) - (parseFloat(ps.paddingBottom) || 0);
        nw = Math.max(20, nw > mw ? Math.min(nw, mw) : nw);
        nh = Math.max(20, nh > mh ? Math.min(nh, mh) : nh);
      } else {
        nw = Math.max(20, nw);
        nh = Math.max(20, nh);
      }
      setHoverBox(null);
      if (focusedElementId) {
        window.parent.postMessage({ type: CHANNEL, msg: "RESIZE_ELEMENT", elementId: focusedElementId, width: Math.round(nw), height: Math.round(nh) }, "*");
      }
    };
    const handleMouseUp = () => {
      if (focusedElementRef.current && focusedElementId) {
        const el = focusedElementRef.current;
        const cs = window.getComputedStyle(el);
        const w = parseFloat(cs.width) || el.offsetWidth;
        const h = parseFloat(cs.height) || el.offsetHeight;
        const mw = cs.maxWidth;
        const mh = cs.maxHeight;
        const hasMW = mw && mw !== "none" && mw !== "initial";
        const hasMH = mh && mh !== "none" && mh !== "initial";
        let wv = `${Math.round(w)}px`;
        let hv = `${Math.round(h)}px`;
        const parent = el.parentElement;
        if (parent) {
          const pr = parent.getBoundingClientRect();
          const ps = window.getComputedStyle(parent);
          const piw = pr.width - (parseFloat(ps.paddingLeft) || 0) - (parseFloat(ps.paddingRight) || 0);
          const pih = pr.height - (parseFloat(ps.paddingTop) || 0) - (parseFloat(ps.paddingBottom) || 0);
          const wp = (w / piw) * 100;
          const hp = (h / pih) * 100;
          if (Math.abs(wp - Math.round(wp)) < 0.1 || [25, 33.333, 50, 66.667, 75, 100].some((v) => Math.abs(wp - v) < 0.5)) wv = `${Math.round(wp * 10) / 10}%`;
          if (Math.abs(hp - Math.round(hp)) < 0.1 && [25, 50, 75, 100].includes(Math.round(hp))) hv = `${Math.round(hp)}%`;
        }
        const styles = { width: wv, height: hv };
        if (hasMW) styles.maxWidth = wv;
        if (hasMH) styles.maxHeight = hv;
        const msg = { type: CHANNEL, msg: "STYLE_BLUR", id: focusedElementId, styles, className: el.getAttribute("class") || "", filePath: "", line: 0, column: 0 };
        const oid = el.getAttribute("data-orchids-id");
        if (oid) {
          const p = parseOrchidsId(oid);
          if (p) { msg.filePath = p.filePath; msg.line = p.line; msg.column = p.column; }
        }
        window.parent.postMessage(msg, "*");
      }
      setIsResizing(false);
      isResizingRef.current = false;
      setResizeHandle(null);
      setResizeStart(null);
      document.body.style.pointerEvents = "";
      lastHitElementRef.current = null;
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, resizeHandle, focusedElementId, hoverBox]);

  const cleanupEditingElement = () => {
    if (editingElementRef.current) {
      const el = editingElementRef.current;
      editingElementRef.current = null;
      handleStyleBlur(el);
      handleTextChange(el);
      if (el.childElementCount > 0) restoreChildElements(el);
      if (!wasEditableRef.current) el.contentEditable = "false";
      const cleanedStyle = (el.getAttribute("style") || "").replace(/outline:\s*none\s*!important;?/gi, "").replace(/box-shadow:\s*none\s*!important;?/gi, "").trim().replace(/;\s*;/g, ";").replace(/^;|;$/g, "");
      if (cleanedStyle) el.setAttribute("style", cleanedStyle); else el.removeAttribute("style");
      el.blur();
      const h = el._editHandlers;
      if (h) {
        el.removeEventListener("focus", h.focus);
        el.removeEventListener("blur", h.blur);
        el.removeEventListener("input", h.input);
        delete el._editHandlers;
      }
      wasEditableRef.current = false;
      originalContentRef.current = "";
    }
  };

  useEffect(() => {
    if (!isVisualEditMode) return;
    const preventLinkClick = (e) => {
      const link = e.target.closest("a");
      if (link && !link.isContentEditable) { e.preventDefault(); e.stopPropagation(); }
    };
    const preventFormSubmit = (e) => { e.preventDefault(); e.stopPropagation(); };
    document.addEventListener("click", preventLinkClick, true);
    document.addEventListener("submit", preventFormSubmit, true);
    return () => {
      document.removeEventListener("click", preventLinkClick, true);
      document.removeEventListener("submit", preventFormSubmit, true);
    };
  }, [isVisualEditMode]);

  useEffect(() => {
    if (!isVisualEditMode) {
      cleanupEditingElement();
      appliedStylesRef.current.clear();
      hasStyleChangesRef.current = false;
      focusedImageElementRef.current = null;
    }
  }, [isVisualEditMode]);

  useEffect(() => {
    if (focusedElementRef.current) {
      const handleUpdate = () => {
        updateFocusBox();
        if (focusedElementRef.current && focusedElementId) {
          const fr = focusedElementRef.current.getBoundingClientRect();
          const fBox = expandBox(fr);
          postMessageDedup({ type: CHANNEL, msg: "FOCUS_MOVED", id: focusedElementId, rect: { top: fBox.top, left: fBox.left, width: fBox.width, height: fBox.height } });
        }
      };
      window.addEventListener("scroll", handleUpdate, true);
      window.addEventListener("resize", handleUpdate);
      const ro = new ResizeObserver(handleUpdate);
      ro.observe(focusedElementRef.current);
      return () => {
        window.removeEventListener("scroll", handleUpdate, true);
        window.removeEventListener("resize", handleUpdate);
        ro.disconnect();
      };
    }
  }, [focusedElementId]);

  useEffect(() => {
    function onPointerMove(e) {
      if (isResizingRef.current || !isVisualEditModeRef.current || isScrolling) return;
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-orchids-id]") || null;
      if (hit !== lastHitElementRef.current) {
        lastHitElementRef.current = hit;
        if (!hit) {
          setHoverBox(null); setHoverBoxes([]); setHoverTag(null); lastHitIdRef.current = null;
          flushImageSrcChange();
          postMessageDedup({ type: CHANNEL, msg: "HIT", id: null, tag: null, rect: null });
          return;
        }
        const hitId = hit.getAttribute("data-orchids-id");
        if (hitId === lastHitIdRef.current) return;
        lastHitIdRef.current = hitId;
        const tagName = hit.getAttribute("data-orchids-name") || hit.tagName.toLowerCase();
        const all = document.querySelectorAll(`[data-orchids-id="${hitId}"]`);
        const boxes = [];
        all.forEach((el) => { if (el.getAttribute("data-orchids-id") !== focusedElementId) boxes.push(expandBox(el.getBoundingClientRect())); });
        setHoverBoxes(boxes);
        if (hitId !== focusedElementId) setHoverBox(expandBox(hit.getBoundingClientRect())); else setHoverBox(null);
        setHoverTag(tagName);
        postMessageDedup({ type: CHANNEL, msg: "HIT", id: hitId, tag: tagName, rect: hitId !== focusedElementId ? expandBox(hit.getBoundingClientRect()) : null });
      }
    }
    function onPointerLeave() {
      if (!isVisualEditModeRef.current || isResizingRef.current) return;
      setHoverBox(null); setHoverBoxes([]); setHoverTag(null); flushImageSrcChange(); lastHitElementRef.current = null; lastHitIdRef.current = null;
      postMessageDedup({ type: CHANNEL, msg: "HIT", id: null, tag: null, rect: null });
    }
    function onMouseDownCapture(e) {
      if (isResizingRef.current || !isVisualEditModeRef.current) return;
      const hit = e.target.closest("[data-orchids-id]");
      if (hit && isTextEditable(hit)) {
        wasEditableRef.current = hit.contentEditable === "true";
        if (!wasEditableRef.current) {
          hit.setAttribute("style", `${hit.getAttribute("style") || ""}; outline: none !important; box-shadow: none !important;`);
          hit.contentEditable = "true";
          if (hit.childElementCount > 0) protectChildElements(hit);
        }
      }
    }
    function onClickCapture(e) {
      if (isResizingRef.current || !isVisualEditModeRef.current) return;
      const now = Date.now();
      if (now - lastClickTimeRef.current < 100) return;
      lastClickTimeRef.current = now;
      const target = e.target;
      const hit = target.closest("[data-orchids-id]");
      if (hit) {
        const tagName = hit.getAttribute("data-orchids-name") || hit.tagName.toLowerCase();
        const hitId = hit.getAttribute("data-orchids-id");
        const isEditable = isTextEditable(hit);
        if (hit.tagName.toLowerCase() === "a" || hit.closest("a") || hit.tagName.toLowerCase() === "button" || hit.getAttribute("role") === "button" || !isEditable) { e.preventDefault(); e.stopPropagation(); }
        const prevFocused = focusedElementRef.current;
        focusedElementRef.current = hit;
        setFocusedElementId(hitId);
        setFocusTag(tagName);
        if (hitId && typeof window !== "undefined") localStorage.setItem(FOCUSED_ELEMENT_KEY, JSON.stringify({ id: hitId, tag: tagName }));
        const all = document.querySelectorAll(`[data-orchids-id="${hitId}"]`);
        const boxes = [];
        all.forEach((el) => { if (el !== hit) boxes.push(expandBox(el.getBoundingClientRect())); });
        setHoverBoxes(boxes);
        if (boxes.length > 0) setHoverTag(tagName);
        if (hit.tagName.toLowerCase() === "img") focusedImageElementRef.current = hit; else focusedImageElementRef.current = null;
        originalStylesRef.current = getCurrentStyles(hit);
        if (isEditable) {
          if (pendingCleanupRef.current) { clearTimeout(pendingCleanupRef.current); pendingCleanupRef.current = null; }
          if (editingElementRef.current && editingElementRef.current !== hit) { editingElementRef.current.blur(); cleanupEditingElement(); }
          if (hit !== editingElementRef.current) {
            editingElementRef.current = hit;
            originalContentRef.current = hit.childElementCount > 0 ? extractDirectTextContent(hit) : (hit.innerText || hit.textContent || "");
            const h = {
              focus: () => { if (hit !== editingElementRef.current) return; handleStyleBlur(hit); originalContentRef.current = hit.childElementCount > 0 ? extractDirectTextContent(hit) : (hit.innerText || hit.textContent || ""); hasStyleChangesRef.current = false; },
              blur: () => { if (hit !== editingElementRef.current) return; handleStyleBlur(hit); handleTextChange(hit); },
              input: () => { if (hit !== editingElementRef.current) return; }
            };
            hit.addEventListener("focus", h.focus);
            hit.addEventListener("blur", h.blur);
            hit.addEventListener("input", h.input);
            hit._editHandlers = h;
          }
        }
        const r = hit.getBoundingClientRect();
        const expanded = expandBox(r);
        setFocusBox(expanded);
        setHoverBox(null);
        const className = hit.getAttribute("class") || "";
        const srcRaw = hit.tagName.toLowerCase() === "img" ? hit.src : undefined;
        if (srcRaw) originalSrcRef.current = normalizeImageSrc(srcRaw);
        const computedStyles = getCurrentStyles(hit);
        postMessageDedup({ type: CHANNEL, msg: "ELEMENT_CLICKED", id: hitId, tag: tagName, rect: expanded || { top: 0, left: 0, width: 0, height: 0 }, clickPosition: { x: e.clientX, y: e.clientY }, isEditable, currentStyles: computedStyles, className, src: srcRaw });
        setTimeout(() => { flushImageSrcChange(); if (prevFocused && prevFocused !== hit) handleStyleBlur(prevFocused); if (editingElementRef.current && editingElementRef.current !== hit) cleanupEditingElement(); }, 0);
      } else if (focusedElementRef.current) {
        flushImageSrcChange(); handleStyleBlur(focusedElementRef.current); cleanupEditingElement();
        focusedElementRef.current = null; setFocusedElementId(null); setFocusTag(null); setFocusBox(null); setHoverBox(null); setHoverBoxes([]); setHoverTag(null);
        if (typeof window !== "undefined") localStorage.removeItem(FOCUSED_ELEMENT_KEY);
        postMessageDedup({ type: CHANNEL, msg: "ELEMENT_CLICKED", id: null, tag: null, rect: { top: 0, left: 0, width: 0, height: 0 }, clickPosition: { x: e.clientX, y: e.clientY }, isEditable: false, currentStyles: {}, className: "" });
      }
    }
    function onMsg(e) {
      if (e.data?.type !== CHANNEL) return;
      if (e.data.msg === "PREVIEW_FONT" && e.data.elementId) {
        const { elementId, fontFamily } = e.data;
        if (persistentFontMap.current.has(elementId)) return;
        const element = document.querySelector(`[data-orchids-id="${elementId}"]`);
        if (!element) return;
        const familyKey = fontFamily.replace(/\s+/g, "+");
        if (!loadedFontFamilies.current.has(familyKey)) {
          const link = document.createElement("link"); link.rel = "stylesheet"; link.href = `https://fonts.googleapis.com/css2?family=${familyKey}:wght@400&display=swap`;
          document.head.appendChild(link); loadedFontFamilies.current.add(familyKey);
        }
        element.style.fontFamily = `'${fontFamily}', sans-serif`;
        return;
      }
      if (e.data.msg === "SCROLL" && e.data.dx !== undefined) window.scrollBy(e.data.dx, e.data.dy);
      if (e.data.msg === "VISUAL_EDIT_MODE" && e.data.active !== undefined) {
        const newMode = e.data.active; setIsVisualEditMode(newMode);
        if (!newMode && typeof window !== "undefined") { localStorage.removeItem(VISUAL_EDIT_MODE_KEY); localStorage.removeItem(FOCUSED_ELEMENT_KEY); }
        window.parent.postMessage({ type: CHANNEL, msg: "VISUAL_EDIT_MODE_ACK", active: newMode }, "*");
        if (!newMode) { flushImageSrcChange(); cleanupEditingElement(); focusedImageElementRef.current = null; setHoverBox(null); setHoverBoxes([]); setFocusBox(null); setFocusedElementId(null); lastHitElementRef.current = null; focusedElementRef.current = null; hasStyleChangesRef.current = false; setHoverTag(null); setFocusTag(null); postMessageDedup({ type: CHANNEL, msg: "HIT", id: null, tag: null, rect: null }); }
      }
      if (e.data.msg === "CLEAR_INLINE_STYLES" && e.data.elementId) {
        document.querySelectorAll(`[data-orchids-id="${e.data.elementId}"]`).forEach((el) => {
          ["fontSize", "color", "fontWeight", "fontStyle", "textDecoration", "textAlign", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "marginLeft", "marginRight", "marginTop", "marginBottom", "backgroundColor", "backgroundImage"].forEach((prop) => el.style[prop] = "");
        });
        appliedStylesRef.current.delete(e.data.elementId);
      }
      if (e.data.msg === "SHOW_ELEMENT_HOVER" && e.data.elementId !== undefined) {
        const { elementId } = e.data;
        if (!elementId) { setHoverBoxes([]); setHoverTag(null); return; }
        const all = document.querySelectorAll(`[data-orchids-id="${elementId}"]`);
        if (all.length > 0) {
          const boxes = []; let tName = "";
          all.forEach((el) => { if (el !== focusedElementRef.current) { boxes.push(expandBox(el.getBoundingClientRect())); if (!tName) tName = el.getAttribute("data-orchids-name") || el.tagName.toLowerCase(); } });
          setHoverBoxes(boxes); setHoverTag(boxes.length > 0 ? tName : null);
        }
      }
    }
    function onScroll() {
      if (isResizingRef.current || !isVisualEditModeRef.current) return;
      setIsScrolling(true); setHoverBox(null); setHoverBoxes([]);
      postMessageDedup({ type: CHANNEL, msg: "SCROLL_STARTED" });
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => { setIsScrolling(false); postMessageDedup({ type: CHANNEL, msg: "SCROLL_STOPPED" }); }, 16);
    }
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("mousedown", onMouseDownCapture, { capture: true });
    document.addEventListener("click", onClickCapture, { capture: true });
    window.addEventListener("message", onMsg);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("mousedown", onMouseDownCapture, { capture: true });
      document.removeEventListener("click", onClickCapture, { capture: true });
      window.removeEventListener("message", onMsg);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [isScrolling, focusedElementId]);

  return (
    <div className="orchids-visual-edits-overlays" style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 9999 }}>
      {hoverBoxes.map((box, i) => (
        <div key={i} style={{ position: "absolute", top: box.top, left: box.left, width: box.width, height: box.height, border: "1px dashed rgba(59, 130, 246, 0.5)", backgroundColor: "rgba(59, 130, 246, 0.05)", borderRadius: "2px", transition: "all 0.1s ease-out" }}>
          {i === 0 && hoverTag && (
            <div style={{ position: "absolute", bottom: "100%", left: 0, backgroundColor: "rgba(59, 130, 246, 0.9)", color: "white", padding: "2px 6px", borderRadius: "2px 2px 0 0", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {hoverTag}
            </div>
          )}
        </div>
      ))}
      {focusBox && (
        <div style={{ position: "absolute", top: focusBox.top, left: focusBox.left, width: focusBox.width, height: focusBox.height, border: "2px solid #3b82f6", boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.5), 0 0 10px rgba(59, 130, 246, 0.3)", borderRadius: "2px", transition: "all 0.1s ease-out" }}>
          {focusTag && (
            <div style={{ position: "absolute", bottom: "100%", left: -2, backgroundColor: "#3b82f6", color: "white", padding: "2px 8px", borderRadius: "4px 4px 0 0", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {focusTag}
            </div>
          )}
          <div className="resize-handle n" onMouseDown={(e) => handleResizeStart(e, "n")} style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 16, height: 8, cursor: "ns-resize", pointerEvents: "auto", display: "flex", justifyContent: "center" }}><div style={{ width: 4, height: 4, backgroundColor: "white", border: "1px solid #3b82f6", borderRadius: "50%" }} /></div>
          <div className="resize-handle s" onMouseDown={(e) => handleResizeStart(e, "s")} style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 16, height: 8, cursor: "ns-resize", pointerEvents: "auto", display: "flex", justifyContent: "center" }}><div style={{ width: 4, height: 4, backgroundColor: "white", border: "1px solid #3b82f6", borderRadius: "50%" }} /></div>
          <div className="resize-handle e" onMouseDown={(e) => handleResizeStart(e, "e")} style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: 16, cursor: "ew-resize", pointerEvents: "auto", display: "flex", alignItems: "center" }}><div style={{ width: 4, height: 4, backgroundColor: "white", border: "1px solid #3b82f6", borderRadius: "50%" }} /></div>
          <div className="resize-handle w" onMouseDown={(e) => handleResizeStart(e, "w")} style={{ position: "absolute", left: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: 16, cursor: "ew-resize", pointerEvents: "auto", display: "flex", alignItems: "center" }}><div style={{ width: 4, height: 4, backgroundColor: "white", border: "1px solid #3b82f6", borderRadius: "50%" }} /></div>
          <div className="resize-handle nw" onMouseDown={(e) => handleResizeStart(e, "nw")} style={{ position: "absolute", top: -4, left: -4, width: 8, height: 8, cursor: "nwse-resize", pointerEvents: "auto", backgroundColor: "white", border: "1px solid #3b82f6", borderRadius: "2px" }} />
          <div className="resize-handle ne" onMouseDown={(e) => handleResizeStart(e, "ne")} style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, cursor: "nesw-resize", pointerEvents: "auto", backgroundColor: "white", border: "1px solid #3b82f6", borderRadius: "2px" }} />
          <div className="resize-handle sw" onMouseDown={(e) => handleResizeStart(e, "sw")} style={{ position: "absolute", bottom: -4, left: -4, width: 8, height: 8, cursor: "nesw-resize", pointerEvents: "auto", backgroundColor: "white", border: "1px solid #3b82f6", borderRadius: "2px" }} />
          <div className="resize-handle se" onMouseDown={(e) => handleResizeStart(e, "se")} style={{ position: "absolute", bottom: -4, right: -4, width: 8, height: 8, cursor: "nwse-resize", pointerEvents: "auto", backgroundColor: "white", border: "1px solid #3b82f6", borderRadius: "2px" }} />
        </div>
      )}
    </div>
  );
}

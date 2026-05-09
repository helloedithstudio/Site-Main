import { useEffect } from "react";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 20 24"><path d="M3.5 2L3.5 19.2L7.1 15.2L10.3 22L12.4 21L9.2 14.2L15.2 14.2L3.5 2Z" fill="white" stroke="black" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

export function Cursor() {
  useEffect(() => {
    const url = `url("data:image/svg+xml;base64,${btoa(SVG)}") 3 2, auto`;
    const style = document.createElement("style");
    style.id = "macos-light-cursor";
    style.textContent = `
      html, body, * { cursor: ${url} !important; }
      a, button, [role="button"], [data-magnet], label, select,
      input[type="submit"], input[type="button"], input[type="checkbox"] {
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("macos-light-cursor")?.remove();
  }, []);

  return null;
}

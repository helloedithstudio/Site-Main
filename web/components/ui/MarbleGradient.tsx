// The hero marble's colours (theme.hoverStops) as an SVG gradient for hover wipes, so the logo, social icons and menu
// toggle fill with the same ramp as the buttons. userSpaceOnUse: the gradient is fixed to the icon while the fill rect
// widens, so the wipe reveals the ramp instead of squeezing it.

import { theme } from "@/lib/theme";

export default function MarbleGradient({ id }: { id: string }) {
  const last = theme.hoverStops.length - 1;
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100%" y2="100%">
      {theme.hoverStops.map((color, i) => (
        <stop key={color} offset={`${(i / last) * 100}%`} stopColor={color} />
      ))}
    </linearGradient>
  );
}

// Starts the WebGL downloads with the HTML instead of after the scripts have run. The list comes from the same
// manifest the loader uses, and each hint matches how the loader fetches the file (fetch() for models, KTX2 and
// the Basis transcoder; CORS-anonymous <img> for plain textures), otherwise the browser downloads it twice.
// Responsive textures use their -desktop variant everywhere (the loader's default: the -mobile ones are a third
// of the resolution and make the marble veins visibly blocky on phones).

import { preload } from "react-dom";
import { manifest } from "@/lib/gl/manifest";

export default function GlPreload() {
  for (const t of ["basis_transcoder.js", "basis_transcoder.wasm"]) {
    preload(`/gl/decoders/basis/${t}`, { as: "fetch", crossOrigin: "anonymous" });
  }
  for (const entry of manifest) {
    if (entry.type === "gltf") {
      preload(entry.path, { as: "fetch", crossOrigin: "anonymous" });
    } else if (entry.type === "texture" && entry.compress) {
      const suffix = entry.compress.responsive ? "-desktop.ktx2" : ".ktx2";
      preload(entry.path.replace(/\.(png|jpg)$/, suffix), { as: "fetch", crossOrigin: "anonymous" });
    } else if (entry.type === "texture") {
      preload(entry.path, { as: "image", crossOrigin: "anonymous" });
    }
  }
  return null;
}

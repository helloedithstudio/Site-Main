// Where the Showcase camera stands in each chapter. Every shot is described the way a designer would: "put the
// monolith's centre here on screen, this tall, seen from this angle", and turned into a camera position and target for
// the current screen shape. So the composition holds on any window, and on phones (portrait) the monolith sits where
// the portrait film puts it. When the Blender cameras arrive (cameras.json), the handoff shots use those exactly.

import { Vector3 } from "three";
import { M } from "./monolith";

export type Pose = { position: Vector3; target: Vector3; fov: number };

export type Shot = {
  /** Where the monolith's centre should appear, in screen units: -1 left or bottom, 1 right or top. */
  at: [number, number];
  /** How much of the screen height the monolith fills (0 to 1). */
  fill: number;
  /** Degrees the camera swings round the monolith (positive: from its right). */
  yaw: number;
  /** Degrees the camera looks down on it. */
  pitch: number;
  fov: number;
};

const CENTRE_Y = M.h / 2;

/** Camera for a shot of the object whose centre is `c` and height `h`, on a screen of `aspect`. */
export function frame(c: Vector3, shot: Shot, aspect: number, h = M.h): Pose {
  const tanV = Math.tan((shot.fov * Math.PI) / 360);
  const tanH = tanV * aspect;
  const dist = h / (shot.fill * 2 * tanV);
  // straight-on first: the camera sits in front, offset so the centre lands at `at`
  const offset = new Vector3(-shot.at[0] * dist * tanH, -shot.at[1] * dist * tanV, dist);
  const look = new Vector3(offset.x, offset.y, 0);
  // then the whole rig swings round the object (keeps the object at the same place on screen)
  const yaw = (shot.yaw * Math.PI) / 180;
  const pitch = (shot.pitch * Math.PI) / 180;
  for (const v of [offset, look]) {
    v.applyAxisAngle(new Vector3(1, 0, 0), -pitch);
    v.applyAxisAngle(new Vector3(0, 1, 0), yaw);
  }
  return { position: c.clone().add(offset), target: c.clone().add(look), fov: shot.fov };
}

/** Shots per chapter, for landscape and portrait screens. */
export const SHOTS = {
  // the opening film ends on this; the live scene starts from it (the first exhibit in the hall)
  handoff: {
    landscape: { at: [0.3, 0.02], fill: 0.72, yaw: -9, pitch: 2, fov: 30 } as Shot,
    portrait: { at: [0, -0.36], fill: 0.44, yaw: -6, pitch: 3, fov: 38 } as Shot,
  },
  // walking the hall: on wide screens the same framing as the handoff; on phones the monolith moves up, clear of the
  // plaque at the bottom of the screen
  hall: {
    landscape: { at: [0.3, 0.02], fill: 0.72, yaw: -9, pitch: 2, fov: 30 } as Shot,
    portrait: { at: [0, 0.3], fill: 0.4, yaw: -6, pitch: 3, fov: 38 } as Shot,
  },
  // the monolith beside the closer-look panel (left of it on wide screens, above it on phones)
  closer: {
    landscape: { at: [-0.4, -0.05], fill: 0.72, yaw: 0, pitch: 1, fov: 30 } as Shot,
    portrait: { at: [0, 0.56], fill: 0.38, yaw: 0, pitch: 1, fov: 38 } as Shot,
  },
  // the exploded X-ray, seen from its right so the layers read
  xray: {
    landscape: { at: [0.1, 0.12], fill: 0.6, yaw: 36, pitch: 4, fov: 30 } as Shot,
    portrait: { at: [0, 0.02], fill: 0.33, yaw: 30, pitch: 4, fov: 38 } as Shot,
  },
};

export const monolithCentre = (x: number, z = 0) => new Vector3(x, CENTRE_Y, z);

/** Blend two poses (t from 0 to 1). */
export function mixPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  out.position.copy(a.position).lerp(b.position, t);
  out.target.copy(a.target).lerp(b.target, t);
  out.fov = a.fov + (b.fov - a.fov) * t;
  return out;
}

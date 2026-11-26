import * as THREE from "three";

// The Vinish models share a 17-joint rig. Keep locomotion authored by Vinish;
// the remaining Office states are local joint poses, never root motion.
export const vinishModels = [
  "businessman-with-briefcase", "businesswoman-with-tablet", "female-presenter",
  "male-presenter", "woman-with-clipboard", "man-walking-with-phone",
  "woman-with-coffee", "man-in-blazer-and-chinos", "woman-with-handbag",
  "man-carrying-laptop", "man-in-three-piece-suit", "senior-executive",
] as const;

/** Tuck the briefcase toward Yan's left hand without hiding or replacing it. */
export function compactYanBriefcase(root: THREE.Object3D): number {
  let changed = 0;
  root.traverse(object => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (!materials.some(material => /^(Bag_Black|Gold)$/.test(material.name))) return;
    const geometry = object.geometry.clone();
    const positions = geometry.getAttribute("position");
    const indices = geometry.getIndex();
    const touched = new Set<number>();
    const groups = geometry.groups.length ? geometry.groups : [{start:0,count:indices?.count??positions.count,materialIndex:0}];
    for (const group of groups) {
      if (!/^(Bag_Black|Gold)$/.test(materials[group.materialIndex]?.name ?? "")) continue;
      for (let offset = group.start; offset < group.start + group.count; offset++) {
        const vertex = indices ? indices.getX(offset) : offset;
        if (touched.has(vertex)) continue;
        touched.add(vertex);
        positions.setX(vertex, positions.getX(vertex) * .7 - .08);
        changed++;
      }
    }
    if (touched.size) {
      positions.needsUpdate = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      object.geometry = geometry;
    } else geometry.dispose();
  });
  return changed;
}

type Pose = Record<string, [number, number, number]>;
const seated: Pose = {
  Hips: [-.12, 0, 0], Spine: [.12, 0, 0],
  UpperLeg_L: [-1.25, 0, 0], UpperLeg_R: [-1.25, 0, 0],
  LowerLeg_L: [1.3, 0, 0], LowerLeg_R: [1.3, 0, 0],
  UpperArm_L: [-.55, 0, -.18], UpperArm_R: [-.55, 0, .18],
  LowerArm_L: [-.85, 0, 0], LowerArm_R: [-.85, 0, 0],
};
const poses: Record<string, Pose> = {
  sit_idle: seated,
  typing: {...seated, UpperArm_L: [-.7, 0, -.18], UpperArm_R: [-.7, 0, .18], LowerArm_L: [-1, 0, 0], LowerArm_R: [-1, 0, 0]},
  talk: {...seated, Head: [0, .08, 0], UpperArm_R: [-.25, 0, .28]},
  social_talk: {Head: [0,.12,0], UpperArm_R: [-.32,0,.2], LowerArm_R: [-.48,0,0]},
  give_document: {UpperArm_R: [-1, 0, .18], LowerArm_R: [-.35, 0, 0], Spine: [.08, 0, 0]},
  nod: {Head: [.2, 0, 0]},
  error_reaction: {...seated, Head: [.12, 0, 0], UpperArm_R: [-.3, 0, .3]},
  rest: {...seated, Spine: [.22, 0, 0], Head: [-.12, 0, 0], UpperArm_L: [-.2, 0, -.1], UpperArm_R: [-.2, 0, .1]},
  look_around: {Head: [0, .3, 0], Neck: [0, .12, 0]},
  drink_coffee: {UpperArm_R: [-1.15, 0, .15], LowerArm_R: [-1.15, 0, 0], Head: [.08, 0, 0]},
  sit_down: seated,
  stand_up: {},
};

export function vinishClips(root: THREE.Object3D, source: THREE.AnimationClip[]): Map<string, THREE.AnimationClip> {
  const idle = source.find(c => c.name === "Idle");
  const walk = source.find(c => c.name === "Walk");
  if (!idle || !walk || !root.getObjectByName("Hips") || !root.getObjectByName("Head")) throw new Error("Vinish skeleton or locomotion clips unavailable");
  const result = new Map<string, THREE.AnimationClip>();
  for (const [name, clip] of [["idle_stand", idle], ["walk", walk]] as const) {
    const tracks = clip.tracks.filter(t => !/\.position$/.test(t.name));
    result.set(name, new THREE.AnimationClip(name, clip.duration, tracks));
  }
  const all = ["Hips", "Spine", "Chest", "Neck", "Head", "UpperArm_L", "LowerArm_L", "UpperArm_R", "LowerArm_R", "UpperLeg_L", "LowerLeg_L", "UpperLeg_R", "LowerLeg_R"];
  for (const [name, pose] of Object.entries(poses)) {
    const tracks: THREE.KeyframeTrack[] = [];
    const oneShot = name === "nod" || name === "error_reaction" || name === "sit_down" || name === "stand_up";
    const times = oneShot ? [0, .36, .8] : [0, .5, 1];
    for (const boneName of all) {
      const bone = root.getObjectByName(boneName);
      if (!bone) continue;
      const [x, y, z] = pose[boneName] ?? [0, 0, 0];
      const base = bone.quaternion.clone();
      const q = base.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
      const sway = name === "typing" && /LowerArm/.test(boneName) ? .22
        : /^(talk|social_talk)$/.test(name) && /Head|UpperArm_R/.test(boneName) ? .18
        : name === "give_document" && /UpperArm_R|LowerArm_R/.test(boneName) ? .28
        : name === "drink_coffee" && /UpperArm_R|Head/.test(boneName) ? .16
        : name === "sit_idle" && /Spine|Head/.test(boneName) ? .045
        : name === "rest" && /Spine|Head/.test(boneName) ? .07 : 0;
      const mid = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(sway, name === "look_around" ? -.55 : 0, 0)));
      const seatedRotation = seated[boneName] ?? [0,0,0];
      const seatQ = base.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...seatedRotation)));
      const values = name === "sit_down" ? [...base.toArray(), ...mid.toArray(), ...q.toArray()]
        : name === "stand_up" ? [...seatQ.toArray(), ...seatQ.clone().slerp(base,.5).toArray(), ...base.toArray()]
        : name === "nod" || name === "error_reaction" ? [...base.toArray(), ...mid.toArray(), ...base.toArray()]
        : [...q.toArray(), ...mid.toArray(), ...q.toArray()];
      tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values));
    }
    result.set(name, new THREE.AnimationClip(name, .8, tracks));
  }
  return result;
}

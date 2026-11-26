import type { Point } from "../layout.js";

// Each sample is within 0.125 m of any point on its segment. Inflate the
// two 0.55 m motion envelopes by both sampling errors.
const clearance = 1.35;

function samplePath(path: readonly Point[]): Point[] {
  const samples: Point[] = [path[0]!];
  for (let i = 1; i < path.length; i++) {
    const [x, z] = path[i - 1]!, [u, v] = path[i]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(u - x, v - z) / .25));
    for (let j = 1; j <= steps; j++) samples.push([x + (u - x) * j / steps, z + (v - z) * j / steps]);
  }
  return samples;
}

export function createRouteTraffic() {
  const active = new Map<string, Point[]>();
  function occupy(id: string, path: readonly Point[]) {
      const samples = samplePath(path);
      if ([...active].some(([otherId, other]) => otherId!==id && samples.some(p => other.some(q =>
        (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 < clearance ** 2)))) return false;
      active.set(id, samples);
      return true;
  }
  return {
    reserve(id: string, path: readonly Point[]) { return active.has(id) || occupy(id,path); },
    occupy,
    release(id: string) { active.delete(id); },
  };
}

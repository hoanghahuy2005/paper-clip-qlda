import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createFloorLampLighting } from "../src/ui/floor-lamp.ts";

test("every standing lamp gets warm shade, halo and floor spill with bounded real lights", () => {
  const scene = new THREE.Scene();
  const geometries = new Set();
  const materials = new Set();
  const lightLamp = createFloorLampLighting(scene, new THREE.Texture(), geometries, materials);
  const positions = [[-8.15,-10.4,.8],[3.95,-11.03,.75],[16.2,-11.3,.7],[-12.4,-2.16,.73],[-11.2,2.16,.73],[-4.55,-.72,.7],[4.55,.72,.7]];
  for (const [x,z,scale] of positions) {
    const model = new THREE.Group();
    model.position.set(x,.055,z);
    model.scale.setScalar(scale);
    lightLamp(model,x,.055,z,scale);
    assert.equal(model.position.x,x);
    assert.equal(model.scale.x,scale);
    const shade = model.getObjectByName("floor-lamp-emissive-shade");
    assert.ok(shade?.material.emissiveIntensity > 0);
    assert.ok(model.getObjectByName("floor-lamp-soft-halo"));
  }
  assert.equal(scene.children.filter(child => child.name === "floor-lamp-light-pool").length,7);
  const lights = scene.children.filter(child => child.name.startsWith("floor-lamp-local-light:"));
  assert.equal(lights.length,4);
  assert.ok(lights.every(light => light instanceof THREE.PointLight && !light.castShadow));
});

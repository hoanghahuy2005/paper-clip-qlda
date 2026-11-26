import esbuild from "esbuild";
import path from "node:path";
import { mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await esbuild.build({
  entryPoints: [path.join(root, "src/worker.ts")],
  outfile: path.join(root, "dist/worker.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node24"],
});
await esbuild.build({
  entryPoints: [path.join(root, "src/ui/index.tsx")],
  outfile: path.join(root, "dist/ui/index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  external: ["react", "react/jsx-runtime", "@paperclipai/plugin-sdk/ui"],
});
await mkdir(path.join(root, "dist/ui/assets"), { recursive: true });
await copyFile(path.join(root, "src/ui/assets/test-rig.glb"), path.join(root, "dist/ui/assets/test-rig.glb"));
await copyFile(path.join(root, "src/ui/assets/office-base-rig.glb"), path.join(root, "dist/ui/assets/office-base-rig.glb"));
await mkdir(path.join(root, "dist/ui/assets/vinish"), { recursive: true });
for (const name of ["businessman-with-briefcase", "businesswoman-with-tablet", "female-presenter", "male-presenter", "woman-with-clipboard", "man-walking-with-phone", "woman-with-coffee", "man-in-blazer-and-chinos", "woman-with-handbag", "man-carrying-laptop", "man-in-three-piece-suit", "senior-executive"]) {
  await copyFile(path.join(root, "src/ui/assets/vinish", `${name}.glb`), path.join(root, "dist/ui/assets/vinish", `${name}.glb`));
}
await mkdir(path.join(root, "dist/ui/assets/kaykit"), { recursive: true });
for (const name of ["couch_pillows", "table_low", "table_medium_long", "chair_B", "shelf_B_small_decorated", "cabinet_medium_decorated", "lamp_table", "cactus_medium_A", "pictureframe_medium", "shelf_B_large_decorated", "lamp_standing", "chair_A_wood", "book_set", "pictureframe_large_A", "cactus_medium_B", "table_medium", "shelf_A_big"].flatMap(stem=>[`${stem}.gltf`,`${stem}.bin`]).concat(["furniturebits_texture.png", "LICENSE.txt"])) {
  await copyFile(path.join(root, "src/ui/assets/kaykit", name), path.join(root, "dist/ui/assets/kaykit", name));
}
await mkdir(path.join(root, "dist/ui/assets/plants"), { recursive: true });
for (const name of ["quaternius-houseplant-a.glb", "quaternius-houseplant-b.glb", "quaternius-houseplant-c.glb", "quaternius-houseplant-flower.glb", "kenney-coffee-machine.glb"]) {
  await copyFile(path.join(root, "src/ui/assets/plants", name), path.join(root, "dist/ui/assets/plants", name));
}

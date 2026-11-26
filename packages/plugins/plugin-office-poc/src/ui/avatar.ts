import { BufferAttribute, Color, Mesh, MeshStandardMaterial, SphereGeometry, type BufferGeometry, type Object3D } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const avatarScale = .85;
const skinColors = ["#BE855E", "#E4B091", "#9C6248", "#D19C77", "#81503D", "#F0C39D"];
const hairColors = ["#302730", "#513B30", "#292631", "#7D4B39", "#342D2F", "#51382B"];

/** The shared rig supplies skin, clothes and bones. These pieces follow the named joints. */
export function styleAvatar(root: Object3D, roleColor: string, index: number, stationId: string) {
  const materials: MeshStandardMaterial[] = [];
  const geometry: BufferGeometry[] = [];
  const details = new Map<Object3D, BufferGeometry[]>();
  const skin = skinColors[index % skinColors.length]!;
  root.scale.setScalar(avatarScale);
  root.traverse(object => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
    const material = object.material.clone();
    if (material.name === "outfit_base") material.color.set(roleColor);
    if (material.name === "skin") material.color.set(skin);
    object.material = material;
    object.castShadow = true;
    materials.push(material);
  });

  function detail(parent: Object3D, color: string, position: [number, number, number], size: [number, number, number], soft=false) {
    const source = soft ? new SphereGeometry(1,8,6) : new RoundedBoxGeometry(...size, 2, Math.min(...size) * .22);
    const shape=source.index?source.toNonIndexed():source;
    if(shape!==source)source.dispose();
    if(soft)shape.scale(size[0]/2,size[1]/2,size[2]/2);
    shape.translate(...position);
    const tint = new Color(color);
    const colors = new Float32Array(shape.attributes.position.count * 3);
    for (let i=0;i<colors.length;i+=3) tint.toArray(colors,i);
    shape.setAttribute("color",new BufferAttribute(colors,3));
    const parts=details.get(parent)??[];
    parts.push(shape);
    details.set(parent,parts);
  }

  const head = root.getObjectByName("head");
  if (head) {
    const hair = hairColors[index % hairColors.length]!;
    detail(head, skin, [0,.015,0], [.7,.69,.65],true);
    detail(head, hair, [0,.245,-.025], [.55,.22,.51],true);
    detail(head, hair, [index % 2 === 0 ? -.15 : .15,.16,.182], [.22,.17,.13],true);
    detail(head, hair, [0,.07,-.205], [.48,index % 3 === 0 ? .37 : .27,.16],true);
    detail(head, hair, [index % 3 === 0 ? -.22 : .22,.14,.01], [.17,.32,.28],true);
    // The rig's anatomical front is local +Z. Keep the face outside the new rounded head shell.
    for (const x of [-.09,.09]) detail(head, "#332D32", [x,.027,.352], [.035,.044,.02]);
    for (const x of [-.09,.09]) detail(head, "#FFF9EE", [x-.008,.039,.365], [.012,.012,.009]);
    for (const x of [-.16,.16]) detail(head, "#D98882", [x,-.048,.314], [.07,.026,.014]);
    detail(head, "#6D4037", [0,-.086,.342], [.060,.014,.015]);
    if (["visual_generator","voice_audio","color_sound"].includes(stationId)) {
      for (const x of [-.255,.255]) detail(head, "#39465C", [x,.016,.03], [.075,.18,.14]);
    }
  }
  const hand = root.getObjectByName("right_arm");
  if (hand) detail(hand, "#FFF0DC", [-.055,-.45,.107], [.13,.16,.14]);
  const torso = root.getObjectByName("torso");
  if (torso) {
    detail(torso, roleColor, [0,-.04,0], [.64,.73,.43]);
    detail(torso, "#F5F0E7", [0,.2,.23], [.2,.28,.025]);
    detail(torso, stationId === "pm" ? "#FFCA80" : "#F2EEE5", [.17,.13,.19], [.12,.09,.025]);
    if (stationId === "pm") {
      detail(torso, "#39465C", [0,.035,.183], [.26,.52,.037]);
      detail(torso, "#C99B69", [.30,-.30,.21], [.27,.25,.055]);
    } else if (["scriptwriter","shot_planner","motion_subtitle"].includes(stationId)) {
      detail(torso, "#EBE4D9", [.31,-.235,.205], [.09,.34,.045]);
    } else if (stationId === "qa_reviewer") {
      detail(torso, "#D8F3E8", [.29,-.19,.205], [.22,.23,.045]);
    }
  }
  for(const name of ["left_arm","right_arm"]){
    const arm=root.getObjectByName(name);
    if(arm)detail(arm,roleColor,[0,-.18,0],[.25,.5,.3]);
  }
  for(const name of ["left_leg","right_leg"]){
    const leg=root.getObjectByName(name);
    if(leg){
      detail(leg,index%3===0?"#444250":"#77717B",[0,-.28,0],[.29,.72,.33]);
      detail(leg,"#4A4344",[0,-.62,.08],[.31,.13,.41]);
    }
  }
  let cup: Mesh | undefined;
  if (details.size) {
    const material = new MeshStandardMaterial({ vertexColors:true,roughness:.92 });
    materials.push(material);
    for (const [parent, parts] of details) {
      const merged = mergeGeometries(parts);
      parts.forEach(part=>part.dispose());
      const mesh = new Mesh(merged,material);
      parent.add(mesh);
      geometry.push(merged);
      if (parent===hand) { cup=mesh; cup.visible=false; }
    }
  }
  return { cup, materials, geometry };
}

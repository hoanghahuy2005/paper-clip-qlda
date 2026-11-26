import * as THREE from "three";

/** Visual lighting for every KayKit standing lamp, including future placements. */
export function createFloorLampLighting(scene: THREE.Scene, spillTexture: THREE.Texture, geometries: Set<THREE.BufferGeometry>, materials: Set<THREE.Material>) {
  // The source lamp is one textured mesh. This thin shell follows its original shade silhouette.
  const shadeGeometry=new THREE.CylinderGeometry(.38,.62,.76,12,1,true);geometries.add(shadeGeometry);
  const shadeMaterial=new THREE.MeshStandardMaterial({color:"#B76A31",emissive:"#FF9C37",emissiveIntensity:.95,transparent:true,opacity:.9,roughness:.7,side:THREE.DoubleSide,depthWrite:false});materials.add(shadeMaterial);
  const haloMaterial=new THREE.SpriteMaterial({map:spillTexture,color:"#FFCB8B",transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(haloMaterial);
  const poolGeometry=new THREE.PlaneGeometry(2.9,2.9);geometries.add(poolGeometry);
  const poolMaterial=new THREE.MeshBasicMaterial({map:spillTexture,color:"#FFC484",transparent:true,opacity:.34,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(poolMaterial);
  const litZones=new Set<string>();
  return (model: THREE.Object3D, x:number, y:number, z:number, scale:number) => {
    const shade=new THREE.Mesh(shadeGeometry,shadeMaterial);shade.name="floor-lamp-emissive-shade";shade.position.y=2.14;model.add(shade);
    const halo=new THREE.Sprite(haloMaterial);halo.name="floor-lamp-soft-halo";halo.position.y=2.13;halo.scale.set(1.55,1.38,1);model.add(halo);
    const pool=new THREE.Mesh(poolGeometry,poolMaterial);pool.name="floor-lamp-light-pool";pool.rotation.x=-Math.PI/2;pool.position.set(x,Math.max(.12,y+.065),z);pool.renderOrder=1;scene.add(pool);
    const zone=z>5?(x<-11?"ceo":x<-5?"pm":x<7?"post":"qa"):z<-5?(x<0?"creative":"ai"):Math.abs(z)>2?"corridor":"lounge";
    if(!litZones.has(zone)){
      litZones.add(zone);
      const light=new THREE.PointLight(0xffc58c,4.1,3.8,2);light.name=`floor-lamp-local-light:${zone}`;light.position.set(x,y+2.1*scale,z);light.castShadow=false;scene.add(light);
    }
  };
}

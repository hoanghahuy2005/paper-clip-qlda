import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { doors, lounge, loungeActivities, loungeSlots, palette, reverseTraversedRoute, rooms, route, workstations, type Bounds, type Point } from "../layout.js";
import { edgeFurniture, officeBoxes, plantLocations } from "./fixtures.js";
import { idleToLoungeDelayMs, updateIdleSince } from "../business.js";
import { createRouteTraffic } from "./route-traffic.js";
import { styleAvatar } from "./avatar.js";
import { compactYanBriefcase, vinishClips, vinishModels } from "./vinish-rig.js";
import { corridorEdgeDoors, premiumEdgeProps, premiumPlantProps } from "./corridor-lounge.js";
import { createFloorLampLighting } from "./floor-lamp.js";
import { premiumRoomFurniture, premiumRoomPlants } from "./premium-room-props.js";

export type ActorVisual = { id: string; deskId: string; name: string; state: "unknown" | "stale" | "idle" | "working" | "error" | "paused"; restEligible: boolean; journey?: "ceo" | "handoff"; journeyKey?: string; recipientDesk?: string; meeting?: {id:string;seat:number;expiresAt:number} };
export type SceneHandle = {
  update(actors: ActorVisual[], pendingApprovals?: ReadonlySet<string>): void;
  select(id: string | null): void;
  focusRoom(id: string): void;
  resetCamera(): void;
  zoomBy(factor: number): void;
  orbitBy(angle: number): void;
  setLabelsVisible(visible: boolean): void;
  dispose(): void;
};
export type MotionStatus = "At workstation" | "Walking to lounge" | "Resting in lounge" | "Returning to workstation" | "Delivering approval" | "Delivering handoff" | "Walking to meeting" | "In meeting";

export async function mountScene(host: HTMLElement, assetUrl: string, companyId: string, onStatus: (message: string) => void, onSelect?: (id: string | null) => void, onMotion?: (id: string, status: MotionStatus) => void): Promise<SceneHandle> {
  const loadStarted = performance.now();
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#101216");
  const camera = new THREE.OrthographicCamera(-29,29,19,-19,.1,150), target = new THREE.Vector3();
  let azimuth = Math.PI/4, elevation = .62;
  const desiredTarget=new THREE.Vector3();let desiredZoom=1,overviewFit=1,overviewAutoFit=true;
  let cameraInputAt: number | undefined;
  let labelsReady=false,actorsReady=false,labelsVisible=true,labelsDirty=true;
  const aim = () => { camera.position.set(target.x+43*Math.sin(azimuth)*Math.cos(elevation),43*Math.sin(elevation),target.z+43*Math.cos(azimuth)*Math.cos(elevation));camera.lookAt(target); cameraInputAt=performance.now();labelsDirty=true; };
  aim();
  const mobile = matchMedia("(max-width: 600px)").matches;
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.25:1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
  renderer.shadowMap.enabled=!mobile;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  host.appendChild(renderer.domElement);
  const previousHostPosition=host.style.position;
  if(!previousHostPosition)host.style.position="relative";
  renderer.domElement.style.touchAction = "none";
  const resize = () => {
    const w = Math.max(host.clientWidth,1), h = Math.max(host.clientHeight,1);
    const aspect = w/h, extent = Math.max(14.5,22/aspect);
    renderer.setSize(w,h);
    camera.left=-extent*aspect; camera.right=extent*aspect;
    camera.top=extent; camera.bottom=-extent;
    const reserved=host.closest(".lowtech-present")?Math.min(220,w*.3):0;
    const projectedWidth=44*Math.abs(Math.cos(azimuth))+34*Math.abs(Math.sin(azimuth))+2;
    const projectedHeight=(44*Math.abs(Math.sin(azimuth))+34*Math.abs(Math.cos(azimuth)))*Math.sin(elevation)+2;
    overviewFit=Math.min(.93*(w-reserved)/w*(2*extent*aspect)/projectedWidth,.93*(2*extent)/projectedHeight,1.15);
    if(overviewAutoFit){desiredZoom=overviewFit;camera.zoom=overviewFit;}
    camera.updateProjectionMatrix();
    labelsDirty=true;if(labelsReady)positionLabels();
  };
  function zoomBy(factor:number) {
    overviewAutoFit=false;
    desiredZoom=THREE.MathUtils.clamp(desiredZoom*factor,.65,8);
    camera.updateProjectionMatrix();
    cameraInputAt=performance.now();
  }
  function resetCamera() {
    desiredTarget.set(0,0,0);
    azimuth=Math.PI/4;
    elevation=.62;
    overviewAutoFit=true;desiredZoom=overviewFit;
    camera.updateProjectionMatrix();
    aim();
  }
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  scene.add(new THREE.HemisphereLight(0xfff9ee,0x695c61,.82));
  const sun=new THREE.DirectionalLight(0xffe8c5,2.12);
  sun.position.set(-10,22,-14);
  sun.castShadow=!mobile;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.normalBias=.035;
  sun.shadow.radius=2;
  sun.shadow.camera.left=-25;sun.shadow.camera.right=25;
  sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;
  scene.add(sun);
  for(const [x,z,power] of [[0,0,23],[-14,9,8],[0,-9,9],[-9,0,10],[9,0,10]] as const){
    const fill=new THREE.PointLight(0xffdfaf,power,7,2);
    fill.position.set(x,2.8,z);scene.add(fill);
  }
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  // Presentation colors stay in the render layer; R3 layout and shared palette are unchanged.
  const roomLights:Record<string,string>={meeting:"#FF3EAD",creative:"#FFAA20",ai:"#188FFF",post:"#A14DFF",qa:"#00D8C8",pm:"#A8DFFF",ceo:"#FF8525"};
  const roomFloors:Record<string,string>={meeting:"#A85A85",creative:"#B78339",ai:"#4C7FB4",post:"#805CB4",qa:"#3D9E99",pm:"#8BA9B6",ceo:"#B9783C"};
  const mat=(color:string)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.95,metalness:0});materials.add(m);return m;};
  const woodCanvas=document.createElement("canvas"); woodCanvas.width=512;woodCanvas.height=512;
  const woodContext=woodCanvas.getContext("2d");
  if(woodContext){
    woodContext.fillStyle="#D9B38E";woodContext.fillRect(0,0,512,512);
    for(let row=0;row<8;row++){
      const y=row*64;
      woodContext.fillStyle=row%2?"#D5AD87":"#E6C4A0";woodContext.fillRect(0,y,512,62);
      woodContext.fillStyle="rgba(116,71,42,.15)";woodContext.fillRect(0,y+62,512,2);
      const split=row%2?168:342;
      woodContext.fillRect(split,y,2,62);
      woodContext.fillStyle="rgba(255,250,232,.22)";woodContext.fillRect(0,y+5,512,2);
    }
  }
  const woodTexture=new THREE.CanvasTexture(woodCanvas);
  textures.add(woodTexture);
  woodTexture.colorSpace=THREE.SRGBColorSpace;
  woodTexture.wrapS=woodTexture.wrapT=THREE.RepeatWrapping;
  woodTexture.repeat.set(7,5);
  woodTexture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  const warmWoodCanvas=document.createElement("canvas");warmWoodCanvas.width=512;warmWoodCanvas.height=512;
  const warmWoodContext=warmWoodCanvas.getContext("2d");
  if(warmWoodContext){
    warmWoodContext.fillStyle="#725039";warmWoodContext.fillRect(0,0,512,512);
    for(let row=0;row<8;row++){
      const y=row*64;warmWoodContext.fillStyle=row%2?"#76513A":"#805A40";warmWoodContext.fillRect(0,y,512,62);
      warmWoodContext.fillStyle="rgba(34,19,13,.25)";warmWoodContext.fillRect(0,y+61,512,3);
      for(let line=0;line<7;line++){
        const offset=(line*37+row*13)%58;
        warmWoodContext.fillStyle=line%2?"rgba(39,23,16,.12)":"rgba(250,197,127,.1)";
        warmWoodContext.fillRect(0,y+offset,512,1);
      }
      warmWoodContext.fillStyle="rgba(40,23,15,.18)";warmWoodContext.fillRect(row%2?168:342,y,2,62);
    }
  }
  const warmWoodTexture=new THREE.CanvasTexture(warmWoodCanvas);warmWoodTexture.colorSpace=THREE.SRGBColorSpace;
  warmWoodTexture.wrapS=warmWoodTexture.wrapT=THREE.RepeatWrapping;textures.add(warmWoodTexture);
  for(const [name,x,z,width,depth,repeatX] of [["corridor-negative",0,-3.5,34,3,17],["corridor-positive",0,3.5,34,3,17],["corridor-link-left",-11,0,12,4,6],["corridor-link-right",11,0,12,4,6],["lounge",0,0,10,4,5]] as const){
    const map=warmWoodTexture.clone();map.needsUpdate=true;map.repeat.set(repeatX,2);textures.add(map);
    const material=new THREE.MeshStandardMaterial({map,color:name==="lounge"?"#F2D4B2":"#A47A5C",roughness:.68,metalness:.04});materials.add(material);
    const geometry=new THREE.PlaneGeometry(width,depth);geometries.add(geometry);
    const surface=new THREE.Mesh(geometry,material);surface.name=`premium-floor:${name}`;surface.rotation.x=-Math.PI/2;surface.position.set(x,name==="lounge"?.06:.09,z);surface.receiveShadow=true;scene.add(surface);
  }
  const studioCanvas=document.createElement("canvas");studioCanvas.width=512;studioCanvas.height=512;
  const studio=studioCanvas.getContext("2d");
  if(studio){const glow=studio.createRadialGradient(256,256,18,256,256,290);
    glow.addColorStop(0,"#292C33");glow.addColorStop(.36,"#202329");glow.addColorStop(.78,"#14171D");glow.addColorStop(1,"#101216");
    studio.fillStyle=glow;studio.fillRect(0,0,512,512);
    // Faint polished-stone grain, generated once and reused on the large matte floor.
    let seed=271828;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<145;i++){const x=random()*512,y=random()*512,length=10+random()*42;
      studio.strokeStyle=i%3?"rgba(194,200,207,.035)":"rgba(7,10,15,.09)";studio.lineWidth=.4+random()*.8;
      studio.beginPath();studio.moveTo(x,y);studio.bezierCurveTo(x+length*.3,y-2,x+length*.65,y+3,x+length,y+random()*5-2.5);studio.stroke();
    }
    for(let i=0;i<480;i++){studio.fillStyle=i%2?"rgba(215,221,227,.035)":"rgba(0,0,0,.045)";studio.fillRect(random()*512,random()*512,.6+random(),.6+random());}
  }
  const studioTexture=new THREE.CanvasTexture(studioCanvas);studioTexture.colorSpace=THREE.SRGBColorSpace;textures.add(studioTexture);
  const outerGeometry=new THREE.PlaneGeometry(180,180);geometries.add(outerGeometry);
  const outerMaterial=new THREE.MeshBasicMaterial({map:studioTexture});materials.add(outerMaterial);
  const outerFloor=new THREE.Mesh(outerGeometry,outerMaterial);outerFloor.rotation.x=-Math.PI/2;outerFloor.position.y=-.35;outerFloor.receiveShadow=true;scene.add(outerFloor);
  const poolCanvas=document.createElement("canvas");poolCanvas.width=512;poolCanvas.height=512;
  const poolContext=poolCanvas.getContext("2d");
  if(poolContext){const pool=poolContext.createRadialGradient(256,256,95,256,256,254);
    pool.addColorStop(0,"rgba(255,226,181,.055)");pool.addColorStop(.58,"rgba(255,218,167,.025)");pool.addColorStop(1,"rgba(255,214,165,0)");
    poolContext.fillStyle=pool;poolContext.fillRect(0,0,512,512);}
  const poolTexture=new THREE.CanvasTexture(poolCanvas);poolTexture.colorSpace=THREE.SRGBColorSpace;textures.add(poolTexture);
  const poolGeometry=new THREE.PlaneGeometry(60,49);geometries.add(poolGeometry);
  const poolMaterial=new THREE.MeshBasicMaterial({map:poolTexture,transparent:true,depthWrite:false});materials.add(poolMaterial);
  const poolMesh=new THREE.Mesh(poolGeometry,poolMaterial);poolMesh.rotation.x=-Math.PI/2;poolMesh.position.y=-.345;scene.add(poolMesh);
  // Soft, world-space bounce outside the plinth. The same radial alpha is reused for each room.
  const spillCanvas=document.createElement("canvas");spillCanvas.width=256;spillCanvas.height=256;
  const spillContext=spillCanvas.getContext("2d");
  if(spillContext){const gradient=spillContext.createRadialGradient(128,128,12,128,128,127);
    gradient.addColorStop(0,"rgba(255,255,255,.56)");gradient.addColorStop(.35,"rgba(255,255,255,.34)");gradient.addColorStop(.72,"rgba(255,255,255,.09)");gradient.addColorStop(1,"rgba(255,255,255,0)");
    spillContext.fillStyle=gradient;spillContext.fillRect(0,0,256,256);
  }
  const spillTexture=new THREE.CanvasTexture(spillCanvas);spillTexture.colorSpace=THREE.SRGBColorSpace;textures.add(spillTexture);
  const lightFloorLamp=createFloorLampLighting(scene,spillTexture,geometries,materials);
  const spillMeshes:THREE.Mesh[]=[];
  const lightSpill=(x:number,z:number,w:number,d:number,color:string,opacity:number)=>{
    const geometry=new THREE.PlaneGeometry(w,d);geometries.add(geometry);
    const material=new THREE.MeshBasicMaterial({map:spillTexture,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(material);
    const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,-.338,z);mesh.renderOrder=1;mesh.name="led-world-spill";scene.add(mesh);spillMeshes.push(mesh);
  };
  for(const room of rooms){
    const x=(room.x[0]+room.x[1])/2,z=room.z[1]<0?-13.5:13.5;
    lightSpill(x,z,room.x[1]-room.x[0]+4,9,roomLights[room.id]!,["meeting","creative","ai"].includes(room.id)?1.08:.92);
    lightSpill(x,z<0?-15.5:15.5,(room.x[1]-room.x[0])*.68,5.5,roomLights[room.id]!,.22);
  }
  for(const [x,z,w,d] of [[-18.35,0,6.2,28],[18.35,0,6.2,28],[0,-13.35,38,6.2],[0,13.35,38,6.2]] as const)lightSpill(x,z,w,d,"#FF712B",.27);
  for(const x of [-18.1,18.1])for(const z of [-13.1,13.1])lightSpill(x,z,5.4,5.4,"#FF7934",.12);
  // The former 0.15 m lip becomes a 1 m display ledge on every side (6.7x).
  const plinthGeometry=new RoundedBoxGeometry(36,.48,26,2,.09);geometries.add(plinthGeometry);
  const plinthMaterial=new THREE.MeshStandardMaterial({color:"#17191E",roughness:.52,metalness:.14});materials.add(plinthMaterial);const plinth=new THREE.Mesh(plinthGeometry,plinthMaterial);
  plinth.position.y=-.31;plinth.receiveShadow=true;scene.add(plinth);
  const deckGeometry=new RoundedBoxGeometry(35.6,.06,25.6,2,.025);geometries.add(deckGeometry);
  const deckMaterial=new THREE.MeshStandardMaterial({color:"#22242B",roughness:.48,metalness:.16});materials.add(deckMaterial);
  const deck=new THREE.Mesh(deckGeometry,deckMaterial);deck.name="plinth-inset-deck";deck.position.y=-.06;deck.receiveShadow=true;scene.add(deck);
  const galleryLine=new THREE.MeshBasicMaterial({color:"#926B50",transparent:true,opacity:.55});materials.add(galleryLine);
  const galleryLed=new THREE.MeshBasicMaterial({color:"#FF701F",toneMapped:false});materials.add(galleryLed);
  const galleryGlow=new THREE.MeshBasicMaterial({color:"#FF701F",transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(galleryGlow);
  // Four metres of dark studio floor separate the 36 x 26 m plinth from this
  // flat, rounded 44 x 34 m exhibition outline.
  for(const [x,z,length,axis] of [[0,-17,40.8,"x"],[0,17,40.8,"x"],[-22,0,30.8,"z"],[22,0,30.8,"z"]] as const){
    const geometry=new THREE.BoxGeometry(axis==="x"?length:.025,.018,axis==="z"?length:.025);geometries.add(geometry);
    const line=new THREE.Mesh(geometry,galleryLine);line.name="studio-exhibition-outline";line.position.set(x,-.328,z);scene.add(line);
  }
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const points=Array.from({length:9},(_,index)=>{const angle=index*Math.PI/16;return new THREE.Vector3(sx*(20.4+1.6*Math.cos(angle)),-.328,sz*(15.4+1.6*Math.sin(angle)));});
    const curve=new THREE.CatmullRomCurve3(points);
    const geometry=new THREE.TubeGeometry(curve,12,.014,4,false);geometries.add(geometry);
    const corner=new THREE.Mesh(geometry,galleryLine);corner.name="studio-exhibition-corner";scene.add(corner);
  }
  for(const [x,z,length,axis] of [[-10.5,-17,14.3,"x"],[10.5,-17,14.3,"x"],[-10.5,17,14.3,"x"],[10.5,17,14.3,"x"],[-22,-8.2,13.8,"z"],[-22,8.2,13.8,"z"],[22,-8.2,13.8,"z"],[22,8.2,13.8,"z"]] as const){
    lightSpill(x,z,axis==="x"?length+1.8:3.2,axis==="z"?length+1.8:3.2,"#FF712B",.37);
    for(const [thickness,material] of [[1.1,galleryGlow],[.2,galleryLed]] as const){
      const geometry=new THREE.BoxGeometry(axis==="x"?length:thickness,.025,axis==="z"?length:thickness);geometries.add(geometry);
      const segment=new THREE.Mesh(geometry,material);segment.name="studio-exhibition-led";segment.position.set(x,-.318,z);scene.add(segment);
    }
  }
  const fixtureMaterials = new Map<string, THREE.Material>();
  const batches = new Map<string, ReturnType<typeof officeBoxes>>();
  const softEdge = (name?: string) => Boolean(name && /^(desk:|sofa-|lounge-sofa|lounge-table|ceo-desk|meeting-table|planter)/.test(name));
  const furnitureLoader=new GLTFLoader();
  const furnitureBase=assetUrl.replace(/office-base-rig\.glb(?:\?.*)?$/, "kaykit/");
  let furnitureReady=false;
  try {
    const names=["couch_pillows","table_low","table_medium_long","chair_B","shelf_B_small_decorated","cabinet_medium_decorated","lamp_table","cactus_medium_A","pictureframe_medium","shelf_B_large_decorated","lamp_standing","chair_A_wood","book_set","pictureframe_large_A","cactus_medium_B","table_medium","shelf_A_big"];
    const loaded=await Promise.all(names.map(name=>furnitureLoader.loadAsync(furnitureBase+name+".gltf")));
    const templates=new Map(names.map((name,index)=>[name,loaded[index]!.scene]));
    type Placement={name:string;x:number;y:number;z:number;scale:number;rotation:number};
    const staticFurniture=new Map<string,Placement[]>();
    const place=(name:string,x:number,y:number,z:number,scale:number,rotation=0)=>{
      if(name!=="lamp_standing"&&name!=="table_medium"){
        const source=templates.get(name)!.getObjectByProperty("type","Mesh") as THREE.Mesh|undefined;
        if(source&&!Array.isArray(source.material)&&!source.material.transparent){
          const key=`${name}:${Math.floor((x+17)/8)}:${Math.floor((z+12)/8)}`;
          const group=staticFurniture.get(key)??[];group.push({name,x,y,z,scale,rotation});staticFurniture.set(key,group);
          return;
        }
      }
      const model=templates.get(name)!.clone(true);
      model.position.set(x,y,z);model.scale.setScalar(scale);model.rotation.y=rotation;
      model.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      object.castShadow=true;object.receiveShadow=true;
      geometries.add(object.geometry);
      if(name==="table_medium"&&object.material instanceof THREE.MeshStandardMaterial){object.material=new THREE.MeshLambertMaterial({map:object.material.map,color:"#AC805D"});}
      for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);
      });scene.add(model);
      if(name==="lamp_standing")lightFloorLamp(model,x,y,z,scale);
    };
    place("couch_pillows",-2.3,.075,0,.76);
    place("couch_pillows",2.3,.075,0,.76,Math.PI);
    place("table_low",0,.075,0,.53);
    for(const station of workstations){
      const [x,z]=station.seed,side=Math.sign(z);
      place("table_medium_long",x,.055,z-side*.98,.46);
      // The workstation seed is the agent's hip anchor, not the old rear chair placeholder.
      place("chair_B",x,.055,z,.56,side>0?Math.PI:0);
    }
    place("table_medium_long",-14,.055,9.1,.76);
    place("chair_B",-14,.055,10.2,.58,Math.PI);
    place("table_medium",-12,.055,-9,1.22);
    for(const x of [-13.5,-12,-10.5])place("chair_A_wood",x,.055,-7,.78,Math.PI);
    for(const x of [-13.3,-12.4,-11.5,-10.6])place("chair_A_wood",x,.055,-10.2,.78);
    for(const room of rooms){
      if(room.id==="meeting"||room.id==="creative"||room.id==="ai")continue;
      const far=room.z[1]<0?room.z[0]:room.z[1],z=far+(room.z[1]<0?.65:-.65);
      place("shelf_B_small_decorated",room.x[0]+.9,.055,z,1.05);
      place("cabinet_medium_decorated",room.x[1]-2.05,.055,z,.95);
      place("cactus_medium_A",room.x[1]-.75,.055,z,.9);
      place("pictureframe_medium",room.x[0]+1.8,.75,far+(room.z[1]<0?.18:-.18),.62,room.z[1]<0?0:Math.PI);
    }
    // Distinct larger CC0 silhouettes replace the repeated small cabinets and pots.
    place("shelf_B_large_decorated",-15.8,.055,-11.1,.92);
    place("lamp_standing",-8.15,.055,-10.4,.8);
    place("shelf_B_large_decorated",-5.85,.055,-11.1,.87);
    place("book_set",-3.2,.62,-11.15,.7);
    place("pictureframe_large_A",2.6,.82,-11.88,.82);
    place("lamp_standing",3.95,.055,-11.03,.75);
    place("shelf_A_big",5.75,.055,-11.05,.85);
    place("shelf_B_large_decorated",15.6,.055,-11.05,.83);
    place("lamp_standing",16.2,.055,-11.3,.7);
    place("lamp_table",-14.7,.76,9.1,.32);
    for(const prop of premiumRoomFurniture)place(prop.model,prop.x,.055,prop.z,prop.scale,"rotation" in prop?prop.rotation:0);
    place("lamp_table",-8.55,.78,8.05,.32);
    for(const x of [-3,1,5])place("lamp_table",x+.56,.78,8.05,.26);
    place("lamp_table",12.55,.78,8.05,.3);
    place("lamp_table",0,.49,0,.28);
    for(const prop of edgeFurniture)place(prop.model,prop.x,.055,prop.z,prop.scale);
    for(const prop of premiumEdgeProps)place(prop.model,prop.x,.065,prop.z,prop.scale);
    place("pictureframe_medium",-3.3,1.12,-1.92,.54);
    place("pictureframe_large_A",3.3,1.08,-1.92,.55);
    place("lamp_table",-4.2,1.02,0,.38);
    place("cactus_medium_A",4.2,1.05,0,.54);
    place("lamp_table",-9,1.05,-2.08,.28);
    place("lamp_table",9,1.05,2.08,.28);
    const position=new THREE.Vector3(),size=new THREE.Vector3(),rotationY=new THREE.Quaternion(),matrix=new THREE.Matrix4();
    for(const group of staticFurniture.values()){
      const source=templates.get(group[0]!.name)!.getObjectByProperty("type","Mesh") as THREE.Mesh;
      const instances=new THREE.InstancedMesh(source.geometry,source.material,group.length);
      group.forEach((item,index)=>{
        rotationY.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,item.rotation);
        matrix.compose(position.set(item.x,item.y,item.z),rotationY,size.setScalar(item.scale));
        instances.setMatrixAt(index,matrix);
      });
      instances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      instances.computeBoundingSphere();instances.castShadow=true;instances.receiveShadow=true;
      instances.matrixAutoUpdate=false;
      instances.name=`furniture:${group[0]!.name}`;
      geometries.add(source.geometry);
      for(const material of Array.isArray(source.material)?source.material:[source.material])materials.add(material);
      scene.add(instances);
    }
    furnitureReady=true;
  } catch(error) { onStatus(`Furniture model unavailable: ${String(error)}`); }
  try {
    const plantBase=assetUrl.replace(/office-base-rig\.glb(?:\?.*)?$/, "plants/");
    const [plantA,plantB,plantC,plantFlower,coffeeMachine]=await Promise.all(["quaternius-houseplant-a.glb","quaternius-houseplant-b.glb","quaternius-houseplant-c.glb","quaternius-houseplant-flower.glb","kenney-coffee-machine.glb"].map(file=>new GLTFLoader().loadAsync(plantBase+file)));
    for(const [source,x,z,height] of [[plantA.scene,-16.1,-6.4,1.45],[plantB.scene,-8.1,-6.4,1.3],[plantB.scene,-6.2,-6.4,1.3],[plantA.scene,4.2,-6.4,1.35],[plantA.scene,5.8,-6.4,1.35],[plantB.scene,16.3,-6.4,1.4]] as const){
      const model=source.clone(true),initial=new THREE.Box3().setFromObject(model),size=initial.getSize(new THREE.Vector3());
      if(size.y<=0)continue;
      model.scale.setScalar(Math.min(height/size.y,1.05/Math.max(size.x,size.z)));
      const scaled=new THREE.Box3().setFromObject(model);
      model.position.set(x,.055-scaled.min.y,z);
      model.traverse(object=>{if(!(object instanceof THREE.Mesh))return;object.castShadow=true;object.receiveShadow=true;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});
      scene.add(model);
    }
    const plantSources:Record<string,THREE.Object3D>={"quaternius-houseplant-a":plantA.scene,"quaternius-houseplant-b":plantB.scene,"quaternius-houseplant-c":plantC.scene,"quaternius-houseplant-flower":plantFlower.scene};
    for(const prop of premiumRoomPlants){
      const model=plantSources[prop.model].clone(true),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      if(size.y<=0)continue;
      model.scale.setScalar(Math.min(prop.height/size.y,.96/Math.max(size.x,size.z)));
      const box=new THREE.Box3().setFromObject(model);model.position.set(prop.x,("pedestal" in prop ? .48 : .055)-box.min.y,prop.z);
      model.traverse(object=>{if(!(object instanceof THREE.Mesh))return;object.castShadow=true;object.receiveShadow=true;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});
      scene.add(model);
      if("pedestal" in prop){
        const geometry=new THREE.BoxGeometry(.55,.42,.55);geometries.add(geometry);
        const material=mat(prop.room==="post"?"#55415E":"#3A6260");
        const stand=new THREE.Mesh(geometry,material);stand.name=`${prop.room}:large-planter-stand`;stand.position.set(prop.x,.27,prop.z);stand.castShadow=true;stand.receiveShadow=true;scene.add(stand);
      }
    }
    for(const prop of premiumPlantProps){
      const model=plantSources[prop.model].clone(true),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      if(size.y<=0)continue;
      model.scale.setScalar(Math.min(prop.height/size.y,.95/Math.max(size.x,size.z)));model.rotation.y=prop.rotation;
      const box=new THREE.Box3().setFromObject(model);model.position.set(prop.x,.065-box.min.y,prop.z);
      model.traverse(object=>{if(!(object instanceof THREE.Mesh))return;object.castShadow=true;object.receiveShadow=true;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});
      scene.add(model);
    }
    const coffee=coffeeMachine.scene.clone(true),coffeeSize=new THREE.Box3().setFromObject(coffee).getSize(new THREE.Vector3());
    if(coffeeSize.y>0){coffee.scale.setScalar(.48/coffeeSize.y);const box=new THREE.Box3().setFromObject(coffee);coffee.position.set(4.2,1.02-box.min.y,0);coffee.rotation.y=Math.PI;coffee.traverse(object=>{if(!(object instanceof THREE.Mesh))return;object.castShadow=true;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});scene.add(coffee);}
    const cupGeometry=new THREE.CylinderGeometry(.075,.06,.12,10);geometries.add(cupGeometry);
    const cupMaterial=mat("#F5EAD8");for(const x of [3.7,4.65]){const cup=new THREE.Mesh(cupGeometry,cupMaterial);cup.name="lounge-coffee-cup";cup.position.set(x,1.08,.2);cup.castShadow=true;scene.add(cup);}
  }catch(error){onStatus(`Houseplant model unavailable: ${String(error)}`);}
  const fixtureBoxes = officeBoxes();
  for (const fixture of fixtureBoxes) {
    const [,,,w,h,d,color,name] = fixture;
    if(name==="rear-wall"||name==="partition-wall"||name==="baseboard"||name==="wall-cap"||(!name&&h===.72&&d===.12))continue;
    if(furnitureReady && name && /^(lounge-sofa|sofa-back|sofa-cushion|sofa-pillow|lounge-table|desk:|seat:|seat-back:|ceo-desk|ceo-empty-chair|meeting-table|meeting-seat)/.test(name))continue;
    const key = [w,h,d,color,softEdge(name)].join("|");
    const batch = batches.get(key) ?? [];
    batch.push(fixture);
    batches.set(key,batch);
  }
  for (const batch of batches.values()) {
    const [,,,w,h,d,color,name] = batch[0]!;
    const geometry = softEdge(name) ? new RoundedBoxGeometry(w,h,d,1,.065) : new THREE.BoxGeometry(w,h,d);
    geometries.add(geometry);
    const roomId=name?.startsWith("room:")?name.slice(5):name?.startsWith("floor-inlay:")?name.slice(12):undefined;
    const displayColor=roomId&&roomFloors[roomId]?roomFloors[roomId]!:color;
    let material = fixtureMaterials.get(displayColor);
    if (!material) { material = mat(displayColor); fixtureMaterials.set(displayColor, material); }
    if(name==="floor-34x24" && material instanceof THREE.MeshStandardMaterial){material.map=woodTexture;material.color.set("#FFFFFF");material.needsUpdate=true;}
    const mesh = new THREE.InstancedMesh(geometry, material, batch.length);
    mesh.name = name ?? "Office furniture";
    const translation = new THREE.Matrix4();
    batch.forEach(([x,y,z],i)=>mesh.setMatrixAt(i,translation.makeTranslation(x,y,z)));
    mesh.castShadow=h>.1;
    mesh.receiveShadow=true;
    scene.add(mesh);
  }
  const glassMaterial=new THREE.MeshPhysicalMaterial({color:"#D5E9EA",transparent:true,opacity:.17,roughness:.11,metalness:.03,side:THREE.DoubleSide,depthWrite:false});
  materials.add(glassMaterial);
  const glassGeometry=new THREE.PlaneGeometry(.92,1.85);geometries.add(glassGeometry);
  const architectureGlass=new THREE.MeshPhysicalMaterial({color:"#DDEFF0",transparent:true,opacity:.16,roughness:.08,metalness:.08,side:THREE.DoubleSide,depthWrite:false});materials.add(architectureGlass);
  const edgeDoorGlass=new THREE.MeshPhysicalMaterial({color:"#B8D8D7",transparent:true,opacity:.3,roughness:.1,metalness:.08,side:THREE.DoubleSide,depthWrite:false});materials.add(edgeDoorGlass);
  const champagne=mat("#614535"),creamTrim=mat("#B38C68"),partitionTrim=mat("#624238");
  type StaticBox={name:string;x:number;y:number;z:number;w:number;h:number;d:number};
  const opaqueArchitecture=new Map<string,{material:THREE.Material;boxes:StaticBox[]}>();
  const architecturalBox=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material)=>{
    if(!material.transparent&&material.blending===THREE.NormalBlending&&material.depthWrite){
      // Spatial cells retain frustum culling in room focus; transparent glass
      // keeps its original per-panel ordering.
      const key=`${material.uuid}:${Math.floor((x+17)/8)}:${Math.floor((z+12)/8)}`;
      const group=opaqueArchitecture.get(key)??{material,boxes:[]};
      group.boxes.push({name,x,y,z,w,h,d});opaqueArchitecture.set(key,group);
      return;
    }
    const geometry=new THREE.BoxGeometry(w,h,d);geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;scene.add(mesh);
  };
  for(const door of doors){
    const leaf=new THREE.Mesh(glassGeometry,glassMaterial);
    leaf.position.set(door.center[0]+.46,.99,door.center[1]+(door.center[1]<0?-.48:.48));
    leaf.rotation.y=Math.PI/2.7;leaf.name=`glass-door:${door.room}`;scene.add(leaf);
  }
  // The full-height envelope is render-only: R3 collision fixtures and door gaps remain unchanged.
  for(const room of rooms){
    const door=doors.find(value=>value.room===room.id)!;
    const near=room.z[1]<0?room.z[1]:room.z[0];
    const far=room.z[1]<0?room.z[0]:room.z[1];
    const opening=[door.center[0]-door.width/2,door.center[0]+door.width/2] as const;
    const height=2.05;
    architecturalBox(`solid-back:${room.id}`,(room.x[0]+room.x[1])/2,height/2,far,room.x[1]-room.x[0],height,.12,creamTrim);
    for(const x of room.x){
      const depth=Math.abs(near-far);
      architecturalBox(`side-glass:${room.id}`,x,height/2,(near+far)/2,.035,height,depth,architectureGlass);
      // Shallow opaque sill and top beam establish each bay without covering seated agents.
      architecturalBox(`partition-sill:${room.id}`,x,.18,(near+far)/2,.19,.36,depth,partitionTrim);
      architecturalBox(`partition-beam:${room.id}`,x,height-.065,(near+far)/2,.19,.13,depth,partitionTrim);
      for(const y of [.06,height-.03])architecturalBox(`side-rail:${room.id}`,x,y,(near+far)/2,.08,.055,depth,champagne);
      for(const z of [near,far])architecturalBox(`side-post:${room.id}`,x,height/2,z,.19,height,.19,partitionTrim);
      architecturalBox(`side-mullion:${room.id}`,x,height/2,(near+far)/2,.12,height,.12,champagne);
    }
    for(const [left,right] of [[room.x[0]+.12,opening[0]],[opening[1],room.x[1]-.12]]){
      const width=right-left;if(width<.35)continue;
      const center=(left+right)/2;
      architecturalBox(`corridor-glass:${room.id}`,center,height/2,near,width,height,.025,architectureGlass);
      for(const y of [.07,height-.03])architecturalBox(`glass-rail:${room.id}`,center,y,near,width,.055,.075,champagne);
      for(const x of [left,right])architecturalBox(`glass-post:${room.id}`,x,height/2,near,.055,height,.075,champagne);
      if(width>3.5)architecturalBox(`glass-mullion:${room.id}`,center,height/2,near,.04,height,.075,champagne);
      architecturalBox(`glass-midrail:${room.id}`,center,.94,near,width,.025,.055,champagne);
    }
    for(const x of opening)architecturalBox(`door-jamb:${room.id}`,x,height/2,near,.065,height,.1,champagne);
    architecturalBox(`door-lintel:${room.id}`,door.center[0],height-.04,near,door.width+.07,.07,.1,champagne);
    architecturalBox(`door-handle:${room.id}`,door.center[0]+.1,1.0,near+(near<0?-.46:.46),.05,.26,.05,champagne);
    architecturalBox(`rear-crown:${room.id}`,(room.x[0]+room.x[1])/2,height-.05,far,room.x[1]-room.x[0]-.12,.1,.17,champagne);
    architecturalBox(`rear-base:${room.id}`,(room.x[0]+room.x[1])/2,.12,far,room.x[1]-room.x[0]-.12,.23,.17,champagne);
    for(const x of room.x)architecturalBox(`corner-column:${room.id}`,x,height/2,far,.18,height,.18,champagne);
  }
  // Render-only exterior ends of the two corridor spines; all R3 interior doors remain untouched.
  for(const door of corridorEdgeDoors){
    for(const [z0,z1] of [[-5,-door.width/2],[door.width/2,5]] as const){
      const center=(z0+z1)/2,depth=z1-z0;
      architecturalBox(`edge-glass:${door.id}`,door.x,door.height/2,center,.035,door.height,depth,architectureGlass);
      for(const y of [.07,door.height-.03])architecturalBox(`edge-rail:${door.id}`,door.x,y,center,.09,.06,depth,champagne);
      architecturalBox(`edge-mullion:${door.id}`,door.x,door.height/2,center,.095,door.height,.07,champagne);
    }
    architecturalBox(`edge-door-glass:${door.id}`,door.x,door.height/2,door.z,.045,door.height-.16,door.width-.1,edgeDoorGlass);
    for(const z of [-door.width/2,door.width/2])architecturalBox(`edge-door-jamb:${door.id}`,door.x,door.height/2,z,.12,door.height,.09,champagne);
    architecturalBox(`edge-door-lintel:${door.id}`,door.x,door.height-.035,door.z,.12,.08,door.width+.12,champagne);
    architecturalBox(`edge-door-pushbar:${door.id}`,door.x,1.08,door.z,.11,.055,door.width-.16,champagne);
    architecturalBox(`edge-door-kickplate:${door.id}`,door.x,.2,door.z,.055,.3,door.width-.14,champagne);
    architecturalBox(`edge-door-threshold:${door.id}`,door.x,.05,door.z,.22,.07,door.width+.08,champagne);
    architecturalBox(`edge-door-handle:${door.id}`,door.x+(door.x<0?.08:-.08),1.02,.45,.09,.29,.055,champagne);
  }
  const wallDisplay=(id:string,x:number,z:number,w:number,h:number,title:string,accent:string,board=false,side=false)=>{
    const canvas=document.createElement("canvas");canvas.width=768;canvas.height=320;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    ctx.fillStyle=board?"#6A5040":"#112033";ctx.fillRect(0,0,768,320);
    ctx.fillStyle=accent;ctx.fillRect(0,0,768,13);
    ctx.fillStyle=board?"#FFF2DC":"#EDF7FF";ctx.font="700 46px Arial, sans-serif";ctx.fillText(title,37,83,690);
    for(let i=0;i<4;i++){
      const px=36+i*178;ctx.fillStyle=board?["#D9A17D","#AAC1B0","#B4ABD2","#E4BF81"][i]!:"#213D59";
      ctx.fillRect(px,115,155,150);ctx.fillStyle=board?"#4A3B32":accent;ctx.fillRect(px+15,136,125,8);ctx.fillRect(px+15,158,90+i*7,6);
      if(board){ctx.fillStyle=["#F2D2A7","#E9E1C4","#DDD4EC","#F7E3BF"][i]!;ctx.fillRect(px+15,184,125,64);ctx.fillStyle=["#987061","#6F9389","#8E79A5","#B48B5C"][i]!;ctx.beginPath();ctx.arc(px+52,205,12+i*2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(px+17,246);ctx.lineTo(px+68,215);ctx.lineTo(px+112,246);ctx.fill();}
      if(!board){ctx.fillStyle="#36587D";ctx.fillRect(px+15,190,125,50);ctx.fillStyle=accent;ctx.fillRect(px+25,219,34+i*20,5);}
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
    const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide});materials.add(material);
    const geometry=new THREE.PlaneGeometry(w,h);geometries.add(geometry);
    const panel=new THREE.Mesh(geometry,material);panel.name=`feature-display:${id}`;scene.add(panel);
    const frameGeometry=new THREE.BoxGeometry(w+.13,h+.13,.06);geometries.add(frameGeometry);
    const frame=new THREE.Mesh(frameGeometry,champagne);frame.name=`feature-frame:${id}`;scene.add(frame);
    if(side){panel.position.set(x+.2,1.38,z);panel.rotation.y=Math.PI/2;frame.position.set(x+.16,1.38,z);frame.rotation.y=Math.PI/2;}
    else{panel.position.set(x,1.38,z+.018);frame.position.set(x,1.38,z-.025);}
  };
  wallDisplay("meeting",-12,-11.90,3.65,1.13,"PROJECT REVIEW","#F47DB5");
  wallDisplay("creative",-1,-11.90,4.2,1.12,"CREATIVE WALL","#FFC65E",true);
  wallDisplay("ai",11,-11.90,4.65,1.12,"AI PRODUCTION","#5BB9FF");
  // Decorative displays use illustrative titles only; no Paperclip task or approval data.
  wallDisplay("ceo",-17,10.05,2.25,1.08,"LOWTECH","#FF9C42",false,true);
  wallDisplay("pm",-11,10.05,2.25,1.08,"PROJECT PLAN","#A8DFFF",true,true);
  wallDisplay("post",-5,8.9,4.0,1.08,"EDIT SUITE","#B16AFF",false,true);
  wallDisplay("qa",7,8.9,4.0,1.08,"QUALITY CHECK","#36E1D2",false,true);
  // Illustrative rear-wall features: no live task, run or QA result is represented here.
  for(const [id,x,width,accent] of [["post",1,4.9,"#B16AFF"],["qa",12,4.2,"#36E1D2"]] as const){
    const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=384;
    const ctx=canvas.getContext("2d");if(!ctx)continue;
    ctx.fillStyle="#101827";ctx.fillRect(0,0,1024,384);
    ctx.fillStyle=accent;ctx.fillRect(0,0,1024,13);
    ctx.fillStyle="#EAF2FF";ctx.font="bold 42px Arial";ctx.fillText(id==="post"?"VIDEO PREVIEW · DEMO":"QA CHECKLIST · DEMO",35,62);
    if(id==="post"){
      const sky=ctx.createLinearGradient(0,95,0,265);sky.addColorStop(0,"#476DA3");sky.addColorStop(1,"#DA9B7B");ctx.fillStyle=sky;ctx.fillRect(36,88,600,185);
      ctx.fillStyle="#29374F";ctx.beginPath();ctx.moveTo(36,273);ctx.lineTo(210,150);ctx.lineTo(365,273);ctx.fill();
      ctx.fillStyle="#213047";ctx.beginPath();ctx.moveTo(220,273);ctx.lineTo(430,135);ctx.lineTo(636,273);ctx.fill();
      ctx.fillStyle="#D5DDEB";ctx.font="bold 90px Arial";ctx.fillText("▶",285,214);
      for(let i=0;i<4;i++){ctx.fillStyle=i%2?"#6373BB":"#B16AFF";ctx.fillRect(36+i*160,301,147,23);ctx.fillStyle="#5087A3";ctx.fillRect(36+i*160,334,110+i*9,17);}
      for(let i=0;i<3;i++){ctx.fillStyle="#22324D";ctx.fillRect(670,95+i*90,315,72);ctx.fillStyle=accent;ctx.fillRect(685,111+i*90,190+i*25,8);}
    }else{
      for(let i=0;i<4;i++){const y=87+i*69;ctx.fillStyle="#1D3341";ctx.fillRect(35,y,595,55);ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.strokeRect(52,y+12,28,28);ctx.beginPath();ctx.moveTo(57,y+25);ctx.lineTo(66,y+34);ctx.lineTo(82,y+16);ctx.stroke();ctx.fillStyle="#BCD9DC";ctx.fillRect(104,y+22,255+i*34,9);}
      for(let i=0;i<3;i++){ctx.fillStyle="#1C4853";ctx.fillRect(665,90+i*90,314,68);ctx.fillStyle=accent;ctx.fillRect(690,108+i*90,180+i*30,11);ctx.fillRect(690,132+i*90,110+i*35,7);}
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
    const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide});materials.add(material);
    architecturalBox(`${id}:rear-preview-frame`,x,1.19,11.81,width+.18,1.43,.13,champagne);
    const geometry=new THREE.PlaneGeometry(width,1.32);geometries.add(geometry);
    const display=new THREE.Mesh(geometry,material);display.name=`${id}:rear-preview`;display.position.set(x,1.19,11.73);display.rotation.y=Math.PI;scene.add(display);
    const trim=new THREE.MeshBasicMaterial({color:accent,toneMapped:false});materials.add(trim);
    architecturalBox(`${id}:rear-preview-led`,x,.46,11.67,width+.2,.055,.12,trim);
    for(const side of [-1,1]){
      const sx=x+side*(width/2+1.05);
      const cabinet=mat(id==="post"?"#352A48":"#21434A");
      architecturalBox(`${id}:rear-gear-cabinet`,sx,1.03,11.69,1.45,1.7,.34,cabinet);
      for(const y of [.52,.83,1.14,1.45]){
        architecturalBox(`${id}:rear-shelf`,sx,y,11.47,1.34,.055,.43,champagne);
        architecturalBox(`${id}:rear-shelf-led`,sx,y-.045,11.42,1.24,.025,.045,trim);
      }
      for(let i=0;i<3;i++)architecturalBox(`${id}:gear`,sx-.4+i*.4,.66+(i%2)*.32,11.37,.25,.2,.13,mat(id==="post"?"#8E7CAD":"#6DA9A6"));
    }
  }
  for(const [id,x,z,w,color] of [["meeting",-12,-11.84,3.65,"#F47DB5"],["creative",-1,-11.84,4.2,"#FFC65E"],["ai",11,-11.84,4.65,"#5BB9FF"]] as const){
    const displayGlow=new THREE.MeshBasicMaterial({color,toneMapped:false});materials.add(displayGlow);
    architecturalBox(`display-underlight:${id}`,x,.78,z,w,.035,.07,displayGlow);
    const light=new THREE.PointLight(color,id==="meeting"?5:8,4.5,2);light.position.set(x,1.42,-10.9);light.castShadow=false;scene.add(light);
  }
  const rackFace=new THREE.MeshStandardMaterial({color:"#22313A",metalness:.36,roughness:.55});materials.add(rackFace);
  const rackIndicators=new THREE.MeshBasicMaterial({color:"#68C5FF",toneMapped:false});materials.add(rackIndicators);
  architecturalBox("ai-server-rack-face",5.75,1.03,-10.67,.72,1.5,.055,rackFace);
  for(const y of [.47,.67,.87,1.07,1.27,1.47]){
    architecturalBox("ai-server-module",5.75,y,-10.625,.61,.09,.035,champagne);
    architecturalBox("ai-server-indicator",5.52,y,-10.595,.045,.035,.02,rackIndicators);
  }
  for(const station of workstations.filter(value=>value.room==="ai")){
    architecturalBox(`ai-second-monitor:${station.id}`,station.seed[0]-.43,.76,-8.28,.36,.32,.035,rackFace);
    architecturalBox(`ai-second-screen:${station.id}`,station.seed[0]-.43,.77,-8.253,.3,.25,.012,rackIndicators);
  }
  const editScreen=new THREE.MeshBasicMaterial({color:"#A86BFF",toneMapped:false});materials.add(editScreen);
  const qaScreen=new THREE.MeshBasicMaterial({color:"#38D9D0",toneMapped:false});materials.add(qaScreen);
  for(const station of workstations.filter(value=>value.room==="post"||value.room==="qa")){
    const x=station.seed[0]+.43,z=8.28,color=station.room==="post"?editScreen:qaScreen;
    architecturalBox(`second-monitor:${station.id}`,x,.76,z,.38,.32,.045,rackFace);
    architecturalBox(`second-screen:${station.id}`,x,.77,z-.025,.32,.25,.012,color);
  }
  const edgeGlow=new THREE.MeshBasicMaterial({color:"#FF671C",toneMapped:false});materials.add(edgeGlow);
  const edgeX=new THREE.BoxGeometry(34.25,.05,.055),edgeZ=new THREE.BoxGeometry(.055,.05,24.25);
  geometries.add(edgeX);geometries.add(edgeZ);
  for(const z of [-12.14,12.14]){const line=new THREE.Mesh(edgeX,edgeGlow);line.position.set(0,-.13,z);scene.add(line);}
  for(const x of [-17.14,17.14]){const line=new THREE.Mesh(edgeZ,edgeGlow);line.position.set(x,-.13,0);scene.add(line);}
  const ledGeometry=new THREE.BoxGeometry(1,.075,.075);geometries.add(ledGeometry);
  const haloGeometry=new THREE.BoxGeometry(1,.43,.36);geometries.add(haloGeometry);
  const ledStrips:THREE.Object3D[]=[];
  const ledLights:THREE.Light[]=[];
  const ledStrip=(name:string,x:number,y:number,z:number,length:number,color:string,axis:"x"|"z"="x",strength=1)=>{
    const core=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(strength),toneMapped:false});materials.add(core);
    const halo=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.43*strength,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(halo);
    for(const [geometry,material] of [[haloGeometry,halo],[ledGeometry,core]] as const){const line=new THREE.Mesh(geometry,material);line.name=`led:${name}`;line.position.set(x,y,z);if(axis==="x")line.scale.x=length;else{line.rotation.y=Math.PI/2;line.scale.x=length;}scene.add(line);ledStrips.push(line);}
  };
  const labelLayer=document.createElement("div");labelLayer.className="office-room-label-layer";
  Object.assign(labelLayer.style,{position:"absolute",inset:"0",pointerEvents:"none",overflow:"hidden",zIndex:"2"});host.appendChild(labelLayer);
  const labelIcons:Record<string,string>={meeting:"◉",creative:"✦",ai:"⌘",post:"▣",qa:"✓",pm:"▤",ceo:"♛",lounge:"☕"};
  const labelColors:Record<string,string>={meeting:"#F47DB5",creative:"#FFC65E",ai:"#5BB9FF",post:"#B78BEE",qa:"#67D5C7",pm:"#B9D6E8",ceo:"#FFB65F",lounge:"#FFE0A1"};
  type RoomLabel={element:HTMLDivElement;count:HTMLDivElement;anchor:THREE.Vector3;value:number};
  const badges=new Map<string,RoomLabel>();
  for(const room of [...rooms,{...lounge,id:"lounge",label:"Lounge",color:"#EAB97A"}]){
    const color=labelColors[room.id]??room.color;
    const element=document.createElement("div");element.dataset.roomId=room.id;element.setAttribute("role","note");
    Object.assign(element.style,{position:"absolute",boxSizing:"border-box",width:"206px",height:"62px",padding:"7px 11px",borderRadius:"15px",border:`2px solid ${color}`,background:"#080A0E",color:"#FFFFFF",fontFamily:"Arial, Helvetica, sans-serif",boxShadow:`0 0 6px ${color}, 0 0 20px ${color}88`,display:"flex",alignItems:"center",gap:"10px",whiteSpace:"nowrap",willChange:"transform"});
    const icon=document.createElement("span");icon.textContent=labelIcons[room.id]??"•";icon.setAttribute("aria-hidden","true");Object.assign(icon.style,{fontSize:"24px",fontWeight:"700",lineHeight:"1",color,flex:"0 0 27px",textAlign:"center"});
    const text=document.createElement("div");Object.assign(text.style,{minWidth:"0",lineHeight:"1.15"});
    const title=document.createElement("div");title.textContent=room.label;Object.assign(title.style,{fontSize:"15px",fontWeight:"800",overflow:"hidden",textOverflow:"ellipsis"});
    const count=document.createElement("div");Object.assign(count.style,{fontSize:"12px",fontWeight:"600",color:"#DCE3EA",marginTop:"4px"});
    text.append(title,count);element.append(icon,text);labelLayer.appendChild(element);
    const back=room.id==="lounge"?-2:room.z[1]<0?room.z[0]:room.z[1];
    badges.set(room.id,{element,count,anchor:new THREE.Vector3((room.x[0]+room.x[1])/2,2.45,back),value:-1});
  }
  function paintBadge(id:string,count:number){
    const badge=badges.get(id);if(!badge||badge.value===count)return;badge.value=count;
    badge.count.textContent=`${count} agent${count===1?"":"s"}`;
    badge.element.setAttribute("aria-label",`${id}: ${badge.count.textContent}`);
    badge.element.dataset.agentCount=String(count);
  }
  let focusedRoom="overview";
  const projected=new THREE.Vector3();
  const overlaps=(a:{x:number;y:number;w:number;h:number},b:{x:number;y:number;w:number;h:number})=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  function positionLabels(){
    if(!actorsReady||!labelsVisible||!labelsDirty)return;
    const width=host.clientWidth,height=host.clientHeight;
    const reserved:{x:number;y:number;w:number;h:number}[]=[];
    const hostRect=host.getBoundingClientRect();
    const leftLimit=Math.max(host.closest(".lowtech-present")?230:8,8-hostRect.left);
    const rightLimit=Math.min(width-8,window.innerWidth-hostRect.left-8);
    const topLimit=Math.max(54,8-hostRect.top),bottomLimit=Math.min(height-8,window.innerHeight-hostRect.top-8);
    for(const actor of actors.values()){
      projected.set(actor.root.position.x,1.05,actor.root.position.z).project(camera);
      if(projected.z<1)reserved.push({x:(projected.x+1)*width/2-28,y:(1-projected.y)*height/2-43,w:56,h:86});
    }
    const ordered=focusedRoom==="overview"?[...badges]:[...badges].filter(([id])=>id===focusedRoom);
    for(const badge of badges.values())badge.element.style.display="none";
    for(const [,badge] of ordered){
      projected.copy(badge.anchor).project(camera);
      if(projected.z>=1){badge.element.style.display="none";continue;}
      const centerX=(projected.x+1)*width/2,top=(1-projected.y)*height/2;
      const candidates=[[0,-92],[-110,-98],[110,-98],[0,-168],[-155,-160],[155,-160],[0,-236],[0,-22],[-110,-22],[110,-22]];
      let placed=false;
      for(const [dx,dy] of candidates){
        const box={x:Math.round(centerX-103+dx),y:Math.round(top+dy),w:206,h:62};
        if(box.x<leftLimit||box.x+box.w>rightLimit||box.y<topLimit||box.y+box.h>bottomLimit||reserved.some(other=>overlaps(box,other)))continue;
        badge.element.style.display="flex";badge.element.style.transform=`translate3d(${box.x}px,${box.y}px,0)`;
        reserved.push(box);placed=true;break;
      }
      if(!placed){
        for(const y of [74,145,220]){
          if(placed)break;
          for(const dx of [0,-220,220,-440,440]){
            const box={x:Math.max(leftLimit,Math.min(rightLimit-206,Math.round(centerX-103+dx))),y,w:206,h:62};
            if(box.x+box.w>rightLimit||box.y<topLimit||box.y+box.h>bottomLimit||reserved.some(other=>overlaps(box,other)))continue;
            badge.element.style.display="flex";badge.element.style.transform=`translate3d(${box.x}px,${box.y}px,0)`;reserved.push(box);placed=true;break;
          }
        }
      }
    }
    labelsDirty=false;
  }
  labelsReady=true;
  const viewportLabels=()=>{labelsDirty=true;positionLabels();};
  window.addEventListener("resize",viewportLabels);
  window.addEventListener("scroll",viewportLabels,true);
  for(const room of rooms){
    const color=roomLights[room.id]!;
    const width=room.x[1]-room.x[0]-.3,x=(room.x[0]+room.x[1])/2;
    const near=room.z[1]<0?room.z[1]:room.z[0];
    const far=room.z[1]<0?room.z[0]:room.z[1];
    for(const z of [near,far]){
      ledStrip(`${room.id}:crown`,x,1.93,z+(z<0?.14:-.14),width,color);
      ledStrip(`${room.id}:base`,x,.15,z+(z<0?.14:-.14),width,color);
    }
    for(const xEdge of room.x)ledStrip(`${room.id}:side`,xEdge+(xEdge<x?.14:-.14),1.93,(near+far)/2,Math.abs(near-far)-.3,color,"z");
    const bounce=new THREE.PointLight(color,room.id==="meeting"?10:room.id==="creative"?13:room.id==="ai"?15:12,7,2);bounce.position.set(x,1.6,(far+near)/2);bounce.castShadow=false;scene.add(bounce);ledLights.push(bounce);
  }
  for(const [id,x,width] of [["ceo",-14,4.9],["pm",-8,4.9],["post",1,10.7],["qa",12,8.7]] as const){
    const color=roomLights[id]!;
    ledStrip(`${id}:shelf-wash`,x,1.02,11.69,width,color);
    const lamp=new THREE.PointLight(color,3.2,3.1,2);lamp.position.set(x,1.34,10.5);lamp.castShadow=false;scene.add(lamp);ledLights.push(lamp);
  }
  for(const [id,x,z] of [["post",-4.15,6.35],["qa",10,7]] as const){
    const color=roomLights[id]!;
    ledStrip(`${id}:media-console`,x,.27,z+(id==="post"?.5:.53),id==="post"?1.75:2.05,color,id==="post"?"z":"x");
    const geometry=new THREE.PlaneGeometry(3.8,2.4);geometries.add(geometry);
    const material=new THREE.MeshBasicMaterial({map:spillTexture,color,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(material);
    const pool=new THREE.Mesh(geometry,material);pool.name=`${id}:media-console-spill`;pool.rotation.x=-Math.PI/2;pool.position.set(x,.06,z);pool.renderOrder=1;scene.add(pool);
  }
  ledStrip("lounge:warm",0,.16,-2,9.5,"#FFD598");
  for(const z of [-3.5,3.5])ledStrip("corridor:warm",0,.15,z,33.6,"#FFD598");
  for(const z of [-12.14,12.14])ledStrip("plinth",0,.01,z,34.25,"#FF671C","x",.48);
  for(const x of [-17.14,17.14])ledStrip("plinth",x,.01,0,24.25,"#FF671C","z",.48);
  for(const z of [-12.94,12.94])ledStrip("plinth:outer",0,-.045,z,35.88,"#FF6818","x",.48);
  for(const x of [-17.94,17.94])ledStrip("plinth:outer",x,-.045,0,25.88,"#FF6818","z",.48);
  const ledEnabled=new URLSearchParams(window.location.search).get("officeLed")==="off"?false:true;
  if(!ledEnabled){for(const item of ledStrips)item.visible=false;for(const light of ledLights)light.visible=false;for(const spill of spillMeshes)spill.visible=false;}
  const runnerGeometry=new THREE.PlaneGeometry(5.8,1.05);geometries.add(runnerGeometry);
  const runnerMaterial=new THREE.MeshStandardMaterial({color:"#D9BDA4",transparent:true,opacity:.56,roughness:1,depthWrite:false});materials.add(runnerMaterial);
  for(const x of [-10,10])for(const z of [-3.5,3.5]){
    const runner=new THREE.Mesh(runnerGeometry,runnerMaterial);
    runner.rotation.x=-Math.PI/2;runner.position.set(x,.10,z);runner.receiveShadow=true;
    runner.name="corridor-runner";scene.add(runner);
  }
  const sconcePositions=[[-15,-4.87],[-9,-4.87],[7,-4.87],[15,-4.87],[-16,4.87],[-10,4.87],[-3,4.87],[7,4.87]] as const;
  const sconceGeometry=new RoundedBoxGeometry(.27,.35,.12,3,.055);geometries.add(sconceGeometry);
  const sconceMaterial=new THREE.MeshStandardMaterial({color:"#FFF1D2",emissive:"#FFAD58",emissiveIntensity:2.35,roughness:.38});materials.add(sconceMaterial);
  const sconcePlate=mat("#80644D");
  const washGeometry=new THREE.PlaneGeometry(.72,.78);geometries.add(washGeometry);
  const washMaterial=new THREE.MeshBasicMaterial({map:spillTexture,color:"#FFC57F",transparent:true,opacity:.56,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});materials.add(washMaterial);
  const floorPoolGeometry=new THREE.PlaneGeometry(1.95,1.35);geometries.add(floorPoolGeometry);
  const floorPoolMaterial=new THREE.MeshBasicMaterial({map:spillTexture,color:"#FFB66D",transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(floorPoolMaterial);
  for(const [x,z] of sconcePositions){
    architecturalBox("corridor-sconce-back",x,1.25,z,.62,.91,.075,sconcePlate);
    const sconce=new THREE.Mesh(sconceGeometry,sconceMaterial);sconce.position.set(x,1.25,z+(z<0?.09:-.09));sconce.name="corridor-sconce";scene.add(sconce);
    for(const y of [.76,1.74]){const wash=new THREE.Mesh(washGeometry,washMaterial);wash.position.set(x,y,z+(z<0?.14:-.14));wash.name="corridor-sconce-wall-wash";scene.add(wash);}
    const pool=new THREE.Mesh(floorPoolGeometry,floorPoolMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(x,.112,z+(z<0?.45:-.45));pool.name="corridor-sconce-floor-spill";pool.renderOrder=1;scene.add(pool);
  }
  for(const [x,z] of [[-9,-4.45],[7,-4.45],[-10,4.45],[7,4.45]] as const){
    const light=new THREE.PointLight(0xffc58b,3.2,3.6,2);light.position.set(x,1.36,z);light.castShadow=false;scene.add(light);
  }
  // A few local lights illuminate actual surfaces; the remaining sconces use emissive materials.
  for(const [x,z,power] of [[-12,-4.5,10],[11,-4.5,10],[-14,4.5,10],[12,4.5,10],[0,0,18]] as const){
    const light=new THREE.PointLight(0xffd49a,power,5,2);
    light.position.set(x,1.65,z);light.castShadow=false;scene.add(light);
  }
  const wallWash=new THREE.MeshStandardMaterial({color:"#FFF0CD",emissive:"#FFD18B",emissiveIntensity:1.7,roughness:.6});materials.add(wallWash);
  for(const room of rooms){
    const far=room.z[1]<0?room.z[0]:room.z[1],near=room.z[1]<0?room.z[1]:room.z[0];
    for(const x of [room.x[0]+.72,room.x[1]-.72]){
      architecturalBox(`wall-washer:${room.id}`,x,far<0?1.55:.6,far+(far<0?.09:-.09),.32,.09,.14,wallWash);
    }
    architecturalBox(`base-light:${room.id}`,(room.x[0]+room.x[1])/2,.18,near,room.x[1]-room.x[0]-.25,.035,.04,wallWash);
  }
  for(const x of [-4.2,4.2])architecturalBox("lounge-floor-lamp",x,1.42,0,.13,.12,.13,wallWash);
  const loungeRugGeometry=new THREE.CircleGeometry(1,48);
  geometries.add(loungeRugGeometry);
  const loungeRug=new THREE.Mesh(loungeRugGeometry,mat("#D7B894"));
  loungeRug.rotation.x=-Math.PI/2;loungeRug.scale.set(4.4,1.65,1);loungeRug.position.y=.078;
  loungeRug.receiveShadow=true;scene.add(loungeRug);
  const logoPanelMaterial=new THREE.MeshStandardMaterial({color:"#3A241B",roughness:.55,metalness:.12});materials.add(logoPanelMaterial);
  architecturalBox("lounge-lowtech-sign",0,1.55,-1.92,4.5,.85,.12,logoPanelMaterial);
  const logoCanvas=document.createElement("canvas");logoCanvas.width=1024;logoCanvas.height=256;
  const logoContext=logoCanvas.getContext("2d");
  if(logoContext){
    logoContext.clearRect(0,0,1024,256);logoContext.textAlign="center";logoContext.textBaseline="middle";
    logoContext.font="bold 144px Arial, sans-serif";logoContext.shadowColor="#FF9F3F";logoContext.shadowBlur=30;logoContext.fillStyle="#FFB864";
    logoContext.fillText("▷ LowTech",512,132);logoContext.shadowBlur=0;logoContext.fillStyle="#FFF0C3";logoContext.fillText("▷ LowTech",512,132);
  }
  const logoTexture=new THREE.CanvasTexture(logoCanvas);logoTexture.colorSpace=THREE.SRGBColorSpace;textures.add(logoTexture);
  const logoHaloMaterial=new THREE.MeshBasicMaterial({map:logoTexture,color:"#FF9040",transparent:true,opacity:.58,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(logoHaloMaterial);
  const logoHaloGeometry=new THREE.PlaneGeometry(4.48,.98);geometries.add(logoHaloGeometry);
  const logoHalo=new THREE.Mesh(logoHaloGeometry,logoHaloMaterial);logoHalo.name="LowTech sign glow";logoHalo.position.set(0,1.55,-1.85);logoHalo.renderOrder=1;scene.add(logoHalo);
  const logoMaterial=new THREE.MeshBasicMaterial({map:logoTexture,transparent:true,depthWrite:false,toneMapped:false});materials.add(logoMaterial);
  const logoGeometry=new THREE.PlaneGeometry(4.25,.85);geometries.add(logoGeometry);
  const logo=new THREE.Mesh(logoGeometry,logoMaterial);logo.name="LowTech LED sign";logo.position.set(0,1.55,-1.83);logo.renderOrder=2;scene.add(logo);
  const logoBackHalo=new THREE.Mesh(logoHaloGeometry,logoHaloMaterial);logoBackHalo.name="LowTech sign reverse glow";logoBackHalo.position.set(0,1.55,-2.01);logoBackHalo.rotation.y=Math.PI;logoBackHalo.renderOrder=1;scene.add(logoBackHalo);
  const logoBack=new THREE.Mesh(logoGeometry,logoMaterial);logoBack.name="LowTech LED sign reverse";logoBack.position.set(0,1.55,-2.02);logoBack.rotation.y=Math.PI;logoBack.renderOrder=2;scene.add(logoBack);
  const signBackLight=new THREE.PointLight(0xffad62,4.5,3.4,2);signBackLight.position.set(0,1.4,-2.34);signBackLight.castShadow=false;scene.add(signBackLight);
  for(const [x,z,power] of [[0,-1.45,5],[-11.3,-2.1,3.2],[11.7,2.1,3.2]] as const){
    const light=new THREE.PointLight(0xffad62,power,4.5,2);light.position.set(x,1.35,z);light.castShadow=false;scene.add(light);
    const geometry=new THREE.PlaneGeometry(3.8,2.7);geometries.add(geometry);
    const material=new THREE.MeshBasicMaterial({map:spillTexture,color:"#FFAF65",transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.add(material);
    const pool=new THREE.Mesh(geometry,material);pool.name="corridor-lounge-light-pool";pool.rotation.x=-Math.PI/2;pool.position.set(x,x===0?.072:.105,z);pool.renderOrder=1;scene.add(pool);
  }
  for (const [x,z] of plantLocations) {
    const geometry = new THREE.IcosahedronGeometry(.37,1);
    geometries.add(geometry);
    const plant = new THREE.Mesh(geometry,mat("#72AA7C"));
    plant.position.set(x,.87,z);
    plant.scale.set(.86,1.2,.86);
    plant.castShadow=true;
    scene.add(plant);
    for(let i=0;i<5;i++){
      const leafGeometry=new THREE.SphereGeometry(.23,6,4);geometries.add(leafGeometry);
      const leaf=new THREE.Mesh(leafGeometry,mat(i%2?"#699B6D":"#86AF78"));
      const angle=i*Math.PI*2/5;
      leaf.position.set(x+Math.sin(angle)*.17,1.12+(.06*(i%2)),z+Math.cos(angle)*.17);
      leaf.scale.set(.55,1.15,.7);leaf.rotation.z=Math.sin(angle)*.55;
      leaf.castShadow=true;scene.add(leaf);
    }
  }
  const folderGeometry = new THREE.BoxGeometry(.39,.055,.24);
  geometries.add(folderGeometry);
  const folder = new THREE.Mesh(folderGeometry,mat("#CC9154"));
  folder.position.set(-14,.68,9.1);
  folder.visible=false;
  scene.add(folder);
  const delivered = new Set<string>();
  const trayKey = `vpd-office:tray:${companyId}`;
  let restoredTray = false;
  let pendingApprovals: ReadonlySet<string> | undefined;
  function updateTray() {
    folder.visible = delivered.size>0;
    folder.scale.y = Math.min(delivered.size,4);
    folder.position.y = .655 + folder.scale.y * .055 / 2;
    renderer.domElement.dataset.ceoTrayCount = String(delivered.size);
    try { sessionStorage.setItem(trayKey, JSON.stringify([...delivered])); } catch { /* Private browsing can disable storage. */ }
  }
  const unitBox=new THREE.BoxGeometry(1,1,1);geometries.add(unitBox);
  const instanceTransform=new THREE.Matrix4(),instancePosition=new THREE.Vector3(),instanceScale=new THREE.Vector3();
  const noRotation=new THREE.Quaternion();
  for(const group of opaqueArchitecture.values()){
    const mesh=new THREE.InstancedMesh(unitBox,group.material,group.boxes.length);
    group.boxes.forEach(({x,y,z,w,h,d},index)=>{
      instanceTransform.compose(instancePosition.set(x,y,z),noRotation,instanceScale.set(w,h,d));
      mesh.setMatrixAt(index,instanceTransform);
    });
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.computeBoundingSphere();
    mesh.matrixAutoUpdate=false;
    mesh.name=`architecture:${group.boxes[0]!.name}`;
    mesh.receiveShadow=true;
    scene.add(mesh);
  }
  let gltf:Awaited<ReturnType<GLTFLoader["loadAsync"]>>;
  try{gltf=await new GLTFLoader().loadAsync(assetUrl);}catch(error){observer.disconnect();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.domElement.remove();throw error;}
  gltf.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for(const material of Array.isArray(object.material)?object.material:[object.material]) materials.add(material);
  });
  const clips=new Map(gltf.animations.map(c=>[c.name,c]));
  if(!gltf.scene.getObjectByProperty("type","SkinnedMesh")||!clips.has("walk")||!clips.has("typing")){
    observer.disconnect();
    for(const geometry of geometries) geometry.dispose();
    for(const material of materials) material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    throw new Error("Base rig or clips unavailable");
  }
  onStatus(`Office rig loaded: ${clips.size} clips`);
  const vinishBase=assetUrl.replace(/office-base-rig\.glb(?:\?.*)?$/, "vinish/");
  const vinish=await Promise.all(vinishModels.map(async name=>{
    try { const model=await new GLTFLoader().loadAsync(`${vinishBase}${name}.glb`);vinishClips(model.scene,model.animations);if(name==="businessman-with-briefcase" && !compactYanBriefcase(model.scene))throw new Error("Yan briefcase material groups unavailable");return model; }
    catch(error){console.warn(`Vinish avatar ${name} unavailable; using Office fallback`,error);return null;}
  }));
  type Actor={root:THREE.Object3D;mixer:THREE.AnimationMixer;actions:Map<string,THREE.AnimationAction>;ring:THREE.Mesh;cup?:THREE.Mesh;vinish:boolean;dispose:()=>void;visual:ActorVisual;path:Point[]|null;index:number;returning:boolean;journey:"ceo"|"handoff"|"rest"|"meeting"|null;dwell:number;idleSince:number|null;pending?:{kind:NonNullable<ActorVisual["journey"]>;recipientDesk?:string;key:string};approvalKey?:string;handoffDesk?:string;meetingId?:string;parked:boolean;clip:string|null;retryAt?:number;walkBlend?:number;restNode?:string;roamFrom?:string;roamTo?:string;restCycle?:number;restNextAt?:number;seatTransition?:{from:Point;to:Point;elapsed:number};oneShotUntil?:number;oneShotNext?:string;acknowledged?:boolean};
  const actors=new Map<string,Actor>();actorsReady=true;let disposed=false;
  const traffic = createRouteTraffic();
  const cupGeometry=new THREE.CylinderGeometry(.055,.047,.09,10),cupMaterial=new THREE.MeshStandardMaterial({color:"#F7E9D5",roughness:.42});
  geometries.add(cupGeometry);materials.add(cupMaterial);
  function play(a:Actor,name:string){const next=a.actions.get(name)??a.actions.get("idle_stand");if(!next||a.clip===name)return;a.clip=name;if(a.cup)a.cup.visible=name==="drink_coffee";for(const action of a.actions.values())if(action!==next)action.fadeOut(.2);next.reset().fadeIn(.2).play();}
  function playOnce(a:Actor,name:string,next:string,now:number){const action=a.actions.get(name);if(!action){play(a,next);return;}play(a,name);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;a.oneShotUntil=now+action.getClip().duration*1000;a.oneShotNext=next;}
  function add(v:ActorVisual){const station=workstations.find(w=>w.id===v.deskId)!,variant=workstations.indexOf(station),model=vinish[variant],root=cloneSkeleton(model?.scene??gltf.scene);root.position.set(station.seed[0],.03,station.seed[1]);root.userData.agentId=v.id;
    const avatar=model?null:styleAvatar(root,station.color,variant,station.id);
    if(model){root.scale.set(.78,1,.78);root.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}});}
    const ringGeometry=new THREE.RingGeometry(.4,.49,16);const ringMaterial=new THREE.MeshBasicMaterial({color:"#9AA3AD",side:THREE.DoubleSide});const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.04;root.add(ring);
    const hand=model?root.getObjectByName("Hand_R"):null;
    const cup=hand?new THREE.Mesh(cupGeometry,cupMaterial):undefined;
    if(cup){cup.position.set(0,.045,0);cup.visible=false;hand!.add(cup);}
    scene.add(root);
    const mixer=new THREE.AnimationMixer(root),actions=new Map<string,THREE.AnimationAction>();
    for(const [name,clip]of model?vinishClips(root,model.animations):clips)actions.set(name,mixer.clipAction(clip));
    const dispose = () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      const skeletons = new Set<THREE.Skeleton>();
      root.traverse(object => { if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton); });
      skeletons.forEach(skeleton => skeleton.dispose());
      avatar?.geometry.forEach(geometry=>geometry.dispose());
      avatar?.materials.forEach(material=>material.dispose());
      ringGeometry.dispose(); ringMaterial.dispose();
      root.removeFromParent();
    };
    const a:Actor={root,mixer,actions,ring,cup:cup??avatar?.cup,vinish:!!model,dispose,visual:v,path:null,index:0,returning:false,journey:null,dwell:0,idleSince:null,parked:false,clip:null};
    actors.set(v.id,a);play(a,"idle_stand");return a;}
  function atDesk(a: Actor) {
    a.root.rotation.y = a.root.position.z > 0 ? Math.PI : 0;
    play(a, a.visual.state === "working" ? "typing" : "sit_idle");
  }

  function depart(a: Actor, journey: NonNullable<Actor["journey"]>, recipientDesk?: string) {
    const destination = journey === "rest" ? `rest:${a.visual.deskId}`
      : journey === "ceo" ? "target:ceo-tray"
      : journey === "meeting" ? `meeting:seat:${a.visual.meeting?.seat}` : `lane:${recipientDesk}:rear`;
    const path = route(`desk:${a.visual.deskId}`, destination);
    if (!path || !traffic.reserve(a.visual.id, path)) return false;
    a.path = path;
    a.restNode = journey === "rest" ? destination : undefined;
    a.roamFrom = undefined;a.roamTo = undefined;a.restCycle = 0;
    a.acknowledged=false;
    a.index = 1;
    a.journey = journey;
    a.meetingId = journey==="meeting"?a.visual.meeting?.id:undefined;
    a.handoffDesk=journey==="handoff"?recipientDesk:undefined;
    a.idleSince = null;
    a.walkBlend = a.actions.has("stand_up") ? .8 : .2;
    playOnce(a,"stand_up","walk",performance.now());
    onMotion?.(a.visual.id, journey === "rest" ? "Walking to lounge" : journey === "ceo" ? "Delivering approval" : journey === "meeting" ? "Walking to meeting" : "Delivering handoff");
    return true;
  }

  function returnToDesk(a: Actor) {
    if (!a.path || a.returning) return;
    // A roaming agent returns through its current Lounge node, then the validated office route.
    const sofa=loungeActivities.find(item=>item.id===a.restNode&&item.kind==="sofa");
    const path = a.journey === "rest" && a.restNode && (a.parked || a.roamFrom)
      ? a.roamTo && a.roamFrom
        ? [...reverseTraversedRoute(a.path,a.index), ...route(a.roamFrom,`desk:${a.visual.deskId}`)?.slice(1) ?? []]
        : route(sofa?.from??a.restNode,`desk:${a.visual.deskId}`)
      : reverseTraversedRoute(a.path, a.index);
    if (!path) return;
    if (!traffic.occupy(a.visual.id, [[a.root.position.x, a.root.position.z], ...path])) return;
    if(sofa && a.parked)a.seatTransition={from:[a.root.position.x,a.root.position.z],to:path[0]!,elapsed:0};
    a.path = path;
    a.index = 0;
    if (a.parked) a.walkBlend = a.actions.has("stand_up") && (sofa||["rest","sit_idle","talk"].includes(a.clip??"")) ? .8 : .2;
    a.parked = false;
    a.dwell = 0;
    a.returning = true;
    a.roamTo=undefined;a.roamFrom=undefined;
    if(a.walkBlend && a.walkBlend>.2)playOnce(a,"stand_up","walk",performance.now());else play(a,"walk");
    onMotion?.(a.visual.id, "Returning to workstation");
  }

  function update(visuals: ActorVisual[], approvals?: ReadonlySet<string>) {
    const counts=new Map<string,number>();for(const room of rooms)counts.set(room.id,0);
    let resting=0;
    for(const visual of visuals){const station=workstations.find(w=>w.id===visual.deskId);if(station)counts.set(station.room,(counts.get(station.room)??0)+1);}
    for(const actor of actors.values())if(actor.journey==="rest"&&actor.parked)resting++;
    for(const room of rooms)paintBadge(room.id,counts.get(room.id)??0);
    paintBadge("lounge",resting);
    pendingApprovals = approvals;
    if (approvals) {
      if (!restoredTray) {
        restoredTray = true;
        try {
          const saved: unknown = JSON.parse(sessionStorage.getItem(trayKey) ?? "[]");
          if(Array.isArray(saved)) for (const id of saved) if (typeof id==="string" && approvals.has(id)) delivered.add(id);
        } catch { /* The live snapshot remains authoritative. */ }
      }
      for (const id of delivered) if (!approvals.has(id)) delivered.delete(id);
      updateTray();
    }
    const ids = new Set(visuals.map(v => v.id));
    for (const [id,a] of actors) {
      if (ids.has(id)) continue;
      a.dispose();
      actors.delete(id);
      traffic.release(id);
    }
    for (const v of visuals) {
      if (!workstations.some(w => w.id === v.deskId)) continue;
      const previousKey = actors.get(v.id)?.visual.journeyKey;
      const previousState = actors.get(v.id)?.visual.state;
      const a = actors.get(v.id) ?? add(v);
      a.visual = v;
      (a.ring.material as THREE.MeshBasicMaterial).color.set({
        working:palette.mint,error:"#D36B65",paused:palette.amber,stale:"#A8A2A0",unknown:"#9AA3AD",idle:"#A9C49B",
      }[v.state]);
      if (v.journey && v.journeyKey && v.journeyKey !== previousKey && (!a.pending || v.journey === "ceo")) {
        a.pending = { kind: v.journey, recipientDesk: v.recipientDesk, key: v.journeyKey };
      }
      if (a.pending?.kind === "ceo" && approvals && !approvals.has(a.pending.key)) a.pending = undefined;
      if (v.state === "stale" || v.state === "unknown") a.pending = undefined;
    if (a.journey === "rest" && v.state !== "stale" && v.state !== "unknown" && (!v.restEligible || a.pending || (v.meeting && v.meeting.expiresAt>Date.now()))) returnToDesk(a);
      if (!v.restEligible || a.pending) a.idleSince = null;
      if (!a.journey) {atDesk(a);if(v.state==="error" && previousState!=="error")playOnce(a,"error_reaction","sit_idle",performance.now());}
    }
  }
  let pointer:{id:number;x:number;y:number;moved:boolean}|null=null;const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  const wheel=(e:WheelEvent)=>{e.preventDefault();zoomBy(e.deltaY>0?.9:1.1);};
  const down=(e:PointerEvent)=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};renderer.domElement.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>2)pointer.moved=true;azimuth+=dx*.006;elevation=THREE.MathUtils.clamp(elevation+dy*.004,.35,1.25);pointer.x=e.clientX;pointer.y=e.clientY;aim();};
  const up=(e:PointerEvent)=>{if(!pointer||pointer.id!==e.pointerId)return;if(!pointer.moved){const rect=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects([...actors.values()].map(a=>a.root),true)[0];let object:THREE.Object3D|null=hit?.object??null,id:string|null=null;while(object){if(typeof object.userData.agentId==="string"){id=object.userData.agentId;break;}object=object.parent;}onSelect?.(id);}pointer=null;};
  renderer.domElement.addEventListener("wheel",wheel,{passive:false});renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerup",up);
  function advance(a: Actor, now: number, dt: number) {
    if(a.visual.state==="stale" || a.visual.state==="unknown") return;
    a.mixer.update(dt);
    if(a.oneShotUntil && now>=a.oneShotUntil){const next=a.oneShotNext;a.oneShotUntil=undefined;a.oneShotNext=undefined;if(next)play(a,next);}
    if (!a.journey) {
      if (now < (a.retryAt ?? 0)) return;
      if (a.pending) {
        if (depart(a, a.pending.kind, a.pending.recipientDesk)) {
          a.approvalKey = a.pending.kind==="ceo"?a.pending.key:undefined;
          a.pending = undefined;
        }
        else a.retryAt = now + 250;
      } else if (a.visual.meeting && a.visual.meeting.expiresAt>Date.now()) {
        if (!depart(a,"meeting")) a.retryAt=now+250;
      } else {
        a.idleSince = updateIdleSince(a.idleSince, a.visual.restEligible, now);
        if (a.idleSince !== null && now - a.idleSince >= idleToLoungeDelayMs && !depart(a, "rest")) a.retryAt = now + 250;
      }
      return;
    }
    if (a.journey==="meeting" && !a.returning && (a.visual.meeting?.id!==a.meetingId || (a.visual.meeting?.expiresAt??0)<=Date.now())) {
      if (now >= (a.retryAt??0)) { returnToDesk(a); a.retryAt=now+250; }
      return;
    }
    if (a.parked) {
      if (a.journey === "rest" && (!a.visual.restEligible || a.pending || (a.visual.meeting && a.visual.meeting.expiresAt>Date.now())) && now >= (a.retryAt ?? 0)) {
        returnToDesk(a);
        a.retryAt = now + 250;
        return;
      }
      if (a.journey !== "rest" && a.journey !== "meeting" && (a.dwell -= dt) <= 0) {
        if(a.journey==="handoff"&&!a.acknowledged){a.acknowledged=true;a.dwell=.8;playOnce(a,"nod","idle_stand",now);}
        else returnToDesk(a);
      }
      if(a.journey==="meeting" && (a.dwell-=dt)<=0 && !a.oneShotUntil && a.clip!=="talk")play(a,"talk");
      if (a.journey === "rest" && a.visual.restEligible && !a.pending && now >= (a.restNextAt ?? Infinity)) {
        a.restCycle=(a.restCycle??0)+1;
        const phase=a.restCycle%7;
        if(phase===1 || phase===3 || phase===4 || phase===6){
          const home=`rest:${a.visual.deskId}`;
          const index=workstations.findIndex(w=>w.id===a.visual.deskId);
          const from=a.restNode??home;
          const activityChoices= index%3===0
            ? [loungeActivities[0],loungeActivities[1],loungeActivities[2]]
            : index%3===1 ? [loungeActivities[1],loungeActivities[2],loungeActivities[0]]
              : [loungeActivities[2],loungeActivities[0],loungeActivities[1]];
          const targets=phase===1?[`${index<6?"n":"p"}:${loungeSlots[index]!.at[0]}`]
            : phase===3 || phase===6?[home]:activityChoices.map(activity=>activity.id);
          for(const to of targets){
            const path=route(from,to);
            if(!path || path.length<2)continue;
            traffic.release(a.visual.id);
            if(!traffic.reserve(a.visual.id,path)){traffic.occupy(a.visual.id,[[a.root.position.x,a.root.position.z]]);continue;}
            a.path=path;a.index=1;a.roamFrom=from;a.roamTo=to;a.parked=false;
            a.walkBlend=["rest","talk","drink_coffee","sit_down"].includes(a.clip??"")&&a.actions.has("stand_up")?.8:.2;
            if(a.walkBlend>.2)playOnce(a,"stand_up","walk",now);else play(a,"walk");
            a.restNextAt=now+7000;
            return;
          }
        }
        const nearby=[...actors.values()].find(other=>other!==a&&other.journey==="rest"&&other.parked&&!loungeActivities.some(item=>item.id===other.restNode)&&Math.hypot(other.root.position.x-a.root.position.x,other.root.position.z-a.root.position.z)<2.4);
        const activity=loungeActivities.find(item=>item.id===a.restNode);
        const next=activity?.kind==="sofa"?"rest":activity?.kind==="coffee"?"drink_coffee":nearby&&phase===2?"social_talk":phase===2?"look_around":"idle_stand";
        if(next==="social_talk"&&nearby){const dx=nearby.root.position.x-a.root.position.x,dz=nearby.root.position.z-a.root.position.z;a.root.rotation.y=Math.atan2(dx,dz);nearby.root.rotation.y=Math.atan2(-dx,-dz);play(nearby,"social_talk");nearby.restNextAt=Math.max(nearby.restNextAt??0,now+2200);}
        if(next!==a.clip)play(a,next);
        a.restNextAt=now+5000+(workstations.findIndex(w=>w.id===a.visual.deskId)%4)*1300;
      }
      return;
    }
    if (a.walkBlend && a.walkBlend>0) { a.walkBlend-=dt; return; }
    const sofaDestination=loungeActivities.find(item=>item.id===a.roamTo&&item.kind==="sofa");
    if(sofaDestination && a.path && a.index===a.path.length-1){
      // The walk stops at the clear front approach. The seat transition crosses
      // the intentional cushion contact while the hips and legs fold.
      a.seatTransition={from:[a.root.position.x,a.root.position.z],to:sofaDestination.at,elapsed:0};
      a.index=a.path.length;
    }
    const point = a.path?.[a.index];
    if (point) {
      const dx = point[0]-a.root.position.x, dz = point[1]-a.root.position.z;
      const distance = Math.hypot(dx,dz);
      if (distance <= dt*2) {
        a.root.position.x = point[0];
        a.root.position.z = point[1];
        a.index++;
      } else if (distance > 0) {
        a.root.position.x += dx/distance*dt*2;
        a.root.position.z += dz/distance*dt*2;
        const targetAngle = Math.atan2(dx,dz);
        const error = targetAngle-a.root.rotation.y;
        a.root.rotation.y += Math.atan2(Math.sin(error),Math.cos(error))*(1-Math.exp(-dt*16));
      }
      return;
    }
    if (a.returning) {
      traffic.release(a.visual.id);
      a.path = null;
      a.returning = false;
      a.journey = null;
      a.restNode=undefined;a.restNextAt=undefined;
      atDesk(a);
      if(a.actions.has("sit_down"))playOnce(a,"sit_down",a.visual.state==="working"?"typing":"sit_idle",now);
      onMotion?.(a.visual.id, "At workstation");
    } else {
      if(a.journey==="rest" && a.roamTo){a.restNode=a.roamTo;a.roamTo=undefined;a.roamFrom=undefined;}
      a.parked = true;
      a.dwell = 1;
      const activity=loungeActivities.find(item=>item.id===a.restNode);
      const arrivalClip=a.journey === "rest" ? activity?.kind==="sofa"?"rest":activity?.kind==="coffee"?"drink_coffee":"idle_stand" : a.journey === "meeting" ? "sit_idle" : "give_document";
      if(activity)a.root.rotation.y=activity.facing;
      if(((a.journey==="rest"&&activity?.kind==="sofa") || a.journey==="meeting")&&a.actions.has("sit_down"))playOnce(a,"sit_down",arrivalClip,now);else play(a,arrivalClip);
      if(a.journey==="handoff" && a.handoffDesk){const recipient=[...actors.values()].find(other=>other.visual.deskId===a.handoffDesk&&other.journey===null);if(recipient)playOnce(recipient,"nod",recipient.visual.state==="working"?"typing":"sit_idle",now);}
      if (a.journey === "ceo" && a.approvalKey && pendingApprovals?.has(a.approvalKey)) {
        delivered.add(a.approvalKey);
        updateTray();
      }
      if (a.journey === "rest" || a.journey === "meeting") {
        if (a.journey==="meeting") traffic.occupy(a.visual.id,[[a.root.position.x,a.root.position.z]]);
        else {traffic.occupy(a.visual.id,a.seatTransition?[a.seatTransition.from,a.seatTransition.to]:[[a.root.position.x,a.root.position.z]]);a.restNextAt=now+4000+(workstations.findIndex(w=>w.id===a.visual.deskId)%4)*1300;}
        onMotion?.(a.visual.id, a.journey==="rest"?"Resting in lounge":"In meeting");
      }
    }
  }

  let last = performance.now();
  const frameTimes: number[] = [];
  const auditEnabled = new URLSearchParams(window.location.search).has("officeAudit");
  const obstacles = auditEnabled ? fixtureBoxes.filter(([,y])=>y>.05) : [];
  const audit = { frames:0, wallOrFurniture:0, actorOverlap:0, maxMoving:0, first:"" };
  function auditFrame() {
    const visible = [...actors.values()];
    audit.frames++;
    audit.maxMoving = Math.max(audit.maxMoving,visible.filter(a=>a.path&&!a.parked).length);
    for (const [i,a] of visible.entries()) {
      const {x,z} = a.root.position;
      const radius = a.clip==="rest" || (a.journey==="rest" && (a.walkBlend??0)>0 && a.returning) ? .68 : .55;
      for(const [cx,,cz,w,,d,,name] of obstacles) {
        const dx=Math.max(Math.abs(x-cx)-w/2,0), dz=Math.max(Math.abs(z-cz)-d/2,0);
        if (Math.hypot(dx,dz)<radius-.001) {
          audit.wallOrFurniture++;
          audit.first ||= `${a.visual.deskId}: ${name??"fixture"} at ${x.toFixed(2)},${z.toFixed(2)}`;
        }
      }
      for(const other of visible.slice(i+1)) {
        const otherRadius=other.clip==="rest" || (other.journey==="rest" && (other.walkBlend??0)>0 && other.returning) ? .68 : .55;
        if (Math.hypot(x-other.root.position.x,z-other.root.position.z)<radius+otherRadius-.001) {
          audit.actorOverlap++;
          audit.first ||= `${a.visual.deskId}/${other.visual.deskId}`;
        }
      }
    }
    renderer.domElement.dataset.motionAudit=JSON.stringify(audit);
  }
  renderer.setAnimationLoop(now => {
    const elapsed = now-last;
    const dt = Math.min(Math.max(elapsed/1000,0),.1);
    last = now;
    if (document.hidden || host.clientHeight <= 1) { frameTimes.length = 0; return; }
    const blend=1-Math.exp(-Math.max(dt,.001)*6);
    if(target.distanceToSquared(desiredTarget)>.00001){target.lerp(desiredTarget,blend);aim();}
    if(Math.abs(camera.zoom-desiredZoom)>.001){camera.zoom=THREE.MathUtils.lerp(camera.zoom,desiredZoom,blend);camera.updateProjectionMatrix();labelsDirty=true;}
    for (const actor of actors.values()) {
      advance(actor, now, dt);
      if(actor.seatTransition){const transition=actor.seatTransition;transition.elapsed=Math.min(.8,transition.elapsed+dt);const t=transition.elapsed/.8;const eased=t*t*(3-2*t);actor.root.position.x=THREE.MathUtils.lerp(transition.from[0],transition.to[0],eased);actor.root.position.z=THREE.MathUtils.lerp(transition.from[1],transition.to[1],eased);if(t>=1){actor.seatTransition=undefined;if(actor.parked)traffic.occupy(actor.visual.id,[transition.to]);}}
      const sofaSeated=actor.journey==="rest"&&actor.parked&&loungeActivities.some(item=>item.id===actor.restNode&&item.kind==="sofa")&&["rest","sit_down"].includes(actor.clip??"");
      const seated=actor.journey===null || (actor.journey==="meeting" && actor.parked) || sofaSeated;
      actor.root.position.y=THREE.MathUtils.damp(actor.root.position.y,seated?(actor.vinish?sofaSeated?-.45:-.50:-.28):.03,12,dt);
    }
    if (auditEnabled) auditFrame();
    renderer.render(scene,camera);
    labelsDirty=true;positionLabels();
    renderer.domElement.dataset.sceneLoadMs ??= String(performance.now()-loadStarted);
    if (cameraInputAt!==undefined) {
      renderer.domElement.dataset.cameraFrameMs=String(performance.now()-cameraInputAt);
      cameraInputAt=undefined;
    }
    if (elapsed <= 0) return;
    frameTimes.push(elapsed);
    if (frameTimes.length === 120) {
      frameTimes.sort((a,b)=>a-b);
      renderer.domElement.dataset.renderStats = JSON.stringify({
        samples: frameTimes.length, p50: frameTimes[59], p95: frameTimes[113],
        drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        pixelRatio: renderer.getPixelRatio(), shadows: renderer.shadowMap.enabled,
      });
      frameTimes.length=0;
    }
  });
  const resume=()=>{last=performance.now();labelsDirty=true;};
  document.addEventListener("visibilitychange",resume);
  return {update,zoomBy,setLabelsVisible(visible){labelsVisible=visible;labelsDirty=true;labelLayer.style.display=visible?"block":"none";if(visible)positionLabels();},resetCamera(){focusedRoom="overview";resetCamera();positionLabels();},orbitBy(angle){azimuth+=angle;aim();positionLabels();},select(id){const a=id?actors.get(id):null;if(a){overviewAutoFit=false;desiredTarget.set(a.root.position.x,0,a.root.position.z);desiredZoom=Math.max(desiredZoom,4.5);}},focusRoom(id){const b:Bounds|undefined=rooms.find(r=>r.id===id)??(id==="lounge"?lounge:undefined);if(b){overviewAutoFit=false;focusedRoom=id;desiredTarget.set((b.x[0]+b.x[1])/2,0,(b.z[0]+b.z[1])/2);desiredZoom=mobile?1.7:1.3;labelsDirty=true;positionLabels();}},dispose(){if(disposed)return;disposed=true;observer.disconnect();window.removeEventListener("resize",viewportLabels);window.removeEventListener("scroll",viewportLabels,true);document.removeEventListener("visibilitychange",resume);renderer.setAnimationLoop(null);renderer.domElement.removeEventListener("wheel",wheel);renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerup",up);for(const a of actors.values())a.dispose();actors.clear();labelLayer.remove();host.style.position=previousHostPosition;scene.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const texture of textures)texture.dispose();renderer.dispose();renderer.domElement.remove();}};
}

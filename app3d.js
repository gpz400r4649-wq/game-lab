import {initializeCharacterDefaults,synchronizeCharacterDefaults,inheritNewCharacter} from './character-defaults3d.js?v=20261110r';
import {nearbyActor,trade,companionsAt} from './actor3d.js?v=20261110r';
import {giveAllyGun,giftableGun,recruitTarget,allyAttackDistance} from './ally3d.js?v=20261110r';
import {createEditHistory} from './history3d.js?v=20261110r';
import {makeDoorModel,updateDoorModel} from './door-model3d.js?v=20261110r';
import {enemyEditHeight,createFloorRangeView} from './floor-edit3d.js?v=20261110r';
import {createPatrolOverlay} from './patrol-ui3d.js?v=20261110r';
import {stageRangePointer} from './stage-range3d.js?v=20261110r';
import {createEnemyMessages} from './enemy-messages3d.js?v=20261110r';
import {createPlayRanges} from './play-ranges3d.js?v=20261110r';
import {closeLiveRangeEditor,isLiveRangeEditing} from './enemy-range-ui3d.js?v=20261110r';
import {dragCandidate} from './editor-drag3d.js?v=20261110r';
import {rangeWorldCells,enemyYaw,defaultEnemyRanges,MOVE_MAX_CELLS} from './enemy-range3d.js?v=20261110r';
import {ROBOT_BARREL,TPS_GUN_MOUNT} from './muzzle3d.js?v=20261110r';
import {configureDoor,nearbyDoor} from './doors3d.js?v=20261110r';
import {appearanceFor} from './appearance3d.js?v=20261110r';
import {makeGunModel,applyFPSGunPose,worldGunMuzzle} from './gun-model3d.js?v=20261110r';
import {moveEditorCamera,createEditorNavigation} from './editor-camera3d.js?v=20261110r';
import {createStructureRenderer,BATCH_TYPES} from './structure-render3d.js?v=20261110r';
import {MAX_PROJECT_BYTES,MAX_BUILD_Y} from './limits3d.js?v=20261110r';
import {worldSize,coordinateLimit} from './world3d.js?v=20261110r';
import {createWorldUI} from './world-ui3d.js?v=20261110r';
import {configureNumericInput} from './numeric3d.js?v=20261110r';
import {setReadingText,applyReadings,kanaText} from './readings3d.js?v=20261110r';
import {installGameTouchGuard,bindHeldButton,bindGameAction,createGamePageMode} from './input3d.js?v=20261110r';
import {actionsFor} from './events3d.js?v=20261110r';
import {LIMITS,DESTRUCTIBLE_TYPES} from './weapons3d.js?v=20261110r';
import {BUILD_TYPES,placement,GRID_PARTS,snapEditorPiece,editorPlacementReason,blockPlacement} from './building3d.js?v=20261110r';
import {createToolsUI} from './tools3d.js?v=20261110r';
import * as T from './vendor/three.module.min.js';
import {enemyWeapon,PARTS,BEHAVIORS,clamp,part,fresh3D,validate3D,create3D,step3D,solids,conditionMet} from './engine3d.js?v=20261110r';
import {createWorkshop,confirmReplace} from './workshop3d.js?v=20261110r';
const $=s=>document.querySelector(s),view=$('#viewport'),KEY='tsukuru-lab-3d-v1';
let enemyRangeView='attackRange';
let project=fresh3D(),selected=null,tool='select',doorPreset='key',weaponPresetId='',mode='edit',perspective='tps',game=null,yaw=0,pitch=-.05,editYaw=.55,editPitch=.7,editDistance=30,editTarget=new T.Vector3(0,0,0),stick={x:0,z:0},keys=new Set(),fireHeld=false,firePressed=false,jumpPressed=false,doorPressed=false,look=null,saveTimer,toastTimer,lastTime=0;
let commonPreview=null,commonCamera=null;
function editedObject(){return commonPreview||project.objects.find(o=>o.id===selected);}
function toast(s){setReadingText($('#toast3'),s);$('#toast3').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast3').classList.remove('show'),3200);}
try{const value=localStorage.getItem(KEY);if(value){project=validate3D(JSON.parse(value));}}catch{toast('自動保存した3D作品を読み込めませんでした。ファイルからも読み込めます。');}
initializeCharacterDefaults(project,part);
const editHistory=createEditHistory(project);let restoringHistory=false;
$('#title3').value=project.title;editTarget.set(project.spawn.x,0,project.spawn.z);
const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor('#c9dce9');renderer.outputColorSpace=T.SRGBColorSpace;renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3Dステージ。編集時はマスや部品の面をタップして配置。プレイ時はドラッグで視点操作。');view.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#c9dce9');scene.fog=new T.Fog('#c9dce9',45,105);const camera=new T.PerspectiveCamera(65,1,.05,180);scene.add(new T.HemisphereLight(0xeaf7ff,0x748b9d,2.2));const sunlight=new T.DirectionalLight(0xffefda,2.5);sunlight.position.set(-12,22,12);scene.add(sunlight);
const ground=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:'#e2e8ed',roughness:.95}));ground.rotation.x=-Math.PI/2;scene.add(ground);const grid=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xc7d2dc}));grid.position.y=.008;scene.add(grid);const floorRangeView=createFloorRangeView(renderer,grid);
let groundSize=0;function updateWorld(){const size=worldSize(project);if(size===groundSize)return;groundSize=size;ground.scale.set(size/60,size/60,1);groundOutline.scale.set(size/60,1,size/60);const half=size/2,lines=[];for(let v=Math.ceil((-half-2)/4)*4+2;v<=half;v+=4)lines.push(v,0,-half,v,0,half,-half,0,v,half,0,v);grid.geometry.dispose();grid.geometry=new T.BufferGeometry();grid.geometry.setAttribute('position',new T.Float32BufferAttribute(lines,3));}

const groundOutline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(60,.1,60)),new T.LineBasicMaterial({color:0x9aaec4}));groundOutline.position.y=-.05;scene.add(groundOutline);
const spawnMark=new T.Mesh(new T.RingGeometry(.7,1,32),new T.MeshBasicMaterial({color:0x8a72d4,side:T.DoubleSide}));spawnMark.rotation.x=-Math.PI/2;spawnMark.position.set(project.spawn.x,.015,project.spawn.z);scene.add(spawnMark);
const objectsGroup=new T.Group(),bulletGroup=new T.Group();scene.add(objectsGroup,bulletGroup);const materials={box:new T.MeshStandardMaterial({color:'#91acbf',roughness:.8}),platform:new T.MeshStandardMaterial({color:'#b3a2d9',roughness:.65}),enemy:new T.MeshStandardMaterial({color:'#ef91a5',roughness:.6}),player:new T.MeshStandardMaterial({color:'#6ec3c0',roughness:.6}),dark:new T.MeshStandardMaterial({color:'#3f506b'}),white:new T.MeshStandardMaterial({color:'#f4f7ff'}),star:new T.MeshStandardMaterial({color:'#ffda72',emissive:'#a16e08',emissiveIntensity:.25}),bullet:new T.MeshBasicMaterial({color:'#f8e6a6'}),enemyBullet:new T.MeshBasicMaterial({color:'#f57c98'})};
const unitBox=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(.09,7,5),starGeometry=new T.OctahedronGeometry(.45);
function box(parent,mat,x,y,z,w,h,d){const m=new T.Mesh(unitBox,mat);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
function robot(material,armed=true){const group=new T.Group();box(group,material,0,1,0,.66,.72,.4);box(group,material,0,1.57,0,.6,.48,.48);box(group,materials.dark,0,1.59,-.25,.44,.17,.035);box(group,materials.white,-.12,1.6,-.275,.07,.07,.02);box(group,materials.white,.12,1.6,-.275,.07,.07,.02);const left=box(group,material,-.45,.94,0,.19,.65,.21),right=box(group,material,.45,.94,0,.19,.65,.21),leg1=box(group,material,-.19,.34,0,.23,.67,.28),leg2=box(group,material,.19,.34,0,.23,.67,.28);if(armed){const b=ROBOT_BARREL;box(group,materials.dark,b.x,b.y,b.z,b.width,b.height,b.length);}group.userData.limbs=[left,right,leg1,leg2];return group;}
const playerMesh=robot(materials.player,false);scene.add(playerMesh);const gun=new T.Group(),carriedGun=new T.Group();carriedGun.position.set(TPS_GUN_MOUNT.x,TPS_GUN_MOUNT.y,TPS_GUN_MOUNT.z);carriedGun.scale.setScalar(TPS_GUN_MOUNT.scale);playerMesh.add(carriedGun);camera.add(gun);scene.add(camera);let gunLookStamp='',gunPoseStamp='';function syncHeldGun(){const tool=project.loadout[mode==='play'?game?.equipped:0],stamp=tool?JSON.stringify(appearanceFor(tool)):'none';if(stamp!==gunLookStamp){gunLookStamp=stamp;gun.clear();carriedGun.clear();if(tool){gun.add(makeGunModel(tool));carriedGun.add(makeGunModel(tool));}}const poseStamp=stamp+':'+camera.aspect+':'+camera.fov;if(tool&&poseStamp!==gunPoseStamp){gunPoseStamp=poseStamp;applyFPSGunPose(gun,tool,camera.aspect,camera.fov);}carriedGun.visible=!!tool;return !!tool;}
const rangeOverlay=new T.InstancedMesh(new T.PlaneGeometry(3.85,3.85).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xed7890,transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide}),MOVE_MAX_CELLS);rangeOverlay.layers.set(2);rangeOverlay.frustumCulled=false;scene.add(rangeOverlay);rangeOverlay.visible=false;
// Yellow cell borders remain visible around the red attack cells.
const visionCell=new T.Shape();visionCell.moveTo(-1.98,-1.98);visionCell.lineTo(1.98,-1.98);visionCell.lineTo(1.98,1.98);visionCell.lineTo(-1.98,1.98);visionCell.closePath();
const visionHole=new T.Path();visionHole.moveTo(-1.68,-1.68);visionHole.lineTo(-1.68,1.68);visionHole.lineTo(1.68,1.68);visionHole.lineTo(1.68,-1.68);visionHole.closePath();visionCell.holes.push(visionHole);
const visionOverlay=new T.InstancedMesh(new T.ShapeGeometry(visionCell).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xe6b523,transparent:true,opacity:.85,depthWrite:false,depthTest:false,side:T.DoubleSide}),MOVE_MAX_CELLS);
visionOverlay.layers.set(2);visionOverlay.frustumCulled=false;visionOverlay.renderOrder=3;visionOverlay.visible=false;scene.add(visionOverlay);
let visionStamp='';
function updateAttackContext(active){
 const enemy=editedObject();
 visionOverlay.visible=active&&enemyRangeView==='attackRange'&&!!enemy?.searchRange;
 if(!visionOverlay.visible){visionStamp='';return;}
 const stamp=JSON.stringify([enemy.id,enemy.x,enemy.y,enemy.z,enemy.facing,enemy.searchRange,worldSize(project)]);
 if(stamp===visionStamp)return;visionStamp=stamp;
 const cells=rangeWorldCells(enemy.searchRange,enemy),matrix=new T.Matrix4(),half=worldSize(project)/2;
 visionOverlay.count=cells.length;
 cells.forEach(([x,z],i)=>{
  const left=Math.max(-half,x*4-1.98),right=Math.min(half,x*4+1.98),front=Math.max(-half,z*4-1.98),back=Math.min(half,z*4+1.98);
  matrix.makeScale(Math.max(0,right-left)/3.96,1,Math.max(0,back-front)/3.96).setPosition((left+right)/2,(enemy.y||0)+.06,(front+back)/2);visionOverlay.setMatrixAt(i,matrix);
 });visionOverlay.instanceMatrix.needsUpdate=true;
}
const allyRing=new T.Mesh(new T.RingGeometry(.982,1,96),new T.MeshBasicMaterial({color:0x258558,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));
allyRing.rotation.x=-Math.PI/2;allyRing.visible=false;scene.add(allyRing);
const allyRangeMarker=new T.Mesh(new T.RingGeometry(.8,1,32),allyRing.material);allyRangeMarker.rotation.x=-Math.PI/2;allyRangeMarker.visible=false;scene.add(allyRangeMarker);
function showAllyRange(ally){
 allyRing.visible=allyRangeMarker.visible=!!ally;
 if(!ally)return;
 allyRing.position.set(ally.x,ally.y+.06,ally.z);allyRangeMarker.position.set(ally.x,ally.y+.08,ally.z);
 allyRing.scale.setScalar(allyAttackDistance(ally,project.loadout));
}
const selectionBox=new T.BoxHelper(new T.Mesh(unitBox),0x9670e5);scene.add(selectionBox);selectionBox.visible=false;const meshes=new Map();let solidMeshes=[];
Object.assign(materials,Object.fromEntries(Object.entries({moving:'#80b7db',bounce:'#72d5bb',door:'#dcb36e',heal:'#73c4ab',checkpoint:'#86bccc',hazard:'#e8949a',goal:'#a192dd',ready:'#66c4a8'}).map(([k,color])=>[k,new T.MeshStandardMaterial({color,roughness:.7})])));
Object.assign(materials,{wall:new T.MeshStandardMaterial({color:'#d8b587',roughness:.9}),floor:new T.MeshStandardMaterial({color:'#c99d6c',roughness:.9}),roof:new T.MeshStandardMaterial({color:'#a98168',roughness:.9}),ramp:new T.MeshStandardMaterial({color:'#80b5ad',roughness:.8}),hitFlash:new T.MeshBasicMaterial({color:'#fff6dd'}),rocket:new T.MeshBasicMaterial({color:'#ff9f60'})});
const roofShape=new T.Shape();roofShape.moveTo(-.5,0);roofShape.lineTo(.5,0);roofShape.lineTo(0,1);roofShape.closePath();const roofGeometry=new T.ExtrudeGeometry(roofShape,{depth:1,bevelEnabled:false});roofGeometry.translate(0,0,-.5);
const rampShape=new T.Shape();rampShape.moveTo(-.5,0);rampShape.lineTo(.5,0);rampShape.lineTo(-.5,1);rampShape.closePath();const rampGeometry=new T.ExtrudeGeometry(rampShape,{depth:1,bevelEnabled:false});rampGeometry.translate(0,0,-.5);rampGeometry.rotateY(-Math.PI/2);const rocketGeometry=new T.ConeGeometry(1,2,6);
function structureModel(o,override){const g=new T.Group(),turned=(o.rotation||0)%180===90,w=turned?o.d:o.w,d=turned?o.w:o.d,mat=override||materials[o.type];g.rotation.y=(o.rotation||0)*Math.PI/180;if(o.type==='roof'||o.type==='ramp'){const m=new T.Mesh(o.type==='ramp'?rampGeometry:roofGeometry,mat);m.scale.set(w,o.h,d);g.add(m);}else box(g,mat,0,o.h/2,0,w,o.h,d);return g;}
const structureRenderer=createStructureRenderer(scene,materials,{box:unitBox,roof:roofGeometry,ramp:rampGeometry});camera.layers.enable(2);
const dragPreview=new T.Group();scene.add(dragPreview);
const ghost=new T.Group(),ghostMaterial=new T.MeshBasicMaterial({color:0x67d8bd,transparent:true,opacity:.42,depthWrite:false});scene.add(ghost);let ghostShape='',buildCount=-1,editorPointer=null;
const portalGeometry=new T.TorusGeometry(.9,.12,8,24),keyGeometry=new T.TorusGeometry(.23,.08,6,16);
const cyclingPickups=new Set();
let lastPickupFrame=-1;
function displayPickupGun(holder,tool){
  holder.clear();
  if(!tool)return;
  const model=makeGunModel(tool);
  model.rotation.y=Math.PI/2;
  holder.add(model);
}
function animatePickupGuns(time){
  const frame=Math.floor(time/900);
  if(frame===lastPickupFrame)return;
  lastPickupFrame=frame;
  const pool=project.loadout;
  for(const holder of cyclingPickups){
    if(!holder.parent?.parent){cyclingPickups.delete(holder);continue;}
    const tool=pool[frame%pool.length];
    if(holder.userData.shown===tool?.id)continue;
    displayPickupGun(holder,tool);
    holder.userData.shown=tool?.id;
  }
}
const pointedHat=new T.ConeGeometry(.35,.65,12);
const schoolHatCrown=new T.SphereGeometry(1,24,10,0,Math.PI*2,0,Math.PI/2);
const schoolHatBrim=new T.CylinderGeometry(.43,.44,.045,32);
const schoolHatBand=new T.CylinderGeometry(.349,.352,.04,24);
const schoolHatFelt=new T.MeshStandardMaterial({color:0xffcf39,roughness:.9});
const schoolHatRibbon=new T.MeshStandardMaterial({color:0xbc8426,roughness:.85});
const strawMat=new T.MeshStandardMaterial({color:0xdfb872,roughness:1});
const strawRibbon=new T.MeshStandardMaterial({color:0x9f4939,roughness:.9});
function addActorHat(mesh,hat='yellow'){
  if(hat==='none')return;
  if(hat==='straw'){
    const brim=new T.Mesh(schoolHatBrim,strawMat);brim.position.y=1.83;brim.scale.set(1.55,.7,1.24);
    const crown=new T.Mesh(schoolHatCrown,strawMat);crown.position.y=1.84;crown.scale.set(.36,.32,.30);
    const band=new T.Mesh(schoolHatBand,strawRibbon);band.position.y=1.88;band.scale.set(1.035,1.6,.87);
    mesh.add(brim,crown,band);
  }else if(hat==='cap'){
    box(mesh,materials.player,0,1.92,0,.63,.22,.51);
    box(mesh,materials.player,0,1.84,-.32,.60,.06,.23);
  }else if(hat==='chef'){
    box(mesh,materials.white,0,1.93,0,.57,.24,.46);
    box(mesh,materials.white,0,2.12,0,.74,.23,.59);
  }else if(hat==='witch'){
    box(mesh,materials.dark,0,1.84,0,.84,.06,.72);
    const cone=new T.Mesh(pointedHat,materials.goal);cone.position.y=2.19;mesh.add(cone);
  }else{
    const brim=new T.Mesh(schoolHatBrim,schoolHatFelt);
    brim.scale.z=.87;brim.position.y=1.825;
    const crown=new T.Mesh(schoolHatCrown,schoolHatFelt);
    crown.scale.set(.35,.26,.30);crown.position.y=1.846;
    const band=new T.Mesh(schoolHatBand,schoolHatRibbon);
    band.scale.z=.86;band.position.y=1.867;
    mesh.add(brim,crown,band);
  }
}
function partModel(o){let mesh=new T.Group();
  if(Object.hasOwn(BUILD_TYPES,o.type)){mesh=structureModel(o);}
  else if(['box','platform'].includes(o.type)){box(mesh,materials[o.type],0,o.h/2,0,o.w,o.h,o.d);}
  else if(o.type==='moving'){
   box(mesh,materials[o.type],0,o.h/2,0,o.w,o.h,o.d);box(mesh,o.type==='box'?materials.white:materials.player,0,o.h+.015,0,o.w*.92,.03,o.d*.92);
   if(o.type==='moving'){box(mesh,materials.white,0,o.h+.04,0,.7,.04,.18);box(mesh,materials.white,-.27,o.h+.04,0,.12,.04,.4);box(mesh,materials.white,.27,o.h+.04,0,.12,.04,.4);}
  }else if(o.type==='weapon'){const holder=new T.Group();holder.position.y=.65;holder.scale.setScalar(.9);mesh.add(holder);
   const random=o.weaponId==='@random';
   const tool=random?project.loadout[0]:project.loadout.find(t=>t.id===(actionsFor(o).find(a=>a.type==='giveTool')?.target||o.weaponId));
   displayPickupGun(holder,tool);holder.userData.shown=tool?.id;
   if(random)cyclingPickups.add(holder);
   const ring=new T.Mesh(portalGeometry,materials.star);ring.rotation.x=Math.PI/2;ring.scale.setScalar(.55);ring.position.y=.08;mesh.add(ring);
  }else if(o.type==='blockItem'){
   const t=o.blockTemplate,mini=Object.hasOwn(BUILD_TYPES,t.type)?structureModel(t):new T.Group();if(!Object.hasOwn(BUILD_TYPES,t.type))box(mini,materials[t.type]||materials.box,0,t.h/2,0,t.w,t.h,t.d);mini.scale.setScalar(.2);mini.position.y=.12;mesh.add(mini);const ring=new T.Mesh(portalGeometry,materials.star);ring.rotation.x=Math.PI/2;ring.scale.setScalar(.5);ring.position.y=.06;mesh.add(ring);
  }else if(o.type==='actor'){mesh=robot(materials.goal,false);addActorHat(mesh,o.hat);
  }else if(o.type==='plate'){box(mesh,materials.dark,0,.04,0,o.w,.08,o.d);const pad=box(mesh,materials.ready,0,.13,0,o.w*.85,.12,o.d*.85);mesh.userData.pad=pad;
  }else if(o.type==='enemy'||o.type==='ally'){const ally=o.type==='ally',weapon=ally?project.loadout.find(t=>t.id===o.allyGun&&t.effect==='shoot'):enemyWeapon(o,project.loadout);mesh=robot(ally?materials.heal:materials.enemy,!weapon);if(!ally)mesh.scale.setScalar(o.enemyScale||1);mesh.rotation.y=(o.facing||0)*Math.PI/180;if(weapon){const held=makeGunModel(weapon);held.position.set(TPS_GUN_MOUNT.x,TPS_GUN_MOUNT.y,TPS_GUN_MOUNT.z);held.scale.setScalar(TPS_GUN_MOUNT.scale);mesh.add(held);}}
  else if(o.type==='star'){const m=new T.Mesh(starGeometry,materials.star);m.position.y=.85;mesh.add(m);}
  else if(o.type==='door'){
   mesh=makeDoorModel(o,materials);
  }else if(o.type==='goal'){
   const m=new T.Mesh(portalGeometry,materials.goal);m.position.y=1.3;mesh.add(m);box(mesh,materials.goal,0,.12,0,2.4,.24,1.2);mesh.userData.portal=m;
  }else if(o.type==='key'){
   const m=new T.Mesh(keyGeometry,materials.star);m.position.set(-.22,1,0);mesh.add(m);box(mesh,materials.star,.18,1,0,.55,.12,.12);box(mesh,materials.star,.39,.87,0,.12,.26,.12);
  }else if(o.type==='heal'){
   box(mesh,materials.white,0,.5,0,.8,.8,.6);box(mesh,materials.heal,0,.5,-.31,.5,.16,.03);box(mesh,materials.heal,0,.5,-.32,.16,.5,.03);
  }else if(o.type==='checkpoint'){
   box(mesh,materials.checkpoint,0,.08,0,1.6,.16,1.6);box(mesh,materials.dark,-.3,.8,0,.08,1.6,.08);mesh.userData.flag=box(mesh,materials.checkpoint,.08,1.4,0,.7,.4,.08);
  }else if(o.type==='hazard'){
   box(mesh,materials.hazard,0,o.h/2,0,o.w,o.h,o.d);for(let i=-1;i<=1;i++)box(mesh,materials.star,i*o.w/4,o.h+.02,0,o.w/9,.04,o.d*.85);
  }else if(o.type==='bounce'){
   box(mesh,materials.dark,0,.06,0,o.w,.12,o.d);box(mesh,materials.bounce,0,.2,0,o.w*.9,.14,o.d*.9);box(mesh,materials.white,0,.29,0,.16,.04,.8);box(mesh,materials.white,0,.29,-.3,.6,.04,.16);
  }
if(BATCH_TYPES.has(o.type))structureRenderer.mark(mesh);return mesh;}
function rebuild(){synchronizeCharacterDefaults(project);updateWorld();
 cyclingPickups.clear();objectsGroup.clear();meshes.clear();const objects=mode==='play'?[...game.objects,...game.drops]:commonPreview?[commonPreview]:project.objects;
 for(const o of objects){const mesh=partModel(o);mesh.position.set(o.x,o.y,o.z);mesh.visible=mode!=='play'||(!o.hidden&&!o.collected);mesh.userData.id=o.id;objectsGroup.add(mesh);meshes.set(o.id,mesh);}
 structureRenderer.sync(objects,meshes);solidMeshes=[...new Set(solids(objects).map(o=>meshes.get(o.sourceDoorId||o.id)).filter(Boolean))];updateSelection();
}
const patrolOverlay=createPatrolOverlay(scene);
const playRanges=createPlayRanges(scene),enemyMessages=createEnemyMessages();
function updateSelection(){const o=editedObject(),mesh=meshes.get(o?.id);showAllyRange(mode==='edit'&&o?.type==='ally'?o:null);if(mode==='edit'&&o?.type==='enemy'&&mesh){mesh.position.set(o.x,o.y,o.z);mesh.rotation.y=(o.facing||0)*Math.PI/180;}selectionBox.visible=!!mesh&&mode==='edit';if(mesh)selectionBox.setFromObject(mesh);patrolOverlay.show(mode==='edit'&&o?.type==='enemy'&&['patrolRoute','waypoints'].includes(enemyRangeView)?o[enemyRangeView]:null,o?.y||0,enemyRangeView==='waypoints'&&(o?.routeEnd||'loop')==='loop');rangeOverlay.visible=mode==='edit'&&o?.type==='enemy'&&!!o[enemyRangeView]?.cells;if(rangeOverlay.visible){const m=new T.Matrix4(),range=o[enemyRangeView];rangeOverlay.material.color.set({attackRange:0xed7890,moveRange:0x469edf,searchRange:0xdcb52b}[enemyRangeView]);rangeOverlay.count=range.cells.length;const half=worldSize(project)/2;rangeWorldCells(range,o).forEach(([x,z],i)=>{const wx=x*4,wz=z*4,left=Math.max(-half,wx-1.925),right=Math.min(half,wx+1.925),front=Math.max(-half,wz-1.925),back=Math.min(half,wz+1.925);m.makeScale(Math.max(0,right-left)/3.85,1,Math.max(0,back-front)/3.85).setPosition((left+right)/2,enemyEditHeight(o)+.025,(front+back)/2);rangeOverlay.setMatrixAt(i,m);});rangeOverlay.instanceMatrix.needsUpdate=true;}}
function save(){synchronizeCharacterDefaults(project);if(!restoringHistory)editHistory.record(project);syncHistoryButtons();clearTimeout(saveTimer);setReadingText($('#saved3'),'保存中…');saveTimer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(project));setReadingText($('#saved3'),'✓ このブラウザに保存しました');}catch{setReadingText($('#saved3'),'保存できません。ファイルに保存してください');}},250);}
function field(parent,name,value,min,max,step,fn){
 const l=document.createElement('label');l.className='field';const s=document.createElement('span');setReadingText(s,name);const input=document.createElement('input');input.setAttribute('aria-label',name);
 const toggleSign=configureNumericInput(input,{value,min,max,step,onValue:n=>{const result=fn(n);save();rebuild();return result;},onCommit:()=>{save();rebuild();}});
 l.append(s);if(min<0){const entry=document.createElement('span'),sign=document.createElement('button');entry.className='number-entry';sign.type='button';sign.textContent='＋/−';sign.setAttribute('aria-label',name+'のプラスとマイナスを切り替える');sign.onclick=toggleSign;entry.append(input,sign);l.append(entry);}else l.append(input);parent.append(l);return l;
}
const allyHitRule=$('#ally-hit-rule3');
$('#rules-open3').onclick=()=>{renderPlayerRules();allyHitRule.value=project.playerHitsAlly?'on':'off';$('#project-rules3').showModal();};
$('#rules-close3').onclick=()=>$('#project-rules3').close();
allyHitRule.onchange=()=>{project.playerHitsAlly=allyHitRule.value==='on';save();};
function objectList(){renderPlayerRules();allyHitRule.value=project.playerHitsAlly?'on':'off';const select=$('#object-list');select.replaceChildren(new Option('パーツをタップして選択',''));project.objects.forEach((o,i)=>select.add(new Option(`${i+1}. ${PARTS[o.type]}`,o.id)));select.value=selected||'';applyReadings(select);}
function advancedInspector(){const el=$('#inspector3');el.replaceChildren();const o=editedObject();if(!o){el.innerHTML='<p class="empty">何もない場所から、はじめよう。<br>敵も足場も、自分でついかできるよ。</p>';return;}const title=document.createElement('div');title.className='inspector-heading';setReadingText(title,PARTS[o.type]);el.append(title);const pos=document.createElement('div');pos.className='position-fields';for(const [k,label,min,max] of [['x','横 X',-coordinateLimit(project),coordinateLimit(project)],['y','高さ Y',0,MAX_BUILD_Y],['z','奥行 Z',-coordinateLimit(project),coordinateLimit(project)]])field(pos,label,o[k],min,max,.5,n=>o[k]=n);el.append(pos);if(o.type==='box'||o.type==='platform'){for(const [k,label] of [['w','はば'],['h','たかさ'],['d','おくゆき']])field(el,label,o[k],.5,10,.5,n=>o[k]=n);}
if(o.type==='enemy'){field(el,'体力',o.hp,1,500,1,n=>o.hp=Math.round(n));const loop=document.createElement('div');loop.className='loop';setReadingText(loop,'⚑ ゲーム開始 → ずっとくり返す');o.program.forEach((b,i)=>{const block=document.createElement('div');block.className='block';const select=document.createElement('select');select.setAttribute('aria-label',`3Dの${i+1}番目のうごき`);Object.entries(BEHAVIORS).forEach(([k,v])=>select.add(new Option(kanaText(v),k)));select.value=b.action;select.onchange=()=>{b.action=select.value;save();rebuild();inspector();};block.append(select);field(block,'速さ',b.speed,.5,8,.5,n=>b.speed=n);const row=document.createElement('div');row.className='block-controls';for(const [name,disabled,fn] of [['↑',i===0,()=>[o.program[i-1],o.program[i]]=[o.program[i],o.program[i-1]]],['↓',i===o.program.length-1,()=>[o.program[i+1],o.program[i]]=[o.program[i],o.program[i+1]]],['×',false,()=>o.program.splice(i,1)]]){const btn=document.createElement('button');setReadingText(btn,name);btn.disabled=disabled;btn.setAttribute('aria-label',name==='×'?'3Dブロックを削除':name==='↑'?'3Dブロックを上へ':'3Dブロックを下へ');btn.onclick=()=>{fn();save();inspector();};row.append(btn);}block.append(row);loop.append(block);});const add=document.createElement('button');setReadingText(add,'＋ うごきを追加');add.disabled=o.program.length>=8;add.onclick=()=>{o.program.push({action:'patrol',speed:2});save();inspector();};loop.append(add);el.append(loop);}
const del=document.createElement('button');del.className='danger';setReadingText(del,'このパーツを消す');del.onclick=()=>{project.objects=project.objects.filter(x=>x.id!==o.id);selected=null;save();rebuild();objectList();inspector();};el.append(del);}
function advancedWeaponFields(){const el=$('#weapon3');el.replaceChildren();field(el,'弾の速さ',project.weapon.speed,5,60,1,n=>project.weapon.speed=n);field(el,'発射の間かく（秒）',project.weapon.interval,.1,2,.05,n=>project.weapon.interval=n);field(el,'弾のつよさ',project.weapon.damage,1,10,1,n=>project.weapon.damage=Math.round(n));const l=document.createElement('label');l.className='field';setReadingText(l,'同時に出る弾');const s=document.createElement('select');[1,3,5].forEach(n=>s.add(new Option(n+' 発',n)));s.value=project.weapon.spread;s.onchange=()=>{project.weapon.spread=Number(s.value);save();};l.append(s);el.append(l);}
// The workshop builds the component library and its beginner controls.
$('#object-list').onchange=e=>{selected=e.target.value;const o=project.objects.find(x=>x.id===selected);if(o){editTarget.set(o.x,o.y,o.z);editDistance=Math.min(editDistance,18);}updateSelection();inspector();};$('#title3').oninput=()=>{project.title=$('#title3').value;save();};
const setGamePageMode=createGamePageMode(document);let joystickPointer=null;const resetTouchGuard=installGameTouchGuard(view,()=>mode==='play');let resetFire=()=>{},resetEditorNavigation=()=>{};
function resetInput(){if(look?.drag)finishEditorDrag(false);resetEditorNavigation();resetTouchGuard();resetFire();joystickPointer=null;keys.clear();stick={x:0,z:0};fireHeld=false;firePressed=false;jumpPressed=false;doorPressed=false;look=null;$('#stick3 .edit-stick-thumb').style.transform='';}
function setMode(next){closeLiveRangeEditor();mode=next;$('.stage-toolbar').classList.toggle('is-playing',mode==='play');$('#editor-tools3').hidden=mode==='play';$('#talk3').hidden=$('#escort-count3').hidden=true;$('#ally-range-toggle3').hidden=true;allyCommand=null;giftButton.hidden=allyButton.hidden=formationButton.hidden=true;syncHistoryButtons();setGamePageMode(mode==='play');resetInput();$('#edit3').classList.toggle('active',mode==='edit');$('#play3').classList.toggle('active',mode==='play');for(const id of ['#play-hud','#controls3','#crosshair','#hotbar3'])$(id).hidden=mode!=='play';$('#use-door3').hidden=true;$('#stats3').hidden=mode==='play';$('#editor-nav3').hidden=mode==='play';$('#orbit-pad').hidden=mode==='play';$('#lost3').hidden=true;setReadingText($('#mode3'),mode==='play'?(perspective==='fps'?'自分の目で見る世界':'うしろから見る世界'):'つくるモード');$('aside').inert=mode==='play';$('#title3').disabled=mode==='play';editorPointer=null;if(mode==='play'){game=create3D(project);startAllyRanges();playRanges.start(game.objects,selected);enemyMessages.reset();toolsUI.reset();buildCount=-1;lastMessageId=0;yaw=0;pitch=-.05;setReadingText($('#hint3'),'左で移動 · 景色をドラッグで見わたす · 右でジャンプと発射 / PC: WASD・Space・F');}else setReadingText($('#hint3'),'左下のスティックでカメラを移動 · ドラッグで見わたす / PC: WASD・矢印、Eで上、Qで下');toolsUI.renderHotbar();syncPlacementUI();rebuild();renderer.domElement.focus({preventScroll:true});}
function syncHistoryButtons(){$('#edit-history3').hidden=mode!=='edit';$('#undo3').disabled=!editHistory.canUndo;$('#redo3').disabled=!editHistory.canRedo;}
function restoreHistory(direction){if(mode!=='edit')return;closeLiveRangeEditor();resetInput();editHistory.record(project);const next=direction==='undo'?editHistory.undo():editHistory.redo();if(!next)return;project=next;if(!project.objects.some(o=>o.id===selected))selected=null;editorPointer=null;$('#title3').value=project.title;spawnMark.position.set(project.spawn.x,.015,project.spawn.z);restoringHistory=true;try{save();}finally{restoringHistory=false;}workshop.palette();rebuild();objectList();inspector();weaponFields();toast(direction==='undo'?'ひとつ前にもどしたよ':'もどした編集をやりなおしたよ');}
$('#undo3').onclick=()=>restoreHistory('undo');$('#redo3').onclick=()=>restoreHistory('redo');syncHistoryButtons();
$('#edit3').onclick=()=>setMode('edit');$('#play3').onclick=$('#retry3').onclick=()=>setMode('play');function setPerspective(value){perspective=value;$('#tps3').classList.toggle('active',value==='tps');$('#fps3').classList.toggle('active',value==='fps');if(mode==='play')setReadingText($('#mode3'),value==='fps'?'自分の目で見る世界':'うしろから見る世界');}$('#tps3').onclick=()=>setPerspective('tps');$('#fps3').onclick=()=>setPerspective('fps');$('#reset-camera').onclick=()=>{if(mode==='play'){yaw=0;pitch=-.05;}else if(commonPreview){editYaw=0;editPitch=1.4;editDistance=38;editTarget.set(commonPreview.x,commonPreview.y,commonPreview.z);}else{editYaw=.55;editPitch=.7;editDistance=30;editTarget.set(project.spawn.x,0,project.spawn.z);}};
const ray=new T.Raycaster(),pointer=new T.Vector2();ray.layers.enable(1);function hits(event,objects){const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(objects,true);}function objectId(object){while(object&&!object.userData.id)object=object.parent;return object?.userData.id;}
const surface=renderer.domElement;
let placementLook=false,placementUIStamp='';
function syncPlacementUI(){const enabled=mode==='edit'&&GRID_PARTS.has(tool)&&!isLiveRangeEditing(),stamp=enabled+':'+placementLook;if(stamp===placementUIStamp)return;placementUIStamp=stamp;$('#editor-place-tools3').hidden=!enabled;for(const [id,active]of [['#place-drag3',!placementLook],['#place-look3',placementLook]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}}
$('#place-drag3').onclick=()=>{placementLook=false;editorPointer=null;syncPlacementUI();};$('#place-look3').onclick=()=>{placementLook=true;editorPointer=null;syncPlacementUI();};
function withinSurface(e){const r=surface.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}

for(const id of ['#editor-nav3','#orbit-pad'])$(id).addEventListener('pointerdown',()=>{if(isLiveRangeEditing())surface.focus({preventScroll:true});});
function pointOnDragPlane(event,height){hits(event,[]);return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-height),new T.Vector3());}
function beginEditorDrag(drag){if(drag.started)return;drag.started=true;const source=meshes.get(drag.original.id),copy=source.clone(true);copy.position.set(0,0,0);copy.visible=true;copy.traverse(child=>{child.layers.set(0);if(child.isMesh)child.material=ghostMaterial;});dragPreview.clear();dragPreview.add(copy);source.visible=false;structureRenderer.sync(project.objects.map(o=>o.id===drag.original.id?{...o,hidden:true}:o),meshes);surface.classList.add('is-object-dragging');}
function updateEditorDrag(event,drag){const point=pointOnDragPlane(event,drag.height),candidate=dragCandidate(drag.original,drag.grab,point,project.objects,project.spawn,project);if(!candidate)return;drag.candidate=candidate;beginEditorDrag(drag);dragPreview.position.set(candidate.piece.x,candidate.piece.y,candidate.piece.z);ghostMaterial.color.set(candidate.reason?0xee8592:0x53d9b4);dragPreview.visible=true;dragPreview.updateMatrixWorld(true);selectionBox.setFromObject(dragPreview);if(drag.original.type==='enemy'){if(drag.original[enemyRangeView]?.space!=='world')rangeOverlay.position.set(candidate.piece.x-drag.original.x,0,candidate.piece.z-drag.original.z);}}
function finishEditorDrag(commit){const drag=look?.drag;if(!drag)return;const result=drag.candidate,o=project.objects.find(o=>o.id===drag.original.id);if(commit&&drag.started&&result&&!result.reason&&o){o.x=result.piece.x;o.z=result.piece.z;save();}else if(commit&&result?.reason)toast(result.reason);const source=meshes.get(drag.original.id);if(source){source.visible=true;if(o)source.position.set(o.x,o.y,o.z);}dragPreview.clear();dragPreview.visible=false;rangeOverlay.position.set(0,0,0);surface.classList.remove('is-object-dragging');structureRenderer.sync(project.objects,meshes);if(look)look.drag=null;updateSelection();if(commit&&drag.started){rebuild();objectList();inspector();}}
surface.onpointerdown=e=>{if(mode==='edit'&&stageRangePointer('start',e.pointerId,pointOnDragPlane(e,enemyEditHeight(editedObject())))){e.preventDefault();surface.setPointerCapture(e.pointerId);surface.focus({preventScroll:true});return;}if(mode==='edit'&&(!look||look.id===e.pointerId))editorPointer={clientX:e.clientX,clientY:e.clientY};e.preventDefault();if(look)return;surface.setPointerCapture(e.pointerId);look={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,placing:mode==='edit'&&!isLiveRangeEditing()&&GRID_PARTS.has(tool)&&!placementLook,viewOnly:mode==='edit'&&GRID_PARTS.has(tool)&&placementLook};if(mode==='edit'&&!isLiveRangeEditing()&&tool==='select'&&selected){const hit=hits(e,[objectsGroup]).find(visibleHit);if(hit&&objectId(hit.object)===selected){const original=editedObject();look.drag={original:{...original},grab:{x:hit.point.x,z:hit.point.z},height:hit.point.y,started:false,candidate:null};}}};
surface.onpointermove=e=>{if(mode==='edit'&&stageRangePointer('move',e.pointerId,pointOnDragPlane(e,enemyEditHeight(editedObject()))))return;if(mode==='edit'&&(!look||look.id===e.pointerId))editorPointer={clientX:e.clientX,clientY:e.clientY};if(!look||look.id!==e.pointerId)return;const dx=e.clientX-look.x,dy=e.clientY-look.y;look.x=e.clientX;look.y=e.clientY;if(Math.hypot(e.clientX-look.startX,e.clientY-look.startY)>6)look.moved=true;if(look.placing){updateEditorGhost();return;}if(mode==='edit'&&look.drag){if(look.moved)updateEditorDrag(e,look.drag);return;}if(mode==='play'){yaw-=dx*.005;pitch=clamp(pitch-dy*.004,-1.2,1.15);}else{editYaw-=dx*.006;editPitch=clamp(editPitch+dy*.004,.18,1.4);}};
surface.onpointerup=e=>{if(stageRangePointer('end',e.pointerId,null))return;if(!look||look.id!==e.pointerId)return;if(look.drag&&look.moved){updateEditorDrag(e,look.drag);finishEditorDrag(true);look=null;return;}const click=!look.viewOnly&&(look.placing||!look.moved)&&withinSurface(e);look=null;if(mode!=='edit'||!click||isLiveRangeEditing()||commonPreview)return;const intersect=hits(e,[objectsGroup]);if(tool==='select'||tool==='erase'){const id=intersect.length?objectId(intersect[0].object):null;if(tool==='erase'&&id){project.objects=project.objects.filter(o=>o.id!==id);if(selected===id)selected=null;save();rebuild();}else selected=id;updateSelection();objectList();inspector();}else{const candidate=editorCandidate(e);if(!candidate){toast('ステージの面をタップしよう');return;}if(candidate.reason){toast(candidate.reason);return;}const o=inheritNewCharacter(project,candidate.piece);project.objects.push(o);selected=o.id;save();rebuild();objectList();inspector();toast(PARTS[tool]+'を追加したよ！');}};
surface.onpointerleave=()=>{if(!look)editorPointer=null;};surface.onpointercancel=surface.onlostpointercapture=e=>{if(stageRangePointer('end',e.pointerId,null))return;if(look?.id===e.pointerId){finishEditorDrag(false);look=null;editorPointer=null;ghost.visible=false;}};surface.onwheel=e=>{if(mode==='edit'&&!look?.drag){e.preventDefault();editDistance=clamp(editDistance+e.deltaY*.025,5,65);}};surface.addEventListener('wheel',e=>e.preventDefault(),{passive:false});

document.querySelectorAll('[data-orbit]').forEach(b=>b.onclick=()=>{const k=b.dataset.orbit;if(k==='left')editYaw+=.3;if(k==='right')editYaw-=.3;if(k==='in')editDistance=clamp(editDistance-4,5,65);if(k==='out')editDistance=clamp(editDistance+4,5,65);});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&look?.placing){look=null;editorPointer=null;ghost.visible=false;return;}if(e.key==='Escape'&&isLiveRangeEditing()){e.preventDefault();closeLiveRangeEditor();return;}if(e.target.matches('input,select,textarea')||document.querySelector('dialog[open]'))return;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key===' '&&!e.repeat)jumpPressed=true;if(mode==='play'&&e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();doorPressed=true;}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',resetInput);
let allyCommand=null;
const allyButton=$('#ally-order3'),formationButton=$('#formation3');
const giftButton=$('#ally-gift3');
bindGameAction(giftButton,()=>{
 if(mode==='play'&&giveAllyGun(game,project.loadout,giftButton.dataset.target,yaw)){
  rebuild();toolsUI.renderHotbar();giftButton.hidden=true;
 }
});
bindGameAction(allyButton,()=>allyCommand=allyButton.dataset.target);
const allyRangePanel=$('#ally-range-toggle3'),allyRangeEnabled=$('#ally-range-enabled3'),allyRangeTarget=$('#ally-range-target3');
allyRangeEnabled.onchange=()=>{const summary=allyRangePanel.querySelector('summary');setReadingText(summary,allyRangeEnabled.checked?'味方のはんい：オン':'味方のはんい');summary.classList.toggle('range-is-on',allyRangeEnabled.checked);};
function startAllyRanges(){const current=allyRangeTarget.value;allyRangeTarget.replaceChildren(new Option('自動でえらぶ',''));game.allies.forEach((ally,i)=>allyRangeTarget.add(new Option('みかた '+(i+1),ally.id)));allyRangeTarget.value=game.allies.some(a=>a.id===current)?current:'';allyRangePanel.open=false;allyRangeEnabled.onchange();}
for(const panel of document.querySelectorAll('.range-view-menu')){panel.querySelector('[data-range-close]').onclick=()=>panel.open=false;panel.querySelector('summary').onclick=()=>{if(!panel.open)document.querySelectorAll('.range-view-menu').forEach(other=>{if(other!==panel)other.open=false;});};}
document.addEventListener('click',event=>{document.querySelectorAll('.range-view-menu').forEach(panel=>{if(!panel.contains(event.target))panel.open=false;});});
formationButton.onclick=()=>{if(game)game.formation=game.formation==='spread'?'line':'spread';};
const talkDialog=$('#talk-dialog3'),talkButton=$('#talk3');
function talkTo(actor){
 const title=talkDialog.querySelector('h2'),speech=talkDialog.querySelector('p'),offers=talkDialog.querySelector('div');
 title.textContent=actor.actorName||'役者キャラクター';speech.textContent=actor.speech||'こんにちは！';offers.replaceChildren();
 for(const offer of actor.offers||[]){
  const gun=project.loadout.find(t=>t.id===offer.gun);if(!gun)continue;
  const button=document.createElement('button'),need=offer.price-game.stars,full=(game.inventoryCounts[gun.id]||0)>=99;
  setReadingText(button,gun.name+'　★'+offer.price+'こで交換'+(need>0?'（あと★'+need+'こ）':full?'（いっぱい）':''));button.disabled=need>0||full;
  button.onclick=()=>{if(trade(game,project,actor,offer)){talkTo(actor);speech.textContent=gun.name+'をもらったよ！';}};offers.append(button);
 }
 if(!talkDialog.open){resetInput();talkDialog.showModal();}
}
bindGameAction(talkButton,()=>{const actor=nearbyActor(game,yaw);if(actor)talkTo(actor);});
$('#bye3').onclick=()=>talkDialog.close();
function showAllyCommands(){
 talkButton.hidden=game.state!=='playing'||!nearbyActor(game,yaw);
 const goal=game.objects.find(o=>o.type==='goal'&&o.settings.condition==='allies'&&Math.abs(o.y-game.player.y)<2&&Math.hypot(o.x-game.player.x,o.z-game.player.z)<4);
 const count=$('#escort-count3');count.hidden=!goal||game.state!=='playing';if(goal)count.textContent='なかま '+companionsAt(goal,game)+' / '+goal.settings.required;

 const toggle=$('#ally-range-toggle3');toggle.hidden=!game.allies.length;
 const target=game.state==='playing'&&recruitTarget(game,yaw);
 const rangeAlly=allyRangeTarget.value?game.allies.find(a=>a.id===allyRangeTarget.value):(target||game.allies.find(a=>a.id===selected)||game.allies.find(a=>a.following)||game.allies[0]);
 showAllyRange(allyRangeEnabled.checked&&rangeAlly?.hp>0?rangeAlly:null);
 const rangeNote=allyRangePanel.querySelector('p'),rangeText=!rangeAlly||rangeAlly.hp<=0?'この味方は、今はステージにいないよ。':!allyRangeEnabled.checked?'「はんいを表示する」をオンにしよう。':'味方 '+(game.allies.indexOf(rangeAlly)+1)+'を表示中。緑の円の中なら銃がとどくよ。壁の向こうはねらえないよ。';
 if(rangeNote.dataset.text!==rangeText){rangeNote.dataset.text=rangeText;setReadingText(rangeNote,rangeText);}
 giftButton.hidden=true;allyButton.hidden=true;
 if(target){const pos=new T.Vector3(target.x,target.y+2.6,target.z).project(camera);
 if(pos.z>=-1&&pos.z<=1&&Math.abs(pos.x)<.9&&Math.abs(pos.y)<.9){allyButton.hidden=false;allyButton.dataset.target=target.id;allyButton.style.left=(50+pos.x*50)+'%';allyButton.style.top=(50-pos.y*50)+'%';allyButton.textContent='♥ '+target.hp+'/'+target.maxHp+'　'+(target.following?'ここでまって':'ついてきて');
 const gun=giftableGun(game,target,project.loadout);
 if(gun){giftButton.hidden=false;giftButton.dataset.target=target.id;giftButton.style.left=allyButton.style.left;giftButton.style.top=allyButton.style.top;giftButton.textContent=gun.name+'をあげる';}
}}
 formationButton.hidden=!game.allies.some(a=>a.following);
 formationButton.textContent=game.formation==='spread'?'ならび：さゆうにひろがる':'ならび：いちれつ';
}
bindGameAction($('#use-door3'),()=>doorPressed=true);
const editorNavigation=createEditorNavigation($('#editor-nav3'),()=>surface.focus({preventScroll:true}));resetEditorNavigation=()=>editorNavigation.reset();
const joystick=$('#stick3');function joystickMove(e){const r=joystick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/36,z=(e.clientY-r.top-r.height/2)/36,l=Math.hypot(x,z);if(l>1){x/=l;z/=l;}stick={x,z};$('#stick3 .edit-stick-thumb').style.transform=`translate(${x*24}px,${z*24}px)`;}joystick.onpointerdown=e=>{e.preventDefault();if(joystickPointer!==null)return;joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystickMove(e);};joystick.onpointermove=e=>{if(joystickPointer===e.pointerId)joystickMove(e);};joystick.onpointerup=joystick.onpointercancel=joystick.onlostpointercapture=e=>{if(joystickPointer!==e.pointerId)return;joystickPointer=null;stick={x:0,z:0};$('#stick3 .edit-stick-thumb').style.transform='';};resetFire=bindHeldButton($('#fire3'),()=>{fireHeld=true;firePressed=true;},()=>fireHeld=false);$('#jump3').onpointerdown=e=>{e.preventDefault();jumpPressed=true;};
function openDialog(id){if(mode==='play')setMode('edit');$(id).showModal();}$('#help3').onclick=()=>openDialog('#help-dialog3');$('#files3').onclick=()=>openDialog('#files-dialog3');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#export3').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(project.title.replace(/[<>:"/\\|?*]/g,'_')||'3Dゲーム')+'.3d.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('3D作品を保存しました');};
function loadProject(p){initializeCharacterDefaults(p,part);project=p;workshop.palette();selected=null;$('#title3').value=p.title;editTarget.set(project.spawn.x,0,project.spawn.z);editDistance=30;spawnMark.position.set(p.spawn.x,.015,p.spawn.z);save();setMode('edit');objectList();inspector();weaponFields();}
$('#import3').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>MAX_PROJECT_BYTES)throw Error('ファイルが大きすぎます');const p=validate3D(JSON.parse(await f.text()));if(await confirmReplace('今の3D作品を、読み込んだ作品に置き換えます。')){loadProject(p);$('#files-dialog3').close();toast('3D作品を読み込みました');}}catch(err){toast(err instanceof SyntaxError?'作品を読み込めませんでした':err.message);}finally{e.target.value='';}};$('#new3').onclick=async()=>{if(await confirmReplace('今の3D作品をまっさらなステージに置き換えますか？ 必要なら先にファイルに保存してください。'))loadProject(fresh3D());};
function positionCamera(){const hasGun=syncHeldGun();if(mode==='edit'){camera.position.set(editTarget.x+Math.sin(editYaw)*Math.cos(editPitch)*editDistance,editTarget.y+Math.sin(editPitch)*editDistance,editTarget.z+Math.cos(editYaw)*Math.cos(editPitch)*editDistance);camera.lookAt(editTarget);playerMesh.position.set(project.spawn.x,project.spawn.y,project.spawn.z);playerMesh.rotation.y=0;playerMesh.visible=!commonPreview;gun.visible=false;}else{const p=game.player,aimPitch=clamp(pitch+(game.recoilPitch||0),-1.2,1.35),forward=new T.Vector3(-Math.sin(yaw)*Math.cos(aimPitch),Math.sin(aimPitch),-Math.cos(yaw)*Math.cos(aimPitch)),eye=new T.Vector3(p.x,p.y+1.5,p.z);if(perspective==='fps'){camera.position.copy(eye);camera.lookAt(eye.clone().add(forward));playerMesh.visible=false;gun.visible=hasGun;}else{const desired=eye.clone().addScaledVector(forward,-4.5).add(new T.Vector3(0,.6,0));const offset=desired.clone().sub(eye),distance=offset.length();ray.set(eye,offset.normalize());const obstruct=ray.intersectObjects(solidMeshes,true).find(h=>h.distance<distance);camera.position.copy(eye).addScaledVector(offset,obstruct?Math.max(.15,obstruct.distance-.2):distance);camera.position.y=Math.max(.3,camera.position.y);camera.lookAt(eye.clone().addScaledVector(forward,20));playerMesh.visible=obstruct?obstruct.distance>1:true;gun.visible=false;}playerMesh.position.set(p.x,p.y,p.z);playerMesh.rotation.y=yaw;const moving=Math.hypot(stick.x,stick.z)>0||['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(k=>keys.has(k));playerMesh.userData.limbs.forEach((limb,i)=>limb.rotation.x=moving?Math.sin(game.time*10)*(i%2?1:-1)*.45:0);playerMesh.visible&&=!(p.invincible>0&&Math.floor(p.invincible*10)%2===1);}}
let lastMessageId=0,inventoryStamp='',reticleStamp='';
const effectPool=[],bulletPool=[];function syncGameMeshes(){
 const equipped=project.loadout[game.equipped],jitter=equipped?.effect==='shoot'?(equipped.aimJitter||0):0,stampAim=jitter+':'+view.clientHeight;
 if(reticleStamp!==stampAim){reticleStamp=stampAim;$('#crosshair').style.setProperty('--aim-size',(view.clientHeight*Math.tan(jitter*Math.PI/180)/Math.tan(camera.fov*Math.PI/360))+'px');$('#crosshair').classList.toggle('has-jitter',jitter>0);}
 const visibleObjects=[...game.objects,...game.drops],live=new Set(visibleObjects.map(o=>o.id));for(const [id,mesh] of meshes)if(!live.has(id)){objectsGroup.remove(mesh);meshes.delete(id);}
 for(const o of visibleObjects){let mesh=meshes.get(o.id);if(!mesh){mesh=partModel(o);mesh.userData.id=o.id;objectsGroup.add(mesh);meshes.set(o.id,mesh);}if(!mesh)continue;mesh.position.set(o.x,o.y,o.z);mesh.visible=!o.collected&&!o.hidden;
  if(DESTRUCTIBLE_TYPES.has(o.type)||o.type==='enemy')mesh.traverse(child=>{if(child.isMesh){child.userData.baseMaterial??=child.material;child.material=o.hitUntil>game.time?materials.hitFlash:child.userData.baseMaterial;}});
  if(o.type==='enemy')mesh.rotation.y=enemyYaw(o,game.player);if(o.type==='ally')mesh.rotation.y=o.heading||0;if(o.type==='plate')mesh.userData.pad.position.y=o.pressed?.075:.13;
  if(['star','key','weapon','blockItem'].includes(o.type))mesh.rotation.y=game.time;
  if(o.type==='door')updateDoorModel(mesh,o);
  if(o.type==='goal')mesh.userData.portal.material=conditionMet(o,game)?materials.ready:materials.goal;
  if(o.type==='checkpoint')mesh.userData.flag.material=game.checkpoint?.id===o.id?materials.ready:materials.checkpoint;
 }
 structureRenderer.sync(visibleObjects,meshes,game.time);solidMeshes=[...new Set(solids(game.objects).map(o=>meshes.get(o.sourceDoorId||o.id)).filter(Boolean))];
 while(bulletPool.length<game.bullets.length&&bulletPool.length<LIMITS.bullets){const group=new T.Group(),ball=new T.Mesh(sphere,materials.bullet),rocket=new T.Mesh(rocketGeometry,materials.rocket);group.add(ball,rocket);group.userData.ball=ball;group.userData.rocket=rocket;bulletPool.push(group);bulletGroup.add(group);}
 bulletPool.forEach((m,i)=>{const b=game.bullets[i];m.visible=!!b;if(b){m.position.set(b.x,b.y,b.z);const r=b.radius||.1,isRocket=b.projectile==='rocket';m.userData.ball.visible=!isRocket;m.userData.rocket.visible=isRocket;m.userData.ball.scale.setScalar(r/.09);m.userData.ball.material=b.enemy?materials.enemyBullet:materials.bullet;m.userData.rocket.scale.set(r,r*2,r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(b.vx,b.vy,b.vz).normalize());}});
 while(effectPool.length<game.effects.length&&effectPool.length<LIMITS.effects){const m=new T.Mesh(starGeometry,new T.MeshBasicMaterial({color:'#ffb86e',transparent:true,opacity:.4,depthWrite:false}));effectPool.push(m);bulletGroup.add(m);}
 effectPool.forEach((m,i)=>{const e=game.effects[i];m.visible=!!e;if(e){const progress=1-e.life/e.maxLife;m.position.set(e.x,e.y,e.z);m.scale.setScalar(e.radius*(.3+.7*progress)/.45);m.material.color.set(e.kind==='blast'?'#ffb86e':'#fff5cd');m.material.opacity=(1-progress)*.45;}});
 const hit=game.hitInfo;$('#hit-info3').hidden=!(hit&&hit.until>game.time);if(hit&&hit.until>game.time)setReadingText($('#hit-info3'),hit.hp===0?hit.name+'をこわした！':hit.name+'　体力 '+hit.hp+' / '+hit.maxHp);
 const stamp=game.inventory.join(',')+':'+Object.entries(game.inventoryCounts||{}).map(([id,count])=>id+'='+count).join(',')+':'+game.equipped+':'+game.blockEquipped+':'+game.blockInventory.map(s=>s.id+'='+s.count).join(',');if(buildCount!==game.buildings.length||inventoryStamp!==stamp){buildCount=game.buildings.length;inventoryStamp=stamp;toolsUI.renderHotbar();}
 if(game.messageId!==lastMessageId){lastMessageId=game.messageId;toast(game.message);}
}
function editorCandidate(event){if(tool==='select'||tool==='erase')return null;const hit=hits(event,[objectsGroup,ground]).find(visibleHit);if(!hit)return null;const target=project.objects.find(o=>o.id===objectId(hit.object))||null,normal=hit.face?hit.face.normal.clone().transformDirection(hit.object.matrixWorld):null,piece=snapEditorPiece(tool==='door'?configureDoor(part(tool),doorPreset):tool==='weapon'?{...part(tool),weaponId:weaponPresetId}:part(tool),hit.point,target,normal,project);if(piece.type==='enemy')Object.assign(piece,defaultEnemyRanges(piece));return {piece,reason:editorPlacementReason(piece,project.objects,project.spawn,project)};}
function showGhost(o,valid){const shape=[o.type,o.rotation||0,o.w,o.h,o.d].join(':');if(shape!==ghostShape){ghost.clear();if(Object.hasOwn(BUILD_TYPES,o.type))ghost.add(structureModel(o,ghostMaterial));else if(o.type==='door')ghost.add(makeDoorModel(o,{door:ghostMaterial,wall:ghostMaterial,dark:ghostMaterial,star:ghostMaterial}));else box(ghost,ghostMaterial,0,o.h/2,0,o.w,o.h,o.d);ghostShape=shape;}ghost.position.set(o.x,o.y,o.z);ghostMaterial.color.set(valid?0x53d9b4:0xee8592);ghost.visible=true;}
function updateEditorGhost(){syncPlacementUI();if(placementLook||isLiveRangeEditing()||look?.drag){ghost.visible=false;return;}if(!editorPointer||!withinSurface(editorPointer)||!GRID_PARTS.has(tool)){ghost.visible=false;return;}const candidate=editorCandidate(editorPointer);if(!candidate){ghost.visible=false;return;}showGhost(candidate.piece,!candidate.reason);}
function visibleHit(hit){let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}return true;}
function buildTarget(){ray.setFromCamera(new T.Vector2(0,0),camera);const hit=ray.intersectObjects([...objectsGroup.children,ground],true).find(h=>h.point.distanceTo(new T.Vector3(game.player.x,game.player.y+1.35,game.player.z))<8&&visibleHit(h));if(hit){const p=hit.point.clone();if(hit.face)p.addScaledVector(hit.face.normal.clone().transformDirection(hit.object.matrixWorld),.03);const surface=game.objects.find(o=>o.id===objectId(hit.object))||null,normal=hit.face?hit.face.normal.clone().transformDirection(hit.object.matrixWorld):null;return {x:p.x,y:p.y,z:p.z,surface,normal};}const p=game.player;return {x:p.x-Math.sin(yaw)*6,y:Math.floor(p.y/3)*3,z:p.z-Math.cos(yaw)*6};}
function updateGhost(point){const tool=project.loadout[game.equipped],building=!!game.blockEquipped||(tool&&tool.effect!=='shoot');ghost.visible=!!building;if(!building)return;const result=game.blockEquipped?blockPlacement(game,point,toolsUI.getRotation(yaw),toolsUI.getLevel()):placement(game,tool,point,toolsUI.getRotation(yaw),toolsUI.getLevel()),o=result.piece;setReadingText($('#build-status3'),result.reason);$('#build-status3').classList.toggle('blocked',!result.valid);if(!o){ghost.visible=false;return;}showGhost(o,result.valid);}

function frame(time){const dt=lastTime?Math.min((time-lastTime)/1000,.033):0;lastTime=time;const w=view.clientWidth,h=view.clientHeight;const size=renderer.getSize(new T.Vector2());if(size.x!==w||size.y!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}if(mode==='play'){positionCamera();ray.setFromCamera(new T.Vector2(0,0),camera);const hit=ray.intersectObjects(objectsGroup.children,true).find(visibleHit),target=hit?hit.point:ray.ray.at(80,new T.Vector3()),origin=new T.Vector3(game.player.x,game.player.y+1.35,game.player.z),aim=target.clone().sub(origin).normalize(),buildPoint=buildTarget();if(!talkDialog.open)step3D(game,project,{x:stick.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z:stick.z+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),allyCommand,yaw,aim,aimTarget:target,getShotOrigin:()=>{positionCamera();return worldGunMuzzle((perspective==='fps'?gun:carriedGun).children[0]);},buildPoint,buildRotation:toolsUI.getRotation(yaw),buildLevel:toolsUI.getLevel(),jump:jumpPressed,useDoor:doorPressed,fire:fireHeld||firePressed||keys.has('f')},dt);allyCommand=null;jumpPressed=false;doorPressed=false;firePressed=false;syncGameMeshes();showAllyCommands();const door=game.state==='playing'?nearbyDoor(game,yaw):null;$('#use-door3').hidden=!door;if(door)setReadingText($('#use-door3'),door.open?'ドアをしめる':'ドアをあける');updateGhost(buildPoint);setReadingText($('#hp3'),game.player.maxHp>10?'♥ '+Math.max(0,game.player.hp)+' / '+game.player.maxHp:'♥'.repeat(Math.max(0,game.player.hp))+'♡'.repeat(game.player.maxHp-Math.max(0,game.player.hp)));setReadingText($('#score3'),`✦ ${game.stars}　⚿ ${game.keys}　得点 ${game.score}`);$('#lost3').hidden=game.state==='playing';setReadingText($('#result-title3'),game.state==='won'?'ステージクリア！':'もう一度チャレンジ！');setReadingText($('#result-note3'),game.state==='won'?'自分のルールで、ちゃんとゲームになったね！':'セーブポイントを置くと、途中からやり直せるよ。');}else{const typing=document.activeElement?.matches('input,select,textarea'),dialogOpen=!!document.querySelector('dialog[open]');if(!typing&&!dialogOpen&&!look?.drag){const nav=editorNavigation.read();moveEditorCamera(editTarget,{x:nav.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z:nav.z+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),y:nav.y+Number(keys.has('e'))-Number(keys.has('q')),fast:keys.has('shift')},editYaw,editDistance,dt,project,editPitch);}else editorNavigation.reset();$('#hit-info3').hidden=true;positionCamera();updateEditorGhost();effectPool.forEach(m=>m.visible=false);bulletPool.forEach(m=>m.visible=false);setReadingText($('#stats3'),`${worldSize(project)}m × ${worldSize(project)}m · ${project.objects.length} パーツ`);}const rangeEditing=mode==='edit'&&isLiveRangeEditing();updateAttackContext(rangeEditing);floorRangeView.update(rangeEditing,editedObject());rangeOverlay.material.depthTest=!rangeEditing;rangeOverlay.renderOrder=rangeEditing?1:0;playRanges.update(game,mode==='play',time);positionCamera();enemyMessages.update(game,mode==='play',playRanges.getTarget(),camera,time);animatePickupGuns(time);renderer.render(scene,camera);requestAnimationFrame(frame);}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').hidden=false;setReadingText($('#loading'),'3Dの表示が中断されました。ページを再読み込みしてください。作品は自動保存されています。');});const toolsUI=createToolsUI({onCatalogChange:()=>{rebuild();inspector();renderPlayerRules();},onAppearanceChange:()=>rebuild(),$,getProject:()=>project,getGame:()=>game,getMode:()=>mode,field,save,refresh:()=>syncGameMeshes(),finishBuilding:count=>{selected=null;setMode('edit');objectList();inspector();toast(count+'個の建築を作品に残しました');}});
const workshop=createWorkshop({setCommonPreview:object=>{
 if(object&&!commonPreview)commonCamera={target:editTarget.clone(),yaw:editYaw,pitch:editPitch,distance:editDistance};
 commonPreview=object;setReadingText($('#mode3'),object?'基本設定の見本ステージ':'つくるモード');
 $('main').classList.toggle('common-preview',!!object);$('#common-preview-actions3').hidden=!object;
 for(const id of ['#files3','#new3','#tools-open3','#rules-open3'])$(id).disabled=!!object;
 if(object){editTarget.set(object.x,object.y,object.z);editYaw=0;editPitch=1.4;editDistance=38;}
 else if(commonCamera){editTarget.copy(commonCamera.target);editYaw=commonCamera.yaw;editPitch=commonCamera.pitch;editDistance=commonCamera.distance;commonCamera=null;}
 rebuild();
},previewPatrol:route=>{const o=editedObject();patrolOverlay.show(route,o?.y||0,enemyRangeView==='waypoints'&&(o?.routeEnd||'loop')==='loop');},lookFromAbove:({facing=false}={})=>{const o=editedObject();if(o){editTarget.set(o.x,enemyEditHeight(o),o.z);editYaw=facing?(o.facing||0)*Math.PI/180:0;editPitch=1.4;editDistance=38;}},getToolSelection:()=>({type:tool}),getRangeView:()=>enemyRangeView,showRange:key=>{enemyRangeView=key;updateSelection();},refreshRange:updateSelection,renderLoadout:()=>toolsUI.renderLauncher(),$,getProject:()=>project,getSelected:()=>selected,select:id=>selected=id,save,rebuild,field,advancedInspector,advancedWeaponFields,loadProject,toast,objectList,setTool:(id,preset)=>{if(preset&&id==='door')doorPreset=preset;if(preset&&id==='weapon')weaponPresetId=preset;if(mode==='play')setMode('edit');tool=id;placementLook=false;editorPointer=null;syncPlacementUI();document.querySelectorAll('[data-part]').forEach(x=>{const active=x.dataset.part===id;x.classList.toggle('active',active);if(x.hasAttribute('data-editor-tool'))x.setAttribute('aria-pressed',String(active));});}});
function inspector(){closeLiveRangeEditor();workshop.inspect();}
$('#common-preview-back3').onclick=()=>workshop.resumeBasic();$('#common-preview-done3').onclick=()=>workshop.finishBasic();
function renderPlayerRules(){
 const root=$('#player-rules3');root.replaceChildren();
 const rules=project.playerRules||{hp:5,speed:5,jumpHeight:49/38};
 for(const [key,label,min,max,step]of [['hp','プレイヤーの体力',1,100,1],['speed','歩く速さ',1,12,.5],['jumpHeight','ジャンプの高さ（m）',.5,8,.1]]){
  field(root,label,rules[key],min,max,step,n=>{project.playerRules??={...rules};project.playerRules[key]=n;});
 }
 const title=document.createElement('p');setReadingText(title,'最初に持つ銃');root.append(title);
 for(const gun of project.loadout){
  const row=document.createElement('label'),input=document.createElement('input'),label=document.createElement('span');
  row.className='enemy-attack-toggle';input.type='checkbox';input.checked=!gun.pickupOnly;setReadingText(label,gun.name);
  input.onchange=()=>{gun.pickupOnly=!input.checked;save();};row.append(input,label);root.append(row);
 }
}
function weaponFields(){workshop.weapons();renderPlayerRules();}
createWorldUI({getProject:()=>project,beforeOpen:()=>{if(mode==='play')setMode('edit');},center:()=>editTarget,resize:size=>{project.worldSize=size;updateWorld();save();inspector();},focus:point=>{editTarget.set(point.x,0,point.z);editDistance=30;},spawn:point=>{project.spawn={...point,y:0};spawnMark.position.set(point.x,.015,point.z);save();toast('スタートを動かしました');}});
rebuild();objectList();inspector();weaponFields();$('#loading').hidden=true;applyReadings(document.body);requestAnimationFrame(frame);

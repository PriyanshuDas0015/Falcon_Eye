import * as THREE from "/vendor/three/three.module.js";
import {motion,supportsWebGL} from "./motion.js";

function disposeObject(root){
 root.traverse(object=>{
  object.geometry?.dispose();
  if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());
  else object.material?.dispose();
 });
}

function pointOnSphere(radius,latitude,longitude){
 const phi=(90-latitude)*Math.PI/180,theta=(longitude+180)*Math.PI/180;
 return new THREE.Vector3(-radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta));
}

function addOrbit(scene,rotation,opacity=.24){
 const orbit=new THREE.Mesh(
  new THREE.TorusGeometry(2.35,.005,8,160),
  new THREE.MeshBasicMaterial({color:0x6bd7e9,transparent:true,opacity})
 );
 orbit.rotation.set(...rotation);
 scene.add(orbit);
}

function createSatellite(){
 const satellite=new THREE.Group();
 const bodyMaterial=new THREE.MeshStandardMaterial({color:0xc9e6ec,metalness:.75,roughness:.3});
 const panelMaterial=new THREE.MeshStandardMaterial({color:0x17627b,metalness:.45,roughness:.35});
 const body=new THREE.Mesh(new THREE.BoxGeometry(.14,.11,.2),bodyMaterial);
 const leftPanel=new THREE.Mesh(new THREE.BoxGeometry(.34,.012,.14),panelMaterial);
 const rightPanel=leftPanel.clone();
 leftPanel.position.x=-.25;
 rightPanel.position.x=.25;
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.15,8),bodyMaterial);
 mast.position.y=.12;
 const antenna=new THREE.Mesh(new THREE.ConeGeometry(.07,.035,18,1,true),bodyMaterial);
 antenna.position.y=.205;
 antenna.rotation.x=Math.PI;
 satellite.add(body,leftPanel,rightPanel,mast,antenna);
 satellite.position.set(2.35,0,0);
 satellite.scale.setScalar(.85);
 return satellite;
}

export function createEarthScene(container){
 if(!container||!supportsWebGL()){
  container?.classList.add("scene-fallback");
  return()=>{};
 }

 let renderer,frame=0,visible=!document.hidden,disposed=false,pointerX=0,pointerY=0,earthTexture;
 try{
  const canvas=container.querySelector("canvas"),scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,100);
  camera.position.set(0,0,6.7);
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!motion.mobile,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,motion.mobile?1.25:2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;

  const world=new THREE.Group();
  world.rotation.y=-.45;
  scene.add(world);
  const earthMaterial=new THREE.MeshStandardMaterial({color:0x4d7180,roughness:.82,metalness:.05,emissive:0x03101a,emissiveIntensity:.28});
  const earth=new THREE.Mesh(new THREE.SphereGeometry(1.72,motion.mobile?40:72,motion.mobile?28:54),earthMaterial);
  world.add(earth);
  new THREE.TextureLoader().load("/assets/imagery/earth-blue-marble.jpg",texture=>{
   if(disposed){texture.dispose();return;}
   texture.colorSpace=THREE.SRGBColorSpace;
   texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   earthTexture=texture;
   earthMaterial.map=texture;
   earthMaterial.color.set(0xffffff);
   earthMaterial.needsUpdate=true;
  },undefined,()=>container.classList.add("texture-fallback"));

  const grid=new THREE.Mesh(
   new THREE.SphereGeometry(1.735,motion.mobile?24:48,motion.mobile?16:32),
   new THREE.MeshBasicMaterial({color:0x7addf0,wireframe:true,transparent:true,opacity:.075})
  );
  world.add(grid);
  const atmosphere=new THREE.Mesh(
   new THREE.SphereGeometry(1.86,48,32),
   new THREE.MeshBasicMaterial({color:0x27b8d9,side:THREE.BackSide,transparent:true,opacity:.13,blending:THREE.AdditiveBlending})
  );
  world.add(atmosphere);

  scene.add(new THREE.HemisphereLight(0x90e7f3,0x020710,.62));
  const daylight=new THREE.DirectionalLight(0xd9f8ff,3.8);
  daylight.position.set(-3.4,2.2,4.5);
  scene.add(daylight);
  const rimLight=new THREE.PointLight(0x38b9dc,4.2,12);
  rimLight.position.set(3,-1,2.5);
  scene.add(rimLight);

  const nodes=new THREE.Group();
  for(const[lat,lng]of[[28.6,77.2],[51.5,-.1],[-1.3,36.8],[35.7,139.7],[-33.9,151.2],[40.7,-74],[19.4,-99.1]]){
   const dot=new THREE.Mesh(new THREE.SphereGeometry(.025,10,10),new THREE.MeshBasicMaterial({color:0x8cecff}));
   dot.position.copy(pointOnSphere(1.77,lat,lng));
   nodes.add(dot);
  }
  world.add(nodes);

  const arcMovers=[];
  if(!motion.mobile){
   for(const[index,pair]of[[[28.6,77.2],[51.5,-.1]],[[35.7,139.7],[-33.9,151.2]],[[40.7,-74],[19.4,-99.1]]].entries()){
    const start=pointOnSphere(1.76,...pair[0]),end=pointOnSphere(1.76,...pair[1]);
    const middle=start.clone().add(end).multiplyScalar(.5).normalize().multiplyScalar(2.25);
    const curve=new THREE.QuadraticBezierCurve3(start,middle,end);
    world.add(new THREE.Line(
     new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
     new THREE.LineBasicMaterial({color:0x58c8df,transparent:true,opacity:.3})
    ));
    const mover=new THREE.Mesh(new THREE.SphereGeometry(.018,8,8),new THREE.MeshBasicMaterial({color:0xc4f7ff}));
    world.add(mover);
    arcMovers.push({curve,mover,offset:index*.34,speed:.035+index*.006});
   }
  }

  addOrbit(scene,[1.12,.25,0],.38);
  if(!motion.mobile){
   addOrbit(scene,[.74,-.45,.3],.18);
   addOrbit(scene,[1.42,.58,-.32],.15);
  }
  const satellitePivot=new THREE.Group();
  satellitePivot.rotation.x=1.12;
  satellitePivot.rotation.y=.25;
  satellitePivot.add(createSatellite());
  scene.add(satellitePivot);

  const particleCount=motion.mobile?55:motion.tablet?100:170;
  const positions=new Float32Array(particleCount*3);
  for(let i=0;i<particleCount;i++){
   const radius=3+Math.random()*4,angle=Math.random()*Math.PI*2;
   positions[i*3]=Math.cos(angle)*radius;
   positions[i*3+1]=(Math.random()-.5)*5.5;
   positions[i*3+2]=Math.sin(angle)*radius-1;
  }
  const starsGeometry=new THREE.BufferGeometry();
  starsGeometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
  const stars=new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:0xa9dce6,size:.018,transparent:true,opacity:.5}));
  scene.add(stars);

  const resize=()=>{
   const width=container.clientWidth,height=container.clientHeight;
   if(!width||!height)return;
   renderer.setSize(width,height,false);
   camera.aspect=width/height;
   camera.updateProjectionMatrix();
  };
  const pointer=event=>{
   if(motion.mobile||motion.coarse)return;
   const rect=container.getBoundingClientRect();
   pointerX=((event.clientX-rect.left)/rect.width-.5)*.18;
   pointerY=((event.clientY-rect.top)/rect.height-.5)*.12;
  };
  const visibility=()=>{
   visible=!document.hidden;
   if(visible&&!frame&&!motion.reduced)frame=requestAnimationFrame(render);
  };
  const startedAt=window.performance.now();
  function render(){
   frame=0;
   if(disposed||!visible)return;
   const elapsed=(window.performance.now()-startedAt)/1000;
   world.rotation.y+=.00042;
   world.rotation.x+=(pointerY-world.rotation.x)*.025;
   camera.position.x+=(pointerX-camera.position.x)*.018;
   satellitePivot.rotation.z=elapsed*.095;
   stars.rotation.y=elapsed*.004;
   arcMovers.forEach(({curve,mover,offset,speed})=>mover.position.copy(curve.getPoint((elapsed*speed+offset)%1)));
   renderer.render(scene,camera);
   if(!motion.reduced)frame=requestAnimationFrame(render);
  }

  resize();
  render();
  window.addEventListener("resize",resize,{passive:true});
  container.addEventListener("pointermove",pointer,{passive:true});
  document.addEventListener("visibilitychange",visibility);
  const cleanup=()=>{
   if(disposed)return;
   disposed=true;
   cancelAnimationFrame(frame);
   window.removeEventListener("resize",resize);
   container.removeEventListener("pointermove",pointer);
   document.removeEventListener("visibilitychange",visibility);
   earthTexture?.dispose();
   disposeObject(scene);
   renderer.dispose();
   renderer.forceContextLoss();
  };
  window.addEventListener("pagehide",cleanup,{once:true});
  container.classList.add("scene-ready");
  return cleanup;
 }catch(error){
  console.warn("Falcon Eye 3D scene fallback:",error.message);
  container.classList.add("scene-fallback");
  renderer?.dispose();
  return()=>{};
 }
}

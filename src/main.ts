import * as T from 'three';
import { buildTerrain } from './world/terrain';
import { buildVillage } from './world/village';
import { bake } from './world/geometry';
import { Water, waterGeometry } from './world/water';
import { Lighting } from './world/lighting';
import { Finish } from './world/postprocessing';
import { Interaction } from './interaction';
import { buildUI } from './ui';
import './style.css';

const mobile=matchMedia('(max-width:700px)').matches;
let high=!mobile,water:Water,lighting:Lighting,interaction:Interaction,renderer:T.WebGLRenderer,finish:Finish;
let qualityMode='auto';
let elapsed=0,lighthouseOn:boolean|null=null;
const root=document.querySelector<HTMLElement>('#app')!;
buildUI(root,{
  sea:s=>water?.setPreset(s),color:c=>water?.setCustom(c),time:s=>lighting?.setTime(s),
  reset:()=>interaction?.reset(),strength:n=>{if(interaction)interaction.strength=n;},
  quality:s=>{qualityMode=s;setQuality(s==='auto'?!matchMedia('(max-width:700px)').matches:s==='high');},
});
const container=document.querySelector<HTMLElement>('#world')!;
const scene=new T.Scene();
const camera=new T.OrthographicCamera(-20,20,14,-14,.1,180);
const staticWorld=new T.Group(),dynamic=new T.Group();dynamic.name='Boats, birds and lighthouse';
const occluders:T.Object3D[]=[];
let extras:ReturnType<typeof buildVillage>;
const lanterns:T.PointLight[]=[];
let frame=0,lastTime=0,animationId=0,smoothedFps=60,lastDiagnostics=0;

async function init(){
  try {
    renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.7:1.15));renderer.setSize(innerWidth,innerHeight);
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.localClippingEnabled=true;
    renderer.domElement.setAttribute('aria-label','Porto Luce. Move over the sea to create ripples; drag the land to rotate the miniature.');
    container.append(renderer.domElement);
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    buildTerrain(staticWorld,occluders);extras=buildVillage(staticWorld,occluders,dynamic);
    const village=bake(staticWorld);scene.add(village,dynamic);scene.updateMatrixWorld(true);
    water=new Water(scene,high);lighting=new Lighting(scene,high);finish=new Finish(renderer,scene,camera,high);
    for(const [x,y,z]of[[.5,4,4.5],[-4.3,4.1,1.15],[6.5,3.4,4.8]]){const l=new T.PointLight('#ffd198',0,4,2);l.position.set(x,y,z);lanterns.push(l);scene.add(l);}
    interaction=new Interaction(renderer.domElement,camera,water,[...occluders,...extras.boats],()=>elapsed,[
      {objects:[extras.lighthouse],run:()=>{lighthouseOn=!(lighthouseOn??lighting.night>.2);}},
      ...extras.boats.map(b=>({objects:[b],run:()=>{b.userData.moving=!b.userData.moving;}})),
    ]);
    resize();interaction.update(1);water.reflect(renderer,scene,camera,interaction.target);finish.render(scene,camera);
    document.querySelector('#loading')!.classList.add('done');
    lastTime=performance.now();animationId=requestAnimationFrame(animate);
    window.addEventListener('resize',resize);
    document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(animationId);showError('The graphics context was interrupted. Reload to return to Porto Luce.');});
    // Small read-only diagnostics for repeatable real-browser checks.
    Object.assign(window,{__porto:{
      snapshot:()=>({elapsed,fps:Math.round(smoothedFps),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,ripples:water.ripples.filter(r=>elapsed-r.z<9&&r.w>0).length,zoom:camera.zoom,yaw:interaction.yaw,sun:lighting.sun.position.toArray(),night:lighting.night,sea:water.mesh.material.uniforms.uShallow.value.getHexString(),boats:extras.boats.map(b=>b.userData.moving),lighthouse:lighthouseOn}),
      project:(x:number,y:number,z:number)=>{const p=new T.Vector3(x,y,z).project(camera);return{x:(p.x+1)/2*innerWidth,y:(1-p.y)/2*innerHeight};},
    }});
  }catch(error){console.error(error);showError(renderer?'The miniature could not finish loading. Please reload to try again.':'This little world needs WebGL2. Please use a browser with hardware acceleration enabled.');}
}
function showError(message:string){const loading=document.querySelector<HTMLElement>('#loading')!;loading.classList.remove('done');loading.innerHTML=`<div class="error-message"><p>${message}</p><button onclick="location.reload()">Try again ↗</button></div>`;}
function resize(){
  const aspect=innerWidth/innerHeight,narrow=innerWidth<=700,half=narrow?Math.max(17,12.5/aspect):innerWidth<1050?17.5:14;
  const shiftX=narrow?0:innerWidth<1050?1.1:3.5,shiftY=narrow?3.2:innerWidth<1050?1.7:1;
  camera.left=-half*aspect-shiftX;camera.right=half*aspect-shiftX;camera.top=half+shiftY;camera.bottom=-half+shiftY;camera.updateProjectionMatrix();
  renderer?.setSize(innerWidth,innerHeight);
  if(qualityMode==='auto'&&high===narrow)setQuality(!narrow);
  finish?.resize();
}
function setQuality(value:boolean){
  high=value;if(!renderer||!water)return;
  renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.7:1.15));
  finish.enabled=high;finish.resize();
  water.mesh.geometry.dispose();water.mesh.geometry=waterGeometry(high);
  lighting.sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);lighting.sun.shadow.map?.dispose();lighting.sun.shadow.map=null;lighting.sun.shadow.needsUpdate=true;
}
function animate(now:number){
  const rawDt=(now-lastTime)/1000,dt=Math.min(rawDt,.05);lastTime=now;elapsed+=dt;smoothedFps=smoothedFps*.97+Math.min(1/Math.max(rawDt,.001),120)*.03;
  interaction.update(dt);lighting.update(dt,renderer,water);water.update(elapsed,dt);
  for(let i=0;i<extras.boats.length;i++){const b=extras.boats[i],moving=b.userData.moving;
    b.position.y=.12+Math.sin(elapsed*.9+i*2)*.055;b.rotation.z=Math.sin(elapsed*.7+i)*.027;b.rotation.x=Math.sin(elapsed*.8+i)*.024;
    if(moving){b.userData.phase=(b.userData.phase??0)+dt*.14;const phase=b.userData.phase;b.position.x=b.userData.homeX+Math.sin(phase)*1.1;b.position.z=b.userData.homeZ+(1-Math.cos(phase))*.75;b.rotation.y=phase*.45;}
  }
  for(let i=0;i<extras.birds.length;i++){const b=extras.birds[i],t=elapsed*.09+i*1.05;b.position.set(Math.cos(t)*(11+i*.3),9.5+Math.sin(t*2+i)*.8,Math.sin(t)*8);b.rotation.y=-t;b.children.forEach((wing,j)=>{wing.rotation.z=(j===0?-1:1)*(.15+Math.sin(elapsed*3.7+i)*.15);});}
  const beaconActive=lighthouseOn??lighting.night>.2,light=extras.lighthouseLight;light.intensity=T.MathUtils.lerp(light.intensity,beaconActive?32:0,1-Math.exp(-dt*4));light.target.position.set(Math.cos(elapsed*.22)*23,1,Math.sin(elapsed*.22)*23);
  extras.lighthouseBulb.visible=beaconActive;extras.beaconMaterial.emissiveIntensity=beaconActive?1.8:0;lanterns.forEach(l=>l.intensity=lighting.night*3.4);
  scene.updateMatrixWorld();renderer.info.autoReset=false;renderer.info.reset();if(frame++%(high?3:5)===0)water.reflect(renderer,scene,camera,interaction.target);
  finish.render(scene,camera);animationId=requestAnimationFrame(animate);
  if(now-lastDiagnostics>1000){lastDiagnostics=now;
    const project=(x:number,y:number,z:number)=>{const p=new T.Vector3(x,y,z).project(camera);return{x:Math.round((p.x+1)/2*innerWidth),y:Math.round((1-p.y)/2*innerHeight)};};
    container.dataset.diagnostics=JSON.stringify({fps:Math.round(smoothedFps),elapsed:Math.round(elapsed),geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,totalRipples:water.totalRipples,inputs:interaction.metrics,ripples:water.ripples.filter(r=>elapsed-r.z<9&&r.w>0).length,zoom:+camera.zoom.toFixed(3),yaw:+interaction.yaw.toFixed(3),sunY:+lighting.sun.position.y.toFixed(2),night:+lighting.night.toFixed(2),sea:water.mesh.material.uniforms.uShallow.value.getHexString(),lighthouse:lighthouseOn,boats:extras.boats.map(b=>!!b.userData.moving),points:{sea:project(12,0,12),land:project(0,4,0),lighthouse:project(8.35,4.9,3.8),boat:project(extras.boats[2].position.x,.2,extras.boats[2].position.z)}});
  }
}
window.addEventListener('pagehide',()=>{cancelAnimationFrame(animationId);interaction?.dispose();water?.dispose();finish?.dispose();scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){for(const v of Object.values(m)){if(v instanceof T.Texture)v.dispose();}m.dispose();}}});renderer?.dispose();});
void init();

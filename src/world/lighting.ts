import * as T from 'three';
import { M } from './materials';
import { Water } from './water';
import { AtmosphericSky } from './sky';
import { causticUniforms } from './seabed';
export const timePresets={
  Morning:{sky:'#d3eae4',zenith:'#719fc7',sun:'#fff0d1',ground:'#747c69',power:3.0,ambient:1.55,pos:[-16,20,-22],exposure:1.02,day:1},
  Noon:{sky:'#c4e4e8',zenith:'#578bbf',sun:'#fff8e5',ground:'#738c78',power:3.55,ambient:1.65,pos:[-13,33,-19],exposure:.98,day:1},
  'Golden Hour':{sky:'#e7c3b7',zenith:'#8e93b5',sun:'#ffd29c',ground:'#7b6c64',power:3.25,ambient:1.28,pos:[-16,11,-21],exposure:1.01,day:.72},
  Night:{sky:'#243647',zenith:'#0e1b33',sun:'#c3d8f6',ground:'#344556',power:.95,ambient:.85,pos:[-15,20,-22],exposure:.98,day:.08},
} as const;
export type TimePreset=keyof typeof timePresets;
export class Lighting {
  sun=new T.DirectionalLight();ambient=new T.HemisphereLight();
  bounce=new T.DirectionalLight('#d7e4ed',.72);
  atmosphere:AtmosphericSky;
  private sky=new T.Color();private target:TimePreset='Morning';night=0;day=1;
  private sunTarget=new T.Vector3();private tempColor=new T.Color();
  constructor(private scene:T.Scene,quality:boolean){
    const p=timePresets.Morning;this.sun.color.set(p.sun);this.sun.intensity=p.power;this.sun.position.set(...p.pos);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(quality?2048:1024,quality?2048:1024);Object.assign(this.sun.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:1,far:70});
    this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=.024;this.sun.shadow.radius=2.5;
    this.ambient.color.set(p.sky);this.ambient.groundColor.set(p.ground);this.ambient.intensity=p.ambient;
    this.bounce.position.set(8,9,20);this.sky.set(p.sky);scene.background=this.sky;scene.fog=new T.FogExp2(this.sky,.0017);scene.add(this.sun,this.ambient,this.bounce);this.atmosphere=new AtmosphericSky(scene);
  }
  setTime(name:TimePreset){this.target=name;}
  update(dt:number,renderer:T.WebGLRenderer,water:Water){
    const p=timePresets[this.target],f=1-Math.exp(-dt*1.6);this.sky.lerp(this.tempColor.set(p.sky),f);
    this.scene.fog?.color.copy(this.sky);
    this.sun.color.lerp(this.tempColor.set(p.sun),f);this.sun.position.lerp(this.sunTarget.set(p.pos[0],p.pos[1],p.pos[2]),f);this.sun.intensity=T.MathUtils.lerp(this.sun.intensity,p.power,f);
    this.ambient.color.lerp(this.tempColor.set(p.sky),f);this.ambient.groundColor.lerp(this.tempColor.set(p.ground),f);this.ambient.intensity=T.MathUtils.lerp(this.ambient.intensity,p.ambient,f);
    renderer.toneMappingExposure=T.MathUtils.lerp(renderer.toneMappingExposure,p.exposure,f);
    this.night=T.MathUtils.lerp(this.night,this.target==='Night'?1:0,f);this.day=T.MathUtils.lerp(this.day,p.day,f);
    this.bounce.intensity=.16+this.day*.56;
    M.glass.emissiveIntensity=this.night*1.5;M.light.emissiveIntensity=.05+this.night*3;
    const u=water.mesh.material.uniforms;u.uSky.value.copy(this.sky);u.uZenith.value.lerp(this.tempColor.set(p.zenith),f);u.uSunDirection.value.copy(this.sun.position).normalize();u.uSunColor.value.copy(this.sun.color);u.uDay.value=this.day;
    const sky=this.atmosphere.uniforms;sky.uHorizon.value.copy(this.sky);sky.uZenith.value.copy(u.uZenith.value);sky.uDirection.value.copy(u.uSunDirection.value);sky.uSun.value.copy(this.sun.color);sky.uDay.value=this.day;
    causticUniforms.uCausticDay.value=this.day;causticUniforms.uCausticSun.value.copy(u.uSunDirection.value);
    document.body.classList.toggle('is-night',this.target==='Night');
  }
}

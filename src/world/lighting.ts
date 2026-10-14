import * as T from 'three';
import { M } from './materials';
import { Water } from './water';
export const timePresets={
  Morning:{sky:'#dbe9e2',sun:'#fff0ce',ground:'#6e827a',power:3.1,ambient:2.1,pos:[-16,16,12],exposure:1.04,day:1},
  Noon:{sky:'#d9e9e8',sun:'#fff5df',ground:'#809085',power:3.5,ambient:2.25,pos:[-4,28,6],exposure:1.02,day:1},
  'Golden Hour':{sky:'#e8ded0',sun:'#ffd098',ground:'#7e7777',power:3.4,ambient:1.9,pos:[-19,10,8],exposure:1.03,day:.85},
  Night:{sky:'#263849',sun:'#9db7df',ground:'#2b4053',power:.8,ambient:.9,pos:[-10,17,-14],exposure:.86,day:.12},
} as const;
export type TimePreset=keyof typeof timePresets;
export class Lighting {
  sun=new T.DirectionalLight();ambient=new T.HemisphereLight();
  private sky=new T.Color();private target:TimePreset='Morning';night=0;day=1;
  private sunTarget=new T.Vector3();private tempColor=new T.Color();
  constructor(private scene:T.Scene,quality:boolean){
    const p=timePresets.Morning;this.sun.color.set(p.sun);this.sun.intensity=p.power;this.sun.position.set(...p.pos);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(quality?2048:1024,quality?2048:1024);Object.assign(this.sun.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:1,far:70});
    this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.035;this.sun.shadow.radius=3;
    this.ambient.color.set(p.sky);this.ambient.groundColor.set(p.ground);this.ambient.intensity=p.ambient;
    this.sky.set(p.sky);scene.background=this.sky;scene.fog=new T.FogExp2(this.sky,.004);scene.add(this.sun,this.ambient);
  }
  setTime(name:TimePreset){this.target=name;}
  update(dt:number,renderer:T.WebGLRenderer,water:Water){
    const p=timePresets[this.target],f=1-Math.exp(-dt*1.6);this.sky.lerp(this.tempColor.set(p.sky),f);
    this.sun.color.lerp(this.tempColor.set(p.sun),f);this.sun.position.lerp(this.sunTarget.set(p.pos[0],p.pos[1],p.pos[2]),f);this.sun.intensity=T.MathUtils.lerp(this.sun.intensity,p.power,f);
    this.ambient.color.lerp(this.tempColor.set(p.sky),f);this.ambient.groundColor.lerp(this.tempColor.set(p.ground),f);this.ambient.intensity=T.MathUtils.lerp(this.ambient.intensity,p.ambient,f);
    renderer.toneMappingExposure=T.MathUtils.lerp(renderer.toneMappingExposure,p.exposure,f);
    this.night=T.MathUtils.lerp(this.night,this.target==='Night'?1:0,f);this.day=T.MathUtils.lerp(this.day,p.day,f);
    M.glass.emissiveIntensity=this.night*1.5;M.light.emissiveIntensity=.05+this.night*3;
    water.mesh.material.uniforms.uSky.value.copy(this.sky);water.mesh.material.uniforms.uSunDirection.value.copy(this.sun.position).normalize();water.mesh.material.uniforms.uDay.value=this.day;
    document.body.classList.toggle('is-night',this.target==='Night');
  }
}

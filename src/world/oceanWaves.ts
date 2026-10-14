import { Bathymetry } from './bathymetry';
import { RippleField } from './rippleField';

// Direction, wavelength, amplitude, steepness, phase. GLSL is generated from this same definition.
export const waveSpectrum=[
  [.82,.57,16,.105,.28,.4],[.64,.77,10.4,.068,.32,2.1],[.97,-.24,6.5,.044,.25,4.3],
  [.4,.916,4.1,.028,.3,1.7],[-.28,.96,2.65,.017,.22,5.4],[.88,.47,1.7,.009,.22,.8],
  [.72,-.69,1.1,.005,.18,3.2],[-.63,.78,.76,.003,.15,2.9],
] as const;
function shorelineHeight(shore:number,slope:number,time:number){
  const gate=Math.exp(-Math.max(shore,0)*.38)*Math.max(0,Math.min(1,(shore+.6)*2));
  return Math.sin(shore*1.7+time*1.05+slope*2.5)*.027*gate;
}
export function naturalSurface(x:number,z:number,time:number,strength:number,depth:number,out:Float64Array){
  const attenuation=Math.min(1,Math.sqrt(Math.max(depth,.1)/2));let hx=0,hz=0,h=0;
  for(const [dx,dz,wavelength,amplitude,steepness,phase]of waveSpectrum){
    const k=2*Math.PI/wavelength,theta=(dx*x+dz*z)*k-time*Math.sqrt(9.81*k)*.38+phase,a=amplitude*strength*attenuation;
    h+=Math.sin(theta)*a;hx+=Math.cos(theta)*a*steepness*dx;hz+=Math.cos(theta)*a*steepness*dz;
  }
  out[0]=hx;out[1]=h;out[2]=hz;
}
const scratch=new Float64Array(3);
export function sampleSurfaceHeight(x:number,z:number,time:number,strength:number,field:Bathymetry,ripples:RippleField){
  let rx=x,rz=z;
  for(let i=0;i<3;i++){naturalSurface(rx,rz,time,strength,field.sample(rx,rz),scratch);rx=x-scratch[0];rz=z-scratch[2];}
  naturalSurface(rx,rz,time,strength,field.sample(rx,rz),scratch);
  return scratch[1]+shorelineHeight(field.sample(x,z,1),field.sample(x,z,3),time)+ripples.sample(x,z);
}
export const oceanWavesGLSL=`
uniform float uTime,uWaveStrength;
vec3 gerstner(vec2 p,float depth){
  vec3 displacement=vec3(0.0);float attenuation=min(1.0,sqrt(max(depth,.1)/2.0));
  ${waveSpectrum.map(([dx,dz,w,a,q,phase])=>`{
    vec2 direction=vec2(${dx.toFixed(6)},${dz.toFixed(6)});float k=${(2*Math.PI/w).toFixed(9)};
    float phase=dot(p,direction)*k-uTime*${(Math.sqrt(9.81*2*Math.PI/w)*.38).toFixed(9)}+${phase.toFixed(6)};
    float amplitude=${a.toFixed(6)}*uWaveStrength*attenuation;
    displacement.xz+=direction*cos(phase)*amplitude*${q.toFixed(6)};displacement.y+=sin(phase)*amplitude;
  }`).join('')}
  return displacement;
}
vec3 gerstnerNormal(vec2 p,float depth){
  vec3 tx=vec3(1,0,0),tz=vec3(0,0,1);float attenuation=min(1.0,sqrt(max(depth,.1)/2.0));
  ${waveSpectrum.map(([dx,dz,w,a,q,phase])=>`{
    vec2 d=vec2(${dx.toFixed(6)},${dz.toFixed(6)});float k=${(2*Math.PI/w).toFixed(9)};
    float phase=dot(p,d)*k-uTime*${(Math.sqrt(9.81*2*Math.PI/w)*.38).toFixed(9)}+${phase.toFixed(6)};
    float amplitude=${a.toFixed(6)}*uWaveStrength*attenuation;
    float horizontal=sin(phase)*amplitude*k*${q.toFixed(6)},vertical=cos(phase)*amplitude*k;
    tx+=vec3(-d.x*d.x*horizontal,d.x*vertical,-d.x*d.y*horizontal);
    tz+=vec3(-d.x*d.y*horizontal,d.y*vertical,-d.y*d.y*horizontal);
  }`).join('')}
  return normalize(cross(tz,tx));
}
float shoreHeight(vec4 field){
  float gate=exp(-max(field.y,0.0)*.38)*clamp((field.y+.6)*2.0,0.0,1.0);
  return sin(field.y*1.7+uTime*1.05+field.w*2.5)*.027*gate;
}
vec3 displacedPosition(vec2 p){
  vec3 d=gerstner(p,bathymetry(p).x);vec2 world=p+d.xz;
  return vec3(world.x,d.y+shoreHeight(bathymetry(world))+disturbance(world),world.y);
}
float surfaceHeight(vec2 p){
  vec2 rest=p;
  for(int i=0;i<3;i++)rest=p-gerstner(rest,bathymetry(rest).x).xz;
  return gerstner(rest,bathymetry(rest).x).y+shoreHeight(bathymetry(p))+disturbance(p);
}`;

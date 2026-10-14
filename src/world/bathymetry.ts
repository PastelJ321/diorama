import * as T from 'three';
import { radius } from './coastShape';

export const FIELD_EXTENT=48;
function hash(x:number,z:number){let n=Math.imul(x,374761393)+Math.imul(z,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x:number,z:number){const ix=Math.floor(x),iz=Math.floor(z);let fx=x-ix,fz=z-iz;fx=fx*fx*(3-2*fx);fz=fz*fz*(3-2*fz);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),fx),T.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),fx),fz);}
export function seabedAt(x:number,z:number){
  const angle=Math.atan2(z/8.2,x/10.8),shore=(Math.hypot(x/10.8,z/8.2)-radius(angle))*8.8;
  const shelf=Math.max(shore,0),n=noise(x*.29,z*.29),fine=noise(x*.9,z*.9);
  const inlet=Math.exp(-((x+5)**2/32+(z-11)**2/22))*1.7+Math.exp(-((x-13)**2/25+(z-2)**2/40))*1.1;
  // A gentle shelf avoids an artificial submerged horizon at the miniature's
  // viewing angle. Local sandbars remain irregular; deeper water absorbs detail.
  const depth=Math.max(.32,Math.min(38,.48+shelf*.43+(n-.5)*Math.min(shelf,3)*.23+(fine-.5)*.09-inlet));
  const substrate=T.MathUtils.smoothstep(n+.18*Math.sin(x*.7-z*.4),.43,.77)*(1-T.MathUtils.smoothstep(shelf,2,8));
  return {depth,shore,substrate,slope:.5+.5*noise(x*.17+40,z*.17-8)};
}
/** One sampled world-space depth field is used by the seabed, water and solver. */
export class Bathymetry {
  readonly size=384;readonly data:Float32Array;readonly texture:T.DataTexture;
  constructor(){
    this.data=new Float32Array(this.size*this.size*4);
    for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++){
      const p=seabedAt(x/(this.size-1)*96-48,z/(this.size-1)*96-48),i=(z*this.size+x)*4;
      this.data.set([p.depth,p.shore,p.substrate,p.slope],i);
    }
    this.texture=new T.DataTexture(this.data,this.size,this.size,T.RGBAFormat,T.FloatType);this.texture.minFilter=this.texture.magFilter=T.NearestFilter;this.texture.needsUpdate=true;
  }
  sample(x:number,z:number,channel=0){
    const gx=T.MathUtils.clamp((x+48)/96*(this.size-1),0,this.size-1.001),gz=T.MathUtils.clamp((z+48)/96*(this.size-1),0,this.size-1.001),ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,a=(iz*this.size+ix)*4+channel;
    return T.MathUtils.lerp(T.MathUtils.lerp(this.data[a],this.data[a+4],fx),T.MathUtils.lerp(this.data[a+this.size*4],this.data[a+this.size*4+4],fx),fz);
  }
  dispose(){this.texture.dispose();}
}
export const depthFieldGLSL=`
precision highp sampler2D;
uniform sampler2D uDepthField;
uniform float uFieldSize;
vec4 bathymetry(vec2 p){
  vec2 q=clamp((p+48.0)/96.0*(uFieldSize-1.0),vec2(0.0),vec2(uFieldSize-1.001));
  vec2 i=floor(q),f=fract(q),uv=(i+.5)/uFieldSize,stepUV=vec2(1.0/uFieldSize);
  return mix(mix(texture2D(uDepthField,uv),texture2D(uDepthField,uv+vec2(stepUV.x,0)),f.x),mix(texture2D(uDepthField,uv+vec2(0,stepUV.y)),texture2D(uDepthField,uv+stepUV),f.x),f.y);
}`;

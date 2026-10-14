import * as T from 'three';
import { Bathymetry } from './bathymetry';

export const INTERACTION_EXTENT=64;
const SPAN=INTERACTION_EXTENT*2;
export type RippleKind='hover'|'drag'|'click';
/** A bounded, damped shallow-water height/velocity field. CPU and GPU sample the same data.
 * No synchronous GPU readback or independent circular ripple lifetimes are needed for picking.
 */
export class RippleField {
  size:number;texture:T.DataTexture;
  data:Float32Array;private next:Float32Array;private speed:Float32Array;private accumulator=0;
  private renderData:Float32Array;private dirty=false;
  totalImpulses=0;energy=0;private sinceImpulse=99;
  readonly bounds=new Float32Array([64,64,-64,-64]);
  get active(){return this.sinceImpulse<12||this.energy>=1e-9;}
  readonly extent=INTERACTION_EXTENT;readonly step=1/90;
  constructor(high:boolean,private depth:Bathymetry){
    this.size=high?384:256;this.data=new Float32Array(this.size*this.size*2);this.next=this.data.slice();this.speed=new Float32Array(this.size*this.size);this.renderData=new Float32Array(this.size*this.size*4);
    this.texture=this.makeTexture();this.buildMask();
  }
  private makeTexture(){const tex=new T.DataTexture(this.renderData,this.size,this.size,T.RGBAFormat,T.FloatType);tex.minFilter=tex.magFilter=T.NearestFilter;tex.needsUpdate=true;return tex;}
  private upload(){
    const n=this.size,a=this.data,out=this.renderData,slope=(n-1)/(SPAN*2);
    for(let z=1;z<n-1;z++)for(let x=1;x<n-1;x++){
      const i=z*n+x,j=i*2,k=i*4;out[k]=a[j];out[k+1]=(a[j+2]-a[j-2])*slope;out[k+2]=(a[j+n*2]-a[j-n*2])*slope;out[k+3]=a[j+1];
    }
    this.texture.needsUpdate=true;this.dirty=false;
  }
  private buildMask(){for(let z=1;z<this.size-1;z++)for(let x=1;x<this.size-1;x++){
    const wx=x/(this.size-1)*SPAN-INTERACTION_EXTENT,wz=z/(this.size-1)*SPAN-INTERACTION_EXTENT,shore=this.depth.sample(wx,wz,1),d=this.depth.sample(wx,wz);
    this.speed[z*this.size+x]=shore<-.35?0:5.5+Math.min(d,3)*1.65;
  }}
  impulse(x:number,z:number,strength:number,kind:RippleKind){
    if(Math.abs(x)>INTERACTION_EXTENT-2||Math.abs(z)>INTERACTION_EXTENT-2)return;
    if(!this.active){this.bounds.set([x-1.7,z-1.7,x+1.7,z+1.7]);}
    else{this.bounds[0]=Math.min(this.bounds[0],x-1.7);this.bounds[1]=Math.min(this.bounds[1],z-1.7);this.bounds[2]=Math.max(this.bounds[2],x+1.7);this.bounds[3]=Math.max(this.bounds[3],z+1.7);}
    const radius=kind==='click'?.52:kind==='drag'?.4:.32,amp=Math.min(strength, .55)*(kind==='click'?.65:.34),spacing=SPAN/(this.size-1);
    const cx=(x+INTERACTION_EXTENT)/spacing,cz=(z+INTERACTION_EXTENT)/spacing,r=Math.ceil(radius*2.5/spacing);
    for(let iz=Math.max(1,Math.floor(cz-r));iz<=Math.min(this.size-2,Math.ceil(cz+r));iz++)for(let ix=Math.max(1,Math.floor(cx-r));ix<=Math.min(this.size-2,Math.ceil(cx+r));ix++){
      const i=iz*this.size+ix;if(this.speed[i]===0)continue;
      const d2=((ix-cx)**2+(iz-cz)**2)*spacing*spacing/(radius*radius),pulse=Math.exp(-d2*2)*(1-d2*1.25);
      this.data[i*2]-=amp*pulse;this.data[i*2+1]-=amp*pulse*1.4;
    }
    this.sinceImpulse=0;this.totalImpulses++;this.dirty=true;
  }
  update(dt:number){
    this.sinceImpulse+=dt;if(this.sinceImpulse>12&&this.energy<1e-9){
      if(this.energy>0){this.data.fill(0);this.next.fill(0);this.renderData.fill(0);this.energy=0;this.texture.needsUpdate=true;}return;
    }
    const spread=dt*4.4;this.bounds[0]=Math.max(-INTERACTION_EXTENT,this.bounds[0]-spread);this.bounds[1]=Math.max(-INTERACTION_EXTENT,this.bounds[1]-spread);this.bounds[2]=Math.min(INTERACTION_EXTENT,this.bounds[2]+spread);this.bounds[3]=Math.min(INTERACTION_EXTENT,this.bounds[3]+spread);
    this.accumulator=Math.min(this.accumulator+dt,this.step*5);
    const n=this.size,invDx2=((n-1)/SPAN)**2,dtFixed=this.step;
    let changed=false;
    while(this.accumulator>=dtFixed){
      let energy=0;const a=this.data,b=this.next;
      for(let z=1;z<n-1;z++)for(let x=1;x<n-1;x++){
        const i=z*n+x,j=i*2,c=this.speed[i];if(c===0){b[j]=b[j+1]=0;continue;}
        const h=a[j],left=this.speed[i-1]?a[j-2]:h,right=this.speed[i+1]?a[j+2]:h,down=this.speed[i-n]?a[j-n*2]:h,up=this.speed[i+n]?a[j+n*2]:h;
        const sponge=Math.min(x,z,n-1-x,n-1-z)<8?.945:.989;
        const velocity=(a[j+1]+(left+right+down+up-h*4)*invDx2*c*dtFixed)*sponge;
        const nextHeight=(h+velocity*dtFixed)*.9992;
        b[j]=nextHeight;b[j+1]=velocity;energy+=nextHeight*nextHeight;
      }
      this.data=b;this.next=a;this.energy=energy/(n*n);this.accumulator-=dtFixed;changed=true;
    }
    if(changed||this.dirty)this.upload();
  }
  sample(x:number,z:number,channel=0){
    if(!this.active||Math.abs(x)>=INTERACTION_EXTENT||Math.abs(z)>=INTERACTION_EXTENT||x<this.bounds[0]||z<this.bounds[1]||x>this.bounds[2]||z>this.bounds[3])return 0;
    const fx=(x+INTERACTION_EXTENT)/SPAN*(this.size-1),fz=(z+INTERACTION_EXTENT)/SPAN*(this.size-1),ix=Math.floor(fx),iz=Math.floor(fz),a=(iz*this.size+ix)*2+channel;
    return T.MathUtils.lerp(T.MathUtils.lerp(this.data[a],this.data[a+2],fx-ix),T.MathUtils.lerp(this.data[a+this.size*2],this.data[a+this.size*2+2],fx-ix),fz-iz);
  }
  setQuality(high:boolean){
    const size=high?384:256;if(size===this.size)return;
    const saved=new Float32Array(size*size*2);
    for(let z=0;z<size;z++)for(let x=0;x<size;x++){const wx=x/(size-1)*SPAN-INTERACTION_EXTENT,wz=z/(size-1)*SPAN-INTERACTION_EXTENT,i=(z*size+x)*2;saved[i]=this.sample(wx,wz);saved[i+1]=this.sample(wx,wz,1);}
    this.texture.dispose();this.size=size;this.data=saved;this.next=saved.slice();this.speed=new Float32Array(size*size);this.renderData=new Float32Array(size*size*4);this.buildMask();this.texture=this.makeTexture();this.upload();
  }
  dispose(){this.texture.dispose();}
}
export const rippleFieldGLSL=`
uniform sampler2D uInteraction;
uniform float uInteractionSize;
uniform float uInteractionActive;
uniform vec4 uInteractionBounds;
vec3 disturbanceSample(vec2 p){
  if(uInteractionActive<.5||max(abs(p.x),abs(p.y))>=${INTERACTION_EXTENT.toFixed(1)}||p.x<uInteractionBounds.x||p.y<uInteractionBounds.y||p.x>uInteractionBounds.z||p.y>uInteractionBounds.w)return vec3(0.0);
  vec2 q=(p+${INTERACTION_EXTENT.toFixed(1)})/${SPAN.toFixed(1)}*(uInteractionSize-1.0),i=floor(q),f=fract(q),uv=(i+.5)/uInteractionSize;float s=1.0/uInteractionSize;
  return mix(mix(texture2D(uInteraction,uv).rgb,texture2D(uInteraction,uv+vec2(s,0)).rgb,f.x),mix(texture2D(uInteraction,uv+vec2(0,s)).rgb,texture2D(uInteraction,uv+vec2(s)).rgb,f.x),f.y);
}
float disturbance(vec2 p){return disturbanceSample(p).r;}`;

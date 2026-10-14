import * as T from 'three';

export const seaPresets = {
  Mediterranean: ['#71c8bb','#207b84','#e2f1d9'],
  Azure: ['#72bfd2','#225b87','#dfedf0'],
  Emerald: ['#84c5a3','#286c60','#e0e9c6'],
  Sunset: ['#cead95','#687887','#ffe0ae'],
  Midnight: ['#49778e','#172d4c','#a5c5d9'],
} as const;
export type SeaPreset=keyof typeof seaPresets;
const waves=`
uniform float uTime;
uniform vec4 uRipples[24];
vec3 surface(vec2 p) {
  vec3 result=vec3(0.0);
  vec2 dirs[4];dirs[0]=vec2(.8,.6);dirs[1]=vec2(-.38,.92);dirs[2]=vec2(.96,-.28);dirs[3]=vec2(.42,.9);
  float freq[4];freq[0]=.62;freq[1]=1.17;freq[2]=2.1;freq[3]=3.6;
  float amp[4];amp[0]=.065;amp[1]=.036;amp[2]=.015;amp[3]=.007;
  for(int i=0;i<4;i++) {
    float phase=dot(p,dirs[i])*freq[i]+uTime*(.36+float(i)*.19);
    result.x+=sin(phase)*amp[i];result.yz+=cos(phase)*amp[i]*freq[i]*dirs[i];
  }
  for(int i=0;i<24;i++) {
    float age=uTime-uRipples[i].z;
    if(age>=0.0&&age<9.0&&uRipples[i].w>0.0) {
      vec2 delta=p-uRipples[i].xy;float d=length(delta)+.001;
      float front=d-age*1.7;
      float envelope=exp(-front*front*1.35)*exp(-age*.57)*uRipples[i].w;
      float phase=front*5.2;
      result.x+=sin(phase)*envelope;
      result.yz+=(cos(phase)*5.2-sin(phase)*2.7*front)*envelope*delta/d;
    }
  }
  return result;
}`;
const vertex=`${waves}
uniform mat4 uReflectionMatrix;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vReflection;
void main() {
  vec3 p=position;vec3 wave=surface(p.xz);p.y+=wave.x;
  vNormal=normalize(vec3(-wave.y,1.0,-wave.z));
  vWorld=(modelMatrix*vec4(p,1.0)).xyz;
  vReflection=uReflectionMatrix*vec4(vWorld,1.0);
  gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);
}`;
const fragment=`
uniform float uTime;
uniform vec3 uShallow,uDeep,uHighlight,uSky,uSunDirection;
uniform float uDay;
uniform sampler2D uReflection;
varying vec3 vWorld,vNormal;
varying vec4 vReflection;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 p=vWorld.xz;
  float theta=atan(p.y/8.2,p.x/10.8);
  float shore=1.0+.045*sin(theta*5.0+.6)+.025*sin(theta*9.0-1.2);
  float distanceToShore=(length(p/vec2(10.8,8.2))-shore)*8.5;
  float depth=smoothstep(-.15,8.5,distanceToShore);
  vec3 base=mix(uShallow,uDeep,depth);
  vec2 flow=p*.85+vec2(uTime*.025,-uTime*.018);
  float warp=noise(flow*.42)*5.0;
  float smallA=sin(p.x*8.1+p.y*5.7+uTime*.72+warp);
  float smallB=sin(p.x*5.3-p.y*9.7+uTime*.54+warp*1.3);
  vec2 grain=vec2(noise(flow+vec2(.06,0))-noise(flow-vec2(.06,0)),noise(flow+vec2(0,.06))-noise(flow-vec2(0,.06)));
  vec3 n=normalize(vNormal+vec3(smallA*.009+grain.x*.36,0.0,smallB*.009+grain.y*.36));
  vec3 view=normalize(cameraPosition-vWorld);
  float fresnel=.025+.55*pow(1.0-max(dot(view,n),0.0),4.0);
  vec2 reflectionUv=vReflection.xy/vReflection.w+n.xz*.016;
  vec3 reflected=texture2D(uReflection,clamp(reflectionUv,vec2(.001),vec2(.999))).rgb;
  base=mix(base,reflected,fresnel*.38);
  float diffuse=dot(n,uSunDirection)*.12+.88;
  vec3 halfVector=normalize(view+uSunDirection);
  float glint=pow(max(dot(n,halfVector),0.0),180.0);
  float longGlint=pow(max(dot(n,halfVector),0.0),24.0)*.12;
  float caustic=pow(.5+.5*sin(p.x*3.5+sin(p.y*4.0+uTime*.4)+uTime*.6),12.0);
  base*=diffuse*(.47+.53*uDay);
  base+=uShallow*caustic*.055*(1.0-depth)*uDay;
  base+=uHighlight*(glint*.5+longGlint)*(.3+.7*uDay);
  float crest=pow(clamp(length(n.xz),0.0,1.0),1.45);
  base+=uHighlight*crest*.19*(.3+.7*uDay);
  float swell=sin(distanceToShore*6.8-uTime*.85+noise(p*.7)*1.8);
  float foamBand=exp(-pow(distanceToShore-.2-.17*sin(uTime*.6+theta*8.0),2.0)*13.0);
  float foam=foamBand*smoothstep(.1,.8,swell)*(.3+.7*noise(p*8.0));
  base=mix(base,uHighlight,foam*.58);
  float fog=1.0-exp(-pow(length(p)*.0065,2.0));base=mix(base,uSky,fog);
  gl_FragColor=vec4(base,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export class Water {
  mesh:T.Mesh<T.BufferGeometry,T.ShaderMaterial>;
  totalRipples=0;
  ripples=Array.from({length:24},()=>new T.Vector4(0,0,-100,0));
  private cursor=0;
  private targets=[new T.Color(),new T.Color(),new T.Color()];
  private reflection:T.WebGLRenderTarget;
  private mirrorCamera:T.OrthographicCamera;
  private reflectionMatrix=new T.Matrix4();
  private clip=new T.Plane(new T.Vector3(0,1,0),.12);
  constructor(scene:T.Scene,quality:boolean) {
    this.reflection=new T.WebGLRenderTarget(quality?1024:512,quality?1024:512,{type:T.HalfFloatType,depthBuffer:true});
    this.mirrorCamera=new T.OrthographicCamera();
    const geometry=waterGeometry(quality);
    const colors=seaPresets.Mediterranean.map(c=>new T.Color(c));this.targets=colors.map(c=>c.clone());
    const material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uTime:{value:0},uRipples:{value:this.ripples},uShallow:{value:colors[0]},uDeep:{value:colors[1]},uHighlight:{value:colors[2]},uSky:{value:new T.Color('#dce8df')},uDay:{value:1},uSunDirection:{value:new T.Vector3(-.5,.8,.3)},uReflection:{value:this.reflection.texture},uReflectionMatrix:{value:this.reflectionMatrix}}});
    this.mesh=new T.Mesh(geometry,material);this.mesh.name='Living sea';this.mesh.frustumCulled=false;scene.add(this.mesh);
  }
  setPreset(name:SeaPreset){seaPresets[name].forEach((c,i)=>this.targets[i].set(c));}
  setCustom(hex:string){this.targets[0].set(hex).lerp(new T.Color('#e5edd7'),.24);this.targets[1].set(hex).multiplyScalar(.38);this.targets[2].set(hex).lerp(new T.Color('#fff4dc'),.8);}
  addRipple(x:number,z:number,t:number,strength:number){this.ripples[this.cursor].set(x,z,t,strength);this.cursor=(this.cursor+1)%24;this.totalRipples++;}
  update(t:number,dt:number){const u=this.mesh.material.uniforms;u.uTime.value=t;for(const [i,key]of ['uShallow','uDeep','uHighlight'].entries())(u[key].value as T.Color).lerp(this.targets[i],1-Math.exp(-dt*2.4));}
  reflect(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.OrthographicCamera,target:T.Vector3) {
    const m=this.mirrorCamera;m.copy(camera);m.position.copy(camera.position);m.position.y*=-1;m.up.set(0,-1,0);m.lookAt(target.x,-target.y,target.z);m.updateMatrixWorld();
    this.reflectionMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(m.projectionMatrix).multiply(m.matrixWorldInverse);
    const savedTarget=renderer.getRenderTarget(),savedClips=renderer.clippingPlanes,savedShadow=renderer.shadowMap.autoUpdate;
    this.mesh.visible=false;renderer.clippingPlanes=[this.clip];renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(this.reflection);renderer.render(scene,m);
    renderer.setRenderTarget(savedTarget);renderer.clippingPlanes=savedClips;renderer.shadowMap.autoUpdate=savedShadow;this.mesh.visible=true;
  }
  dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.reflection.dispose();}
}
/** Dense vertices where the visitor can touch; sparse geometry at the horizon. */
export function waterGeometry(high:boolean){
  const n=high?384:224,g=new T.PlaneGeometry(80,80,n,n);g.rotateX(-Math.PI/2);
  const p=Array.from(g.getAttribute('position').array),uv=Array.from(g.getAttribute('uv').array),indices=Array.from(g.index!.array);g.dispose();
  for(let side=0;side<4;side++){
    const offset=p.length/3,a=side*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
    for(let ring=0;ring<2;ring++)for(let j=0;j<=n;j++) {const r=ring?110:40,x=(j/n*2-1)*r,z=r;p.push(x*c-z*s,0,x*s+z*c);uv.push(j/n,ring);}
    for(let j=0;j<n;j++){const a=offset+j,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

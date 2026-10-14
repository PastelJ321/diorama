import * as T from 'three';
import { Bathymetry } from './bathymetry';
import { RippleField,type RippleKind } from './rippleField';
import { sampleSurfaceHeight } from './oceanWaves';
import { waterVertex,waterFragment } from './waterShader';
import { seaPresets,legacyProfiles,type SeaPreset,type OceanProfile } from './oceanProfiles';
export { seaPresets,legacyProfiles,type SeaPreset } from './oceanProfiles';

const colorKeys=['uShallow','uMiddle','uDeep','uHighlight','uReflectionTint'] as const;
export class Water {
  mesh:T.Mesh<T.BufferGeometry,T.ShaderMaterial>;
  readonly field:Bathymetry;readonly simulation:RippleField;
  private reflection:T.WebGLRenderTarget;private refraction:T.WebGLRenderTarget;
  private mirrorCamera=new T.OrthographicCamera();private reflectionMatrix=new T.Matrix4();
  private clip=new T.Plane(new T.Vector3(0,1,0),.025);
  private underwaterClip=new T.Plane(new T.Vector3(0,-1,0),.025);
  private colors:T.Color[]=[];private targetProfile:OceanProfile=seaPresets['Opaline Lagoon'];
  private high:boolean;private clock=0;profile='Opaline Lagoon';
  private reflectionDirty=true;
  private shadowFallback=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);
  constructor(scene:T.Scene,high:boolean,field:Bathymetry){
    this.high=high;this.field=field;this.simulation=new RippleField(high,field);
    this.reflection=this.makeReflection();this.refraction=this.makeRefraction();this.shadowFallback.needsUpdate=true;
    const p=this.targetProfile;this.colors=[p.shallow,p.middle,p.deep,p.highlight,p.reflectionTint].map(c=>new T.Color(c));
    const uniforms:T.ShaderMaterialParameters['uniforms']={
      uTime:{value:0},uDepthField:{value:field.texture},uFieldSize:{value:field.size},uInteraction:{value:this.simulation.texture},uInteractionSize:{value:this.simulation.size},
      uInteractionActive:{value:0},uInteractionBounds:{value:new T.Vector4()},
      uDay:{value:1},uSky:{value:new T.Color('#cce7e4')},uZenith:{value:new T.Color('#7fabcc')},uSunDirection:{value:new T.Vector3(-.4,.7,-.5)},uSunColor:{value:new T.Color('#fff1d7')},uViewDirection:{value:new T.Vector3(.49,.56,.67)},
      uAbsorption:{value:new T.Vector3(...p.absorption)},uRoughness:{value:p.roughness},uClarity:{value:p.clarity},uWaveStrength:{value:p.waves},uGlint:{value:p.glint},
      uReflection:{value:this.reflection.texture},uRefraction:{value:this.refraction.texture},uRefractionDepth:{value:this.refraction.depthTexture},uReflectionMatrix:{value:this.reflectionMatrix},uViewProjection:{value:new T.Matrix4()},uInverseViewProjection:{value:new T.Matrix4()},
      uSunShadow:{value:this.shadowFallback},uHasShadow:{value:0},uSunMatrix:{value:new T.Matrix4()},uShadowTexel:{value:new T.Vector2(1/2048,1/2048)},
      uDebug:{value:Number(new URLSearchParams(location.search).get('waterDebug')??0)},
    };
    colorKeys.forEach((key,i)=>uniforms![key]={value:this.colors[i].clone()});
    const material=new T.ShaderMaterial({vertexShader:waterVertex,fragmentShader:waterFragment,uniforms});
    this.mesh=new T.Mesh(waterGeometry(high),material);this.mesh.name='Refractive ocean · shared height field';this.mesh.frustumCulled=false;this.mesh.renderOrder=-10;scene.add(this.mesh);
  }
  get totalRipples(){return this.simulation.totalImpulses;}
  get activeRipples(){return this.simulation.active?1:0;}
  get waveStrength(){return this.mesh.material.uniforms.uWaveStrength.value as number;}
  get targetSizes(){return {reflection:[this.reflection.width,this.reflection.height],refraction:[this.refraction.width,this.refraction.height]};}
  private makeReflection(){return new T.WebGLRenderTarget(this.high?1024:512,this.high?1024:512,{type:T.HalfFloatType,depthBuffer:true});}
  private makeRefraction(){
    const scale=this.high?.9:.55,w=Math.max(1,Math.round(innerWidth*scale)),h=Math.max(1,Math.round(innerHeight*scale));
    const target=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType,depthBuffer:true});target.depthTexture=new T.DepthTexture(w,h,T.UnsignedIntType);return target;
  }
  setPreset(name:SeaPreset){
    const resolved=name in legacyProfiles?legacyProfiles[name as keyof typeof legacyProfiles]:name as keyof typeof seaPresets;
    this.targetProfile=seaPresets[resolved];this.profile=resolved;const p=this.targetProfile;
    [p.shallow,p.middle,p.deep,p.highlight,p.reflectionTint].forEach((c,i)=>this.colors[i].set(c));
  }
  setCustom(hex:string){
    this.profile='Custom';const c=new T.Color(hex),white=new T.Color('#e2efdc');
    this.colors[0].copy(c).lerp(white,.5);this.colors[1].copy(c);this.colors[2].copy(c).multiplyScalar(.32);this.colors[3].set('#f8f0df');this.colors[4].set('#f4f7f4');
    this.targetProfile={...seaPresets['Crystal Turquoise'],absorption:[.44,.13,.075]};
  }
  addRipple(x:number,z:number,_t:number,strength:number,kind:RippleKind='click'){this.simulation.impulse(x,z,strength,kind);}
  sampleHeight(x:number,z:number){return sampleSurfaceHeight(x,z,this.clock,this.waveStrength,this.field,this.simulation);}
  update(t:number,dt:number){
    this.clock=t;this.simulation.update(dt);const u=this.mesh.material.uniforms,p=this.targetProfile,f=1-Math.exp(-dt*1.9);u.uTime.value=t;
    u.uInteractionActive.value=this.simulation.active?1:0;u.uInteractionBounds.value.fromArray(this.simulation.bounds);
    colorKeys.forEach((key,i)=>(u[key].value as T.Color).lerp(this.colors[i],f));
    const a=u.uAbsorption.value as T.Vector3;a.x=T.MathUtils.lerp(a.x,p.absorption[0],f);a.y=T.MathUtils.lerp(a.y,p.absorption[1],f);a.z=T.MathUtils.lerp(a.z,p.absorption[2],f);
    u.uRoughness.value=T.MathUtils.lerp(u.uRoughness.value,p.roughness,f);u.uClarity.value=T.MathUtils.lerp(u.uClarity.value,p.clarity,f);u.uWaveStrength.value=T.MathUtils.lerp(u.uWaveStrength.value,p.waves,f);u.uGlint.value=T.MathUtils.lerp(u.uGlint.value,p.glint,f);
  }
  prepare(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.OrthographicCamera,target:T.Vector3,reflection=true){
    const u=this.mesh.material.uniforms;u.uViewProjection.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);u.uInverseViewProjection.value.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse);camera.getWorldDirection(u.uViewDirection.value).negate();
    const savedTarget=renderer.getRenderTarget(),savedAuto=renderer.shadowMap.autoUpdate,savedClips=renderer.clippingPlanes;
    this.mesh.visible=false;renderer.shadowMap.autoUpdate=false;
    try {
      renderer.clippingPlanes=[this.underwaterClip];renderer.setRenderTarget(this.refraction);renderer.render(scene,camera);
      if(reflection||this.reflectionDirty){const m=this.mirrorCamera;m.copy(camera);m.position.copy(camera.position);m.position.y*=-1;m.up.set(0,-1,0);m.lookAt(target.x,-target.y,target.z);m.updateMatrixWorld();
        this.reflectionMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(m.projectionMatrix).multiply(m.matrixWorldInverse);
        renderer.clippingPlanes=[this.clip];renderer.setRenderTarget(this.reflection);renderer.render(scene,m);this.reflectionDirty=false;
      }
    }finally{renderer.setRenderTarget(savedTarget);renderer.clippingPlanes=savedClips;renderer.shadowMap.autoUpdate=savedAuto;this.mesh.visible=true;}
  }
  setSunShadow(shadow:T.DirectionalLightShadow){const u=this.mesh.material.uniforms;if(shadow.map){u.uSunShadow.value=shadow.map.texture;u.uHasShadow.value=1;u.uSunMatrix.value.copy(shadow.matrix);u.uShadowTexel.value.set(1/shadow.mapSize.x,1/shadow.mapSize.y);}else{u.uHasShadow.value=0;u.uSunShadow.value=this.shadowFallback;}}
  resize(){const scale=this.high?.9:.55;this.refraction.setSize(Math.max(1,Math.round(innerWidth*scale)),Math.max(1,Math.round(innerHeight*scale)));this.reflectionDirty=true;}
  setQuality(high:boolean){
    if(high===this.high){this.resize();return;}this.high=high;
    this.mesh.geometry.dispose();this.mesh.geometry=waterGeometry(high);this.reflection.dispose();this.refraction.dispose();this.reflection=this.makeReflection();this.refraction=this.makeRefraction();this.reflectionDirty=true;this.simulation.setQuality(high);
    const u=this.mesh.material.uniforms;u.uReflection.value=this.reflection.texture;u.uRefraction.value=this.refraction.texture;u.uRefractionDepth.value=this.refraction.depthTexture;u.uInteraction.value=this.simulation.texture;u.uInteractionSize.value=this.simulation.size;
  }
  dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.reflection.dispose();this.refraction.dispose();this.shadowFallback.dispose();this.simulation.dispose();this.field.dispose();}
}
export function waterGeometry(high:boolean){
  const n=high?320:192,g=new T.PlaneGeometry(128,128,n,n);g.rotateX(-Math.PI/2);
  const p=Array.from(g.getAttribute('position').array),uv=Array.from(g.getAttribute('uv').array),indices=Array.from(g.index!.array);g.dispose();
  for(let side=0;side<4;side++){
    const offset=p.length/3,a=side*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
    for(let ring=0;ring<2;ring++)for(let j=0;j<=n;j++){const r=ring?600:64,x=(j/n*2-1)*r,z=r;p.push(x*c-z*s,0,x*s+z*c);uv.push(j/n,ring);}
    for(let j=0;j<n;j++){const a=offset+j,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

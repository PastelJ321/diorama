import { depthFieldGLSL } from './bathymetry';
import { rippleFieldGLSL } from './rippleField';
import { oceanWavesGLSL } from './oceanWaves';
export const surfaceGLSL=depthFieldGLSL+rippleFieldGLSL+oceanWavesGLSL;
export const waterVertex=`
${surfaceGLSL}
uniform mat4 uReflectionMatrix;
varying vec3 vWorld,vNormal;
varying vec4 vReflection,vScreen;
void main(){
  vec4 field=bathymetry(position.xz);vec3 p=displacedPosition(position.xz);
  vec3 n=gerstnerNormal(position.xz,field.x);
  float e=.12;
  float sx=(shoreHeight(bathymetry(p.xz+vec2(e,0)))-shoreHeight(bathymetry(p.xz-vec2(e,0))))/(2.0*e);
  float sz=(shoreHeight(bathymetry(p.xz+vec2(0,e)))-shoreHeight(bathymetry(p.xz-vec2(0,e))))/(2.0*e);
  vNormal=normalize(n+vec3(-sx,0.0,-sz));vWorld=p;
  vReflection=uReflectionMatrix*vec4(p,1.0);
  vScreen=projectionMatrix*viewMatrix*vec4(p,1.0);gl_Position=vScreen;
}`;
export const waterFragment=`
${depthFieldGLSL}
${rippleFieldGLSL}
uniform float uTime,uDay,uRoughness,uClarity,uGlint;
uniform vec3 uShallow,uMiddle,uDeep,uHighlight,uAbsorption,uReflectionTint,uSky,uZenith,uSunDirection,uSunColor,uViewDirection;
uniform sampler2D uReflection,uRefraction,uRefractionDepth,uSunShadow;
uniform mat4 uInverseViewProjection,uViewProjection,uSunMatrix;
uniform vec2 uShadowTexel;
uniform float uHasShadow,uDebug;
varying vec3 vWorld,vNormal;
varying vec4 vReflection,vScreen;
#include <packing>
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 skyRadiance(vec3 direction){
  float elevation=clamp(direction.y,0.0,1.0);vec3 color=mix(uSky,uZenith,pow(elevation,.55));
  float sun=pow(max(dot(direction,uSunDirection),0.0),180.0);return color+uSunColor*sun*.6*uDay;
}
vec3 worldBehind(vec2 uv){
  float depth=texture2D(uRefractionDepth,uv).r;
  vec4 world=uInverseViewProjection*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);return world.xyz/world.w;
}
float sunlight(vec3 position){
  if(uHasShadow<.5)return 1.0;
  vec4 s=uSunMatrix*vec4(position,1.0);vec3 q=s.xyz/s.w;
  if(min(q.x,q.y)<0.0||max(q.x,q.y)>1.0||q.z>1.0)return 1.0;
  float visibility=0.0;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    float depth=unpackRGBAToDepth(texture2D(uSunShadow,q.xy+vec2(float(x),float(y))*uShadowTexel*1.4));visibility+=step(q.z-.0012,depth);
  }
  return mix(.32,1.0,visibility/9.0);
}
vec2 microSlope(vec2 p){
  float warp=noise(p*.24+uTime*.018)*2.7;vec2 slope=vec2(0.0);
  vec2 directions[5];directions[0]=vec2(.86,.51);directions[1]=vec2(.57,.82);directions[2]=vec2(.97,-.24);directions[3]=vec2(-.26,.96);directions[4]=vec2(.73,.68);
  for(int i=0;i<5;i++){
    float frequency=10.7+float(i)*8.31,phase=dot(p,directions[i])*frequency-uTime*(1.18+float(i)*.33)+warp*(1.0+float(i)*.19);
    float fade=1.0-smoothstep(.55,3.0,fwidth(phase));slope+=directions[i]*cos(phase)*(.038-float(i)*.0045)*fade;
  }
  return slope;
}
void main(){
  vec2 p=vWorld.xz;vec4 field=bathymetry(p);vec3 view=normalize(uViewDirection);
  vec3 interaction=disturbanceSample(p);float sx=interaction.g,sz=interaction.b;
  vec2 micro=microSlope(p);vec3 n=normalize(vNormal+vec3(-micro.x-sx,0.0,-micro.y-sz));
  float NoV=max(dot(n,view),.025),fresnel=.02037+.97963*pow(1.0-NoV,5.0);
  vec2 screenUV=vScreen.xy/vScreen.w*.5+.5;vec3 refracted=refract(-view,n,1.0/1.333);
  vec2 bend=(refracted.xz/max(-refracted.y,.25)+view.xz/max(view.y,.25))*min(field.x,5.0)*.45;
  vec4 warpedClip=uViewProjection*vec4(vWorld+vec3(bend.x,0.0,bend.y),1.0);
  vec2 refractUV=clamp(warpedClip.xy/warpedClip.w*.5+.5,vec2(.002),vec2(.998));vec3 floorWorld=worldBehind(refractUV);
  if(floorWorld.y>.035){refractUV=screenUV;floorWorld=worldBehind(refractUV);}
  bool hasFloor=texture2D(uRefractionDepth,refractUV).r<.99999&&floorWorld.y<.035;
  // A view ray that misses the shelf travels through deep water. Using only the
  // local vertical depth here creates a visible rectangular seam at the bed edge.
  float depth=hasFloor?max(.15,vWorld.y-floorWorld.y):38.0;
  vec3 transmittance=exp(-uAbsorption*depth/max(-refracted.y,.45)/uClarity);
  vec3 floorColor=hasFloor?texture2D(uRefraction,refractUV).rgb:vec3(0.0);
  float shadow=sunlight(vWorld),light=.18+uDay*.82;
  vec3 scatter=mix(uMiddle,uDeep,smoothstep(1.8,18.0,depth));scatter=mix(uShallow*.54,scatter,smoothstep(.0,2.5,depth));
  vec3 transmitted=floorColor*transmittance*vec3(.86,1.02,1.06)+scatter*(1.0-transmittance)*light*(.76+.24*shadow);
  vec2 reflectedUV=vReflection.xy/vReflection.w+n.xz*.007;
  vec3 reflected=texture2D(uReflection,clamp(reflectedUV,vec2(.002),vec2(.998))).rgb;
  reflected=mix(reflected,skyRadiance(reflect(-view,n)),.23);reflected*=mix(vec3(1.0),uReflectionTint,.16);
  vec3 color=mix(transmitted,reflected,fresnel);
  vec3 h=normalize(view+uSunDirection);float NoH=max(dot(n,h),.001),NoL=max(dot(n,uSunDirection),0.0);
  float roughness=max(uRoughness,sqrt(max(length(fwidth(n))*.18,.0)));
  float alpha=roughness*roughness,a2=alpha*alpha,denom=NoH*NoH*(a2-1.0)+1.0;
  float distribution=a2/(3.14159265*denom*denom+.00001),k=(roughness+1.0)*(roughness+1.0)/8.0;
  float visibility=1.0/(4.0*(NoV*(1.0-k)+k)*(NoL*(1.0-k)+k)+.0001);
  float sunSpec=min(distribution*visibility*.02037*NoL,2.0);
  color+=uSunColor*uHighlight*sunSpec*uGlint*shadow*(.035+uDay*.17);
  float phase=field.y*1.7+uTime*1.05+field.w*2.5;
  float breaking=pow(max(sin(phase),0.0),9.0),backwash=pow(max(sin(phase-.9),0.0),5.0)*.22;
  float coast=exp(-pow((field.y-.18)*1.9,2.0)),cells=noise(p*7.8+vec2(uTime*.08,-uTime*.04)),foamPatch=noise(p*1.7+field.w*2.0);
  float foam=coast*(breaking+backwash)*smoothstep(.19,.74,cells)*(.38+.62*foamPatch);
  color=mix(color,uHighlight*(.18+.7*uDay),clamp(foam*.65,0.0,.6));
  float distance=length(cameraPosition-vWorld),fog=1.0-exp(-pow(max(distance-65.0,0.0)*.0045,2.0));color=mix(color,uSky,fog);
  if(uDebug>0.5&&uDebug<1.5)color=vec3(depth/18.0);
  if(uDebug>1.5&&uDebug<2.5)color=floorColor*.4;
  if(uDebug>2.5&&uDebug<3.5)color=vec3(shadow);
  if(uDebug>3.5&&uDebug<4.5)color=vec3(field.x/18.0);
  if(uDebug>4.5&&uDebug<5.5)color=vec3(hasFloor?1.0:0.0);
  if(uDebug>5.5)color=reflected*.5;
  gl_FragColor=vec4(max(color,vec3(0.0)),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

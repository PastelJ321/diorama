import * as T from 'three';
import { Bathymetry } from './bathymetry';
import { M } from './materials';
import { rock } from './geometry';

export const causticUniforms={uCausticTime:{value:0},uCausticDay:{value:1},uCausticSun:{value:new T.Vector3(-.4,.8,-.4)}};
const caustics=`
varying vec3 vUnderWorld;
uniform float uCausticTime,uCausticDay;
uniform vec3 uCausticSun;
vec2 causticHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float causticCells(vec2 p){
  vec2 cell=floor(p),local=fract(p);float first=10.0,second=10.0;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 offset=vec2(float(x),float(y)),seed=causticHash(cell+offset);
    vec2 point=offset+.5+.32*sin(uCausticTime*.37+6.28318*seed)-local;float dist=dot(point,point);
    if(dist<first){second=first;first=dist;}else{second=min(second,dist);}
  }
  return 1.0-smoothstep(.012,.085,sqrt(second)-sqrt(first));
}`;
function underwaterMaterial(source:T.MeshStandardMaterial){
  const mat=source.clone();mat.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,causticUniforms);
    shader.vertexShader='varying vec3 vUnderWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvUnderWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=caustics+'\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float submerged=1.0-smoothstep(-.38,-.04,vUnderWorld.y);
      if(submerged>.01&&vUnderWorld.y>-6.0&&uCausticDay>.14){
        vec2 p=(vUnderWorld.xz+uCausticSun.xz*vUnderWorld.y*.22)*2.4;
        p+=vec2(sin(p.y*.7+uCausticTime*.35),sin(p.x*.9-uCausticTime*.25))*.31;
        float caustic=causticCells(p);if(vUnderWorld.y>-2.0)caustic+=causticCells(p*1.64+vec2(9.4,3.8))*.26;
        totalEmissiveRadiance+=diffuseColor.rgb*caustic*submerged*uCausticDay*max(uCausticSun.y,0.0)*exp(vUnderWorld.y*.28)*.55;
      }`);
  };
  mat.customProgramCacheKey=()=> 'porto-underwater-caustics-v2';return mat;
}
export function buildSeabed(parent:T.Group,field:Bathymetry){
  const n=256,base=new T.PlaneGeometry(96,96,n,n);base.rotateX(-Math.PI/2);
  const vertices=Array.from(base.getAttribute('position').array),uv=Array.from(base.getAttribute('uv').array),indices=Array.from(base.index!.array);base.dispose();
  // Extend the abyssal floor beyond the oblique camera's underwater view rays.
  // A finite 96 m shelf alone exposes its rectangular edge through refraction.
  for(let side=0;side<4;side++){
    const offset=vertices.length/3,angle=side*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
    for(let ring=0;ring<2;ring++)for(let j=0;j<=n;j++){const r=ring?180:48,x=(j/n*2-1)*r,z=r;vertices.push(x*c-z*s,0,x*s+z*c);uv.push(j/n,ring);}
    for(let j=0;j<n;j++){const a=offset+j,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const positions=geometry.getAttribute('position'),colors=new Float32Array(positions.count*3);
  const sand=new T.Color('#c7bd91'),stone=new T.Color('#697d6b'),temp=new T.Color();
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),depth=field.sample(x,z),substrate=field.sample(x,z,2);
    positions.setY(i,-depth);temp.copy(sand).lerp(stone,substrate*.8).multiplyScalar(.87+.13*field.sample(x,z,3));temp.toArray(colors,i*3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();
  const floor=underwaterMaterial(M.sand);floor.color.set('#ffffff');floor.vertexColors=true;floor.bumpScale=.035;
  const bed=new T.Mesh(geometry,floor);bed.receiveShadow=true;bed.name='Submerged sandbars and limestone shelf';parent.add(bed);
  const stoneMat=underwaterMaterial(M.rock);stoneMat.color.set('#8d9275');
  // Curated submerged outcrops under the same refraction/depth pass as the sandy shelf.
  const clusters=[[-7.5,8.9],[-9.9,5.5],[-11,1],[10.9,3.4],[9.3,6.9],[4.9,9.2],[-.2,-9.4],[6.9,-7.8]];
  for(const [x,z]of clusters)for(let j=0;j<5;j++){
    const xx=x+Math.sin(j*2.4)*.8,zz=z+Math.cos(j*1.7)*.7,d=field.sample(xx,zz);
    const obj=rock(parent,stoneMat,xx,-d+.19,zz,.36+(j%3)*.17,.25+(j%2)*.18,.42+(j%3)*.16);obj.rotation.y=j*.83;
  }
}

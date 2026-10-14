import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const cube = new T.BoxGeometry(1, 1, 1);
const rounded = new RoundedBoxGeometry(1, 1, 1, 2, .045);
const sphere = new T.SphereGeometry(1, 16, 11);
let weatheredRock:T.BufferGeometry = new T.IcosahedronGeometry(1, 3);
{
  const positions=weatheredRock.getAttribute('position');
  for(let i=0;i<positions.count;i++) {const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),r=1+.075*Math.sin(x*13+y*9-z*11)+.055*Math.sin(z*19+x*7);positions.setXYZ(i,x*r,y*r,z*r);}
  weatheredRock.deleteAttribute('normal');weatheredRock.deleteAttribute('uv');weatheredRock=mergeVertices(weatheredRock,.0001);weatheredRock.computeVertexNormals();
  const p=weatheredRock.getAttribute('position'),uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i);uv[i*2+1]=p.getY(i);}
  weatheredRock.setAttribute('uv',new T.BufferAttribute(uv,2));
}
export function mesh(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, x=0, y=0, z=0) {
  const m = new T.Mesh(geometry, material); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
export function box(parent: T.Object3D, material: T.Material, x: number,y: number,z: number,w: number,h: number,d: number, bevel=false) {
  const m = mesh(parent, bevel ? rounded : cube, material,x,y,z); m.scale.set(w,h,d); return m;
}
export function ball(parent: T.Object3D, material: T.Material,x:number,y:number,z:number,sx:number,sy=sx,sz=sx) {
  const m=mesh(parent,sphere,material,x,y,z);m.scale.set(sx,sy,sz);return m;
}
export function rock(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number) {
  const m=mesh(parent,weatheredRock,material,x,y,z);m.scale.set(sx,sy,sz);return m;
}
export function cylinder(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,r:number,h:number,rt=r,segments=12) {
  return mesh(parent,new T.CylinderGeometry(rt,r,h,segments),material,x,y,z);
}
export function line(parent:T.Object3D,material:T.Material,a:T.Vector3,b:T.Vector3,r=.025) {
  const v=b.clone().sub(a), m=cylinder(parent,material,0,0,0,r,v.length(),r,6);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;
}
export function curve(parent:T.Object3D,material:T.Material,points:T.Vector3[],radius=.025) {
  return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points),32,radius,5,false),material);
}
/** Collapse static craftsmanship into one draw per material, retaining world transforms. */
export function bake(group:T.Group) {
  group.updateMatrixWorld(true);
  const buckets=new Map<T.Material,T.BufferGeometry[]>();
  const castFlags=new Map<T.Material,boolean>(),receiveFlags=new Map<T.Material,boolean>();
  group.traverse(obj=> { if(obj instanceof T.Mesh && !Array.isArray(obj.material)) {
    let list=buckets.get(obj.material);if(!list) {list=[];buckets.set(obj.material,list);}
    castFlags.set(obj.material,(castFlags.get(obj.material)??false)||obj.castShadow);receiveFlags.set(obj.material,(receiveFlags.get(obj.material)??false)||obj.receiveShadow);
    const geo=(obj.geometry.index?obj.geometry.toNonIndexed():obj.geometry.clone()).applyMatrix4(obj.matrixWorld);
    if(!geo.getAttribute('uv')) geo.setAttribute('uv',new T.BufferAttribute(new Float32Array(geo.getAttribute('position').count*2),2));
    list.push(geo);
  }});
  const result=new T.Group(); result.name='Static village · material batches';
  for(const [material,geometries] of buckets) {
    const geometry=mergeGeometries(geometries,false);if(!geometry)throw new Error('Incompatible static geometry');
    const obj=mesh(result,geometry,material);obj.frustumCulled=true;obj.castShadow=castFlags.get(material)??false;obj.receiveShadow=receiveFlags.get(material)??false;
    geometries.forEach(g=>g.dispose());
  }
  // Source geometries are no longer used, including shared primitive geometries.
  const source=new Set<T.BufferGeometry>();group.traverse(o=>{if(o instanceof T.Mesh)source.add(o.geometry);});source.forEach(g=>g.dispose());
  group.clear();return result;
}

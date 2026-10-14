import * as T from 'three';
import { M, random } from './materials';
import { mesh, rock, box } from './geometry';

export function radius(theta:number) { return 1+.045*Math.sin(theta*5+.6)+.025*Math.sin(theta*9-1.2); }
export function height(x:number,z:number) {
  const ridge=1/(1+Math.exp((z+.8)*.72));
  return 1.35+ridge*3.1+.18*Math.sin(x*.55)*Math.cos(z*.4);
}
export function buildTerrain(parent:T.Group, occluders:T.Object3D[]) {
  const vertices:number[]=[],uv:number[]=[],indices:number[]=[],n=112;
  // Concentric topology: a continuous irregular coastline, no rectangular backing plate.
  vertices.push(0,height(0,0),0);uv.push(.5,.5);
  for(let ring=1;ring<=32;ring++)for(let j=0;j<n;j++) {
    const t=j/n*Math.PI*2,r=ring/32*radius(t),x=Math.cos(t)*10.8*r,z=Math.sin(t)*8.2*r;
    vertices.push(x,height(x,z)+Math.sin(x*2.4+z*1.8)*.045*r,z);uv.push(x/8,z/8);
  }
  for(let j=0;j<n;j++)indices.push(0,1+(j+1)%n,1+j);
  for(let r=1;r<32;r++)for(let j=0;j<n;j++) {const a=1+(r-1)*n+j,b=1+(r-1)*n+(j+1)%n,c=a+n,d=b+n;indices.push(a,b,c,b,d,c);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const top=mesh(parent,geo,M.ground);top.name='Island surface';occluders.push(top);
  const v:number[]=[],u:number[]=[],idx:number[]=[];
  for(let k=0;k<=7;k++)for(let j=0;j<=n;j++) {
    const t=(j%n)/n*Math.PI*2,f=radius(t)*(1+Math.sin(k*2+j*1.71)*.008),x=Math.cos(t)*10.8*f,z=Math.sin(t)*8.2*f;
    v.push(x,height(x,z)*(1-k/7)-.3*k/7,z);u.push(j/12,k*.4);
  }
  for(let k=0;k<7;k++)for(let j=0;j<n;j++){const a=k*(n+1)+j,b=a+1,c=a+n+1,d=c+1;idx.push(a,b,c,b,d,c);}
  const cliff=new T.BufferGeometry();cliff.setAttribute('position',new T.Float32BufferAttribute(v,3));cliff.setAttribute('uv',new T.Float32BufferAttribute(u,2));cliff.setIndex(idx);cliff.computeVertexNormals();mesh(parent,cliff,M.rock);
  // Weathered strata and individual shoreline outcrops break up the silhouette.
  for(let j=0;j<84;j++) {
    const t=j/84*Math.PI*2,r=radius(t),x=Math.cos(t)*10.7*r,z=Math.sin(t)*8.1*r,h=height(x,z);
    for(let k=0;k<3;k++) {
      const m=rock(parent,k%2?M.rock:M.stone,x+(random()-.5)*.32,h*(k+.45)/3,z,.4+random()*.5,.26+random()*.45,.35+random()*.5);m.rotation.set(random()*.4,random()*3,random()*.3);
    }
    if(j%4===0)rock(parent,M.rock,x*1.05,.08,z*1.06,.7,.35,.55);
  }
  // Stone waterfront on the sheltered south side.
  for(let j=0;j<39;j++) {
    const t=.08+ j/38*2.65,x=Math.cos(t)*10.2,z=Math.sin(t)*7.7,y=height(x,z);
    const a=box(parent,M.lightStone,x,y+.12,z,.75,.25,.75,true);a.rotation.y=-t;
    if(j>5&&j<33){const b=box(parent,M.stone,x*1.035,.62,z*1.035,.85,1.25,.7,true);b.rotation.y=-t;}
  }
  return top;
}

export function path(parent:T.Group,points:[number,number][],width=.8) {
  const spline=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,height(x,z)+.04,z)));
  const v:number[]=[],uv:number[]=[],idx:number[]=[];
  for(let i=0;i<=100;i++) {
    const p=spline.getPoint(i/100),t=spline.getTangent(i/100),side=new T.Vector3(-t.z,0,t.x).normalize();
    for(const sign of [-1,1]){const x=p.x+side.x*width/2*sign,z=p.z+side.z*width/2*sign;v.push(x,height(x,z)+.075,z);uv.push(sign, i/5);}
    if(i<100){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();mesh(parent,geo,M.road);
}

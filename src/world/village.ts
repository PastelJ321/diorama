import * as T from 'three';
import { M, random } from './materials';
import { box, mesh, ball, cylinder, line, curve } from './geometry';
import { height, path } from './terrain';

function arch(parent:T.Object3D,mat:T.Material,x:number,y:number,z:number,w:number,h:number,depth=.06) {
  const shape=new T.Shape(),r=w/2;shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,h-r);shape.absarc(0,h-r,r,0,Math.PI,false);shape.lineTo(-r,0);
  const m=mesh(parent,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12}),mat,x,y,z);return m;
}
export function pot(parent:T.Object3D,x:number,y:number,z:number,s=.22,flower=false) {
  cylinder(parent,M.terracotta,x,y+s*.55,z,s*.65,s*1.1,s,10);
  cylinder(parent,M.terracotta,x,y+s*1.07,z,s*1.04,.055,s*1.04,10);
  for(let i=0;i<5;i++){const a=i*2.4;ball(parent,M.leaf[i%3],x+Math.cos(a)*s*.55,y+s*1.65+random()*s,z+Math.sin(a)*s*.55,s*.65,s*.75,s*.65);if(flower)ball(parent,i%2?M.pink:M.flower,x+Math.cos(a)*s*.6,y+s*2.3,z+Math.sin(a)*s*.6,s*.23);}
}
function railing(parent:T.Object3D,x:number,y:number,z:number,w:number,depth=.5) {
  box(parent,M.metal,x,y+.55,z,w,.045,.045);
  for(let i=0;i<=Math.floor(w/.16);i++)box(parent,M.metal,x-w/2+i*w/Math.floor(w/.16),y+.28,z,.027,.56,.027);
  for(const side of [-1,1]) {box(parent,M.metal,x+side*w/2,y+.55,z-depth/2,.03,.04,depth);box(parent,M.metal,x+side*w/2,y+.28,z-depth,.03,.56,.03);}
}
function windowUnit(parent:T.Object3D,x:number,y:number,z:number,balcony=false,shutter:T.Material=M.shutter,arched=false,lit=true) {
  box(parent,M.lightStone,x,y,z,.67,.99,.1,true);box(parent,lit?M.glass:M.glassOff,x,y,z+.065,.48,.77,.035);
  box(parent,M.cream,x,y,z+.088,.035,.8,.025);box(parent,M.cream,x,y-.03,z+.088,.5,.035,.025);
  if(arched){arch(parent,M.lightStone,x,y-.46,z-.005,.72,1.16);arch(parent,lit?M.glass:M.glassOff,x,y-.38,z+.08,.49,.93);box(parent,M.cream,x,y+.02,z+.155,.025,.73,.025);}
  for(const s of [-1,1]) {
    const sh=box(parent,shutter,x+s*.44,y,z+.03,.25,.83,.065,true);sh.rotation.y=s*.13;
    for(let j=0;j<5;j++)box(parent,shutter,x+s*.44,y-.3+j*.145,z+.075,.235,.028,.06);
  }
  box(parent,M.lightStone,x,y-.51,z+.1,.83,.08,.23,true);
  if(balcony) {
    box(parent,M.lightStone,x,y-.56,z+.36,1.38,.13,.76,true);railing(parent,x,y-.5,z+.72,1.35,.66);
    pot(parent,x+.43,y-.5,z+.53,.14,true);
    for(const s of [-1,1]){const b=box(parent,M.stone,x+s*.44,y-.73,z+.2,.1,.32,.34);b.rotation.x=-.4;}
  }
}
function roof(parent:T.Object3D,w:number,d:number,h:number,flat=false) {
  if(flat){box(parent,M.lightStone,0,h+.04,0,w+.16,.17,d+.16,true);for(const s of [-1,1])box(parent,M.lightStone,s*w/2,h+.25,0,.14,.45,d);return;}
  const rise=w*.34;
  const shape=new T.Shape();shape.moveTo(-w/2-.13,0);shape.lineTo(0,rise);shape.lineTo(w/2+.13,0);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:d+.28,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025});mesh(parent,g,M.roof[0],0,h,-d/2-.14);
  const count=Math.ceil(w/.22),cols=Math.ceil((d+.28)/.36);
  const tileGeo=new T.CylinderGeometry(.115,.115,.4,7,1,true);
  for(let i=0;i<=count;i++)for(let j=0;j<cols;j++) {
    const x=-w/2-.12+i*(w+.24)/count,y=h+rise*(1-Math.abs(x)/(w/2+.13))+.045;
    const tile=mesh(parent,tileGeo,M.roof[(i*7+j*3)%4],x,y,-d/2-.13+j*.36);tile.rotation.x=Math.PI/2;
  }
  for(let j=0;j<cols;j++){const cap=mesh(parent,tileGeo,M.roof[1],0,h+rise+.12,-d/2-.13+j*.36);cap.rotation.x=Math.PI/2;cap.scale.set(1.15,1,1.15);}
  box(parent,M.cream,0,h-.04,d/2+.08,w+.18,.09,.08);
}
function house(parent:T.Group,occluders:T.Object3D[],x:number,z:number,w:number,d:number,h:number,color:number,angle=0,balcony=true,flat=false) {
  const g=new T.Group();g.position.set(x,height(x,z)+.04,z);g.rotation.y=angle;parent.add(g);
  box(g,M.stone,0,-.24,0,w+.18,.65,d+.18,true);
  const body=box(g,M.walls[color%M.walls.length],0,h/2,0,w,h,d,true);g.updateMatrixWorld(true);occluders.push(body);
  for(const s of [-1,1])box(g,M.lightStone,s*(w/2-.055),h/2,d/2+.012,.12,h,.07);
  box(g,M.lightStone,0,.14,0,w+.1,.25,d+.1,true);
  arch(g,M.lightStone,0,.2,d/2+.02,.76,1.32);arch(g,M.wood,0,.23,d/2+.09,.58,1.16);
  box(g,M.paleWood,0,.77,d/2+.16,.035,.85,.03);ball(g,M.metal,.19,.72,d/2+.19,.035);
  const floors=h>3.6?3:h>2.6?2:1;
  for(let f=0;f<floors;f++) {
    const y=floors===1?1.7:1.9+f*1.25;
    if(y+.5>h)continue;
    for(const s of [-1,1])windowUnit(g,s*w*.275,y,d/2+.03,balcony&&f===floors-1&&s===1,color===6?M.blue:color===4?M.wood:M.shutter,color===4||color===0&&f===floors-1,!(color===6||color===2&&s===-1));
    for(const side of [-1,1]) {const sideGroup=new T.Group();sideGroup.position.set(side*w/2,0,0);sideGroup.rotation.y=side*Math.PI/2;g.add(sideGroup);windowUnit(sideGroup,0,y,0,false,color===6?M.blue:M.shutter);}
    const rear=new T.Group();rear.position.z=-d/2;rear.rotation.y=Math.PI;g.add(rear);windowUnit(rear,0,y,0);
  }
  roof(g,w,d,h,flat);
  if(flat){
    for(const xx of [-w*.4,w*.4])for(const zz of [-d*.38,d*.38])cylinder(g,M.wood,xx,h+.88,zz,.035,1.65,.035,6);
    for(let i=0;i<8;i++)box(g,M.paleWood,-w*.45+i*w*.13,h+1.73,0,.055,.055,d*.95);
    for(const zz of [-d*.38,d*.38])box(g,M.wood,0,h+1.69,zz,w,.07,.07);
    for(let i=0;i<12;i++){const xx=-w*.42+random()*w*.84,zz=-d*.42+random()*d*.84;ball(g,M.leaf[i%3],xx,h+1.8,zz,.2,.08,.22);}
    pot(g,w*.3,h+.17,d*.25,.17,true);pot(g,-w*.3,h+.17,d*.25,.17);
  }
  if(!flat){box(g,M.walls[color%7],-w*.26,h+w*.18,-d*.24,.32,.8,.38,true);box(g,M.stone,-w*.26,h+w*.18+.44,-d*.24,.42,.12,.48,true);}
  pot(g,-w/2+.17,.3,d/2+.3,.2,true);
  if(color%3===1) {for(let i=0;i<16;i++){const y=.5+i*.15;ball(g,M.leaf[i%3],-w/2-.025,y,d/2+.08,.13,.19,.11);}}
  return g;
}

function tree(parent:T.Group,x:number,z:number,s=1,cypress=false) {
  const y=height(x,z);cylinder(parent,M.trunk,x,y+s*.7,z,.095*s,s*1.4,.065*s,7);
  if(cypress) {for(let i=0;i<4;i++)ball(parent,M.cypress,x,y+s*(.9+i*.44),z,s*(.37-i*.057),s*.66,s*(.37-i*.057));}
  else {
    for(let i=0;i<7;i++){const a=i*2.4;const p=new T.Vector3(x+Math.cos(a)*s*.47,y+s*(1.4+random()*.5),z+Math.sin(a)*s*.47);line(parent,M.trunk,new T.Vector3(x,y+s*.85,z),p,.045*s);ball(parent,M.leaf[i%3],p.x,p.y,p.z,s*.5,s*.4,s*.47);}
  }
}
function lamp(parent:T.Group,x:number,z:number) {
  const y=height(x,z);cylinder(parent,M.metal,x,y+.88,z,.032,1.76,.032,7);cylinder(parent,M.metal,x,y+.1,z,.1,.2);
  box(parent,M.light,x,y+1.78,z,.19,.3,.19,true);box(parent,M.metal,x,y+1.99,z,.28,.07,.28);cylinder(parent,M.metal,x,y+2.06,z,.17,.14,0,4);
  for(const s of [-1,1])for(const t of [-1,1])box(parent,M.metal,x+s*.1,y+1.79,z+t*.1,.025,.35,.025);
}
function cafe(parent:T.Group,g:T.Group,w:number,d:number) {
  const y=1.48;
  for(let i=0;i<9;i++){const a=box(g,i%2?M.white:M.stripe,-w*.46+i*w*.115,y,d/2+.45,w*.115,.035,.85);a.rotation.x=.14;}
  box(g,M.wood,0,y+.37,d/2+.065,1.35,.3,.07,true);
  // A locally generated sign texture belongs to the actual café facade.
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='#365c51';ctx.fillRect(0,0,512,128);ctx.fillStyle='#eee1c4';ctx.font='52px Georgia';ctx.textAlign='center';ctx.fillText('CAFFÈ LUCE',256,82);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;mesh(g,new T.PlaneGeometry(1.3,.27),new T.MeshStandardMaterial({map:tex,roughness:.9}),0,y+.37,d/2+.109);
  g.updateMatrixWorld(true);
  for(const offset of [-.8,.8]) {
    const p=g.localToWorld(new T.Vector3(offset,0,d/2+1.05)),floor=height(p.x,p.z)+.1;
    cylinder(parent,M.paleWood,p.x,floor+.5,p.z,.34,.055,.34,16);cylinder(parent,M.metal,p.x,floor+.25,p.z,.035,.5);
    for(const t of [-1,1]) {const cz=p.z+t*.44;box(parent,M.wood,p.x,floor+.28,cz,.3,.035,.3);box(parent,M.wood,p.x,floor+.51,cz+t*.13,.3,.38,.035);for(const s of [-1,1])box(parent,M.metal,p.x+s*.12,floor+.14,cz,.025,.28,.025);}
  }
}
export interface WorldExtras { lighthouse:T.Group; lighthouseBulb:T.Mesh; lighthouseLight:T.SpotLight; beaconMaterial:T.MeshStandardMaterial; boats:T.Group[]; birds:T.Group[]; }
export function buildVillage(parent:T.Group,occluders:T.Object3D[],dynamic:T.Group):WorldExtras {
  const buildings:[number,number,number,number,number,number,number?,boolean?,boolean?][]=[
    [-5.4,-4.2,2.35,2.05,3.2,5,-.12],[-1.8,-4.8,2.35,2.1,3.7,2,.03], [1.6,-4.4,2.25,2,3.25,3,-.08], [5.2,-3.8,2.2,2.25,2.65,1,.16],
    [-7,-.5,2.05,2.4,2.7,2,-.22], [-3.85,-.7,2.4,2,3.5,1,.08],[-.45,-1.05,2.1,2.1,2.8,5,-.08], [2.8,-.5,2.35,2.05,3.45,0,.09], [6.2,-.3,1.85,2.1,2.55,6,.15,false,true],
    [-5.9,3.15,2.05,1.8,2.45,4,-.18],[-2.8,3.05,2,1.8,2.65,2,.06], [.5,3.2,2.35,1.8,2.85,5,-.05], [4.1,3.0,2.15,1.8,2.4,1,.14],
  ];
  buildings.forEach(b=>{const g=house(parent,occluders,...b);if(b[0]===.5)cafe(parent,g,b[2],b[3]);});
  // A campanile and its open belfry give the skyline a distinct focal point.
  const tower=new T.Group();tower.position.set(-1.8,height(-1.8,-4.8),-4.8);parent.add(tower);
  const base=box(tower,M.walls[5],-.4,3.75,-.42,.98,7.5,1.02,true);tower.updateMatrixWorld(true);occluders.push(base);
  box(tower,M.lightStone,-.4,6.4,-.42,1.12,.17,1.14,true);
  for(const face of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {const side=new T.Group();side.position.set(-.4,0,-.42);side.rotation.y=face;tower.add(side);arch(side,M.lightStone,0,6.55,.54,.58,.82);arch(side,M.glass,0,6.59,.61,.4,.63);}
  const domeGeo=new T.SphereGeometry(.67,18,10,0,Math.PI*2,0,Math.PI/2);mesh(tower,domeGeo,M.roof[1],-.4,7.57,-.42);cylinder(tower,M.metal,-.4,8.36,-.42,.028,.55);box(tower,M.metal,-.4,8.48,-.42,.3,.03,.03);
  // Streets, terraces and a central stone staircase.
  path(parent,[[-8,1.3],[-4.6,1.1],[-1.8,1.2],[2,1.25],[6.5,1.3],[8,3.4]],.75);
  path(parent,[[-7,-2.4],[-4,-2.5],[0,-2.6],[3.9,-2.2],[7,-2.2]],.65);
  path(parent,[[-8,4.8],[-5,5],[-1,5.1],[4.5,5.1],[7.9,4.8]],.86);
  path(parent,[[-8,4.8],[-8.4,1],[-8,-2.8],[-6.5,-5.7],[-3,-6.6],[2,-6.4],[6.4,-5.5],[8.4,-1],[8.2,3.8]],.62);
  for(let i=0;i<33;i++){const z=5.2-i*.34,x=-1.88,y=height(x,z);box(parent,M.lightStone,x,y+.1,z,.72,.18,.37,true);}
  // Piazza with fountain, paved in individual irregular travertine blocks.
  for(let i=0;i<7;i++)for(let j=0;j<3;j++){const x=.2+i*.42,z=.78+j*.34;box(parent,(i+j)%3?M.road:M.lightStone,x,height(x,z)+.08,z,.405,.07,.32,true);}
  const fy=height(1.4,1.25);cylinder(parent,M.lightStone,1.4,fy+.19,1.25,.52,.32,.52,20);cylinder(parent,M.blue,1.4,fy+.36,1.25,.4,.025,.4,20);cylinder(parent,M.lightStone,1.4,fy+.66,1.25,.12,.64,.17,12);ball(parent,M.lightStone,1.4,fy+1.03,1.25,.16);
  for(const [x,z,s,c] of [[-8,-3.8,1.2,1],[-7.3,-5.5,1,1],[-4,-6,1.1,1],[.1,-6.5,1.2,1],[3.7,-5.8,1.35,1],[7.5,-3,1,1],[-8,2.5,.95,0],[7.7,1.7,.8,0],[-4.4,5.6,.65,0],[5.9,5.2,.75,0],[-9,-.9,.7,0]]) tree(parent,x,z,s,!!c);
  for(const [x,z] of [[-7,4.8],[-4.3,1.15],[-.9,5.2],[3.3,1.3],[6.5,4.8],[-5,-2.5]])lamp(parent,x,z);
  for(const [x,z]of[[-8.5,4],[-7.6,5.6],[-6.8,5.2],[-3.6,5.4],[-2.6,5.4],[1.5,5.5],[2.1,5.6],[5.7,4.8],[7.9,5.2],[8.6,1.8],[-5.3,-6.4],[4.3,-6.5]])pot(parent,x,height(x,z)+.08,z,.16,true);
  for(const [x,z]of[[-8.9,1.5],[-7.4,-5.2],[5.8,-5.9],[8.6,-1.3],[6.2,5.6],[-4.2,5.9]]) {
    const y=height(x,z);for(let i=0;i<7;i++){const xx=x+(random()-.5)*.8,zz=z+(random()-.5)*.5;ball(parent,M.leaf[i%3],xx,y+.19,zz,.22,.18,.22);if(i%2===0)ball(parent,M.pink,xx,y+.36,zz,.065);}
  }
  // Clothesline across a lane, with separate suspended textile shapes.
  const a=new T.Vector3(-4.9,height(-4.9,1.6)+2.1,1.6),b=new T.Vector3(-2.55,height(-2.55,1.6)+2.2,1.6);
  curve(parent,M.paleWood,[a,a.clone().lerp(b,.5).add(new T.Vector3(0,-.2,0)),b],.012);
  for(let i=0;i<5;i++){const p=a.clone().lerp(b,(i+1)/6);p.y-=.18;box(parent,i%2?M.white:M.blue,p.x,p.y-.22,p.z,.24,.43,.022);box(parent,M.wood,p.x,p.y,p.z,.025,.06,.04);}
  buildHarbor(parent);
  const lighthouse=buildLighthouse(parent,occluders,dynamic);
  const boats=[boat(dynamic,-4.0,9.0,.7,false),boat(dynamic,-.9,10.4,.85,false),boat(dynamic,7.8,10.5,1.05,true)];
  boats[0].rotation.y=-.3;boats[1].rotation.y=.45;boats[2].rotation.y=-.7;
  const birds:T.Group[]=[];
  for(let i=0;i<6;i++) {const b=new T.Group();for(const sign of [-1,1]){const wing=box(b,M.white,sign*.13,0,0,.29,.025,.075);wing.rotation.z=sign*.22;}dynamic.add(b);birds.push(b);}
  return {...lighthouse,boats,birds};
}
function buildHarbor(parent:T.Group) {
  // A low stone breakwater and board-by-board wooden finger pier.
  for(let i=0;i<22;i++){const x=-7+i*.43,z=7.9+.08*Math.sin(i*.25);box(parent,M.stone,x,.37,z,.43,.8,.74,true);box(parent,M.lightStone,x,.82,z,.43,.16,.8,true);}
  for(let i=0;i<25;i++){const z=7.65+i*.15;box(parent,M.paleWood,-2.8,.64,z,1.05,.13,.143,true);}
  for(const x of [-3.25,-2.35])for(const z of [8,9.2,10.6,11.3]){cylinder(parent,M.wood,x,.43,z,.065,1.25,.07,8);cylinder(parent,M.paleWood,x,1.08,z,.09,.08);}
  for(const x of [-6.4,-5.1,-1.8,1.3]){cylinder(parent,M.metal,x,1,7.9,.07,.24);cylinder(parent,M.metal,x,1.13,7.9,.12,.045);}
  curve(parent,M.paleWood,[new T.Vector3(-3.25,1.1,8),new T.Vector3(-3.25,.9,8.6),new T.Vector3(-3.25,1.1,9.2)],.018);
  for(let i=0;i<5;i++){const t=i*Math.PI/2.5;const m=mesh(parent,new T.TorusGeometry(.13,.032,5,12),M.paleWood,-2.7,.76+i*.025,8.2);m.rotation.x=Math.PI/2;m.rotation.z=t;}
  for(const [x,z]of[[-5.3,8.7],[-.2,9.5]]){ball(parent,M.roof[1],x,.1,z,.12,.16,.12);cylinder(parent,M.white,x,.13,z,.122,.055);}
}
function buildLighthouse(parent:T.Group,occluders:T.Object3D[],dynamic:T.Group) {
  const x=8.35,z=3.8,y=height(x,z);const g=new T.Group();g.position.set(x,y,z);parent.add(g);
  cylinder(g,M.lightStone,0,.12,0,.92,.24,.92,24);
  const body=cylinder(g,M.walls[5],0,1.8,0,.58,3.6,.43,24);g.updateMatrixWorld(true);occluders.push(body);
  for(let i=0;i<5;i++)cylinder(g,M.lightStone,0,.55+i*.58,0,.585-i*.022,.08,.585-i*.022,24);
  arch(g,M.wood,0,.24,.58,.39,.82);
  box(g,M.glass,0,2.4,.48,.19,.4,.025);
  const beaconMaterial=M.glass.clone();
  cylinder(g,M.lightStone,0,3.64,0,.7,.16,.7,24);cylinder(g,beaconMaterial,0,4,0,.39,.6,.39,16);
  for(let i=0;i<12;i++){const t=i/12*Math.PI*2;cylinder(g,M.metal,Math.cos(t)*.65,3.88,Math.sin(t)*.65,.018,.42,.018,5);}
  const ring=mesh(g,new T.TorusGeometry(.65,.022,5,32),M.metal,0,4.08,0);ring.rotation.x=Math.PI/2;
  for(let i=0;i<8;i++){const t=i/8*Math.PI*2;box(g,M.metal,Math.cos(t)*.41,4,Math.sin(t)*.41,.035,.65,.035);}
  cylinder(g,M.metal,0,4.39,0,.59,.44,0,24);cylinder(g,M.metal,0,4.7,0,.025,.3);
  const dg=new T.Group();dg.position.copy(g.position);dynamic.add(dg);
  const bulb=ball(dg,M.light,0,4,0,.18,.27,.18);
  const light=new T.SpotLight('#ffd491',0,35,.14,.5,1);light.position.set(0,4,0);light.target.position.set(18,1,8);dg.add(light,light.target);
  return {lighthouse:g,lighthouseBulb:bulb,lighthouseLight:light,beaconMaterial};
}
export function boat(parent:T.Group,x:number,z:number,s:number,sail:boolean) {
  const g=new T.Group();g.position.set(x,.07,z);g.scale.setScalar(s);parent.add(g);
  // Smooth curved hull built from cross sections, including a pointed bow.
  const v:number[]=[],uv:number[]=[],indices:number[]=[],rows=16,cols=12;
  for(let i=0;i<=rows;i++){const t=i/rows,zz=(t-.5)*2.5,width=Math.pow(Math.sin(t*Math.PI),.65)*.43+.012;
    for(let j=0;j<=cols;j++){const a=j/cols*Math.PI,vx=Math.cos(a)*width,vy=-Math.sin(a)*.35+.23;v.push(vx,vy,zz);uv.push(t,j/cols);}}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+1,c=a+cols+1,d=c+1;indices.push(a,b,c,b,d,c);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const hull=mesh(g,geo,M.boat);hull.material=new T.MeshStandardMaterial({color:'#e5dec9',roughness:.72,side:T.DoubleSide});
  for(const side of [-1,1])curve(g,M.boatBlue,Array.from({length:17},(_,i)=>{const t=i/16;return new T.Vector3(side*(Math.pow(Math.sin(t*Math.PI),.65)*.43+.012),.24,(t-.5)*2.5);}),.045);
  for(const zz of [-.65,0,.6])box(g,M.wood,0,.18,zz,.62,.045,.2,true);
  if(sail){cylinder(g,M.wood,0,1.55,0,.025,3.1);line(g,M.wood,new T.Vector3(0,.8,0),new T.Vector3(0,.8,1.1),.023);
    const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute([.03,3,0,.06,.85,0,.16,.85,1.05],3));sg.computeVertexNormals();mesh(g,sg,new T.MeshStandardMaterial({color:'#f1e4c7',roughness:1,side:T.DoubleSide}));
    curve(g,M.paleWood,[new T.Vector3(0,3,0),new T.Vector3(0,.25,-1.2)],.009);
  }else{box(g,M.boatBlue,0,.34,-.75,.4,.38,.35,true);line(g,M.wood,new T.Vector3(-.5,.3,-.2),new T.Vector3(.6,.37,.7),.025);}
  g.userData={homeX:x,homeZ:z,moving:false};return g;
}

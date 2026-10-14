import assert from 'node:assert/strict';
import { Bathymetry } from '../src/world/bathymetry';
import { RippleField } from '../src/world/rippleField';
import { sampleSurfaceHeight } from '../src/world/oceanWaves';

const depth=new Bathymetry();
assert(depth.sample(12,9)<depth.sample(24,18),'Shelf must become deeper offshore');
const field=new RippleField(true,depth);
field.impulse(12,9,.25,'click');
assert(field.sample(12,9)<-.05,'Click produces an immediate depression');
let peak=0,neighbor=0;
for(let i=0;i<120;i++){field.update(1/60);peak=Math.max(peak,field.energy);neighbor=Math.max(neighbor,Math.abs(field.sample(13.5,9)));}
assert(neighbor>.0001,'Impulse must physically propagate away from its origin');
assert(peak>0&&Number.isFinite(peak),'Solver energy must remain finite');
const height=field.sample(12.6,9.3),velocity=field.sample(12.6,9.3,1);field.setQuality(false);
assert(Math.abs(field.sample(12.6,9.3)-height)<.006,'Quality switch must preserve height');
assert(Math.abs(field.sample(12.6,9.3,1)-velocity)<.06,'Quality switch must preserve velocity');
for(let i=0;i<900;i++)field.update(1/60);
assert(field.energy<peak*.005,'Energy must decay without abruptly deleting individual waves');
for(let i=0;i<600;i++){
  if(i%7===0)field.impulse(12+Math.sin(i)*2,9+Math.cos(i*.7)*2,.4,i%2?'drag':'click');
  field.update(i%13===0?.15:1/60);
  assert(Number.isFinite(field.energy),'Repeated impulses and frame stalls must be stable');
}
let max=0;for(let i=0;i<field.data.length;i+=2)max=Math.max(max,Math.abs(field.data[i]));
assert(max<.55,'Accumulated displacements must not become jelly-like');
for(const p of [[12,9],[-13,1],[20,-4],[9,10]])assert(Number.isFinite(sampleSurfaceHeight(p[0],p[1],41,1,depth,field)));
assert.equal(field.sample(65,0),0,'Disturbance is bounded');
field.dispose();depth.dispose();
console.log(JSON.stringify({result:'pass',propagatedHeight:neighbor,peakEnergy:peak,maxDisturbance:max,checks:10}));

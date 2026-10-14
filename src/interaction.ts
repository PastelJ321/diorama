import * as T from 'three';
import { Water } from './world/water';

type Contact={x:number;y:number;startX:number;startY:number;mode:'sea'|'orbit';last:T.Vector3|null;lastTime:number};
export class Interaction {
  target=new T.Vector3(0,2.35,0);
  yaw=.64;pitch=.6;zoom=1;private yawGoal=this.yaw;private pitchGoal=this.pitch;private zoomGoal=1;
  private contacts=new Map<number,Contact>();private pinch=0;private ray=new T.Raycaster();private ndc=new T.Vector2();private seaPlane=new T.Plane(new T.Vector3(0,1,0),0);private hit=new T.Vector3();
  strength=1;private hoverPoint:T.Vector3|null=null;private hoverTime=0;
  metrics={hover:0,click:0,drag:0,orbit:0,lastDown:[0,0],lastMode:''};
  private abort=new AbortController();
  constructor(private canvas:HTMLCanvasElement,private camera:T.OrthographicCamera,private water:Water,private occluders:T.Object3D[],private time:()=>number,private actions:{objects:T.Object3D[];run:()=>void}[]) {
    const opts={signal:this.abort.signal};
    canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
    canvas.addEventListener('pointerdown',this.down,opts);canvas.addEventListener('pointermove',this.move,opts);
    canvas.addEventListener('pointerup',this.up,opts);canvas.addEventListener('pointercancel',this.cancel,opts);canvas.addEventListener('lostpointercapture',this.cancel,opts);
    canvas.addEventListener('wheel',this.wheel,{...opts,passive:false});
  }
  private pick(x:number,y:number) {
    const r=this.canvas.getBoundingClientRect();this.ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);
    if(!this.ray.ray.intersectPlane(this.seaPlane,this.hit))return null;
    const hits=this.ray.intersectObjects(this.occluders,true);
    if(hits.length&&hits[0].distance<this.ray.ray.origin.distanceTo(this.hit))return null;
    // Solve the ray against the same displaced height field, rather than a screen overlay.
    for(let k=0;k<2;k++){
      const h=this.sampleHeight(this.hit.x,this.hit.z),d=(h-this.ray.ray.origin.y)/this.ray.ray.direction.y;
      this.ray.ray.at(d,this.hit);
    }
    return this.hit;
  }
  private sampleHeight(x:number,z:number){
    const t=this.time(),dirs=[[.8,.6],[-.38,.92],[.96,-.28],[.42,.9]],freq=[.62,1.17,2.1,3.6],amp=[.065,.036,.015,.007];let h=0;
    for(let i=0;i<4;i++)h+=Math.sin((x*dirs[i][0]+z*dirs[i][1])*freq[i]+t*(.36+i*.19))*amp[i];
    for(const r of this.water.ripples){const age=t-r.z;if(age<0||age>=9||r.w===0)continue;const front=Math.hypot(x-r.x,z-r.y)-age*1.7;h+=Math.sin(front*5.2)*Math.exp(-front*front*1.35-age*.57)*r.w;}
    return h;
  }
  private down=(e:PointerEvent)=>{
    this.canvas.setPointerCapture(e.pointerId);
    const p=this.pick(e.clientX,e.clientY),force=e.button===2||e.shiftKey;
    const contact:Contact={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,mode:p&&!force?'sea':'orbit',last:p?.clone()??null,lastTime:this.time()};
    this.contacts.set(e.pointerId,contact);this.hoverPoint=null;
    this.metrics.lastDown=[e.clientX,e.clientY];this.metrics.lastMode=contact.mode;
    if(this.contacts.size===2){const c=[...this.contacts.values()];this.pinch=Math.hypot(c[0].x-c[1].x,c[0].y-c[1].y);c.forEach(v=>v.mode='orbit');}
    else if(p&&!force){this.water.addRipple(p.x,p.z,this.time(),.25*this.strength);this.metrics.click++;}
    this.canvas.classList.toggle('orbiting',contact.mode==='orbit');
  };
  private move=(e:PointerEvent)=>{
    const c=this.contacts.get(e.pointerId),now=this.time();
    if(c){const dx=e.clientX-c.x,dy=e.clientY-c.y;c.x=e.clientX;c.y=e.clientY;
      if(this.contacts.size===2){const pair=[...this.contacts.values()],d=Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);if(this.pinch>0)this.zoomGoal=T.MathUtils.clamp(this.zoomGoal*d/this.pinch,.65,2.1);this.pinch=d;this.yawGoal-=dx*.003;this.pitchGoal+=dy*.002;}
      else if(c.mode==='orbit'){this.yawGoal-=dx*.005;this.pitchGoal+=dy*.004;this.metrics.orbit++;}
      else {const p=this.pick(e.clientX,e.clientY);if(p&&(!c.last||p.distanceTo(c.last)>.15)&&now-c.lastTime>.045){const speed=c.last?p.distanceTo(c.last)/Math.max(now-c.lastTime,.02):1;this.water.addRipple(p.x,p.z,now,(.1+Math.min(speed,18)*.008)*this.strength);this.metrics.drag++;if(c.last)c.last.copy(p);else c.last=p.clone();c.lastTime=now;}}
      this.pitchGoal=T.MathUtils.clamp(this.pitchGoal,.25,1.2);
    }else{const p=this.pick(e.clientX,e.clientY);this.canvas.classList.toggle('over-sea',!!p);
      if(p){if(this.hoverPoint&&p.distanceTo(this.hoverPoint)>.17&&now-this.hoverTime>.075){const speed=p.distanceTo(this.hoverPoint)/Math.max(now-this.hoverTime,.03);this.water.addRipple(p.x,p.z,now,(.025+Math.min(speed,16)*.003)*this.strength);this.metrics.hover++;this.hoverPoint.copy(p);this.hoverTime=now;}else if(!this.hoverPoint){this.hoverPoint=p.clone();this.hoverTime=now;}}
      else this.hoverPoint=null;
    }
  };
  private up=(e:PointerEvent)=>{
    const c=this.contacts.get(e.pointerId);
    if(c&&e.button===0&&!e.shiftKey&&this.contacts.size===1&&Math.hypot(e.clientX-c.startX,e.clientY-c.startY)<5){
      this.pick(e.clientX,e.clientY);const obstruction=this.ray.intersectObjects(this.occluders,true)[0]?.distance??Infinity;
      for(const a of this.actions){const hit=this.ray.intersectObjects(a.objects,true)[0];if(hit&&hit.distance<=obstruction+.08){a.run();break;}}
    }
    this.cancel(e);
  };
  private cancel=(e:PointerEvent)=>{this.contacts.delete(e.pointerId);if(this.contacts.size<2)this.pinch=0;if(this.contacts.size===1){const c=[...this.contacts.values()][0];c.last=null;c.mode='orbit';}if(!this.contacts.size)this.canvas.classList.remove('orbiting');};
  private wheel=(e:WheelEvent)=>{e.preventDefault();this.zoomGoal=T.MathUtils.clamp(this.zoomGoal*Math.exp(-e.deltaY*.001),.65,2.1);};
  reset(){this.yawGoal=.64;this.pitchGoal=.6;this.zoomGoal=1;}
  update(dt:number){const f=1-Math.exp(-dt*9);this.yaw=T.MathUtils.lerp(this.yaw,this.yawGoal,f);this.pitch=T.MathUtils.lerp(this.pitch,this.pitchGoal,f);this.zoom=T.MathUtils.lerp(this.zoom,this.zoomGoal,f);this.camera.position.set(45*Math.sin(this.yaw)*Math.cos(this.pitch),45*Math.sin(this.pitch),45*Math.cos(this.yaw)*Math.cos(this.pitch)).add(this.target);this.camera.zoom=this.zoom;this.camera.lookAt(this.target);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();}
  dispose(){this.abort.abort();}
}

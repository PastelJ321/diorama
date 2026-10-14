import * as T from 'three';
import { Water } from './water';
import { surfaceGLSL } from './waterShader';

/** Optional ?qa=1: compare the actual compiled GPU height field against picking.
 * Readback runs only during verification, never in normal pointer handling.
 */
export class SurfaceProbe {
  private scene=new T.Scene();private camera=new T.OrthographicCamera();
  private points=[new T.Vector2(12,9),new T.Vector2(-13,1),new T.Vector2(9,10),new T.Vector2(20,-4),new T.Vector2(40,40),new T.Vector2(7,11),new T.Vector2(-7,9),new T.Vector2(11,4)];
  private target=new T.WebGLRenderTarget(8,1,{type:T.FloatType,depthBuffer:false});
  private values=new Float32Array(32);private material:T.ShaderMaterial;private geometry=new T.PlaneGeometry(2,2);
  error:number|null=null;checks=0;
  constructor(private water:Water){
    this.material=new T.ShaderMaterial({uniforms:{...water.mesh.material.uniforms,uSamples:{value:this.points}},
      vertexShader:'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:`${surfaceGLSL}\nuniform vec2 uSamples[8];void main(){int i=int(gl_FragCoord.x);float h=surfaceHeight(uSamples[i]);gl_FragColor=vec4(h,0.0,0.0,1.0);}`});
    this.scene.add(new T.Mesh(this.geometry,this.material));
  }
  verify(renderer:T.WebGLRenderer){
    if(!renderer.extensions.has('EXT_color_buffer_float'))return;
    const previous=renderer.getRenderTarget();
    try{renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);renderer.readRenderTargetPixels(this.target,0,0,8,1,this.values);
      let error=0;this.points.forEach((p,i)=>{error=Math.max(error,Math.abs(this.values[i*4]-this.water.sampleHeight(p.x,p.y)));});this.error=error;this.checks++;
    }finally{renderer.setRenderTarget(previous);}
  }
  dispose(){this.target.dispose();this.geometry.dispose();this.material.dispose();}
}

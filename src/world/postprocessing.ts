import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** Restrained contact occlusion makes joints, roof tiles and stonework readable. */
export class Finish {
  composer:EffectComposer;ao:GTAOPass;enabled:boolean;
  constructor(private renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera,high:boolean){
    const target=new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,samples:4});
    this.composer=new EffectComposer(renderer,target);this.composer.addPass(new RenderPass(scene,camera));
    this.ao=new GTAOPass(scene,camera,innerWidth,innerHeight);this.ao.blendIntensity=.42;
    this.ao.updateGtaoMaterial({radius:.55,distanceExponent:1.5,thickness:.7});this.ao.updatePdMaterial({radius:4,lumaPhi:8,depthPhi:2,normalPhi:3});
    this.composer.addPass(this.ao);this.composer.addPass(new OutputPass());this.enabled=high;this.resize();
  }
  resize(){this.composer.setPixelRatio(this.renderer.getPixelRatio());this.composer.setSize(innerWidth,innerHeight);this.ao.setSize(Math.round(innerWidth*.85),Math.round(innerHeight*.85));}
  render(scene:T.Scene,camera:T.Camera){if(this.enabled)this.composer.render();else this.renderer.render(scene,camera);}
  dispose(){this.ao.dispose();for(const p of this.composer.passes)if(p!==this.ao)p.dispose();this.composer.dispose();}
}

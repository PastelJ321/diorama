import * as T from 'three';
export class AtmosphericSky {
  readonly mesh:T.Mesh;
  readonly uniforms={uHorizon:{value:new T.Color('#cce8e4')},uZenith:{value:new T.Color('#739dc7')},uSun:{value:new T.Color('#fff0d7')},uDirection:{value:new T.Vector3(-.5,.6,-.65)},uDay:{value:1}};
  constructor(scene:T.Scene){
    const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:this.uniforms,
      vertexShader:`varying vec3 vSkyWorld;void main(){vSkyWorld=(modelMatrix*vec4(position,1.0)).xyz;vec4 clip=projectionMatrix*viewMatrix*vec4(vSkyWorld,1.0);clip.z=clip.w*.999999;gl_Position=clip;}`,
      fragmentShader:`varying vec3 vSkyWorld;uniform vec3 uHorizon,uZenith,uSun,uDirection;uniform float uDay;
        void main(){vec3 ray=normalize(vSkyWorld-cameraPosition);float elevation=max(ray.y,0.0);
          vec3 color=mix(uHorizon,uZenith,pow(elevation,.55));float align=max(dot(ray,uDirection),0.0);
          color+=uSun*(pow(align,28.0)*.065+smoothstep(.9993,.9998,align)*2.0)*(.12+.88*uDay);
          gl_FragColor=vec4(color,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    this.mesh=new T.Mesh(new T.SphereGeometry(140,32,16),material);this.mesh.name='Atmospheric horizon and sun';this.mesh.frustumCulled=false;this.mesh.renderOrder=-100;scene.add(this.mesh);
  }
}

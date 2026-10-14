export function radius(theta:number){return 1+.045*Math.sin(theta*5+.6)+.025*Math.sin(theta*9-1.2);}
export function height(x:number,z:number){const ridge=1/(1+Math.exp((z+.8)*.72));return 1.35+ridge*3.1+.18*Math.sin(x*.55)*Math.cos(z*.4);}

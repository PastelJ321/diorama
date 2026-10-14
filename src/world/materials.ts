import * as T from 'three';

let seed = 317;
export function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function grain(kind: 'plaster' | 'stone' | 'wood') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b8b8b8'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 30000; i++) {
    const v = 125 + random() * 100; ctx.fillStyle = `rgb(${v},${v},${v})`;
    const x = random() * 256, y = random() * 256;
    ctx.fillRect(x, y, kind === 'wood' ? random() * 33 + 3 : 1.1, kind === 'wood' ? .7 : 1.1);
  }
  if (kind === 'stone') {
    ctx.strokeStyle = '#8e8e8e'; ctx.lineWidth = 1;
    for (let y = 0; y < 256; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      for (let x = (y % 64 ? 24 : 0); x < 256; x += 48) {ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();} }
  }
  const tex = new T.CanvasTexture(canvas); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(2, 2); return tex;
}
const plaster = grain('plaster'), stone = grain('stone'), wood = grain('wood');
function patina(){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#faf8f1';ctx.fillRect(0,0,256,256);
  for(let i=0;i<170;i++){const x=random()*256,y=random()*256,r=3+random()*24;const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'rgba(131,116,97,.055)');gradient.addColorStop(1,'rgba(131,116,97,0)');ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);}
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;return tex;
}
const weathering=patina();
function mat(color: string, roughness = .85, bump?: T.Texture, bumpScale = .055) {
  return new T.MeshStandardMaterial({ color, roughness, ...(bump?{bumpMap:bump,bumpScale}:{}) });
}
export const M = {
  walls: ['#eedbc3', '#dfa38e', '#dfc083', '#cad3b2', '#ce9682', '#f0e2cb', '#b8ced0'].map(c => {const m=mat(c,.94,plaster,.04);m.map=weathering;m.roughnessMap=plaster;return m;}),
  roof: ['#ab6048', '#bb7258', '#b87b61', '#a9664d'].map(c => {const m=mat(c,.83,plaster,.025);m.map=weathering;m.roughnessMap=plaster;return m;}),
  stone: mat('#c1b59b', .98, stone, .12), lightStone: mat('#dfd2b5', .94, stone, .06), rock: mat('#b9ad94', 1, plaster, .15),
  ground: mat('#b5b799', 1, plaster, .08), sand: mat('#deceb0', 1, plaster), road: mat('#d6c9ad', .98, stone,.055),
  wood: mat('#7c5c43', .9, wood), paleWood: mat('#b59971', .85, wood), shutter: mat('#47716a', .85, wood), blue: mat('#457d88', .7, wood),
  glass: new T.MeshStandardMaterial({ color: '#213e40', roughness: .24, metalness: .18, emissive: '#f6bd62', emissiveIntensity: 0 }),
  glassOff: new T.MeshStandardMaterial({color:'#284347',roughness:.27,metalness:.18}),
  metal: mat('#444e47', .55), cream: mat('#ede0bf', .85), terracotta: mat('#b76c50'), trunk: mat('#736348', 1, wood),
  leaf: [mat('#59745a', 1), mat('#718364', 1), mat('#8a9672', 1)], cypress: mat('#3e6050', 1), pink: mat('#bc6582'), flower: mat('#e5c46d'),
  awning: mat('#d5b67b'), white: mat('#f2e5cf'), stripe: mat('#769894'), boat: mat('#d8d8c4'), boatBlue: mat('#517d87'),
  light: new T.MeshStandardMaterial({color: '#ffe3a1', emissive: '#ffcd70', emissiveIntensity: .05, roughness: .4}),
};

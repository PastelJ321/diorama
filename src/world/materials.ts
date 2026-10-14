import * as T from 'three';

let seed = 317;
export function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function grain(kind: 'plaster' | 'stone' | 'wood') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b8b8b8'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 8500; i++) {
    const v = 125 + random() * 100; ctx.fillStyle = `rgb(${v},${v},${v})`;
    const x = random() * 128, y = random() * 128;
    ctx.fillRect(x, y, kind === 'wood' ? random() * 19 + 2 : 1.5, kind === 'wood' ? .7 : 1.5);
  }
  if (kind === 'stone') {
    ctx.strokeStyle = '#8e8e8e'; ctx.lineWidth = 1;
    for (let y = 0; y < 128; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
      for (let x = (y % 64 ? 24 : 0); x < 128; x += 48) {ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();} }
  }
  const tex = new T.CanvasTexture(canvas); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(2, 2); return tex;
}
const plaster = grain('plaster'), stone = grain('stone'), wood = grain('wood');
function mat(color: string, roughness = .85, bump?: T.Texture, bumpScale = .055) {
  return new T.MeshStandardMaterial({ color, roughness, ...(bump?{bumpMap:bump,bumpScale}:{}) });
}
export const M = {
  walls: ['#eedac0', '#e7b6a0', '#e7ce96', '#d7d7b8', '#d9a390', '#f0e3cd', '#c4cfd0'].map(c => mat(c, .95, plaster)),
  roof: ['#ad5942', '#bd6850', '#c7775b', '#99533f'].map(c => mat(c, .96, plaster, .035)),
  stone: mat('#c1b59b', .98, stone, .12), lightStone: mat('#dfd2b5', .94, stone, .06), rock: mat('#b9ad94', 1, plaster, .15),
  ground: mat('#b9b899', 1, plaster, .16), sand: mat('#deceb0', 1, plaster), road: mat('#d6c9ad', .98, stone),
  wood: mat('#7c5c43', .9, wood), paleWood: mat('#b59971', .85, wood), shutter: mat('#47716a', .85, wood), blue: mat('#457d88', .7, wood),
  glass: new T.MeshStandardMaterial({ color: '#213e40', roughness: .24, metalness: .18, emissive: '#f6bd62', emissiveIntensity: 0 }),
  glassOff: new T.MeshStandardMaterial({color:'#284347',roughness:.27,metalness:.18}),
  metal: mat('#444e47', .55), cream: mat('#ede0bf', .85), terracotta: mat('#b76c50'), trunk: mat('#736348', 1, wood),
  leaf: [mat('#59745a', 1), mat('#718364', 1), mat('#8a9672', 1)], cypress: mat('#3e6050', 1), pink: mat('#bc6582'), flower: mat('#e5c46d'),
  awning: mat('#d5b67b'), white: mat('#f2e5cf'), stripe: mat('#769894'), boat: mat('#d8d8c4'), boatBlue: mat('#517d87'),
  light: new T.MeshStandardMaterial({color: '#ffe3a1', emissive: '#ffcd70', emissiveIntensity: .05, roughness: .4}),
};

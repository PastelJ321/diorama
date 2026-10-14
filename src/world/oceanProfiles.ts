export interface OceanProfile {
  shallow:string;middle:string;deep:string;highlight:string;absorption:readonly [number,number,number];clarity:number;roughness:number;waves:number;glint:number;reflectionTint:string;
}
export const seaPresets={
  'Opaline Lagoon':{shallow:'#a6e6d9',middle:'#38bdb1',deep:'#126983',highlight:'#fff4db',absorption:[.48,.16,.11],clarity:1.25,roughness:.115,waves:.83,glint:.9,reflectionTint:'#eef6ef'},
  'Crystal Turquoise':{shallow:'#84deca',middle:'#18aaa6',deep:'#095776',highlight:'#f5f1dc',absorption:[.52,.17,.105],clarity:1.05,roughness:.105,waves:1,glint:1.05,reflectionTint:'#f4f6f0'},
  'Sapphire Coast':{shallow:'#64d5b1',middle:'#0eaaa5',deep:'#124975',highlight:'#f7f4e8',absorption:[.59,.2,.11],clarity:.95,roughness:.1,waves:1.08,glint:1.1,reflectionTint:'#eef4fa'},
  'Emerald Dream':{shallow:'#b0e3c8',middle:'#41ae9a',deep:'#1c626f',highlight:'#f1f0d8',absorption:[.43,.087,.095],clarity:1.2,roughness:.13,waves:.87,glint:.85,reflectionTint:'#edf7ec'},
  'Pearlescent Dusk':{shallow:'#a7d6d3',middle:'#559ca9',deep:'#3d5778',highlight:'#ffe3ce',absorption:[.38,.14,.085],clarity:1.1,roughness:.12,waves:.9,glint:1.05,reflectionTint:'#e9bed6'},
  'Moonlit Azure':{shallow:'#7cc7cb',middle:'#3b839e',deep:'#142f57',highlight:'#d7e6fa',absorption:[.53,.18,.092],clarity:.95,roughness:.095,waves:.92,glint:2,reflectionTint:'#cedff8'},
} as const satisfies Record<string,OceanProfile>;
export type ProfileName=keyof typeof seaPresets;
export const legacyProfiles={Mediterranean:'Crystal Turquoise',Azure:'Sapphire Coast',Emerald:'Emerald Dream',Sunset:'Pearlescent Dusk',Midnight:'Moonlit Azure'} as const;
export type SeaPreset=ProfileName|keyof typeof legacyProfiles;
export function resolveProfile(name:string|null):ProfileName{
  if(name&&Object.hasOwn(legacyProfiles,name))return legacyProfiles[name as keyof typeof legacyProfiles];
  return name&&Object.hasOwn(seaPresets,name)?name as ProfileName:'Opaline Lagoon';
}

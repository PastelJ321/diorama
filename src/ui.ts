import { seaPresets, type SeaPreset } from './world/water';
import { resolveProfile } from './world/oceanProfiles';
import { timePresets, type TimePreset } from './world/lighting';

const icons={
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
  reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="17" r="2.5"/>',
  arrow:'<path d="m8 5 7 7-7 7"/>',
  sea:'<path d="M2 8q3-4 6 0t6 0t6 0M2 15q3-4 6 0t6 0t6 0"/>',
  mouse:'<rect x="7" y="2" width="10" height="16" rx="5"/><path d="M12 5v4m-3 12h6"/>',
  moon:'<path d="M20 14a8.5 8.5 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5.8-1.5 1.5-1.5 2M12 17h.01"/>',
};
function icon(name:keyof typeof icons){return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;}
export interface UICallbacks {sea:(s:SeaPreset)=>void;color:(c:string)=>void;time:(s:TimePreset)=>void;reset:()=>void;strength:(n:number)=>void;quality:(s:string)=>void;}
export function buildUI(root:HTMLElement,cb:UICallbacks){
  const params=new URLSearchParams(location.search),initialSea=resolveProfile(params.get('sea')),requestedTime=params.get('time'),initialTime=requestedTime&&Object.hasOwn(timePresets,requestedTime)?requestedTime:'Morning';
  root.innerHTML=`
  <main id="world" aria-label="Interactive 3D coastal village"></main>
  <div class="loading" id="loading"><div class="loading-mark">${icon('sea')}</div><p>A little world is taking shape</p><span>PORTO LUCE</span></div>
  <div class="interface">
    <header class="masthead"><a class="wordmark" href="/" aria-label="Porto Luce home"><span class="brand-mark">${icon('sea')}</span>PORTO LUCE</a><div class="header-actions"><span class="live-label"><i></i> A LIVING MINIATURE</span><button id="reset" class="icon-button" title="Reset view" aria-label="Reset camera view">${icon('reset')}</button><button id="settings-toggle" class="icon-button" title="Scene settings" aria-label="Scene settings" aria-expanded="true" aria-controls="settings">${icon('settings')}</button></div></header>
    <section class="title-block"><div class="eyebrow"><span>THE LITTLE WORLD SERIES</span><b>01 / ITALIA</b></div><h1>A slower<br>kind of <em>somewhere.</em></h1><p>A coastal village. An endless sea.<br>A moment that belongs to you.</p><div class="location"><span class="location-line"></span> PORTO LUCE, THE IMAGINED RIVIERA</div></section>
    <aside class="settings glass" id="settings" aria-label="Scene settings"><div class="panel-heading"><span>${icon('sea')} THE SEA</span><button id="collapse" aria-label="Collapse settings">−</button></div><div class="preset-name"><strong id="sea-name">${initialSea}</strong><span>MAKE IT YOURS</span></div><div class="swatches">${Object.entries(seaPresets).map(([name,colors],i)=>`<button class="swatch ${name===initialSea?'active':''}" data-sea="${name}" style="--swatch:${colors.shallow}" title="${name}" aria-label="${name} sea" aria-pressed="${name===initialSea}"></button>`).join('')}<label class="custom-color" title="Choose your own sea color">+<input id="custom-color" type="color" value="#a6e6d9" aria-label="Custom sea color"/></label></div><div class="setting-divider"></div><label class="range-label" for="strength">Ripple sensitivity<span id="strength-value">Gentle</span></label><input type="range" id="strength" min="0.25" max="2" step="0.05" value="1"/><div class="quality-row"><label for="quality">Detail level</label><select id="quality"><option value="auto">Automatic</option><option value="high">High</option><option value="low">Balanced</option></select></div></aside>
    <footer><div class="explore-hint"><span class="hint-icon">${icon('mouse')}</span><div><strong>Touch the sea. Take a breath.</strong><p>Move to ripple · Drag the land to explore</p></div><button id="help-toggle" class="help-button" aria-label="Show interaction guide" aria-expanded="false" aria-controls="help">${icon('help')}</button></div><div class="time-controls glass" role="group" aria-label="Time of day"><span class="time-label">${icon('sun')} THE LIGHT</span><div class="times">${Object.keys(timePresets).map((name,i)=>`<button data-time="${name}" class="${name===initialTime?'active':''}" aria-pressed="${name===initialTime}">${name==='Night'?icon('moon'):''}<span>${name}</span></button>`).join('')}</div></div></footer>
    <div class="help glass" id="help" hidden><strong>A small guide to slowing down</strong><p>Move over the sea to leave ripples.<br>Click for a splash; drag to stir the water.<br>Drag the land, or use right / Shift-drag to orbit.<br>Scroll to get closer. Two fingers orbit and pinch.<br>Click the lighthouse or a boat to bring it to life.</p></div>
    <div class="scene-note"><span class="note-line"></span> NOTHING TO DO. JUST BE HERE.</div>
  </div>`;
  const settings=document.querySelector<HTMLElement>('#settings')!,toggle=document.querySelector<HTMLButtonElement>('#settings-toggle')!;
  const collapse=()=>{const closed=settings.classList.toggle('collapsed');toggle.setAttribute('aria-expanded',String(!closed));};
  const compact=matchMedia('(max-width:700px)');
  if(compact.matches){settings.classList.add('collapsed');toggle.setAttribute('aria-expanded','false');}
  compact.addEventListener('change',e=>{if(e.matches){settings.classList.add('collapsed');toggle.setAttribute('aria-expanded','false');}});
  toggle.onclick=collapse;document.querySelector<HTMLButtonElement>('#collapse')!.onclick=collapse;
  document.querySelector<HTMLButtonElement>('#reset')!.onclick=cb.reset;
  document.querySelectorAll<HTMLButtonElement>('[data-sea]').forEach(b=>b.onclick=()=>{
    const name=b.dataset.sea as SeaPreset;cb.sea(name);document.querySelector('#sea-name')!.textContent=name;
    document.querySelectorAll<HTMLButtonElement>('[data-sea]').forEach(s=>{s.classList.toggle('active',s===b);s.setAttribute('aria-pressed',String(s===b));});
  });
  document.querySelector<HTMLInputElement>('#custom-color')!.oninput=e=>{cb.color((e.target as HTMLInputElement).value);document.querySelector('#sea-name')!.textContent='Your own horizon';document.querySelectorAll('[data-sea]').forEach(s=>{s.classList.remove('active');s.setAttribute('aria-pressed','false');});};
  document.querySelectorAll<HTMLButtonElement>('[data-time]').forEach(b=>b.onclick=()=>{cb.time(b.dataset.time as TimePreset);document.querySelectorAll<HTMLButtonElement>('[data-time]').forEach(s=>{s.classList.toggle('active',s===b);s.setAttribute('aria-pressed',String(s===b));});});
  document.querySelector<HTMLInputElement>('#strength')!.oninput=e=>{const n=Number((e.target as HTMLInputElement).value);cb.strength(n);document.querySelector('#strength-value')!.textContent=n<.7?'Quiet':n<1.4?'Gentle':'Playful';};
  document.querySelector<HTMLSelectElement>('#quality')!.onchange=e=>cb.quality((e.target as HTMLSelectElement).value);
  const help=document.querySelector<HTMLElement>('#help')!,helpToggle=document.querySelector<HTMLButtonElement>('#help-toggle')!;helpToggle.onclick=()=>{help.hidden=!help.hidden;helpToggle.setAttribute('aria-expanded',String(!help.hidden));};
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){help.hidden=true;helpToggle.setAttribute('aria-expanded','false');}if(e.key.toLowerCase()==='r'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLSelectElement))cb.reset();});
}

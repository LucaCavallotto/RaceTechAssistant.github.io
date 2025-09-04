// ===== Units & Theme =====
let units = 'metric'; // metric: L, °C, psi; imperial: gal, °F, psi
const GAL_PER_L = 0.26417205236; // gal = L * GAL_PER_L
const L_PER_GAL = 3.785411784;   // L = gal * L_PER_GAL

function updateUnitLabels(){
    document.querySelectorAll('[data-u="volume"]').forEach(el=>{ el.textContent = (units==='metric')? 'L' : 'gal'; });
    document.querySelectorAll('[data-u="temp"]').forEach(el=>{ el.textContent = (units==='metric')? '°C' : '°F'; });
    // Pressure kept in psi in both units per your workflow
}

function convertInputsOnUnitChange(prev, next){
    const volIds = ['fuelLap','fuelLap_p','tank_p','stat-fuel-total','stat-fuel-stint','stat-fuel-final','stat-buffer','start-fuel'];
    const tempIds = ['tBefore','tAfter'];
    const convertVol = (v, dir)=> dir==='toImperial'? v*GAL_PER_L : v*L_PER_GAL;
    const convertTemp = (v, dir)=> dir==='toImperial'? (v*9/5+32) : ((v-32)*5/9);

    const dir = (prev==='metric' && next==='imperial')? 'toImperial' : (prev==='imperial' && next==='metric'? 'toMetric' : null);
    if(!dir) return;

    // Inputs (numbers in fields)
    ['fuelLap','fuelLap_p','tank_p'].forEach(id=>{ const el=document.getElementById(id); if(el && el.value!==''){ el.value = Number(convertVol(parseFloat(el.value), dir)).toFixed(2); }});
    ['tBefore','tAfter'].forEach(id=>{ const el=document.getElementById(id); if(el && el.value!==''){ el.value = Number(convertTemp(parseFloat(el.value), dir)).toFixed(1); }});

    // Visible numbers in tiles/callout if present
    ['stat-fuel-total','stat-fuel-stint','stat-fuel-final','stat-buffer','start-fuel'].forEach(id=>{
    const el=document.getElementById(id); if(el && el.offsetParent!==null){ const n=parseFloat(el.textContent); if(!isNaN(n)){ el.textContent = (dir==='toImperial'? (n*GAL_PER_L) : (n*L_PER_GAL)).toFixed(1); }}
    });

    // ΔT display
    const td=document.getElementById('t-delta');
    if(td && td.offsetParent!==null){ const n=parseFloat(td.textContent); if(!isNaN(n)){ td.textContent = (dir==='toImperial'? (n*9/5) : (n*5/9)).toFixed(1); }}
}

document.getElementById('u-metric').addEventListener('click',()=>{
    if(units==='metric') return; const prev=units; units='metric';
    document.getElementById('u-metric').setAttribute('aria-pressed','true');
    document.getElementById('u-imperial').setAttribute('aria-pressed','false');
    convertInputsOnUnitChange(prev, units); updateUnitLabels();
});
document.getElementById('u-imperial').addEventListener('click',()=>{
    if(units==='imperial') return; const prev=units; units='imperial';
    document.getElementById('u-metric').setAttribute('aria-pressed','false');
    document.getElementById('u-imperial').setAttribute('aria-pressed','true');
    convertInputsOnUnitChange(prev, units); updateUnitLabels();
});

document.getElementById('themeToggle').addEventListener('click',()=>{
    const html=document.documentElement; const next = (html.getAttribute('data-theme')==='light')? 'dark':'light';
    html.setAttribute('data-theme', next);
});

// Utilities
const round = (x,d=2)=>Number.isFinite(x)?Math.round(x*10**d)/10**d:NaN;
const num = id => parseFloat(document.getElementById(id).value);
const val = id => document.getElementById(id).value;

const show = id => document.getElementById(id).style.display='grid';
const hide = id => document.getElementById(id).style.display='none';
const showBlock = id => document.getElementById(id).style.display='block';
const showResult=(id,html)=>{const el=document.getElementById(id); el.style.display='block'; el.innerHTML=html};
const hideResult=id=>{const el=document.getElementById(id); el.style.display='none'; el.innerHTML=''};

let lastFuelSummary = '';

async function copyText(text){
    try{
    if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText(text);
    }else{
        const ta=document.createElement('textarea');
        ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    const toast=document.getElementById('copyToast'); if(toast){toast.style.display='inline'; setTimeout(()=>toast.style.display='none',1500);} 
    }catch(e){ alert('Copy failed'); }
}

// ------- Header title/desc per tab -------
const pageTitle = document.getElementById('pageTitle');
const pageDesc  = document.getElementById('pageDesc');
function setHeaderFor(tab){
    if(tab==='tab-fuel'){
    pageTitle.textContent = 'Fuel Calculator';
    pageDesc.textContent  = 'Enter race time and lap pace (or fixed laps), then Calculate. Use Pro for tank size, formation/cool‑down laps, and mandatory pitstops.';
    } else if(tab==='tab-temp'){
    pageTitle.textContent = 'Tyre Pressures — Temperature Change';
    pageDesc.textContent  = 'Input current cold pressures and ambient before/after. We apply 0.1 psi per °C and preview corrected pressures vs target window.';
    } else if(tab==='tab-brake'){
    pageTitle.textContent = 'Tyre Pressures — Brake Duct Change';
    pageDesc.textContent  = 'Enter current pressures and brake‑duct settings before/after. We apply 0.2 psi per step to estimate new pressures.';
    }
}

// ------- Tabs logic -------
const tabs = [
    {btn:'tab-fuel', panel:'panel-fuel'},
    {btn:'tab-temp', panel:'panel-temp'},
    {btn:'tab-brake', panel:'panel-brake'}
];

function activateTab(key){
    tabs.forEach(t=>{
    const btn = document.getElementById(t.btn);
    const panel = document.getElementById(t.panel);
    const isActive = t.btn===key;
    btn.setAttribute('aria-selected', String(isActive));
    panel.hidden = !isActive;
    if(isActive){ panel.focus({preventScroll:true}); }
    });
    setHeaderFor(key);
}

tabs.forEach(t=>{ document.getElementById(t.btn).addEventListener('click', ()=>activateTab(t.btn)); });

// Keyboard support
const tabButtons = tabs.map(t=>document.getElementById(t.btn));
tabButtons.forEach((b,idx)=>{
    b.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowRight' || e.key==='ArrowLeft'){
        e.preventDefault(); const dir = e.key==='ArrowRight'? 1 : -1; const next = (idx + dir + tabButtons.length) % tabButtons.length; tabButtons[next].focus(); }
    if(e.key==='Home'){ e.preventDefault(); tabButtons[0].focus(); }
    if(e.key==='End'){ e.preventDefault(); tabButtons[tabButtons.length-1].focus(); }
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); activateTab(b.id); }
    });
});

// Init header + unit labels
setHeaderFor('tab-fuel');
updateUnitLabels();

// ------- Fuel: mode toggle -------
const normalBtn = document.getElementById('mode-normal');
const proBtn = document.getElementById('mode-pro');
const normalForm = document.getElementById('fuel-form-normal');
const proForm = document.getElementById('fuel-form-pro');

function setMode(mode){
    const isPro = mode==='pro';
    normalBtn.setAttribute('aria-pressed', String(!isPro));
    proBtn.setAttribute('aria-pressed', String(isPro));
    normalForm.style.display = isPro? 'none' : '';
    normalForm.setAttribute('aria-hidden', String(isPro));
    proForm.style.display = isPro? '' : 'none';
    proForm.setAttribute('aria-hidden', String(!isPro));
}
normalBtn.addEventListener('click', ()=>setMode('normal'));
proBtn.addEventListener('click', ()=>setMode('pro'));

// ------- Fuel calc (both modes) -------
function readFuelInputs(){
    const isPro = proBtn.getAttribute('aria-pressed')==='true';
    const read = (id, def=0)=>{ const v = parseFloat(val(id)); return isNaN(v)? def : v; };
    if(!isPro){
    return {
        raceH: read('raceH'), raceM: read('raceM'), lapM: read('lapM'), lapS: read('lapS'),
        fuelLap: num('fuelLap'), fixedLaps: read('lapsFixed'),
        tank: 0, includeFormation: true, includeCooldown: true, mandStops: 0
    };
    } else {
    return {
        raceH: read('raceH_p'), raceM: read('raceM_p'), lapM: read('lapM_p'), lapS: read('lapS_p'),
        fuelLap: num('fuelLap_p'), fixedLaps: read('lapsFixed_p'), tank: num('tank_p'),
        includeFormation: document.getElementById('includeFormation').checked,
        includeCooldown: document.getElementById('includeCooldown').checked,
        mandStops: parseInt(val('mandStops'))||0
    };
    }
}

function fuelDisplay(liters){ return (units==='metric')? round(liters,2) : round(liters*GAL_PER_L,2); }

function calcFuel(){
    const inp = readFuelInputs();
    const out = document.getElementById('outFuel');

    if (Number.isNaN(inp.fuelLap) || inp.fuelLap <= 0){
    hide('fuel-stats1'); hide('fuel-stats2'); hide('fuel-callout');
    showResult('outFuel','❌ <span class="err">Please enter a valid fuel per lap.</span>');
    document.getElementById('fuel-copy-wrap').style.display='none';
    return;
    }

    // Convert volume inputs to liters if imperial
    const fuelLapL = (units==='imperial')? inp.fuelLap * L_PER_GAL : inp.fuelLap;
    const tankL    = (units==='imperial')? inp.tank * L_PER_GAL : inp.tank;

    const raceSeconds = (inp.raceH*3600) + (inp.raceM*60);
    const lapSeconds  = (inp.lapM*60) + inp.lapS;

    let raceLaps;
    if (inp.fixedLaps>0){ raceLaps = inp.fixedLaps; }
    else if (raceSeconds>0 && lapSeconds>0){ raceLaps = Math.ceil(raceSeconds / lapSeconds); }
    else {
    hide('fuel-stats1'); hide('fuel-stats2'); hide('fuel-callout');
    showResult('outFuel','❌ <span class="err">Provide either total race time and lap time, or a fixed total lap count.</span>');
    document.getElementById('fuel-copy-wrap').style.display='none';
    return;
    }

    // Optional laps
    let totalLaps = raceLaps; if (inp.includeFormation) totalLaps += 1; if (inp.includeCooldown)  totalLaps += 1;

    // Base total fuel (liters)
    let totalFuelL = totalLaps * fuelLapL;

    // Mandatory stops: pit-in lap ~90% consumption
    const PIT_LAP_FACTOR = 0.9; if (inp.mandStops>0){ totalFuelL -= inp.mandStops * (1 - PIT_LAP_FACTOR) * fuelLapL; }

    // Stints if tank known
    let pits=0, stintLaps=0, finalLaps=0, stintFuelL=0, finalFuelL=round(totalFuelL,2);
    let startFuelL = round(totalFuelL,2);
    if (tankL>0 && fuelLapL>0){
    stintLaps = Math.floor(tankL / fuelLapL);
    pits = Math.floor(totalLaps / Math.max(stintLaps,1));
    finalLaps = Math.max(totalLaps - (stintLaps * pits), 0);
    stintFuelL = round(stintLaps * fuelLapL,2);
    finalFuelL = round(finalLaps * fuelLapL,2);
    startFuelL = round(Math.min(stintFuelL||totalFuelL, totalFuelL),2);
    }

    // Update tiles (converted for UI unit)
    document.getElementById('stat-pits').textContent = pits;
    document.getElementById('stat-laps').textContent = totalLaps;
    document.getElementById('stat-stintlaps').textContent = stintLaps;
    document.getElementById('stat-finallaps').textContent = finalLaps;
    document.getElementById('stat-fuel-total').textContent = fuelDisplay(totalFuelL);
    document.getElementById('stat-fuel-stint').textContent = fuelDisplay(stintFuelL);
    document.getElementById('stat-fuel-final').textContent = fuelDisplay(finalFuelL);
    document.getElementById('stat-buffer').textContent = fuelDisplay(1);

    // Big callout
    document.getElementById('start-fuel').textContent = fuelDisplay(startFuelL).toFixed(1);
    showBlock('fuel-callout');

    // Reveal stats and enable copy
    hideResult('outFuel'); show('fuel-stats1'); show('fuel-stats2');
    const volUnit = (units==='metric')? 'L' : 'gal';
    lastFuelSummary = `✅ Done.\nEstimated laps: ${totalLaps} (base: ${raceLaps}${inp.includeFormation?" + formation":""}${inp.includeCooldown?" + cool‑down":""})\nTotal fuel (adj.): ${fuelDisplay(totalFuelL)} ${volUnit}\nStart fuel: ${fuelDisplay(startFuelL)} ${volUnit}`;
    document.getElementById('fuel-copy-wrap').style.display='flex';
}
document.getElementById('btnFuel').addEventListener('click', calcFuel);
document.getElementById('btnFuelReset').addEventListener('click', ()=>{
    ['raceH','raceM','lapM','lapS','fuelLap','lapsFixed','raceH_p','raceM_p','lapM_p','lapS_p','fuelLap_p','tank_p','lapsFixed_p','mandStops'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
    const f=document.getElementById('includeFormation'); if(f) f.checked=true;
    const c=document.getElementById('includeCooldown'); if(c) c.checked=true;
    ['stat-pits','stat-laps','stat-stintlaps','stat-finallaps','stat-fuel-total','stat-fuel-stint','stat-fuel-final','stat-buffer','start-fuel'].forEach(id=>document.getElementById(id).textContent='0');
    hide('fuel-stats1'); hide('fuel-stats2'); hide('fuel-callout'); hideResult('outFuel');
    document.getElementById('fuel-copy-wrap').style.display='none'; lastFuelSummary='';
});
document.getElementById('btnFuelCopy').addEventListener('click', ()=> copyText(lastFuelSummary));

// ------- Temp → Pressure -------
function calcTemp(){
    const pFR = num('pFR'); const pFL = num('pFL'); const pRL = num('pRL'); const pRR = num('pRR');
    const tBefore = num('tBefore'); const tAfter  = num('tAfter');
    const tMin = num('targetMin'); const tMax = num('targetMax');

    if ([pFR,pFL,pRL,pRR,tBefore,tAfter].some(v=>Number.isNaN(v))){ hide('temp-stats'); hide('temp-tyre-grid'); showResult('outTemp','❌ <span class="err">Please fill in all fields (targets optional).</span>'); return; }

    const dT = tAfter - tBefore; // as entered (°C or °F)
    const dT_C = (units==='imperial')? dT/1.8 : dT; // convert to °C for rule
    const dP = 0.1 * dT_C; // psi per °C
    const corrected = [pFL, pFR, pRL, pRR].map(v=>round(v + dP,2)); // FL,FR,RL,RR in psi

    // Per-tyre grid
    document.getElementById('tp-fl').textContent = corrected[0];
    document.getElementById('tp-fr').textContent = corrected[1];
    document.getElementById('tp-rl').textContent = corrected[2];
    document.getElementById('tp-rr').textContent = corrected[3];

    // Summary tiles
    const deltaDisplay = (units==='imperial')? round(dT,1) : round(dT,1);
    document.getElementById('t-delta').textContent = deltaDisplay;
    document.getElementById('p-delta').textContent = round(dP,2);
    document.getElementById('target-range').textContent = (!Number.isNaN(tMin) && !Number.isNaN(tMax))? `${tMin}–${tMax} psi` : '—';

    let status = '—'; if (!Number.isNaN(tMin) && !Number.isNaN(tMax)){ const allOk = corrected.every(v=>v>=tMin && v<=tMax); status = allOk? 'Within window' : 'Adjust needed'; }
    document.getElementById('press-ok').textContent = status;

    hideResult('outTemp'); show('temp-stats'); show('temp-tyre-grid');
}
document.getElementById('btnTemp').addEventListener('click', calcTemp);
document.getElementById('btnTempReset').addEventListener('click', ()=>{
    ['pFL','pFR','pRL','pRR','tBefore','tAfter','targetMin','targetMax'].forEach(id=>document.getElementById(id).value='');
    ['t-delta','p-delta','target-range','press-ok'].forEach(id=>document.getElementById(id).textContent='0');
    document.getElementById('press-ok').textContent='—'; document.getElementById('target-range').textContent='—';
    hide('temp-stats'); hide('temp-tyre-grid'); hideResult('outTemp');
});

// ------- Brake ducts → Pressure -------
function calcBrake(){
    const pFL = num('bFL'); const pFR = num('bFR'); const pRL = num('bRL'); const pRR = num('bRR');
    const bdBefore = num('bdBefore'); const bdAfter  = num('bdAfter');

    if ([pFL,pFR,pRL,pRR,bdBefore,bdAfter].some(v=>Number.isNaN(v))){ hide('brake-summary'); hide('brake-tyre-grid'); showResult('outBrake','❌ <span class="err">Please fill in all fields.</span>'); return; }

    const dBD = bdAfter - bdBefore; const dP = 0.2 * dBD;

    document.getElementById('bd-delta').textContent = dBD;
    document.getElementById('bd-pdelta').textContent = round(dP,2);
    document.getElementById('bd-status').textContent = dBD===0? 'No change' : (dBD>0? 'More open' : 'More closed');
    document.getElementById('bd-note').textContent = '1×';

    const corrected = [pFR, pFL, pRL, pRR].map(v=>round(v + dP,2));
    document.getElementById('bd-fr').textContent = corrected[0];
    document.getElementById('bd-fl').textContent = corrected[1];
    document.getElementById('bd-rl').textContent = corrected[2];
    document.getElementById('bd-rr').textContent = corrected[3];

    hideResult('outBrake'); show('brake-summary'); show('brake-tyre-grid');
}
document.getElementById('btnBrake').addEventListener('click', calcBrake);
document.getElementById('btnBrakeReset').addEventListener('click', ()=>{
    ['bFL','bFR','bRL','bRR','bdBefore','bdAfter'].forEach(id=>document.getElementById(id).value='');
    ['bd-delta','bd-pdelta','bd-status','bd-note'].forEach(id=>document.getElementById(id).textContent='0');
    document.getElementById('bd-status').textContent='—'; hide('brake-summary'); hide('brake-tyre-grid'); hideResult('outBrake');
});

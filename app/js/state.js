// ═══════════════════════════════════════════════════════════════
// STATE & HELPERS
// ═══════════════════════════════════════════════════════════════

const S = { step:-1, leadId:null, leadName:'Loading...', naId:null, entity:null, data:{}, recordIds:{}, loading:false, isRerender:false, submitted:false };

function af(m){ return m.sections.flatMap(s=>s.fields); }

MODULES.forEach(m=>{
  S.data[m.key]={};
  af(m).forEach(f=>{ S.data[m.key][f.n] = f.def!=null?f.def : f.t==='bool'?false : f.t==='multi'?[] : ''; });
});

// ═══════════════════════════════════════════════════════════════
// CHILD TOGGLE MAP — parent booleans → child module keys
// ═══════════════════════════════════════════════════════════════
const CHILD_TOGGLE_MAP = {
  'UCaaS': 'ucaas',
  'CCaaS': 'ccaas',
  'Digital_Channels': 'digital',
  'Access_Security': 'access',
  'Third_Party_Integrations': 'integrations'
};

function activeModules(){
  const active = [MODULES[0]]; // parent always included
  const pd = S.data.parent;
  for(const [boolField, childKey] of Object.entries(CHILD_TOGGLE_MAP)){
    if(pd[boolField]){
      const m = MODULES.find(x => x.key === childKey);
      if(m) active.push(m);
    }
  }
  return active;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function vis(f,mk){
  if(!f.dep) return true;
  const d=S.data[mk];
  if(f.dep.includes('=')){
    const eq=f.dep.indexOf('=');
    const k=f.dep.substring(0,eq);
    const v=f.dep.substring(eq+1);
    const dv=d[k];
    if(v==='false') return !dv;
    if(v==='true') return !!dv;
    return String(dv)===v;
  }
  return !!d[f.dep];
}
function emp(v){return v===''||v===false||v===null||v===undefined||(Array.isArray(v)&&!v.length);}

function modStat(mk){
  const m=MODULES.find(x=>x.key===mk),d=S.data[mk],fl=af(m);
  const vr=fl.filter(f=>f.req&&vis(f,mk));
  const fr=vr.filter(f=>!emp(d[f.n]));
  const any=fl.some(f=>!emp(d[f.n]));
  if(vr.length>0&&fr.length===vr.length&&any) return 'ok';
  if(!vr.length&&any) return 'ok';
  if(any) return 'wip';
  return 'no';
}
function fc(mk){return af(MODULES.find(x=>x.key===mk)).filter(f=>!emp(S.data[mk][f.n])).length;}
function dc(){return activeModules().filter(m=>modStat(m.key)==='ok').length;}
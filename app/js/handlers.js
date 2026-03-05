// ═══════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════
function inp(el){S.data[el.dataset.m][el.dataset.f]=el.value;}
function chk(mk,fn,v){S.data[mk][fn]=v;S.isRerender=true;render();}
function ms(mk,fn,o,on){
  const a=S.data[mk][fn]||[];
  if(on&&!a.includes(o))a.push(o);
  if(!on){const i=a.indexOf(o);if(i>-1)a.splice(i,1);}
  S.data[mk][fn]=a;S.isRerender=true;render();
}
function go(i){
  const am=activeModules();
  if(i<0)i=0;
  if(i>=am.length)i=am.length-1;
  S.step=i;render();window.scrollTo(0,0);
}
function home(){S.step=-1;render();window.scrollTo(0,0);}

function saveS(){
  if(S.saving) return;
  S.saving=true;
  const am=activeModules(),m=am[S.step];
  saveMod(m).then(function(ok){
    S.saving=false;
    toast(m.title+(ok?' saved':' save failed'),ok?'ok':'err');
    render();
  });
}

function saveFin(){
  if(S.saving) return;
  S.saving=true;
  const am=activeModules(),m=am[S.step];
  saveMod(m).then(function(ok){
    S.saving=false;
    if(ok) home();
    toast(m.title+(ok?' saved':' save failed'),ok?'ok':'err');
  });
}

function doSubmit(){
  if(S.saving) return;
  const miss=[];
  activeModules().forEach(m=>{af(m).forEach(f=>{if(f.req&&vis(f,m.key)&&emp(S.data[m.key][f.n]))miss.push(m.title+': '+f.l);});});
  if(miss.length){toast('Missing: '+miss.slice(0,3).join(', ')+(miss.length>3?' (+'+( miss.length-3)+' more)':''),'err');return;}
  submitAll();
}

function saveForLater(){
  if(S.saving) return;
  S.saving=true;
  const am=activeModules();
  var chain=Promise.resolve(true);
  am.forEach(function(m){
    chain=chain.then(function(prev){ return saveMod(m).then(function(ok){ return prev&&ok; }); });
  });
  chain.then(function(ok){
    S.saving=false;
    if(ok&&S.naId){
      ZOHO.CRM.API.updateRecord({Entity:"Needs_Analysis",
        APIData:{id:S.naId,Analysis_Status:"In Progress"},
        Trigger:["workflow"]}).then(function(){
          S.data.parent.Analysis_Status='In Progress';
          toast('Progress saved — you can continue later','ok');
          render();
        });
    }else{
      toast(ok?'Progress saved':'Some sections failed to save','ok');
      render();
    }
  });
}

function closeWidget(){
  ZOHO.CRM.UI.Popup.closeReload();
}

function toast(msg,type){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className='toast toast-'+(type==='ok'?'ok':'err')+' show';
  setTimeout(()=>t.classList.remove('show'),3500);
}
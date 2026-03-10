// ═══════════════════════════════════════════════════════════════
// RENDER ENGINE
// ═══════════════════════════════════════════════════════════════
function render(){
  const el=document.getElementById('app');
  if(S.loading){el.innerHTML='<div class="spin-wrap"><div class="spin"></div><div class="spin-text">Saving to Zoho CRM...</div></div>';S.isRerender=false;return;}

  // Preserve scroll position and focused field before re-render
  const cb=el.querySelector('.card-body');
  const scrollY=cb?cb.scrollTop:0;
  const ae=document.activeElement;
  const focusId=ae&&ae.id?ae.id:null;
  const focusSelector=ae&&ae.dataset&&ae.dataset.f?`[data-f="${ae.dataset.f}"]`:null;

  if(S.submitted){rDone(el);S.isRerender=false;return;}
  S.step===-1?rSum(el):rForm(el);

  // Restore scroll position
  const newCb=el.querySelector('.card-body');
  if(newCb&&scrollY) newCb.scrollTop=scrollY;

  // Restore focus
  if(focusId){
    const fe=document.getElementById(focusId);
    if(fe) fe.focus();
  }else if(focusSelector){
    const fe=el.querySelector(focusSelector);
    if(fe) fe.focus();
  }
  S.isRerender=false;
}

function rSum(el){
  const am=activeModules(),c=dc(),t=am.length;
  const pct=t>0?Math.round((c/t)*100):0;
  const circ=2*Math.PI*18;
  const offset=circ-(pct/100)*circ;

  el.innerHTML=`
    <div class="brand-bar"></div>
    <div class="hdr">
      <div class="hdr-left">
        <div class="hdr-logo">T</div>
        <div>
          <h1>Needs Analysis</h1>
          <div class="sub">${S.leadName}</div>
        </div>
      </div>
      <div class="badge ${c===t?'badge-ok':'badge-warn'}"><div class="dot"></div>${c===t?'Complete':'In Progress'}</div>
    </div>

    <div class="sum-layout">
      <div class="sum-sidebar">
        <div class="sum-stat-card">
          <div class="dash-ring" style="width:68px;height:68px;">
            <svg width="68" height="68" viewBox="0 0 44 44">
              <circle class="dash-ring-track" cx="22" cy="22" r="18"/>
              <circle class="dash-ring-fill" cx="22" cy="22" r="18"
                stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
            </svg>
            <div class="dash-ring-text" style="font-size:13px;">${pct}%</div>
          </div>
          <div class="sum-stat-label"><strong>${c} of ${t}</strong> sections complete</div>
          <div class="sum-stat-divider"></div>
          ${MODULES.map(m=>{
            const isActive=am.some(x=>x.key===m.key);
            const s=isActive?modStat(m.key):'no';
            return `<div class="sum-stat-row${isActive?'':' sum-stat-off'}">
              <span class="sum-stat-ico" style="background:${isActive?m.iconBg:'var(--gray-100)'}">${m.icon}</span>
              <span class="sum-stat-name">${m.title}</span>
              <span class="sbadge ${isActive?(s==='ok'?'sb-ok':s==='wip'?'sb-wip':'sb-no'):'sb-off'}" style="font-size:9px;padding:2px 6px;">${isActive?(s==='ok'?'Done':s==='wip'?'WIP':'—'):'Off'}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="sum-action-card">
          ${S.data.parent.Analysis_Status==='Completed'
            ?`<p class="sum-action-hint">Needs Analysis has been submitted</p>
               <button class="btn btn-ok" onclick="closeWidget()" style="width:100%;">Close</button>`
            :(allReqDone()
              ?`<p class="sum-action-hint">All sections complete — ready to submit</p>
                 <button class="btn btn-ok" onclick="doSubmit()" style="width:100%;">Submit Analysis</button>`
              :`<p class="sum-action-hint">Complete all required fields before submitting</p>
                 <div style="display:flex;flex-direction:column;gap:8px;">
                   <button class="btn btn-g" onclick="saveForLater()" style="width:100%;">Save for Later</button>
                   <button class="btn btn-ok" style="width:100%;" disabled>Submit Analysis</button>
                 </div>`)}
        </div>
      </div>
      <div class="sum-main">
        <div class="sgrid">
          ${MODULES.map((m)=>{
            const isActive=am.some(x=>x.key===m.key);
            const amIdx=am.findIndex(x=>x.key===m.key);
            const s=isActive?modStat(m.key):'no';
            const total=af(m).length;
            const filled=isActive?fc(m.key):0;
            const barPct=total>0?Math.round((filled/total)*100):0;
            const cls=isActive
              ?'scard s-enabled '+(s==='ok'?'s-ok':s==='wip'?'s-wip':'')
              :'scard s-disabled';
            const click=isActive?'onclick="go('+amIdx+')"':'';
            const badge=isActive
              ?'<span class="sbadge '+(s==='ok'?'sb-ok':s==='wip'?'sb-wip':'sb-no')+'">'+(s==='ok'?'Complete':s==='wip'?'In Progress':'Not Started')+'</span>'
              :'<span class="sbadge sb-off">Not Selected</span>';
            return '<div class="'+cls+'" '+click+'>'
              +'<div class="scard-h">'
                +'<h3><span class="scard-ico" style="background:'+m.iconBg+'">'+m.icon+'</span>'+m.title+'</h3>'
                +badge
              +'</div>'
              +'<p>'+m.desc+'</p>'
              +'<div class="fc">'
                +filled+'/'+total+' fields'
                +'<div class="fc-bar"><div class="fc-bar-fill" style="width:'+barPct+'%"></div></div>'
              +'</div>'
            +'</div>';
          }).join('')}
        </div>
      </div>
    </div>`;
}

function rForm(el){
  const am=activeModules(),m=am[S.step],last=S.step===am.length-1;
  el.innerHTML=`
    <div class="brand-bar"></div>
    <div class="hdr">
      <div class="hdr-left">
        <div class="hdr-logo">T</div>
        <div>
          <h1>Needs Analysis</h1>
          <div class="sub">${S.leadName}</div>
        </div>
      </div>
      <button class="btn btn-s" onclick="home()" style="font-size:12px;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 12L6 8L10 4"/></svg>
        Overview
      </button>
    </div>

    <div class="form-layout">
      <nav class="form-nav">
        <div class="fnav-header">Sections</div>
        ${am.map((x,i)=>{
          const s=modStat(x.key);
          const isActive=i===S.step;
          const checkCls=isActive?'active-dot':s==='ok'?'done':s==='wip'?'wip':'';
          const checkInner=s==='ok'&&!isActive?'<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5L6.5 11.5L12.5 5.5"/></svg>':'';
          return `<div class="fnav-item ${isActive?'active':''}" onclick="go(${i})">
            <span class="fnav-ico" style="background:${x.iconBg}">${x.icon}</span>
            <div class="fnav-info">
              <div class="fnav-title">${x.title}</div>
              <div class="fnav-status">${s==='ok'?'Complete':s==='wip'?'In Progress':'Not Started'}</div>
            </div>
            <div class="fnav-check ${checkCls}">${checkInner}</div>
          </div>`;
        }).join('')}
      </nav>
      <div class="form-main">
        <div class="card${S.isRerender?' no-anim':''}">
          <div class="card-accent"></div>
          <div class="card-hdr">
            <div class="card-ico" style="background:${m.iconBg}">${m.icon}</div>
            <div><h2>${m.title}</h2><p>${m.desc}</p></div>
          </div>
          <div class="card-body">
            ${m.sections.map(sec=>{
              const vf=sec.fields.filter(f=>vis(f,m.key));
              if(!vf.length) return '';
              return `<div class="sec">${sec.title}</div><div class="grid">${vf.map(f=>rf(f,m.key)).join('')}</div>`;
            }).join('')}
          </div>
          <div class="ftr">
            <button class="btn btn-s" onclick="go(${S.step-1})" ${S.step===0?'disabled':''}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 12L6 8L10 4"/></svg>
              Previous
            </button>
            <div style="display:flex;gap:8px;">
              ${last?'':`<button class="btn btn-g" onclick="saveS()">Save Section</button>`}
              ${last?(S.recordIds[m.key]?`<button class="btn btn-ok" onclick="home()">Finished</button>`
                   :`<button class="btn btn-ok" onclick="saveFin()">Save & Review</button>`)
                   :`<button class="btn btn-p" onclick="go(${S.step+1})">Next
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4L10 8L6 12"/></svg>
                    </button>`}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function rf(f,mk){
  const d=S.data[mk],v=d[f.n],sp=f.s===3?'s3':f.s===2?'s2':'';

  if(f.t==='bool'){
    return `<div class="chk ${sp}"><input type="checkbox" id="f_${f.n}" ${v?'checked':''} onchange="chk('${mk}','${f.n}',this.checked)"><label for="f_${f.n}">${f.l}</label></div>`;
  }
  if(f.t==='multi'){
    const a=Array.isArray(v)?v:[];
    return `<div class="fg ${sp}"><label>${f.l}</label><div class="chips">${f.opts.map(o=>`<label class="chip ${a.includes(o)?'on':''}"><input type="checkbox" ${a.includes(o)?'checked':''} onchange="ms('${mk}','${f.n}','${o}',this.checked)">${o}</label>`).join('')}</div></div>`;
  }
  if(f.ro){
    return `<div class="fg ${sp}"><label>${f.l}</label><input type="text" value="${v||''}" readonly style="background:#f5f5f5;color:#555;cursor:default;"></div>`;
  }
  const rq=f.req?'<span class="rq">*</span>':'';
  if(f.t==='pick'){
    return `<div class="fg ${sp}"><label>${f.l}${rq}</label><select data-m="${mk}" data-f="${f.n}" onchange="inp(this)"><option value="">Select...</option>${f.opts.map(o=>`<option value="${o}" ${v===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
  }
  if(f.t==='area'){
    return `<div class="fg ${sp}"><label>${f.l}${rq}</label><textarea data-m="${mk}" data-f="${f.n}" oninput="inp(this)" placeholder="Enter details...">${v||''}</textarea></div>`;
  }
  const ty=f.t==='num'?'number':f.t==='date'?'date':'text';
  return `<div class="fg ${sp}"><label>${f.l}${rq}</label><input type="${ty}" data-m="${mk}" data-f="${f.n}" value="${v||''}" oninput="inp(this)" placeholder="${f.t==='num'?'0':'Enter...'}"></div>`;
}

function rDone(el){
  el.innerHTML=`
    <div class="brand-bar"></div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;text-align:center;padding:40px 24px;">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5L6.5 11.5L12.5 5.5"/></svg>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;color:var(--text);">Needs Analysis Completed</h1>
      <p style="margin:0 0 24px;color:var(--muted);font-size:14px;">The needs analysis for <strong>${S.leadName}</strong> has been submitted successfully.</p>
      <button class="btn btn-ok" onclick="closeWidget()">Close</button>
    </div>`;
}
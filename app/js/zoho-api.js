// ═══════════════════════════════════════════════════════════════
// ZOHO SDK INTEGRATION
// ═══════════════════════════════════════════════════════════════
function initZoho(){
  ZOHO.embeddedApp.on("PageLoad",function(d){
    S.entity=d.Entity;
    S.leadId=Array.isArray(d.EntityId)?d.EntityId[0]:d.EntityId;
    ZOHO.CRM.UI.Resize({height:"1100",width:"1600"});
    render(); // Render immediately so the page isn't blank

    // Get the Lead record for display name
    ZOHO.CRM.API.getRecord({Entity:d.Entity,RecordID:S.leadId}).then(function(r){
      if(r.data&&r.data[0]){
        var rec=r.data[0];
        S.leadName=rec.Full_Name||rec.Company||rec.Last_Name||rec.Lead_Name||rec.Name||'Lead Record';

        // Populate Lead Information fields from lead record
        var pd=S.data.parent;
        pd.Lead_Name=rec.Lead_Name||rec.Full_Name||rec.Name||'';
        pd.Industry=rec.Industry||'';
        pd.Sub_Category=rec.Sub_Category||'';
        pd.Contact_Name=rec.Full_Name||((rec.First_Name||'')+' '+(rec.Last_Name||'')).trim()||'';
        pd.Phone=rec.Phone||rec.Mobile||'';
        pd.Company=rec.Company||'';
        pd.Email=rec.Email||'';
        render();

        // Search for linked Needs Analysis record
        ZOHO.CRM.API.searchRecord({
          Entity:"Needs_Analysis",
          Type:"criteria",
          Query:"(Lead_Name:equals:"+S.leadId+")"
        }).then(function(nr){
          if(nr.data&&nr.data[0]){
            S.naId=nr.data[0].id;
            loadParentAndChildren();
          }else{
            // No NA record exists — create one via server-side Deluge function
            createNARecord();
          }
        }).catch(function(e){
          console.log('No NA found, creating...',e);
          createNARecord();
        });
      }
    }).catch(function(e){console.error('Lead fetch error',e);});
  });
  ZOHO.embeddedApp.init();
}

function loadParentAndChildren(){
  ZOHO.CRM.API.getRecord({Entity:"Needs_Analysis",RecordID:S.naId}).then(function(pr){
    if(pr.data&&pr.data[0]){
      var prec=pr.data[0];
      af(MODULES[0]).forEach(function(f){
        if(prec[f.n]!=null){
          if(f.t==='multi'&&typeof prec[f.n]==='string'){
            S.data.parent[f.n]=prec[f.n].split(';');
          }else if(typeof prec[f.n]==='object'&&prec[f.n].name){
            S.data.parent[f.n]=prec[f.n].name;
          }else{
            S.data.parent[f.n]=prec[f.n];
          }
        }
      });
      S.recordIds.parent=prec.id;
    }
    render();
    loadAll();
  }).catch(function(e){
    console.error('Parent record fetch error',e);
    render();
    loadAll();
  });
}

function createNARecord(){
  ZOHO.CRM.FUNCTIONS.execute("create_needs_analysis",{
    arguments:JSON.stringify({leadId:S.leadId})
  }).then(function(resp){
    console.log('create_needs_analysis response:',resp);
    var output=resp.details&&resp.details.output;
    if(output) S.naId=String(output);
    if(S.naId){
      // Set Analysis_Status to Draft on newly created records
      ZOHO.CRM.API.updateRecord({Entity:"Needs_Analysis",
        APIData:{id:S.naId,Analysis_Status:"Draft"},
        Trigger:["workflow"]}).then(function(){
          loadParentAndChildren();
        }).catch(function(){
          loadParentAndChildren();
        });
    }else{
      console.error('Failed to create NA record',resp);
      toast('Failed to create Needs Analysis','err');
    }
  }).catch(function(e){
    console.error('create_needs_analysis error:',e);
    toast('Failed to create Needs Analysis','err');
  });
}

async function loadAll(){
  for(const m of MODULES){
    if(!m.zohoModule) continue; // Skip parent — already loaded
    try{
      const r=await ZOHO.CRM.API.searchRecord({Entity:m.zohoModule,Type:"criteria",Query:"(Needs_Analysis:equals:"+S.naId+")"});
      if(r.data&&r.data[0]){
        const rec=r.data[0];
        af(m).forEach(f=>{
          if(rec[f.n]!=null){
            if(f.t==='multi'&&typeof rec[f.n]==='string'){
              S.data[m.key][f.n]=rec[f.n].split(';');
            }else if(typeof rec[f.n]==='object'&&rec[f.n].name){
              S.data[m.key][f.n]=rec[f.n].name;
            }else{
              S.data[m.key][f.n]=rec[f.n];
            }
          }
        });
        S.recordIds[m.key]=rec.id;
      }
    }catch(e){console.log('No data: '+m.zohoModule);}
  }
  render();
}

async function saveMod(mc){
  const d={};
  af(mc).forEach(f=>{ if(!f.ro&&vis(f,mc.key)&&!emp(S.data[mc.key][f.n])) d[f.n]=S.data[mc.key][f.n]; });

  try{
    if(mc.key==='parent'){
      if(!S.naId) return false;
      d.id=S.naId;
      await ZOHO.CRM.API.updateRecord({Entity:"Needs_Analysis",APIData:d,Trigger:["workflow"]});
      S.recordIds.parent=S.naId; return true;
    }

    // Child modules need a parent record to exist
    if(!S.naId) return false;
    d.Needs_Analysis=S.naId;

    // If we already have the record ID, update directly
    if(S.recordIds[mc.key]){
      d.id=S.recordIds[mc.key];
      await ZOHO.CRM.API.updateRecord({Entity:mc.zohoModule,APIData:d,Trigger:["workflow"]});
    }else{
      // First save — insert and store the returned ID
      d.Name=mc.title;
      const res=await ZOHO.CRM.API.insertRecord({Entity:mc.zohoModule,APIData:d,Trigger:["workflow"]});
      if(res.data&&res.data[0]&&res.data[0].details&&res.data[0].details.id){
        S.recordIds[mc.key]=res.data[0].details.id;
      }
    }
    return true;
  }catch(e){console.error('saveMod error:',mc.key,JSON.stringify(e)); return false;}
}

async function submitAll(){
  S.loading=true; render();
  try{
    if(S.naId){
      await ZOHO.CRM.API.updateRecord({Entity:"Needs_Analysis",
        APIData:{id:S.naId,Analysis_Status:"Completed"},
        Trigger:["workflow"]});
      S.submitted=true;
    }else{toast('No record to submit','err');}
  }catch(e){console.error('submitAll error:',e);toast('Submit failed — retry','err');}
  S.loading=false; render();
}
// ═══════════════════════════════════════════════════════════════
// INIT — SDK only, no demo mode
// ═══════════════════════════════════════════════════════════════
if(typeof ZOHO==='undefined'){
  document.getElementById('app').innerHTML='<div class="sdk-err"><div class="sdk-err-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg></div><strong>Zoho SDK not available</strong><br>This widget must be opened from within Zoho CRM.</div>';
}else{
  initZoho();
}
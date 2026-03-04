// ═══════════════════════════════════════════════════════════════
// INIT — SDK only, no demo mode
// ═══════════════════════════════════════════════════════════════
if(typeof ZOHO==='undefined'){
  document.getElementById('app').innerHTML='<div class="sdk-err"><div class="sdk-err-ico">\u{1F50C}</div><strong>Zoho SDK not available</strong><br>This widget must be opened from within Zoho CRM.</div>';
}else{
  initZoho();
}
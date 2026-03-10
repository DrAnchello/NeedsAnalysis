// ═══════════════════════════════════════════════════════════════════
// TELVIVA NEEDS ANALYSIS — MODULE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════
// MODULES[0] = Parent Needs_Analysis record (saves directly to S.naId)
// MODULES[1..5] = Child modules (each a separate Zoho custom module)
//
// The parent "Overview of Client Needs" booleans drive which child
// steps appear in the stepper. activeModules() computes the visible
// set dynamically.
//
// Field type key:
//   bool  = Boolean/Checkbox
//   txt   = Single Line
//   num   = Number
//   date  = Date
//   pick  = Pick List
//   area  = Multi Line (Small)
//   multi = Multiselect
//
// dep = conditional visibility dependency
//   "Field_Name"       → show when that boolean is true
//   "Field_Name=Value" → show when picklist equals value
//   "Field_Name=false" → show when boolean is false
//
// req = required for completion validation
// s   = grid span (2 or 3 columns)
// ═══════════════════════════════════════════════════════════════════

const MODULES = [

  // ─────────────────── 0. PARENT — Overview ──────────────────
  {
    key:'parent', title:'Overview', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', iconBg:'#F0F4FF',
    desc:'Client overview, requirements scope, pain points & priorities',
    zohoModule:null, // saved via updateRecord directly to S.naId
    sections:[
      { title:'Lead Information', fields:[
        {n:'Lead_Name',l:'Lead Name',t:'txt',ro:true},
        {n:'Industry',l:'Industry',t:'txt',ro:true},
        {n:'Sub_Category',l:'Sub-Category',t:'txt',ro:true},
        {n:'Contact_Name',l:'Contact Name',t:'txt',ro:true},
        {n:'Phone',l:'Phone',t:'txt',ro:true},
        {n:'Company',l:'Company',t:'txt',ro:true},
        {n:'Email',l:'Email',t:'txt',ro:true},
        {n:'Analysis_Status',l:'Analysis Status',t:'pick',def:'Draft',opts:['Draft','In Progress','Completed']},
      ]},
      { title:'Overview of Client Needs', fields:[
        {n:'UCaaS',l:'UCaaS',t:'bool'},
        {n:'UCaaS_Selection',l:'UCaaS Selection',t:'multi',s:3,dep:'UCaaS',
         opts:['Hosted PBX','SIP Trunking','Auto Attendant','Call Recording','Softphones','Desk Phones','Video Conferencing','Voicemail to Email','IVR']},
        {n:'CCaaS',l:'CCaaS',t:'bool'},
        {n:'CCaaS_Selection',l:'CCaaS Selection',t:'multi',s:3,dep:'CCaaS',
         opts:['Inbound Voice','Outbound Voice','IVR','ACD','Quality Management','Workforce Management','Reporting','Wallboard']},
        {n:'Digital_Channels',l:'Digital Channels',t:'bool'},
        {n:'Digital_Channel_Selection',l:'Digital Channel Selection',t:'multi',s:3,dep:'Digital_Channels',
         opts:['WhatsApp','Web Chat','SMS','Email','Engage']},
        {n:'Access_Security',l:'Access & Security',t:'bool'},
        {n:'Access_and_Security',l:'Access & Security Selection',t:'multi',s:3,dep:'Access_Security',
         opts:['Fibre','LTE','Microwave','SD-WAN','Firewall','VPN','Managed Security']},
        {n:'Third_Party_Integrations',l:'3rd Party Integrations',t:'bool'},
        {n:'rd_Party_Selections',l:'3rd Party Selection',t:'multi',s:3,dep:'Third_Party_Integrations',
         opts:['CRM','ERP','WFM','QM','Payment Gateway','API','SSO','Other']},
        {n:'Call2Teams_Required',l:'Call2Teams',t:'bool'},
        {n:'Call2Teams_Selection',l:'Call2Teams Selection',t:'multi',s:3,dep:'Call2Teams_Required',
         opts:['Direct Routing','Operator Connect']},
      ]},
      { title:'Pain Points', fields:[
        {n:'Pain_Capacity_Issues',l:'Capacity Issues',t:'bool'},
        {n:'Pain_Cost_Reduction_Needed',l:'Cost Reduction Needed',t:'bool'},
        {n:'Pain_Infrastructure_Instability',l:'Infrastructure Instability',t:'bool'},
        {n:'Pain_Poor_Service',l:'Poor Service',t:'bool'},
        {n:'Pain_Other',l:'Other',t:'bool'},
        {n:'Pain_Points_Details',l:'Pain Points Details',t:'area',s:3},
      ]},
      { title:'Priorities', fields:[
        {n:'Priority_Business_Efficiencies',l:'Business Efficiencies',t:'bool'},
        {n:'Priority_Cost_Reduction',l:'Cost Reduction',t:'bool'},
        {n:'Priority_Future_Proofing',l:'Future Proofing',t:'bool'},
        {n:'Priority_Leverage_Cloud_Services',l:'Leverage Cloud Services',t:'bool'},
        {n:'Priority_Support',l:'Support',t:'bool'},
        {n:'Priority_Credibility_of_Supplier',l:'Credibility of Supplier',t:'bool'},
        {n:'Priority_Context',l:'Context',t:'bool'},
        {n:'Priority_Other',l:'Other',t:'bool'},
        {n:'Priority_Ranking',l:'Priority Ranking Notes',t:'area',s:3},
        {n:'Decision_Criteria_Notes',l:'Decision Criteria Notes',t:'area',s:3},
      ]},
      { title:'Critical Events', fields:[
        {n:'Expected_Service_Date',l:'Expected Service Date',t:'date',req:true},
        {n:'Change_Required_with_Existing_Service_Provider',l:'Change Required with Existing Provider',t:'bool'},
        {n:'Existing_Contract_Term_Remaining',l:'Existing Contract Expiry',t:'date',dep:'Change_Required_with_Existing_Service_Provider'},
        {n:'Site_Ready',l:'Site Ready',t:'bool'},
        {n:'Site_Readiness_Notes',l:'Site Readiness Notes',t:'area',s:3},
        {n:'Landlord_Constraints',l:'Landlord Constraints',t:'bool'},
        {n:'Landlord_Constraints_Notes',l:'Landlord Constraints Notes',t:'area',s:3,dep:'Landlord_Constraints'},
      ]},
    ]
  },

  // ─────────────────────── 1. NA UCaaS ────────────────────────────
  {
    key:'ucaas', title:'UCaaS', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>', iconBg:'#EFF6FF',
    desc:'Phones, SIP, PBX, Porting, Fax, LAN & Features',
    zohoModule:'NA_UCaaS_PBX',
    sections:[
      { title:'UCaaS Components', fields:[
        {n:'UCaaS_Components',l:'UCaaS Components',t:'multi',s:3,
         opts:['Hosted PBX','SIP Trunking','Auto Attendant','Call Recording','Softphones','Desk Phones','Video Conferencing','Voicemail to Email','IVR']},
      ]},

      { title:'Phone Requirements', fields:[
        {n:'No_Executive_Phones',l:'Executive Phones',t:'num'},
        {n:'No_Back_Office_Phones',l:'Back Office Phones',t:'num'},
        {n:'No_Cordless_Phones',l:'Cordless Phones',t:'num'},
        {n:'No_Soft_Clients_Only',l:'Soft Clients Only',t:'num'},
        {n:'Conference_Phones',l:'Conference Phones',t:'num'},
        {n:'Reception_Console_Phones',l:'Reception Console',t:'num'},
        {n:'Headsets_Required',l:'Headsets Required',t:'bool'},
        {n:'Headset_Type',l:'Headset Type',t:'pick',opts:['Wired','Wireless','Both'],dep:'Headsets_Required'},
      ]},

      { title:'SIP & PBX', fields:[
        {n:'Current_SIP_Provider',l:'Current SIP Provider',t:'pick',opts:['Telviva','Other','None'],req:true},
        {n:'Current_SIP_Provider_Name',l:'Provider Name (if Other)',t:'txt',dep:'Current_SIP_Provider=Other'},
        {n:'Current_PBX',l:'Current PBX',t:'txt'},
        {n:'PBX_SIP_Enabled',l:'PBX SIP Enabled',t:'bool'},
        {n:'Gateway_Device_Present',l:'Gateway Device Present',t:'bool'},
        {n:'Gateway_Notes',l:'Gateway Notes',t:'area',s:3},
      ]},

      { title:'PSTN & Porting', fields:[
        {n:'Existing_PSTN',l:'Existing PSTN',t:'bool'},
        {n:'Has_BRIs',l:'Has BRIs',t:'bool'},
        {n:'Number_of_BRIs',l:'No. of BRIs',t:'num',dep:'Has_BRIs'},
        {n:'BRI_Contract_Expiry',l:'BRI Contract Expiry',t:'date',dep:'Has_BRIs'},
        {n:'Has_PRIs',l:'Has PRIs',t:'bool'},
        {n:'Number_of_PRIs',l:'No. of PRIs',t:'num',dep:'Has_PRIs'},
        {n:'PRI_Contract_Expiry',l:'PRI Contract Expiry',t:'date',dep:'Has_PRIs'},
        {n:'PRI_Service_Provider',l:'PRI Service Provider',t:'txt',dep:'Has_PRIs'},
        {n:'Number_of_Analogue_Lines',l:'Analogue Lines',t:'num'},
        {n:'Number_Porting_Required',l:'Number Porting Required',t:'bool'},
        {n:'Number_Porting_Type_a',l:'Porting Type',t:'pick',opts:['Geographic','Non-Geographic','Toll-Free','Mixed'],dep:'Number_Porting_Required'},
        {n:'Porting_Numbers_Count',l:'Porting Numbers Count',t:'num',dep:'Number_Porting_Required'},
        {n:'Smart_Access_Redirect_Required',l:'Smart Access Redirect',t:'bool'},
        {n:'Smart_Access_Numbers_Count',l:'Smart Access Count',t:'num',dep:'Smart_Access_Redirect_Required'},
        {n:'New_DIDs_Required',l:'New DIDs Required',t:'bool'},
        {n:'DID_Per_User',l:'DID Per User',t:'bool',dep:'New_DIDs_Required'},
        {n:'Telephony_Expense_Management_Required',l:'Telephony Expense Mgmt',t:'bool'},
      ]},

      { title:'Fax', fields:[
        {n:'Fax_Service_Required',l:'Fax Service Required',t:'bool'},
        {n:'Email_to_Fax',l:'Email to Fax',t:'bool',dep:'Fax_Service_Required'},
        {n:'Fax_to_Email',l:'Fax to Email',t:'bool',dep:'Fax_Service_Required'},
        {n:'Fax_to_Fax',l:'Fax to Fax',t:'bool',dep:'Fax_Service_Required'},
      ]},

      { title:'Commercial', fields:[
        {n:'Buy_or_Rent',l:'Buy or Rent',t:'pick',opts:['Buy','Rent'],req:true},
        {n:'Finance_Period',l:'Finance Period',t:'pick',opts:['12 Months','24 Months','36 Months','48 Months']},
      ]},

      { title:'Features', fields:[
        {n:'Call_Recording_Required',l:'Call Recording',t:'bool'},
        {n:'Call_Recording_Type_a',l:'Recording Type',t:'pick',opts:['Standard','Compliant','None'],dep:'Call_Recording_Required'},
        {n:'Redundancy_Required',l:'Redundancy Required',t:'bool'},
        {n:'Redundancy_Notes',l:'Redundancy Notes',t:'area',s:3,dep:'Redundancy_Required'},
        {n:'Room_System_Required',l:'Room System Required',t:'bool'},
        {n:'Number_of_Room_Systems',l:'No. of Room Systems',t:'num',dep:'Room_System_Required'},
        {n:'Video_Conferencing_Notes',l:'Video Conferencing Notes',t:'area',s:3},
      ]},

      { title:'LAN & Network', fields:[
        {n:'LAN_Size',l:'LAN Size',t:'pick',opts:['Small (<25)','Medium (25-100)','Large (100-500)','Enterprise (500+)']},
        {n:'POE_Available',l:'POE Available',t:'bool'},
        {n:'Own_LAN_Equipment',l:'Own LAN Equipment',t:'bool'},
        {n:'LAN_Notes',l:'LAN Notes',t:'area',s:3},
      ]},
    ]
  },

  // ─────────────────────── 2. NA CCaaS ────────────────────────────
  {
    key:'ccaas', title:'CCaaS', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>', iconBg:'#F0F5FF',
    desc:'Contact Centre — Agents, Channels, CRM & Branding',
    zohoModule:'NA_Contact_Centre',
    sections:[
      { title:'CCaaS Components & Type', fields:[
        {n:'CCaaS_Components',l:'CCaaS Components',t:'multi',s:2,
         opts:['Inbound Voice','Outbound Voice','IVR','ACD','Quality Management','Workforce Management','Reporting','Wallboard']},
        {n:'Contact_Centre_Type',l:'Contact Centre Type',t:'pick',opts:['Inbound','Outbound','Blended','Virtual','Hybrid'],req:true},
      ]},

      { title:'Channel Requirements', fields:[
        {n:'Voice_Channel_Required',l:'Voice Channel',t:'bool'},
        {n:'Voice_Agents_Count',l:'Voice Agents',t:'num',dep:'Voice_Channel_Required'},
        {n:'Text_Channel_Required',l:'Text Channel',t:'bool'},
        {n:'Text_Agents_Count',l:'Text Agents',t:'num',dep:'Text_Channel_Required'},
        {n:'Email_Channel',l:'Email Channel',t:'bool'},
        {n:'Web_Chat_Required',l:'Web Chat',t:'bool'},
        {n:'SMS_Outbound',l:'SMS Outbound',t:'bool'},
        {n:'Inbound_Multichannel',l:'Inbound Multichannel',t:'bool'},
        {n:'Sales_Channel',l:'Sales Channel',t:'bool'},
        {n:'Collections_Process',l:'Collections Process',t:'bool'},
      ]},

      { title:'Integration & Branding', fields:[
        {n:'CRM_Integration_Required',l:'CRM Integration Required',t:'bool'},
        {n:'Current_CRM_Platform',l:'Current CRM Platform',t:'txt',dep:'CRM_Integration_Required'},
        {n:'CRM_Integration_Details_a',l:'CRM Integration Details',t:'area',s:3,dep:'CRM_Integration_Required'},
        {n:'Website_CRM_Integration_Required',l:'Website/CRM Integration',t:'bool'},
        {n:'Custom_Branding_Required',l:'Custom Branding',t:'bool'},
        {n:'Touchpoint_Requirements_Brief_a',l:'Touchpoint Requirements Brief',t:'area',s:3},
      ]},
    ]
  },

  // ────────────────── 3. NA Access and Security ───────────────────
  {
    key:'access', title:'Access & Security', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', iconBg:'#F0F5FF',
    desc:'Network Access, Connectivity & Security',
    zohoModule:'NA_Network_Security',
    sections:[
      { title:'Access Components', fields:[
        {n:'Access_and_Security_Components',l:'Components',t:'multi',s:2,
         opts:['Fibre','LTE','Microwave','SD-WAN','Firewall','VPN','Managed Security']},
        {n:'Access_and_Security_Notes',l:'Notes',t:'area',s:3},
      ]},

      { title:'Current Access', fields:[
        {n:'Current_Access_Provider',l:'Current Access Provider',t:'txt',req:true},
        {n:'Access_Contract_Expiry',l:'Contract Expiry',t:'date'},
        {n:'Existing_Link_Size',l:'Existing Link Size',t:'txt'},
        {n:'Future_Link_Size_Required',l:'Future Link Size',t:'txt'},
        {n:'Concurrent_Network_Users',l:'Concurrent Network Users',t:'num',req:true},
      ]},

      { title:'Access Purpose', fields:[
        {n:'Internet',l:'Internet',t:'bool'},
        {n:'Voice_and_Internet',l:'Voice and Internet',t:'bool'},
        {n:'Voice_Only',l:'Voice Only',t:'bool'},
        {n:'VPN',l:'VPN',t:'bool'},
        {n:'Cloud_Solutions_Access',l:'Cloud Solutions Access',t:'bool'},
        {n:'Enterprise_Solutions_Access',l:'Enterprise Solutions',t:'bool'},
        {n:'Other_Access_Purpose',l:'Other',t:'bool'},
      ]},

      { title:'Security Requirements', fields:[
        {n:'Managed_Security_Required',l:'Managed Security',t:'bool'},
        {n:'Existing_Firewall',l:'Existing Firewall',t:'bool'},
        {n:'Firewall_Type',l:'Firewall Type',t:'txt',dep:'Existing_Firewall'},
        {n:'SD_WAN_Required',l:'SD-WAN Required',t:'bool'},
        {n:'Immediate_Failover_Required',l:'Immediate Failover',t:'bool'},
        {n:'Secure_Remote_Connection_Required',l:'Secure Remote Connection',t:'bool'},
        {n:'Real_time_Reporting_Required',l:'Real-time Reporting',t:'bool'},
        {n:'Extended_Log_Retention_Required',l:'Extended Log Retention',t:'bool'},
      ]},
    ]
  },

  // ──────────────────── 4. NA Digital Channels ────────────────────
  {
    key:'digital', title:'Digital Channels', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', iconBg:'#F0F5FF',
    desc:'WhatsApp, Web Chat, SMS, Email & Engage',
    zohoModule:'NA_Digital_Channels',
    sections:[
      { title:'Digital Channel Components', fields:[
        {n:'Digital_Channel_Components',l:'Components',t:'multi',s:3,
         opts:['WhatsApp','Web Chat','SMS','Email','Engage']},
      ]},

      { title:'WhatsApp', fields:[
        {n:'WhatsApp_Required',l:'WhatsApp Required',t:'bool'},
        {n:'WhatsApp_Agents_Count',l:'Agents Count',t:'num',dep:'WhatsApp_Required'},
        {n:'Existing_WhatsApp_Business_Number',l:'Existing Business Number',t:'bool',dep:'WhatsApp_Required'},
        {n:'WhatsApp_Use_Case',l:'Use Case',t:'area',s:3,dep:'WhatsApp_Required'},
        {n:'WhatsApp_Notes',l:'Notes',t:'area',s:3,dep:'WhatsApp_Required'},
      ]},

      { title:'Web Chat', fields:[
        {n:'Web_Chat_Required',l:'Web Chat Required',t:'bool'},
        {n:'Web_Chat_Agents_Count',l:'Agents Count',t:'num',dep:'Web_Chat_Required'},
        {n:'Web_Chat_Use_Case',l:'Use Case',t:'area',s:3,dep:'Web_Chat_Required'},
        {n:'Web_Chat_Notes',l:'Notes',t:'area',s:3,dep:'Web_Chat_Required'},
      ]},

      { title:'SMS', fields:[
        {n:'SMS_Required',l:'SMS Required',t:'bool'},
        {n:'SMS_Agents_Count',l:'Agents Count',t:'num',dep:'SMS_Required'},
        {n:'SMS_Use_Case',l:'Use Case',t:'area',s:3,dep:'SMS_Required'},
        {n:'SMS_Notes',l:'Notes',t:'area',s:3,dep:'SMS_Required'},
      ]},

      { title:'Email Channel', fields:[
        {n:'Email_Required',l:'Email Required',t:'bool'},
        {n:'Email_Agents_Count',l:'Agents Count',t:'num',dep:'Email_Required'},
        {n:'Email_Use_Case',l:'Use Case',t:'area',s:3,dep:'Email_Required'},
        {n:'Email_Notes',l:'Notes',t:'area',s:3,dep:'Email_Required'},
      ]},

      { title:'Engage', fields:[
        {n:'Engage_Required',l:'Engage Required',t:'bool'},
        {n:'Engage_Use_Case',l:'Use Case',t:'area',s:3,dep:'Engage_Required'},
        {n:'Engage_Notes',l:'Notes',t:'area',s:3,dep:'Engage_Required'},
      ]},
    ]
  },

  // ────────────── 5. NA 3rd Party Integrations ────────────────────
  {
    key:'integrations', title:'3rd Party Integrations', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>', iconBg:'#EFF6FF',
    desc:'CRM, ERP, WFM, QM & Payment Gateway',
    zohoModule:'NA_Third_Party_Integration',
    sections:[
      { title:'Integration Components', fields:[
        {n:'Third_Party_Integration_Components',l:'Components',t:'multi',s:2,
         opts:['CRM','ERP','WFM','QM','Payment Gateway','API','SSO','Other']},
        {n:'Third_Party_Integration_Notes',l:'Integration Notes',t:'area',s:3},
      ]},

      { title:'CRM Integration', fields:[
        {n:'CRM_Required',l:'CRM Required',t:'bool'},
        {n:'CRM_Platform',l:'CRM Platform',t:'txt',dep:'CRM_Required'},
        {n:'CRM_Integration_Notes',l:'CRM Notes',t:'area',s:3,dep:'CRM_Required'},
      ]},

      { title:'ERP Integration', fields:[
        {n:'ERP_Required',l:'ERP Required',t:'bool'},
        {n:'ERP_Platform',l:'ERP Platform',t:'txt',dep:'ERP_Required'},
        {n:'ERP_Integration_Notes',l:'ERP Notes',t:'area',s:3,dep:'ERP_Required'},
      ]},

      { title:'WFM Integration', fields:[
        {n:'WFM_Required',l:'WFM Required',t:'bool'},
        {n:'WFM_Platform',l:'WFM Platform',t:'txt',dep:'WFM_Required'},
        {n:'WFM_Integration_Notes',l:'WFM Notes',t:'area',s:3,dep:'WFM_Required'},
      ]},

      { title:'QM Integration', fields:[
        {n:'QM_Required',l:'QM Required',t:'bool'},
        {n:'QM_Platform',l:'QM Platform',t:'txt',dep:'QM_Required'},
        {n:'QM_Integration_Notes',l:'QM Notes',t:'area',s:3,dep:'QM_Required'},
      ]},

      { title:'Payment Integration', fields:[
        {n:'Payment_Gateway_Required',l:'Payment Gateway Required',t:'bool'},
        {n:'Payment_Platform',l:'Payment Platform',t:'txt',dep:'Payment_Gateway_Required'},
        {n:'Payment_Integration_Notes',l:'Payment Notes',t:'area',s:3,dep:'Payment_Gateway_Required'},
      ]},
    ]
  }
];
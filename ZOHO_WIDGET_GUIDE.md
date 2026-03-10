# Zoho CRM Embedded Widget — Builder's Guide

This guide covers everything needed to build, structure, and deploy Zoho CRM embedded widgets using the Needs Analysis widget as a reference implementation. It assumes you are building vanilla JS widgets (no framework) that read and write to Zoho CRM modules.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Development Server Setup](#2-development-server-setup)
3. [The HTML Entry Point](#3-the-html-entry-point)
4. [SDK Initialization](#4-sdk-initialization)
5. [Data Architecture — Modules & Fields](#5-data-architecture--modules--fields)
6. [State Management](#6-state-management)
7. [Zoho API Patterns](#7-zoho-api-patterns)
8. [Rendering Engine](#8-rendering-engine)
9. [Event Handlers](#9-event-handlers)
10. [Design System & CSS](#10-design-system--css)
11. [Widget Sizing & Lifecycle](#11-widget-sizing--lifecycle)
12. [Deployment Checklist](#12-deployment-checklist)
13. [Common Patterns Quick Reference](#13-common-patterns-quick-reference)

---

## 1. Project Structure

Every widget follows this layout. Do not deviate — the dev server and Zoho's SDK loader depend on it.

```
my-widget/
├── app/
│   ├── widget.html          ← entry point (served at /app)
│   ├── css/
│   │   └── widget.css       ← all styles
│   └── js/
│       ├── modules.js       ← data schema (load first)
│       ├── state.js         ← state object + helpers (load second)
│       ├── renderer.js      ← UI rendering (load third)
│       ├── handlers.js      ← event handlers (load fourth)
│       ├── zoho-api.js      ← Zoho SDK calls (load fifth)
│       └── app.js           ← initialization entry (load last)
├── server/
│   └── index.js             ← Express HTTPS dev server
├── plugin-manifest.json     ← required by Zoho
├── package.json
├── cert.pem                 ← local SSL cert (not committed)
└── key.pem                  ← local SSL key (not committed)
```

**Why this load order matters:** `modules.js` defines `MODULES` which `state.js` consumes at parse time to build `S.data`. Everything else depends on both. `app.js` fires last so `initZoho()` is defined before it is called.

---

## 2. Development Server Setup

### package.json dependencies

```json
{
  "name": "my-widget",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {
    "body-parser": "^1.14.2",
    "chalk": "^1.1.3",
    "errorhandler": "^1.4.2",
    "express": "^4.13.3",
    "morgan": "^1.6.1",
    "portfinder": "^1.0.25",
    "serve-index": "^1.9.0"
  }
}
```

### server/index.js

Zoho requires HTTPS for the widget host. This server handles that locally with a self-signed cert.

```js
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var morgan = require('morgan');
var serveIndex = require('serve-index');
var https = require('https');
var chalk = require('chalk');

process.env.PWD = process.env.PWD || process.cwd();

var expressApp = express();
var port = 5000;

expressApp.use(morgan('dev'));
expressApp.use(bodyParser.json());
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(errorHandler());

// Required: allow Zoho to load the widget cross-origin
expressApp.use('/', function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Required: Zoho fetches this to validate the widget
expressApp.get('/plugin-manifest.json', function(req, res) {
  res.sendfile('plugin-manifest.json');
});

expressApp.use('/app', express.static('app'));
expressApp.use('/app', serveIndex('app'));
expressApp.get('/', function(req, res) { res.redirect('/app'); });

var options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

https.createServer(options, expressApp).listen(port, function() {
  console.log(chalk.green('Widget running at https://127.0.0.1:' + port));
  console.log(chalk.cyan('Open that URL in a tab and click Advanced → Proceed (unsafe) to trust the cert.'));
}).on('error', function(err) {
  if (err.code === 'EADDRINUSE') console.log(chalk.red(port + ' already in use'));
});
```

### Generating the SSL cert (one-time)

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```

Add both `.pem` files to `.gitignore`. Never commit them.

### plugin-manifest.json

```json
{
  "service": "CRM"
}
```

This file must be served at the root. It tells Zoho which service the widget targets.

### Starting the server

```bash
npm install
npm start
# then open https://127.0.0.1:5000 and accept the cert warning
```

---

## 3. The HTML Entry Point

`app/widget.html` is minimal. All logic lives in external JS files loaded in strict order.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Widget — Company Name</title>

  <!-- Zoho Embedded App SDK — always from live.zwidgets.com, not bundled -->
  <script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>

  <!-- Optional: Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="css/widget.css">
</head>
<body>

<!-- Single mount point — renderer writes innerHTML here -->
<div class="container" id="app"></div>

<!-- Toast notification container — kept outside #app so it survives re-renders -->
<div class="toast" id="toast"></div>

<!-- Load order is critical — do not rearrange -->
<script src="js/modules.js"></script>
<script src="js/state.js"></script>
<script src="js/renderer.js"></script>
<script src="js/handlers.js"></script>
<script src="js/zoho-api.js"></script>
<script src="js/app.js"></script>

</body>
</html>
```

**Key rules:**
- The SDK script must be the first script tag — it creates the global `ZOHO` object.
- `id="app"` is the single render root. Never add more than one.
- `id="toast"` must be outside `#app` — it must survive `innerHTML` replacements.

---

## 4. SDK Initialization

### app.js — Guard and boot

```js
if (typeof ZOHO === 'undefined') {
  // SDK failed to load (widget opened outside Zoho, or network issue)
  document.getElementById('app').innerHTML =
    '<div class="sdk-err">' +
    '<div class="sdk-err-ico">🔌</div>' +
    '<strong>Zoho SDK not available</strong><br>' +
    'This widget must be opened from within Zoho CRM.' +
    '</div>';
} else {
  initZoho();
}
```

Always guard on `typeof ZOHO === 'undefined'` — never assume the SDK loaded.

### zoho-api.js — initZoho()

```js
function initZoho() {
  ZOHO.embeddedApp.on("PageLoad", function(data) {
    // data.Entity   = the CRM module the widget was opened from (e.g. "Leads")
    // data.EntityId = the record ID (may be an array — always normalize)
    S.entity = data.Entity;
    S.leadId = Array.isArray(data.EntityId) ? data.EntityId[0] : data.EntityId;

    // Set dimensions inside PageLoad — this is the correct placement.
    // Calling Resize() after init() but outside PageLoad does not work reliably.
    ZOHO.CRM.UI.Resize({ height: "1100", width: "1600" });

    render(); // Show loading state immediately — don't leave the user with a blank screen

    // Fetch the triggering record, then load/create widget data
    ZOHO.CRM.API.getRecord({ Entity: data.Entity, RecordID: S.leadId })
      .then(function(r) {
        if (r.data && r.data[0]) {
          var rec = r.data[0];
          S.leadName = rec.Full_Name || rec.Company || rec.Name || 'Record';
          // Pre-populate read-only display fields
          S.data.parent.Lead_Name = rec.Lead_Name || rec.Full_Name || '';
          S.data.parent.Company   = rec.Company || '';
          // ... map other fields from the lead record
          render();
          findOrCreateRecord(); // search for existing widget record, or create one
        }
      });
  });

  ZOHO.embeddedApp.init();
  // NOTE: do NOT call Resize() here — call it inside PageLoad (see above)
}
```

**The PageLoad pattern:**
1. Fire `render()` immediately after getting the entity/ID so the user sees a loading spinner rather than a blank white box.
2. Fetch the triggering record to get display data.
3. Search for an existing linked record in your custom module(s).
4. Create one if it doesn't exist.
5. Load all data into `S.data`, then `render()` again.

---

## 5. Data Architecture — Modules & Fields

This is the schema layer. All module definitions live in `modules.js`. The shape drives the state initializer, the renderer, and the save logic — you define it once and everything else is derived.

### Module object shape

```js
{
  key: 'mymodule',          // unique string key used in S.data and S.recordIds
  title: 'My Module',       // display name in stepper and card header
  icon: '📋',               // emoji shown in card icon and summary cards
  iconBg: '#F0F4FF',        // background color for the icon container
  desc: 'Short description of what this module captures',
  zohoModule: 'My_Custom_Module', // Zoho API name of the CRM module; null for parent
  sections: [ /* see below */ ]
}
```

Set `zohoModule: null` on the parent module. The parent record is saved via `updateRecord` using the known record ID (`S.naId`). Child modules are saved via `insertRecord` / `updateRecord` using `S.recordIds[key]`.

### Section object shape

```js
{
  title: 'Section Display Name',
  fields: [ /* field objects */ ]
}
```

Sections appear as labelled dividers inside the card. Each section renders as a grid.

### Field object — all properties

```js
{
  n:    'Field_API_Name',   // REQUIRED — Zoho API field name (exact match)
  l:    'Display Label',    // REQUIRED — label shown above the field
  t:    'txt',              // REQUIRED — field type (see type table below)
  req:  true,               // optional — marks required for submit validation
  ro:   true,               // optional — read-only, rendered as disabled input
  s:    2,                  // optional — grid span: 2 = half-width, 3 = full-width; default = 1
  dep:  'OtherField',       // optional — conditional visibility (see dependency syntax)
  def:  'Default Value',    // optional — default value on state init
  opts: ['A', 'B', 'C'],   // required for 'pick' and 'multi' types
}
```

### Field type reference

| `t` value | Zoho field type       | Rendered as                   |
|-----------|-----------------------|-------------------------------|
| `txt`     | Single Line           | `<input type="text">`         |
| `num`     | Number / Integer      | `<input type="number">`       |
| `date`    | Date                  | `<input type="date">`         |
| `pick`    | Pick List             | `<select>`                    |
| `area`    | Multi Line (Small)    | `<textarea>`                  |
| `bool`    | Boolean / Checkbox    | Custom styled checkbox        |
| `multi`   | Multiselect Pick List | Clickable chip/pill group     |

### Dependency syntax (`dep`)

| `dep` value          | When field is shown                     |
|----------------------|-----------------------------------------|
| `"FieldName"`        | When `S.data[mk].FieldName` is truthy   |
| `"FieldName=Value"`  | When picklist equals `"Value"` exactly  |
| `"FieldName=true"`   | Equivalent to `"FieldName"` (explicit)  |
| `"FieldName=false"`  | When boolean is false / falsy           |

### Full example — a simple two-module widget

```js
const MODULES = [

  // Parent module — maps to an existing custom module record
  {
    key: 'parent', title: 'Quote Request', icon: '📝', iconBg: '#F0F4FF',
    desc: 'Client details and service scope',
    zohoModule: null, // parent: saved via S.naId directly
    sections: [
      { title: 'Client Info', fields: [
        { n: 'Lead_Name',  l: 'Lead Name',  t: 'txt', ro: true },
        { n: 'Company',    l: 'Company',    t: 'txt', ro: true },
        { n: 'Service_Type', l: 'Service Type', t: 'pick', req: true,
          opts: ['Voice', 'Data', 'Both'] },
        { n: 'Notes', l: 'Notes', t: 'area', s: 3 },
      ]},
    ]
  },

  // Child module — only appears when parent 'Voice_Required' is ticked
  {
    key: 'voice', title: 'Voice', icon: '📞', iconBg: '#EFF6FF',
    desc: 'Voice channel requirements',
    zohoModule: 'NA_Voice_Requirements',
    sections: [
      { title: 'Voice Config', fields: [
        { n: 'Agent_Count', l: 'Agent Count', t: 'num', req: true },
        { n: 'Inbound',  l: 'Inbound',  t: 'bool' },
        { n: 'Outbound', l: 'Outbound', t: 'bool' },
        { n: 'Recording_Type', l: 'Recording Type', t: 'pick',
          opts: ['Standard', 'Compliant'], dep: 'Inbound' },
      ]},
    ]
  }
];
```

---

## 6. State Management

`state.js` defines the single global state object `S` and all helper functions. Keep it pure — no DOM, no API calls.

### The S object

```js
const S = {
  step:      -1,          // -1 = summary/overview screen; 0+ = module step index
  leadId:    null,        // ID of the triggering CRM record
  leadName:  'Loading...', // display name shown in the header
  naId:      null,        // ID of the parent widget record
  entity:    null,        // CRM module name (e.g. "Leads")
  data:      {},          // all form data: S.data[moduleKey][fieldApiName]
  recordIds: {},          // Zoho record IDs for each module: S.recordIds[moduleKey]
  loading:   false,       // true while saving — shows spinner, blocks input
  isRerender: false,      // true during dependency-triggered re-renders (suppresses scroll reset)
  submitted: false,       // true after final submission — shows done screen
};
```

### Initializing S.data from MODULES

Run this immediately after defining `S` — it reads `MODULES` and creates a correctly-typed default for every field:

```js
function af(m) { return m.sections.flatMap(s => s.fields); }

MODULES.forEach(m => {
  S.data[m.key] = {};
  af(m).forEach(f => {
    S.data[m.key][f.n] =
      f.def  != null ? f.def :
      f.t === 'bool'  ? false :
      f.t === 'multi' ? [] :
      '';
  });
});
```

The `af(m)` helper (all fields of a module) is used everywhere — keep it at the top of state.js.

### Child module toggle map

If child modules are conditionally active based on parent booleans, declare the mapping here:

```js
const CHILD_TOGGLE_MAP = {
  'BooleanFieldName': 'childModuleKey',
  // e.g.:
  'Voice_Required': 'voice',
  'Data_Required':  'data',
};

function activeModules() {
  const active = [MODULES[0]]; // parent is always included
  const pd = S.data.parent;
  for (const [boolField, childKey] of Object.entries(CHILD_TOGGLE_MAP)) {
    if (pd[boolField]) {
      const m = MODULES.find(x => x.key === childKey);
      if (m) active.push(m);
    }
  }
  return active;
}
```

If your widget has no conditional child modules (all steps always visible), just return all modules:

```js
function activeModules() { return MODULES; }
```

### Visibility helper

```js
function vis(f, mk) {
  if (!f.dep) return true;
  const d = S.data[mk];
  if (f.dep.includes('=')) {
    const eq = f.dep.indexOf('=');
    const k  = f.dep.substring(0, eq);
    const v  = f.dep.substring(eq + 1);
    const dv = d[k];
    if (v === 'false') return !dv;
    if (v === 'true')  return !!dv;
    return String(dv) === v;
  }
  return !!d[f.dep];
}
```

### Empty-value helper

```js
function emp(v) {
  return v === '' || v === false || v === null || v === undefined
    || (Array.isArray(v) && !v.length);
}
```

### Module completion status

Returns `'ok'` (all required visible fields filled), `'wip'` (some data entered but incomplete), or `'no'` (nothing entered):

```js
function modStat(mk) {
  const m  = MODULES.find(x => x.key === mk);
  const d  = S.data[mk];
  const fl = af(m);
  const vr = fl.filter(f => f.req && vis(f, mk));   // visible required fields
  const fr = vr.filter(f => !emp(d[f.n]));           // filled required fields
  const any = fl.some(f => !emp(d[f.n]));            // any field has data

  if (vr.length > 0 && fr.length === vr.length && any) return 'ok';
  if (!vr.length && any) return 'ok'; // no required fields — any data = complete
  if (any) return 'wip';
  return 'no';
}
```

### Convenience counters

```js
function fc(mk) {
  // Count of filled fields in a module (for progress bar)
  return af(MODULES.find(x => x.key === mk))
    .filter(f => !emp(S.data[mk][f.n])).length;
}

function dc() {
  // Count of completed (ok) modules
  return activeModules().filter(m => modStat(m.key) === 'ok').length;
}

function allReqDone() {
  // True if every required visible field across all active modules is filled
  return !activeModules().some(m =>
    af(m).some(f => f.req && vis(f, m.key) && emp(S.data[m.key][f.n]))
  );
}
```

---

## 7. Zoho API Patterns

All Zoho API calls live in `zoho-api.js`. Never call the Zoho SDK from `handlers.js` or `renderer.js`.

### Reading a record

```js
ZOHO.CRM.API.getRecord({ Entity: "Leads", RecordID: recordId })
  .then(function(r) {
    const rec = r.data[0]; // always index [0]
    // rec.Field_Name gives the value
    // Lookup fields return an object: { id: "...", name: "..." }
    // Use rec.Lookup_Field.name for the display value
  });
```

### Searching records

```js
ZOHO.CRM.API.searchRecord({
  Entity: "My_Custom_Module",
  Type: "criteria",
  Query: "(Lookup_Field:equals:" + parentRecordId + ")"
}).then(function(r) {
  if (r.data && r.data[0]) {
    const rec = r.data[0];
    // process record
  }
  // if r.data is null/empty, no records matched
});
```

Criteria syntax: `(Field_API_Name:operator:value)`

Common operators: `equals`, `starts_with`, `contains`, `between`

Chain criteria with `and`/`or`: `((Field1:equals:A)and(Field2:equals:B))`

### Creating a record

```js
ZOHO.CRM.API.insertRecord({
  Entity: "My_Custom_Module",
  APIData: {
    Name: "Record Name",           // Name field is usually required
    Lookup_Field: parentRecordId,  // Link to parent
    Text_Field: "value",
    Number_Field: 42,
    Boolean_Field: true,
  },
  Trigger: ["workflow"]            // fire workflow rules; omit to skip
}).then(function(res) {
  const newId = res.data[0].details.id; // store this for future updates
  S.recordIds[m.key] = newId;
});
```

### Updating a record

```js
ZOHO.CRM.API.updateRecord({
  Entity: "My_Custom_Module",
  APIData: {
    id: existingRecordId,         // REQUIRED — must include the record ID
    Field_Name: "new value",
  },
  Trigger: ["workflow"]
});
```

### Calling a Deluge server function

Use this for operations that require Deluge logic (e.g. creating records with complex relationships that need server-side field population):

```js
ZOHO.CRM.FUNCTIONS.execute("function_name", {
  arguments: JSON.stringify({ key: value })
}).then(function(resp) {
  const output = resp.details && resp.details.output;
  // output is the return value of the Deluge function (as a string)
});
```

The Deluge function must be deployed in CRM → Setup → Developer Hub → Functions.

### Handling multiselect fields

Zoho stores multiselect pick list values as a semicolon-separated string on the record. Always split on load, and join when saving:

```js
// Loading:
if (f.t === 'multi' && typeof rec[f.n] === 'string') {
  S.data[mk][f.n] = rec[f.n].split(';');
}

// Saving (in saveMod):
// No conversion needed — Zoho's API accepts arrays directly for multiselect fields.
// If you find it doesn't, join: d[f.n] = S.data[mk][f.n].join(';')
```

### Handling lookup fields

Lookup fields return an object `{ id: "12345", name: "Display Name" }`. Extract `.name` for display:

```js
if (typeof rec[f.n] === 'object' && rec[f.n].name) {
  S.data[mk][f.n] = rec[f.n].name;
} else {
  S.data[mk][f.n] = rec[f.n];
}
```

### The full save module pattern

This pattern handles both first-time insert and subsequent update, for both parent and child modules:

```js
async function saveMod(mc) {
  const d = {};

  // Build payload — only include non-read-only, visible, non-empty fields
  af(mc).forEach(f => {
    if (!f.ro && vis(f, mc.key) && !emp(S.data[mc.key][f.n])) {
      d[f.n] = S.data[mc.key][f.n];
    }
  });

  try {
    if (mc.key === 'parent') {
      // Parent: always update using the known naId
      if (!S.naId) return false;
      d.id = S.naId;
      await ZOHO.CRM.API.updateRecord({
        Entity: "My_Parent_Module",
        APIData: d,
        Trigger: ["workflow"]
      });
      return true;
    }

    // Child: needs the parent linked
    if (!S.naId) return false;
    d.Parent_Lookup_Field = S.naId;

    if (S.recordIds[mc.key]) {
      // Subsequent save — update
      d.id = S.recordIds[mc.key];
      await ZOHO.CRM.API.updateRecord({
        Entity: mc.zohoModule,
        APIData: d,
        Trigger: ["workflow"]
      });
    } else {
      // First save — insert and store the returned ID
      d.Name = mc.title;
      const res = await ZOHO.CRM.API.insertRecord({
        Entity: mc.zohoModule,
        APIData: d,
        Trigger: ["workflow"]
      });
      if (res.data && res.data[0] && res.data[0].details) {
        S.recordIds[mc.key] = res.data[0].details.id;
      }
    }
    return true;

  } catch (e) {
    console.error('saveMod error:', mc.key, e);
    return false;
  }
}
```

---

## 8. Rendering Engine

`renderer.js` contains the entire UI as string-interpolated HTML written to `el.innerHTML`. There is no virtual DOM or diffing — the whole view re-renders on every state change.

### render() — main dispatcher

```js
function render() {
  const el = document.getElementById('app');

  // Show spinner while saving
  if (S.loading) {
    el.innerHTML = '<div class="spin-wrap"><div class="spin"></div>' +
                   '<div class="spin-text">Saving...</div></div>';
    S.isRerender = false;
    return;
  }

  // Preserve scroll and focus before wiping innerHTML
  const cb       = el.querySelector('.card-body');
  const scrollY  = cb ? cb.scrollTop : 0;
  const ae       = document.activeElement;
  const focusId  = ae && ae.id ? ae.id : null;
  const focusSel = ae && ae.dataset && ae.dataset.f
                   ? `[data-f="${ae.dataset.f}"]` : null;

  // Route to correct view
  if (S.submitted)      { rDone(el); }
  else if (S.step === -1) { rSum(el); }
  else                  { rForm(el); }

  // Restore scroll
  const newCb = el.querySelector('.card-body');
  if (newCb && scrollY) newCb.scrollTop = scrollY;

  // Restore focus
  if (focusId) {
    const fe = document.getElementById(focusId);
    if (fe) fe.focus();
  } else if (focusSel) {
    const fe = el.querySelector(focusSel);
    if (fe) fe.focus();
  }

  S.isRerender = false;
}
```

**Why preserve scroll and focus?** When a user types in a field or ticks a checkbox, `render()` is called — but it wipes innerHTML. Without these save/restore steps, the scroll position resets and the cursor jumps out of the active input.

**`S.isRerender`:** Set this to `true` before calling `render()` from a checkbox/chip change. The renderer uses it to suppress the card entry animation (`.card.no-anim`) so the form doesn't flash when toggling a dependency.

### rSum(el) — summary/overview screen

Uses a **two-panel layout**: a fixed-width left sidebar with the progress ring and submit actions, and a flexible right main area with the clickable module cards.

```js
function rSum(el) {
  const am  = activeModules();
  const c   = dc();           // completed module count
  const t   = am.length;     // total module count
  const pct = t > 0 ? Math.round((c / t) * 100) : 0;
  const circ   = 2 * Math.PI * 18;          // circumference for r=18
  const offset = circ - (pct / 100) * circ; // stroke-dashoffset

  el.innerHTML = `
    <div class="brand-bar"></div>
    <div class="hdr">...</div>

    <div class="sum-layout">

      <!-- LEFT SIDEBAR: progress ring + per-module status + submit actions -->
      <div class="sum-sidebar">

        <!-- Progress stat card -->
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
          ${am.map(m => {
            const s = modStat(m.key);
            return \`<div class="sum-stat-row">
              <span class="sum-stat-ico" style="background:\${m.iconBg}">\${m.icon}</span>
              <span class="sum-stat-name">\${m.title}</span>
              <span class="sbadge \${s==='ok'?'sb-ok':s==='wip'?'sb-wip':'sb-no'}"
                style="font-size:9px;padding:2px 6px;">
                \${s==='ok'?'Done':s==='wip'?'WIP':'—'}
              </span>
            </div>\`;
          }).join('')}
        </div>

        <!-- Submit action card -->
        <div class="sum-action-card">
          ${allReqDone()
            ? `<p class="sum-action-hint">All sections complete — ready to submit</p>
               <button class="btn btn-ok" onclick="doSubmit()" style="width:100%;">Submit Analysis</button>`
            : `<p class="sum-action-hint">Complete all required fields before submitting</p>
               <div style="display:flex;flex-direction:column;gap:8px;">
                 <button class="btn btn-g" onclick="saveForLater()" style="width:100%;">Save for Later</button>
                 <button class="btn btn-ok" style="width:100%;" disabled>Submit Analysis</button>
               </div>`}
        </div>

      </div>

      <!-- RIGHT MAIN: 3-column module card grid -->
      <div class="sum-main">
        <div class="sgrid">
          ${am.map((m, i) => {
            const s      = modStat(m.key);
            const total  = af(m).length;
            const filled = fc(m.key);
            const barPct = total > 0 ? Math.round((filled / total) * 100) : 0;
            return \`<div class="scard \${s==='ok'?'s-ok':s==='wip'?'s-wip':''}" onclick="go(\${i})">
              <div class="scard-h">
                <h3><span class="scard-ico" style="background:\${m.iconBg}">\${m.icon}</span>\${m.title}</h3>
                <span class="sbadge \${s==='ok'?'sb-ok':s==='wip'?'sb-wip':'sb-no'}">
                  \${s==='ok'?'Complete':s==='wip'?'In Progress':'Not Started'}
                </span>
              </div>
              <p>\${m.desc}</p>
              <div class="fc">
                \${filled}/\${total} fields
                <div class="fc-bar"><div class="fc-bar-fill" style="width:\${barPct}%"></div></div>
              </div>
            </div>\`;
          }).join('')}
        </div>
      </div>

    </div>`;
}
```

### rForm(el) — step form screen

Replaces the old horizontal stepper bar with a **vertical sidebar nav** (`.form-nav`) beside the card. The card body expands to fill available height — no `max-height` cap needed at the large widget size.

```js
function rForm(el) {
  const am   = activeModules();
  const m    = am[S.step];
  const last = S.step === am.length - 1;

  el.innerHTML = `
    <div class="brand-bar"></div>
    <div class="hdr">
      ...
      <button class="btn btn-s" onclick="home()">← Overview</button>
    </div>

    <div class="form-layout">

      <!-- LEFT SIDEBAR: vertical module navigation -->
      <nav class="form-nav">
        <div class="fnav-header">Sections</div>
        ${am.map((x, i) => {
          const s        = modStat(x.key);
          const isActive = i === S.step;
          // fnav-check state: active-dot (current), done (complete), wip (partial)
          const checkCls = isActive ? 'active-dot' : s === 'ok' ? 'done' : s === 'wip' ? 'wip' : '';
          const checkInner = s === 'ok' && !isActive ? '✓' : '';
          return `<div class="fnav-item ${isActive ? 'active' : ''}" onclick="go(${i})">
            <span class="fnav-ico" style="background:${x.iconBg}">${x.icon}</span>
            <div class="fnav-info">
              <div class="fnav-title">${x.title}</div>
              <div class="fnav-status">${s === 'ok' ? 'Complete' : s === 'wip' ? 'In Progress' : 'Not Started'}</div>
            </div>
            <div class="fnav-check ${checkCls}">${checkInner}</div>
          </div>`;
        }).join('')}
      </nav>

      <!-- RIGHT MAIN: card fills remaining height -->
      <div class="form-main">
        <div class="card${S.isRerender ? ' no-anim' : ''}">
          <div class="card-accent"></div>
          <div class="card-hdr">
            <div class="card-ico" style="background:${m.iconBg}">${m.icon}</div>
            <div><h2>${m.title}</h2><p>${m.desc}</p></div>
          </div>
          <div class="card-body">
            ${m.sections.map(sec => {
              const vf = sec.fields.filter(f => vis(f, m.key));
              if (!vf.length) return '';
              return `<div class="sec">${sec.title}</div>
                      <div class="grid">${vf.map(f => rf(f, m.key)).join('')}</div>`;
            }).join('')}
          </div>
          <div class="ftr">
            <button class="btn btn-s" onclick="go(${S.step - 1})" ${S.step === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <div style="display:flex;gap:8px;">
              ${last
                ? `<button class="btn btn-ok" onclick="saveFin()">Save & Review</button>`
                : `<button class="btn btn-g" onclick="saveS()">Save Section</button>
                   <button class="btn btn-p" onclick="go(${S.step + 1})">Next →</button>`}
            </div>
          </div>
        </div>
      </div>

    </div>`;
}
```

### rf(f, mk) — field renderer

Returns an HTML string for a single field. All interactive elements use `data-m` (module key) and `data-f` (field name) attributes for handler lookups.

```js
function rf(f, mk) {
  const d  = S.data[mk];
  const v  = d[f.n];
  const sp = f.s === 3 ? 's3' : f.s === 2 ? 's2' : ''; // grid span class

  // Boolean checkbox
  if (f.t === 'bool') {
    return `<div class="chk ${sp}">
      <input type="checkbox" id="f_${f.n}" ${v ? 'checked' : ''}
        onchange="chk('${mk}','${f.n}',this.checked)">
      <label for="f_${f.n}">${f.l}</label>
    </div>`;
  }

  // Multiselect chips
  if (f.t === 'multi') {
    const a = Array.isArray(v) ? v : [];
    return `<div class="fg ${sp}">
      <label>${f.l}</label>
      <div class="chips">
        ${f.opts.map(o => `
          <label class="chip ${a.includes(o) ? 'on' : ''}">
            <input type="checkbox" ${a.includes(o) ? 'checked' : ''}
              onchange="ms('${mk}','${f.n}','${o}',this.checked)">${o}
          </label>`).join('')}
      </div>
    </div>`;
  }

  // Read-only display field
  if (f.ro) {
    return `<div class="fg ${sp}">
      <label>${f.l}</label>
      <input type="text" value="${v || ''}" readonly
        style="background:#f5f5f5;color:#555;cursor:default;">
    </div>`;
  }

  const rq = f.req ? '<span class="rq">*</span>' : '';

  // Pick list (select)
  if (f.t === 'pick') {
    return `<div class="fg ${sp}">
      <label>${f.l}${rq}</label>
      <select data-m="${mk}" data-f="${f.n}" onchange="inp(this)">
        <option value="">Select...</option>
        ${f.opts.map(o => `<option value="${o}" ${v === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>`;
  }

  // Textarea
  if (f.t === 'area') {
    return `<div class="fg ${sp}">
      <label>${f.l}${rq}</label>
      <textarea data-m="${mk}" data-f="${f.n}" oninput="inp(this)"
        placeholder="Enter details...">${v || ''}</textarea>
    </div>`;
  }

  // Text / number / date
  const ty = f.t === 'num' ? 'number' : f.t === 'date' ? 'date' : 'text';
  return `<div class="fg ${sp}">
    <label>${f.l}${rq}</label>
    <input type="${ty}" data-m="${mk}" data-f="${f.n}" value="${v || ''}"
      oninput="inp(this)" placeholder="${f.t === 'num' ? '0' : 'Enter...'}">
  </div>`;
}
```

---

## 9. Event Handlers

All handlers live in `handlers.js`. They update `S.data` and call `render()`.

### Input / select / textarea change

```js
function inp(el) {
  // Uses data-m and data-f attributes set by rf()
  S.data[el.dataset.m][el.dataset.f] = el.value;
  // Note: no render() — inputs are not re-rendered on every keystroke
  // render() is only called on save or navigation
}
```

### Checkbox change

```js
function chk(mk, fn, v) {
  S.data[mk][fn] = v;
  S.isRerender = true; // suppress slide animation on re-render
  render();            // must re-render — dependencies may show/hide fields
}
```

### Multiselect chip toggle

```js
function ms(mk, fn, o, on) {
  const a = S.data[mk][fn] || [];
  if (on  && !a.includes(o)) a.push(o);
  if (!on) { const i = a.indexOf(o); if (i > -1) a.splice(i, 1); }
  S.data[mk][fn] = a;
  S.isRerender = true;
  render();
}
```

### Navigation

```js
function go(i) {
  const am = activeModules();
  if (i < 0) i = 0;
  if (i >= am.length) i = am.length - 1;
  S.step = i;
  render();
  window.scrollTo(0, 0);
}

function home() {
  S.step = -1;
  render();
  window.scrollTo(0, 0);
}
```

### Saving

```js
function saveS() {
  if (S.saving) return; // prevent double-tap
  S.saving = true;
  const m = activeModules()[S.step];
  saveMod(m).then(function(ok) {
    S.saving = false;
    toast(m.title + (ok ? ' saved' : ' save failed'), ok ? 'ok' : 'err');
    render();
  });
}

function saveFin() {
  if (S.saving) return;
  S.saving = true;
  const m = activeModules()[S.step];
  saveMod(m).then(function(ok) {
    S.saving = false;
    if (ok) home();
    toast(m.title + (ok ? ' saved' : ' save failed'), ok ? 'ok' : 'err');
  });
}
```

### Submit with validation

```js
function doSubmit() {
  if (S.saving) return;
  // Collect missing required fields across all active modules
  const miss = [];
  activeModules().forEach(m => {
    af(m).forEach(f => {
      if (f.req && vis(f, m.key) && emp(S.data[m.key][f.n])) {
        miss.push(m.title + ': ' + f.l);
      }
    });
  });
  if (miss.length) {
    // Show first 3 missing fields in toast
    toast('Missing: ' + miss.slice(0, 3).join(', ') +
          (miss.length > 3 ? ' (+' + (miss.length - 3) + ' more)' : ''), 'err');
    return;
  }
  submitAll(); // defined in zoho-api.js
}
```

### Save for later (save all modules without submitting)

```js
function saveForLater() {
  if (S.saving) return;
  S.saving = true;
  const am = activeModules();
  // Sequential promise chain — save each module one at a time
  var chain = Promise.resolve(true);
  am.forEach(function(m) {
    chain = chain.then(function(prev) {
      return saveMod(m).then(function(ok) { return prev && ok; });
    });
  });
  chain.then(function(ok) {
    S.saving = false;
    if (ok && S.naId) {
      // Update status field to reflect partial completion
      ZOHO.CRM.API.updateRecord({
        Entity: "My_Parent_Module",
        APIData: { id: S.naId, Status_Field: "In Progress" },
        Trigger: ["workflow"]
      }).then(function() {
        S.data.parent.Status_Field = 'In Progress';
        toast('Progress saved', 'ok');
        render();
      });
    } else {
      toast(ok ? 'Progress saved' : 'Some sections failed to save', ok ? 'ok' : 'err');
      render();
    }
  });
}
```

### Toast notification

```js
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast toast-' + (type === 'ok' ? 'ok' : 'err') + ' show';
  setTimeout(() => t.classList.remove('show'), 3500);
}
```

### Close widget

```js
function closeWidget() {
  ZOHO.CRM.UI.Popup.closeReload(); // closes the widget and refreshes the CRM record view
}
```

---

## 10. Design System & CSS

`widget.css` implements a complete design system using CSS custom properties. Copy it wholesale for new widgets and only change the brand color values in `:root`.

### Changing brand colors

In `widget.css`, find the `:root` block and update the `--brand-*` values:

```css
:root {
  /* Replace with your brand palette */
  --brand-900: #0A2640;
  --brand-800: #0F3D5F;
  --brand-700: #13507A;
  --brand-600: #176696;  /* primary button background */
  --brand-500: #1C7DB2;  /* focus ring, stepper active */
  --brand-400: #2196D4;
  --brand-300: #4DB0E0;
  --brand-200: #8CCFEE;
  --brand-100: #C6E7F7;
  --brand-50:  #EBF5FB;  /* chip hover background */

  /* Accent (used in gradient bars) */
  --accent-500: #00B4D8;

  /* Do not change the semantic or neutral tokens */
}
```

Everything that uses brand colors (buttons, focus rings, nav indicators, chips) will update automatically.

### Layout classes

**Chrome / shell**

| Class | Purpose |
|-------|---------|
| `.container` | Max `1520px` centred wrapper, `24px` padding |
| `.brand-bar` | 3px gradient top accent stripe |
| `.hdr` | Flex header row with logo, title, and right action slot |
| `.card` | Content card with shadow and border |
| `.card-accent` | Gradient top strip on card |
| `.card-hdr` | Card header with icon + title/desc |
| `.card-body` | Scrollable form area (fills height in two-panel layout) |
| `.ftr` | Card footer with prev/next/save buttons |

**Summary screen — two-panel layout**

| Class | Purpose |
|-------|---------|
| `.sum-layout` | Flex row — sidebar + main |
| `.sum-sidebar` | Left panel, `260px` fixed width, stacks vertically |
| `.sum-main` | Right panel, `flex: 1`, holds `.sgrid` |
| `.sum-stat-card` | White card: progress ring + per-module status rows |
| `.sum-stat-row` | One row: icon, module name, mini badge |
| `.sum-stat-ico` | `22px` icon box in stat row |
| `.sum-stat-name` | Module name label in stat row |
| `.sum-stat-divider` | 1px horizontal rule between ring and rows |
| `.sum-action-card` | White card: submit / save-for-later actions |
| `.sum-action-hint` | Muted hint text above action buttons |
| `.sgrid` | 3-column grid for module cards |

**Form screen — two-panel layout**

| Class | Purpose |
|-------|---------|
| `.form-layout` | Flex row, `height: calc(100vh - 130px)` |
| `.form-nav` | Left sidebar, `220px`, scrollable vertical nav |
| `.fnav-header` | "Sections" label at top of nav |
| `.fnav-item` | One module row in nav (add `.active` for current step) |
| `.fnav-ico` | `30px` emoji icon in nav item |
| `.fnav-info` | Wrapper for title + status text in nav item |
| `.fnav-title` | Module name in nav item |
| `.fnav-status` | Completion text ("Complete", "In Progress", etc.) |
| `.fnav-check` | Status indicator circle — add `.done` / `.wip` / `.active-dot` |
| `.form-main` | Right flex column that holds the card |

### Grid system

```html
<div class="grid">
  <div class="fg">          <!-- 1/3 width (default) -->
  <div class="fg s2">       <!-- 2/3 width -->
  <div class="fg s3">       <!-- full width -->
  <div class="chk">         <!-- 1/3 width checkbox -->
  <div class="chk s3">      <!-- full width checkbox -->
</div>
```

### Field group (.fg)

```html
<div class="fg">
  <label>Field Label <span class="rq">*</span></label>
  <input type="text" ...>
  <!-- optional: <span class="ferr">Error message</span> -->
</div>
```

### Summary cards (.scard)

```html
<div class="sgrid">               <!-- 3-column grid inside .sum-main -->
  <div class="scard s-ok">        <!-- s-ok=complete, s-wip=partial, (none)=empty -->
    <div class="scard-h">
      <h3><span class="scard-ico">🔧</span>Module Name</h3>
      <span class="sbadge sb-ok">Complete</span>  <!-- sb-ok / sb-wip / sb-no -->
    </div>
    <p>Description text</p>
    <div class="fc">
      5/12 fields
      <div class="fc-bar"><div class="fc-bar-fill" style="width:42%"></div></div>
    </div>
  </div>
</div>
```

### Button variants

| Class | Usage |
|-------|-------|
| `.btn.btn-p` | Primary action (Next, Save) |
| `.btn.btn-ok` | Success action (Submit, Finish) — green |
| `.btn.btn-s` | Secondary / outline (Previous, back nav) |
| `.btn.btn-g` | Ghost (Cancel, Save for Later) |

Add `disabled` attribute to grey out any button. Do not use CSS only — set the attribute.

### Animations

- Cards entering: `.card` gets `slideUp` keyframe (250ms). Add `.no-anim` to suppress on re-render.
- Status badge: `.badge .dot` pulses when `badge-warn`.
- Spinner: `.spin` rotates 0.7s linear.
- Toast: slides up from bottom using `transform` transition.

---

## 11. Widget Sizing & Lifecycle

### Setting dimensions

```js
// Inside the PageLoad callback — this is the only reliable placement
ZOHO.CRM.UI.Resize({ height: "1100", width: "1600" });
```

**Important:** call `Resize()` inside the `PageLoad` event handler, not after `ZOHO.embeddedApp.init()`. Calling it outside PageLoad is unreliable — Zoho may silently ignore it.

The current widget uses `1100 × 1600` to support the two-panel layout. Common sizes for reference:

| Size | Dimensions | Use case |
|------|-----------|----------|
| Compact | `400 × 600` | Simple single-field popups |
| Standard form | `625 × 750` | Single-column multi-step forms |
| Large two-panel | `1100 × 1600` | Side-nav + form, wide content |

Zoho enforces a platform maximum — test at the target dimensions in a live org to confirm they are accepted.

### Widget lifecycle

```
Zoho opens widget
  → SDK fires PageLoad event
    → initZoho() runs
      → render() (loading state)
      → getRecord() for triggering record
        → render() (with display data)
        → searchRecord() for widget record
          → found: loadParentAndChildren()
          → not found: createNARecord() → loadParentAndChildren()
            → render() (data loaded, interactive)
              → user edits fields
              → user clicks Save / Navigate
              → user clicks Submit
                → submitAll()
                  → render() (done screen)
                    → user clicks Close
                      → closeWidget()
```

### Closing the widget

```js
ZOHO.CRM.UI.Popup.closeReload(); // closes and refreshes the underlying record view
ZOHO.CRM.UI.Popup.close();       // closes without refresh
```

---

## 12. Deployment Checklist

### Before deploying to Zoho

- [ ] All field API names in `modules.js` match the actual Zoho module field names exactly (case-sensitive)
- [ ] `zohoModule` values in `modules.js` match the Zoho module API names exactly
- [ ] Lookup field names used in `searchRecord` queries match the Zoho API name exactly
- [ ] Any Deluge functions called via `ZOHO.CRM.FUNCTIONS.execute()` are deployed and active in CRM
- [ ] `plugin-manifest.json` exists at project root with `{ "service": "CRM" }`
- [ ] Widget dimensions set in `ZOHO.CRM.UI.Resize()` match your design
- [ ] Test `saveForLater()` with a fresh record and an existing record (tests both insert and update paths)
- [ ] Test `doSubmit()` with missing required fields — verify toast shows correct missing field list
- [ ] Verify multiselect fields save and re-load correctly (semicolon split/join)
- [ ] Verify lookup fields display `.name` not the object

### Deploying via Zoho Developer Hub

1. Go to CRM → Setup → Developer Hub → Widgets
2. Create a new widget of type "Button Widget" (or as appropriate for your use case)
3. Upload a `.zip` of your project containing `app/`, `plugin-manifest.json` (do not include `node_modules/`, `cert.pem`, `key.pem`, `dist/`)
4. Configure which module(s) and where the button appears (List View, Detail View, etc.)
5. Save and test in a sandbox org before enabling in production

---

## 13. Common Patterns Quick Reference

### Add a new module to an existing widget

1. Add the module object to `MODULES` array in `modules.js`
2. If it's conditional, add its entry to `CHILD_TOGGLE_MAP` in `state.js`
3. `S.data` and `S.recordIds` are initialized automatically by the loop in `state.js`
4. Add data loading to `loadAll()` in `zoho-api.js` (the loop iterates all modules with a `zohoModule`)
5. `saveMod()` handles the new module automatically
6. No changes needed in `renderer.js` or `handlers.js`

### Add a new field type

1. Add the field object to the relevant section in `modules.js`
2. Add a new branch in `rf()` in `renderer.js` if it's a type not yet handled
3. For inputs that need a different change handler, add `onchange="yourHandler(this)"` in `rf()` and define `yourHandler` in `handlers.js`

### Validate a field format (e.g. email)

In `doSubmit()` or `saveS()`, add validation before calling `saveMod()`:

```js
const email = S.data.parent.Email;
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  toast('Invalid email address', 'err');
  return;
}
```

### Show a confirmation dialog before submit

Use the native browser confirm (works inside Zoho widgets):

```js
function doSubmit() {
  if (!confirm('Submit this analysis? This cannot be undone.')) return;
  // ... rest of submit logic
}
```

### Prevent navigation away from unsaved changes

Track a `S.dirty` flag:

```js
// In handlers.js:
function inp(el) {
  S.data[el.dataset.m][el.dataset.f] = el.value;
  S.dirty = true;
}

// In go():
function go(i) {
  if (S.dirty) {
    if (!confirm('You have unsaved changes. Continue anyway?')) return;
    S.dirty = false;
  }
  // ... rest of go()
}
```

### Debug: inspect current state

Open browser dev tools inside the widget (right-click → Inspect in Zoho):

```js
console.log(JSON.stringify(S.data, null, 2));
console.log('recordIds:', S.recordIds);
console.log('active modules:', activeModules().map(m => m.key));
```

### Reset a module's data

```js
af(MODULES.find(x => x.key === 'ucaas')).forEach(f => {
  S.data.ucaas[f.n] = f.t === 'bool' ? false : f.t === 'multi' ? [] : '';
});
delete S.recordIds.ucaas;
render();
```

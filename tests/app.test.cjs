const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

class Element {
  constructor() { this.children=[]; this.events={}; this.style={}; this.value=''; this.textContent=''; this.classes=new Set(); this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)}; }
  set innerHTML(value) { this.children=[]; this.html=value; }
  appendChild(child) { this.children.push(child); }
  setAttribute() {}
  addEventListener(event, fn) { this.events[event]=fn; }
  scrollIntoView() { this.scrolled=true; }
}

async function app(entry, { data={}, person, now='2026-10-01T22:30:00Z', search='', online=true, stored=[], failWrite=false }={}) {
  const records=structuredClone(data), writes=[], alerts=[], routes=[], elements={}, documentEvents={}, windowEvents={}, logs=[];
  const storage=new Map(stored); if(person) storage.set('person',person);
  const navigator={onLine:online};
  const listeners=[];
  const document={referrer:'https://example.test/markitemtobuy.html', body:new Element(),
    getElementById(id) { if(elements[id]) return elements[id]; for(const e of Object.values(elements)) { const found=e.children.find(c=>c.id===id); if(found) return found; } return elements[id]=new Element(); },
    createElement:()=>new Element(), addEventListener:(name,fn)=>documentEvents[name]=fn};
  const window={location:{search,replace:url=>routes.push(url),origin:'https://example.test'},history:{length:8,back:()=>{throw Error('History back must not be used');}},addEventListener:(name,fn)=>windowEvents[name]=fn,setTimeout};
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const context=vm.createContext({document,window,navigator,Date:Clock,Intl,URLSearchParams,URL,console:{log:(...args)=>logs.push(args),warn:(...args)=>logs.push(args),error:(...args)=>logs.push(args)},setTimeout,clearTimeout,
    localStorage:{getItem:key=>storage.get(key),setItem:(key,val)=>storage.set(key,val)},alert:msg=>alerts.push(msg),confirm:()=>true});
  let authorized=true;
  const firebase={db:{isolated:true},ref:(db,key)=>{assert.equal(db.isolated,true);return key;},
    waitForAuth:async()=>{if(!authorized) throw Error('Not authenticated');},
    get:async key=>({exists:()=>Boolean(records[key.split('/')[1]]),val:()=>structuredClone(records[key.split('/')[1]])}),
    update:async(key,fields)=>{if(failWrite) throw Error('Network write failed');writes.push(['update',key,plain(fields)]);Object.assign(records[key.split('/')[1]],plain(fields));},
    push:async(key,item)=>{writes.push(['push',key,plain(item)]);records.fixtureNew=plain(item);},
    remove:async key=>{writes.push(['remove',key]);delete records[key.split('/')[1]];},
    onValue:(key,fn)=>{const listener={key,fn,active:true};listeners.push(listener);fn({val:()=>key==='.info/connected'?navigator.onLine:structuredClone(records)});return ()=>listener.active=false;},set:()=>{},child:()=>{},signOutUser:()=>{}};
  const mock=new vm.SyntheticModule(Object.keys(firebase),function(){for(const [key,val] of Object.entries(firebase)) this.setExport(key,val);},{context});
  const modules=new Map();
  function load(file) {
    if(path.basename(file)==='firebase-init.js') return mock;
    assert.ok(file.startsWith(path.join(root,'docs','js')+path.sep),'Module must be local app code');
    if(!modules.has(file)) modules.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));
    return modules.get(file);
  }
  const module=load(path.join(root,'docs','js',entry));
  await module.link((specifier,parent)=>{
    assert.ok(specifier.startsWith('./'),'Network and external imports are blocked');
    return load(path.resolve(path.dirname(parent.identifier),specifier));
  });
  await module.evaluate();
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  const ready=async()=>{if(documentEvents.DOMContentLoaded) await documentEvents.DOMContentLoaded(); if(windowEvents.DOMContentLoaded) await windowEvents.DOMContentLoaded(); await flush();};
  return {module,records,writes,alerts,routes,elements,document,window,windowEvents,navigator,storage,ready,flush,logs,allow:()=>authorized=true,deny:()=>authorized=false,emit:()=>listeners.filter(l=>l.active&&l.key==='handleliste').forEach(l=>l.fn({val:()=>structuredClone(records)})),connect:value=>listeners.filter(l=>l.active&&l.key==='.info/connected').forEach(l=>l.fn({val:()=>value}))};
}

test('Oslo date around midnight and daylight saving changes',async()=>{
  const {module}=await app('dates.js'); const date=module.namespace.getOsloDate;
  for(const [instant,expected] of [
    ['2026-01-01T22:59:59Z','2026-01-01'],['2026-01-01T23:00:00Z','2026-01-02'],
    ['2026-07-01T21:59:59Z','2026-07-01'],['2026-07-01T22:00:00Z','2026-07-02'],
    ['2026-03-29T00:59:59Z','2026-03-29'],['2026-03-29T01:00:00Z','2026-03-29'],
    ['2026-10-25T00:59:59Z','2026-10-25'],['2026-10-25T01:00:00Z','2026-10-25']
  ]) assert.equal(date(new Date(instant)),expected);
});
test('50 calendar days inclusive, invalid and missing histories, DST boundary',async()=>{
  const {module}=await app('dates.js');const recent=module.namespace.wasBoughtWithinDays;
  for(const now of ['2026-10-02T00:00:00Z','2026-04-01T00:00:00Z']) {
    const today=new Date(module.namespace.getOsloDate(new Date(now))+'T00:00:00Z');
    const cutoff=new Date(today.getTime()-50*86400000).toISOString().slice(0,10);
    const old=new Date(today.getTime()-51*86400000).toISOString().slice(0,10);
    assert.equal(recent({BoughtDate:[cutoff]},50,new Date(now)),true);
    assert.equal(recent({BoughtDate:[old]},50,new Date(now)),false);
    assert.equal(recent({BoughtDate:[old,cutoff]},50,new Date(now)),true);
  }
  for(const BoughtDate of [undefined,[],{},['bad','2026-02-30','2026-13-01','2026-1-1',null]]) assert.equal(recent({BoughtDate},50),false);
});
test('Norwegian sorting and direct return independent of referrer/history',async()=>{
  const a=await app('common.js');const n=a.module.namespace;
  assert.deepEqual(['Ål','Øl','Ære','zebra','Apple'].map(Name=>({Name})).sort(n.compareItemNames).map(i=>i.Name),['Apple','zebra','Ære','Øl','Ål']);
  assert.deepEqual([{Name:'B',Shop:'Å'},{Name:'b',Shop:'Extra'},{Name:'A',Shop:'extra'}].sort(n.compareItemsByShopThenName).map(i=>i.Name),['A','b','B']);
  n.returnToMainPage(); a.document.referrer='';n.returnToMainPage();assert.deepEqual(a.routes,['index.html','index.html']);
});
test('purchase uses default Morten, Oslo date, increments count and preserves ten dates',async()=>{
  for(const person of [undefined,'Linh']) {
    const history=Array.from({length:10},(_,i)=>'2026-09-'+String(30-i).padStart(2,'0'));
    const a=await app('main.js',{person,data:{fixture:{Name:'Kaffe',Shop:'Extra',Buy:true,BuyNumber:7,BoughtDate:history}}});await a.ready();
    assert.equal(a.elements.appVersion.textContent, "v4");
    a.elements.itemList.children[0].events.pointerup({});await a.flush();
    const fields=a.writes[0][2];assert.equal(fields.BoughtBy,person||'Morten');assert.equal(fields.BuyNumber,8);assert.equal(fields.Buy,false);
    assert.deepEqual(fields.BoughtDate,['2026-10-02',...history.slice(0,9)]);
  }
});
test('add existing: recent filter, show all, search, letter navigation and write',async()=>{
  const a=await app('markitemtobuy.js',{data:{recent:{Name:'Kaffe',Shop:'Extra',Buy:false,BoughtDate:['2026-08-13']},old:{Name:'Ål',Shop:'Extra',Buy:false,BoughtDate:['2026-08-12']},active:{Name:'Brød',Buy:true}}});await a.ready();
  assert.equal(a.elements.addList.children.length,1);assert.equal(a.elements.addList.children[0].children[0].textContent,'Kaffe');
  a.elements.addList.children[0].events.pointerup({});await a.flush();assert.deepEqual(a.writes[0],['update','handleliste/recent',{Buy:true}]);
  a.window.showAllItems();assert.equal(a.elements.addList.children.length,2);
  a.elements.itemSearch.value='ål';a.elements.itemSearch.events.input();assert.equal(a.elements.addList.children.length,1);
  a.elements.letterNav.children.find(e=>e.textContent==='Ø').events.click();assert.equal(a.elements.itemSearch.value,'');assert.ok(a.elements.addList.children[1].scrolled);
  a.window.goToShopPage();assert.equal(a.routes.at(-1),'index.html');
});
test('create validates fields, uses default person and returns to main; cancel returns to main',async()=>{
  const a=await app('additemtodatabase.js');await a.ready();await a.window.submitItem();assert.equal(a.writes.length,0);
  a.document.getElementById('itemName').value=' Kaffe ';a.document.getElementById('itemShop').value=' Extra ';await a.window.submitItem();
  assert.deepEqual(a.writes[0],['push','handleliste',{Name:'Kaffe',Shop:'Extra',AddedBy:'Morten',BoughtBy:'',BoughtDate:[],Buy:true,BuyNumber:0}]);
  a.window.cancelAdd();assert.deepEqual(a.routes,['index.html','index.html']);
});
test('edit and delete preserve separate return to add page and validate fields',async()=>{
  const a=await app('edititem.js',{search:'?id=fixture&return=markitemtobuy.html',data:{fixture:{Name:'Kaffe',Shop:'Extra',BuyNumber:9}}});await a.ready();
  a.elements.itemName.value='';await a.window.saveItem();assert.equal(a.writes.length,0);
  a.elements.itemName.value=' Te ';a.elements.itemShop.value=' Kiwi ';await a.window.saveItem();assert.equal(a.records.fixture.BuyNumber,9);assert.deepEqual(a.writes[0][2],{Name:'Te',Shop:'Kiwi'});
  await a.window.deleteItem();assert.equal(a.records.fixture,undefined);assert.deepEqual(a.routes,['markitemtobuy.html','markitemtobuy.html']);
});
test('authentication rejection prevents writes for create, purchase, add, edit and delete',async()=>{
  const a=await app('additemtodatabase.js');a.document.getElementById('itemName').value='Test';a.document.getElementById('itemShop').value='Test';a.deny();await a.window.submitItem();assert.equal(a.writes.length,0);
  for(const entry of ['main.js','markitemtobuy.js']) {
    const b=await app(entry,{data:{fixture:{Name:'Test',Buy:entry==='main.js',BoughtDate:['2026-10-02']}}});await b.ready();b.deny();
    b.elements[entry==='main.js'?'itemList':'addList'].children[0].events.pointerup({});await b.flush();assert.equal(b.writes.length,0);
  }
  const c=await app('edititem.js',{search:'?id=fixture',data:{fixture:{Name:'Test',Shop:'Test'}}});await c.ready();c.deny();await c.window.saveItem();await c.window.deleteItem();assert.equal(c.writes.length,0);
});
test('publication contains only necessary app files and all local references resolve',()=>{
  function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]); }
  const expected=['additemtodatabase.html','edititem.html','index.html','login.html','markitemtobuy.html','css/style.css','manifest.webmanifest','sw.js','icons/icon-192.png','icons/icon-512.png',...['offline-list','pwa','additemtodatabase','common','dates','edititem','firebase-init','main','markitemtobuy','version'].map(n=>'js/'+n+'.js')].sort();
  const actual=files(path.join(root,'docs')).map(f=>path.relative(path.join(root,'docs'),f).replaceAll('\\','/')).sort();assert.deepEqual(actual,expected);
  for(const file of files(path.join(root,'docs'))) {
    const text=fs.readFileSync(file,'utf8');
    for(const match of text.matchAll(/(?:src=|href=)["']([^"']+)["']|(?:from\s+)["']([^"']+)["']/g)) {
      const ref=match[1]||match[2];if(!ref.startsWith('http')&&!ref.startsWith('#')) assert.ok(fs.existsSync(path.resolve(path.dirname(file),ref)),ref+' in '+file);
    }
  }
  const source=fs.readFileSync(path.join(root,'docs/js/firebase-init.js'),'utf8');assert.match(source,/ZDq6ZGvDVDafX8BVlWGRhBoSn9X2/);assert.match(source,/fmVOzYiAtsOUNnUE33VZbwHR0SG3/);
  assert.match(fs.readFileSync(path.join(root,'docs/index.html'),'utf8'),/<!-- <button onclick="logout\(\)"/);
  assert.match(fs.readFileSync(path.join(root,'docs/js/version.js'),'utf8'),/APP_VERSION = 4;/);
});

test('offline restart shows only shopping rows, persists marks and prevents navigation/editing',async()=>{
  const first=await app('main.js',{person:'Linh',data:{coffee:{Name:'Kaffe',Shop:'Extra',Buy:true,BuyNumber:4,BoughtDate:['2026-09-01']},old:{Name:'Te',Buy:false}}});
  await first.ready();
  const cache=JSON.parse(first.storage.get('handleliste.offline.v1'));
  assert.deepEqual(cache.items,[{id:'coffee',Name:'Kaffe',Shop:'Extra'}]);
  const offline=await app('main.js',{online:false,person:'Linh',stored:[...first.storage]});await offline.ready();
  assert.equal(offline.elements.addButton.textContent,'Koble til internett');
  offline.elements.addButton.events.click();assert.equal(offline.window.location.href,undefined);
  const row=offline.elements.itemList.children[0];row.events.pointerup({});await offline.flush();
  assert.ok(offline.elements.itemList.children[0].classes.has('is-bought-offline'));
  offline.elements.itemList.children[0].events.pointerup({});await offline.flush();
  assert.equal(offline.writes.length,0);
  const restarted=await app('main.js',{stored:[...offline.storage],online:false});await restarted.ready();
  assert.ok(restarted.elements.itemList.children[0].classes.has('is-bought-offline'));
  assert.equal(restarted.elements.personSelector.disabled,true);
});
test('offline purchase syncs once with original person/date and latest database history',async()=>{
  const stored=[['handleliste.offline.v1',JSON.stringify({items:[{id:'coffee',Name:'Kaffe',Shop:'Extra'}],pending:{coffee:{person:'Linh',date:'2026-10-01'}}})]];
  const a=await app('main.js',{stored,online:false,data:{coffee:{Name:'Kaffe',Shop:'Extra',Buy:true,BuyNumber:4,BoughtDate:['2026-09-01']}}});await a.ready();
  a.navigator.onLine=true;a.windowEvents.online();await a.flush();await a.flush();
  const connected=a;
  assert.deepEqual(connected.writes[0][2],{Buy:false,BoughtBy:'Linh',BoughtDate:['2026-10-01','2026-09-01'],BuyNumber:5});
  connected.connect(true);await connected.flush();assert.equal(connected.writes.length,1);
  assert.equal(JSON.parse(connected.storage.get('handleliste.offline.v1')).items.length,0);
  assert.equal(connected.elements.addButton.textContent,'Legg til');
});
test('failed synchronization retains purchases across reload and never recreates deleted items',async()=>{
  const state={items:[{id:'coffee',Name:'Kaffe',Shop:'Extra'}],pending:{coffee:{person:'Morten',date:'2026-10-01'}}};
  const a=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],failWrite:true,data:{coffee:{Name:'Kaffe',Buy:true}}});await a.ready();await a.flush();
  assert.equal(a.writes.length,0);assert.ok(JSON.parse(a.storage.get('handleliste.offline.v1')).pending.coffee);
  const removed=await app('main.js',{stored:[...a.storage],data:{}});await removed.ready();await removed.flush();
  assert.equal(removed.writes.length,0);assert.deepEqual(JSON.parse(removed.storage.get('handleliste.offline.v1')).pending,{});
  const acknowledged=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],data:{coffee:{Buy:false,BuyNumber:5}}});await acknowledged.ready();await acknowledged.flush();
  assert.equal(acknowledged.writes.length,0);assert.equal(acknowledged.records.coffee.BuyNumber,5);
});
test('Firebase disconnection changes controls even while browser reports online; realtime cache excludes history',async()=>{
  const a=await app('main.js',{data:{coffee:{Name:'Kaffe',Shop:'Extra',Buy:true}}});await a.ready();
  a.connect(false);assert.equal(a.elements.addButton.textContent,'Koble til internett');
  a.elements.itemList.children[0].events.pointerup({});await a.flush();assert.equal(a.writes.length,0);
  a.records.tea={Name:'Te',Shop:'Kiwi',Buy:true,BoughtDate:['2026-09-01']};a.emit();
  assert.equal(JSON.parse(a.storage.get('handleliste.offline.v1')).items.length,2);
  a.connect(true);await a.flush();await a.flush();assert.equal(a.writes.length,1);
});
test('PWA manifest resolves within GitHub Pages subpath and PNG icons have required dimensions',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/manifest.webmanifest'),'utf8'));
  const base='https://bamsen61.github.io/ShoppingList-NoBackend/manifest.webmanifest';
  assert.equal(manifest.name,'Handleliste');assert.equal(manifest.display,'standalone');
  assert.equal(new URL(manifest.scope,base).pathname,'/ShoppingList-NoBackend/');
  assert.equal(new URL(manifest.start_url,base).pathname,'/ShoppingList-NoBackend/index.html');
  for(const icon of manifest.icons){const png=fs.readFileSync(path.join(root,'docs',icon.src));const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});

test('rapid purchases during sync are all drained without a second reconnect',async()=>{
  const a=await app('main.js',{data:{one:{Name:'Kaffe',Shop:'Extra',Buy:true},two:{Name:'Te',Shop:'Extra',Buy:true}}});await a.ready();
  a.elements.itemList.children[0].events.pointerup({});
  a.elements.itemList.children[1].events.pointerup({});
  await a.flush();await a.flush();assert.equal(a.writes.length,2);
  assert.deepEqual(JSON.parse(a.storage.get('handleliste.offline.v1')).pending,{});
});
test('pagehide unsubscribes listeners; back-forward restoration reconnects once',async()=>{
  const a=await app('main.js',{data:{one:{Name:'Kaffe',Buy:true}}});await a.ready();
  a.windowEvents.pagehide();a.records.two={Name:'Te',Buy:true};a.emit();assert.equal(a.elements.itemList.children.length,1);
  a.windowEvents.pageshow({persisted:true});await a.flush();assert.equal(a.elements.itemList.children.length,2);
  a.connect(false);a.elements.itemList.children[0].events.pointerup({});await a.flush();assert.equal(a.writes.length,0);
  a.connect(true);await a.flush();await a.flush();assert.equal(a.writes.length,1);
});
test('service worker precaches shell/SDK, provides offline navigation and never caches database/auth traffic',async()=>{
  const events={},cached=new Map(),deleted=[],base='https://example.test/ShoppingList-NoBackend/';
  let offline=false,fetches=0;
  const cache={addAll:async requests=>{for(const request of requests) { assert.equal(request.cache,'no-store');cached.set(request.url,{url:request.url,installed:true}); }},match:async request=>cached.get(typeof request==='string'?request:request.url)};
  const context=vm.createContext({URL,Request,console,self:{location:{href:base+'sw.js'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>events[name]=fn},
    caches:{open:async()=>cache,keys:async()=>['handleliste-shell-v3','handleliste-shell-v4','another-app'],delete:async key=>deleted.push(key)},
    fetch:async request=>{fetches++;if(offline) throw Error('offline');return {url:request.url,ok:true,installed:false};}});
  vm.runInContext(fs.readFileSync(path.join(root,'docs/sw.js'),'utf8'),context);
  let task;events.install({waitUntil:p=>task=p});await task;
  for(const url of cached.keys()) if(url.startsWith(base)) assert.ok(fs.existsSync(path.join(root,'docs',url.slice(base.length))),url);
  assert.ok(cached.has('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'));
  events.activate({waitUntil:p=>task=p});await task;assert.deepEqual(deleted,['handleliste-shell-v3']);
  function fetchEvent(url,mode='cors',method='GET') { let response;events.fetch({request:{url,mode,method},respondWith:p=>response=p});return response; }
  const online=await fetchEvent(base+'index.html','navigate');assert.equal(online.installed,true);
  offline=true;
  const fallback=await fetchEvent(base+'edititem.html?id=one','navigate');assert.equal(fallback.url,base+'index.html');
  const modules=await fetchEvent(base+'js/main.js');assert.equal(modules.installed,true);
  const sdk=await fetchEvent('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js');assert.equal(sdk.installed,true);
  for(const url of ['https://handleliste-3bdaa-default-rtdb.europe-west1.firebasedatabase.app/handleliste.json','https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',base+'unlisted.json','https://example.test/other-app/index.html']) assert.equal(fetchEvent(url),undefined);
  assert.equal(fetchEvent(base+'js/main.js','cors','POST'),undefined);
  assert.equal(fetches,2);
});

test('new service worker cannot populate its shell with v2 modules from the HTTP cache',async()=>{
  const events={},stored=new Map(),base='https://example.test/ShoppingList-NoBackend/';
  const cache={addAll:async requests=>{
    for(const request of requests) {
      // Reproduce Chrome holding the old version.js in its separate HTTP cache.
      const source=request.cache==='no-store' ? 'APP_VERSION = 4' : 'APP_VERSION = 2';
      stored.set(request.url,source);
    }
  }};
  const context=vm.createContext({URL,Request,self:{location:{href:base+'sw.js'},addEventListener:(name,fn)=>events[name]=fn},caches:{open:async()=>cache}});
  vm.runInContext(fs.readFileSync(path.join(root,'docs/sw.js'),'utf8'),context);
  let task;events.install({waitUntil:p=>task=p});await task;
  assert.equal(stored.get(base+'js/version.js'),'APP_VERSION = 4');
  assert.equal(stored.get(base+'js/main.js'),'APP_VERSION = 4');
});
test('new controller reloads the main page once and leaves forms intact',async()=>{
  for(const pathname of ['/ShoppingList-NoBackend/index.html','/ShoppingList-NoBackend/','/ShoppingList-NoBackend/edititem.html']) {
    const events={},registrations=[];let reloads=0;
    const context=vm.createContext({URL,console,navigator:{onLine:true,serviceWorker:{addEventListener:(name,fn)=>events[name]=fn,register:async(url,options)=>registrations.push([url.href,options])}},
      location:{pathname,reload:()=>reloads++,replace:()=>assert.fail('Online navigation must remain unchanged')},window:{addEventListener:()=>{}}});
    const module=new vm.SourceTextModule(fs.readFileSync(path.join(root,'docs/js/pwa.js'),'utf8'),{context,initializeImportMeta:meta=>meta.url='https://example.test/ShoppingList-NoBackend/js/pwa.js'});
    await module.link(()=>assert.fail('No external imports'));await module.evaluate();
    events.controllerchange();events.controllerchange();
    assert.equal(reloads,pathname.endsWith('edititem.html')?0:1);
    assert.equal(registrations[0][0],'https://example.test/ShoppingList-NoBackend/sw.js');
    assert.equal(registrations[0][1].updateViaCache,'none');
  }
});

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

async function app(entry, { data={}, person, now='2026-10-01T22:30:00Z', search='', online=true, stored=[], failWrite=false, failRead=false, databaseOnline=online, restartConnects=true, holdWrite, authReady }={}) {
  const records=structuredClone(data), writes=[], alerts=[], routes=[], elements={}, documentEvents={}, windowEvents={}, logs=[];
  const storage=new Map(stored); if(person) storage.set('person',person);
  const navigator={onLine:online};
  const listeners=[], transport=[];
  let databaseConnected=databaseOnline, clock=0, nextTimer=0;
  const timers=new Map();
  const later=(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:clock+ms});return id;};
  const cancel=id=>timers.delete(id);
  const connect=value=>{databaseConnected=value;listeners.filter(l=>l.active&&l.key==='.info/connected').forEach(l=>l.fn({val:()=>value}));};
  async function advanceTime(ms) { clock+=ms;for(const [id,timer] of [...timers]) if(timer.at<=clock) {timers.delete(id);timer.fn();}await new Promise(resolve=>setImmediate(resolve)); }

  const document={visibilityState:'visible',referrer:'https://example.test/markitemtobuy.html', body:new Element(),
    getElementById(id) { if(elements[id]) return elements[id]; for(const e of Object.values(elements)) { const found=e.children.find(c=>c.id===id); if(found) return found; } return elements[id]=new Element(); },
    createElement:()=>new Element(), addEventListener:(name,fn)=>documentEvents[name]=fn};
  const window={location:{search,replace:url=>routes.push(url),origin:'https://example.test'},history:{length:8,back:()=>{throw Error('History back must not be used');}},addEventListener:(name,fn)=>windowEvents[name]=fn,setTimeout:later};
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const context=vm.createContext({document,window,navigator,Date:Clock,Intl,URLSearchParams,URL,console:{log:(...args)=>logs.push(args),warn:(...args)=>logs.push(args),error:(...args)=>logs.push(args)},setTimeout:later,clearTimeout:cancel,
    localStorage:{getItem:key=>storage.get(key),setItem:(key,val)=>storage.set(key,val)},alert:msg=>alerts.push(msg),confirm:()=>true});
  let authorized=true;
  const firebase={db:{isolated:true},ref:(db,key)=>{assert.equal(db.isolated,true);return key;},
    waitForAuth:async()=>{if(authReady) await authReady();if(!authorized) throw Error('Not authenticated');},
    get:async key=>{if(failRead && (typeof failRead!=='function'||failRead())) throw Error('Network read failed');return {exists:()=>Boolean(records[key.split('/')[1]]),val:()=>structuredClone(records[key.split('/')[1]])};},
    update:async(key,fields)=>{if(failWrite && (typeof failWrite!=='function'||failWrite())) throw Error('Network write failed');if(holdWrite) await holdWrite();writes.push(['update',key,plain(fields)]);Object.assign(records[key.split('/')[1]],plain(fields));},
    push:async(key,item)=>{writes.push(['push',key,plain(item)]);records.fixtureNew=plain(item);},
    remove:async key=>{writes.push(['remove',key]);delete records[key.split('/')[1]];},
    onValue:(key,fn,error)=>{const listener={key,fn,error,active:true};listeners.push(listener);fn({val:()=>key==='.info/connected'?databaseConnected:structuredClone(records)});return ()=>listener.active=false;},goOffline:()=>{transport.push('offline');connect(false);},goOnline:()=>{transport.push('online');if(restartConnects) connect(navigator.onLine);},set:()=>{},child:()=>{},signOutUser:()=>{}};
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
  return {advanceTime,timers,listeners,transport,documentEvents,module,records,writes,alerts,routes,elements,document,window,windowEvents,navigator,storage,ready,flush,logs,allow:()=>authorized=true,deny:()=>authorized=false,emit:()=>listeners.filter(l=>l.active&&l.key==='handleliste').forEach(l=>l.fn({val:()=>structuredClone(records)})),connect};
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
    assert.equal(a.elements.appVersion.textContent, "v8");
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
  assert.match(fs.readFileSync(path.join(root,'docs/js/version.js'),'utf8'),/APP_VERSION = 8;/);
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
  const context=vm.createContext({URL,Request,console,self:{location:{href:base+'sw.js'},clients:{claim:async()=>{},matchAll:async()=>[]},skipWaiting:async()=>{},addEventListener:(name,fn)=>events[name]=fn},
    caches:{open:async()=>cache,keys:async()=>['handleliste-shell-v7','handleliste-shell-v8','another-app'],delete:async key=>deleted.push(key)},
    fetch:async request=>{fetches++;if(offline) throw Error('offline');return {url:request.url,ok:true,installed:false};}});
  vm.runInContext(fs.readFileSync(path.join(root,'docs/sw.js'),'utf8'),context);
  let task;events.install({waitUntil:p=>task=p});await task;
  for(const url of cached.keys()) if(url.startsWith(base)) assert.ok(fs.existsSync(path.join(root,'docs',url.slice(base.length))),url);
  assert.ok(cached.has('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'));
  events.activate({waitUntil:p=>task=p});await task;assert.deepEqual(deleted,['handleliste-shell-v7']);
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
      const source=request.cache==='no-store' ? 'APP_VERSION = 8' : 'APP_VERSION = 2';
      stored.set(request.url,source);
    }
  }};
  const context=vm.createContext({URL,Request,self:{location:{href:base+'sw.js'},skipWaiting:async()=>{},addEventListener:(name,fn)=>events[name]=fn},caches:{open:async()=>cache}});
  vm.runInContext(fs.readFileSync(path.join(root,'docs/sw.js'),'utf8'),context);
  let task;events.install({waitUntil:p=>task=p});await task;
  assert.equal(stored.get(base+'js/version.js'),'APP_VERSION = 8');
  assert.equal(stored.get(base+'js/main.js'),'APP_VERSION = 8');
});

async function updateApp({online=true,update=async()=>{},waiting=null,failRegistration=false}={}) {
  const windowEvents={},documentEvents={},registration={waiting,update},registrations=[],logs=[];
  function addEvent(map,name,fn) { (map[name] ||= []).push(fn); }
  const navigator={onLine:online,serviceWorker:{register:async(url,options)=>{registrations.push([url.href,options]);if(failRegistration){failRegistration=false;throw Error('Registration network failure');}return registration;}}};
  const document={visibilityState:'visible',addEventListener:(name,fn)=>addEvent(documentEvents,name,fn)};
  const context=vm.createContext({URL,navigator,document,console:{warn:(...args)=>logs.push(args)},
    location:{pathname:'/ShoppingList-NoBackend/index.html',replace:()=>assert.fail('Main page must remain available offline')},
    window:{addEventListener:(name,fn)=>addEvent(windowEvents,name,fn)}});
  const module=new vm.SourceTextModule(fs.readFileSync(path.join(root,'docs/js/pwa.js'),'utf8'),{context,initializeImportMeta:meta=>meta.url='https://example.test/ShoppingList-NoBackend/js/pwa.js'});
  await module.link(()=>assert.fail('No external imports'));await module.evaluate();
  const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
  async function emit(map,event){for(const fn of map[event]||[]) fn({persisted:true});await flush();}
  return {navigator,document,registrations,registration,logs,flush,windowEvent:event=>emit(windowEvents,event),documentEvent:event=>emit(documentEvents,event)};
}
test('startup, focus, foreground, history restore and reconnect each check for app updates',async()=>{
  let checks=0;const messages=[];
  const a=await updateApp({update:async()=>checks++,waiting:{postMessage:data=>messages.push(plain(data))}});
  assert.equal(checks,1);assert.equal(a.registrations[0][1].updateViaCache,'none');
  assert.equal(a.registrations[0][0],'https://example.test/ShoppingList-NoBackend/sw.js');
  await a.windowEvent('focus');assert.equal(checks,2);
  a.document.visibilityState='hidden';await a.documentEvent('visibilitychange');assert.equal(checks,2);
  a.document.visibilityState='visible';await a.documentEvent('visibilitychange');assert.equal(checks,3);
  await a.windowEvent('pageshow');assert.equal(checks,4);
  await a.windowEvent('online');assert.equal(checks,5);
  assert.ok(messages.length>=5);assert.deepEqual(messages[0],{type:'SKIP_WAITING'});
});
test('offline and failed update checks preserve the installed app; simultaneous focus events coalesce',async()=>{
  let checks=0;
  const offline=await updateApp({online:false,update:async()=>checks++});await offline.windowEvent('focus');assert.equal(checks,0);
  offline.navigator.onLine=true;await offline.windowEvent('online');assert.equal(checks,1);
  const failed=await updateApp({update:async()=>{throw Error('Network unavailable');}});assert.equal(failed.logs.length,1);
  let resolve,blocking=false;
  const busy=await updateApp({update:async()=>{checks++;if(blocking) await new Promise(r=>resolve=r);}});
  blocking=true;const before=checks;await busy.windowEvent('focus');await busy.windowEvent('focus');await busy.documentEvent('visibilitychange');
  assert.equal(checks,before+1);resolve();await busy.flush();blocking=false;
  await busy.windowEvent('focus');assert.equal(checks,before+2);
});
test('worker upgrades only its app windows without waiting for closure, after full precache',async()=>{
  const events={},order=[],base='https://example.test/ShoppingList-NoBackend/';
  const urls=[base+'index.html',base+'edititem.html?id=one','https://example.test/other-app/index.html','https://other.example/ShoppingList-NoBackend/index.html'];
  const navigated=[];
  const context=vm.createContext({URL,Request,self:{location:{href:base+'sw.js'},
    addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>order.push('activate-request'),
    clients:{claim:async()=>order.push('claim'),matchAll:async()=>urls.map(url=>({url,navigate:target=>{navigated.push(target);return new Promise(()=>{});}}))}},
    caches:{open:async()=>({addAll:async()=>order.push('precache-ready')}),keys:async()=>['handleliste-shell-v4','another-app'],delete:async()=>order.push('cleanup')}});
  vm.runInContext(fs.readFileSync(path.join(root,'docs/sw.js'),'utf8'),context);
  let task;events.install({waitUntil:p=>task=p});await task;
  assert.deepEqual(order,['precache-ready','activate-request']);
  events.activate({waitUntil:p=>task=p});await task;
  assert.deepEqual(navigated,urls.slice(0,2));assert.deepEqual(order,['precache-ready','activate-request','cleanup','claim']);
  events.message({data:{type:'SKIP_WAITING'},waitUntil:p=>task=p});await task;assert.equal(order.at(-1),'activate-request');
});
test('failed precache never activates an incomplete app',async()=>{
  const events={};let activated=false;
  const context=vm.createContext({URL,Request,self:{location:{href:'https://example.test/ShoppingList-NoBackend/sw.js'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>activated=true},
    caches:{open:async()=>({addAll:async()=>{throw Error('Download failed');}})}});
  vm.runInContext(fs.readFileSync(path.join(root,'docs/sw.js'),'utf8'),context);
  let task;events.install({waitUntil:p=>task=p});await assert.rejects(task,/Download failed/);assert.equal(activated,false);
});

test('registration failure at startup retries successfully on next focus',async()=>{
  let checks=0;const a=await updateApp({failRegistration:true,update:async()=>checks++});
  assert.equal(a.registrations.length,1);assert.equal(checks,0);assert.equal(a.logs.length,1);
  await a.windowEvent('focus');assert.equal(a.registrations.length,2);assert.equal(checks,1);
});

test('offline reconnect click gives feedback without a dialog and keeps shopping list usable',async()=>{
  const stored=[['handleliste.offline.v1',JSON.stringify({items:[{id:'one',Name:'Kaffe',Shop:'Extra'}],pending:{}})]];
  const a=await app('main.js',{online:false,stored});await a.ready();
  const button=a.elements.addButton;button.events.click();await a.flush();
  assert.equal(a.alerts.length,0);assert.equal(button.disabled,false);assert.ok(button.classes.has('connection-failed'));
  assert.equal(a.elements.connectionStatus.hidden,false);assert.match(a.elements.connectionStatus.textContent,/Nettleseren melder/);
  button.events.animationend();assert.equal(button.classes.has('connection-failed'),false);
  button.events.click();assert.ok(button.classes.has('connection-failed'));
  a.elements.itemList.children[0].events.pointerup({});await a.flush();assert.ok(a.elements.itemList.children[0].classes.has('is-bought-offline'));
});
test('reconnect succeeds without failure feedback; timeout leaves automatic reconnect working',async()=>{
  const a=await app('main.js',{data:{one:{Name:'Kaffe',Shop:'Extra',Buy:true}}});await a.ready();
  a.connect(false);const button=a.elements.addButton;button.events.click();await a.flush();
  assert.equal(a.alerts.length,0);assert.equal(button.textContent,'Legg til');assert.equal(button.disabled,false);assert.equal(button.classes.has('connection-failed'),false);
  a.connect(false);a.deny();let timeout;
  a.window.setTimeout=(fn,ms)=>{assert.equal(ms,5000);timeout=fn;return 123;};
  button.events.click();assert.equal(button.disabled,true);button.events.click();await a.flush();
  assert.equal(a.alerts.length,0);assert.ok(button.classes.has('connection-failed'));assert.equal(button.disabled,false);
  a.allow();button.events.animationend();
  // A silent server keeps the listener alive; the timeout itself does not cancel it.
  button.events.click();timeout();assert.ok(button.classes.has('connection-failed'));await a.flush();
  a.connect(true);await a.flush();assert.equal(button.textContent,'Legg til');assert.equal(button.classes.has('connection-failed'),false);
});


test('regression: failed pending write never reports a successful reconnect before returning offline',async()=>{
  const state={items:[{id:'coffee',Name:'Kaffe',Shop:'Extra'}],pending:{coffee:{person:'Linh',date:'2026-10-01'}}};
  const a=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],failWrite:true,data:{coffee:{Name:'Kaffe',Buy:true}}});await a.ready();
  const button=a.elements.addButton;button.events.click();await a.flush();
  assert.equal(button.textContent,'Koble til internett');
  assert.ok(button.classes.has('connection-failed'),'The failed write must flash the reconnect button');
  assert.ok(JSON.parse(a.storage.get('handleliste.offline.v1')).pending.coffee);
});

test('manual reconnect restarts a stuck Firebase transport even when Chrome reports online',async()=>{
  const a=await app('main.js',{databaseOnline:false,data:{coffee:{Name:'Kaffe',Buy:true}}});await a.ready();
  a.elements.addButton.events.click();await a.flush();
  assert.deepEqual(a.transport,['offline','online']);
  assert.equal(a.elements.addButton.textContent,'Legg til');
});

test('transient sync failure retries without a new connection event and drains purchases once',async()=>{
  let fail=true;
  const state={items:[{id:'coffee',Name:'Kaffe',Shop:'Extra'}],pending:{coffee:{person:'Linh',date:'2026-10-01'}}};
  const a=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],failWrite:()=>fail,data:{coffee:{Name:'Kaffe',Buy:true,BuyNumber:4}}});await a.ready();
  fail=false;await a.advanceTime(5000);await a.flush();
  assert.equal(a.writes.length,1);assert.equal(a.records.coffee.BuyNumber,5);
  assert.equal(a.elements.addButton.textContent,'Legg til');
  assert.deepEqual(JSON.parse(a.storage.get('handleliste.offline.v1')).pending,{});
});

test('foreground retries stalled connection; background, offline and pagehide cancel retry timers',async()=>{
  const a=await app('main.js',{databaseOnline:false,restartConnects:false});await a.ready();
  a.document.visibilityState='hidden';a.documentEvents.visibilitychange();await a.advanceTime(30000);assert.equal(a.transport.length,0);
  a.document.visibilityState='visible';a.documentEvents.visibilitychange();a.windowEvents.focus();await a.flush();
  assert.deepEqual(a.transport,['offline','online']);
  a.navigator.onLine=false;a.windowEvents.offline();await a.advanceTime(30000);assert.equal(a.transport.length,2);
  a.navigator.onLine=true;a.windowEvents.online();await a.flush();
  a.windowEvents.pagehide();const before=a.transport.length;await a.advanceTime(30000);assert.equal(a.transport.length,before);
});

test('late callbacks from replaced listeners cannot change current connection or cache',async()=>{
  const a=await app('main.js',{data:{coffee:{Name:'Kaffe',Buy:true}}});await a.ready();
  const stale=[...a.listeners];a.connect(false);a.elements.addButton.events.click();await a.flush();
  stale.find(l=>l.key==='.info/connected').fn({val:()=>false});
  stale.find(l=>l.key==='handleliste').fn({val:()=>({stale:{Name:'Old',Buy:true}})});
  stale.find(l=>l.key==='handleliste').error(Error('Late failure'));
  assert.equal(a.elements.addButton.textContent,'Legg til');
  assert.equal(JSON.parse(a.storage.get('handleliste.offline.v1')).items[0].id,'coffee');
});

test('reconnect waits for a pending server write and never starts a duplicate write',async()=>{
  let release;const held=new Promise(resolve=>release=resolve);
  const state={items:[{id:'coffee',Name:'Kaffe',Shop:'Extra'}],pending:{coffee:{person:'Linh',date:'2026-10-01'}}};
  const a=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],holdWrite:()=>held,data:{coffee:{Name:'Kaffe',Buy:true,BuyNumber:4}}});await a.ready();
  assert.equal(a.elements.addButton.textContent,'Koble til internett');
  a.elements.addButton.events.click();await a.flush();
  await a.advanceTime(5000);assert.ok(a.elements.addButton.classes.has('connection-failed'));
  assert.ok(JSON.parse(a.storage.get('handleliste.offline.v1')).pending.coffee);
  release();await a.flush();await a.flush();
  assert.equal(a.writes.length,1);assert.equal(a.records.coffee.BuyNumber,5);
  assert.equal(a.elements.addButton.textContent,'Legg til');
  assert.equal(a.elements.addButton.classes.has('connection-failed'),false);
});


test('failed read preserves the queued purchase and retries after the network recovers',async()=>{
  let fail=true;
  const state={items:[{id:'coffee',Name:'Kaffe',Shop:'Extra'}],pending:{coffee:{person:'Linh',date:'2026-10-01'}}};
  const a=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],failRead:()=>fail,data:{coffee:{Name:'Kaffe',Buy:true,BuyNumber:4}}});await a.ready();
  assert.equal(a.writes.length,0);assert.ok(JSON.parse(a.storage.get('handleliste.offline.v1')).pending.coffee);
  assert.match(a.elements.connectionStatus.textContent,/Lesing av kjøp:.*Network read failed/);
  fail=false;await a.advanceTime(5000);await a.flush();
  assert.equal(a.writes.length,1);assert.equal(a.records.coffee.BuyNumber,5);assert.equal(a.elements.addButton.textContent,'Legg til');
});

test('permission denial clears private cache and stops automatic retry',async()=>{
  const a=await app('main.js',{data:{coffee:{Name:'Kaffe',Buy:true}}});await a.ready();
  const error=Error('Permission denied');error.code='PERMISSION_DENIED';
  a.listeners.find(l=>l.active&&l.key==='handleliste').error(error);
  a.connect(true);await a.advanceTime(30000);a.windowEvents.focus();await a.flush();
  assert.deepEqual(JSON.parse(a.storage.get('handleliste.offline.v1')),{items:[],pending:{}});
  assert.equal(a.transport.length,0);assert.equal(a.elements.addButton.textContent,'Koble til internett');
});

test('silent Firebase times out with feedback and retries with capped backoff',async()=>{
  const a=await app('main.js',{databaseOnline:false,restartConnects:false});await a.ready();
  const button=a.elements.addButton;button.events.click();button.events.click();await a.flush();
  assert.deepEqual(a.transport,['offline','online']);
  await a.advanceTime(5000);assert.ok(button.classes.has('connection-failed'));assert.equal(button.disabled,false);
  assert.match(a.elements.connectionStatus.textContent,/Tilkobling til Firebase: Ingen bekreftelse innen 5 sekunder/);
  const before=a.transport.length;await a.advanceTime(9999);assert.equal(a.transport.length,before);
  await a.advanceTime(1);await a.flush();assert.equal(a.transport.length,before+2);
  for(const delay of [20000,30000,30000]) { const calls=a.transport.length;await a.advanceTime(delay);await a.flush();assert.equal(a.transport.length,calls+2); }
  a.connect(true);await a.flush();assert.equal(button.textContent,'Legg til');
  const recovered=a.transport.length;await a.advanceTime(60000);assert.equal(a.transport.length,recovered);
});


test('rapid offline-online while authentication is loading still recovers automatically',async()=>{
  let release;const held=new Promise(resolve=>release=resolve);
  const a=await app('main.js',{authReady:()=>held,data:{coffee:{Name:'Kaffe',Buy:true}}});await a.ready();
  a.navigator.onLine=false;a.windowEvents.offline();
  a.navigator.onLine=true;a.windowEvents.online();release();await a.flush();
  await a.advanceTime(5000);await a.flush();
  assert.deepEqual(a.transport,['offline','online']);assert.equal(a.elements.addButton.textContent,'Legg til');
});


test('purchase history returned as a Firebase object does not block the entire offline queue',async()=>{
  const state={items:[{id:'one',Name:'Kaffe',Shop:'Extra'},{id:'two',Name:'Te',Shop:'Extra'}],pending:{one:{person:'Linh',date:'2026-10-07'},two:{person:'Linh',date:'2026-10-07'}}};
  const a=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],data:{one:{Name:'Kaffe',Buy:true,BuyNumber:4,BoughtDate:{0:'2026-09-30',8:'2026-09-01'}},two:{Name:'Te',Buy:true,BuyNumber:2,BoughtDate:['2026-09-29']}}});await a.ready();
  assert.equal(a.writes.length,2);
  assert.deepEqual(a.records.one.BoughtDate,['2026-10-07','2026-09-30','2026-09-01']);
  assert.equal(a.records.one.BuyNumber,5);assert.deepEqual(JSON.parse(a.storage.get('handleliste.offline.v1')).pending,{});
  assert.equal(a.elements.addButton.textContent,'Legg til');
});

test('single date, sparse history and legacy numeric count are preserved when purchasing',async()=>{
  for(const [history,expected] of [['2026-09-30',['2026-09-30']],[['2026-09-30',null,'2026-09-01'],['2026-09-30','2026-09-01']],[null,[]]]) {
    const a=await app('main.js',{data:{one:{Name:'Kaffe',Buy:true,BuyNumber:'4',BoughtDate:history}}});await a.ready();
    a.elements.itemList.children[0].events.pointerup({});await a.flush();
    assert.deepEqual(a.records.one.BoughtDate,['2026-10-02',...expected]);assert.equal(a.records.one.BuyNumber,5);
  }
});

test('connection feedback identifies a failed server write and clears after successful sync',async()=>{
  let fail=true;const state={items:[{id:'one',Name:'Kaffe',Shop:'Extra'}],pending:{one:{person:'Linh',date:'2026-10-07'}}};
  const a=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],failWrite:()=>fail,data:{one:{Name:'Kaffe',Buy:true}}});await a.ready();
  assert.equal(a.elements.connectionStatus.hidden,false);assert.match(a.elements.connectionStatus.textContent,/Lagring av kjøp:.*Network write failed/);
  fail=false;await a.advanceTime(5000);await a.flush();assert.equal(a.elements.connectionStatus.hidden,true);assert.equal(a.elements.connectionStatus.textContent,'');
});

test('invalid history or counter reports a data error and retains the purchase',async()=>{
  const state={items:[{id:'one',Name:'Kaffe',Shop:'Extra'}],pending:{one:{person:'Linh',date:'2026-10-07'}}};
  for(const fields of [{BoughtDate:{0:{invalid:true}}},{BuyNumber:'not-a-number'},{BuyNumber:[]},{BuyNumber:false}]) {
    const a=await app('main.js',{stored:[['handleliste.offline.v1',JSON.stringify(state)]],data:{one:{Name:'Kaffe',Buy:true,...fields}}});await a.ready();
    assert.equal(a.writes.length,0);assert.ok(JSON.parse(a.storage.get('handleliste.offline.v1')).pending.one);
    assert.match(a.elements.connectionStatus.textContent,/Klargjøring av kjøp:.*Invalid purchase/);
  }
});

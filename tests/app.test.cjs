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

async function app(entry, { data={}, person, now='2026-10-01T22:30:00Z', search='' }={}) {
  const records=structuredClone(data), writes=[], alerts=[], routes=[], elements={}, documentEvents={}, windowEvents={}, logs=[];
  const storage=new Map(person ? [['person',person]] : []);
  const listeners=[];
  const document={referrer:'https://example.test/markitemtobuy.html', body:new Element(),
    getElementById(id) { if(elements[id]) return elements[id]; for(const e of Object.values(elements)) { const found=e.children.find(c=>c.id===id); if(found) return found; } return elements[id]=new Element(); },
    createElement:()=>new Element(), addEventListener:(name,fn)=>documentEvents[name]=fn};
  const window={location:{search,replace:url=>routes.push(url),origin:'https://example.test'},history:{length:8,back:()=>{throw Error('History back must not be used');}},addEventListener:(name,fn)=>windowEvents[name]=fn,setTimeout};
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const context=vm.createContext({document,window,Date:Clock,Intl,URLSearchParams,URL,console:{log:(...args)=>logs.push(args),warn:(...args)=>logs.push(args),error:(...args)=>logs.push(args)},setTimeout,clearTimeout,
    localStorage:{getItem:key=>storage.get(key),setItem:(key,val)=>storage.set(key,val)},alert:msg=>alerts.push(msg),confirm:()=>true});
  let authorized=true;
  const firebase={db:{isolated:true},ref:(db,key)=>{assert.equal(db.isolated,true);return key;},
    waitForAuth:async()=>{if(!authorized) throw Error('Not authenticated');},
    get:async key=>({exists:()=>Boolean(records[key.split('/')[1]]),val:()=>structuredClone(records[key.split('/')[1]])}),
    update:async(key,fields)=>{writes.push(['update',key,plain(fields)]);Object.assign(records[key.split('/')[1]],plain(fields));},
    push:async(key,item)=>{writes.push(['push',key,plain(item)]);records.fixtureNew=plain(item);},
    remove:async key=>{writes.push(['remove',key]);delete records[key.split('/')[1]];},
    onValue:(key,fn)=>{listeners.push(fn);fn({val:()=>structuredClone(records)});return ()=>{};},set:()=>{},child:()=>{},signOutUser:()=>{}};
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
  return {module,records,writes,alerts,routes,elements,document,window,ready,flush,logs,deny:()=>authorized=false,emit:()=>listeners.forEach(fn=>fn({val:()=>structuredClone(records)}))};
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
  const expected=['additemtodatabase.html','edititem.html','index.html','login.html','markitemtobuy.html','css/style.css',...['additemtodatabase','common','dates','edititem','firebase-init','main','markitemtobuy','version'].map(n=>'js/'+n+'.js')].sort();
  const actual=files(path.join(root,'docs')).map(f=>path.relative(path.join(root,'docs'),f).replaceAll('\\','/')).sort();assert.deepEqual(actual,expected);
  for(const file of files(path.join(root,'docs'))) {
    const text=fs.readFileSync(file,'utf8');
    for(const match of text.matchAll(/(?:src=|href=)["']([^"']+)["']|(?:from\s+)["']([^"']+)["']/g)) {
      const ref=match[1]||match[2];if(!ref.startsWith('http')&&!ref.startsWith('#')) assert.ok(fs.existsSync(path.resolve(path.dirname(file),ref)),ref+' in '+file);
    }
  }
  const source=fs.readFileSync(path.join(root,'docs/js/firebase-init.js'),'utf8');assert.match(source,/ZDq6ZGvDVDafX8BVlWGRhBoSn9X2/);assert.match(source,/fmVOzYiAtsOUNnUE33VZbwHR0SG3/);
  assert.match(fs.readFileSync(path.join(root,'docs/index.html'),'utf8'),/<!-- <button onclick="logout\(\)"/);
  assert.match(fs.readFileSync(path.join(root,'docs/js/version.js'),'utf8'),/APP_VERSION = 1;/);
});

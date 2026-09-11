import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readCSV,writeCSV,validateRows,validateSettings,reparent,groupStates,defaults,defaultTypeColors,rowColor} from '../src/model.js';

const typed=readCSV(await readFile('public/samples/research-agent.csv','utf8'));
test('Typed CSV preserves event rows, explicit parents and bilingual copy on roundtrip',()=>{
  assert.equal(typed.length,12);
  assert.deepEqual(Object.fromEntries(['think','feed','action','instruction'].map(type=>[type,typed.filter(r=>r.type===type).length])),{think:3,feed:5,action:3,instruction:1});
  assert.deepEqual(readCSV(writeCSV(typed)),typed);
  assert.deepEqual(reparent(typed),typed);
  assert.equal(typed[0].parent,'');
  assert.equal(typed[1].parent,typed[0].id);
  assert.ok(typed.every(r=>r.en&&r.zh));
});
test('initial feed and its calls are visible before the first thinking paragraph',()=>{
  assert.equal(groupStates(typed,-1).length,0);
  const groups=groupStates(typed,2.5);
  assert.equal(groups.length,1);
  assert.equal(groups[0].row.type,'feed');
  assert.deepEqual(groups[0].visible.map(r=>r.id),['research-002','research-003']);
  assert.equal(groupStates(typed,3.5)[1].row.type,'think');
});
test('typed scripts validate references and derive parents when the column is absent',()=>{
  assert.throws(()=>validateRows(typed.map((r,i)=>i===1?{...r,parent:'missing'}:r)));
  const rows=readCSV('time,level,en,type\n0,action,Event, FEED \n1,action,Call,action\n2,thinking,Plan,think');
  assert.equal(rows[0].type,'feed');
  assert.equal(rows[1].parent,rows[0].id);
  assert.equal(rows[2].parent,'');
  assert.throws(()=>readCSV('time,level,en,type\n0,action,Event,not a type'));
});
test('editing and reparenting typed events stays scene-local',()=>{
  const twoScenes=[...typed,...typed.map(r=>({...r,id:'b-'+r.id,parent:r.parent?'b-'+r.parent:'',scene:'02'}))];
  assert.deepEqual(reparent(twoScenes),twoScenes);
  assert.doesNotThrow(()=>validateRows(twoScenes));
});
test('colors fall back safely for legacy settings, partial palettes and unknown types',()=>{
  const legacy={...defaults};delete legacy.typeColors;
  assert.doesNotThrow(()=>validateSettings(legacy));
  assert.equal(rowColor(typed[0],legacy),defaultTypeColors.feed);
  assert.equal(rowColor(typed[1],{...defaults,typeColors:{action:'#123456'}}),'#123456');
  assert.equal(rowColor({...typed[1],type:undefined},defaults),'#acb6c4');
  assert.equal(rowColor({...typed[1],type:'diagnostic'},defaults),'#acb6c4');
  const rows=typed.map((r,i)=>i===1?{...r,type:'diagnostic'}:r);
  assert.deepEqual(readCSV(writeCSV(rows)),rows);
  for(const typeColors of [null,[],{feed:'red'},{feed:'#123'},{action:3},{other:'#123456'}])assert.throws(()=>validateSettings({...defaults,typeColors}));
  assert.doesNotThrow(()=>validateSettings({...defaults,typeColors:{feed:'#AABBCC'}}));
});

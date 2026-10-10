import {catVLASource,catVLASettings,catVLAComposition} from './cat-vla.js';
import {crabVLASource,crabVLASettings,crabVLAComposition} from './crab-vla.js';

// Only these fixed, checksum-verified sources can be downloaded by the server.
// The workbench and CLI use the same presets and media preparation API.
export const videoExamples=[{
  id:'cat-vla',
  label:'猫咪完整示例',
  subject:'猫咪',
  buttonId:'loadCatVideo',
  file:'/samples/cat-vla.csv',
  mediaName:'超级无敌大开门 · 萝卜与纸巾.mp4',
  source:catVLASource,
  settings:catVLASettings,
  composition:catVLAComposition,
  fps:30,
},{
  id:'crab-vla',
  label:'螃蟹完整示例',
  subject:'螃蟹',
  buttonId:'loadCrabVideo',
  file:'/samples/crab-vla.csv',
  mediaName:'Arthro · 海滩岸蟹.ogv',
  source:crabVLASource,
  settings:crabVLASettings,
  composition:crabVLAComposition,
  fps:30,
}];

export function getVideoExample(id){
  const example=videoExamples.find(item=>item.id===id);
  if(!example)throw Error('视频示例不存在');
  return example;
}

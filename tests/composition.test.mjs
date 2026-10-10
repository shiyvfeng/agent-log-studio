import test from 'node:test';
import assert from 'node:assert/strict';
import {compositionDefaults,compositionLayout,validateComposition} from '../src/composition.js';
import {catVLAComposition,catVLASettings} from '../src/cat-vla.js';
const media={width:720,height:1280,duration:49.2};
test('cat composition retains its clip, original audio and 25 ordered captions',()=>{
  assert.equal(validateComposition(catVLAComposition,media),catVLAComposition);
  assert.equal(catVLAComposition.sourceEnd,45.6);assert.equal(catVLAComposition.keepAudio,true);assert.equal(catVLAComposition.phases.length,25);
  const {video,log}=compositionLayout(catVLASettings.width,catVLASettings.height,media);
  assert.deepEqual(video,{x:64,y:228,width:432,height:768});assert.deepEqual(log,{x:704,y:228,width:1152,height:768});
});
test('invalid trims, offsets, fit modes and captions are rejected before encoding',()=>{
  for(const changes of [{sourceStart:-1},{sourceStart:46},{sourceEnd:50},{sourceEnd:0},{sourceEnd:NaN},{logOffset:Infinity},{keepAudio:'true'},{fit:'stretch'},{title:'x'.repeat(81)},{phases:[{time:2,title:'b',detail:''},{time:1,title:'a',detail:''}]},{phases:[{time:-1,title:'a',detail:''}]}])assert.throws(()=>validateComposition({...catVLAComposition,...changes},media));
  assert.throws(()=>validateComposition(compositionDefaults,null));
});
test('portrait, square and landscape sources fit without overlapping the logs',()=>{
  for(const [width,height] of [[1920,1080],[1280,720],[1080,1920],[1080,1080],[320,240],[3840,2160]])for(const source of [media,{width:1920,height:1080},{width:1080,height:1080}]){
    const {video,log}=compositionLayout(width,height,source);
    for(const rect of [video,log]){assert.ok(rect.width>0&&rect.height>0);assert.ok(rect.x>=0&&rect.y>=0);assert.ok(rect.x+rect.width<=width&&rect.y+rect.height<=height);}
    assert.ok(log.x>=video.x+video.width||log.y>=video.y+video.height);
  }
});

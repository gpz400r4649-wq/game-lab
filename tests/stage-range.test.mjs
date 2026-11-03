import test from 'node:test';import assert from 'node:assert/strict';
import {paintMoveCells} from '../stage-range3d.js';
import {makeFacingFan,validAttackRange,validMoveRange,MOVE_MAX_CELLS} from '../enemy-range3d.js';
import {fanSettings} from '../fan-controls3d.js';
test('直接ぬる時は高速ドラッグでも途中のマスを埋め、同じマスを重複させない',()=>{const r={space:'world',cells:[]};paintMoveCells(r,{x:0,z:0},{x:40,z:0},false,480);assert.equal(r.cells.length,11);assert.equal(paintMoveCells(r,null,{x:20,z:0},false,480),false);assert.ok(validMoveRange(r));});
test('直接ぬる時は四隅の端も指定でき、マップ外と上限を守る',()=>{const r={space:'world',cells:[]};for(const x of [-480,480])for(const z of [-480,480])paintMoveCells(r,null,{x,z},false,480);assert.equal(r.cells.length,4);assert.ok(validMoveRange(r));assert.equal(paintMoveCells(r,null,{x:481,z:0},false,480),false);r.cells=Array.from({length:MOVE_MAX_CELLS},(_,i)=>[i%32,Math.floor(i/32)]);assert.equal(paintMoveCells(r,null,{x:-400,z:0},false,480),false);});
test('広さ５〜360度・遠さ１〜８の扇形は保存でき、360度なら背後も含む',()=>{for(const angle of [5,45,90,120,180,270,360])for(let radius=1;radius<=8;radius++){const r=makeFacingFan(radius,angle);assert.ok(validAttackRange(r));assert.deepEqual(fanSettings(r),{angle,radius});if(angle===360)assert.ok(r.cells.some(([x,z])=>z===radius));}});
test('マスを個別変更した形は、開くだけでは扇形として上書きしない',()=>{const r=makeFacingFan(3,120);r.cells.push([8,8]);const before=structuredClone(r);assert.equal(fanSettings(r),null);assert.deepEqual(r,before);});

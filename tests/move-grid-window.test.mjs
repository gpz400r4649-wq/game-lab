import test from 'node:test';import assert from 'node:assert/strict';
import {moveGridWindow,moveGridPages,WORLD_SIZES} from '../world3d.js';
test('60mマップは敵の位置に関係なく15×15で四隅まで見える',()=>{
 for(const x of [-7,0,7])for(const z of [-7,0,7]){const w=moveGridWindow(60,x,z);assert.equal(w.count,15);assert.equal(w.minX,-7);assert.equal(w.maxX,7);assert.equal(w.minZ,-7);assert.equal(w.maxZ,7);}assert.deepEqual(moveGridPages(60),[0]);
});
test('すべてのサイズで端の表示区画がマップ外へはみ出さない',()=>{
 for(const size of WORLD_SIZES){const limit=Math.floor(size/8);for(const x of [-999,-limit,0,limit,999])for(const z of [-999,-limit,0,limit,999]){const w=moveGridWindow(size,x,z);assert.ok(w.minX>=-limit&&w.maxX<=limit);assert.ok(w.minZ>=-limit&&w.maxZ<=limit);assert.equal(w.maxX-w.minX+1,w.count);assert.equal(w.maxZ-w.minZ+1,w.count);}}
});
test('区画の選択肢でマップ全域を隙間なく選べる',()=>{
 for(const size of WORLD_SIZES){const pages=moveGridPages(size),seen=new Set(),{limit}=moveGridWindow(size);for(const c of pages){const w=moveGridWindow(size,c,c);assert.equal(w.centerX,c);for(let n=w.minX;n<=w.maxX;n++)seen.add(n);}for(let n=-limit;n<=limit;n++)assert.ok(seen.has(n),`${size}: ${n}`);assert.equal(seen.size,limit*2+1);}
});
test('大きなマップの四隅はそれぞれ最初・最後の区画に含まれる',()=>{
 for(const size of WORLD_SIZES){const pages=moveGridPages(size),{limit}=moveGridWindow(size);for(const x of [pages[0],pages.at(-1)])for(const z of [pages[0],pages.at(-1)]){const w=moveGridWindow(size,x,z),cornerX=x===pages[0]?-limit:limit,cornerZ=z===pages[0]?-limit:limit;assert.ok(cornerX>=w.minX&&cornerX<=w.maxX);assert.ok(cornerZ>=w.minZ&&cornerZ<=w.maxZ);}}
});

test('大きなマップの半分だけ見える端のマスも選択肢に含む',()=>{for(const [size,edge]of [[240,30],[480,60],[960,120]]){const w=moveGridWindow(size,edge,edge);assert.equal(w.maxX,edge);assert.equal(w.maxZ,edge);const first=moveGridWindow(size,-edge,-edge);assert.equal(first.minX,-edge);assert.equal(first.minZ,-edge);}});

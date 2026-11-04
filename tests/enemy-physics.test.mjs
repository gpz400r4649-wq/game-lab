import test from 'node:test';import assert from 'node:assert/strict';
import {part,fresh3D,create3D,step3D} from '../engine3d.js';
import {constructionPart} from '../building3d.js';
const tick=(g,p,n)=>{for(let i=0;i<n;i++)step3D(g,p,{},.02);};
test('待つ敵も足場が消えると落ち、地面で止まる',()=>{const p=fresh3D(),e=part('enemy',0,0),floor=constructionPart('floor',0,0,6);e.y=6.25;e.attackEnabled=false;p.objects=[e,floor];const g=create3D(p),r=g.objects[0];tick(g,p,10);assert.equal(r.y,6.25);g.objects=g.objects.filter(o=>o.id!==floor.id);tick(g,p,100);assert.equal(r.y,0);assert.equal(p.objects[0].y,6.25);});
test('追う敵はスロープを登り、その先の二階の床に乗る',()=>{const p=fresh3D(),e=part('enemy',0,4);e.attackEnabled=false;delete e.moveRange;e.program=[{action:'chase',speed:2}];e.chaseMode='always';p.objects=[e,constructionPart('ramp',0,0),constructionPart('floor',0,-4,3)];p.spawn={x:0,y:3.25,z:-4};const g=create3D(p);tick(g,p,230);assert.ok(g.objects[0].z<-2);assert.equal(g.objects[0].y,3.25);});

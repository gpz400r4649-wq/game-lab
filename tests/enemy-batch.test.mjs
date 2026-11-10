import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part} from '../engine3d.js';
import {copyEnemySettings} from '../enemy-batch3d.js';
test('選んだ項目だけを指定した敵へコピーし、位置・向き・個別のIDを保つ',()=>{
 const p=fresh3D(),a=part('enemy',0,0),b=part('enemy',8,4),c=part('enemy',12,4);p.objects=[a,b,c];
 a.hp=500;a.enemyScale=3;a.w=a.h=a.d=6;a.attackEnabled=false;b.facing=90;
 const source=structuredClone(a),other=structuredClone(c);
 assert.equal(copyEnemySettings(p,a.id,[b.id],['body']),1);
 const target=p.objects[1];assert.equal(target.hp,500);assert.equal(target.x,8);assert.equal(target.z,4);assert.equal(target.facing,90);assert.equal(target.attackEnabled,true);
 assert.deepEqual(p.objects[0],source);assert.deepEqual(p.objects[2],other);
 target.hp=10;assert.equal(a.hp,500);
});
test('エリアとコースを対象の敵の配置に合わせ、設定の配列を共有しない',()=>{
 const p=fresh3D(),a=part('enemy',0,0),b=part('enemy',8,4);p.objects=[a,b];a.moveRange={space:'world',shape:'custom',cells:[[0,0],[1,0]]};a.patrolRoute=[{x:0,z:0},{x:4,z:0}];
 copyEnemySettings(p,a.id,[b.id],['movement']);
 assert.deepEqual(p.objects[1].moveRange.cells,[[2,1],[3,1]]);assert.deepEqual(p.objects[1].patrolRoute,[{x:8,z:4},{x:12,z:4}]);
 p.objects[1].program.push({action:'wait',speed:2});assert.notDeepEqual(p.objects[1].program,a.program);
});
test('コースがマップ外へ出る場合は、全対象への変更をまとめて中止する',()=>{
 const p=fresh3D(),a=part('enemy',0,0),b=part('enemy',4,0),c=part('enemy',24,0);p.objects=[a,b,c];a.patrolRoute=[{x:0,z:0},{x:12,z:0}];
 const before=JSON.stringify(p);assert.throws(()=>copyEnemySettings(p,a.id,[b.id,c.id],['movement']));assert.equal(JSON.stringify(p),before);
});

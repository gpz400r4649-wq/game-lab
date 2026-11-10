import test from 'node:test';
import assert from 'node:assert/strict';
import {part,fresh3D,validate3D,create3D} from '../engine3d.js';
import {initializeCharacterDefaults,synchronizeCharacterDefaults,inheritNewCharacter,useCharacterDefaults} from '../character-defaults3d.js';

for(const type of ['enemy','ally'])test(type+'は基本設定を参照し、個別の体力だけを上書きできる',()=>{
 const p=fresh3D();p.objects=[part(type,0,0),part(type,8,0)];initializeCharacterDefaults(p,part);
 const [a,b]=p.objects;p.characterDefaults[type].hp=10;synchronizeCharacterDefaults(p);assert.equal(a.hp,10);assert.equal(b.hp,10);
 useCharacterDefaults(p,a,['hp'],false);a.hp=20;synchronizeCharacterDefaults(p);
 p.characterDefaults[type].hp=12;synchronizeCharacterDefaults(p);assert.equal(a.hp,20);assert.equal(b.hp,12);
 const next=inheritNewCharacter(p,part(type,12,0));assert.equal(next.hp,12);p.objects.push(next);
 const saved=validate3D(JSON.parse(JSON.stringify(p)));saved.characterDefaults[type].hp=15;synchronizeCharacterDefaults(saved);
 assert.equal(saved.objects[0].hp,20);assert.equal(saved.objects[1].hp,15);assert.equal(saved.objects[2].hp,15);
 useCharacterDefaults(saved,saved.objects[0],['hp'],true);assert.equal(saved.objects[0].hp,15);
});
test('旧作品の独自の体力と速度を引き継ぎ、体力を変えても位置と向きを保つ',()=>{
 const p=fresh3D(),a=part('enemy',8,4);a.hp=100;a.facing=90;a.program=[{action:'patrol',speed:4}];p.objects=[a];
 initializeCharacterDefaults(p,part);p.characterDefaults.enemy.hp=10;p.characterDefaults.enemy.movementSpeed=3;synchronizeCharacterDefaults(p);
 assert.equal(a.hp,100);assert.equal(a.movementSpeed,undefined);assert.equal(a.program[0].speed,4);assert.deepEqual([a.x,a.z,a.facing],[8,4,90]);
 const g=create3D(p);g.objects[0].hp=1;assert.equal(a.hp,100);
});
test('基本設定の不正な体力や個別指定を読み込まない',()=>{
 const p=fresh3D();p.objects=[part('enemy')];initializeCharacterDefaults(p,part);
 p.characterDefaults.enemy.hp=501;assert.throws(()=>validate3D(p));p.characterDefaults.enemy.hp=3;
 p.objects[0].characterOverrides=['x'];assert.throws(()=>validate3D(p));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,create3D,step3D,validate3D} from '../engine3d.js';
function scene(attack='auto'){
 const p=fresh3D();p.spawn={x:0,y:0,z:0};
 const a=part('ally',0,-2),e=part('enemy',0,-7);
 a.allyAttack=attack;a.allyGun=p.loadout[0].id;e.attackEnabled=false;p.objects=[a,e];
 const g=create3D(validate3D(p));
 const tick=(n,input={})=>{for(let i=0;i<n;i++)step3D(g,p,input,.02);};
 return {a:g.allies[0],e:g.objects[1],g,tick};
}
test('誘った味方は敵を撃ち、待機命令で追従をやめる',()=>{
 const {a,e,g,tick}=scene();tick(20);assert.equal(e.hp,3);
 tick(1,{allyCommand:a.id,yaw:0});assert.ok(a.following);tick(80);assert.ok(e.hp<3);
 g.player.x=0;g.player.z=a.z+2;tick(1,{allyCommand:a.id,yaw:0});assert.equal(a.following,false);
 const start=a.z;g.player.z=8;tick(50);assert.equal(a.z,start);
});
test('援護設定は合図を待ち、追従中にプレイヤーの足跡をたどる',()=>{
 const {a,e,g,tick}=scene('assist');tick(1,{allyCommand:a.id,yaw:0});
 for(let i=0;i<100;i++){g.player.x+=.07;tick(1);}
 assert.ok(a.x>2);assert.equal(e.hp,3);
 g.playerTarget=e.id;g.playerTargetUntil=g.time+3;tick(80);assert.ok(e.hp<3);
});

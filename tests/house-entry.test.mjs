import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,create3D,step3D} from '../engine3d.js';
import {constructionPart} from '../building3d.js';
function house(rotation=0,reverse=false,ceilingType='roof',height=3){
 const a=rotation*Math.PI/180,s=Math.sin(a),c=Math.cos(a),p=fresh3D();p.spawn={x:s*6,y:0,z:c*6};
 const wall=(x,z,angle)=>constructionPart('wall',x*c+z*s,-x*s+z*c,0,(angle+rotation)%180);
 p.objects=[constructionPart('floor'),wall(-2,0,90),wall(2,0,90),wall(0,-2,0),constructionPart(ceilingType,0,0,height,rotation%180)];
 if(reverse)p.objects.reverse();return {p,a,s,c};
}
const tick=(g,p,input,n)=>{for(let i=0;i<n;i++)step3D(g,p,input,.02);};
test('床・１階の壁・屋根の家に、開いた入口から４方向とも歩いて入れる',()=>{
 for(const reverse of [false,true])for(const rotation of [0,90,180,270]){
  const {p,a}=house(rotation,reverse),g=create3D(p);tick(g,p,{z:-1,yaw:a},60);
  assert.ok(Math.hypot(g.player.x,g.player.z)<.05,`rotation ${rotation}: ${JSON.stringify(g.player)}`);assert.equal(g.player.y,.25);assert.ok(g.player.grounded);
 }
});
test('２階の床を天井として置いても、下の空間を歩ける',()=>{
 const {p}=house(0,false,'floor'),g=create3D(p);tick(g,p,{z:-1},60);assert.ok(Math.abs(g.player.z)<.05);assert.equal(g.player.y,.25);
});
test('家に入れても奥の壁はすり抜けない',()=>{
 const {p}=house(),g=create3D(p);tick(g,p,{z:-1},120);assert.ok(g.player.z>=-1.525-.0001&&g.player.z<-1.4);assert.equal(g.player.y,.25);
});
test('家から出ると床の上から地面へ自然に戻る',()=>{
 const {p}=house(),g=create3D(p);tick(g,p,{z:-1},60);assert.equal(g.player.y,.25);tick(g,p,{z:1},60);assert.ok(Math.abs(g.player.z-6)<.05);assert.equal(g.player.y,0);assert.ok(g.player.grounded);
});
test('屋根の下でジャンプすると天井に当たり、屋根をすり抜けない',()=>{
 const {p}=house(),g=create3D(p);Object.assign(g.player,{x:0,y:.25,z:0,grounded:true,supportId:p.objects[0].id});
 for(let i=0;i<120;i++){step3D(g,p,{jump:true},.02);assert.ok(g.player.y+1.7<=3.021);}
});
test('頭が入らない低い天井の下へ床の段差で押し込まない',()=>{
 for(const reverse of [false,true]){const {p}=house(0,reverse,'floor',1.8),g=create3D(p);tick(g,p,{z:-1},60);assert.ok(g.player.z>=2.35-.0001,JSON.stringify(g.player));assert.equal(g.player.y,0);}
});

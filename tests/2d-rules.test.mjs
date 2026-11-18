import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,freshProject,goalReady,makeObject,stepGame,validateProject} from '../engine.js';

function tick(game,project,count,input={}){
 for(let step=0;step<count;step++)stepGame(game,project,input,.04);
}

test('星の数によって弾・移動・回復を一度ずつ変え、再プレイで元に戻る',()=>{
 const project=freshProject(),start=project.objects[0];
 project.upgrades=[{stars:1,effect:'spread'},{stars:1,effect:'damage'},{stars:1,effect:'interval'},{stars:1,effect:'heal'},{stars:2,effect:'speed'}];
 project.objects.push(makeObject('star',start.x,start.y),makeObject('star',start.x+100,start.y));
 const original=JSON.stringify(project),game=createGame(validateProject(project));game.player.hp=2;
 tick(game,project,1,{fire:true});
 assert.equal(game.stars,1);assert.equal(game.player.hp,4);assert.equal(game.player.speed,230);
 assert.equal(game.bullets.length,3);assert.equal(game.bullets[0].damage,2);assert.equal(game.weapon.interval,.24);
 tick(game,project,5);assert.equal(game.stars,1);assert.equal(game.player.hp,4);assert.equal(game.weapon.spread,3);
 tick(game,project,11,{x:1});assert.equal(game.stars,2);assert.equal(game.player.speed,265);
 assert.equal(JSON.stringify(project),original);const retry=createGame(project);assert.equal(retry.stars,0);assert.deepEqual(retry.weapon,project.weapon);
});

test('出現時間・回数・元の敵の体力と動きを保ち、次の敵が来る間はゴールを閉じる',()=>{
 const p=freshProject(),enemy=makeObject('enemy',1000,800),spawner=makeObject('spawner',1200,800),goal=makeObject('goal',440,800);
 enemy.hp=12;enemy.program=[{action:'patrol',value:80}];
 Object.assign(spawner.spawn,{delay:1,count:2,waves:2,interval:2,enemy:'part:'+enemy.id});
 p.objects.push(enemy,spawner,goal);const g=createGame(validateProject(p));
 g.objects.find(o=>o.id===enemy.id).hp=0;
 tick(g,p,12);assert.equal(g.objects.filter(o=>o.type==='enemy').length,0);assert.equal(goalReady(g,goal),false);
 tick(g,p,15);let spawned=g.objects.filter(o=>o.spawned);assert.equal(spawned.length,2);
 for(const e of spawned){assert.equal(e.hp,12);assert.deepEqual(e.program,enemy.program);e.hp=0;}
 tick(g,p,25);assert.equal(goalReady(g,goal),false);
 tick(g,p,30);spawned=g.objects.filter(o=>o.spawned);assert.equal(spawned.length,2);
 for(const e of spawned)e.hp=0;
 tick(g,p,1);assert.equal(g.state,'won');
});

test('倒した敵の星をひろって、星だけが条件のゴールをひらける',()=>{
 const p=freshProject(),start=p.objects[0],enemy=makeObject('enemy',start.x+100,start.y),other=makeObject('enemy',900,900),goal=makeObject('goal',start.x+100,start.y);
 enemy.hp=1;enemy.program=[];enemy.dropStar=true;other.program=[];goal.goal={rule:'stars',stars:1};
 p.objects.push(enemy,other,goal);const g=createGame(validateProject(p));
 tick(g,p,8,{fire:true});assert.equal(g.objects.filter(o=>o.type==='star').length,1);assert.equal(goalReady(g,goal),false);
 tick(g,p,10,{x:1});assert.equal(g.stars,1);assert.equal(g.state,'won');assert.ok(g.objects.some(o=>o.type==='enemy'));
});

test('敵は初期状態で星を落とし、全体設定と個別設定は出現する敵にも反映される',()=>{
 const p=freshProject(),start=p.objects[0];
 const regular=makeObject('enemy',start.x+110,start.y),custom=makeObject('enemy',1000,800),spawn=makeObject('spawner',1200,800);
 p.objects.push(regular,custom,spawn);
 const initial=createGame(p);
 assert.equal(initial.objects.find(o=>o.id===regular.id).dropStar,true);
 Object.assign(custom,{hp:9,program:[{action:'flee',value:95}],dropStar:false});
 p.enemyDefaults={hp:7,program:[{action:'patrol',value:80}],dropStar:false};
 Object.assign(spawn.spawn,{delay:0,count:1});
 const saved=validateProject(JSON.parse(JSON.stringify(p))),game=createGame(saved);
 const shared=game.objects.find(o=>o.id===regular.id),individual=game.objects.find(o=>o.id===custom.id);
 assert.equal(shared.hp,7);assert.deepEqual(shared.program,p.enemyDefaults.program);assert.equal(shared.dropStar,false);
 assert.equal(individual.hp,9);assert.deepEqual(individual.program,custom.program);assert.equal(individual.dropStar,false);
 tick(game,p,1);const fromSpawner=game.objects.find(o=>o.spawned);
 assert.equal(fromSpawner.hp,7);assert.deepEqual(fromSpawner.program,p.enemyDefaults.program);assert.equal(fromSpawner.dropStar,false);
 const legacy=makeObject('enemy',start.x+110,start.y);legacy.hp=1;legacy.program=[];
 const original=freshProject();original.objects.push(legacy);
 const legacyGame=createGame(original);tick(legacyGame,original,10,{fire:true});
 assert.ok(legacyGame.objects.some(o=>o.type==='star'));
});

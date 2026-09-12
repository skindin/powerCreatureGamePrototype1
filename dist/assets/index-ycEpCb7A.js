var $t=Object.defineProperty;var Dt=(H,t,i)=>t in H?$t(H,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):H[t]=i;var r=(H,t,i)=>Dt(H,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const l of e)if(l.type==="childList")for(const o of l.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function i(e){const l={};return e.integrity&&(l.integrity=e.integrity),e.referrerPolicy&&(l.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?l.credentials="include":e.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(e){if(e.ep)return;e.ep=!0;const l=i(e);fetch(e.href,l)}})();class ft{constructor(t={}){r(this,"z");r(this,"hasVerticalVelocity");r(this,"verticalVelocity");r(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const St=class St{constructor(t=20,i=14,s=1){r(this,"width");r(this,"height");r(this,"tileSize");r(this,"cols");r(this,"rows");r(this,"wallHeight");r(this,"gravity");r(this,"frictionCoeff");r(this,"staticFrictionThreshold");r(this,"tileGrid");r(this,"walls",[]);r(this,"currentPresetId","trenches");this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("trenches")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,i,s){if(t<0||t>=this.cols||i<0||i>=this.rows)return!1;const e=s?1:0;return this.tileGrid[i][t]===e?!1:(this.tileGrid[i][t]=e,this.rebuildWalls(),!0)}hasWall(t,i){return t<0||t>=this.cols||i<0||i>=this.rows?!1:this.tileGrid[i][t]===1}loadWallPreset(t,i){const s=St.WALL_PRESETS.find(e=>e.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(i),!0):!1}syncEntitiesWithWalls(t){var i;if(t)for(const s of t){const e=s.hasCollider?s.colliderRadius:((i=s.colliderModule)==null?void 0:i.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,e);if(l)s.position.z<l.wallHeight?(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new ft({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.standingWall=l,s.verticalVelocity=0):(s.standingWall=l,s.supportingSurfaceHeight=l.wallHeight);else if((s.supportingSurfaceHeight>=this.wallHeight-.05||s.standingWall!==null)&&(s.standingWall=null,s.supportingSurfaceHeight=0,s.isCharacter)){const o=s;o.climbingModule&&(o.climbingModule.isDismountFreefall=!0,o.climbingModule.climbSuppressedUntilRelease=!0)}}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("trenches",t)}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),o=Math.max(e.y,Math.min(i,e.y+e.height)),n=t-l,a=i-o;return n*n+a*a<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}areWallsContiguous(t,i){if(t.id===i.id)return!0;const s=Math.max(0,Math.max(t.x,i.x)-Math.min(t.x+t.width,i.x+i.width)),e=Math.max(0,Math.max(t.y,i.y)-Math.min(t.y+t.height,i.y+i.height)),l=Math.min(t.x+t.width,i.x+i.width)-Math.max(t.x,i.x),o=Math.min(t.y+t.height,i.y+i.height)-Math.max(t.y,i.y);return s<.001&&o>.05||e<.001&&l>.05}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}};r(St,"WALL_PRESETS",[{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>1));for(let e=2;e<=17;e++)s[3][e]=0,s[7][e]=0,s[10][e]=0;for(let e=2;e<=11;e++)s[e][5]=0,s[e][10]=0,s[e][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let e=5;e<=9;e++)s[e][2]=0;for(let e=5;e<=9;e++)s[e][17]=0;for(let e=2;e<=5;e++)s[5][e]=0;for(let e=10;e<=14;e++)s[5][e]=0;for(let e=5;e<=10;e++)s[9][e]=0;for(let e=14;e<=17;e++)s[9][e]=0;return s[7][5]=0,s}},{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=10;for(let l=1;l<=4;l++)s[l][e]=1;for(let l=8;l<=12;l++)s[l][e]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=2;e<=4;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=9;e<=11;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=6;e<=7;e++)for(let l=9;l<=10;l++)s[e][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,o]of e)s[o][l]=1,s[o+1][l]=1,s[o][l+1]=1,s[o+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=1;e<=9;e++)s[e][4]=1;for(let e=4;e<=12;e++)s[e][7]=1;for(let e=1;e<=9;e++)s[e][10]=1;for(let e=4;e<=12;e++)s[e][13]=1;for(let e=1;e<=9;e++)s[e][16]=1;for(let e=7;e<=10;e++)s[4][e]=1;for(let e=13;e<=16;e++)s[4][e]=1;for(let e=4;e<=7;e++)s[9][e]=1;for(let e=10;e<=13;e++)s[9][e]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,i)=>Array.from({length:i},()=>Array.from({length:t},()=>0))}]);let Q=St;class dt{constructor(t={}){r(this,"radius");r(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class ht{constructor(t={}){r(this,"mass");r(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class ut{constructor(t={}){r(this,"staticFrictionMod");r(this,"dynamicFrictionMod");r(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class yt{constructor(t={}){r(this,"bounceMod");r(this,"verticalBounce");r(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class mt{constructor(t={}){r(this,"enabled");this.enabled=t.enabled??!0}}class it{constructor(t={}){r(this,"id");r(this,"name");r(this,"position");r(this,"velocity");r(this,"color");r(this,"isHeld");r(this,"heldBy");r(this,"lastThrower",null);r(this,"isCharacter",!1);r(this,"isClimbing",!1);r(this,"visualShape","circle");r(this,"colliderModule",null);r(this,"massModule",null);r(this,"frictionModule",null);r(this,"bounceModule",null);r(this,"verticalPositionModule",null);r(this,"gravityModule",null);r(this,"rollModule",null);r(this,"supportingSurfaceHeight",0);r(this,"standingWall",null);var i,s,e,l,o;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((o=t.velocity)==null?void 0:o.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new dt({radius:t.colliderRadius}):new dt({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new ht({mass:t.mass}):new ht({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new ut({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new yt({bounceMod:t.bounceMod}):new yt({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new ft({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new mt,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new dt({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new ht({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new ut({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new ut({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new yt({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.85||this.supportingSurfaceHeight>=.85||this.standingWall!==null)}updatePosition(t,i){var b,V,v,g,f,w,k,R,T,O,z,A;if(this.isHeld)return;if(this.lastThrower){const $=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,y=(((b=this.lastThrower.pickupModule)==null?void 0:b.pickupReach)??1.3)+this.colliderRadius+$;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>y||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0;if(this.hasCollider&&this.hasVerticalPosition&&i.walls.length>0)if(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05&&this.position.z>=i.wallHeight-.2||this.standingWall!==null){const y=this.isCharacter?this:null;if(!!((V=y==null?void 0:y.climbingModule)!=null&&V.isDismountFreefall||(v=y==null?void 0:y.climbingModule)!=null&&v.climbSuppressedUntilRePress))this.standingWall=null,s=0;else if(this.isCharacter){if(this.standingWall){const S=i.walls.find(P=>P.id===this.standingWall.id),E=this.colliderRadius;if((S?i.testWallOverlap(this.position.x,this.position.y,E,S):!1)&&S)this.standingWall=S,s=S.wallHeight;else if(S&&((g=y==null?void 0:y.climbingModule)!=null&&g.dismountSuppressedUntilRelease))this.standingWall=S,s=S.wallHeight;else{let P=null;if(S){for(const W of i.walls)if(i.areWallsContiguous(S,W)&&i.testWallOverlap(this.position.x,this.position.y,E,W)){P=W;break}}else P=i.getSupportingWall(this.position.x,this.position.y,E);P?(this.standingWall=P,s=P.wallHeight):(this.standingWall=null,s=0,y!=null&&y.climbingModule&&(y.climbingModule.isDismountFreefall=!0,y.climbingModule.climbSuppressedUntilRelease=!0))}}else if(!this.isClimbing&&(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05)){const S=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);S&&(this.standingWall=S,s=S.wallHeight)}}else{const S=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);S?(this.standingWall=S,s=S.wallHeight):(this.standingWall=null,s=0)}}else this.standingWall=null;else this.standingWall=null,s=0;if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const $=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const y=this.rollModule,x=this.colliderRadius>0?this.colliderRadius:.3,S=.4,E=this.bounceMod,L=(1+E)*this.mass*$,P=i.frictionCoeff*this.dynamicGroundFrictionMod*.05,W=this.velocity.x-y.angularVelocity.y*x,B=this.velocity.y+y.angularVelocity.x*x,D=Math.hypot(W,B);if(D>.001&&P>0){const C=P*L,q=D*this.mass/(1+1/S),j=Math.min(q,C),I=W/D*j,U=B/D*j;this.velocity.x-=I/this.mass,this.velocity.y-=U/this.mass,y.angularVelocity.y+=I/(S*this.mass*x),y.angularVelocity.x-=U/(S*this.mass*x)}const F=Math.max(.65,1-(1-E)*.35);y.angularVelocity.x*=F,y.angularVelocity.y*=F,y.angularVelocity.z*=F}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((f=this.walkingModule)==null?void 0:f.enabled)))if(this.rollModule&&this.rollModule.enabled){const y=this.rollModule,x=this.colliderRadius>0?this.colliderRadius:.3,S=i.frictionCoeff*this.dynamicGroundFrictionMod,E=.4,L=this.velocity.x-y.angularVelocity.y*x,P=this.velocity.y+y.angularVelocity.x*x,W=Math.hypot(L,P);if(S>0&&W>.001){const D=S*(1+1/E)*t;if(W<=D){const F=this.velocity.x+E*y.angularVelocity.y*x,C=this.velocity.y-E*y.angularVelocity.x*x,q=F/(1+E),j=C/(1+E);this.velocity.x=q,this.velocity.y=j,y.angularVelocity.y=q/x,y.angularVelocity.x=-j/x}else{const F=L/W*S*t,C=P/W*S*t;this.velocity.x-=F,this.velocity.y-=C,y.angularVelocity.y+=F/(E*x),y.angularVelocity.x-=C/(E*x)}}const B=Math.hypot(this.velocity.x,this.velocity.y);if(B>0){if(y.rollResistance>0){const D=y.rollResistance*t,F=Math.max(0,B-D);if(F<.005)this.velocity.x=0,this.velocity.y=0,y.angularVelocity.x=0,y.angularVelocity.y=0;else{const C=F/B;this.velocity.x*=C,this.velocity.y*=C,y.angularVelocity.x*=C,y.angularVelocity.y*=C}}}else{const D=Math.hypot(y.angularVelocity.x,y.angularVelocity.y);if(D>0&&S>0){const F=S/(E*x)*t,C=Math.max(0,D-F),q=D>0?C/D:0;y.angularVelocity.x*=q,y.angularVelocity.y*=q}}if(Math.abs(y.angularVelocity.z)>.001&&y.rollResistance>0){const D=y.rollResistance/(E*x)*t,F=Math.sign(y.angularVelocity.z),C=Math.abs(y.angularVelocity.z);y.angularVelocity.z=C<=D?0:F*(C-D)}y.updateVisualPhase(t)}else{const y=Math.hypot(this.velocity.x,this.velocity.y);if(y>0){const x=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(y<x)this.velocity.x=0,this.velocity.y=0;else{const S=i.frictionCoeff*this.dynamicGroundFrictionMod*t,L=Math.max(0,y-S)/y;this.velocity.x*=L,this.velocity.y*=L}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);const l=this.isCharacter?this:null,o=l==null?void 0:l.climbingModule,n=!this.isClimbing&&this.supportingSurfaceHeight>=i.wallHeight-.05&&this.standingWall!==null,a=Math.max(.01,(o==null?void 0:o.hangDistance)??.1);if(o)if(this.position.z<=.01)o.isAssistClampArmed=!1,o.hasLeftClampZoneSinceDismount=!0;else if(n&&this.standingWall){const $=this.standingWall,y=[$];for(const E of i.walls)E.id!==$.id&&i.areWallsContiguous($,E)&&y.push(E);let x=1/0;for(const E of y){const L=Math.max(E.x,Math.min(this.position.x,E.x+E.width)),P=Math.max(E.y,Math.min(this.position.y,E.y+E.height)),W=Math.hypot(this.position.x-L,this.position.y-P);W<x&&(x=W)}x<=a+.001?o.hasLeftClampZoneSinceDismount&&(o.isAssistClampArmed=!0):(o.hasLeftClampZoneSinceDismount=!0,o.isAssistClampArmed=!1)}else o.isAssistClampArmed=!1;const d=!!(l&&n&&(o!=null&&o.enabled)&&(o!=null&&o.preventWalkOff)&&(o!=null&&o.isAssistClampArmed)),c=this.velocity.x*t,h=this.velocity.y*t,m=Math.hypot(c,h);if(m>1e-4)if(d){const $=Math.max(.01,((w=l==null?void 0:l.climbingModule)==null?void 0:w.hangDistance)??.1);let y=this.standingWall??i.getSupportingWall(this.position.x,this.position.y,$);this.standingWall=y;const x=this.position.x+c,S=this.position.y+h,E=[];if(y){E.push(y);for(const P of i.walls)P.id!==y.id&&i.areWallsContiguous(y,P)&&E.push(P)}let L=null;for(const P of E)if(i.testWallOverlap(x,S,$,P)){L=P;break}if(L)this.position.x=x,this.position.y=S,this.standingWall=L;else if(E.length>0){let P=1/0,W=null;for(const B of E){const D=Math.max(B.x,Math.min(x,B.x+B.width)),F=Math.max(B.y,Math.min(S,B.y+B.height)),C=x-D,q=S-F,j=C*C+q*q;j<P&&(P=j,W={wall:B,closestX:D,closestY:F,dist:Math.sqrt(j),dx:C,dy:q})}if(W&&W.dist>0){const B=W.dx/W.dist,D=W.dy/W.dist,F=this.velocity.x*B+this.velocity.y*D,C=(l==null?void 0:l.movementInput)??{x:0,y:0},q=C.x*B+C.y*D;if((F>.001||q>.05)&&(l!=null&&l.isClimbInputHeld)&&!(o!=null&&o.dismountSuppressedUntilRelease))o&&(o.isAssistClampArmed=!1,o.hasLeftClampZoneSinceDismount=!1),this.position.x=x,this.position.y=S;else{F>0&&(this.velocity.x-=F*B,this.velocity.y-=F*D);const I=$-.002;W.dist>I?(this.position.x=W.closestX+B*I,this.position.y=W.closestY+D*I):(this.position.x=x,this.position.y=S);const U=i.testWallOverlap(this.position.x,this.position.y,$,W.wall)?W.wall:E.find(u=>i.testWallOverlap(this.position.x,this.position.y,$,u));U&&(this.standingWall=U)}}else this.velocity.x=0,this.velocity.y=0}}else{const y=Math.max(1,Math.ceil(m/.01)),x=c/y,S=h/y;let E=this.standingWall??(n?i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null),L=!1;for(let P=1;P<=y;P++){const W=this.position.x+x,B=this.position.y+S;if(E){let F=null;if(i.testWallOverlap(W,B,this.colliderRadius,E))F=E;else for(const C of i.walls)if(i.areWallsContiguous(E,C)&&i.testWallOverlap(W,B,this.colliderRadius,C)){F=C;break}F?(E=F,this.standingWall=F):(k=l==null?void 0:l.climbingModule)!=null&&k.dismountSuppressedUntilRelease||(L=!0,E=null,this.standingWall=null,this.supportingSurfaceHeight=0,l!=null&&l.climbingModule&&(l.climbingModule.isDismountFreefall=!0,l.climbingModule.climbSuppressedUntilRelease=!0))}if(this.position.x=W,this.position.y=B,!this.isClimbing&&(L||!this.standingWall&&!!((R=l==null?void 0:l.climbingModule)!=null&&R.isDismountFreefall||(T=l==null?void 0:l.climbingModule)!=null&&T.climbSuppressedUntilRePress))&&this.hasCollider)for(const F of i.walls)this.position.z<=F.wallHeight&&this.resolveWallCollision(F)}}if(this.hasCollider){const $=this.colliderRadius,y=$,x=i.width-$,S=$,E=i.height-$,L=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<y?(this.position.x=y,this.resolveWallImpact(1,0,L)):this.position.x>x&&(this.position.x=x,this.resolveWallImpact(-1,0,L)),this.position.y<S?(this.position.y=S,this.resolveWallImpact(0,1,L)):this.position.y>E&&(this.position.y=E,this.resolveWallImpact(0,-1,L));const P=!!((O=l==null?void 0:l.climbingModule)!=null&&O.isDismountFreefall||(z=l==null?void 0:l.climbingModule)!=null&&z.climbSuppressedUntilRePress);for(const W of i.walls)if(this.position.z<=W.wallHeight){if(this.position.z>=W.wallHeight-.05&&!P&&(((A=this.standingWall)==null?void 0:A.id)===W.id||i.testWallOverlap(this.position.x,this.position.y,this.colliderRadius,W)))continue;if(this.position.z<W.wallHeight-.05||P||this.standingWall===null){if(this.standingWall&&(this.standingWall.id===W.id||i.areWallsContiguous(this.standingWall,W)))continue;this.resolveWallCollision(W)}}}const p=16,M=Math.hypot(this.velocity.x,this.velocity.y);if(M>p){const $=p/M;this.velocity.x*=$,this.velocity.y*=$}if(this.rollModule&&this.rollModule.enabled){const y=this.rollModule.angularSpeed;if(y>35){const x=35/y;this.rollModule.angularVelocity.x*=x,this.rollModule.angularVelocity.y*=x,this.rollModule.angularVelocity.z*=x}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}static getClosestWallPoint(t,i,s){if(!s.walls||s.walls.length===0)return null;let e=1/0,l=null;for(const o of s.walls){const n=Math.max(o.x,Math.min(t,o.x+o.width)),a=Math.max(o.y,Math.min(i,o.y+o.height)),d=t-n,c=i-a,h=d*d+c*c;h<e&&(e=h,l={wall:o,closestX:n,closestY:a,dist:Math.sqrt(h),dx:d,dy:c})}return l}resolveWallImpact(t,i,s){this.lastThrower=null;const e=this.velocity.x*t+this.velocity.y*i;if(e>=0)return;const l=e;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*i):(this.velocity.x-=l*t,this.velocity.y-=l*i),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const o=this.rollModule,n=this.colliderRadius>0?this.colliderRadius:.3,a=.4,d=.35,c=-i,h=t,m=this.velocity.x*c+this.velocity.y*h,p=-(1+s)*this.mass*l,M=m-o.angularVelocity.z*n,b=Math.abs(M)*this.mass/(1+1/a),V=d*p,v=Math.min(b,V),g=-Math.sign(M)*v,f=m,w=f+g/this.mass,k=Math.abs(w)<=Math.abs(f)+.01?w-f:-f*.1;this.velocity.x+=k*c,this.velocity.y+=k*h;const T=-(k*this.mass)/(a*this.mass*n);o.angularVelocity.z+=T,o.angularVelocity.z=Math.max(-30,Math.min(30,o.angularVelocity.z)),o.angularVelocity.y=this.velocity.x/n,o.angularVelocity.x=-this.velocity.y/n}}resolveWallCollision(t){if(!this.hasCollider)return;const i=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),e=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,o=this.position.y-e,n=l*l+o*o;if(n<i*i){this.lastThrower=null;const a=Math.sqrt(n);let d=0,c=0,h=0;if(a===0){const p=Math.abs(this.position.x-t.x),M=Math.abs(t.x+t.width-this.position.x),b=Math.abs(this.position.y-t.y),V=Math.abs(t.y+t.height-this.position.y),v=Math.min(p,M,b,V);v===p?(d=-1,h=p+i):v===M?(d=1,h=M+i):v===b?(c=-1,h=b+i):(c=1,h=V+i)}else h=i-a,d=l/a,c=o/a;this.position.x+=d*h,this.position.y+=c*h;const m=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(d,c,m)}}}class Rt{constructor(){r(this,"id","walking");r(this,"name","Walking Module");r(this,"enabled",!0);r(this,"maxWalkForce",35);r(this,"maxWalkSpeed",5.2);r(this,"dragDamping",8.01)}update(t,i,s,e){var O;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((O=t.frictionModule)!=null&&O.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(i.x,i.y),o=l>.05;if(t.isActivelyWalking=o,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const d=e.frictionCoeff/10,c=a*d,m=t.carriedMass/(Math.max(.1,t.strength)*8),p=this.maxWalkSpeed/(1+m);let M=0,b=0;if(o){const z=i.x/l,A=i.y/l;M=z*p,b=A*p}const V=M-t.velocity.x,v=b-t.velocity.y,g=Math.hypot(V,v);if(g<.001){t.velocity.x=M,t.velocity.y=b;return}const f=Math.hypot(t.velocity.x,t.velocity.y),w=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),k=t.hasMass?Math.max(.2,t.baseMass):1,T=this.maxWalkForce*t.strength/k*c*s;if(g<=T||!o&&f<w)t.velocity.x=M,t.velocity.y=b;else{const z=T/g;t.velocity.x+=V*z,t.velocity.y+=v*z}}}class Wt{constructor(){r(this,"id","pickup");r(this,"name","Pickup Ability");r(this,"enabled",!0);r(this,"pickupReach",1.3);r(this,"crossLayerReachRatio",.55)}isObjectInReach(t,i,s=1){var c;if(!this.enabled||i===t||i.isHeld||i.isCharacter||i.lastThrower===t)return!1;const e=t.standingWall!==null||t.supportingSurfaceHeight>=s-.05?2:1,l=i.standingWall!==null||i.supportingSurfaceHeight>=s-.05?2:1,n=e===l?this.pickupReach:this.pickupReach*this.crossLayerReachRatio,a=i.hasCollider?i.colliderRadius:((c=i.colliderModule)==null?void 0:c.radius)??.32;return Math.hypot(i.position.x-t.position.x,i.position.y-t.position.y)<=n+a}findTargetObject(t,i,s,e,l=1){if(!this.enabled)return null;let o=null,n=1/0;for(const a of e){if(!this.isObjectInReach(t,a,l))continue;const d=Math.hypot(a.position.x-i,a.position.y-s);d<n&&(n=d,o=a)}return o}pickup(t,i){if(!this.enabled||t.heldObject)return!1;const s=i.velocity.x,e=i.velocity.y,l=i.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=e*l,t.isAboveGround&&Math.abs(i.verticalVelocity)>.1&&(t.verticalVelocity+=i.verticalVelocity*l),t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=i.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const i=t.heldObject;if(t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.lastThrower=null,i.velocity.x=t.velocity.x,i.velocity.y=t.velocity.y,i.verticalVelocity=t.isAboveGround?t.verticalVelocity:0,i.hasFriction&&i.rollModule&&i.rollModule.enabled){const s=i.colliderRadius>0?i.colliderRadius:.3;i.rollModule.angularVelocity.y=i.velocity.x/s,i.rollModule.angularVelocity.x=-i.velocity.y/s}return i}}class Pt{constructor(){r(this,"id","throw");r(this,"name","Throw Ability");r(this,"enabled",!0);r(this,"baseThrowForce",7.6);r(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),o=Math.max(e.y,Math.min(i,e.y+e.height)),n=t-l,a=i-o;return n*n+a*a<s*s}computeLaunchVelocity(t,i,s,e,l,o,n,a=!0,d=!0,c=.35,h){const m=e-t,p=l-i,M=Math.hypot(m,p);if(M<.1)return null;const b=Math.min(M,this.maxThrowAimDistance),V=m/M,v=p/M,g=t+V*b,f=i+v*b,w=(h==null?void 0:h.x)??0,k=(h==null?void 0:h.y)??0,R=w*V+k*v,T=w*-v+k*V,O=Math.sqrt(Math.max(.25,n*n-T*T)),z=Math.max(1.5,R+O);if(!a||!d){const F=Math.max(.14,b/z),C=V*z,q=v*z;return{vx:C,vy:q,vz:0,totalTime:F,finalTargetX:g,finalTargetY:f,targetSurfaceHeight:s}}const A=o.getSupportingSurfaceHeight(g,f),$=A-s;let x=Math.max(.14,b/z);$>0&&(x=Math.max(x,Math.sqrt(2*$/o.gravity)));const S=40,E=c>0?c:.35,L=.25;for(let F=1;F<S;F++){const C=F/S,q=t+(g-t)*C,j=i+(f-i)*C;for(const I of o.walls)if(this.testWallIntersection(q,j,E,I)){if(A>0&&g>=I.x&&g<=I.x+I.width&&f>=I.y&&f<=I.y+I.height&&C>.65)continue;const u=(1-C)*s+C*A,X=I.wallHeight+L-u;if(X>0){const Y=o.gravity*C*(1-C);if(Y>.001){const Z=2*X/Y;if(Z>0){const N=Math.sqrt(Z);N>x&&(x=N)}}}}}if(x<=.05)return null;const P=($+.5*o.gravity*x*x)/x,W=b/x,B=V*W,D=v*W;return{vx:B,vy:D,vz:P,totalTime:x,finalTargetX:g,finalTargetY:f,targetSurfaceHeight:A}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,n=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,c=l.hasGravity&&l.hasVerticalVelocity,h={x:t.velocity.x,y:t.velocity.y,z:t.isAboveGround?t.verticalVelocity:0},m=this.computeLaunchVelocity(o,n,a,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius,h);if(!m)return null;const{vx:p,vy:M,vz:b,totalTime:V,finalTargetX:v,finalTargetY:g,targetSurfaceHeight:f}=m,w=90,k=V/w,R=[];let T=!1,O=f>0,z,A=a;for(let y=0;y<=w;y++){const x=y*k,S=y===w?v:o+p*x,E=y===w?g:n+M*x,L=c?a+b*x-.5*e.gravity*x*x:a,P=c?y===w?f:Math.max(f,L):a,W=c?b-e.gravity*x:0;P>A&&(A=P);const B=P>e.wallHeight;let D=!1,F=!1;for(const C of e.walls)if(this.testWallIntersection(S,E,l.colliderRadius,C)&&(D=!0,P<=C.wallHeight+.001)){if(R.length>0&&R[R.length-1].z>=C.wallHeight-.05&&W<=0){if(f>0&&v>=C.x-.1&&v<=C.x+C.width+.1&&g>=C.y-.1&&g<=C.y+C.height+.1||f>0&&y>=w-3){O=!0;break}else if(f===0){O=!0,F=!0,T=!0,z=C.id;break}}else if(P<C.wallHeight-.05&&y>1){F=!0,T=!0,z=C.id;break}}if(R.push({x:S,y:E,z:P,t:x,couldClearWall:B,isOverWall:D,collidesWall:F}),F)break}const $=R[R.length-1];return{points:R,landPoint:{x:T?$.x:v,y:T?$.y:g},isBlockedByWall:T,isLandingOnWallTop:T?O:f>0,blockedAtWallId:z,peakHeight:A,flightTime:V,colliderRadius:l.colliderRadius,visualShape:l.visualShape}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,n=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,c={x:t.velocity.x,y:t.velocity.y,z:t.isAboveGround?t.verticalVelocity:0},h=this.computeLaunchVelocity(o,n,a,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius,c);if(!h)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=h.vx,l.velocity.y=h.vy,l.verticalVelocity=h.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const v=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=h.vx/v,l.rollModule.angularVelocity.x=-h.vy/v}const m=l.hasMass?l.mass:0,p=t.hasMass?Math.max(.2,t.baseMass):0,M=m>0&&p>0?m/p:0;t.heldObject=null;const b=h.vx-t.velocity.x,V=h.vy-t.velocity.y;if(t.velocity.x-=b*M,t.velocity.y-=V*M,t.isAboveGround&&l.hasVerticalVelocity){const v=h.vz-t.verticalVelocity;t.verticalVelocity-=v*M}return l}}class Ft{constructor(t){r(this,"id","climbing");r(this,"name","Climbing Module");r(this,"enabled",!0);r(this,"maxAdhesion",35);r(this,"maxClimbSpeed",3);r(this,"preventWalkOff",!0);r(this,"horizontalClimb",!1);r(this,"hangDistance",.1);r(this,"dismountSuppressedUntilRelease",!1);r(this,"climbSuppressedUntilRelease",!1);r(this,"isDismountFreefall",!1);r(this,"isAssistClampArmed",!1);r(this,"hasLeftClampZoneSinceDismount",!0);r(this,"wasClimbHeldLastTick",!1);(t==null?void 0:t.maxAdhesion)!==void 0&&(this.maxAdhesion=t.maxAdhesion),(t==null?void 0:t.maxClimbSpeed)!==void 0&&(this.maxClimbSpeed=t.maxClimbSpeed),(t==null?void 0:t.preventWalkOff)!==void 0&&(this.preventWalkOff=t.preventWalkOff),(t==null?void 0:t.horizontalClimb)!==void 0&&(this.horizontalClimb=t.horizontalClimb),(t==null?void 0:t.hangDistance)!==void 0&&(this.hangDistance=t.hangDistance)}get climbSuppressedUntilRePress(){return this.isDismountFreefall||this.climbSuppressedUntilRelease}set climbSuppressedUntilRePress(t){this.isDismountFreefall=t,this.climbSuppressedUntilRelease=t}update(t,i,s,e,l){const o=s&&!this.wasClimbHeldLastTick;if(this.wasClimbHeldLastTick=s,s||(this.dismountSuppressedUntilRelease=!1,this.climbSuppressedUntilRelease=!1),(t.position.z<=.01||o)&&(this.isDismountFreefall=!1,t.position.z<=.01&&(this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)),this.climbSuppressedUntilRelease||!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const n=t.hasCollider?t.colliderRadius:.44,a=Math.hypot(i.x,i.y),d=a>=.05,c=d?i.x/a:0,h=d?i.y/a:0;if(!t.isClimbing&&(t.standingWall!==null||t.position.z>=l.wallHeight))return t.isClimbing=!1,!1;let m=null,p=1/0,M=0,b=0,V=0;for(const k of l.walls){const R=Math.max(k.x,Math.min(t.position.x,k.x+k.width)),T=Math.max(k.y,Math.min(t.position.y,k.y+k.height)),O=R-t.position.x,z=T-t.position.y,A=Math.hypot(O,z);A<=n+.15&&A<p&&(p=A,m=k,M=d?c*O+h*z:0,b=O,V=z)}if(!m)return t.isClimbing=!1,!1;const v=t.mass;if(v*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;const f=t.isClimbing;if(f&&t.position.z<m.wallHeight){const k=p>.001?b/p:0,R=p>.001?V/p:0,T=-R,O=k,z=d?c*k+h*R:0,A=d?c*T+h*O:0;if(d&&(z<-.3||!this.horizontalClimb&&M<-.1))return t.isClimbing=!1,t.velocity.x=c*3,t.velocity.y=h*3,s&&(this.climbSuppressedUntilRelease=!0),!1;if(t.isClimbing=!0,t.verticalVelocity=0,t.standingWall=null,this.horizontalClimb&&d&&Math.abs(A)>=.1){const $=t.baseMass,y=Math.max(.5,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*$*t.strength/Math.max(.1,v)));t.velocity.x=T*A*y,t.velocity.y=O*A*y}else t.velocity.x=0,t.velocity.y=0;if(s){const $=t.baseMass,y=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*$*t.strength/Math.max(.1,v)));t.position.z+=y*e,t.position.z>=m.wallHeight&&(t.position.z=m.wallHeight,t.supportingSurfaceHeight=m.wallHeight,t.standingWall=m,t.verticalVelocity=0,t.isClimbing=!1,this.dismountSuppressedUntilRelease=!0,this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)}return!0}if(!f&&t.position.z>.05&&t.position.z<m.wallHeight)return o?(t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0,!0):(t.isClimbing=!1,!1);if(s&&d&&M>.01&&p<=n+.03&&t.position.z<m.wallHeight){if(p>.001){const T=b/p,O=V/p;t.position.x=t.position.x+b-T*n,t.position.y=t.position.y+V-O*n}t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const k=t.baseMass,R=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*k*t.strength/Math.max(.1,v)));return t.position.z+=R*e,!0}return t.isClimbing=!1,!1}}class wt{constructor(t={}){r(this,"id","strength");r(this,"name","Strength Module");r(this,"enabled",!0);r(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class xt extends it{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});r(this,"strengthModule");r(this,"facingAngle");r(this,"heldObject");r(this,"isCharacter",!0);r(this,"isActivelyWalking",!1);r(this,"isClimbInputHeld",!1);r(this,"baseMass",1.2);r(this,"walkingModule");r(this,"pickupModule");r(this,"throwModule");r(this,"climbingModule");r(this,"isAiming");r(this,"aimTarget");r(this,"activeTrajectory");this.baseMass=i.mass??1.2,this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new wt({strength:i.strength??1}),this.walkingModule=new Rt,this.pickupModule=new Wt,this.throwModule=new Pt,this.climbingModule=new Ft}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(i){this.strengthModule?this.strengthModule.strength=Math.max(.1,i):this.strengthModule=new wt({strength:i})}get mass(){const i=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return i+s}set mass(i){this.baseMass=Math.max(.1,i),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}get hangDistance(){return this.climbingModule?this.climbingModule.hangDistance:.1}set hangDistance(i){this.climbingModule&&(this.climbingModule.hangDistance=Math.max(0,i))}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,o=s.y-this.position.y;if(Math.hypot(l,o)>.1){this.facingAngle=Math.atan2(o,l);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,l,o,n=!1){if(this.isClimbInputHeld=n,this.climbingModule&&this.climbingModule.update(this,s,n,i,o),this.walkingModule&&this.walkingModule.update(this,s,i,o),this.updatePosition(i,o),this.updateFacingDirection(e,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,o):this.activeTrajectory=null}}class Mt{constructor(t={}){r(this,"enabled",!0);r(this,"angularVelocity",{x:0,y:0,z:0});r(this,"rollResistance",.4);r(this,"visualPhase",0);var i,s,e;this.enabled=t.enabled??!0,this.angularVelocity={x:((i=t.angularVelocity)==null?void 0:i.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((e=t.angularVelocity)==null?void 0:e.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const i=this.angularSpeed;i>.001&&(this.visualPhase=(this.visualPhase+i*t)%(Math.PI*2))}}class et{constructor(t){r(this,"ctx");this.ctx=t}render(t,i,s,e,l=!1,o,n,a=!1,d){const c=this.ctx,h=c.canvas.width/t.width;c.clearRect(0,0,c.canvas.width,c.canvas.height),this.drawFloorGrid(t,h),this.drawWalls(t,h),a&&d&&this.drawWallEditorHover(t,d,h);const m=[i,...s];m.sort((p,M)=>p.isHeld&&p.heldBy===M||i.heldObject===p&&M===i?-1:M.isHeld&&M.heldBy===p||i.heldObject===M&&p===i?1:Math.abs(p.position.z-M.position.z)>.001?p.position.z-M.position.z:Math.abs(p.verticalVelocity-M.verticalVelocity)>.001?p.verticalVelocity-M.verticalVelocity:p.position.y-M.position.y);for(const p of m)p instanceof xt?this.drawCharacter(p,h,t):this.drawFreebodyObject(p,i,h,p===n,t),this.drawObjectShadow(p,t,h);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,h,t),l&&(o&&o!==e&&this.drawHoverGizmo(o,h),e&&this.drawSelectionGizmo(e,l,h))}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawWallEditorHover(t,i,s){if(i.col<0||i.col>=t.cols||i.row<0||i.row>=t.rows)return;const e=this.ctx,l=i.col*t.tileSize*s,o=i.row*t.tileSize*s,n=t.tileSize*s,a=t.hasWall(i.col,i.row);e.save(),a?(e.fillStyle="rgba(239, 68, 68, 0.35)",e.strokeStyle="#ef4444",e.lineWidth=2.5,e.fillRect(l,o,n,n),e.strokeRect(l,o,n,n),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#fca5a5",e.textAlign="center",e.textBaseline="middle",e.fillText("✕ Erase",l+n/2,o+n/2)):(e.fillStyle="rgba(56, 189, 248, 0.3)",e.strokeStyle="#38bdf8",e.lineWidth=2.5,e.fillRect(l,o,n,n),e.strokeRect(l,o,n,n),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#7dd3fc",e.textAlign="center",e.textBaseline="middle",e.fillText("+ Draw",l+n/2,o+n/2)),e.restore()}static getAltitudeScale(t,i){return 1+Math.max(0,t)/Math.max(.1,i)*.5}static isEntityOnLayer2(t,i){const s=i-.05;return t.position.z>=s||t.supportingSurfaceHeight>=s||t.standingWall!==null||t.isAboveWalls}drawObjectShadow(t,i,s){const e=t.position.z;if(e<=.01)return;const l=this.ctx,o=t.position.x*s,n=t.position.y*s,a=t.colliderRadius*s;if(l.save(),l.beginPath(),t.visualShape==="box"){const d=a*2,c=Math.max(3,a*.16);l.roundRect?l.roundRect(o-a,n-a,d,d,c):l.rect(o-a,n-a,d,d)}else l.arc(o,n,a,0,Math.PI*2);if(l.strokeStyle="rgba(255, 255, 255, 0.85)",l.lineWidth=1.8,l.setLineDash([4,4]),l.stroke(),e>i.wallHeight+.01){const d=et.getAltitudeScale(i.wallHeight,i.wallHeight),c=t.colliderRadius*s*d;if(l.beginPath(),t.visualShape==="box"){const h=c*2,m=Math.max(3,c*.16);l.roundRect?l.roundRect(o-c,n-c,h,h,m):l.rect(o-c,n-c,h,h)}else l.arc(o,n,c,0,Math.PI*2);l.strokeStyle="rgba(255, 255, 255, 0.45)",l.lineWidth=1.8,l.setLineDash([4,4]),l.stroke()}l.restore()}drawFreebodyObject(t,i,s,e=!1,l){var V,v;const o=this.ctx,n=t.position.x*s,a=t.position.y*s,d=et.getAltitudeScale(t.position.z,l.wallHeight),h=(t.hasCollider?t.colliderRadius:((V=t.colliderModule)==null?void 0:V.radius)??.32)*s,m=h*d,M=!i.heldObject&&i.pickupModule!==null&&i.pickupModule.enabled&&!t.isHeld&&(((v=i.pickupModule)==null?void 0:v.isObjectInReach(i,t,l.wallHeight))??!1),b=et.isEntityOnLayer2(t,l.wallHeight);if(o.save(),o.globalAlpha=b?.55:1,t.visualShape==="box"){const g=m*2,f=Math.max(3,m*.16),w=n-m,k=a-m;o.beginPath(),o.roundRect?o.roundRect(w,k,g,g,f):o.rect(w,k,g,g),o.fillStyle=t.color,o.fill(),o.strokeStyle=M?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=M?2.5:2,o.stroke();const R=Math.max(3,m*.22);o.beginPath(),o.roundRect?o.roundRect(w+R,k+R,g-R*2,g-R*2,f*.7):o.rect(w+R,k+R,g-R*2,g-R*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(w+R,k+R),o.lineTo(w+g-R,k+g-R),o.moveTo(w+g-R,k+R),o.lineTo(w+R,k+g-R),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(n,a,m,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=M?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=M?2.5:2,o.stroke();if(this.drawRollIndicator(t,n,a,m),o.restore(),M){const g=h+2;if(o.save(),o.beginPath(),t.visualShape==="box"){const f=g*2,w=Math.max(3,g*.16);o.roundRect?o.roundRect(n-g,a-g,f,f,w):o.rect(n-g,a-g,f,f)}else o.arc(n,a,g,0,Math.PI*2);e?(o.strokeStyle="#38bdf8",o.lineWidth=2.8,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",n,a-g-6)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}}drawCharacter(t,i,s){const e=this.ctx,l=t.position.x*i,o=t.position.y*i,n=et.getAltitudeScale(t.position.z,s.wallHeight),a=t.colliderRadius*i*n,d=et.isEntityOnLayer2(t,s.wallHeight);e.save(),e.globalAlpha=d?.55:1,e.beginPath(),e.arc(l,o,a,0,Math.PI*2),e.fillStyle=t.color,e.fill(),e.strokeStyle="#ffffff",e.lineWidth=2.5,e.stroke(),this.drawRollIndicator(t,l,o,a);const c=.52,h=a*.72,m=Math.max(3.5,a*.18),p=t.facingAngle-c,M=t.facingAngle+c,b=l+Math.cos(p)*h,V=o+Math.sin(p)*h,v=l+Math.cos(M)*h,g=o+Math.sin(M)*h;e.fillStyle="#000000",e.beginPath(),e.arc(b,V,m,0,Math.PI*2),e.arc(v,g,m,0,Math.PI*2),e.fill(),t.heldObject&&(e.strokeStyle="rgba(255, 255, 255, 0.6)",e.setLineDash([3,3]),e.lineWidth=1.5,e.beginPath(),e.moveTo(l,o),e.lineTo(t.heldObject.position.x*i,t.heldObject.position.y*i),e.stroke(),e.setLineDash([])),e.restore()}drawRollIndicator(t,i,s,e){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,o=l.angularVelocity.x,n=l.angularVelocity.y,a=l.angularVelocity.z,d=Math.hypot(o,n,a);if(d<.02)return;const c=this.ctx,m=Math.hypot(o,n)<.05*d,p=2.5,M=5,b=4;if(c.save(),c.shadowColor="rgba(0, 0, 0, 0.75)",c.shadowBlur=3,m){const V=e*.5,v=e*.88;c.beginPath(),c.arc(i,s,V,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.5)",c.lineWidth=1.8,c.setLineDash([]),c.stroke(),c.beginPath(),c.arc(i,s,v,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.98)",c.lineWidth=p,c.setLineDash([M,b]),c.lineDashOffset=-l.visualPhase*v*Math.sign(a||1),c.stroke()}else{const V=Math.atan2(-o,n),v=e*.9,g=Math.abs(a)/d,f=v*Math.max(.35,Math.pow(g,.65));c.translate(i,s),c.rotate(V);const w=a!==0?Math.sign(a):1;c.beginPath(),c.ellipse(0,0,v,f,0,0,Math.PI),c.strokeStyle="rgba(255, 255, 255, 0.98)",c.lineWidth=p,c.setLineDash([M,b]),c.lineDashOffset=-l.visualPhase*v*w,c.stroke(),c.beginPath(),c.ellipse(0,0,v,f,0,Math.PI,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.35)",c.lineWidth=1.8,c.setLineDash([M,b]),c.lineDashOffset=-l.visualPhase*v*w,c.stroke()}c.restore()}drawTrajectory(t,i,s){const e=this.ctx,l=t.points;if(l.length<2)return;e.save(),e.shadowColor="rgba(0, 0, 0, 0.6)",e.shadowBlur=3;const o=.38,n=Math.max(2.2,.048*i),a=s.wallHeight-.05;let d=l[0].x,c=l[0].y,h=n,m=0,p=!0;for(let f=0;f<l.length-1;f++){const w=l[f],k=l[f+1],R=k.x-w.x,T=k.y-w.y,O=k.z-w.z,z=Math.hypot(R,T,O);if(z<=1e-4)continue;const A=Math.max(1,Math.ceil(z/.02)),$=R/A,y=T/A,x=O/A,S=z/A;for(let E=1;E<=A;E++){const L=w.x+$*E,P=w.y+y*E,W=w.z+x*E;m+=S;const B=Math.max(0,W)/Math.max(.1,s.wallHeight),D=n*(1+B*.75);if(p){if(m>=o*.5){const q=W>=a;e.fillStyle=q?"rgba(255, 255, 255, 0.38)":"rgba(255, 255, 255, 0.95)",e.beginPath(),e.arc(L*i,P*i,D,0,Math.PI*2),e.fill(),d=L,c=P,h=D,m=0,p=!1}continue}const F=Math.hypot(L-d,P-c)*i,C=Math.max(18,h+D+7);if(m>=o&&F>=C){const q=Math.hypot(L-t.landPoint.x,P-t.landPoint.y)*i,j=(t.colliderRadius??.35)*i;if(q>j*.8){const I=W>=a;e.fillStyle=I?"rgba(255, 255, 255, 0.38)":"rgba(255, 255, 255, 0.95)",e.beginPath(),e.arc(L*i,P*i,D,0,Math.PI*2),e.fill(),d=L,c=P,h=D,m=0}}}}e.shadowBlur=0;const M=l[l.length-1],b=(t.colliderRadius??.35)*i,V=t.landPoint.x*i,v=t.landPoint.y*i,g=(f,w)=>{if(e.beginPath(),t.visualShape==="box"){const k=b*2,R=Math.max(3,b*.16);e.roundRect?e.roundRect(f-b,w-b,k,k,R):e.rect(f-b,w-b,k,k)}else e.arc(f,w,b,0,Math.PI*2)};if(t.isBlockedByWall){const f=M.x*i,w=M.y*i;e.save(),e.strokeStyle="#ef4444",e.fillStyle="rgba(239, 68, 68, 0.25)",e.lineWidth=2.2,e.setLineDash([4,3]),g(f,w),e.fill(),e.stroke(),e.strokeStyle="#ef4444",e.lineWidth=2.5,e.setLineDash([]);const k=Math.min(8,b*.55);e.beginPath(),e.moveTo(f-k,w-k),e.lineTo(f+k,w+k),e.moveTo(f+k,w-k),e.lineTo(f-k,w+k),e.stroke(),e.restore()}else t.isLandingOnWallTop?(e.save(),e.strokeStyle="rgba(56, 189, 248, 0.85)",e.fillStyle="rgba(56, 189, 248, 0.25)",e.lineWidth=2.2,e.setLineDash([]),g(V,v),e.fill(),e.stroke(),e.beginPath(),e.arc(V,v,Math.min(4,b*.22),0,Math.PI*2),e.fillStyle="rgba(56, 189, 248, 0.95)",e.fill(),e.restore()):(e.save(),e.strokeStyle="#22c55e",e.fillStyle="rgba(34, 197, 94, 0.25)",e.lineWidth=2.2,e.setLineDash([]),g(V,v),e.fill(),e.stroke(),e.beginPath(),e.arc(V,v,Math.min(4,b*.22),0,Math.PI*2),e.fillStyle="#22c55e",e.fill(),e.restore());e.restore()}drawHoverGizmo(t,i){var a;const s=this.ctx,e=t.position.x*i,l=t.position.y*i,n=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*i;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(e,l,n,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,i,s){var m;const e=this.ctx,l=t.position.x*s,o=t.position.y*s,d=(t.hasCollider?t.colliderRadius:((m=t.colliderModule)==null?void 0:m.radius)??.32)*s+6,c=Math.max(6,d*.4),h=i?"#fbbf24":"#38bdf8";if(e.save(),e.strokeStyle=h,e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.moveTo(l-d,o-d+c),e.lineTo(l-d,o-d),e.lineTo(l-d+c,o-d),e.stroke(),e.beginPath(),e.moveTo(l+d-c,o-d),e.lineTo(l+d,o-d),e.lineTo(l+d,o-d+c),e.stroke(),e.beginPath(),e.moveTo(l+d,o+d-c),e.lineTo(l+d,o+d),e.lineTo(l+d-c,o+d),e.stroke(),e.beginPath(),e.moveTo(l-d+c,o+d),e.lineTo(l-d,o+d),e.lineTo(l-d,o+d-c),e.stroke(),i){const p=`${t.name} (${t.mass.toFixed(1)}kg)`;e.font="bold 10px 'Segoe UI', system-ui, sans-serif";const b=e.measureText(p).width+12,V=16,v=l-b/2,g=o-d-V-4;e.fillStyle="rgba(15, 23, 42, 0.85)",e.strokeStyle=h,e.lineWidth=1,e.beginPath(),e.roundRect(v,g,b,V,4),e.fill(),e.stroke(),e.fillStyle=h,e.textAlign="center",e.textBaseline="middle",e.fillText(p,l,g+V/2)}e.restore()}}class At{constructor(t,i){r(this,"canvas");r(this,"arena");r(this,"keysPressed",new Set);r(this,"isEKeyDepressed",!1);r(this,"mousePos",{x:0,y:0});r(this,"isMouseDown",!1);r(this,"isRightMouseDown",!1);r(this,"hoverWallTile",null);r(this,"movementVector",{x:0,y:0});r(this,"justPickedUp",!1);r(this,"isThrowingPress",!1);r(this,"hoverEntity",null);r(this,"selectedCanvasEntity",null);r(this,"draggedEntity",null);r(this,"dragOffset",{x:0,y:0});r(this,"handleClick");r(this,"onMouseDown");r(this,"onRightMouseDown");r(this,"onMouseUp");r(this,"onRightClick");r(this,"onDropAttempt");r(this,"onMouseMove");this.canvas=t,this.arena=i,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{if(this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"){if(t.repeat||this.isEKeyDepressed)return;this.isEKeyDepressed=!0,this.onDropAttempt&&this.onDropAttempt()}}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector(),t.code==="KeyE"&&(this.isEKeyDepressed=!1)}),window.addEventListener("blur",()=>{this.isEKeyDepressed=!1,this.keysPressed.clear(),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){e&&(this.selectedCanvasEntity=e.selectedEntity);const l=(a,d,c=.35)=>{var p;for(let M=s.length-1;M>=0;M--){const b=s[M],V=b.hasCollider?b.colliderRadius:((p=b.colliderModule)==null?void 0:p.radius)??.32;if(Math.hypot(b.position.x-a,b.position.y-d)<=V+c)return b}const h=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-d)<=h+c?t:null},o=(a,d)=>{if(a<0||a>=i.cols||d<0||d>=i.rows)return;if(i.setWallTile(a,d,!0)){const h=[t,...s];i.syncEntitiesWithWalls(h),i.currentPresetId="custom",e==null||e.updateWallPresetUI()}},n=(a,d)=>{if(!(a<0||a>=i.cols||d<0||d>=i.rows)&&i.tileGrid[d][a]===1){i.setWallTile(a,d,!1);const c=[t,...s];i.syncEntitiesWithWalls(c),i.currentPresetId="custom",e==null||e.updateWallPresetUI()}};this.onMouseDown=(a,d)=>{if(e!=null&&e.isEditMode){if(e.editTool==="walls"){const h=Math.floor(a/i.tileSize),m=Math.floor(d/i.tileSize);o(h,m);return}const c=l(a,d,.35);c?(this.selectedCanvasEntity=c,e.setSelectedEntity(c),this.draggedEntity=c,this.dragOffset.x=c.position.x-a,this.dragOffset.y=c.position.y-d,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"){const c=Math.floor(a/i.tileSize),h=Math.floor(d/i.tileSize);n(c,h)}},this.onMouseMove=(a,d)=>{var m;const c=Math.floor(a/i.tileSize),h=Math.floor(d/i.tileSize);if(c>=0&&c<i.cols&&h>=0&&h<i.rows?this.hoverWallTile={col:c,row:h}:this.hoverWallTile=null,e!=null&&e.isEditMode){if(e.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?o(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&n(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const p=a+this.dragOffset.x,M=d+this.dragOffset.y,b=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((m=this.draggedEntity.colliderModule)==null?void 0:m.radius)??.32;this.draggedEntity.position.x=Math.max(b,Math.min(i.width-b,p)),this.draggedEntity.position.y=Math.max(b,Math.min(i.height-b,M)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const p=l(a,d,.3);this.hoverEntity=p,this.canvas.style.cursor=p?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,d)=>{if(this.draggedEntity&&(i.syncEntitiesWithWalls([this.draggedEntity]),this.draggedEntity=null),e!=null&&e.isEditMode)if(e.editTool==="walls")this.canvas.style.cursor="cell";else{const c=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=c,this.canvas.style.cursor=c?"grab":"crosshair"}},this.handleClick=(a,d)=>{if(!(e!=null&&e.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,d,i),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const c=t.pickupModule.findTargetObject(t,a,d,s,i.wallHeight);c&&(t.pickupModule.pickup(t,c),this.justPickedUp=!0)}}},this.onRightClick=(a,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"||!e)return;const c=l(a,d,.4);c&&(this.selectedCanvasEntity=c,e.setSelectedEntity(c))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,i.wallHeight);a&&t.pickupModule.pickup(t,a)}}}}class Lt{constructor(t){r(this,"container");r(this,"character");r(this,"arena");r(this,"objects");r(this,"onSpawnObject");r(this,"onDeleteObject");r(this,"onClearObjects");r(this,"selectedEntity");r(this,"isEditMode",!1);r(this,"editTool","entities");r(this,"onSelectionChange");r(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});r(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});r(this,"inspectorEl");r(this,"entitySelectorEl");r(this,"characterSpecificControlsEl");r(this,"objectSpecificControlsEl");r(this,"modePlayBtn");r(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var i;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(i=this.onSelectionChange)==null||i.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const i=this.container.querySelector("#edit-submode-container");i&&(i.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const i=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");i&&s&&(i.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const i=this.container.querySelector("#edit-hint-label");i&&(this.isEditMode?this.editTool==="walls"?i.textContent="Left-drag: Draw | Right-drag: Erase":i.textContent="Click & drag object in arena":i.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const e of this.objects){const l=e.id===t?"selected":"",o=e.visualShape==="box"?"📦":"⚪",n=e.hasMass?`${e.mass.toFixed(1)}kg`:"Massless";i+=`<option value="${e.id}" ${l}>${o} ${e.name} (${n})</option>`}this.entitySelectorEl.innerHTML=i;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,i,s,e,l,o,n,a,d,c,h,m,p,M,b,V,v,g,f,w,k,R,T,O,z,A,$,y,x,S,E,L,P,W,B,D,F,C,q,j,I,U,u,G,X,Y,Z,N,gt,st,lt,pt,ot,at,vt,nt,ct,bt,rt,tt,K,_,J,kt,Et,Vt,Ct;this.container.innerHTML=`
      <div class="dev-panel-header">
        <div class="header-top-row">
          <h2>🛠️ Sandbox & Engine</h2>
          <span class="badge">1 Wall = 1 Unit</span>
        </div>
        <div class="mode-switcher">
          <button id="mode-play" class="mode-btn ${this.isEditMode?"":"active-play"}">🎮 Play Mode</button>
          <button id="mode-edit" class="mode-btn ${this.isEditMode?"active-edit":""}">✏️ Edit Mode</button>
        </div>
        <div id="edit-submode-container" class="edit-submode-switcher" style="display: ${this.isEditMode?"flex":"none"};">
          <button id="submode-entities" class="submode-btn ${this.editTool==="entities"?"active":""}">📦 Move Entities</button>
          <button id="submode-walls" class="submode-btn ${this.editTool==="walls"?"active":""}">🧱 Edit Walls</button>
        </div>
      </div>

      <div class="dev-scrollable">
        <!-- Wall Tile Editor Section (Active when Edit Mode & Edit Walls selected) -->
        <div id="wall-editor-section" class="dev-section wall-tool-panel" style="display: ${this.isEditMode&&this.editTool==="walls"?"block":"none"};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h3 style="margin: 0;">🧱 Wall Tile Editor</h3>
            <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);">Grid: 20 × 14</span>
          </div>
          <p class="section-desc">Click and drag directly in the arena to paint or erase 1.0 × 1.0 unit wall blocks in real-time.</p>

          <div class="wall-hint-box">
            <div>🖱️ <strong>Left-Click & Drag:</strong> Draw / place wall tiles</div>
            <div style="margin-top: 4px;">🖱️ <strong class="danger">Right-Click & Drag:</strong> Erase / remove wall tiles</div>
            <div style="margin-top: 6px; font-size: 0.72rem; color: #94a3b8;">
              💡 Drawing a wall under an object on the ground elevates it to wall height. Erasing a wall under an object causes it to fall naturally with gravity.
            </div>
          </div>

          <!-- Wall Map Presets Switcher -->
          <div class="wall-presets-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 4px;">🗺️ Default Wall Maps</span>
              <span id="label-wall-map-badge" class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.68rem;">
                ${this.getCurrentWallPresetBadge()}
              </span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button id="btn-prev-wall-map" class="btn-secondary-action btn-wall-nav" title="Previous Wall Map">◀</button>
              <select id="select-wall-preset" class="dev-select wall-preset-select">
                ${this.renderWallPresetOptions()}
              </select>
              <button id="btn-next-wall-map" class="btn-secondary-action btn-wall-nav" title="Next Wall Map">▶</button>
            </div>
            <p id="desc-wall-map" class="wall-preset-desc">
              ${this.getCurrentWallPresetDesc()}
            </p>
          </div>

          <div class="slider-group" style="margin-top: 12px;">
            <div class="slider-label">
              <span>Standard Wall Height (u)</span>
              <span id="val-editor-wall-height">${this.arena.wallHeight.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-editor-wall-height" min="0.2" max="3.0" step="0.1" value="${this.arena.wallHeight}">
          </div>

          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button id="btn-reset-walls" class="btn-secondary-action" style="flex: 1;">↺ Reset Layout</button>
            <button id="btn-clear-walls" class="btn-secondary-action" style="flex: 1; color: #f87171; border-color: rgba(248, 113, 113, 0.3);">🗑️ Clear Walls</button>
          </div>
        </div>

        <!-- Target Selection -->
        <div class="dev-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h3>🎯 Target Entity</h3>
            <span style="font-size: 0.72rem; color: var(--accent-amber);" id="edit-hint-label">
              ${this.isEditMode?"Click & drag object in arena":"Right-click in arena to select"}
            </span>
          </div>
          <select id="entity-selector" class="dev-select"></select>
          
          <!-- Entity Actions (Duplicate / Delete) - Only for Objects -->
          <div id="object-actions-row" class="entity-actions-row" style="display: none; margin-top: 8px;">
            <button id="btn-duplicate-entity" class="btn-secondary-action">📋 Duplicate</button>
            <button id="btn-delete-entity" class="btn-secondary-action" style="color: #f87171; border-color: rgba(248, 113, 113, 0.3);">🗑️ Delete</button>
          </div>
        </div>

        <!-- Live Diagnostics Inspector -->
        <div class="dev-section">
          <h3>📊 Live Diagnostics</h3>
          <div id="dev-inspector" class="inspector-grid"></div>
        </div>

        <!-- 🧩 Modular Capabilities & Physical Behaviors -->
        <div class="dev-section">
          <h3>🧩 Physical Behaviors</h3>
          <p class="section-desc">Attach or detach isolated physics behaviors for the selected entity.</p>

          <!-- Visual Shape -->
          <div class="toggle-row" id="row-visual-shape" style="${this.selectedEntity===this.character?"display:none;":""}">
            <label>Visual Shape</label>
            <button id="toggle-entity-shape" class="btn-toggle ${this.selectedEntity.visualShape==="box"?"active":""}">
              ${this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪"}
            </button>
          </div>

          <!-- 1. Collider -->
          <div class="module-card">
            <div class="toggle-row">
              <label>🛡️ Collider</label>
              <button id="toggle-mod-collider" class="btn-toggle ${this.selectedEntity.hasCollider?"active":""}">
                ${this.selectedEntity.hasCollider?"Attached":"Detached"}
              </button>
            </div>
            <div id="group-mod-collider" style="display: ${this.selectedEntity.hasCollider?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Collider Radius (u)</span>
                  <span id="val-entity-radius">${(((t=this.selectedEntity.colliderModule)==null?void 0:t.radius)??.32).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-radius" min="0.1" max="1.5" step="0.02" value="${((i=this.selectedEntity.colliderModule)==null?void 0:i.radius)??.32}">
              </div>
            </div>
            <div id="note-mod-collider" class="module-detached-note" style="display: ${this.selectedEntity.hasCollider?"none":"block"};">
              Passes freely through all walls and objects
            </div>
          </div>

          <!-- 2. Mass -->
          <div class="module-card">
            <div class="toggle-row">
              <label>⚖️ Mass</label>
              <button id="toggle-mod-mass" class="btn-toggle ${this.selectedEntity.hasMass?"active":""}">
                ${this.selectedEntity.hasMass?"Attached":"Detached"}
              </button>
            </div>
            <div id="group-mod-mass" style="display: ${this.selectedEntity.hasMass?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Mass (kg)</span>
                  <span id="val-entity-mass">${(((s=this.selectedEntity.massModule)==null?void 0:s.mass)??1).toFixed(1)}</span>
                </div>
                <input type="range" id="slide-entity-mass" min="0.1" max="8.0" step="0.1" value="${((e=this.selectedEntity.massModule)==null?void 0:e.mass)??1}">
              </div>
            </div>
            <div id="note-mod-mass" class="module-detached-note" style="display: ${this.selectedEntity.hasMass?"none":"block"};">
              Massless: imparts 0 resistance on massive bodies, only inherits velocity
            </div>
          </div>

          <!-- 3. Friction (Requires Mass) -->
          <div class="module-card" id="card-mod-friction">
            <div class="toggle-row">
              <label>🛝 Friction</label>
              <button id="toggle-mod-friction" class="btn-toggle ${(l=this.selectedEntity.frictionModule)!=null&&l.enabled?"active":""}">
                ${(o=this.selectedEntity.frictionModule)!=null&&o.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-friction-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((n=this.selectedEntity.frictionModule)!=null&&n.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no normal force)
            </div>
            <div id="group-mod-friction" style="display: ${(a=this.selectedEntity.frictionModule)!=null&&a.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Static Friction Mod</span>
                  <span id="val-entity-static-fric">${(((d=this.selectedEntity.frictionModule)==null?void 0:d.staticFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${((c=this.selectedEntity.frictionModule)==null?void 0:c.staticFrictionMod)??1}">
              </div>
              <div class="slider-group">
                <div class="slider-label">
                  <span>Dynamic Friction Mod</span>
                  <span id="val-entity-dynamic-fric">${(((h=this.selectedEntity.frictionModule)==null?void 0:h.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((m=this.selectedEntity.frictionModule)==null?void 0:m.dynamicFrictionMod)??1}">
              </div>
            </div>
            <div id="note-mod-friction" class="module-detached-note" style="display: ${(p=this.selectedEntity.frictionModule)!=null&&p.enabled?"none":"block"};">
              Frictionless: glides indefinitely without ground resistance
            </div>
          </div>

          <!-- 4. Bounciness (Requires Mass) -->
          <div class="module-card" id="card-mod-bounce">
            <div class="toggle-row">
              <label>🏀 Bounciness</label>
              <button id="toggle-mod-bounce" class="btn-toggle ${(M=this.selectedEntity.bounceModule)!=null&&M.enabled?"active":""}">
                ${(b=this.selectedEntity.bounceModule)!=null&&b.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((V=this.selectedEntity.bounceModule)!=null&&V.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(v=this.selectedEntity.bounceModule)!=null&&v.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((g=this.selectedEntity.bounceModule)==null?void 0:g.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((f=this.selectedEntity.bounceModule)==null?void 0:f.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(w=this.selectedEntity.bounceModule)!=null&&w.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(k=this.selectedEntity.bounceModule)!=null&&k.enabled&&((R=this.selectedEntity.bounceModule)!=null&&R.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${(T=this.selectedEntity.bounceModule)!=null&&T.enabled?"none":"block"};">
              Zero bounce: impact velocity immediately absorbed
            </div>
          </div>

          <!-- 5. Vertical Position & Velocity -->
          <div class="module-card" id="card-mod-vert-pos">
            <div class="toggle-row">
              <label>↕️ Vertical Position</label>
              <button id="toggle-mod-vert-pos" class="btn-toggle ${this.selectedEntity.hasVerticalPosition?"active":""}">
                ${this.selectedEntity.hasVerticalPosition?"Attached":"Detached"}
              </button>
            </div>
            <div id="group-mod-vert-pos" style="display: ${this.selectedEntity.hasVerticalPosition?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Elevation (z)</span>
                  <span id="val-entity-elevation">${this.selectedEntity.position.z.toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-elevation" min="0.0" max="4.0" step="0.05" value="${this.selectedEntity.position.z}">
              </div>

              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0;">Vertical Velocity</label>
                <button id="toggle-mod-vert-vel" class="btn-toggle ${this.selectedEntity.hasVerticalVelocity?"active":""}">
                  ${this.selectedEntity.hasVerticalVelocity?"Enabled":"Disabled"}
                </button>
              </div>

              <div id="group-mod-vert-vel" style="display: ${this.selectedEntity.hasVerticalVelocity?"block":"none"}; margin-top: 6px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Vertical Velocity (u/s)</span>
                    <span id="val-entity-vert-vel">${this.selectedEntity.verticalVelocity.toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-entity-vert-vel" min="-12" max="12" step="0.2" value="${this.selectedEntity.verticalVelocity}">
                </div>
              </div>
            </div>
            <div id="note-mod-vert-pos" class="module-detached-note" style="display: ${this.selectedEntity.hasVerticalPosition?"none":"block"};">
              Flat on ground: entity has no vertical position (z = 0)
            </div>
          </div>

          <!-- 6. Gravity -->
          <div class="module-card">
            <div class="toggle-row">
              <label>🪐 Gravity</label>
              <button id="toggle-mod-gravity" class="btn-toggle ${this.selectedEntity.hasGravity?"active":""}">
                ${this.selectedEntity.hasGravity?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-mod-gravity" class="module-detached-note">
              ${this.selectedEntity.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line"}
            </div>
          </div>

          <!-- 7. Roll -->
          <div class="module-card">
            <div class="toggle-row">
              <label>🔄 Roll</label>
              <button id="toggle-mod-roll" class="btn-toggle ${(O=this.selectedEntity.rollModule)!=null&&O.enabled?"active":""}">
                ${(z=this.selectedEntity.rollModule)!=null&&z.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(A=this.selectedEntity.rollModule)!=null&&A.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${($=this.selectedEntity.rollModule)!=null&&$.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((y=this.selectedEntity.rollModule)==null?void 0:y.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((x=this.selectedEntity.rollModule)==null?void 0:x.rollResistance)??.4}">
              </div>
            </div>
          </div>

          <!-- 7. Character Specific Capabilities (Walking, Pickup, Throw) -->
          <div id="character-specific-controls" style="display: ${this.selectedEntity===this.character?"flex":"none"}; flex-direction: column; gap: 10px;">
            <h4 style="margin-top: 6px; font-size: 0.78rem; color: #94a3b8; text-transform: uppercase;">Character Abilities</h4>

            <!-- Walking Ability -->
            <div class="module-card" id="card-mod-walking">
              <div class="toggle-row">
                <label>🚶 Walking Ability</label>
                <button id="toggle-walk" class="btn-toggle ${(S=this.character.walkingModule)!=null&&S.enabled?"active":""}">
                  ${(E=this.character.walkingModule)!=null&&E.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((L=this.character.walkingModule)!=null&&L.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&((P=this.character.walkingModule)!=null&&P.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(W=this.character.walkingModule)!=null&&W.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((B=this.character.walkingModule)==null?void 0:B.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((D=this.character.walkingModule)==null?void 0:D.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((F=this.character.walkingModule)==null?void 0:F.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((C=this.character.walkingModule)==null?void 0:C.maxWalkSpeed)??5.2}">
                </div>
              </div>
            </div>

            <!-- Strength Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>💪 Strength Ability</label>
                <button id="toggle-strength" class="btn-toggle ${(q=this.character.strengthModule)!=null&&q.enabled?"active":""}">
                  ${(j=this.character.strengthModule)!=null&&j.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-strength" style="display: ${(I=this.character.strengthModule)!=null&&I.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Muscle Strength</span>
                    <span id="val-strength">${(this.character.strength??1).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-strength" min="0.1" max="5.0" step="0.1" value="${this.character.strength??1}">
                </div>
              </div>
            </div>

            <!-- Pickup Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>✋ Pickup Ability</label>
                <button id="toggle-pickup" class="btn-toggle ${(U=this.character.pickupModule)!=null&&U.enabled?"active":""}">
                  ${(u=this.character.pickupModule)!=null&&u.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(G=this.character.pickupModule)!=null&&G.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(((X=this.character.pickupModule)==null?void 0:X.pickupReach)??1.3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${((Y=this.character.pickupModule)==null?void 0:Y.pickupReach)??1.3}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Cross-Layer Reach Ratio</span>
                    <span id="val-pickup-cross-layer">${(((Z=this.character.pickupModule)==null?void 0:Z.crossLayerReachRatio)??.55).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-pickup-cross-layer" min="0.10" max="1.00" step="0.05" value="${((N=this.character.pickupModule)==null?void 0:N.crossLayerReachRatio)??.55}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(gt=this.character.throwModule)!=null&&gt.enabled?"active":""}">
                  ${(st=this.character.throwModule)!=null&&st.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(lt=this.character.throwModule)!=null&&lt.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((pt=this.character.throwModule)==null?void 0:pt.baseThrowForce)??7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((ot=this.character.throwModule)==null?void 0:ot.baseThrowForce)??7.6}">
                </div>
              </div>
            </div>

            <!-- Climbing Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🧗 Climbing Ability</label>
                <button id="toggle-climb" class="btn-toggle ${(at=this.character.climbingModule)!=null&&at.enabled?"active":""}">
                  ${(vt=this.character.climbingModule)!=null&&vt.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-climb-deps" class="module-dep-warning" style="display: ${(!this.character.hasVerticalPosition||!this.character.hasStrength)&&((nt=this.character.climbingModule)!=null&&nt.enabled)?"block":"none"};">
                ${this.character.hasVerticalPosition?this.character.hasStrength?"":"⚠️ Requires Strength Ability to climb":"⚠️ Requires Vertical Position (3D Z-axis)"}
              </div>
              <div id="group-mod-climb" style="display: ${(ct=this.character.climbingModule)!=null&&ct.enabled?"block":"none"};">
                <div class="toggle-row" style="margin-bottom: 8px;">
                  <label style="font-size: 0.8rem;">Prevent Walk-Off (Require Space)</label>
                  <button id="toggle-climb-walkoff" class="btn-toggle ${(bt=this.character.climbingModule)!=null&&bt.preventWalkOff?"active":""}">
                    ${(rt=this.character.climbingModule)!=null&&rt.preventWalkOff?"Active":"Inactive"}
                  </button>
                </div>
                <div class="toggle-row" style="margin-bottom: 8px;">
                  <label style="font-size: 0.8rem;">Sideways Climb (Traverse Wall)</label>
                  <button id="toggle-climb-sideways" class="btn-toggle ${(tt=this.character.climbingModule)!=null&&tt.horizontalClimb?"active":""}">
                    ${(K=this.character.climbingModule)!=null&&K.horizontalClimb?"Active":"Inactive"}
                  </button>
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Adhesion (N)</span>
                    <span id="val-climb-adhesion">${(((_=this.character.climbingModule)==null?void 0:_.maxAdhesion)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-climb-adhesion" min="5.0" max="80.0" step="1.0" value="${((J=this.character.climbingModule)==null?void 0:J.maxAdhesion)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Climb Speed (u/s)</span>
                    <span id="val-climb-speed">${(((kt=this.character.climbingModule)==null?void 0:kt.maxClimbSpeed)??3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${((Et=this.character.climbingModule)==null?void 0:Et.maxClimbSpeed)??3}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Ledge Hang Distance (u)</span>
                    <span id="val-climb-hang">${(((Vt=this.character.climbingModule)==null?void 0:Vt.hangDistance)??.1).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-climb-hang" min="0.02" max="1.5" step="0.02" value="${((Ct=this.character.climbingModule)==null?void 0:Ct.hangDistance)??.1}">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ✨ Add New Object (Creator & Presets) -->
        <div class="dev-section">
          <div class="creator-sticky-header">
            <h3 style="margin: 0;">✨ Add New Object</h3>
            <span class="not-live-badge">⚠️ NOT LIVE OBJECT</span>
          </div>
          <p class="section-desc">Configure template properties or choose a preset to spawn into the arena.</p>
          
          <div class="presets-container" style="margin-bottom: 10px;">
            <button class="preset-chip" data-preset="Light Blue Box">📦 Light Box</button>
            <button class="preset-chip" data-preset="Heavy Red Box">📦 Heavy Box</button>
            <button class="preset-chip" data-preset="Bouncy Ball">⚪ Bouncy Ball</button>
            <button class="preset-chip" data-preset="Rolling Ball">🟣 Rolling Ball</button>
            <button class="preset-chip" data-preset="Ghost Box">👻 Ghost Box</button>
          </div>

          <div class="creator-form">
            <div>
              <label style="font-size: 0.76rem; color: #94a3b8; display: block; margin-bottom: 4px;">Object Name</label>
              <input type="text" id="creator-name" class="dev-input" value="${this.creatorState.name}">
            </div>

            <div class="toggle-row">
              <label>Visual Shape</label>
              <button id="creator-toggle-shape" class="btn-toggle ${this.creatorState.visualShape==="box"?"active":""}">
                ${this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪"}
              </button>
            </div>

            <div class="color-row">
              <label>Color</label>
              <div class="color-input-wrapper">
                <input type="color" id="creator-color" value="${this.creatorState.color}">
                <span id="val-creator-color" style="font-size: 0.76rem; font-family: monospace; color: #cbd5e1;">${this.creatorState.color}</span>
              </div>
            </div>

            <div class="toggle-row">
              <label>Collider</label>
              <button id="creator-toggle-collider" class="btn-toggle ${this.creatorState.hasCollider?"active":""}">
                ${this.creatorState.hasCollider?"Attached":"Detached"}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-radius" style="display: ${this.creatorState.hasCollider?"block":"none"};">
              <div class="slider-label">
                <span>Collider Radius (u)</span>
                <span id="val-creator-radius">${this.creatorState.colliderRadius.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-radius" min="0.1" max="1.5" step="0.02" value="${this.creatorState.colliderRadius}">
            </div>

            <div class="toggle-row">
              <label>Mass</label>
              <button id="creator-toggle-mass" class="btn-toggle ${this.creatorState.hasMass?"active":""}">
                ${this.creatorState.hasMass?"Attached":"Detached"}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-mass" style="display: ${this.creatorState.hasMass?"block":"none"};">
              <div class="slider-label">
                <span>Mass (kg)</span>
                <span id="val-creator-mass">${this.creatorState.mass.toFixed(1)}</span>
              </div>
              <input type="range" id="slide-creator-mass" min="0.1" max="8.0" step="0.1" value="${this.creatorState.mass}">
            </div>

            <div class="toggle-row">
              <label>Friction</label>
              <button id="creator-toggle-friction" class="btn-toggle ${this.creatorState.hasFriction?"active":""}">
                ${this.creatorState.hasFriction?"Attached":"Detached"}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-fric" style="display: ${this.creatorState.hasFriction?"block":"none"};">
              <div class="slider-label">
                <span>Dynamic Friction Mod</span>
                <span id="val-creator-fric">${this.creatorState.dynamicFrictionMod.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-fric" min="0" max="3.0" step="0.05" value="${this.creatorState.dynamicFrictionMod}">
            </div>

            <div class="toggle-row">
              <label>Bounciness</label>
              <button id="creator-toggle-bounce" class="btn-toggle ${this.creatorState.hasBounce?"active":""}">
                ${this.creatorState.hasBounce?"Attached":"Detached"}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-bounce" style="display: ${this.creatorState.hasBounce?"block":"none"};">
              <div class="slider-label">
                <span>Bounciness (Restitution)</span>
                <span id="val-creator-bounce">${this.creatorState.bounceMod.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-bounce" min="0.05" max="1.0" step="0.05" value="${this.creatorState.bounceMod}">
              <div style="margin-top: 6px;">
                <label style="font-size: 0.78rem; color: #cbd5e1; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="creator-check-vert-bounce" ${this.creatorState.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="creator-warn-bounce-vert" class="module-dep-warning" style="display: ${this.creatorState.hasBounce&&this.creatorState.verticalBounce&&(!this.creatorState.hasVerticalPosition||!this.creatorState.hasVerticalVelocity)?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>

            <div class="toggle-row">
              <label>Vertical Position</label>
              <button id="creator-toggle-vert-pos" class="btn-toggle ${this.creatorState.hasVerticalPosition?"active":""}">
                ${this.creatorState.hasVerticalPosition?"Attached":"Detached"}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-vert-pos" style="display: ${this.creatorState.hasVerticalPosition?"block":"none"};">
              <div class="slider-label">
                <span>Elevation (z)</span>
                <span id="val-creator-elevation">${this.creatorState.elevation.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-elevation" min="0.0" max="4.0" step="0.05" value="${this.creatorState.elevation}">

              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #cbd5e1;">Vertical Velocity</label>
                <button id="creator-toggle-vert-vel" class="btn-toggle ${this.creatorState.hasVerticalVelocity?"active":""}">
                  ${this.creatorState.hasVerticalVelocity?"Enabled":"Disabled"}
                </button>
              </div>
            </div>

            <div class="toggle-row">
              <label>Gravity</label>
              <button id="creator-toggle-gravity" class="btn-toggle ${this.creatorState.hasGravity?"active":""}">
                ${this.creatorState.hasGravity?"Attached":"Detached"}
              </button>
            </div>

            <div class="toggle-row">
              <label>Roll</label>
              <button id="creator-toggle-roll" class="btn-toggle ${this.creatorState.hasRollModule?"active":""}">
                ${this.creatorState.hasRollModule?"Enabled":"Disabled"}
              </button>
            </div>

            <div class="slider-group" id="group-creator-roll-resist" style="display: ${this.creatorState.hasRollModule?"block":"none"};">
              <div class="slider-label">
                <span>Roll Resistance (u/s²)</span>
                <span id="val-creator-roll-resist">${this.creatorState.rollResistance.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-roll-resist" min="0.0" max="4.0" step="0.05" value="${this.creatorState.rollResistance}">
            </div>

            <button id="btn-spawn-configured" class="btn-spawn-primary">✨ Spawn Object</button>
          </div>

          <div style="margin-top: 10px;">
            <button id="btn-clear-entities" class="btn-danger" style="width: 100%;">Clear All Objects</button>
          </div>
        </div>

        <!-- 🌍 World & Arena Physics -->
        <div class="dev-section">
          <h3>🌍 World Physics & Environment</h3>

          <div class="slider-group">
            <div class="slider-label">
              <span>Gravity Force (u/s²)</span>
              <span id="val-gravity">${this.arena.gravity.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-gravity" min="1.0" max="30.0" step="0.5" value="${this.arena.gravity}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Standard Wall Height (u)</span>
              <span id="val-wall-height">${this.arena.wallHeight.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-wall-height" min="0.2" max="3.0" step="0.1" value="${this.arena.wallHeight}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Base Ground Friction Coeff (u/s²)</span>
              <span id="val-friction">${this.arena.frictionCoeff.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-friction" min="1.0" max="30.0" step="0.5" value="${this.arena.frictionCoeff}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Static Friction Threshold (u/s)</span>
              <span id="val-static-thresh">${this.arena.staticFrictionThreshold.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-static-thresh" min="0.02" max="1.0" step="0.02" value="${this.arena.staticFrictionThreshold}">
          </div>
        </div>
      </div>
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var D,F,C,q,j,I,U;const t=this.selectedEntity,i=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=i?"none":"flex");const e=this.container.querySelector("#toggle-entity-shape");e&&(t.visualShape==="box"?(e.textContent="Box 📦",e.classList.add("active")):(e.textContent="Circle ⚪",e.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),o=this.container.querySelector("#group-mod-collider"),n=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),n&&(n.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((D=t.colliderModule)==null?void 0:D.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),d=this.container.querySelector("#group-mod-mass"),c=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),c&&(c.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((F=t.massModule)==null?void 0:F.mass)??1,1);const h=this.container.querySelector("#toggle-mod-friction"),m=this.container.querySelector("#group-mod-friction"),p=this.container.querySelector("#note-mod-friction"),M=this.container.querySelector("#warn-friction-mass"),b=!!(t.frictionModule&&t.frictionModule.enabled);h&&(h.textContent=b?"Attached":"Detached",h.classList.toggle("active",b)),m&&(m.style.display=b?"flex":"none"),p&&(p.style.display=b?"none":"block"),M&&(M.style.display=!t.hasMass&&b?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((C=t.frictionModule)==null?void 0:C.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((q=t.frictionModule)==null?void 0:q.dynamicFrictionMod)??1,2);const V=this.container.querySelector("#toggle-mod-bounce"),v=this.container.querySelector("#group-mod-bounce"),g=this.container.querySelector("#note-mod-bounce"),f=this.container.querySelector("#warn-bounce-mass"),w=!!(t.bounceModule&&t.bounceModule.enabled);V&&(V.textContent=w?"Attached":"Detached",V.classList.toggle("active",w)),v&&(v.style.display=w?"block":"none"),g&&(g.style.display=w?"none":"block"),f&&(f.style.display=!t.hasMass&&w?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const k=this.container.querySelector("#check-mod-vert-bounce"),R=this.container.querySelector("#warn-bounce-vert-vel");if(k&&(k.checked=!!((I=t.bounceModule)!=null&&I.verticalBounce)),R){const u=!!(w&&((U=t.bounceModule)!=null&&U.verticalBounce)&&!t.hasVerticalVelocity);R.style.display=u?"block":"none"}const T=this.container.querySelector("#toggle-mod-vert-pos"),O=this.container.querySelector("#group-mod-vert-pos"),z=this.container.querySelector("#note-mod-vert-pos"),A=t.hasVerticalPosition;T&&(T.textContent=A?"Attached":"Detached",T.classList.toggle("active",A)),O&&(O.style.display=A?"block":"none"),z&&(z.style.display=A?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const $=this.container.querySelector("#toggle-mod-vert-vel"),y=this.container.querySelector("#group-mod-vert-vel"),x=t.hasVerticalVelocity;$&&($.textContent=x?"Enabled":"Disabled",$.classList.toggle("active",x)),y&&(y.style.display=x?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const S=this.container.querySelector("#toggle-mod-gravity"),E=this.container.querySelector("#note-mod-gravity");S&&(S.textContent=t.hasGravity?"Attached":"Detached",S.classList.toggle("active",t.hasGravity)),E&&(E.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const L=this.container.querySelector("#toggle-mod-roll"),P=this.container.querySelector("#group-mod-roll"),W=this.container.querySelector("#note-roll-friction"),B=!!(t.rollModule&&t.rollModule.enabled);if(L&&(L.textContent=B?"Attached":"Detached",L.classList.toggle("active",B)),P&&(P.style.display=B?"block":"none"),W&&(W.style.display=B&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),i){const u=this.container.querySelector("#toggle-walk"),G=this.container.querySelector("#group-mod-walking"),X=this.container.querySelector("#warn-walk-friction"),Y=this.container.querySelector("#warn-walk-strength"),Z=!!(this.character.walkingModule&&this.character.walkingModule.enabled);u&&(u.textContent=Z?"Attached":"Detached",u.classList.toggle("active",Z)),G&&(G.style.display=Z?"flex":"none"),X&&(X.style.display=Z&&!this.character.hasFriction?"block":"none"),Y&&(Y.style.display=Z&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const N=this.container.querySelector("#toggle-strength"),gt=this.container.querySelector("#group-mod-strength"),st=!!(this.character.strengthModule&&this.character.strengthModule.enabled);N&&(N.textContent=st?"Attached":"Detached",N.classList.toggle("active",st)),gt&&(gt.style.display=st?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const lt=this.container.querySelector("#toggle-pickup"),pt=this.container.querySelector("#group-mod-pickup"),ot=!!(this.character.pickupModule&&this.character.pickupModule.enabled);lt&&(lt.textContent=ot?"Attached":"Detached",lt.classList.toggle("active",ot)),pt&&(pt.style.display=ot?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const at=this.container.querySelector("#toggle-throw"),vt=this.container.querySelector("#group-mod-throw"),nt=!!(this.character.throwModule&&this.character.throwModule.enabled);at&&(at.textContent=nt?"Attached":"Detached",at.classList.toggle("active",nt)),vt&&(vt.style.display=nt?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const ct=this.container.querySelector("#toggle-climb"),bt=this.container.querySelector("#group-mod-climb"),rt=this.container.querySelector("#warn-climb-deps"),tt=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(ct&&(ct.textContent=tt?"Attached":"Detached",ct.classList.toggle("active",tt)),bt&&(bt.style.display=tt?"block":"none"),rt){const K=!this.character.hasVerticalPosition,_=!this.character.hasStrength;rt.style.display=tt&&(K||_)?"block":"none",rt.textContent=K?"⚠️ Requires Vertical Position (3D Z-axis)":_?"⚠️ Requires Strength Ability to climb":""}if(this.character.climbingModule){const K=this.container.querySelector("#toggle-climb-walkoff");if(K){const J=!!this.character.climbingModule.preventWalkOff;K.textContent=J?"Active":"Inactive",K.classList.toggle("active",J)}const _=this.container.querySelector("#toggle-climb-sideways");if(_){const J=!!this.character.climbingModule.horizontalClimb;_.textContent=J?"Active":"Inactive",_.classList.toggle("active",J)}this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1),this.setSliderVal("slide-climb-hang","val-climb-hang",this.character.climbingModule.hangDistance,2)}}}setSliderVal(t,i,s,e){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${i}`);l&&(l.value=s.toString()),o&&(o.textContent=e>0?s.toFixed(e):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,i=this.container.querySelector("#creator-name");i&&(i.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const e=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");e&&(e.value=t.color),l&&(l.textContent=t.color);const o=this.container.querySelector("#creator-toggle-collider"),n=this.container.querySelector("#grp-creator-radius");o&&(o.textContent=t.hasCollider?"Attached":"Detached",o.classList.toggle("active",t.hasCollider)),n&&(n.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),d=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const c=this.container.querySelector("#creator-toggle-friction"),h=this.container.querySelector("#grp-creator-fric");c&&(c.textContent=t.hasFriction?"Attached":"Detached",c.classList.toggle("active",t.hasFriction)),h&&(h.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const m=this.container.querySelector("#creator-toggle-bounce"),p=this.container.querySelector("#grp-creator-bounce"),M=this.container.querySelector("#creator-check-vert-bounce"),b=this.container.querySelector("#creator-warn-bounce-vert");m&&(m.textContent=t.hasBounce?"Attached":"Detached",m.classList.toggle("active",t.hasBounce)),p&&(p.style.display=t.hasBounce?"block":"none"),M&&(M.checked=t.verticalBounce),b&&(b.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const V=this.container.querySelector("#creator-toggle-vert-pos"),v=this.container.querySelector("#grp-creator-vert-pos");V&&(V.textContent=t.hasVerticalPosition?"Attached":"Detached",V.classList.toggle("active",t.hasVerticalPosition)),v&&(v.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const g=this.container.querySelector("#creator-toggle-vert-vel");g&&(g.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",g.classList.toggle("active",t.hasVerticalVelocity));const f=this.container.querySelector("#creator-toggle-gravity");f&&(f.textContent=t.hasGravity?"Attached":"Detached",f.classList.toggle("active",t.hasGravity));const w=this.container.querySelector("#creator-toggle-roll"),k=this.container.querySelector("#group-creator-roll-resist");w&&(w.textContent=t.hasRollModule?"Enabled":"Disabled",w.classList.toggle("active",t.hasRollModule)),k&&(k.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var P,W,B,D,F,C,q,j,I,U;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(P=this.container.querySelector("#submode-entities"))==null||P.addEventListener("click",()=>{this.setEditTool("entities")}),(W=this.container.querySelector("#submode-walls"))==null||W.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var G;const u=this.entitySelectorEl.value;if(u===this.character.id)this.selectedEntity=this.character;else{const X=this.objects.find(Y=>Y.id===u);X&&(this.selectedEntity=X)}this.updateSelectorOptions(),this.syncEntitySliders(),(G=this.onSelectionChange)==null||G.call(this,this.selectedEntity)}),(B=this.container.querySelector("#btn-duplicate-entity"))==null||B.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(D=this.container.querySelector("#btn-delete-entity"))==null||D.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const i=this.container.querySelector("#toggle-mod-collider");i==null||i.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new dt({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",u=>{this.selectedEntity.colliderRadius=u},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new ht({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",u=>{this.selectedEntity.mass=u,this.updateSelectorOptions()},1);const e=this.container.querySelector("#toggle-mod-friction");e==null||e.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new ut,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",u=>{this.selectedEntity.staticGroundFrictionMod=u},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",u=>{this.selectedEntity.dynamicGroundFrictionMod=u},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new yt({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",u=>{this.selectedEntity.bounceMod=u},2);const o=this.container.querySelector("#check-mod-vert-bounce");o==null||o.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=o.checked),this.syncEntitySliders(),this.updateInspector()});const n=this.container.querySelector("#toggle-mod-vert-pos");n==null||n.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new ft({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",u=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=u),this.selectedEntity.position.z=u,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",u=>{this.selectedEntity.verticalVelocity=u},2);const d=this.container.querySelector("#toggle-mod-gravity");d==null||d.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new mt,this.syncEntitySliders()});const c=this.container.querySelector("#toggle-mod-roll");c==null||c.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new Mt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",u=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=u)},2);const h=this.container.querySelector("#toggle-walk");h==null||h.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new Rt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=u)},0),this.setupSlider("slide-walk-speed","val-walk-speed",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=u)},1);const m=this.container.querySelector("#toggle-strength");m==null||m.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new wt({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",u=>{this.character.strength=u},1);const p=this.container.querySelector("#toggle-pickup");p==null||p.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new Wt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",u=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=u)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",u=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=u)},2);const M=this.container.querySelector("#toggle-throw");M==null||M.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new Pt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",u=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=u)},1);const b=this.container.querySelector("#toggle-climb");b==null||b.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Ft,this.syncEntitySliders()});const V=this.container.querySelector("#toggle-climb-walkoff");V==null||V.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.preventWalkOff=!this.character.climbingModule.preventWalkOff),this.syncEntitySliders()});const v=this.container.querySelector("#toggle-climb-sideways");v==null||v.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.horizontalClimb=!this.character.climbingModule.horizontalClimb),this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",u=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=u)},0),this.setupSlider("slide-climb-speed","val-climb-speed",u=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=u)},1),this.setupSlider("slide-climb-hang","val-climb-hang",u=>{this.character.climbingModule&&(this.character.climbingModule.hangDistance=u)},2),this.setupSlider("slide-gravity","val-gravity",u=>{this.arena.gravity=u},1),this.setupSlider("slide-wall-height","val-wall-height",u=>{this.arena.setStandardWallHeight(u),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",u,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",u=>{this.arena.setStandardWallHeight(u),this.setSliderVal("slide-wall-height","val-wall-height",u,1)},1);const g=this.container.querySelector("#select-wall-preset");g==null||g.addEventListener("change",()=>{this.arena.loadWallPreset(g.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(F=this.container.querySelector("#btn-prev-wall-map"))==null||F.addEventListener("click",()=>{const u=Q.WALL_PRESETS,X=(u.findIndex(Y=>Y.id===this.arena.currentPresetId)-1+u.length)%u.length;this.arena.loadWallPreset(u[X].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(C=this.container.querySelector("#btn-next-wall-map"))==null||C.addEventListener("click",()=>{const u=Q.WALL_PRESETS,X=(u.findIndex(Y=>Y.id===this.arena.currentPresetId)+1)%u.length;this.arena.loadWallPreset(u[X].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(q=this.container.querySelector("#btn-reset-walls"))==null||q.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(j=this.container.querySelector("#btn-clear-walls"))==null||j.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",u=>{this.arena.frictionCoeff=u},1),this.setupSlider("slide-static-thresh","val-static-thresh",u=>{this.arena.staticFrictionThreshold=u},2),this.container.querySelectorAll(".preset-chip").forEach(u=>{u.addEventListener("click",()=>{const G=u.getAttribute("data-preset");G&&this.presets[G]&&(this.creatorState={...this.presets[G]},this.syncCreatorInputs())})});const w=this.container.querySelector("#creator-name");w==null||w.addEventListener("input",()=>{this.creatorState.name=w.value});const k=this.container.querySelector("#creator-toggle-shape");k==null||k.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",k.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",k.classList.toggle("active",this.creatorState.visualShape==="box")});const R=this.container.querySelector("#creator-color"),T=this.container.querySelector("#val-creator-color");R==null||R.addEventListener("input",()=>{this.creatorState.color=R.value,T&&(T.textContent=R.value)});const O=this.container.querySelector("#creator-toggle-collider");O==null||O.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,O.textContent=this.creatorState.hasCollider?"Attached":"Detached",O.classList.toggle("active",this.creatorState.hasCollider);const u=this.container.querySelector("#grp-creator-radius");u&&(u.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",u=>{this.creatorState.colliderRadius=u},2);const z=this.container.querySelector("#creator-toggle-mass");z==null||z.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,z.textContent=this.creatorState.hasMass?"Attached":"Detached",z.classList.toggle("active",this.creatorState.hasMass);const u=this.container.querySelector("#grp-creator-mass");u&&(u.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",u=>{this.creatorState.mass=u},1);const A=this.container.querySelector("#creator-toggle-friction");A==null||A.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,A.textContent=this.creatorState.hasFriction?"Attached":"Detached",A.classList.toggle("active",this.creatorState.hasFriction);const u=this.container.querySelector("#grp-creator-fric");u&&(u.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",u=>{this.creatorState.dynamicFrictionMod=u},2);const $=this.container.querySelector("#creator-toggle-bounce");$==null||$.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,$.textContent=this.creatorState.hasBounce?"Attached":"Detached",$.classList.toggle("active",this.creatorState.hasBounce);const u=this.container.querySelector("#grp-creator-bounce");u&&(u.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",u=>{this.creatorState.bounceMod=u},2);const y=this.container.querySelector("#creator-check-vert-bounce");y==null||y.addEventListener("change",()=>{this.creatorState.verticalBounce=y.checked,this.syncCreatorInputs()});const x=this.container.querySelector("#creator-toggle-vert-pos");x==null||x.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",u=>{this.creatorState.elevation=u},2);const S=this.container.querySelector("#creator-toggle-vert-vel");S==null||S.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const E=this.container.querySelector("#creator-toggle-gravity");E==null||E.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,E.textContent=this.creatorState.hasGravity?"Attached":"Detached",E.classList.toggle("active",this.creatorState.hasGravity)});const L=this.container.querySelector("#creator-toggle-roll");L==null||L.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,L.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",L.classList.toggle("active",this.creatorState.hasRollModule);const u=this.container.querySelector("#group-creator-roll-resist");u&&(u.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",u=>{this.creatorState.rollResistance=u},2),(I=this.container.querySelector("#btn-spawn-configured"))==null||I.addEventListener("click",()=>{this.spawnFromCreator()}),(U=this.container.querySelector("#btn-clear-entities"))==null||U.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,i=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),e=new it({name:t.name||"Custom Object",position:{x:i,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new dt({radius:t.colliderRadius}):null,massModule:t.hasMass?new ht({mass:t.mass}):null,frictionModule:t.hasFriction?new ut({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new yt({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new ft({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new mt:null,rollModule:t.hasRollModule?new Mt({rollResistance:t.rollResistance}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,i=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),e=new it({name:`${t.name} (Copy)`,position:{x:i,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new dt({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new ht({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new ut({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new yt({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new ft({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new mt({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new Mt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,i,s,e=0){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${i}`);!l||!o||l.addEventListener("input",()=>{const n=parseFloat(l.value);o.textContent=e>0?n.toFixed(e):Math.round(n).toString(),s(n)})}updateInspector(){var e;const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
      <div class="inspect-item">
        <span class="inspect-k">Selected</span>
        <span class="inspect-v highlight-held">${t.name}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Position (X, Y)</span>
        <span class="inspect-v">${t.position.x.toFixed(2)}, ${t.position.y.toFixed(2)} u</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Height (Z)</span>
        <span class="inspect-v ${t.isAboveGround?"highlight-z":""}">${t.position.z.toFixed(2)} u</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Surface</span>
        <span class="inspect-v ${t.supportingSurfaceHeight>.05&&t.isRestingOnSurface?"highlight-held":""}">${t.isRestingOnSurface?t.supportingSurfaceHeight>.05?`Wall Top (${t.supportingSurfaceHeight.toFixed(1)}u)`:"Ground (0.0u)":`Airborne (${t.verticalVelocity.toFixed(1)}u/s)`}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Linear Speed</span>
        <span class="inspect-v">${i} u/s</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Collider</span>
        <span class="inspect-v ${t.hasCollider?"":"highlight-held"}">${t.hasCollider?`Radius ${t.colliderRadius.toFixed(2)}u`:"Detached (Passes through)"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Mass</span>
        <span class="inspect-v ${t.hasMass?"":"highlight-held"}">${t.hasMass?`${t.mass.toFixed(1)} kg`:"Massless (0kg)"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Friction</span>
        <span class="inspect-v ${t.hasFriction?"":"highlight-held"}">${t.hasFriction?`${t.dynamicGroundFrictionMod.toFixed(2)}`:"Zero Friction"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Bounciness</span>
        <span class="inspect-v ${t.hasBounce?"":"highlight-held"}">${t.hasBounce&&t.bounceMod!==null?`${t.bounceMod.toFixed(2)} (Vert: ${t.hasVerticalBounce?"On":"Off"})`:"Zero Bounce"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Vertical Position</span>
        <span class="inspect-v ${t.hasVerticalPosition?"":"highlight-held"}">${t.hasVerticalPosition?`${t.position.z.toFixed(2)} u`:"Detached (2D Flat)"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Vertical Velocity</span>
        <span class="inspect-v ${t.hasVerticalVelocity?"":"highlight-held"}">${t.hasVerticalVelocity?`${t.verticalVelocity.toFixed(2)} u/s`:"Disabled (0 u/s)"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Gravity</span>
        <span class="inspect-v ${t.hasGravity?"":"highlight-held"}">${t.hasGravity?"Standard Gravity":"Zero-G (Constant Z)"}</span>
      </div>
      ${t.rollModule&&t.rollModule.enabled?`
      <div class="inspect-item">
        <span class="inspect-k">3D Angular Vel</span>
        <span class="inspect-v highlight-z">(${t.rollModule.angularVelocity.x.toFixed(1)}, ${t.rollModule.angularVelocity.y.toFixed(1)}, ${t.rollModule.angularVelocity.z.toFixed(1)}) rad/s</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Roll Resistance</span>
        <span class="inspect-v ${t.rollModule.rollResistance===0?"highlight-held":""}">${t.rollModule.rollResistance.toFixed(2)} u/s²</span>
      </div>
      `:""}
      ${s?`
      <div class="inspect-item">
        <span class="inspect-k">Base / Total Mass</span>
        <span class="inspect-v ${this.character.heldObject?"highlight-held":""}">${this.character.baseMass.toFixed(1)}kg ${this.character.heldObject?`(+${this.character.carriedMass.toFixed(1)}kg = ${this.character.mass.toFixed(1)}kg)`:""}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Walk Traction</span>
        <span class="inspect-v ${this.character.hasFriction?"":"highlight-held"}">${this.character.hasFriction?"Grip OK":"Slipping (No Friction)"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Held Freebody</span>
        <span class="inspect-v ${this.character.heldObject?"highlight-held":""}">${this.character.heldObject?`${this.character.heldObject.name} (${this.character.heldObject.hasMass?`${this.character.heldObject.mass}kg`:"Massless"})`:"None"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Ledge Hang Limit</span>
        <span class="inspect-v">${(((e=this.character.climbingModule)==null?void 0:e.hangDistance)??.1).toFixed(2)} u</span>
      </div>
      `:""}
    `}renderWallPresetOptions(){return Q.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=Q.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=Q.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const i=this.container.querySelector("#label-wall-map-badge");i&&(i.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class Bt{constructor(t){r(this,"arena");r(this,"character");r(this,"objects");r(this,"renderer");r(this,"inputManager");r(this,"devPanel");r(this,"isRunning",!1);r(this,"lastTime",0);r(this,"accumulator",0);r(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const e=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,e,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const i=this.inputManager;i.draggedEntity!==this.character?this.character.updateCharacter(t,i.movementVector,i.isMouseDown&&!this.devPanel.isEditMode,i.mousePos,this.arena,i.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const e of this.objects)i.draggedEntity!==e&&e.updatePosition(t,this.arena);const s=i.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const e=this.character.pickupModule.findTargetObject(this.character,i.mousePos.x,i.mousePos.y,this.objects,this.arena.wallHeight);e&&(this.character.pickupModule.pickup(this.character,e),i.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],i=this.inputManager,s=3;for(let e=0;e<s;e++)for(let l=0;l<t.length;l++)for(let o=l+1;o<t.length;o++){const n=t[l],a=t[o];if(n.isHeld||a.isHeld||n===i.draggedEntity||a===i.draggedEntity||!n.hasCollider||!a.hasCollider)continue;const d=this.arena.wallHeight-.15,c=n.position.z>=d||n.supportingSurfaceHeight>=d||n.standingWall!==null||n.isAboveWalls,h=a.position.z>=d||a.supportingSurfaceHeight>=d||a.standingWall!==null||a.isAboveWalls;if(c!==h)continue;const m=a.position.x-n.position.x,p=a.position.y-n.position.y,M=m*m+p*p,b=n.colliderRadius+a.colliderRadius;if(M<b*b&&M>1e-6){const V=Math.sqrt(M),v=b-V,g=m/V,f=p/V,w=a.velocity.x-n.velocity.x,k=a.velocity.y-n.velocity.y,R=w*g+k*f,T=!n.hasMass,O=!a.hasMass;if(T&&O){if(n.position.x-=g*v*.5,n.position.y-=f*v*.5,a.position.x+=g*v*.5,a.position.y+=f*v*.5,R<0){const S=-R*.5;n.velocity.x-=S*g,n.velocity.y-=S*f,a.velocity.x+=S*g,a.velocity.y+=S*f}continue}if(!T&&O){this.isEntityPinnedAgainstWall(a,g,f)?(n.position.x-=g*v,n.position.y-=f*v,n.velocity.x=0,n.velocity.y=0):(a.position.x+=g*v,a.position.y+=f*v,R<0&&(a.velocity.x+=(n.velocity.x-a.velocity.x)*Math.abs(g),a.velocity.y+=(n.velocity.y-a.velocity.y)*Math.abs(f)));continue}if(T&&!O){this.isEntityPinnedAgainstWall(n,-g,-f)?(a.position.x+=g*v,a.position.y+=f*v,a.velocity.x=0,a.velocity.y=0):(n.position.x-=g*v,n.position.y-=f*v,R<0&&(n.velocity.x+=(a.velocity.x-n.velocity.x)*Math.abs(g),n.velocity.y+=(a.velocity.y-n.velocity.y)*Math.abs(f)));continue}const z=1/n.mass,A=1/a.mass,$=z+A;if($<=1e-4)continue;const y=z/$,x=A/$;if(n.position.x-=g*v*y,n.position.y-=f*v*y,a.position.x+=g*v*x,a.position.y+=f*v*x,R<0){const S=n instanceof xt&&n.isActivelyWalking||a instanceof xt&&a.isActivelyWalking,E=n.hasBounce&&a.hasBounce,L=n.isCharacter||!n.hasBounce?0:n.bounceMod??0,P=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,B=-(1+(S||!E?0:Math.max(0,Math.min(.98,Math.max(L,P)))))*R/$;n.velocity.x-=B*z*g,n.velocity.y-=B*z*f,a.velocity.x+=B*A*g,a.velocity.y+=B*A*f;const D=-f,F=g,C=w*D+k*F;if(Math.abs(C)>.001){const q=.35*Math.sqrt(n.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),j=.4,I=Math.abs(C)/($*(1+1/j)),U=q*Math.abs(B),u=Math.min(I,U)*Math.sign(C);if(n.velocity.x+=u*z*D,n.velocity.y+=u*z*F,a.velocity.x-=u*A*D,a.velocity.y-=u*A*F,n.rollModule&&n.rollModule.enabled){const G=u/(j*n.mass*n.colliderRadius);n.rollModule.angularVelocity.z+=G,n.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,n.rollModule.angularVelocity.z)),n.isRestingOnSurface&&(n.rollModule.angularVelocity.y=n.velocity.x/n.colliderRadius,n.rollModule.angularVelocity.x=-n.velocity.y/n.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const G=u/(j*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=G,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,i,s){const e=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(i>.3&&t.position.x>=this.arena.width-e-l||i<-.3&&t.position.x<=e+l||s>.3&&t.position.y>=this.arena.height-e-l||s<-.3&&t.position.y<=e+l)return!0;for(const o of this.arena.walls)if(t.position.z<o.wallHeight-.05){const n=t.position.x+i*l,a=t.position.y+s*l,d=Math.max(o.x,Math.min(n,o.x+o.width)),c=Math.max(o.y,Math.min(a,o.y+o.height)),h=n-d,m=a-c;if(h*h+m*m<e*e)return!0}return!1}}function zt(){const H=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!H||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=H.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new Q(20,14,1);H.width=1e3,H.height=700;const e=new xt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new it({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new it({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new it({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new it({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new Mt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})];s.syncEntitiesWithWalls([e,...l]);const o=new et(i),n=new Lt({container:t,character:e,arena:s,objects:l,onSpawnObject:c=>{s.syncEntitiesWithWalls([c]),l.push(c),n.updateSelectorOptions()},onDeleteObject:c=>{const h=l.indexOf(c);h!==-1&&l.splice(h,1),n.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),l.length=0,n.updateSelectorOptions()}}),a=new At(H,s);a.handleInteractions(e,s,l,n),n.onSelectionChange=c=>{a.selectedCanvasEntity=c},new Bt({arena:s,character:e,objects:l,renderer:o,inputManager:a,devPanel:n}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",zt);

var Ft=Object.defineProperty;var Dt=(L,t,i)=>t in L?Ft(L,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):L[t]=i;var r=(L,t,i)=>Dt(L,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const l of e)if(l.type==="childList")for(const n of l.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function i(e){const l={};return e.integrity&&(l.integrity=e.integrity),e.referrerPolicy&&(l.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?l.credentials="include":e.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(e){if(e.ep)return;e.ep=!0;const l=i(e);fetch(e.href,l)}})();class yt{constructor(t={}){r(this,"z");r(this,"hasVerticalVelocity");r(this,"verticalVelocity");r(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const xt=class xt{constructor(t=20,i=14,s=1){r(this,"width");r(this,"height");r(this,"tileSize");r(this,"cols");r(this,"rows");r(this,"wallHeight");r(this,"gravity");r(this,"frictionCoeff");r(this,"staticFrictionThreshold");r(this,"tileGrid");r(this,"walls",[]);r(this,"currentPresetId","trenches");this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("trenches")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,i,s){if(t<0||t>=this.cols||i<0||i>=this.rows)return!1;const e=s?1:0;return this.tileGrid[i][t]===e?!1:(this.tileGrid[i][t]=e,this.rebuildWalls(),!0)}hasWall(t,i){return t<0||t>=this.cols||i<0||i>=this.rows?!1:this.tileGrid[i][t]===1}loadWallPreset(t,i){const s=xt.WALL_PRESETS.find(e=>e.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(i),!0):!1}syncEntitiesWithWalls(t){var i;if(t)for(const s of t){const e=s.hasCollider?s.colliderRadius:((i=s.colliderModule)==null?void 0:i.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,e);l&&s.position.z<l.wallHeight&&(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new yt({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.standingWall=l,s.verticalVelocity=0)}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("trenches",t)}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),n=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,a=i-n;return o*o+a*a<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}areWallsContiguous(t,i){if(t.id===i.id)return!0;const s=Math.max(0,Math.max(t.x,i.x)-Math.min(t.x+t.width,i.x+i.width)),e=Math.max(0,Math.max(t.y,i.y)-Math.min(t.y+t.height,i.y+i.height)),l=Math.min(t.x+t.width,i.x+i.width)-Math.max(t.x,i.x),n=Math.min(t.y+t.height,i.y+i.height)-Math.max(t.y,i.y);return s<.001&&n>.05||e<.001&&l>.05}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}};r(xt,"WALL_PRESETS",[{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>1));for(let e=2;e<=17;e++)s[3][e]=0,s[7][e]=0,s[10][e]=0;for(let e=2;e<=11;e++)s[e][5]=0,s[e][10]=0,s[e][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let e=5;e<=9;e++)s[e][2]=0;for(let e=5;e<=9;e++)s[e][17]=0;for(let e=2;e<=5;e++)s[5][e]=0;for(let e=10;e<=14;e++)s[5][e]=0;for(let e=5;e<=10;e++)s[9][e]=0;for(let e=14;e<=17;e++)s[9][e]=0;return s[7][5]=0,s}},{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=10;for(let l=1;l<=4;l++)s[l][e]=1;for(let l=8;l<=12;l++)s[l][e]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=2;e<=4;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=9;e<=11;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=6;e<=7;e++)for(let l=9;l<=10;l++)s[e][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,n]of e)s[n][l]=1,s[n+1][l]=1,s[n][l+1]=1,s[n+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=1;e<=9;e++)s[e][4]=1;for(let e=4;e<=12;e++)s[e][7]=1;for(let e=1;e<=9;e++)s[e][10]=1;for(let e=4;e<=12;e++)s[e][13]=1;for(let e=1;e<=9;e++)s[e][16]=1;for(let e=7;e<=10;e++)s[4][e]=1;for(let e=13;e<=16;e++)s[4][e]=1;for(let e=4;e<=7;e++)s[9][e]=1;for(let e=10;e<=13;e++)s[9][e]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,i)=>Array.from({length:i},()=>Array.from({length:t},()=>0))}]);let rt=xt;class gt{constructor(t={}){r(this,"radius");r(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class pt{constructor(t={}){r(this,"mass");r(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class vt{constructor(t={}){r(this,"staticFrictionMod");r(this,"dynamicFrictionMod");r(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class bt{constructor(t={}){r(this,"bounceMod");r(this,"verticalBounce");r(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class ft{constructor(t={}){r(this,"enabled");this.enabled=t.enabled??!0}}class ht{constructor(t={}){r(this,"id");r(this,"name");r(this,"position");r(this,"velocity");r(this,"color");r(this,"isHeld");r(this,"heldBy");r(this,"lastThrower",null);r(this,"isCharacter",!1);r(this,"isClimbing",!1);r(this,"visualShape","circle");r(this,"colliderModule",null);r(this,"massModule",null);r(this,"frictionModule",null);r(this,"bounceModule",null);r(this,"verticalPositionModule",null);r(this,"gravityModule",null);r(this,"rollModule",null);r(this,"supportingSurfaceHeight",0);r(this,"standingWall",null);var i,s,e,l,n;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((n=t.velocity)==null?void 0:n.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new gt({radius:t.colliderRadius}):new gt({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new pt({mass:t.mass}):new pt({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new vt({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new bt({bounceMod:t.bounceMod}):new bt({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new yt({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new ft,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new gt({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new pt({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new vt({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new vt({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new bt({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.85||this.supportingSurfaceHeight>=.85||this.standingWall!==null)}updatePosition(t,i){var v,f,M,k,S,R,C,B,P,F,$,U,X,H,j,I,Z,K,A,Y,_,tt,et,J,it,st;if(this.isHeld)return;if(this.lastThrower){const d=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,u=(((v=this.lastThrower.pickupModule)==null?void 0:v.pickupReach)??1.3)+this.colliderRadius+d;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>u||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0;if(this.hasCollider&&this.hasVerticalPosition&&i.walls.length>0)if(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05&&this.position.z>=i.wallHeight-.2||this.standingWall!==null){const u=this.isCharacter?this:null;if(!!((f=u==null?void 0:u.climbingModule)!=null&&f.isDismountFreefall||(M=u==null?void 0:u.climbingModule)!=null&&M.climbSuppressedUntilRePress))this.standingWall=null,s=0;else if(this.standingWall){const V=Math.max(.01,((k=u==null?void 0:u.climbingModule)==null?void 0:k.hangDistance)??.1);if((S=u==null?void 0:u.climbingModule)!=null&&S.dismountWalkOffDisabled&&!i.testWallOverlap(this.position.x,this.position.y,V,this.standingWall))this.standingWall=null,s=0,u!=null&&u.climbingModule&&(u.climbingModule.dismountSourceWall=null,u.climbingModule.isDismountFreefall=!0,u.climbingModule.climbSuppressedUntilRelease=!0);else{const E=(R=u==null?void 0:u.climbingModule)!=null&&R.enabled&&((C=u==null?void 0:u.climbingModule)!=null&&C.preventWalkOff)&&!((B=u==null?void 0:u.climbingModule)!=null&&B.dismountWalkOffDisabled)?Math.max(this.colliderRadius,u.climbingModule.hangDistance):this.colliderRadius;if(i.testWallOverlap(this.position.x,this.position.y,E,this.standingWall))s=this.standingWall.wallHeight;else if((P=u==null?void 0:u.climbingModule)!=null&&P.dismountSuppressedUntilRelease)s=this.standingWall.wallHeight;else{let T=null;for(const W of i.walls)if(i.areWallsContiguous(this.standingWall,W)&&i.testWallOverlap(this.position.x,this.position.y,E,W)){T=W;break}T?(this.standingWall=T,s=T.wallHeight):(this.standingWall=null,s=0,u!=null&&u.climbingModule&&(u.climbingModule.isDismountFreefall=!0,u.climbingModule.climbSuppressedUntilRelease=!0))}}}else if(!this.isClimbing&&(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05)){const V=(F=u==null?void 0:u.climbingModule)!=null&&F.enabled&&(($=u==null?void 0:u.climbingModule)!=null&&$.preventWalkOff)?Math.max(this.colliderRadius,u.climbingModule.hangDistance):this.colliderRadius,E=i.getSupportingWall(this.position.x,this.position.y,V);E&&(this.standingWall=E,s=E.wallHeight)}}else this.standingWall=null;if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const d=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const u=this.rollModule,w=this.colliderRadius>0?this.colliderRadius:.3,V=.4,E=this.bounceMod,O=(1+E)*this.mass*d,T=i.frictionCoeff*this.dynamicGroundFrictionMod*.05,W=this.velocity.x-u.angularVelocity.y*w,G=this.velocity.y+u.angularVelocity.x*w,q=Math.hypot(W,G);if(q>.001&&T>0){const z=T*O,N=q*this.mass/(1+1/V),Q=Math.min(N,z),lt=W/q*Q,nt=G/q*Q;this.velocity.x-=lt/this.mass,this.velocity.y-=nt/this.mass,u.angularVelocity.y+=lt/(V*this.mass*w),u.angularVelocity.x-=nt/(V*this.mass*w)}const D=Math.max(.65,1-(1-E)*.35);u.angularVelocity.x*=D,u.angularVelocity.y*=D,u.angularVelocity.z*=D}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((U=this.walkingModule)==null?void 0:U.enabled)))if(this.rollModule&&this.rollModule.enabled){const u=this.rollModule,w=this.colliderRadius>0?this.colliderRadius:.3,V=i.frictionCoeff*this.dynamicGroundFrictionMod,E=.4,O=this.velocity.x-u.angularVelocity.y*w,T=this.velocity.y+u.angularVelocity.x*w,W=Math.hypot(O,T);if(V>0&&W>.001){const q=V*(1+1/E)*t;if(W<=q){const D=this.velocity.x+E*u.angularVelocity.y*w,z=this.velocity.y-E*u.angularVelocity.x*w,N=D/(1+E),Q=z/(1+E);this.velocity.x=N,this.velocity.y=Q,u.angularVelocity.y=N/w,u.angularVelocity.x=-Q/w}else{const D=O/W*V*t,z=T/W*V*t;this.velocity.x-=D,this.velocity.y-=z,u.angularVelocity.y+=D/(E*w),u.angularVelocity.x-=z/(E*w)}}const G=Math.hypot(this.velocity.x,this.velocity.y);if(G>0){if(u.rollResistance>0){const q=u.rollResistance*t,D=Math.max(0,G-q);if(D<.005)this.velocity.x=0,this.velocity.y=0,u.angularVelocity.x=0,u.angularVelocity.y=0;else{const z=D/G;this.velocity.x*=z,this.velocity.y*=z,u.angularVelocity.x*=z,u.angularVelocity.y*=z}}}else{const q=Math.hypot(u.angularVelocity.x,u.angularVelocity.y);if(q>0&&V>0){const D=V/(E*w)*t,z=Math.max(0,q-D),N=q>0?z/q:0;u.angularVelocity.x*=N,u.angularVelocity.y*=N}}if(Math.abs(u.angularVelocity.z)>.001&&u.rollResistance>0){const q=u.rollResistance/(E*w)*t,D=Math.sign(u.angularVelocity.z),z=Math.abs(u.angularVelocity.z);u.angularVelocity.z=z<=q?0:D*(z-q)}u.updateVisualPhase(t)}else{const u=Math.hypot(this.velocity.x,this.velocity.y);if(u>0){const w=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(u<w)this.velocity.x=0,this.velocity.y=0;else{const V=i.frictionCoeff*this.dynamicGroundFrictionMod*t,O=Math.max(0,u-V)/u;this.velocity.x*=O,this.velocity.y*=O}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);const l=this.isCharacter?this:null,n=!this.isClimbing&&this.supportingSurfaceHeight>=i.wallHeight-.05&&this.standingWall!==null;!!(n&&(l!=null&&l.isClimbInputHeld)&&!((X=l==null?void 0:l.climbingModule)!=null&&X.dismountSuppressedUntilRelease))&&(l!=null&&l.climbingModule)&&(l.climbingModule.dismountWalkOffDisabled=!0,l.climbingModule.dismountSourceWall=this.standingWall);const a=Math.max(.01,((H=l==null?void 0:l.climbingModule)==null?void 0:H.hangDistance)??.1);if((j=l==null?void 0:l.climbingModule)!=null&&j.dismountWalkOffDisabled&&this.standingWall){const d=l.climbingModule.dismountSourceWall??this.standingWall;let u=1/0;const w=[d];for(const V of i.walls)V.id!==d.id&&i.areWallsContiguous(d,V)&&w.push(V);for(const V of w){const E=Math.max(V.x,Math.min(this.position.x,V.x+V.width)),O=Math.max(V.y,Math.min(this.position.y,V.y+V.height)),T=Math.hypot(this.position.x-E,this.position.y-O);T<u&&(u=T)}u>a&&(l.climbingModule.dismountSourceWall=null,this.standingWall=null,this.supportingSurfaceHeight=0,l.climbingModule.isDismountFreefall=!0,l.climbingModule.climbSuppressedUntilRelease=!0)}if((I=l==null?void 0:l.climbingModule)!=null&&I.dismountWalkOffDisabled){if(this.position.z<=.01)l.climbingModule.dismountWalkOffDisabled=!1,l.climbingModule.dismountSourceWall=null;else if(!l.climbingModule.dismountSourceWall){let d=1/0;for(const u of i.walls){const w=Math.max(u.x,Math.min(this.position.x,u.x+u.width)),V=Math.max(u.y,Math.min(this.position.y,u.y+u.height)),E=Math.hypot(this.position.x-w,this.position.y-V);E<d&&(d=E)}d<=a&&(l.climbingModule.dismountWalkOffDisabled=!1)}}let h=!1;if(this.standingWall){const d=[this.standingWall];for(const w of i.walls)w.id!==this.standingWall.id&&i.areWallsContiguous(this.standingWall,w)&&d.push(w);let u=1/0;for(const w of d){const V=Math.max(w.x,Math.min(this.position.x,w.x+w.width)),E=Math.max(w.y,Math.min(this.position.y,w.y+w.height)),O=Math.hypot(this.position.x-V,this.position.y-E);O<u&&(u=O)}h=u<=a+.002}const c=!!(n&&(l!=null&&l.isClimbInputHeld)&&!((Z=l==null?void 0:l.climbingModule)!=null&&Z.dismountSuppressedUntilRelease)),g=!!(l&&n&&((K=l.climbingModule)!=null&&K.enabled)&&((A=l.climbingModule)!=null&&A.preventWalkOff)&&!c&&!((Y=l.climbingModule)!=null&&Y.dismountWalkOffDisabled)&&h),b=this.velocity.x*t,y=this.velocity.y*t,p=Math.hypot(b,y);if(p>1e-4)if(g){const d=Math.max(.01,((_=l==null?void 0:l.climbingModule)==null?void 0:_.hangDistance)??.1);let u=this.standingWall??i.getSupportingWall(this.position.x,this.position.y,d);this.standingWall=u;const w=this.position.x+b,V=this.position.y+y,E=[];if(u){E.push(u);for(const T of i.walls)T.id!==u.id&&i.areWallsContiguous(u,T)&&E.push(T)}let O=null;for(const T of E)if(i.testWallOverlap(w,V,d,T)){O=T;break}if(O)this.position.x=w,this.position.y=V,this.standingWall=O;else if(E.length>0){let T=1/0,W=null;for(const G of E){const q=Math.max(G.x,Math.min(w,G.x+G.width)),D=Math.max(G.y,Math.min(V,G.y+G.height)),z=w-q,N=V-D,Q=z*z+N*N;Q<T&&(T=Q,W={wall:G,closestX:q,closestY:D,dist:Math.sqrt(Q),dx:z,dy:N})}if(W&&W.dist>0){const G=W.dx/W.dist,q=W.dy/W.dist,D=this.velocity.x*G+this.velocity.y*q;D>0&&(this.velocity.x-=D*G,this.velocity.y-=D*q);const z=d-.002;W.dist>z?(this.position.x=W.closestX+G*z,this.position.y=W.closestY+q*z):(this.position.x=w,this.position.y=V);const N=i.testWallOverlap(this.position.x,this.position.y,d,W.wall)?W.wall:E.find(Q=>i.testWallOverlap(this.position.x,this.position.y,d,Q));N&&(this.standingWall=N)}else this.velocity.x=0,this.velocity.y=0}}else{const u=Math.max(1,Math.ceil(p/.01)),w=b/u,V=y/u;let E=this.standingWall??(n?i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null),O=!1;for(let T=1;T<=u;T++){const W=this.position.x+w,G=this.position.y+V;if(E){let D=null;if(i.testWallOverlap(W,G,this.colliderRadius,E))D=E;else for(const z of i.walls)if(i.areWallsContiguous(E,z)&&i.testWallOverlap(W,G,this.colliderRadius,z)){D=z;break}D?(E=D,this.standingWall=D):(tt=l==null?void 0:l.climbingModule)!=null&&tt.dismountSuppressedUntilRelease||(O=!0,E=null,this.standingWall=null,this.supportingSurfaceHeight=0,l!=null&&l.climbingModule&&(l.climbingModule.isDismountFreefall=!0,l.climbingModule.climbSuppressedUntilRelease=!0))}if(this.position.x=W,this.position.y=G,!this.isClimbing&&(O||!this.standingWall&&!!((et=l==null?void 0:l.climbingModule)!=null&&et.isDismountFreefall||(J=l==null?void 0:l.climbingModule)!=null&&J.climbSuppressedUntilRePress))&&this.hasCollider)for(const D of i.walls)this.position.z<=D.wallHeight&&this.resolveWallCollision(D)}}if(this.hasCollider){const d=this.colliderRadius,u=d,w=i.width-d,V=d,E=i.height-d,O=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<u?(this.position.x=u,this.resolveWallImpact(1,0,O)):this.position.x>w&&(this.position.x=w,this.resolveWallImpact(-1,0,O)),this.position.y<V?(this.position.y=V,this.resolveWallImpact(0,1,O)):this.position.y>E&&(this.position.y=E,this.resolveWallImpact(0,-1,O));const T=!!((it=l==null?void 0:l.climbingModule)!=null&&it.isDismountFreefall||(st=l==null?void 0:l.climbingModule)!=null&&st.climbSuppressedUntilRePress);for(const W of i.walls)if(this.position.z<=W.wallHeight&&(this.position.z<W.wallHeight-.05||T||this.standingWall===null)){if(this.standingWall&&(this.standingWall.id===W.id||i.areWallsContiguous(this.standingWall,W)))continue;this.resolveWallCollision(W)}}const m=16,x=Math.hypot(this.velocity.x,this.velocity.y);if(x>m){const d=m/x;this.velocity.x*=d,this.velocity.y*=d}if(this.rollModule&&this.rollModule.enabled){const u=this.rollModule.angularSpeed;if(u>35){const w=35/u;this.rollModule.angularVelocity.x*=w,this.rollModule.angularVelocity.y*=w,this.rollModule.angularVelocity.z*=w}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}static getClosestWallPoint(t,i,s){if(!s.walls||s.walls.length===0)return null;let e=1/0,l=null;for(const n of s.walls){const o=Math.max(n.x,Math.min(t,n.x+n.width)),a=Math.max(n.y,Math.min(i,n.y+n.height)),h=t-o,c=i-a,g=h*h+c*c;g<e&&(e=g,l={wall:n,closestX:o,closestY:a,dist:Math.sqrt(g),dx:h,dy:c})}return l}resolveWallImpact(t,i,s){this.lastThrower=null;const e=this.velocity.x*t+this.velocity.y*i;if(e>=0)return;const l=e;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*i):(this.velocity.x-=l*t,this.velocity.y-=l*i),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const n=this.rollModule,o=this.colliderRadius>0?this.colliderRadius:.3,a=.4,h=.35,c=-i,g=t,b=this.velocity.x*c+this.velocity.y*g,y=-(1+s)*this.mass*l,p=b-n.angularVelocity.z*o,m=Math.abs(p)*this.mass/(1+1/a),x=h*y,v=Math.min(m,x),f=-Math.sign(p)*v,M=b,k=M+f/this.mass,S=Math.abs(k)<=Math.abs(M)+.01?k-M:-M*.1;this.velocity.x+=S*c,this.velocity.y+=S*g;const C=-(S*this.mass)/(a*this.mass*o);n.angularVelocity.z+=C,n.angularVelocity.z=Math.max(-30,Math.min(30,n.angularVelocity.z)),n.angularVelocity.y=this.velocity.x/o,n.angularVelocity.x=-this.velocity.y/o}}resolveWallCollision(t){var b;if(!this.hasCollider)return;const i=this.isCharacter?this:null,s=!!(i!=null&&i.isClimbing&&this.position.z>0&&this.position.z<=t.wallHeight),e=((b=i==null?void 0:i.climbingModule)==null?void 0:b.hangDistance)??.1,l=s?Math.max(0,Math.min(1,this.position.z/t.wallHeight)):0,n=s?this.colliderRadius-l*(this.colliderRadius-e):this.colliderRadius,o=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),a=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),h=this.position.x-o,c=this.position.y-a,g=h*h+c*c;if(g<n*n){this.lastThrower=null;const y=Math.sqrt(g);let p=0,m=0,x=0;if(y===0){const f=Math.abs(this.position.x-t.x),M=Math.abs(t.x+t.width-this.position.x),k=Math.abs(this.position.y-t.y),S=Math.abs(t.y+t.height-this.position.y),R=Math.min(f,M,k,S);R===f?(p=-1,x=f+n):R===M?(p=1,x=M+n):R===k?(m=-1,x=k+n):(m=1,x=S+n)}else x=n-y,p=h/y,m=c/y;this.position.x+=p*x,this.position.y+=m*x;const v=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(p,m,v)}}}class Ct{constructor(){r(this,"id","walking");r(this,"name","Walking Module");r(this,"enabled",!0);r(this,"maxWalkForce",35);r(this,"maxWalkSpeed",5.2);r(this,"dragDamping",8.01)}update(t,i,s,e){var B;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((B=t.frictionModule)!=null&&B.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(i.x,i.y),n=l>.05;if(t.isActivelyWalking=n,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const h=e.frictionCoeff/10,c=a*h,b=t.carriedMass/(Math.max(.1,t.strength)*8),y=this.maxWalkSpeed/(1+b);let p=0,m=0;if(n){const P=i.x/l,F=i.y/l;p=P*y,m=F*y}const x=p-t.velocity.x,v=m-t.velocity.y,f=Math.hypot(x,v);if(f<.001){t.velocity.x=p,t.velocity.y=m;return}const M=Math.hypot(t.velocity.x,t.velocity.y),k=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),S=t.hasMass?Math.max(.2,t.baseMass):1,C=this.maxWalkForce*t.strength/S*c*s;if(f<=C||!n&&M<k)t.velocity.x=p,t.velocity.y=m;else{const P=C/f;t.velocity.x+=x*P,t.velocity.y+=v*P}}}class Wt{constructor(){r(this,"id","pickup");r(this,"name","Pickup Ability");r(this,"enabled",!0);r(this,"pickupReach",1.3);r(this,"crossLayerReachRatio",.55)}isObjectInReach(t,i,s=1){var c;if(!this.enabled||i===t||i.isHeld||i.isCharacter||i.lastThrower===t)return!1;const e=t.position.z>=s-.05?1:0,l=i.position.z>=s-.05?1:0,o=e!==l?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,a=i.hasCollider?i.colliderRadius:((c=i.colliderModule)==null?void 0:c.radius)??.32;return Math.hypot(i.position.x-t.position.x,i.position.y-t.position.y)<=o+a}findTargetObject(t,i,s,e,l=1){if(!this.enabled)return null;let n=null,o=1/0;for(const a of e){if(!this.isObjectInReach(t,a,l))continue;const h=Math.hypot(a.position.x-i,a.position.y-s);h<o&&(o=h,n=a)}return n}pickup(t,i){if(!this.enabled||t.heldObject)return!1;const s=i.velocity.x,e=i.velocity.y,l=i.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=e*l,t.isAboveGround&&Math.abs(i.verticalVelocity)>.1&&(t.verticalVelocity+=i.verticalVelocity*l),t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=i.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const i=t.heldObject;return t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.velocity.x=t.velocity.x*.4,i.velocity.y=t.velocity.y*.4,i.verticalVelocity=0,i}}class Rt{constructor(){r(this,"id","throw");r(this,"name","Throw Ability");r(this,"enabled",!0);r(this,"baseThrowForce",7.6);r(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),n=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,a=i-n;return o*o+a*a<s*s}computeLaunchVelocity(t,i,s,e,l,n,o,a=!0,h=!0,c=.35){const g=e-t,b=l-i,y=Math.hypot(g,b);if(y<.1)return null;const p=Math.min(y,this.maxThrowAimDistance),m=g/y,x=b/y,v=t+m*p,f=i+x*p;if(!a||!h){const j=Math.max(3,o),I=Math.max(.14,p/j),Z=m*j,K=x*j;return{vx:Z,vy:K,vz:0,totalTime:I,finalTargetX:v,finalTargetY:f,targetSurfaceHeight:s}}const M=n.getSupportingSurfaceHeight(v,f),k=M-s,S=Math.max(3,o);let C=Math.max(.14,p/S);k>0&&(C=Math.max(C,Math.sqrt(2*k/n.gravity)));const B=40,P=c>0?c:.35,F=.25;for(let j=1;j<B;j++){const I=j/B,Z=t+(v-t)*I,K=i+(f-i)*I;for(const A of n.walls)if(this.testWallIntersection(Z,K,P,A)){if(M>0&&v>=A.x&&v<=A.x+A.width&&f>=A.y&&f<=A.y+A.height&&I>.65)continue;const _=(1-I)*s+I*M,et=A.wallHeight+F-_;if(et>0){const J=n.gravity*I*(1-I);if(J>.001){const it=2*et/J;if(it>0){const st=Math.sqrt(it);st>C&&(C=st)}}}}}if(C<=.05)return null;const $=(k+.5*n.gravity*C*C)/C,U=p/C,X=m*U,H=x*U;return{vx:X,vy:H,vz:$,totalTime:C,finalTargetX:v,finalTargetY:f,targetSurfaceHeight:M}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,n=l.position.x,o=l.position.y,a=l.position.z,h=this.baseThrowForce*t.strength,c=l.hasGravity&&l.hasVerticalVelocity,g=this.computeLaunchVelocity(n,o,a,i,s,e,h,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!g)return null;const{vx:b,vy:y,vz:p,totalTime:m,finalTargetX:x,finalTargetY:v,targetSurfaceHeight:f}=g,M=90,k=m/M,S=[];let R=!1,C=f>0,B;for(let F=0;F<=M;F++){const $=F*k,U=F===M?x:n+b*$,X=F===M?v:o+y*$,H=c?a+p*$-.5*e.gravity*$*$:a,j=c?F===M?f:Math.max(f,H):a,I=c?p-e.gravity*$:0,Z=j>e.wallHeight;let K=!1,A=!1;for(const Y of e.walls)if(this.testWallIntersection(U,X,l.colliderRadius,Y)&&(K=!0,j<=Y.wallHeight+.001)){if(S.length>0&&S[S.length-1].z>=Y.wallHeight-.05&&I<=0){if(f>0&&(F>=M-2||Math.hypot(U-x,X-v)<.2)){C=!0;break}else if(f===0){C=!0,A=!0,R=!0,B=Y.id;break}}else if(j<Y.wallHeight-.05){A=!0,R=!0,B=Y.id;break}}if(S.push({x:U,y:X,z:j,t:$,couldClearWall:Z,isOverWall:K,collidesWall:A}),A)break}const P=S[S.length-1];return{points:S,landPoint:{x:R?P.x:x,y:R?P.y:v},isBlockedByWall:R,isLandingOnWallTop:R?C:f>0,blockedAtWallId:B}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,n=l.position.x,o=l.position.y,a=l.position.z,h=this.baseThrowForce*t.strength,c=this.computeLaunchVelocity(n,o,a,i,s,e,h,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!c)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=c.vx,l.velocity.y=c.vy,l.verticalVelocity=c.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const x=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=c.vx/x,l.rollModule.angularVelocity.x=-c.vy/x}const g=l.hasMass?l.mass:0,b=t.hasMass?Math.max(.2,t.baseMass):0,y=g>0&&b>0?g/b:0;t.heldObject=null;const p=c.vx-t.velocity.x,m=c.vy-t.velocity.y;if(t.velocity.x-=p*y,t.velocity.y-=m*y,t.isAboveGround&&l.hasVerticalVelocity){const x=c.vz-t.verticalVelocity;t.verticalVelocity-=x*y}return l}}class Pt{constructor(t){r(this,"id","climbing");r(this,"name","Climbing Module");r(this,"enabled",!0);r(this,"maxAdhesion",35);r(this,"maxClimbSpeed",3);r(this,"preventWalkOff",!0);r(this,"horizontalClimb",!1);r(this,"hangDistance",.1);r(this,"dismountSuppressedUntilRelease",!1);r(this,"climbSuppressedUntilRelease",!1);r(this,"isDismountFreefall",!1);r(this,"dismountWalkOffDisabled",!1);r(this,"dismountSourceWall",null);r(this,"wasClimbHeldLastTick",!1);(t==null?void 0:t.maxAdhesion)!==void 0&&(this.maxAdhesion=t.maxAdhesion),(t==null?void 0:t.maxClimbSpeed)!==void 0&&(this.maxClimbSpeed=t.maxClimbSpeed),(t==null?void 0:t.preventWalkOff)!==void 0&&(this.preventWalkOff=t.preventWalkOff),(t==null?void 0:t.horizontalClimb)!==void 0&&(this.horizontalClimb=t.horizontalClimb),(t==null?void 0:t.hangDistance)!==void 0&&(this.hangDistance=t.hangDistance)}get climbSuppressedUntilRePress(){return this.isDismountFreefall||this.climbSuppressedUntilRelease}set climbSuppressedUntilRePress(t){this.isDismountFreefall=t,this.climbSuppressedUntilRelease=t}update(t,i,s,e,l){const n=s&&!this.wasClimbHeldLastTick;if(this.wasClimbHeldLastTick=s,s||(this.dismountSuppressedUntilRelease=!1,this.climbSuppressedUntilRelease=!1),(t.position.z<=.01||n)&&(this.isDismountFreefall=!1,t.position.z<=.01&&(this.dismountWalkOffDisabled=!1,this.dismountSourceWall=null)),this.climbSuppressedUntilRelease||!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const o=t.hasCollider?t.colliderRadius:.44,a=Math.hypot(i.x,i.y),h=a>=.05,c=h?i.x/a:0,g=h?i.y/a:0;if(!t.isClimbing&&(t.standingWall!==null||t.position.z>=l.wallHeight))return t.isClimbing=!1,!1;let b=null,y=1/0,p=0,m=0,x=0;for(const k of l.walls){const S=Math.max(k.x,Math.min(t.position.x,k.x+k.width)),R=Math.max(k.y,Math.min(t.position.y,k.y+k.height)),C=S-t.position.x,B=R-t.position.y,P=Math.hypot(C,B);P<=o+.15&&P<y&&(y=P,b=k,p=h?c*C+g*B:0,m=C,x=B)}if(!b)return t.isClimbing=!1,!1;const v=t.mass;if(v*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;const M=t.isClimbing;if(M&&t.position.z<b.wallHeight){const k=y>.001?m/y:0,S=y>.001?x/y:0,R=-S,C=k,B=h?c*k+g*S:0,P=h?c*R+g*C:0;if(h&&(B<-.3||!this.horizontalClimb&&p<-.1))return t.isClimbing=!1,t.velocity.x=c*3,t.velocity.y=g*3,s&&(this.climbSuppressedUntilRelease=!0),!1;if(t.isClimbing=!0,t.verticalVelocity=0,t.standingWall=null,this.horizontalClimb&&h&&Math.abs(P)>=.1){const F=t.baseMass,$=Math.max(.5,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*F*t.strength/Math.max(.1,v)));t.velocity.x=R*P*$,t.velocity.y=C*P*$}else t.velocity.x=0,t.velocity.y=0;if(s){const F=t.baseMass,$=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*F*t.strength/Math.max(.1,v)));if(t.position.z+=$*e,y>this.hangDistance&&y>.001&&b.wallHeight>.01){const U=Math.max(0,Math.min(1,t.position.z/b.wallHeight)),X=o-U*(o-this.hangDistance);if(y>X){const H=y-X;t.position.x+=m/y*H,t.position.y+=x/y*H}}if(t.position.z>=b.wallHeight&&(t.position.z=b.wallHeight,t.supportingSurfaceHeight=b.wallHeight,t.standingWall=b,t.verticalVelocity=0,t.isClimbing=!1,this.dismountSuppressedUntilRelease=!0,this.dismountWalkOffDisabled=!1,this.dismountSourceWall=null,y>this.hangDistance&&y>.001)){const U=y-this.hangDistance;t.position.x+=m/y*U,t.position.y+=x/y*U}}return!0}if(!M&&t.position.z>.05&&t.position.z<b.wallHeight)return n?(t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0,!0):(t.isClimbing=!1,!1);if(s&&h&&p>.01&&t.position.z<b.wallHeight){t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const k=t.baseMass,S=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*k*t.strength/Math.max(.1,v)));return t.position.z+=S*e,!0}return t.isClimbing=!1,!1}}class St{constructor(t={}){r(this,"id","strength");r(this,"name","Strength Module");r(this,"enabled",!0);r(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class Mt extends ht{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});r(this,"strengthModule");r(this,"facingAngle");r(this,"heldObject");r(this,"isCharacter",!0);r(this,"isActivelyWalking",!1);r(this,"isClimbInputHeld",!1);r(this,"baseMass",1.2);r(this,"walkingModule");r(this,"pickupModule");r(this,"throwModule");r(this,"climbingModule");r(this,"isAiming");r(this,"aimTarget");r(this,"activeTrajectory");this.baseMass=i.mass??1.2,this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new St({strength:i.strength??1}),this.walkingModule=new Ct,this.pickupModule=new Wt,this.throwModule=new Rt,this.climbingModule=new Pt}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(i){this.strengthModule?this.strengthModule.strength=Math.max(.1,i):this.strengthModule=new St({strength:i})}get mass(){const i=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return i+s}set mass(i){this.baseMass=Math.max(.1,i),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}get hangDistance(){return this.climbingModule?this.climbingModule.hangDistance:.1}set hangDistance(i){this.climbingModule&&(this.climbingModule.hangDistance=Math.max(0,i))}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,n=s.y-this.position.y;if(Math.hypot(l,n)>.1){this.facingAngle=Math.atan2(n,l);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,l,n,o=!1){if(this.isClimbInputHeld=o,this.climbingModule&&this.climbingModule.update(this,s,o,i,n),this.walkingModule&&this.walkingModule.update(this,s,i,n),this.updatePosition(i,n),this.updateFacingDirection(e,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,n):this.activeTrajectory=null}}class mt{constructor(t={}){r(this,"enabled",!0);r(this,"angularVelocity",{x:0,y:0,z:0});r(this,"rollResistance",.4);r(this,"visualPhase",0);var i,s,e;this.enabled=t.enabled??!0,this.angularVelocity={x:((i=t.angularVelocity)==null?void 0:i.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((e=t.angularVelocity)==null?void 0:e.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const i=this.angularSpeed;i>.001&&(this.visualPhase=(this.visualPhase+i*t)%(Math.PI*2))}}class $t{constructor(t){r(this,"ctx");this.ctx=t}render(t,i,s,e,l=!1,n,o,a=!1,h){const c=this.ctx,g=c.canvas.width/t.width;c.clearRect(0,0,c.canvas.width,c.canvas.height),this.drawFloorGrid(t,g),this.drawWalls(t,g),a&&h&&this.drawWallEditorHover(t,h,g);const b=[i,...s];b.sort((y,p)=>Math.abs(y.position.z-p.position.z)>.001?y.position.z-p.position.z:Math.abs(y.verticalVelocity-p.verticalVelocity)>.001?y.verticalVelocity-p.verticalVelocity:y.position.y-p.position.y);for(const y of b)y instanceof Mt?this.drawCharacter(y,s,g):this.drawFreebodyObject(y,b,i,g,y===o,t.wallHeight);for(const y of b)this.drawObjectShadow(y,t,g);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,g),l&&(n&&n!==e&&this.drawHoverGizmo(n,g),e&&this.drawSelectionGizmo(e,l,g))}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawWallEditorHover(t,i,s){if(i.col<0||i.col>=t.cols||i.row<0||i.row>=t.rows)return;const e=this.ctx,l=i.col*t.tileSize*s,n=i.row*t.tileSize*s,o=t.tileSize*s,a=t.hasWall(i.col,i.row);e.save(),a?(e.fillStyle="rgba(239, 68, 68, 0.35)",e.strokeStyle="#ef4444",e.lineWidth=2.5,e.fillRect(l,n,o,o),e.strokeRect(l,n,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#fca5a5",e.textAlign="center",e.textBaseline="middle",e.fillText("✕ Erase",l+o/2,n+o/2)):(e.fillStyle="rgba(56, 189, 248, 0.3)",e.strokeStyle="#38bdf8",e.lineWidth=2.5,e.fillRect(l,n,o,o),e.strokeRect(l,n,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#7dd3fc",e.textAlign="center",e.textBaseline="middle",e.fillText("+ Draw",l+o/2,n+o/2)),e.restore()}drawObjectShadow(t,i,s){const e=this.ctx,l=t.position.x*s,n=t.position.y*s,o=t.position.z,a=1+o/i.wallHeight*1.5,h=t.colliderRadius*s*a,c=Math.max(.3,.85-o/(i.wallHeight*7)*.25),g=o>=i.wallHeight-.001;if(e.save(),e.beginPath(),t.visualShape==="box"){const b=h*2,y=Math.max(3,4*a);e.roundRect?e.roundRect(l-h,n-h,b,b,y):e.rect(l-h,n-h,b,b)}else e.arc(l,n,h,0,Math.PI*2);g?(e.strokeStyle=`rgba(56, 189, 248, ${c})`,e.lineWidth=2.5):(e.strokeStyle=`rgba(255, 255, 255, ${c})`,e.lineWidth=1.8),o>.01&&e.setLineDash([4,3]),e.stroke(),e.restore()}drawFreebodyObject(t,i,s,e,l=!1,n=1){var m,x;const o=this.ctx,a=t.position.x*e,h=t.position.y*e,g=(t.hasCollider?t.colliderRadius:((m=t.colliderModule)==null?void 0:m.radius)??.32)*e,y=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled&&!t.isHeld&&(((x=s.pickupModule)==null?void 0:x.isObjectInReach(s,t,n))??!1);if(y){if(o.save(),o.beginPath(),t.visualShape==="box"){const v=(g+5)*2;o.roundRect?o.roundRect(a-g-5,h-g-5,v,v,6):o.rect(a-g-5,h-g-5,v,v)}else o.arc(a,h,g+5,0,Math.PI*2);l?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",a,h-g-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}let p=!1;if(t.isAboveGround)for(const v of i){if(v===t)continue;if(Math.hypot(t.position.x-v.position.x,t.position.y-v.position.y)<t.colliderRadius+v.colliderRadius&&(t.position.z>v.position.z||Math.abs(t.position.z-v.position.z)<=.01&&t.verticalVelocity>v.verticalVelocity)){p=!0;break}}if(o.save(),o.globalAlpha=p?.55:1,t.visualShape==="box"){const v=g*2,f=Math.max(3,g*.16),M=a-g,k=h-g;o.beginPath(),o.roundRect?o.roundRect(M,k,v,v,f):o.rect(M,k,v,v),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();const S=Math.max(3,g*.22);o.beginPath(),o.roundRect?o.roundRect(M+S,k+S,v-S*2,v-S*2,f*.7):o.rect(M+S,k+S,v-S*2,v-S*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(M+S,k+S),o.lineTo(M+v-S,k+v-S),o.moveTo(M+v-S,k+S),o.lineTo(M+S,k+v-S),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(a,h,g,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();this.drawRollIndicator(t,a,h,g),o.restore()}drawCharacter(t,i,s){const e=this.ctx,l=t.position.x*s,n=t.position.y*s,o=t.colliderRadius*s;let a=!1;if(t.isAboveGround)for(const f of i){if(f===t)continue;if(Math.hypot(t.position.x-f.position.x,t.position.y-f.position.y)<t.colliderRadius+f.colliderRadius&&(t.position.z>f.position.z||Math.abs(t.position.z-f.position.z)<=.01&&t.verticalVelocity>f.verticalVelocity)){a=!0;break}}e.save(),e.globalAlpha=a?.55:1,e.beginPath(),e.arc(l,n,o,0,Math.PI*2),e.fillStyle=t.color,e.fill(),e.strokeStyle="#ffffff",e.lineWidth=2.5,e.stroke(),this.drawRollIndicator(t,l,n,o);const h=.52,c=o*.72,g=Math.max(3.5,o*.18),b=t.facingAngle-h,y=t.facingAngle+h,p=l+Math.cos(b)*c,m=n+Math.sin(b)*c,x=l+Math.cos(y)*c,v=n+Math.sin(y)*c;e.fillStyle="#000000",e.beginPath(),e.arc(p,m,g,0,Math.PI*2),e.arc(x,v,g,0,Math.PI*2),e.fill(),t.heldObject&&(e.strokeStyle="rgba(255, 255, 255, 0.6)",e.setLineDash([3,3]),e.lineWidth=1.5,e.beginPath(),e.moveTo(l,n),e.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),e.stroke(),e.setLineDash([])),e.restore()}drawRollIndicator(t,i,s,e){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,n=l.angularVelocity.x,o=l.angularVelocity.y,a=l.angularVelocity.z,h=Math.hypot(n,o,a);if(h<.02)return;const c=this.ctx,b=Math.hypot(n,o)<.05*h;if(c.save(),b){const y=e*.45,p=e*.78;c.beginPath(),c.arc(i,s,y,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.45)",c.lineWidth=1.5,c.setLineDash([]),c.stroke(),c.beginPath(),c.arc(i,s,p,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*p*Math.sign(a||1),c.stroke()}else{const y=Math.atan2(-n,o),p=e*.82,m=Math.abs(a)/h,x=p*Math.pow(m,.85);c.translate(i,s),c.rotate(y);const v=a!==0?Math.sign(a):1;x<.5?(c.beginPath(),c.moveTo(-p,0),c.lineTo(p,0),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2.2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*p,c.stroke()):(c.beginPath(),c.ellipse(0,0,p,x,0,0,Math.PI),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2.2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*p*v,c.stroke(),c.beginPath(),c.ellipse(0,0,p,x,0,Math.PI,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.25)",c.lineWidth=1.8,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*p*v,c.stroke())}c.restore()}drawTrajectory(t,i){const s=this.ctx,e=t.points;if(e.length<2)return;s.save();for(let n=0;n<e.length-1;n++){const o=e[n],a=e[n+1];s.beginPath(),s.moveTo(o.x*i,o.y*i),s.lineTo(a.x*i,a.y*i),o.couldClearWall||a.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const l=e[e.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const n=8;s.beginPath(),s.moveTo(l.x*i-n,l.y*i-n),s.lineTo(l.x*i+n,l.y*i+n),s.moveTo(l.x*i+n,l.y*i-n),s.lineTo(l.x*i-n,l.y*i+n),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,i){var a;const s=this.ctx,e=t.position.x*i,l=t.position.y*i,o=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*i;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(e,l,o,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,i,s){var b;const e=this.ctx,l=t.position.x*s,n=t.position.y*s,h=(t.hasCollider?t.colliderRadius:((b=t.colliderModule)==null?void 0:b.radius)??.32)*s+6,c=Math.max(6,h*.4),g=i?"#fbbf24":"#38bdf8";if(e.save(),e.strokeStyle=g,e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.moveTo(l-h,n-h+c),e.lineTo(l-h,n-h),e.lineTo(l-h+c,n-h),e.stroke(),e.beginPath(),e.moveTo(l+h-c,n-h),e.lineTo(l+h,n-h),e.lineTo(l+h,n-h+c),e.stroke(),e.beginPath(),e.moveTo(l+h,n+h-c),e.lineTo(l+h,n+h),e.lineTo(l+h-c,n+h),e.stroke(),e.beginPath(),e.moveTo(l-h+c,n+h),e.lineTo(l-h,n+h),e.lineTo(l-h,n+h-c),e.stroke(),i){const y=`${t.name} (${t.mass.toFixed(1)}kg)`;e.font="bold 10px 'Segoe UI', system-ui, sans-serif";const m=e.measureText(y).width+12,x=16,v=l-m/2,f=n-h-x-4;e.fillStyle="rgba(15, 23, 42, 0.85)",e.strokeStyle=g,e.lineWidth=1,e.beginPath(),e.roundRect(v,f,m,x,4),e.fill(),e.stroke(),e.fillStyle=g,e.textAlign="center",e.textBaseline="middle",e.fillText(y,l,f+x/2)}e.restore()}}class zt{constructor(t,i){r(this,"canvas");r(this,"arena");r(this,"keysPressed",new Set);r(this,"mousePos",{x:0,y:0});r(this,"isMouseDown",!1);r(this,"isRightMouseDown",!1);r(this,"hoverWallTile",null);r(this,"movementVector",{x:0,y:0});r(this,"justPickedUp",!1);r(this,"isThrowingPress",!1);r(this,"hoverEntity",null);r(this,"selectedCanvasEntity",null);r(this,"draggedEntity",null);r(this,"dragOffset",{x:0,y:0});r(this,"handleClick");r(this,"onMouseDown");r(this,"onRightMouseDown");r(this,"onMouseUp");r(this,"onRightClick");r(this,"onDropAttempt");r(this,"onMouseMove");this.canvas=t,this.arena=i,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){e&&(this.selectedCanvasEntity=e.selectedEntity);const l=(a,h,c=.35)=>{var y;for(let p=s.length-1;p>=0;p--){const m=s[p],x=m.hasCollider?m.colliderRadius:((y=m.colliderModule)==null?void 0:y.radius)??.32;if(Math.hypot(m.position.x-a,m.position.y-h)<=x+c)return m}const g=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-h)<=g+c?t:null},n=(a,h)=>{var g;if(a<0||a>=i.cols||h<0||h>=i.rows)return;if(i.setWallTile(a,h,!0)){const b={id:`wall-${a}-${h}`,x:a*i.tileSize,y:h*i.tileSize,width:i.tileSize,height:i.tileSize,wallHeight:i.wallHeight},y=[t,...s];for(const p of y){const m=p.hasCollider?p.colliderRadius:((g=p.colliderModule)==null?void 0:g.radius)??.32;i.testWallOverlap(p.position.x,p.position.y,m,b)&&p.position.z<i.wallHeight&&(p.hasVerticalPosition||(p.verticalPositionModule?p.verticalPositionModule.enabled=!0:p.verticalPositionModule=new yt({z:i.wallHeight,hasVerticalVelocity:!0})),p.position.z=i.wallHeight,p.supportingSurfaceHeight=i.wallHeight,p.verticalVelocity=0)}i.currentPresetId="custom",e==null||e.updateWallPresetUI()}},o=(a,h)=>{a<0||a>=i.cols||h<0||h>=i.rows||i.tileGrid[h][a]===1&&(i.setWallTile(a,h,!1),i.currentPresetId="custom",e==null||e.updateWallPresetUI())};this.onMouseDown=(a,h)=>{if(e!=null&&e.isEditMode){if(e.editTool==="walls"){const g=Math.floor(a/i.tileSize),b=Math.floor(h/i.tileSize);n(g,b);return}const c=l(a,h,.35);c?(this.selectedCanvasEntity=c,e.setSelectedEntity(c),this.draggedEntity=c,this.dragOffset.x=c.position.x-a,this.dragOffset.y=c.position.y-h,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,h)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"){const c=Math.floor(a/i.tileSize),g=Math.floor(h/i.tileSize);o(c,g)}},this.onMouseMove=(a,h)=>{var b;const c=Math.floor(a/i.tileSize),g=Math.floor(h/i.tileSize);if(c>=0&&c<i.cols&&g>=0&&g<i.rows?this.hoverWallTile={col:c,row:g}:this.hoverWallTile=null,e!=null&&e.isEditMode){if(e.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?n(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&o(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const y=a+this.dragOffset.x,p=h+this.dragOffset.y,m=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((b=this.draggedEntity.colliderModule)==null?void 0:b.radius)??.32;this.draggedEntity.position.x=Math.max(m,Math.min(i.width-m,y)),this.draggedEntity.position.y=Math.max(m,Math.min(i.height-m,p)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const y=l(a,h,.3);this.hoverEntity=y,this.canvas.style.cursor=y?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,h)=>{if(this.draggedEntity&&(i.syncEntitiesWithWalls([this.draggedEntity]),this.draggedEntity=null),e!=null&&e.isEditMode)if(e.editTool==="walls")this.canvas.style.cursor="cell";else{const c=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=c,this.canvas.style.cursor=c?"grab":"crosshair"}},this.handleClick=(a,h)=>{if(!(e!=null&&e.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,h,i),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const c=t.pickupModule.findTargetObject(t,a,h,s,i.wallHeight);c&&(t.pickupModule.pickup(t,c),this.justPickedUp=!0)}}},this.onRightClick=(a,h)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"||!e)return;const c=l(a,h,.4);c&&(this.selectedCanvasEntity=c,e.setSelectedEntity(c))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,i.wallHeight);a&&t.pickupModule.pickup(t,a)}}}}class Bt{constructor(t){r(this,"container");r(this,"character");r(this,"arena");r(this,"objects");r(this,"onSpawnObject");r(this,"onDeleteObject");r(this,"onClearObjects");r(this,"selectedEntity");r(this,"isEditMode",!1);r(this,"editTool","entities");r(this,"onSelectionChange");r(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});r(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});r(this,"inspectorEl");r(this,"entitySelectorEl");r(this,"characterSpecificControlsEl");r(this,"objectSpecificControlsEl");r(this,"modePlayBtn");r(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var i;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(i=this.onSelectionChange)==null||i.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const i=this.container.querySelector("#edit-submode-container");i&&(i.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const i=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");i&&s&&(i.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const i=this.container.querySelector("#edit-hint-label");i&&(this.isEditMode?this.editTool==="walls"?i.textContent="Left-drag: Draw | Right-drag: Erase":i.textContent="Click & drag object in arena":i.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const e of this.objects){const l=e.id===t?"selected":"",n=e.visualShape==="box"?"📦":"⚪",o=e.hasMass?`${e.mass.toFixed(1)}kg`:"Massless";i+=`<option value="${e.id}" ${l}>${n} ${e.name} (${o})</option>`}this.entitySelectorEl.innerHTML=i;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,i,s,e,l,n,o,a,h,c,g,b,y,p,m,x,v,f,M,k,S,R,C,B,P,F,$,U,X,H,j,I,Z,K,A,Y,_,tt,et,J,it,st,d,u,w,V,E,O,T,W,G,q,D,z,N,Q,lt,nt,ut,dt,ot,at,ct,wt,kt,Vt,Et;this.container.innerHTML=`
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
                ${(n=this.selectedEntity.frictionModule)!=null&&n.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-friction-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((o=this.selectedEntity.frictionModule)!=null&&o.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no normal force)
            </div>
            <div id="group-mod-friction" style="display: ${(a=this.selectedEntity.frictionModule)!=null&&a.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Static Friction Mod</span>
                  <span id="val-entity-static-fric">${(((h=this.selectedEntity.frictionModule)==null?void 0:h.staticFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${((c=this.selectedEntity.frictionModule)==null?void 0:c.staticFrictionMod)??1}">
              </div>
              <div class="slider-group">
                <div class="slider-label">
                  <span>Dynamic Friction Mod</span>
                  <span id="val-entity-dynamic-fric">${(((g=this.selectedEntity.frictionModule)==null?void 0:g.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((b=this.selectedEntity.frictionModule)==null?void 0:b.dynamicFrictionMod)??1}">
              </div>
            </div>
            <div id="note-mod-friction" class="module-detached-note" style="display: ${(y=this.selectedEntity.frictionModule)!=null&&y.enabled?"none":"block"};">
              Frictionless: glides indefinitely without ground resistance
            </div>
          </div>

          <!-- 4. Bounciness (Requires Mass) -->
          <div class="module-card" id="card-mod-bounce">
            <div class="toggle-row">
              <label>🏀 Bounciness</label>
              <button id="toggle-mod-bounce" class="btn-toggle ${(p=this.selectedEntity.bounceModule)!=null&&p.enabled?"active":""}">
                ${(m=this.selectedEntity.bounceModule)!=null&&m.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((x=this.selectedEntity.bounceModule)!=null&&x.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(v=this.selectedEntity.bounceModule)!=null&&v.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((f=this.selectedEntity.bounceModule)==null?void 0:f.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((M=this.selectedEntity.bounceModule)==null?void 0:M.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(k=this.selectedEntity.bounceModule)!=null&&k.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(S=this.selectedEntity.bounceModule)!=null&&S.enabled&&((R=this.selectedEntity.bounceModule)!=null&&R.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${(C=this.selectedEntity.bounceModule)!=null&&C.enabled?"none":"block"};">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(B=this.selectedEntity.rollModule)!=null&&B.enabled?"active":""}">
                ${(P=this.selectedEntity.rollModule)!=null&&P.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(F=this.selectedEntity.rollModule)!=null&&F.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${($=this.selectedEntity.rollModule)!=null&&$.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((U=this.selectedEntity.rollModule)==null?void 0:U.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((X=this.selectedEntity.rollModule)==null?void 0:X.rollResistance)??.4}">
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
                <button id="toggle-walk" class="btn-toggle ${(H=this.character.walkingModule)!=null&&H.enabled?"active":""}">
                  ${(j=this.character.walkingModule)!=null&&j.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((I=this.character.walkingModule)!=null&&I.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&((Z=this.character.walkingModule)!=null&&Z.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(K=this.character.walkingModule)!=null&&K.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((A=this.character.walkingModule)==null?void 0:A.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((Y=this.character.walkingModule)==null?void 0:Y.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((_=this.character.walkingModule)==null?void 0:_.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((tt=this.character.walkingModule)==null?void 0:tt.maxWalkSpeed)??5.2}">
                </div>
              </div>
            </div>

            <!-- Strength Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>💪 Strength Ability</label>
                <button id="toggle-strength" class="btn-toggle ${(et=this.character.strengthModule)!=null&&et.enabled?"active":""}">
                  ${(J=this.character.strengthModule)!=null&&J.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-strength" style="display: ${(it=this.character.strengthModule)!=null&&it.enabled?"block":"none"};">
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
                <button id="toggle-pickup" class="btn-toggle ${(st=this.character.pickupModule)!=null&&st.enabled?"active":""}">
                  ${(d=this.character.pickupModule)!=null&&d.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(u=this.character.pickupModule)!=null&&u.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(((w=this.character.pickupModule)==null?void 0:w.pickupReach)??1.3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${((V=this.character.pickupModule)==null?void 0:V.pickupReach)??1.3}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Cross-Layer Reach Ratio</span>
                    <span id="val-pickup-cross-layer">${(((E=this.character.pickupModule)==null?void 0:E.crossLayerReachRatio)??.55).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-pickup-cross-layer" min="0.10" max="1.00" step="0.05" value="${((O=this.character.pickupModule)==null?void 0:O.crossLayerReachRatio)??.55}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(T=this.character.throwModule)!=null&&T.enabled?"active":""}">
                  ${(W=this.character.throwModule)!=null&&W.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(G=this.character.throwModule)!=null&&G.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((q=this.character.throwModule)==null?void 0:q.baseThrowForce)??7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((D=this.character.throwModule)==null?void 0:D.baseThrowForce)??7.6}">
                </div>
              </div>
            </div>

            <!-- Climbing Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🧗 Climbing Ability</label>
                <button id="toggle-climb" class="btn-toggle ${(z=this.character.climbingModule)!=null&&z.enabled?"active":""}">
                  ${(N=this.character.climbingModule)!=null&&N.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-climb-deps" class="module-dep-warning" style="display: ${(!this.character.hasVerticalPosition||!this.character.hasStrength)&&((Q=this.character.climbingModule)!=null&&Q.enabled)?"block":"none"};">
                ${this.character.hasVerticalPosition?this.character.hasStrength?"":"⚠️ Requires Strength Ability to climb":"⚠️ Requires Vertical Position (3D Z-axis)"}
              </div>
              <div id="group-mod-climb" style="display: ${(lt=this.character.climbingModule)!=null&&lt.enabled?"block":"none"};">
                <div class="toggle-row" style="margin-bottom: 8px;">
                  <label style="font-size: 0.8rem;">Prevent Walk-Off (Require Space)</label>
                  <button id="toggle-climb-walkoff" class="btn-toggle ${(nt=this.character.climbingModule)!=null&&nt.preventWalkOff?"active":""}">
                    ${(ut=this.character.climbingModule)!=null&&ut.preventWalkOff?"Active":"Inactive"}
                  </button>
                </div>
                <div class="toggle-row" style="margin-bottom: 8px;">
                  <label style="font-size: 0.8rem;">Sideways Climb (Traverse Wall)</label>
                  <button id="toggle-climb-sideways" class="btn-toggle ${(dt=this.character.climbingModule)!=null&&dt.horizontalClimb?"active":""}">
                    ${(ot=this.character.climbingModule)!=null&&ot.horizontalClimb?"Active":"Inactive"}
                  </button>
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Adhesion (N)</span>
                    <span id="val-climb-adhesion">${(((at=this.character.climbingModule)==null?void 0:at.maxAdhesion)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-climb-adhesion" min="5.0" max="80.0" step="1.0" value="${((ct=this.character.climbingModule)==null?void 0:ct.maxAdhesion)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Climb Speed (u/s)</span>
                    <span id="val-climb-speed">${(((wt=this.character.climbingModule)==null?void 0:wt.maxClimbSpeed)??3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${((kt=this.character.climbingModule)==null?void 0:kt.maxClimbSpeed)??3}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Ledge Hang Distance (u)</span>
                    <span id="val-climb-hang">${(((Vt=this.character.climbingModule)==null?void 0:Vt.hangDistance)??.1).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-climb-hang" min="0.02" max="1.5" step="0.02" value="${((Et=this.character.climbingModule)==null?void 0:Et.hangDistance)??.1}">
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var Y,_,tt,et,J,it,st;const t=this.selectedEntity,i=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=i?"none":"flex");const e=this.container.querySelector("#toggle-entity-shape");e&&(t.visualShape==="box"?(e.textContent="Box 📦",e.classList.add("active")):(e.textContent="Circle ⚪",e.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),n=this.container.querySelector("#group-mod-collider"),o=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),n&&(n.style.display=t.hasCollider?"block":"none"),o&&(o.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((Y=t.colliderModule)==null?void 0:Y.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),h=this.container.querySelector("#group-mod-mass"),c=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),c&&(c.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((_=t.massModule)==null?void 0:_.mass)??1,1);const g=this.container.querySelector("#toggle-mod-friction"),b=this.container.querySelector("#group-mod-friction"),y=this.container.querySelector("#note-mod-friction"),p=this.container.querySelector("#warn-friction-mass"),m=!!(t.frictionModule&&t.frictionModule.enabled);g&&(g.textContent=m?"Attached":"Detached",g.classList.toggle("active",m)),b&&(b.style.display=m?"flex":"none"),y&&(y.style.display=m?"none":"block"),p&&(p.style.display=!t.hasMass&&m?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((tt=t.frictionModule)==null?void 0:tt.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((et=t.frictionModule)==null?void 0:et.dynamicFrictionMod)??1,2);const x=this.container.querySelector("#toggle-mod-bounce"),v=this.container.querySelector("#group-mod-bounce"),f=this.container.querySelector("#note-mod-bounce"),M=this.container.querySelector("#warn-bounce-mass"),k=!!(t.bounceModule&&t.bounceModule.enabled);x&&(x.textContent=k?"Attached":"Detached",x.classList.toggle("active",k)),v&&(v.style.display=k?"block":"none"),f&&(f.style.display=k?"none":"block"),M&&(M.style.display=!t.hasMass&&k?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((J=t.bounceModule)==null?void 0:J.bounceMod)??.4,2);const S=this.container.querySelector("#check-mod-vert-bounce"),R=this.container.querySelector("#warn-bounce-vert-vel");if(S&&(S.checked=!!((it=t.bounceModule)!=null&&it.verticalBounce)),R){const d=!!(k&&((st=t.bounceModule)!=null&&st.verticalBounce)&&!t.hasVerticalVelocity);R.style.display=d?"block":"none"}const C=this.container.querySelector("#toggle-mod-vert-pos"),B=this.container.querySelector("#group-mod-vert-pos"),P=this.container.querySelector("#note-mod-vert-pos"),F=t.hasVerticalPosition;C&&(C.textContent=F?"Attached":"Detached",C.classList.toggle("active",F)),B&&(B.style.display=F?"block":"none"),P&&(P.style.display=F?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const $=this.container.querySelector("#toggle-mod-vert-vel"),U=this.container.querySelector("#group-mod-vert-vel"),X=t.hasVerticalVelocity;$&&($.textContent=X?"Enabled":"Disabled",$.classList.toggle("active",X)),U&&(U.style.display=X?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const H=this.container.querySelector("#toggle-mod-gravity"),j=this.container.querySelector("#note-mod-gravity");H&&(H.textContent=t.hasGravity?"Attached":"Detached",H.classList.toggle("active",t.hasGravity)),j&&(j.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const I=this.container.querySelector("#toggle-mod-roll"),Z=this.container.querySelector("#group-mod-roll"),K=this.container.querySelector("#note-roll-friction"),A=!!(t.rollModule&&t.rollModule.enabled);if(I&&(I.textContent=A?"Attached":"Detached",I.classList.toggle("active",A)),Z&&(Z.style.display=A?"block":"none"),K&&(K.style.display=A&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),i){const d=this.container.querySelector("#toggle-walk"),u=this.container.querySelector("#group-mod-walking"),w=this.container.querySelector("#warn-walk-friction"),V=this.container.querySelector("#warn-walk-strength"),E=!!(this.character.walkingModule&&this.character.walkingModule.enabled);d&&(d.textContent=E?"Attached":"Detached",d.classList.toggle("active",E)),u&&(u.style.display=E?"flex":"none"),w&&(w.style.display=E&&!this.character.hasFriction?"block":"none"),V&&(V.style.display=E&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const O=this.container.querySelector("#toggle-strength"),T=this.container.querySelector("#group-mod-strength"),W=!!(this.character.strengthModule&&this.character.strengthModule.enabled);O&&(O.textContent=W?"Attached":"Detached",O.classList.toggle("active",W)),T&&(T.style.display=W?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const G=this.container.querySelector("#toggle-pickup"),q=this.container.querySelector("#group-mod-pickup"),D=!!(this.character.pickupModule&&this.character.pickupModule.enabled);G&&(G.textContent=D?"Attached":"Detached",G.classList.toggle("active",D)),q&&(q.style.display=D?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const z=this.container.querySelector("#toggle-throw"),N=this.container.querySelector("#group-mod-throw"),Q=!!(this.character.throwModule&&this.character.throwModule.enabled);z&&(z.textContent=Q?"Attached":"Detached",z.classList.toggle("active",Q)),N&&(N.style.display=Q?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const lt=this.container.querySelector("#toggle-climb"),nt=this.container.querySelector("#group-mod-climb"),ut=this.container.querySelector("#warn-climb-deps"),dt=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(lt&&(lt.textContent=dt?"Attached":"Detached",lt.classList.toggle("active",dt)),nt&&(nt.style.display=dt?"block":"none"),ut){const ot=!this.character.hasVerticalPosition,at=!this.character.hasStrength;ut.style.display=dt&&(ot||at)?"block":"none",ut.textContent=ot?"⚠️ Requires Vertical Position (3D Z-axis)":at?"⚠️ Requires Strength Ability to climb":""}if(this.character.climbingModule){const ot=this.container.querySelector("#toggle-climb-walkoff");if(ot){const ct=!!this.character.climbingModule.preventWalkOff;ot.textContent=ct?"Active":"Inactive",ot.classList.toggle("active",ct)}const at=this.container.querySelector("#toggle-climb-sideways");if(at){const ct=!!this.character.climbingModule.horizontalClimb;at.textContent=ct?"Active":"Inactive",at.classList.toggle("active",ct)}this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1),this.setSliderVal("slide-climb-hang","val-climb-hang",this.character.climbingModule.hangDistance,2)}}}setSliderVal(t,i,s,e){const l=this.container.querySelector(`#${t}`),n=this.container.querySelector(`#${i}`);l&&(l.value=s.toString()),n&&(n.textContent=e>0?s.toFixed(e):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,i=this.container.querySelector("#creator-name");i&&(i.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const e=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");e&&(e.value=t.color),l&&(l.textContent=t.color);const n=this.container.querySelector("#creator-toggle-collider"),o=this.container.querySelector("#grp-creator-radius");n&&(n.textContent=t.hasCollider?"Attached":"Detached",n.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),h=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const c=this.container.querySelector("#creator-toggle-friction"),g=this.container.querySelector("#grp-creator-fric");c&&(c.textContent=t.hasFriction?"Attached":"Detached",c.classList.toggle("active",t.hasFriction)),g&&(g.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const b=this.container.querySelector("#creator-toggle-bounce"),y=this.container.querySelector("#grp-creator-bounce"),p=this.container.querySelector("#creator-check-vert-bounce"),m=this.container.querySelector("#creator-warn-bounce-vert");b&&(b.textContent=t.hasBounce?"Attached":"Detached",b.classList.toggle("active",t.hasBounce)),y&&(y.style.display=t.hasBounce?"block":"none"),p&&(p.checked=t.verticalBounce),m&&(m.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const x=this.container.querySelector("#creator-toggle-vert-pos"),v=this.container.querySelector("#grp-creator-vert-pos");x&&(x.textContent=t.hasVerticalPosition?"Attached":"Detached",x.classList.toggle("active",t.hasVerticalPosition)),v&&(v.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const f=this.container.querySelector("#creator-toggle-vert-vel");f&&(f.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",f.classList.toggle("active",t.hasVerticalVelocity));const M=this.container.querySelector("#creator-toggle-gravity");M&&(M.textContent=t.hasGravity?"Attached":"Detached",M.classList.toggle("active",t.hasGravity));const k=this.container.querySelector("#creator-toggle-roll"),S=this.container.querySelector("#group-creator-roll-resist");k&&(k.textContent=t.hasRollModule?"Enabled":"Disabled",k.classList.toggle("active",t.hasRollModule)),S&&(S.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var Z,K,A,Y,_,tt,et,J,it,st;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(Z=this.container.querySelector("#submode-entities"))==null||Z.addEventListener("click",()=>{this.setEditTool("entities")}),(K=this.container.querySelector("#submode-walls"))==null||K.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var u;const d=this.entitySelectorEl.value;if(d===this.character.id)this.selectedEntity=this.character;else{const w=this.objects.find(V=>V.id===d);w&&(this.selectedEntity=w)}this.updateSelectorOptions(),this.syncEntitySliders(),(u=this.onSelectionChange)==null||u.call(this,this.selectedEntity)}),(A=this.container.querySelector("#btn-duplicate-entity"))==null||A.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(Y=this.container.querySelector("#btn-delete-entity"))==null||Y.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const i=this.container.querySelector("#toggle-mod-collider");i==null||i.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new gt({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",d=>{this.selectedEntity.colliderRadius=d},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new pt({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",d=>{this.selectedEntity.mass=d,this.updateSelectorOptions()},1);const e=this.container.querySelector("#toggle-mod-friction");e==null||e.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new vt,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",d=>{this.selectedEntity.staticGroundFrictionMod=d},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",d=>{this.selectedEntity.dynamicGroundFrictionMod=d},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new bt({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",d=>{this.selectedEntity.bounceMod=d},2);const n=this.container.querySelector("#check-mod-vert-bounce");n==null||n.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=n.checked),this.syncEntitySliders(),this.updateInspector()});const o=this.container.querySelector("#toggle-mod-vert-pos");o==null||o.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new yt({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",d=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=d),this.selectedEntity.position.z=d,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",d=>{this.selectedEntity.verticalVelocity=d},2);const h=this.container.querySelector("#toggle-mod-gravity");h==null||h.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new ft,this.syncEntitySliders()});const c=this.container.querySelector("#toggle-mod-roll");c==null||c.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new mt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",d=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=d)},2);const g=this.container.querySelector("#toggle-walk");g==null||g.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new Ct,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",d=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=d)},0),this.setupSlider("slide-walk-speed","val-walk-speed",d=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=d)},1);const b=this.container.querySelector("#toggle-strength");b==null||b.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new St({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",d=>{this.character.strength=d},1);const y=this.container.querySelector("#toggle-pickup");y==null||y.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new Wt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",d=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=d)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",d=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=d)},2);const p=this.container.querySelector("#toggle-throw");p==null||p.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new Rt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",d=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=d)},1);const m=this.container.querySelector("#toggle-climb");m==null||m.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Pt,this.syncEntitySliders()});const x=this.container.querySelector("#toggle-climb-walkoff");x==null||x.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.preventWalkOff=!this.character.climbingModule.preventWalkOff),this.syncEntitySliders()});const v=this.container.querySelector("#toggle-climb-sideways");v==null||v.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.horizontalClimb=!this.character.climbingModule.horizontalClimb),this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",d=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=d)},0),this.setupSlider("slide-climb-speed","val-climb-speed",d=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=d)},1),this.setupSlider("slide-climb-hang","val-climb-hang",d=>{this.character.climbingModule&&(this.character.climbingModule.hangDistance=d)},2),this.setupSlider("slide-gravity","val-gravity",d=>{this.arena.gravity=d},1),this.setupSlider("slide-wall-height","val-wall-height",d=>{this.arena.setStandardWallHeight(d),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",d,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",d=>{this.arena.setStandardWallHeight(d),this.setSliderVal("slide-wall-height","val-wall-height",d,1)},1);const f=this.container.querySelector("#select-wall-preset");f==null||f.addEventListener("change",()=>{this.arena.loadWallPreset(f.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(_=this.container.querySelector("#btn-prev-wall-map"))==null||_.addEventListener("click",()=>{const d=rt.WALL_PRESETS,w=(d.findIndex(V=>V.id===this.arena.currentPresetId)-1+d.length)%d.length;this.arena.loadWallPreset(d[w].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(tt=this.container.querySelector("#btn-next-wall-map"))==null||tt.addEventListener("click",()=>{const d=rt.WALL_PRESETS,w=(d.findIndex(V=>V.id===this.arena.currentPresetId)+1)%d.length;this.arena.loadWallPreset(d[w].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(et=this.container.querySelector("#btn-reset-walls"))==null||et.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(J=this.container.querySelector("#btn-clear-walls"))==null||J.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",d=>{this.arena.frictionCoeff=d},1),this.setupSlider("slide-static-thresh","val-static-thresh",d=>{this.arena.staticFrictionThreshold=d},2),this.container.querySelectorAll(".preset-chip").forEach(d=>{d.addEventListener("click",()=>{const u=d.getAttribute("data-preset");u&&this.presets[u]&&(this.creatorState={...this.presets[u]},this.syncCreatorInputs())})});const k=this.container.querySelector("#creator-name");k==null||k.addEventListener("input",()=>{this.creatorState.name=k.value});const S=this.container.querySelector("#creator-toggle-shape");S==null||S.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",S.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",S.classList.toggle("active",this.creatorState.visualShape==="box")});const R=this.container.querySelector("#creator-color"),C=this.container.querySelector("#val-creator-color");R==null||R.addEventListener("input",()=>{this.creatorState.color=R.value,C&&(C.textContent=R.value)});const B=this.container.querySelector("#creator-toggle-collider");B==null||B.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,B.textContent=this.creatorState.hasCollider?"Attached":"Detached",B.classList.toggle("active",this.creatorState.hasCollider);const d=this.container.querySelector("#grp-creator-radius");d&&(d.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",d=>{this.creatorState.colliderRadius=d},2);const P=this.container.querySelector("#creator-toggle-mass");P==null||P.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,P.textContent=this.creatorState.hasMass?"Attached":"Detached",P.classList.toggle("active",this.creatorState.hasMass);const d=this.container.querySelector("#grp-creator-mass");d&&(d.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",d=>{this.creatorState.mass=d},1);const F=this.container.querySelector("#creator-toggle-friction");F==null||F.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,F.textContent=this.creatorState.hasFriction?"Attached":"Detached",F.classList.toggle("active",this.creatorState.hasFriction);const d=this.container.querySelector("#grp-creator-fric");d&&(d.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",d=>{this.creatorState.dynamicFrictionMod=d},2);const $=this.container.querySelector("#creator-toggle-bounce");$==null||$.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,$.textContent=this.creatorState.hasBounce?"Attached":"Detached",$.classList.toggle("active",this.creatorState.hasBounce);const d=this.container.querySelector("#grp-creator-bounce");d&&(d.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",d=>{this.creatorState.bounceMod=d},2);const U=this.container.querySelector("#creator-check-vert-bounce");U==null||U.addEventListener("change",()=>{this.creatorState.verticalBounce=U.checked,this.syncCreatorInputs()});const X=this.container.querySelector("#creator-toggle-vert-pos");X==null||X.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",d=>{this.creatorState.elevation=d},2);const H=this.container.querySelector("#creator-toggle-vert-vel");H==null||H.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const j=this.container.querySelector("#creator-toggle-gravity");j==null||j.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,j.textContent=this.creatorState.hasGravity?"Attached":"Detached",j.classList.toggle("active",this.creatorState.hasGravity)});const I=this.container.querySelector("#creator-toggle-roll");I==null||I.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,I.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",I.classList.toggle("active",this.creatorState.hasRollModule);const d=this.container.querySelector("#group-creator-roll-resist");d&&(d.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",d=>{this.creatorState.rollResistance=d},2),(it=this.container.querySelector("#btn-spawn-configured"))==null||it.addEventListener("click",()=>{this.spawnFromCreator()}),(st=this.container.querySelector("#btn-clear-entities"))==null||st.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,i=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),e=new ht({name:t.name||"Custom Object",position:{x:i,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new gt({radius:t.colliderRadius}):null,massModule:t.hasMass?new pt({mass:t.mass}):null,frictionModule:t.hasFriction?new vt({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new bt({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new yt({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new ft:null,rollModule:t.hasRollModule?new mt({rollResistance:t.rollResistance}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,i=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),e=new ht({name:`${t.name} (Copy)`,position:{x:i,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new gt({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new pt({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new vt({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new bt({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new yt({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new ft({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new mt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,i,s,e=0){const l=this.container.querySelector(`#${t}`),n=this.container.querySelector(`#${i}`);!l||!n||l.addEventListener("input",()=>{const o=parseFloat(l.value);n.textContent=e>0?o.toFixed(e):Math.round(o).toString(),s(o)})}updateInspector(){var e;const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}renderWallPresetOptions(){return rt.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=rt.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=rt.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const i=this.container.querySelector("#label-wall-map-badge");i&&(i.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class At{constructor(t){r(this,"arena");r(this,"character");r(this,"objects");r(this,"renderer");r(this,"inputManager");r(this,"devPanel");r(this,"isRunning",!1);r(this,"lastTime",0);r(this,"accumulator",0);r(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const e=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,e,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const i=this.inputManager;i.draggedEntity!==this.character?this.character.updateCharacter(t,i.movementVector,i.isMouseDown&&!this.devPanel.isEditMode,i.mousePos,this.arena,i.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const e of this.objects)i.draggedEntity!==e&&e.updatePosition(t,this.arena);const s=i.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const e=this.character.pickupModule.findTargetObject(this.character,i.mousePos.x,i.mousePos.y,this.objects,this.arena.wallHeight);e&&(this.character.pickupModule.pickup(this.character,e),i.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],i=this.inputManager,s=3;for(let e=0;e<s;e++)for(let l=0;l<t.length;l++)for(let n=l+1;n<t.length;n++){const o=t[l],a=t[n];if(o.isHeld||a.isHeld||o===i.draggedEntity||a===i.draggedEntity||!o.hasCollider||!a.hasCollider)continue;const h=this.arena.wallHeight-.15,c=o.position.z>=h||o.supportingSurfaceHeight>=h||o.standingWall!==null||o.isAboveWalls,g=a.position.z>=h||a.supportingSurfaceHeight>=h||a.standingWall!==null||a.isAboveWalls;if(c!==g)continue;const b=a.position.x-o.position.x,y=a.position.y-o.position.y,p=b*b+y*y,m=o.colliderRadius+a.colliderRadius;if(p<m*m&&p>1e-6){const x=Math.sqrt(p),v=m-x,f=b/x,M=y/x,k=a.velocity.x-o.velocity.x,S=a.velocity.y-o.velocity.y,R=k*f+S*M,C=!o.hasMass,B=!a.hasMass;if(C&&B){if(o.position.x-=f*v*.5,o.position.y-=M*v*.5,a.position.x+=f*v*.5,a.position.y+=M*v*.5,R<0){const H=-R*.5;o.velocity.x-=H*f,o.velocity.y-=H*M,a.velocity.x+=H*f,a.velocity.y+=H*M}continue}if(!C&&B){this.isEntityPinnedAgainstWall(a,f,M)?(o.position.x-=f*v,o.position.y-=M*v,o.velocity.x=0,o.velocity.y=0):(a.position.x+=f*v,a.position.y+=M*v,R<0&&(a.velocity.x+=(o.velocity.x-a.velocity.x)*Math.abs(f),a.velocity.y+=(o.velocity.y-a.velocity.y)*Math.abs(M)));continue}if(C&&!B){this.isEntityPinnedAgainstWall(o,-f,-M)?(a.position.x+=f*v,a.position.y+=M*v,a.velocity.x=0,a.velocity.y=0):(o.position.x-=f*v,o.position.y-=M*v,R<0&&(o.velocity.x+=(a.velocity.x-o.velocity.x)*Math.abs(f),o.velocity.y+=(a.velocity.y-o.velocity.y)*Math.abs(M)));continue}const P=1/o.mass,F=1/a.mass,$=P+F;if($<=1e-4)continue;const U=P/$,X=F/$;if(o.position.x-=f*v*U,o.position.y-=M*v*U,a.position.x+=f*v*X,a.position.y+=M*v*X,R<0){const H=o instanceof Mt&&o.isActivelyWalking||a instanceof Mt&&a.isActivelyWalking,j=o.hasBounce&&a.hasBounce,I=o.isCharacter||!o.hasBounce?0:o.bounceMod??0,Z=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,A=-(1+(H||!j?0:Math.max(0,Math.min(.98,Math.max(I,Z)))))*R/$;o.velocity.x-=A*P*f,o.velocity.y-=A*P*M,a.velocity.x+=A*F*f,a.velocity.y+=A*F*M;const Y=-M,_=f,tt=k*Y+S*_;if(Math.abs(tt)>.001){const et=.35*Math.sqrt(o.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),J=.4,it=Math.abs(tt)/($*(1+1/J)),st=et*Math.abs(A),d=Math.min(it,st)*Math.sign(tt);if(o.velocity.x+=d*P*Y,o.velocity.y+=d*P*_,a.velocity.x-=d*F*Y,a.velocity.y-=d*F*_,o.rollModule&&o.rollModule.enabled){const u=d/(J*o.mass*o.colliderRadius);o.rollModule.angularVelocity.z+=u,o.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,o.rollModule.angularVelocity.z)),o.isRestingOnSurface&&(o.rollModule.angularVelocity.y=o.velocity.x/o.colliderRadius,o.rollModule.angularVelocity.x=-o.velocity.y/o.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const u=d/(J*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=u,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,i,s){const e=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(i>.3&&t.position.x>=this.arena.width-e-l||i<-.3&&t.position.x<=e+l||s>.3&&t.position.y>=this.arena.height-e-l||s<-.3&&t.position.y<=e+l)return!0;for(const n of this.arena.walls)if(t.position.z<n.wallHeight-.05){const o=t.position.x+i*l,a=t.position.y+s*l,h=Math.max(n.x,Math.min(o,n.x+n.width)),c=Math.max(n.y,Math.min(a,n.y+n.height)),g=o-h,b=a-c;if(g*g+b*b<e*e)return!0}return!1}}function Tt(){const L=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!L||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=L.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new rt(20,14,1);L.width=1e3,L.height=700;const e=new Mt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new ht({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new ht({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new ht({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new ht({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new mt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})];s.syncEntitiesWithWalls([e,...l]);const n=new $t(i),o=new Bt({container:t,character:e,arena:s,objects:l,onSpawnObject:c=>{s.syncEntitiesWithWalls([c]),l.push(c),o.updateSelectorOptions()},onDeleteObject:c=>{const g=l.indexOf(c);g!==-1&&l.splice(g,1),o.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),l.length=0,o.updateSelectorOptions()}}),a=new zt(L,s);a.handleInteractions(e,s,l,o),o.onSelectionChange=c=>{a.selectedCanvasEntity=c},new At({arena:s,character:e,objects:l,renderer:n,inputManager:a,devPanel:o}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",Tt);

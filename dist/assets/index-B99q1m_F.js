var $t=Object.defineProperty;var At=(H,t,i)=>t in H?$t(H,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):H[t]=i;var r=(H,t,i)=>At(H,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const l of e)if(l.type==="childList")for(const a of l.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(e){const l={};return e.integrity&&(l.integrity=e.integrity),e.referrerPolicy&&(l.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?l.credentials="include":e.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(e){if(e.ep)return;e.ep=!0;const l=i(e);fetch(e.href,l)}})();class ft{constructor(t={}){r(this,"z");r(this,"hasVerticalVelocity");r(this,"verticalVelocity");r(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const St=class St{constructor(t=20,i=14,s=1){r(this,"width");r(this,"height");r(this,"tileSize");r(this,"cols");r(this,"rows");r(this,"wallHeight");r(this,"gravity");r(this,"frictionCoeff");r(this,"staticFrictionThreshold");r(this,"tileGrid");r(this,"walls",[]);r(this,"currentPresetId","trenches");this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("trenches")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,i,s){if(t<0||t>=this.cols||i<0||i>=this.rows)return!1;const e=s?1:0;return this.tileGrid[i][t]===e?!1:(this.tileGrid[i][t]=e,this.rebuildWalls(),!0)}hasWall(t,i){return t<0||t>=this.cols||i<0||i>=this.rows?!1:this.tileGrid[i][t]===1}loadWallPreset(t,i){const s=St.WALL_PRESETS.find(e=>e.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(i),!0):!1}syncEntitiesWithWalls(t){var i;if(t)for(const s of t){const e=s.hasCollider?s.colliderRadius:((i=s.colliderModule)==null?void 0:i.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,e);if(l)s.position.z<l.wallHeight?(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new ft({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.standingWall=l,s.verticalVelocity=0):(s.standingWall=l,s.supportingSurfaceHeight=l.wallHeight);else if((s.supportingSurfaceHeight>=this.wallHeight-.05||s.standingWall!==null)&&(s.standingWall=null,s.supportingSurfaceHeight=0,s.isCharacter)){const a=s;a.climbingModule&&(a.climbingModule.isDismountFreefall=!0,a.climbingModule.climbSuppressedUntilRelease=!0)}}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("trenches",t)}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),a=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,n=i-a;return o*o+n*n<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}areWallsContiguous(t,i){if(t.id===i.id)return!0;const s=Math.max(0,Math.max(t.x,i.x)-Math.min(t.x+t.width,i.x+i.width)),e=Math.max(0,Math.max(t.y,i.y)-Math.min(t.y+t.height,i.y+i.height)),l=Math.min(t.x+t.width,i.x+i.width)-Math.max(t.x,i.x),a=Math.min(t.y+t.height,i.y+i.height)-Math.max(t.y,i.y);return s<.001&&a>.05||e<.001&&l>.05}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}};r(St,"WALL_PRESETS",[{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>1));for(let e=2;e<=17;e++)s[3][e]=0,s[7][e]=0,s[10][e]=0;for(let e=2;e<=11;e++)s[e][5]=0,s[e][10]=0,s[e][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let e=5;e<=9;e++)s[e][2]=0;for(let e=5;e<=9;e++)s[e][17]=0;for(let e=2;e<=5;e++)s[5][e]=0;for(let e=10;e<=14;e++)s[5][e]=0;for(let e=5;e<=10;e++)s[9][e]=0;for(let e=14;e<=17;e++)s[9][e]=0;return s[7][5]=0,s}},{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=10;for(let l=1;l<=4;l++)s[l][e]=1;for(let l=8;l<=12;l++)s[l][e]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=2;e<=4;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=9;e<=11;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=6;e<=7;e++)for(let l=9;l<=10;l++)s[e][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,a]of e)s[a][l]=1,s[a+1][l]=1,s[a][l+1]=1,s[a+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=1;e<=9;e++)s[e][4]=1;for(let e=4;e<=12;e++)s[e][7]=1;for(let e=1;e<=9;e++)s[e][10]=1;for(let e=4;e<=12;e++)s[e][13]=1;for(let e=1;e<=9;e++)s[e][16]=1;for(let e=7;e<=10;e++)s[4][e]=1;for(let e=13;e<=16;e++)s[4][e]=1;for(let e=4;e<=7;e++)s[9][e]=1;for(let e=10;e<=13;e++)s[9][e]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,i)=>Array.from({length:i},()=>Array.from({length:t},()=>0))}]);let Q=St;class dt{constructor(t={}){r(this,"radius");r(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class ht{constructor(t={}){r(this,"mass");r(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class ut{constructor(t={}){r(this,"staticFrictionMod");r(this,"dynamicFrictionMod");r(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class yt{constructor(t={}){r(this,"bounceMod");r(this,"verticalBounce");r(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class mt{constructor(t={}){r(this,"enabled");this.enabled=t.enabled??!0}}class it{constructor(t={}){r(this,"id");r(this,"name");r(this,"position");r(this,"velocity");r(this,"color");r(this,"isHeld");r(this,"heldBy");r(this,"lastThrower",null);r(this,"isCharacter",!1);r(this,"isClimbing",!1);r(this,"visualShape","circle");r(this,"colliderModule",null);r(this,"massModule",null);r(this,"frictionModule",null);r(this,"bounceModule",null);r(this,"verticalPositionModule",null);r(this,"gravityModule",null);r(this,"rollModule",null);r(this,"supportingSurfaceHeight",0);r(this,"standingWall",null);var i,s,e,l,a;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((a=t.velocity)==null?void 0:a.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new dt({radius:t.colliderRadius}):new dt({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new ht({mass:t.mass}):new ht({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new ut({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new yt({bounceMod:t.bounceMod}):new yt({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new ft({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new mt,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new dt({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new ht({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new ut({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new ut({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new yt({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.85||this.supportingSurfaceHeight>=.85||this.standingWall!==null)}updatePosition(t,i){var m,k,p,b,w,F,P,V,T,O,B,D;if(this.isHeld)return;if(this.lastThrower){const C=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,y=(((m=this.lastThrower.pickupModule)==null?void 0:m.pickupReach)??1.3)+this.colliderRadius+C;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>y||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0;if(this.hasCollider&&this.hasVerticalPosition&&i.walls.length>0)if(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05&&this.position.z>=i.wallHeight-.2||this.standingWall!==null){const y=this.isCharacter?this:null;if(!!((k=y==null?void 0:y.climbingModule)!=null&&k.isDismountFreefall||(p=y==null?void 0:y.climbingModule)!=null&&p.climbSuppressedUntilRePress))this.standingWall=null,s=0;else if(this.isCharacter){if(this.standingWall){const x=i.walls.find($=>$.id===this.standingWall.id),S=this.colliderRadius;if((x?i.testWallOverlap(this.position.x,this.position.y,S,x):!1)&&x)this.standingWall=x,s=x.wallHeight;else if(x&&((b=y==null?void 0:y.climbingModule)!=null&&b.dismountSuppressedUntilRelease))this.standingWall=x,s=x.wallHeight;else{let $=null;if(x){for(const R of i.walls)if(i.areWallsContiguous(x,R)&&i.testWallOverlap(this.position.x,this.position.y,S,R)){$=R;break}}else $=i.getSupportingWall(this.position.x,this.position.y,S);$?(this.standingWall=$,s=$.wallHeight):(this.standingWall=null,s=0,y!=null&&y.climbingModule&&(y.climbingModule.isDismountFreefall=!0,y.climbingModule.climbSuppressedUntilRelease=!0))}}else if(!this.isClimbing&&(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05)){const x=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);x&&(this.standingWall=x,s=x.wallHeight)}}else{const x=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);x?(this.standingWall=x,s=x.wallHeight):(this.standingWall=null,s=0)}}else this.standingWall=null;else this.standingWall=null,s=0;if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const C=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const y=this.rollModule,M=this.colliderRadius>0?this.colliderRadius:.3,x=.4,S=this.bounceMod,L=(1+S)*this.mass*C,$=i.frictionCoeff*this.dynamicGroundFrictionMod*.05,R=this.velocity.x-y.angularVelocity.y*M,A=this.velocity.y+y.angularVelocity.x*M,z=Math.hypot(R,A);if(z>.001&&$>0){const E=$*L,q=z*this.mass/(1+1/x),j=Math.min(q,E),I=R/z*j,X=A/z*j;this.velocity.x-=I/this.mass,this.velocity.y-=X/this.mass,y.angularVelocity.y+=I/(x*this.mass*M),y.angularVelocity.x-=X/(x*this.mass*M)}const W=Math.max(.65,1-(1-S)*.35);y.angularVelocity.x*=W,y.angularVelocity.y*=W,y.angularVelocity.z*=W}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((w=this.walkingModule)==null?void 0:w.enabled)))if(this.rollModule&&this.rollModule.enabled){const y=this.rollModule,M=this.colliderRadius>0?this.colliderRadius:.3,x=i.frictionCoeff*this.dynamicGroundFrictionMod,S=.4,L=this.velocity.x-y.angularVelocity.y*M,$=this.velocity.y+y.angularVelocity.x*M,R=Math.hypot(L,$);if(x>0&&R>.001){const z=x*(1+1/S)*t;if(R<=z){const W=this.velocity.x+S*y.angularVelocity.y*M,E=this.velocity.y-S*y.angularVelocity.x*M,q=W/(1+S),j=E/(1+S);this.velocity.x=q,this.velocity.y=j,y.angularVelocity.y=q/M,y.angularVelocity.x=-j/M}else{const W=L/R*x*t,E=$/R*x*t;this.velocity.x-=W,this.velocity.y-=E,y.angularVelocity.y+=W/(S*M),y.angularVelocity.x-=E/(S*M)}}const A=Math.hypot(this.velocity.x,this.velocity.y);if(A>0){if(y.rollResistance>0){const z=y.rollResistance*t,W=Math.max(0,A-z);if(W<.005)this.velocity.x=0,this.velocity.y=0,y.angularVelocity.x=0,y.angularVelocity.y=0;else{const E=W/A;this.velocity.x*=E,this.velocity.y*=E,y.angularVelocity.x*=E,y.angularVelocity.y*=E}}}else{const z=Math.hypot(y.angularVelocity.x,y.angularVelocity.y);if(z>0&&x>0){const W=x/(S*M)*t,E=Math.max(0,z-W),q=z>0?E/z:0;y.angularVelocity.x*=q,y.angularVelocity.y*=q}}if(Math.abs(y.angularVelocity.z)>.001&&y.rollResistance>0){const z=y.rollResistance/(S*M)*t,W=Math.sign(y.angularVelocity.z),E=Math.abs(y.angularVelocity.z);y.angularVelocity.z=E<=z?0:W*(E-z)}y.updateVisualPhase(t)}else{const y=Math.hypot(this.velocity.x,this.velocity.y);if(y>0){const M=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(y<M)this.velocity.x=0,this.velocity.y=0;else{const x=i.frictionCoeff*this.dynamicGroundFrictionMod*t,L=Math.max(0,y-x)/y;this.velocity.x*=L,this.velocity.y*=L}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);const l=this.isCharacter?this:null,a=l==null?void 0:l.climbingModule,o=!this.isClimbing&&this.supportingSurfaceHeight>=i.wallHeight-.05&&this.standingWall!==null,n=Math.max(.01,(a==null?void 0:a.hangDistance)??.1);if(a)if(this.position.z<=.01)a.isAssistClampArmed=!1,a.hasLeftClampZoneSinceDismount=!0;else if(o&&this.standingWall){const C=this.standingWall,y=[C];for(const S of i.walls)S.id!==C.id&&i.areWallsContiguous(C,S)&&y.push(S);let M=1/0;for(const S of y){const L=Math.max(S.x,Math.min(this.position.x,S.x+S.width)),$=Math.max(S.y,Math.min(this.position.y,S.y+S.height)),R=Math.hypot(this.position.x-L,this.position.y-$);R<M&&(M=R)}M<=n+.001?l.isClimbInputHeld&&!a.dismountSuppressedUntilRelease?(a.isAssistClampArmed=!1,a.hasLeftClampZoneSinceDismount=!1):a.hasLeftClampZoneSinceDismount&&(a.isAssistClampArmed=!0):(a.hasLeftClampZoneSinceDismount=!0,a.isAssistClampArmed=!1)}else a.isAssistClampArmed=!1;const d=!!(l&&o&&(a!=null&&a.enabled)&&(a!=null&&a.preventWalkOff)&&(a!=null&&a.isAssistClampArmed)),c=this.velocity.x*t,u=this.velocity.y*t,g=Math.hypot(c,u);if(g>1e-4)if(d){const C=Math.max(.01,((F=l==null?void 0:l.climbingModule)==null?void 0:F.hangDistance)??.1);let y=this.standingWall??i.getSupportingWall(this.position.x,this.position.y,C);this.standingWall=y;const M=this.position.x+c,x=this.position.y+u,S=[];if(y){S.push(y);for(const $ of i.walls)$.id!==y.id&&i.areWallsContiguous(y,$)&&S.push($)}let L=null;for(const $ of S)if(i.testWallOverlap(M,x,C,$)){L=$;break}if(L)this.position.x=M,this.position.y=x,this.standingWall=L;else if(S.length>0){let $=1/0,R=null;for(const A of S){const z=Math.max(A.x,Math.min(M,A.x+A.width)),W=Math.max(A.y,Math.min(x,A.y+A.height)),E=M-z,q=x-W,j=E*E+q*q;j<$&&($=j,R={wall:A,closestX:z,closestY:W,dist:Math.sqrt(j),dx:E,dy:q})}if(R&&R.dist>0){const A=R.dx/R.dist,z=R.dy/R.dist,W=this.velocity.x*A+this.velocity.y*z;W>0&&(this.velocity.x-=W*A,this.velocity.y-=W*z);const E=C-.002;R.dist>E?(this.position.x=R.closestX+A*E,this.position.y=R.closestY+z*E):(this.position.x=M,this.position.y=x);const q=i.testWallOverlap(this.position.x,this.position.y,C,R.wall)?R.wall:S.find(j=>i.testWallOverlap(this.position.x,this.position.y,C,j));q&&(this.standingWall=q)}else this.velocity.x=0,this.velocity.y=0}}else{const y=Math.max(1,Math.ceil(g/.01)),M=c/y,x=u/y;let S=this.standingWall??(o?i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null),L=!1;for(let $=1;$<=y;$++){const R=this.position.x+M,A=this.position.y+x;if(S){let W=null;if(i.testWallOverlap(R,A,this.colliderRadius,S))W=S;else for(const E of i.walls)if(i.areWallsContiguous(S,E)&&i.testWallOverlap(R,A,this.colliderRadius,E)){W=E;break}W?(S=W,this.standingWall=W):(P=l==null?void 0:l.climbingModule)!=null&&P.dismountSuppressedUntilRelease||(L=!0,S=null,this.standingWall=null,this.supportingSurfaceHeight=0,l!=null&&l.climbingModule&&(l.climbingModule.isDismountFreefall=!0,l.climbingModule.climbSuppressedUntilRelease=!0))}if(this.position.x=R,this.position.y=A,!this.isClimbing&&(L||!this.standingWall&&!!((V=l==null?void 0:l.climbingModule)!=null&&V.isDismountFreefall||(T=l==null?void 0:l.climbingModule)!=null&&T.climbSuppressedUntilRePress))&&this.hasCollider)for(const W of i.walls)this.position.z<=W.wallHeight&&this.resolveWallCollision(W)}}if(this.hasCollider){const C=this.colliderRadius,y=C,M=i.width-C,x=C,S=i.height-C,L=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<y?(this.position.x=y,this.resolveWallImpact(1,0,L)):this.position.x>M&&(this.position.x=M,this.resolveWallImpact(-1,0,L)),this.position.y<x?(this.position.y=x,this.resolveWallImpact(0,1,L)):this.position.y>S&&(this.position.y=S,this.resolveWallImpact(0,-1,L));const $=!!((O=l==null?void 0:l.climbingModule)!=null&&O.isDismountFreefall||(B=l==null?void 0:l.climbingModule)!=null&&B.climbSuppressedUntilRePress);for(const R of i.walls)if(this.position.z<=R.wallHeight){if(this.position.z>=R.wallHeight-.05&&!$&&(((D=this.standingWall)==null?void 0:D.id)===R.id||i.testWallOverlap(this.position.x,this.position.y,this.colliderRadius,R)))continue;if(this.position.z<R.wallHeight-.05||$||this.standingWall===null){if(this.standingWall&&(this.standingWall.id===R.id||i.areWallsContiguous(this.standingWall,R)))continue;this.resolveWallCollision(R)}}}const v=16,f=Math.hypot(this.velocity.x,this.velocity.y);if(f>v){const C=v/f;this.velocity.x*=C,this.velocity.y*=C}if(this.rollModule&&this.rollModule.enabled){const y=this.rollModule.angularSpeed;if(y>35){const M=35/y;this.rollModule.angularVelocity.x*=M,this.rollModule.angularVelocity.y*=M,this.rollModule.angularVelocity.z*=M}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}static getClosestWallPoint(t,i,s){if(!s.walls||s.walls.length===0)return null;let e=1/0,l=null;for(const a of s.walls){const o=Math.max(a.x,Math.min(t,a.x+a.width)),n=Math.max(a.y,Math.min(i,a.y+a.height)),d=t-o,c=i-n,u=d*d+c*c;u<e&&(e=u,l={wall:a,closestX:o,closestY:n,dist:Math.sqrt(u),dx:d,dy:c})}return l}resolveWallImpact(t,i,s){this.lastThrower=null;const e=this.velocity.x*t+this.velocity.y*i;if(e>=0)return;const l=e;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*i):(this.velocity.x-=l*t,this.velocity.y-=l*i),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const a=this.rollModule,o=this.colliderRadius>0?this.colliderRadius:.3,n=.4,d=.35,c=-i,u=t,g=this.velocity.x*c+this.velocity.y*u,v=-(1+s)*this.mass*l,f=g-a.angularVelocity.z*o,m=Math.abs(f)*this.mass/(1+1/n),k=d*v,p=Math.min(m,k),b=-Math.sign(f)*p,w=g,F=w+b/this.mass,P=Math.abs(F)<=Math.abs(w)+.01?F-w:-w*.1;this.velocity.x+=P*c,this.velocity.y+=P*u;const T=-(P*this.mass)/(n*this.mass*o);a.angularVelocity.z+=T,a.angularVelocity.z=Math.max(-30,Math.min(30,a.angularVelocity.z)),a.angularVelocity.y=this.velocity.x/o,a.angularVelocity.x=-this.velocity.y/o}}resolveWallCollision(t){if(!this.hasCollider)return;const i=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),e=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,a=this.position.y-e,o=l*l+a*a;if(o<i*i){this.lastThrower=null;const n=Math.sqrt(o);let d=0,c=0,u=0;if(n===0){const v=Math.abs(this.position.x-t.x),f=Math.abs(t.x+t.width-this.position.x),m=Math.abs(this.position.y-t.y),k=Math.abs(t.y+t.height-this.position.y),p=Math.min(v,f,m,k);p===v?(d=-1,u=v+i):p===f?(d=1,u=f+i):p===m?(c=-1,u=m+i):(c=1,u=k+i)}else u=i-n,d=l/n,c=a/n;this.position.x+=d*u,this.position.y+=c*u;const g=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(d,c,g)}}}class Rt{constructor(){r(this,"id","walking");r(this,"name","Walking Module");r(this,"enabled",!0);r(this,"maxWalkForce",35);r(this,"maxWalkSpeed",5.2);r(this,"dragDamping",8.01)}update(t,i,s,e){var O;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((O=t.frictionModule)!=null&&O.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(i.x,i.y),a=l>.05;if(t.isActivelyWalking=a,t.mass<=.01)return;const n=t.dynamicGroundFrictionMod;if(n<=.001)return;const d=e.frictionCoeff/10,c=n*d,g=t.carriedMass/(Math.max(.1,t.strength)*8),v=this.maxWalkSpeed/(1+g);let f=0,m=0;if(a){const B=i.x/l,D=i.y/l;f=B*v,m=D*v}const k=f-t.velocity.x,p=m-t.velocity.y,b=Math.hypot(k,p);if(b<.001){t.velocity.x=f,t.velocity.y=m;return}const w=Math.hypot(t.velocity.x,t.velocity.y),F=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),P=t.hasMass?Math.max(.2,t.baseMass):1,T=this.maxWalkForce*t.strength/P*c*s;if(b<=T||!a&&w<F)t.velocity.x=f,t.velocity.y=m;else{const B=T/b;t.velocity.x+=k*B,t.velocity.y+=p*B}}}class Wt{constructor(){r(this,"id","pickup");r(this,"name","Pickup Ability");r(this,"enabled",!0);r(this,"pickupReach",1.3);r(this,"crossLayerReachRatio",.55)}isObjectInReach(t,i,s=1){var c;if(!this.enabled||i===t||i.isHeld||i.isCharacter||i.lastThrower===t)return!1;const e=t.position.z>=s-.05?1:0,l=i.position.z>=s-.05?1:0,o=e!==l?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,n=i.hasCollider?i.colliderRadius:((c=i.colliderModule)==null?void 0:c.radius)??.32;return Math.hypot(i.position.x-t.position.x,i.position.y-t.position.y)<=o+n}findTargetObject(t,i,s,e,l=1){if(!this.enabled)return null;let a=null,o=1/0;for(const n of e){if(!this.isObjectInReach(t,n,l))continue;const d=Math.hypot(n.position.x-i,n.position.y-s);d<o&&(o=d,a=n)}return a}pickup(t,i){if(!this.enabled||t.heldObject)return!1;const s=i.velocity.x,e=i.velocity.y,l=i.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=e*l,t.isAboveGround&&Math.abs(i.verticalVelocity)>.1&&(t.verticalVelocity+=i.verticalVelocity*l),t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=i.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const i=t.heldObject;if(t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.lastThrower=t,i.velocity.x=t.velocity.x,i.velocity.y=t.velocity.y,i.verticalVelocity=t.isAboveGround?t.verticalVelocity:0,i.hasFriction&&i.rollModule&&i.rollModule.enabled){const s=i.colliderRadius>0?i.colliderRadius:.3;i.rollModule.angularVelocity.y=i.velocity.x/s,i.rollModule.angularVelocity.x=-i.velocity.y/s}return i}}class Pt{constructor(){r(this,"id","throw");r(this,"name","Throw Ability");r(this,"enabled",!0);r(this,"baseThrowForce",7.6);r(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),a=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,n=i-a;return o*o+n*n<s*s}computeLaunchVelocity(t,i,s,e,l,a,o,n=!0,d=!0,c=.35,u){const g=e-t,v=l-i,f=Math.hypot(g,v);if(f<.1)return null;const m=Math.min(f,this.maxThrowAimDistance),k=g/f,p=v/f,b=t+k*m,w=i+p*m,F=(u==null?void 0:u.x)??0,P=(u==null?void 0:u.y)??0,V=F*k+P*p,T=F*-p+P*k,O=Math.sqrt(Math.max(.25,o*o-T*T)),B=Math.max(1.5,V+O);if(!n||!d){const W=Math.max(.14,m/B),E=k*B,q=p*B;return{vx:E,vy:q,vz:0,totalTime:W,finalTargetX:b,finalTargetY:w,targetSurfaceHeight:s}}const D=a.getSupportingSurfaceHeight(b,w),C=D-s;let M=Math.max(.14,m/B);C>0&&(M=Math.max(M,Math.sqrt(2*C/a.gravity)));const x=40,S=c>0?c:.35,L=.25;for(let W=1;W<x;W++){const E=W/x,q=t+(b-t)*E,j=i+(w-i)*E;for(const I of a.walls)if(this.testWallIntersection(q,j,S,I)){if(D>0&&b>=I.x&&b<=I.x+I.width&&w>=I.y&&w<=I.y+I.height&&E>.65)continue;const h=(1-E)*s+E*D,U=I.wallHeight+L-h;if(U>0){const Y=a.gravity*E*(1-E);if(Y>.001){const Z=2*U/Y;if(Z>0){const N=Math.sqrt(Z);N>M&&(M=N)}}}}}if(M<=.05)return null;const $=(C+.5*a.gravity*M*M)/M,R=m/M,A=k*R,z=p*R;return{vx:A,vy:z,vz:$,totalTime:M,finalTargetX:b,finalTargetY:w,targetSurfaceHeight:D}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,a=l.position.x,o=l.position.y,n=l.position.z,d=this.baseThrowForce*t.strength,c=l.hasGravity&&l.hasVerticalVelocity,u={x:t.velocity.x,y:t.velocity.y,z:t.isAboveGround?t.verticalVelocity:0},g=this.computeLaunchVelocity(a,o,n,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius,u);if(!g)return null;const{vx:v,vy:f,vz:m,totalTime:k,finalTargetX:p,finalTargetY:b,targetSurfaceHeight:w}=g,F=90,P=k/F,V=[];let T=!1,O=w>0,B,D=n;for(let y=0;y<=F;y++){const M=y*P,x=y===F?p:a+v*M,S=y===F?b:o+f*M,L=c?n+m*M-.5*e.gravity*M*M:n,$=c?y===F?w:Math.max(w,L):n,R=c?m-e.gravity*M:0;$>D&&(D=$);const A=$>e.wallHeight;let z=!1,W=!1;for(const E of e.walls)if(this.testWallIntersection(x,S,l.colliderRadius,E)&&(z=!0,$<=E.wallHeight+.001)){if(V.length>0&&V[V.length-1].z>=E.wallHeight-.05&&R<=0){if(w>0&&(y>=F-2||Math.hypot(x-p,S-b)<.2)){O=!0;break}else if(w===0){O=!0,W=!0,T=!0,B=E.id;break}}else if($<E.wallHeight-.05){W=!0,T=!0,B=E.id;break}}if(V.push({x,y:S,z:$,t:M,couldClearWall:A,isOverWall:z,collidesWall:W}),W)break}const C=V[V.length-1];return{points:V,landPoint:{x:T?C.x:p,y:T?C.y:b},isBlockedByWall:T,isLandingOnWallTop:T?O:w>0,blockedAtWallId:B,peakHeight:D,flightTime:k}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,a=l.position.x,o=l.position.y,n=l.position.z,d=this.baseThrowForce*t.strength,c={x:t.velocity.x,y:t.velocity.y,z:t.isAboveGround?t.verticalVelocity:0},u=this.computeLaunchVelocity(a,o,n,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius,c);if(!u)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=u.vx,l.velocity.y=u.vy,l.verticalVelocity=u.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const p=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=u.vx/p,l.rollModule.angularVelocity.x=-u.vy/p}const g=l.hasMass?l.mass:0,v=t.hasMass?Math.max(.2,t.baseMass):0,f=g>0&&v>0?g/v:0;t.heldObject=null;const m=u.vx-t.velocity.x,k=u.vy-t.velocity.y;if(t.velocity.x-=m*f,t.velocity.y-=k*f,t.isAboveGround&&l.hasVerticalVelocity){const p=u.vz-t.verticalVelocity;t.verticalVelocity-=p*f}return l}}class Ft{constructor(t){r(this,"id","climbing");r(this,"name","Climbing Module");r(this,"enabled",!0);r(this,"maxAdhesion",35);r(this,"maxClimbSpeed",3);r(this,"preventWalkOff",!0);r(this,"horizontalClimb",!1);r(this,"hangDistance",.1);r(this,"dismountSuppressedUntilRelease",!1);r(this,"climbSuppressedUntilRelease",!1);r(this,"isDismountFreefall",!1);r(this,"isAssistClampArmed",!1);r(this,"hasLeftClampZoneSinceDismount",!0);r(this,"wasClimbHeldLastTick",!1);(t==null?void 0:t.maxAdhesion)!==void 0&&(this.maxAdhesion=t.maxAdhesion),(t==null?void 0:t.maxClimbSpeed)!==void 0&&(this.maxClimbSpeed=t.maxClimbSpeed),(t==null?void 0:t.preventWalkOff)!==void 0&&(this.preventWalkOff=t.preventWalkOff),(t==null?void 0:t.horizontalClimb)!==void 0&&(this.horizontalClimb=t.horizontalClimb),(t==null?void 0:t.hangDistance)!==void 0&&(this.hangDistance=t.hangDistance)}get climbSuppressedUntilRePress(){return this.isDismountFreefall||this.climbSuppressedUntilRelease}set climbSuppressedUntilRePress(t){this.isDismountFreefall=t,this.climbSuppressedUntilRelease=t}update(t,i,s,e,l){const a=s&&!this.wasClimbHeldLastTick;if(this.wasClimbHeldLastTick=s,s||(this.dismountSuppressedUntilRelease=!1,this.climbSuppressedUntilRelease=!1),(t.position.z<=.01||a)&&(this.isDismountFreefall=!1,t.position.z<=.01&&(this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)),this.climbSuppressedUntilRelease||!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const o=t.hasCollider?t.colliderRadius:.44,n=Math.hypot(i.x,i.y),d=n>=.05,c=d?i.x/n:0,u=d?i.y/n:0;if(!t.isClimbing&&(t.standingWall!==null||t.position.z>=l.wallHeight))return t.isClimbing=!1,!1;let g=null,v=1/0,f=0,m=0,k=0;for(const P of l.walls){const V=Math.max(P.x,Math.min(t.position.x,P.x+P.width)),T=Math.max(P.y,Math.min(t.position.y,P.y+P.height)),O=V-t.position.x,B=T-t.position.y,D=Math.hypot(O,B);D<=o+.15&&D<v&&(v=D,g=P,f=d?c*O+u*B:0,m=O,k=B)}if(!g)return t.isClimbing=!1,!1;const p=t.mass;if(p*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;const w=t.isClimbing;if(w&&t.position.z<g.wallHeight){const P=v>.001?m/v:0,V=v>.001?k/v:0,T=-V,O=P,B=d?c*P+u*V:0,D=d?c*T+u*O:0;if(d&&(B<-.3||!this.horizontalClimb&&f<-.1))return t.isClimbing=!1,t.velocity.x=c*3,t.velocity.y=u*3,s&&(this.climbSuppressedUntilRelease=!0),!1;if(t.isClimbing=!0,t.verticalVelocity=0,t.standingWall=null,this.horizontalClimb&&d&&Math.abs(D)>=.1){const C=t.baseMass,y=Math.max(.5,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*C*t.strength/Math.max(.1,p)));t.velocity.x=T*D*y,t.velocity.y=O*D*y}else t.velocity.x=0,t.velocity.y=0;if(s){const C=t.baseMass,y=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*C*t.strength/Math.max(.1,p)));t.position.z+=y*e,t.position.z>=g.wallHeight&&(t.position.z=g.wallHeight,t.supportingSurfaceHeight=g.wallHeight,t.standingWall=g,t.verticalVelocity=0,t.isClimbing=!1,this.dismountSuppressedUntilRelease=!0,this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)}return!0}if(!w&&t.position.z>.05&&t.position.z<g.wallHeight)return a?(t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0,!0):(t.isClimbing=!1,!1);if(s&&d&&f>.01&&v<=o+.03&&t.position.z<g.wallHeight){if(v>.001){const T=m/v,O=k/v;t.position.x=t.position.x+m-T*o,t.position.y=t.position.y+k-O*o}t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const P=t.baseMass,V=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*P*t.strength/Math.max(.1,p)));return t.position.z+=V*e,!0}return t.isClimbing=!1,!1}}class wt{constructor(t={}){r(this,"id","strength");r(this,"name","Strength Module");r(this,"enabled",!0);r(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class xt extends it{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});r(this,"strengthModule");r(this,"facingAngle");r(this,"heldObject");r(this,"isCharacter",!0);r(this,"isActivelyWalking",!1);r(this,"isClimbInputHeld",!1);r(this,"baseMass",1.2);r(this,"walkingModule");r(this,"pickupModule");r(this,"throwModule");r(this,"climbingModule");r(this,"isAiming");r(this,"aimTarget");r(this,"activeTrajectory");this.baseMass=i.mass??1.2,this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new wt({strength:i.strength??1}),this.walkingModule=new Rt,this.pickupModule=new Wt,this.throwModule=new Pt,this.climbingModule=new Ft}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(i){this.strengthModule?this.strengthModule.strength=Math.max(.1,i):this.strengthModule=new wt({strength:i})}get mass(){const i=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return i+s}set mass(i){this.baseMass=Math.max(.1,i),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}get hangDistance(){return this.climbingModule?this.climbingModule.hangDistance:.1}set hangDistance(i){this.climbingModule&&(this.climbingModule.hangDistance=Math.max(0,i))}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,a=s.y-this.position.y;if(Math.hypot(l,a)>.1){this.facingAngle=Math.atan2(a,l);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,l,a,o=!1){if(this.isClimbInputHeld=o,this.climbingModule&&this.climbingModule.update(this,s,o,i,a),this.walkingModule&&this.walkingModule.update(this,s,i,a),this.updatePosition(i,a),this.updateFacingDirection(e,l,s),this.heldObject){const n=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*n,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*n,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,a):this.activeTrajectory=null}}class Mt{constructor(t={}){r(this,"enabled",!0);r(this,"angularVelocity",{x:0,y:0,z:0});r(this,"rollResistance",.4);r(this,"visualPhase",0);var i,s,e;this.enabled=t.enabled??!0,this.angularVelocity={x:((i=t.angularVelocity)==null?void 0:i.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((e=t.angularVelocity)==null?void 0:e.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const i=this.angularSpeed;i>.001&&(this.visualPhase=(this.visualPhase+i*t)%(Math.PI*2))}}class et{constructor(t){r(this,"ctx");this.ctx=t}render(t,i,s,e,l=!1,a,o,n=!1,d){const c=this.ctx,u=c.canvas.width/t.width;c.clearRect(0,0,c.canvas.width,c.canvas.height),this.drawFloorGrid(t,u),this.drawWalls(t,u),n&&d&&this.drawWallEditorHover(t,d,u);const g=[i,...s];g.sort((v,f)=>Math.abs(v.position.z-f.position.z)>.001?v.position.z-f.position.z:Math.abs(v.verticalVelocity-f.verticalVelocity)>.001?v.verticalVelocity-f.verticalVelocity:v.position.y-f.position.y);for(const v of g)v instanceof xt?this.drawCharacter(v,g,u,t):this.drawFreebodyObject(v,g,i,u,v===o,t),this.drawObjectShadow(v,t,u);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,u),l&&(a&&a!==e&&this.drawHoverGizmo(a,u),e&&this.drawSelectionGizmo(e,l,u))}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawWallEditorHover(t,i,s){if(i.col<0||i.col>=t.cols||i.row<0||i.row>=t.rows)return;const e=this.ctx,l=i.col*t.tileSize*s,a=i.row*t.tileSize*s,o=t.tileSize*s,n=t.hasWall(i.col,i.row);e.save(),n?(e.fillStyle="rgba(239, 68, 68, 0.35)",e.strokeStyle="#ef4444",e.lineWidth=2.5,e.fillRect(l,a,o,o),e.strokeRect(l,a,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#fca5a5",e.textAlign="center",e.textBaseline="middle",e.fillText("✕ Erase",l+o/2,a+o/2)):(e.fillStyle="rgba(56, 189, 248, 0.3)",e.strokeStyle="#38bdf8",e.lineWidth=2.5,e.fillRect(l,a,o,o),e.strokeRect(l,a,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#7dd3fc",e.textAlign="center",e.textBaseline="middle",e.fillText("+ Draw",l+o/2,a+o/2)),e.restore()}static getAltitudeScale(t,i){return 1+Math.max(0,t)/Math.max(.1,i)*.5}isEntityPassingOverAnother(t,i,s){var n,d;const e=t.position.z,l=et.getAltitudeScale(e,s.wallHeight),a=t.hasCollider?t.colliderRadius:((n=t.colliderModule)==null?void 0:n.radius)??.32,o=a*l;for(const c of i){if(c===t)continue;const u=c.position.z;if(!(e>u+.001||Math.abs(e-u)<=.01&&t.verticalVelocity>c.verticalVelocity))continue;const v=et.getAltitudeScale(u,s.wallHeight),f=c.hasCollider?c.colliderRadius:((d=c.colliderModule)==null?void 0:d.radius)??.32,m=f*v,k=Math.hypot(t.position.x-c.position.x,t.position.y-c.position.y),p=Math.max(a+f,o+m*.7);if(k<p)return!0}return!1}drawObjectShadow(t,i,s){const e=this.ctx,l=t.position.x*s,a=t.position.y*s,o=t.position.z,n=t.colliderRadius*s,d=o>=i.wallHeight-.001;if(e.save(),e.beginPath(),t.visualShape==="box"){const c=n*2,u=Math.max(3,n*.16);e.roundRect?e.roundRect(l-n,a-n,c,c,u):e.rect(l-n,a-n,c,c)}else e.arc(l,a,n,0,Math.PI*2);o>.01&&e.setLineDash([7,4]),e.strokeStyle="rgba(0, 0, 0, 0.85)",e.lineWidth=d?5.2:4,e.stroke(),d?(e.strokeStyle="#38bdf8",e.lineWidth=3.2,e.shadowColor="#0284c7",e.shadowBlur=8):(e.strokeStyle="#ffffff",e.lineWidth=2.2),e.stroke(),e.restore()}drawFreebodyObject(t,i,s,e,l=!1,a){var k,p;const o=this.ctx,n=t.position.x*e,d=t.position.y*e,c=et.getAltitudeScale(t.position.z,a.wallHeight),g=(t.hasCollider?t.colliderRadius:((k=t.colliderModule)==null?void 0:k.radius)??.32)*e*c,f=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled&&!t.isHeld&&(((p=s.pickupModule)==null?void 0:p.isObjectInReach(s,t,a.wallHeight))??!1);if(f){if(o.save(),o.beginPath(),t.visualShape==="box"){const b=(g+5)*2;o.roundRect?o.roundRect(n-g-5,d-g-5,b,b,6):o.rect(n-g-5,d-g-5,b,b)}else o.arc(n,d,g+5,0,Math.PI*2);l?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",n,d-g-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}const m=this.isEntityPassingOverAnother(t,i,a);if(o.save(),o.globalAlpha=m?.55:1,t.visualShape==="box"){const b=g*2,w=Math.max(3,g*.16),F=n-g,P=d-g;o.beginPath(),o.roundRect?o.roundRect(F,P,b,b,w):o.rect(F,P,b,b),o.fillStyle=t.color,o.fill(),o.strokeStyle=f?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=f?2.5:2,o.stroke();const V=Math.max(3,g*.22);o.beginPath(),o.roundRect?o.roundRect(F+V,P+V,b-V*2,b-V*2,w*.7):o.rect(F+V,P+V,b-V*2,b-V*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(F+V,P+V),o.lineTo(F+b-V,P+b-V),o.moveTo(F+b-V,P+V),o.lineTo(F+V,P+b-V),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(n,d,g,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=f?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=f?2.5:2,o.stroke();this.drawRollIndicator(t,n,d,g),o.restore()}drawCharacter(t,i,s,e){const l=this.ctx,a=t.position.x*s,o=t.position.y*s,n=et.getAltitudeScale(t.position.z,e.wallHeight),d=t.colliderRadius*s*n,c=this.isEntityPassingOverAnother(t,i,e);l.save(),l.globalAlpha=c?.55:1,l.beginPath(),l.arc(a,o,d,0,Math.PI*2),l.fillStyle=t.color,l.fill(),l.strokeStyle="#ffffff",l.lineWidth=2.5,l.stroke(),this.drawRollIndicator(t,a,o,d);const u=.52,g=d*.72,v=Math.max(3.5,d*.18),f=t.facingAngle-u,m=t.facingAngle+u,k=a+Math.cos(f)*g,p=o+Math.sin(f)*g,b=a+Math.cos(m)*g,w=o+Math.sin(m)*g;l.fillStyle="#000000",l.beginPath(),l.arc(k,p,v,0,Math.PI*2),l.arc(b,w,v,0,Math.PI*2),l.fill(),t.heldObject&&(l.strokeStyle="rgba(255, 255, 255, 0.6)",l.setLineDash([3,3]),l.lineWidth=1.5,l.beginPath(),l.moveTo(a,o),l.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),l.stroke(),l.setLineDash([])),l.restore()}drawRollIndicator(t,i,s,e){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,a=l.angularVelocity.x,o=l.angularVelocity.y,n=l.angularVelocity.z,d=Math.hypot(a,o,n);if(d<.02)return;const c=this.ctx,g=Math.hypot(a,o)<.05*d,v=2.5,f=5,m=4;if(c.save(),c.shadowColor="rgba(0, 0, 0, 0.75)",c.shadowBlur=3,g){const k=e*.5,p=e*.88;c.beginPath(),c.arc(i,s,k,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.5)",c.lineWidth=1.8,c.setLineDash([]),c.stroke(),c.beginPath(),c.arc(i,s,p,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.98)",c.lineWidth=v,c.setLineDash([f,m]),c.lineDashOffset=-l.visualPhase*p*Math.sign(n||1),c.stroke()}else{const k=Math.atan2(-a,o),p=e*.9,b=Math.abs(n)/d,w=p*Math.max(.35,Math.pow(b,.65));c.translate(i,s),c.rotate(k);const F=n!==0?Math.sign(n):1;c.beginPath(),c.ellipse(0,0,p,w,0,0,Math.PI),c.strokeStyle="rgba(255, 255, 255, 0.98)",c.lineWidth=v,c.setLineDash([f,m]),c.lineDashOffset=-l.visualPhase*p*F,c.stroke(),c.beginPath(),c.ellipse(0,0,p,w,0,Math.PI,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.35)",c.lineWidth=1.8,c.setLineDash([f,m]),c.lineDashOffset=-l.visualPhase*p*F,c.stroke()}c.restore()}drawTrajectory(t,i){const s=this.ctx,e=t.points;if(e.length<2)return;s.save();for(let a=0;a<e.length-1;a++){const o=e[a],n=e[a+1];s.beginPath(),s.moveTo(o.x*i,o.y*i),s.lineTo(n.x*i,n.y*i);const d=(o.z+n.z)*.5,c=et.getAltitudeScale(d,1);o.couldClearWall||n.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=3.6*c,s.setLineDash([7,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.2*c,s.setLineDash([4,4])),s.stroke()}if(e.length>2&&t.peakHeight&&t.peakHeight>.25){let a=e[0];for(const c of e)c.z>a.z&&(a=c);s.save();const o=a.x*i,n=a.y*i,d=a.z>=1;s.fillStyle=d?"#38bdf8":"#f59e0b",s.beginPath(),s.arc(o,n,d?4:3,0,Math.PI*2),s.fill(),s.restore()}const l=e[e.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const a=8;s.beginPath(),s.moveTo(l.x*i-a,l.y*i-a),s.lineTo(l.x*i+a,l.y*i+a),s.moveTo(l.x*i+a,l.y*i-a),s.lineTo(l.x*i-a,l.y*i+a),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,i){var n;const s=this.ctx,e=t.position.x*i,l=t.position.y*i,o=((t.hasCollider?t.colliderRadius:((n=t.colliderModule)==null?void 0:n.radius)??.32)+.08)*i;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(e,l,o,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,i,s){var g;const e=this.ctx,l=t.position.x*s,a=t.position.y*s,d=(t.hasCollider?t.colliderRadius:((g=t.colliderModule)==null?void 0:g.radius)??.32)*s+6,c=Math.max(6,d*.4),u=i?"#fbbf24":"#38bdf8";if(e.save(),e.strokeStyle=u,e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.moveTo(l-d,a-d+c),e.lineTo(l-d,a-d),e.lineTo(l-d+c,a-d),e.stroke(),e.beginPath(),e.moveTo(l+d-c,a-d),e.lineTo(l+d,a-d),e.lineTo(l+d,a-d+c),e.stroke(),e.beginPath(),e.moveTo(l+d,a+d-c),e.lineTo(l+d,a+d),e.lineTo(l+d-c,a+d),e.stroke(),e.beginPath(),e.moveTo(l-d+c,a+d),e.lineTo(l-d,a+d),e.lineTo(l-d,a+d-c),e.stroke(),i){const v=`${t.name} (${t.mass.toFixed(1)}kg)`;e.font="bold 10px 'Segoe UI', system-ui, sans-serif";const m=e.measureText(v).width+12,k=16,p=l-m/2,b=a-d-k-4;e.fillStyle="rgba(15, 23, 42, 0.85)",e.strokeStyle=u,e.lineWidth=1,e.beginPath(),e.roundRect(p,b,m,k,4),e.fill(),e.stroke(),e.fillStyle=u,e.textAlign="center",e.textBaseline="middle",e.fillText(v,l,b+k/2)}e.restore()}}class Dt{constructor(t,i){r(this,"canvas");r(this,"arena");r(this,"keysPressed",new Set);r(this,"mousePos",{x:0,y:0});r(this,"isMouseDown",!1);r(this,"isRightMouseDown",!1);r(this,"hoverWallTile",null);r(this,"movementVector",{x:0,y:0});r(this,"justPickedUp",!1);r(this,"isThrowingPress",!1);r(this,"hoverEntity",null);r(this,"selectedCanvasEntity",null);r(this,"draggedEntity",null);r(this,"dragOffset",{x:0,y:0});r(this,"handleClick");r(this,"onMouseDown");r(this,"onRightMouseDown");r(this,"onMouseUp");r(this,"onRightClick");r(this,"onDropAttempt");r(this,"onMouseMove");this.canvas=t,this.arena=i,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){e&&(this.selectedCanvasEntity=e.selectedEntity);const l=(n,d,c=.35)=>{var v;for(let f=s.length-1;f>=0;f--){const m=s[f],k=m.hasCollider?m.colliderRadius:((v=m.colliderModule)==null?void 0:v.radius)??.32;if(Math.hypot(m.position.x-n,m.position.y-d)<=k+c)return m}const u=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-n,t.position.y-d)<=u+c?t:null},a=(n,d)=>{if(n<0||n>=i.cols||d<0||d>=i.rows)return;if(i.setWallTile(n,d,!0)){const u=[t,...s];i.syncEntitiesWithWalls(u),i.currentPresetId="custom",e==null||e.updateWallPresetUI()}},o=(n,d)=>{if(!(n<0||n>=i.cols||d<0||d>=i.rows)&&i.tileGrid[d][n]===1){i.setWallTile(n,d,!1);const c=[t,...s];i.syncEntitiesWithWalls(c),i.currentPresetId="custom",e==null||e.updateWallPresetUI()}};this.onMouseDown=(n,d)=>{if(e!=null&&e.isEditMode){if(e.editTool==="walls"){const u=Math.floor(n/i.tileSize),g=Math.floor(d/i.tileSize);a(u,g);return}const c=l(n,d,.35);c?(this.selectedCanvasEntity=c,e.setSelectedEntity(c),this.draggedEntity=c,this.dragOffset.x=c.position.x-n,this.dragOffset.y=c.position.y-d,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(n,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"){const c=Math.floor(n/i.tileSize),u=Math.floor(d/i.tileSize);o(c,u)}},this.onMouseMove=(n,d)=>{var g;const c=Math.floor(n/i.tileSize),u=Math.floor(d/i.tileSize);if(c>=0&&c<i.cols&&u>=0&&u<i.rows?this.hoverWallTile={col:c,row:u}:this.hoverWallTile=null,e!=null&&e.isEditMode){if(e.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?a(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&o(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const v=n+this.dragOffset.x,f=d+this.dragOffset.y,m=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((g=this.draggedEntity.colliderModule)==null?void 0:g.radius)??.32;this.draggedEntity.position.x=Math.max(m,Math.min(i.width-m,v)),this.draggedEntity.position.y=Math.max(m,Math.min(i.height-m,f)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const v=l(n,d,.3);this.hoverEntity=v,this.canvas.style.cursor=v?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(n,d)=>{if(this.draggedEntity&&(i.syncEntitiesWithWalls([this.draggedEntity]),this.draggedEntity=null),e!=null&&e.isEditMode)if(e.editTool==="walls")this.canvas.style.cursor="cell";else{const c=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=c,this.canvas.style.cursor=c?"grab":"crosshair"}},this.handleClick=(n,d)=>{if(!(e!=null&&e.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,n,d,i),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const c=t.pickupModule.findTargetObject(t,n,d,s,i.wallHeight);c&&(t.pickupModule.pickup(t,c),this.justPickedUp=!0)}}},this.onRightClick=(n,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"||!e)return;const c=l(n,d,.4);c&&(this.selectedCanvasEntity=c,e.setSelectedEntity(c))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const n=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,i.wallHeight);n&&t.pickupModule.pickup(t,n)}}}}class zt{constructor(t){r(this,"container");r(this,"character");r(this,"arena");r(this,"objects");r(this,"onSpawnObject");r(this,"onDeleteObject");r(this,"onClearObjects");r(this,"selectedEntity");r(this,"isEditMode",!1);r(this,"editTool","entities");r(this,"onSelectionChange");r(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});r(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});r(this,"inspectorEl");r(this,"entitySelectorEl");r(this,"characterSpecificControlsEl");r(this,"objectSpecificControlsEl");r(this,"modePlayBtn");r(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var i;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(i=this.onSelectionChange)==null||i.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const i=this.container.querySelector("#edit-submode-container");i&&(i.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const i=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");i&&s&&(i.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const i=this.container.querySelector("#edit-hint-label");i&&(this.isEditMode?this.editTool==="walls"?i.textContent="Left-drag: Draw | Right-drag: Erase":i.textContent="Click & drag object in arena":i.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const e of this.objects){const l=e.id===t?"selected":"",a=e.visualShape==="box"?"📦":"⚪",o=e.hasMass?`${e.mass.toFixed(1)}kg`:"Massless";i+=`<option value="${e.id}" ${l}>${a} ${e.name} (${o})</option>`}this.entitySelectorEl.innerHTML=i;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,i,s,e,l,a,o,n,d,c,u,g,v,f,m,k,p,b,w,F,P,V,T,O,B,D,C,y,M,x,S,L,$,R,A,z,W,E,q,j,I,X,h,G,U,Y,Z,N,gt,st,lt,pt,ot,at,vt,nt,ct,bt,rt,tt,K,_,J,kt,Et,Vt,Ct;this.container.innerHTML=`
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
                ${(a=this.selectedEntity.frictionModule)!=null&&a.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-friction-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((o=this.selectedEntity.frictionModule)!=null&&o.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no normal force)
            </div>
            <div id="group-mod-friction" style="display: ${(n=this.selectedEntity.frictionModule)!=null&&n.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
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
                  <span id="val-entity-dynamic-fric">${(((u=this.selectedEntity.frictionModule)==null?void 0:u.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((g=this.selectedEntity.frictionModule)==null?void 0:g.dynamicFrictionMod)??1}">
              </div>
            </div>
            <div id="note-mod-friction" class="module-detached-note" style="display: ${(v=this.selectedEntity.frictionModule)!=null&&v.enabled?"none":"block"};">
              Frictionless: glides indefinitely without ground resistance
            </div>
          </div>

          <!-- 4. Bounciness (Requires Mass) -->
          <div class="module-card" id="card-mod-bounce">
            <div class="toggle-row">
              <label>🏀 Bounciness</label>
              <button id="toggle-mod-bounce" class="btn-toggle ${(f=this.selectedEntity.bounceModule)!=null&&f.enabled?"active":""}">
                ${(m=this.selectedEntity.bounceModule)!=null&&m.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((k=this.selectedEntity.bounceModule)!=null&&k.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(p=this.selectedEntity.bounceModule)!=null&&p.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((b=this.selectedEntity.bounceModule)==null?void 0:b.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((w=this.selectedEntity.bounceModule)==null?void 0:w.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(F=this.selectedEntity.bounceModule)!=null&&F.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(P=this.selectedEntity.bounceModule)!=null&&P.enabled&&((V=this.selectedEntity.bounceModule)!=null&&V.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
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
                ${(B=this.selectedEntity.rollModule)!=null&&B.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(D=this.selectedEntity.rollModule)!=null&&D.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(C=this.selectedEntity.rollModule)!=null&&C.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((y=this.selectedEntity.rollModule)==null?void 0:y.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((M=this.selectedEntity.rollModule)==null?void 0:M.rollResistance)??.4}">
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
                <button id="toggle-walk" class="btn-toggle ${(x=this.character.walkingModule)!=null&&x.enabled?"active":""}">
                  ${(S=this.character.walkingModule)!=null&&S.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((L=this.character.walkingModule)!=null&&L.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&(($=this.character.walkingModule)!=null&&$.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(R=this.character.walkingModule)!=null&&R.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((A=this.character.walkingModule)==null?void 0:A.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((z=this.character.walkingModule)==null?void 0:z.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((W=this.character.walkingModule)==null?void 0:W.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((E=this.character.walkingModule)==null?void 0:E.maxWalkSpeed)??5.2}">
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
                <button id="toggle-pickup" class="btn-toggle ${(X=this.character.pickupModule)!=null&&X.enabled?"active":""}">
                  ${(h=this.character.pickupModule)!=null&&h.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(G=this.character.pickupModule)!=null&&G.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(((U=this.character.pickupModule)==null?void 0:U.pickupReach)??1.3).toFixed(1)}</span>
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var z,W,E,q,j,I,X;const t=this.selectedEntity,i=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=i?"none":"flex");const e=this.container.querySelector("#toggle-entity-shape");e&&(t.visualShape==="box"?(e.textContent="Box 📦",e.classList.add("active")):(e.textContent="Circle ⚪",e.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),a=this.container.querySelector("#group-mod-collider"),o=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),a&&(a.style.display=t.hasCollider?"block":"none"),o&&(o.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((z=t.colliderModule)==null?void 0:z.radius)??.32,2);const n=this.container.querySelector("#toggle-mod-mass"),d=this.container.querySelector("#group-mod-mass"),c=this.container.querySelector("#note-mod-mass");n&&(n.textContent=t.hasMass?"Attached":"Detached",n.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),c&&(c.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((W=t.massModule)==null?void 0:W.mass)??1,1);const u=this.container.querySelector("#toggle-mod-friction"),g=this.container.querySelector("#group-mod-friction"),v=this.container.querySelector("#note-mod-friction"),f=this.container.querySelector("#warn-friction-mass"),m=!!(t.frictionModule&&t.frictionModule.enabled);u&&(u.textContent=m?"Attached":"Detached",u.classList.toggle("active",m)),g&&(g.style.display=m?"flex":"none"),v&&(v.style.display=m?"none":"block"),f&&(f.style.display=!t.hasMass&&m?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((E=t.frictionModule)==null?void 0:E.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((q=t.frictionModule)==null?void 0:q.dynamicFrictionMod)??1,2);const k=this.container.querySelector("#toggle-mod-bounce"),p=this.container.querySelector("#group-mod-bounce"),b=this.container.querySelector("#note-mod-bounce"),w=this.container.querySelector("#warn-bounce-mass"),F=!!(t.bounceModule&&t.bounceModule.enabled);k&&(k.textContent=F?"Attached":"Detached",k.classList.toggle("active",F)),p&&(p.style.display=F?"block":"none"),b&&(b.style.display=F?"none":"block"),w&&(w.style.display=!t.hasMass&&F?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const P=this.container.querySelector("#check-mod-vert-bounce"),V=this.container.querySelector("#warn-bounce-vert-vel");if(P&&(P.checked=!!((I=t.bounceModule)!=null&&I.verticalBounce)),V){const h=!!(F&&((X=t.bounceModule)!=null&&X.verticalBounce)&&!t.hasVerticalVelocity);V.style.display=h?"block":"none"}const T=this.container.querySelector("#toggle-mod-vert-pos"),O=this.container.querySelector("#group-mod-vert-pos"),B=this.container.querySelector("#note-mod-vert-pos"),D=t.hasVerticalPosition;T&&(T.textContent=D?"Attached":"Detached",T.classList.toggle("active",D)),O&&(O.style.display=D?"block":"none"),B&&(B.style.display=D?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const C=this.container.querySelector("#toggle-mod-vert-vel"),y=this.container.querySelector("#group-mod-vert-vel"),M=t.hasVerticalVelocity;C&&(C.textContent=M?"Enabled":"Disabled",C.classList.toggle("active",M)),y&&(y.style.display=M?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const x=this.container.querySelector("#toggle-mod-gravity"),S=this.container.querySelector("#note-mod-gravity");x&&(x.textContent=t.hasGravity?"Attached":"Detached",x.classList.toggle("active",t.hasGravity)),S&&(S.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const L=this.container.querySelector("#toggle-mod-roll"),$=this.container.querySelector("#group-mod-roll"),R=this.container.querySelector("#note-roll-friction"),A=!!(t.rollModule&&t.rollModule.enabled);if(L&&(L.textContent=A?"Attached":"Detached",L.classList.toggle("active",A)),$&&($.style.display=A?"block":"none"),R&&(R.style.display=A&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),i){const h=this.container.querySelector("#toggle-walk"),G=this.container.querySelector("#group-mod-walking"),U=this.container.querySelector("#warn-walk-friction"),Y=this.container.querySelector("#warn-walk-strength"),Z=!!(this.character.walkingModule&&this.character.walkingModule.enabled);h&&(h.textContent=Z?"Attached":"Detached",h.classList.toggle("active",Z)),G&&(G.style.display=Z?"flex":"none"),U&&(U.style.display=Z&&!this.character.hasFriction?"block":"none"),Y&&(Y.style.display=Z&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const N=this.container.querySelector("#toggle-strength"),gt=this.container.querySelector("#group-mod-strength"),st=!!(this.character.strengthModule&&this.character.strengthModule.enabled);N&&(N.textContent=st?"Attached":"Detached",N.classList.toggle("active",st)),gt&&(gt.style.display=st?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const lt=this.container.querySelector("#toggle-pickup"),pt=this.container.querySelector("#group-mod-pickup"),ot=!!(this.character.pickupModule&&this.character.pickupModule.enabled);lt&&(lt.textContent=ot?"Attached":"Detached",lt.classList.toggle("active",ot)),pt&&(pt.style.display=ot?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const at=this.container.querySelector("#toggle-throw"),vt=this.container.querySelector("#group-mod-throw"),nt=!!(this.character.throwModule&&this.character.throwModule.enabled);at&&(at.textContent=nt?"Attached":"Detached",at.classList.toggle("active",nt)),vt&&(vt.style.display=nt?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const ct=this.container.querySelector("#toggle-climb"),bt=this.container.querySelector("#group-mod-climb"),rt=this.container.querySelector("#warn-climb-deps"),tt=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(ct&&(ct.textContent=tt?"Attached":"Detached",ct.classList.toggle("active",tt)),bt&&(bt.style.display=tt?"block":"none"),rt){const K=!this.character.hasVerticalPosition,_=!this.character.hasStrength;rt.style.display=tt&&(K||_)?"block":"none",rt.textContent=K?"⚠️ Requires Vertical Position (3D Z-axis)":_?"⚠️ Requires Strength Ability to climb":""}if(this.character.climbingModule){const K=this.container.querySelector("#toggle-climb-walkoff");if(K){const J=!!this.character.climbingModule.preventWalkOff;K.textContent=J?"Active":"Inactive",K.classList.toggle("active",J)}const _=this.container.querySelector("#toggle-climb-sideways");if(_){const J=!!this.character.climbingModule.horizontalClimb;_.textContent=J?"Active":"Inactive",_.classList.toggle("active",J)}this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1),this.setSliderVal("slide-climb-hang","val-climb-hang",this.character.climbingModule.hangDistance,2)}}}setSliderVal(t,i,s,e){const l=this.container.querySelector(`#${t}`),a=this.container.querySelector(`#${i}`);l&&(l.value=s.toString()),a&&(a.textContent=e>0?s.toFixed(e):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,i=this.container.querySelector("#creator-name");i&&(i.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const e=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");e&&(e.value=t.color),l&&(l.textContent=t.color);const a=this.container.querySelector("#creator-toggle-collider"),o=this.container.querySelector("#grp-creator-radius");a&&(a.textContent=t.hasCollider?"Attached":"Detached",a.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const n=this.container.querySelector("#creator-toggle-mass"),d=this.container.querySelector("#grp-creator-mass");n&&(n.textContent=t.hasMass?"Attached":"Detached",n.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const c=this.container.querySelector("#creator-toggle-friction"),u=this.container.querySelector("#grp-creator-fric");c&&(c.textContent=t.hasFriction?"Attached":"Detached",c.classList.toggle("active",t.hasFriction)),u&&(u.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const g=this.container.querySelector("#creator-toggle-bounce"),v=this.container.querySelector("#grp-creator-bounce"),f=this.container.querySelector("#creator-check-vert-bounce"),m=this.container.querySelector("#creator-warn-bounce-vert");g&&(g.textContent=t.hasBounce?"Attached":"Detached",g.classList.toggle("active",t.hasBounce)),v&&(v.style.display=t.hasBounce?"block":"none"),f&&(f.checked=t.verticalBounce),m&&(m.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const k=this.container.querySelector("#creator-toggle-vert-pos"),p=this.container.querySelector("#grp-creator-vert-pos");k&&(k.textContent=t.hasVerticalPosition?"Attached":"Detached",k.classList.toggle("active",t.hasVerticalPosition)),p&&(p.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const b=this.container.querySelector("#creator-toggle-vert-vel");b&&(b.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",b.classList.toggle("active",t.hasVerticalVelocity));const w=this.container.querySelector("#creator-toggle-gravity");w&&(w.textContent=t.hasGravity?"Attached":"Detached",w.classList.toggle("active",t.hasGravity));const F=this.container.querySelector("#creator-toggle-roll"),P=this.container.querySelector("#group-creator-roll-resist");F&&(F.textContent=t.hasRollModule?"Enabled":"Disabled",F.classList.toggle("active",t.hasRollModule)),P&&(P.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var $,R,A,z,W,E,q,j,I,X;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),($=this.container.querySelector("#submode-entities"))==null||$.addEventListener("click",()=>{this.setEditTool("entities")}),(R=this.container.querySelector("#submode-walls"))==null||R.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var G;const h=this.entitySelectorEl.value;if(h===this.character.id)this.selectedEntity=this.character;else{const U=this.objects.find(Y=>Y.id===h);U&&(this.selectedEntity=U)}this.updateSelectorOptions(),this.syncEntitySliders(),(G=this.onSelectionChange)==null||G.call(this,this.selectedEntity)}),(A=this.container.querySelector("#btn-duplicate-entity"))==null||A.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(z=this.container.querySelector("#btn-delete-entity"))==null||z.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const i=this.container.querySelector("#toggle-mod-collider");i==null||i.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new dt({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",h=>{this.selectedEntity.colliderRadius=h},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new ht({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",h=>{this.selectedEntity.mass=h,this.updateSelectorOptions()},1);const e=this.container.querySelector("#toggle-mod-friction");e==null||e.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new ut,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",h=>{this.selectedEntity.staticGroundFrictionMod=h},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",h=>{this.selectedEntity.dynamicGroundFrictionMod=h},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new yt({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",h=>{this.selectedEntity.bounceMod=h},2);const a=this.container.querySelector("#check-mod-vert-bounce");a==null||a.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=a.checked),this.syncEntitySliders(),this.updateInspector()});const o=this.container.querySelector("#toggle-mod-vert-pos");o==null||o.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new ft({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",h=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=h),this.selectedEntity.position.z=h,this.syncEntitySliders(),this.updateInspector()},2);const n=this.container.querySelector("#toggle-mod-vert-vel");n==null||n.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",h=>{this.selectedEntity.verticalVelocity=h},2);const d=this.container.querySelector("#toggle-mod-gravity");d==null||d.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new mt,this.syncEntitySliders()});const c=this.container.querySelector("#toggle-mod-roll");c==null||c.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new Mt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",h=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=h)},2);const u=this.container.querySelector("#toggle-walk");u==null||u.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new Rt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",h=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=h)},0),this.setupSlider("slide-walk-speed","val-walk-speed",h=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=h)},1);const g=this.container.querySelector("#toggle-strength");g==null||g.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new wt({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",h=>{this.character.strength=h},1);const v=this.container.querySelector("#toggle-pickup");v==null||v.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new Wt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",h=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=h)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",h=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=h)},2);const f=this.container.querySelector("#toggle-throw");f==null||f.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new Pt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",h=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=h)},1);const m=this.container.querySelector("#toggle-climb");m==null||m.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Ft,this.syncEntitySliders()});const k=this.container.querySelector("#toggle-climb-walkoff");k==null||k.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.preventWalkOff=!this.character.climbingModule.preventWalkOff),this.syncEntitySliders()});const p=this.container.querySelector("#toggle-climb-sideways");p==null||p.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.horizontalClimb=!this.character.climbingModule.horizontalClimb),this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",h=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=h)},0),this.setupSlider("slide-climb-speed","val-climb-speed",h=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=h)},1),this.setupSlider("slide-climb-hang","val-climb-hang",h=>{this.character.climbingModule&&(this.character.climbingModule.hangDistance=h)},2),this.setupSlider("slide-gravity","val-gravity",h=>{this.arena.gravity=h},1),this.setupSlider("slide-wall-height","val-wall-height",h=>{this.arena.setStandardWallHeight(h),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",h,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",h=>{this.arena.setStandardWallHeight(h),this.setSliderVal("slide-wall-height","val-wall-height",h,1)},1);const b=this.container.querySelector("#select-wall-preset");b==null||b.addEventListener("change",()=>{this.arena.loadWallPreset(b.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(W=this.container.querySelector("#btn-prev-wall-map"))==null||W.addEventListener("click",()=>{const h=Q.WALL_PRESETS,U=(h.findIndex(Y=>Y.id===this.arena.currentPresetId)-1+h.length)%h.length;this.arena.loadWallPreset(h[U].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(E=this.container.querySelector("#btn-next-wall-map"))==null||E.addEventListener("click",()=>{const h=Q.WALL_PRESETS,U=(h.findIndex(Y=>Y.id===this.arena.currentPresetId)+1)%h.length;this.arena.loadWallPreset(h[U].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(q=this.container.querySelector("#btn-reset-walls"))==null||q.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(j=this.container.querySelector("#btn-clear-walls"))==null||j.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",h=>{this.arena.frictionCoeff=h},1),this.setupSlider("slide-static-thresh","val-static-thresh",h=>{this.arena.staticFrictionThreshold=h},2),this.container.querySelectorAll(".preset-chip").forEach(h=>{h.addEventListener("click",()=>{const G=h.getAttribute("data-preset");G&&this.presets[G]&&(this.creatorState={...this.presets[G]},this.syncCreatorInputs())})});const F=this.container.querySelector("#creator-name");F==null||F.addEventListener("input",()=>{this.creatorState.name=F.value});const P=this.container.querySelector("#creator-toggle-shape");P==null||P.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",P.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",P.classList.toggle("active",this.creatorState.visualShape==="box")});const V=this.container.querySelector("#creator-color"),T=this.container.querySelector("#val-creator-color");V==null||V.addEventListener("input",()=>{this.creatorState.color=V.value,T&&(T.textContent=V.value)});const O=this.container.querySelector("#creator-toggle-collider");O==null||O.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,O.textContent=this.creatorState.hasCollider?"Attached":"Detached",O.classList.toggle("active",this.creatorState.hasCollider);const h=this.container.querySelector("#grp-creator-radius");h&&(h.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",h=>{this.creatorState.colliderRadius=h},2);const B=this.container.querySelector("#creator-toggle-mass");B==null||B.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,B.textContent=this.creatorState.hasMass?"Attached":"Detached",B.classList.toggle("active",this.creatorState.hasMass);const h=this.container.querySelector("#grp-creator-mass");h&&(h.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",h=>{this.creatorState.mass=h},1);const D=this.container.querySelector("#creator-toggle-friction");D==null||D.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,D.textContent=this.creatorState.hasFriction?"Attached":"Detached",D.classList.toggle("active",this.creatorState.hasFriction);const h=this.container.querySelector("#grp-creator-fric");h&&(h.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",h=>{this.creatorState.dynamicFrictionMod=h},2);const C=this.container.querySelector("#creator-toggle-bounce");C==null||C.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,C.textContent=this.creatorState.hasBounce?"Attached":"Detached",C.classList.toggle("active",this.creatorState.hasBounce);const h=this.container.querySelector("#grp-creator-bounce");h&&(h.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",h=>{this.creatorState.bounceMod=h},2);const y=this.container.querySelector("#creator-check-vert-bounce");y==null||y.addEventListener("change",()=>{this.creatorState.verticalBounce=y.checked,this.syncCreatorInputs()});const M=this.container.querySelector("#creator-toggle-vert-pos");M==null||M.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",h=>{this.creatorState.elevation=h},2);const x=this.container.querySelector("#creator-toggle-vert-vel");x==null||x.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const S=this.container.querySelector("#creator-toggle-gravity");S==null||S.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,S.textContent=this.creatorState.hasGravity?"Attached":"Detached",S.classList.toggle("active",this.creatorState.hasGravity)});const L=this.container.querySelector("#creator-toggle-roll");L==null||L.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,L.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",L.classList.toggle("active",this.creatorState.hasRollModule);const h=this.container.querySelector("#group-creator-roll-resist");h&&(h.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",h=>{this.creatorState.rollResistance=h},2),(I=this.container.querySelector("#btn-spawn-configured"))==null||I.addEventListener("click",()=>{this.spawnFromCreator()}),(X=this.container.querySelector("#btn-clear-entities"))==null||X.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,i=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),e=new it({name:t.name||"Custom Object",position:{x:i,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new dt({radius:t.colliderRadius}):null,massModule:t.hasMass?new ht({mass:t.mass}):null,frictionModule:t.hasFriction?new ut({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new yt({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new ft({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new mt:null,rollModule:t.hasRollModule?new Mt({rollResistance:t.rollResistance}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,i=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),e=new it({name:`${t.name} (Copy)`,position:{x:i,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new dt({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new ht({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new ut({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new yt({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new ft({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new mt({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new Mt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,i,s,e=0){const l=this.container.querySelector(`#${t}`),a=this.container.querySelector(`#${i}`);!l||!a||l.addEventListener("input",()=>{const o=parseFloat(l.value);a.textContent=e>0?o.toFixed(e):Math.round(o).toString(),s(o)})}updateInspector(){var e;const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}renderWallPresetOptions(){return Q.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=Q.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=Q.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const i=this.container.querySelector("#label-wall-map-badge");i&&(i.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class Bt{constructor(t){r(this,"arena");r(this,"character");r(this,"objects");r(this,"renderer");r(this,"inputManager");r(this,"devPanel");r(this,"isRunning",!1);r(this,"lastTime",0);r(this,"accumulator",0);r(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const e=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,e,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const i=this.inputManager;i.draggedEntity!==this.character?this.character.updateCharacter(t,i.movementVector,i.isMouseDown&&!this.devPanel.isEditMode,i.mousePos,this.arena,i.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const e of this.objects)i.draggedEntity!==e&&e.updatePosition(t,this.arena);const s=i.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const e=this.character.pickupModule.findTargetObject(this.character,i.mousePos.x,i.mousePos.y,this.objects,this.arena.wallHeight);e&&(this.character.pickupModule.pickup(this.character,e),i.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],i=this.inputManager,s=3;for(let e=0;e<s;e++)for(let l=0;l<t.length;l++)for(let a=l+1;a<t.length;a++){const o=t[l],n=t[a];if(o.isHeld||n.isHeld||o===i.draggedEntity||n===i.draggedEntity||!o.hasCollider||!n.hasCollider)continue;const d=this.arena.wallHeight-.15,c=o.position.z>=d||o.supportingSurfaceHeight>=d||o.standingWall!==null||o.isAboveWalls,u=n.position.z>=d||n.supportingSurfaceHeight>=d||n.standingWall!==null||n.isAboveWalls;if(c!==u)continue;const g=n.position.x-o.position.x,v=n.position.y-o.position.y,f=g*g+v*v,m=o.colliderRadius+n.colliderRadius;if(f<m*m&&f>1e-6){const k=Math.sqrt(f),p=m-k,b=g/k,w=v/k,F=n.velocity.x-o.velocity.x,P=n.velocity.y-o.velocity.y,V=F*b+P*w,T=!o.hasMass,O=!n.hasMass;if(T&&O){if(o.position.x-=b*p*.5,o.position.y-=w*p*.5,n.position.x+=b*p*.5,n.position.y+=w*p*.5,V<0){const x=-V*.5;o.velocity.x-=x*b,o.velocity.y-=x*w,n.velocity.x+=x*b,n.velocity.y+=x*w}continue}if(!T&&O){this.isEntityPinnedAgainstWall(n,b,w)?(o.position.x-=b*p,o.position.y-=w*p,o.velocity.x=0,o.velocity.y=0):(n.position.x+=b*p,n.position.y+=w*p,V<0&&(n.velocity.x+=(o.velocity.x-n.velocity.x)*Math.abs(b),n.velocity.y+=(o.velocity.y-n.velocity.y)*Math.abs(w)));continue}if(T&&!O){this.isEntityPinnedAgainstWall(o,-b,-w)?(n.position.x+=b*p,n.position.y+=w*p,n.velocity.x=0,n.velocity.y=0):(o.position.x-=b*p,o.position.y-=w*p,V<0&&(o.velocity.x+=(n.velocity.x-o.velocity.x)*Math.abs(b),o.velocity.y+=(n.velocity.y-o.velocity.y)*Math.abs(w)));continue}const B=1/o.mass,D=1/n.mass,C=B+D;if(C<=1e-4)continue;const y=B/C,M=D/C;if(o.position.x-=b*p*y,o.position.y-=w*p*y,n.position.x+=b*p*M,n.position.y+=w*p*M,V<0){const x=o instanceof xt&&o.isActivelyWalking||n instanceof xt&&n.isActivelyWalking,S=o.hasBounce&&n.hasBounce,L=o.isCharacter||!o.hasBounce?0:o.bounceMod??0,$=n.isCharacter||!n.hasBounce?0:n.bounceMod??0,A=-(1+(x||!S?0:Math.max(0,Math.min(.98,Math.max(L,$)))))*V/C;o.velocity.x-=A*B*b,o.velocity.y-=A*B*w,n.velocity.x+=A*D*b,n.velocity.y+=A*D*w;const z=-w,W=b,E=F*z+P*W;if(Math.abs(E)>.001){const q=.35*Math.sqrt(o.dynamicGroundFrictionMod*n.dynamicGroundFrictionMod),j=.4,I=Math.abs(E)/(C*(1+1/j)),X=q*Math.abs(A),h=Math.min(I,X)*Math.sign(E);if(o.velocity.x+=h*B*z,o.velocity.y+=h*B*W,n.velocity.x-=h*D*z,n.velocity.y-=h*D*W,o.rollModule&&o.rollModule.enabled){const G=h/(j*o.mass*o.colliderRadius);o.rollModule.angularVelocity.z+=G,o.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,o.rollModule.angularVelocity.z)),o.isRestingOnSurface&&(o.rollModule.angularVelocity.y=o.velocity.x/o.colliderRadius,o.rollModule.angularVelocity.x=-o.velocity.y/o.colliderRadius)}if(n.rollModule&&n.rollModule.enabled){const G=h/(j*n.mass*n.colliderRadius);n.rollModule.angularVelocity.z-=G,n.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,n.rollModule.angularVelocity.z)),n.isRestingOnSurface&&(n.rollModule.angularVelocity.y=n.velocity.x/n.colliderRadius,n.rollModule.angularVelocity.x=-n.velocity.y/n.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,i,s){const e=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(i>.3&&t.position.x>=this.arena.width-e-l||i<-.3&&t.position.x<=e+l||s>.3&&t.position.y>=this.arena.height-e-l||s<-.3&&t.position.y<=e+l)return!0;for(const a of this.arena.walls)if(t.position.z<a.wallHeight-.05){const o=t.position.x+i*l,n=t.position.y+s*l,d=Math.max(a.x,Math.min(o,a.x+a.width)),c=Math.max(a.y,Math.min(n,a.y+a.height)),u=o-d,g=n-c;if(u*u+g*g<e*e)return!0}return!1}}function Lt(){const H=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!H||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=H.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new Q(20,14,1);H.width=1e3,H.height=700;const e=new xt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new it({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new it({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new it({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new it({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new Mt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})];s.syncEntitiesWithWalls([e,...l]);const a=new et(i),o=new zt({container:t,character:e,arena:s,objects:l,onSpawnObject:c=>{s.syncEntitiesWithWalls([c]),l.push(c),o.updateSelectorOptions()},onDeleteObject:c=>{const u=l.indexOf(c);u!==-1&&l.splice(u,1),o.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),l.length=0,o.updateSelectorOptions()}}),n=new Dt(H,s);n.handleInteractions(e,s,l,o),o.onSelectionChange=c=>{n.selectedCanvasEntity=c},new Bt({arena:s,character:e,objects:l,renderer:a,inputManager:n,devPanel:o}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",Lt);

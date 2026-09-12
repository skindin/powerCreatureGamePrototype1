var $t=Object.defineProperty;var Dt=(q,t,i)=>t in q?$t(q,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):q[t]=i;var r=(q,t,i)=>Dt(q,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const l of e)if(l.type==="childList")for(const n of l.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function i(e){const l={};return e.integrity&&(l.integrity=e.integrity),e.referrerPolicy&&(l.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?l.credentials="include":e.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(e){if(e.ep)return;e.ep=!0;const l=i(e);fetch(e.href,l)}})();class ft{constructor(t={}){r(this,"z");r(this,"hasVerticalVelocity");r(this,"verticalVelocity");r(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const St=class St{constructor(t=20,i=14,s=1){r(this,"width");r(this,"height");r(this,"tileSize");r(this,"cols");r(this,"rows");r(this,"wallHeight");r(this,"gravity");r(this,"frictionCoeff");r(this,"staticFrictionThreshold");r(this,"tileGrid");r(this,"walls",[]);r(this,"currentPresetId","trenches");this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("trenches")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,i,s){if(t<0||t>=this.cols||i<0||i>=this.rows)return!1;const e=s?1:0;return this.tileGrid[i][t]===e?!1:(this.tileGrid[i][t]=e,this.rebuildWalls(),!0)}hasWall(t,i){return t<0||t>=this.cols||i<0||i>=this.rows?!1:this.tileGrid[i][t]===1}loadWallPreset(t,i){const s=St.WALL_PRESETS.find(e=>e.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(i),!0):!1}syncEntitiesWithWalls(t){var i;if(t)for(const s of t){const e=s.hasCollider?s.colliderRadius:((i=s.colliderModule)==null?void 0:i.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,e);if(l)s.position.z<l.wallHeight?(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new ft({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.standingWall=l,s.verticalVelocity=0):(s.standingWall=l,s.supportingSurfaceHeight=l.wallHeight);else if((s.supportingSurfaceHeight>=this.wallHeight-.05||s.standingWall!==null)&&(s.standingWall=null,s.supportingSurfaceHeight=0,s.isCharacter)){const n=s;n.climbingModule&&(n.climbingModule.isDismountFreefall=!0,n.climbingModule.climbSuppressedUntilRelease=!0)}}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("trenches",t)}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),n=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,a=i-n;return o*o+a*a<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}areWallsContiguous(t,i){if(t.id===i.id)return!0;const s=Math.max(0,Math.max(t.x,i.x)-Math.min(t.x+t.width,i.x+i.width)),e=Math.max(0,Math.max(t.y,i.y)-Math.min(t.y+t.height,i.y+i.height)),l=Math.min(t.x+t.width,i.x+i.width)-Math.max(t.x,i.x),n=Math.min(t.y+t.height,i.y+i.height)-Math.max(t.y,i.y);return s<.001&&n>.05||e<.001&&l>.05}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}};r(St,"WALL_PRESETS",[{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>1));for(let e=2;e<=17;e++)s[3][e]=0,s[7][e]=0,s[10][e]=0;for(let e=2;e<=11;e++)s[e][5]=0,s[e][10]=0,s[e][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let e=5;e<=9;e++)s[e][2]=0;for(let e=5;e<=9;e++)s[e][17]=0;for(let e=2;e<=5;e++)s[5][e]=0;for(let e=10;e<=14;e++)s[5][e]=0;for(let e=5;e<=10;e++)s[9][e]=0;for(let e=14;e<=17;e++)s[9][e]=0;return s[7][5]=0,s}},{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=10;for(let l=1;l<=4;l++)s[l][e]=1;for(let l=8;l<=12;l++)s[l][e]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=2;e<=4;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=9;e<=11;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=6;e<=7;e++)for(let l=9;l<=10;l++)s[e][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,n]of e)s[n][l]=1,s[n+1][l]=1,s[n][l+1]=1,s[n+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=1;e<=9;e++)s[e][4]=1;for(let e=4;e<=12;e++)s[e][7]=1;for(let e=1;e<=9;e++)s[e][10]=1;for(let e=4;e<=12;e++)s[e][13]=1;for(let e=1;e<=9;e++)s[e][16]=1;for(let e=7;e<=10;e++)s[4][e]=1;for(let e=13;e<=16;e++)s[4][e]=1;for(let e=4;e<=7;e++)s[9][e]=1;for(let e=10;e<=13;e++)s[9][e]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,i)=>Array.from({length:i},()=>Array.from({length:t},()=>0))}]);let J=St;class dt{constructor(t={}){r(this,"radius");r(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class ht{constructor(t={}){r(this,"mass");r(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class ut{constructor(t={}){r(this,"staticFrictionMod");r(this,"dynamicFrictionMod");r(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class yt{constructor(t={}){r(this,"bounceMod");r(this,"verticalBounce");r(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class mt{constructor(t={}){r(this,"enabled");this.enabled=t.enabled??!0}}class tt{constructor(t={}){r(this,"id");r(this,"name");r(this,"position");r(this,"velocity");r(this,"color");r(this,"isHeld");r(this,"heldBy");r(this,"lastThrower",null);r(this,"isCharacter",!1);r(this,"isClimbing",!1);r(this,"visualShape","circle");r(this,"colliderModule",null);r(this,"massModule",null);r(this,"frictionModule",null);r(this,"bounceModule",null);r(this,"verticalPositionModule",null);r(this,"gravityModule",null);r(this,"rollModule",null);r(this,"supportingSurfaceHeight",0);r(this,"standingWall",null);var i,s,e,l,n;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((n=t.velocity)==null?void 0:n.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new dt({radius:t.colliderRadius}):new dt({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new ht({mass:t.mass}):new ht({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new ut({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new yt({bounceMod:t.bounceMod}):new yt({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new ft({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new mt,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new dt({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new ht({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new ut({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new ut({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new yt({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.85||this.supportingSurfaceHeight>=.85||this.standingWall!==null)}updatePosition(t,i){var m,S,b,v,w,F,k,W,B,T,O,L;if(this.isHeld)return;if(this.lastThrower){const V=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,u=(((m=this.lastThrower.pickupModule)==null?void 0:m.pickupReach)??1.3)+this.colliderRadius+V;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>u||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0;if(this.hasCollider&&this.hasVerticalPosition&&i.walls.length>0)if(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05&&this.position.z>=i.wallHeight-.2||this.standingWall!==null){const u=this.isCharacter?this:null;if(!!((S=u==null?void 0:u.climbingModule)!=null&&S.isDismountFreefall||(b=u==null?void 0:u.climbingModule)!=null&&b.climbSuppressedUntilRePress))this.standingWall=null,s=0;else if(this.isCharacter){if(this.standingWall){const x=i.walls.find($=>$.id===this.standingWall.id),M=this.colliderRadius;if((x?i.testWallOverlap(this.position.x,this.position.y,M,x):!1)&&x)this.standingWall=x,s=x.wallHeight;else if(x&&((v=u==null?void 0:u.climbingModule)!=null&&v.dismountSuppressedUntilRelease))this.standingWall=x,s=x.wallHeight;else{let $=null;if(x){for(const C of i.walls)if(i.areWallsContiguous(x,C)&&i.testWallOverlap(this.position.x,this.position.y,M,C)){$=C;break}}else $=i.getSupportingWall(this.position.x,this.position.y,M);$?(this.standingWall=$,s=$.wallHeight):(this.standingWall=null,s=0,u!=null&&u.climbingModule&&(u.climbingModule.isDismountFreefall=!0,u.climbingModule.climbSuppressedUntilRelease=!0))}}else if(!this.isClimbing&&(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05)){const x=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);x&&(this.standingWall=x,s=x.wallHeight)}}else{const x=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);x?(this.standingWall=x,s=x.wallHeight):(this.standingWall=null,s=0)}}else this.standingWall=null;else this.standingWall=null,s=0;if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const V=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const u=this.rollModule,E=this.colliderRadius>0?this.colliderRadius:.3,x=.4,M=this.bounceMod,P=(1+M)*this.mass*V,$=i.frictionCoeff*this.dynamicGroundFrictionMod*.05,C=this.velocity.x-u.angularVelocity.y*E,R=this.velocity.y+u.angularVelocity.x*E,A=Math.hypot(C,R);if(A>.001&&$>0){const z=$*P,H=A*this.mass/(1+1/x),j=Math.min(H,z),G=C/A*j,U=R/A*j;this.velocity.x-=G/this.mass,this.velocity.y-=U/this.mass,u.angularVelocity.y+=G/(x*this.mass*E),u.angularVelocity.x-=U/(x*this.mass*E)}const D=Math.max(.65,1-(1-M)*.35);u.angularVelocity.x*=D,u.angularVelocity.y*=D,u.angularVelocity.z*=D}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((w=this.walkingModule)==null?void 0:w.enabled)))if(this.rollModule&&this.rollModule.enabled){const u=this.rollModule,E=this.colliderRadius>0?this.colliderRadius:.3,x=i.frictionCoeff*this.dynamicGroundFrictionMod,M=.4,P=this.velocity.x-u.angularVelocity.y*E,$=this.velocity.y+u.angularVelocity.x*E,C=Math.hypot(P,$);if(x>0&&C>.001){const A=x*(1+1/M)*t;if(C<=A){const D=this.velocity.x+M*u.angularVelocity.y*E,z=this.velocity.y-M*u.angularVelocity.x*E,H=D/(1+M),j=z/(1+M);this.velocity.x=H,this.velocity.y=j,u.angularVelocity.y=H/E,u.angularVelocity.x=-j/E}else{const D=P/C*x*t,z=$/C*x*t;this.velocity.x-=D,this.velocity.y-=z,u.angularVelocity.y+=D/(M*E),u.angularVelocity.x-=z/(M*E)}}const R=Math.hypot(this.velocity.x,this.velocity.y);if(R>0){if(u.rollResistance>0){const A=u.rollResistance*t,D=Math.max(0,R-A);if(D<.005)this.velocity.x=0,this.velocity.y=0,u.angularVelocity.x=0,u.angularVelocity.y=0;else{const z=D/R;this.velocity.x*=z,this.velocity.y*=z,u.angularVelocity.x*=z,u.angularVelocity.y*=z}}}else{const A=Math.hypot(u.angularVelocity.x,u.angularVelocity.y);if(A>0&&x>0){const D=x/(M*E)*t,z=Math.max(0,A-D),H=A>0?z/A:0;u.angularVelocity.x*=H,u.angularVelocity.y*=H}}if(Math.abs(u.angularVelocity.z)>.001&&u.rollResistance>0){const A=u.rollResistance/(M*E)*t,D=Math.sign(u.angularVelocity.z),z=Math.abs(u.angularVelocity.z);u.angularVelocity.z=z<=A?0:D*(z-A)}u.updateVisualPhase(t)}else{const u=Math.hypot(this.velocity.x,this.velocity.y);if(u>0){const E=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(u<E)this.velocity.x=0,this.velocity.y=0;else{const x=i.frictionCoeff*this.dynamicGroundFrictionMod*t,P=Math.max(0,u-x)/u;this.velocity.x*=P,this.velocity.y*=P}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);const l=this.isCharacter?this:null,n=l==null?void 0:l.climbingModule,o=!this.isClimbing&&this.supportingSurfaceHeight>=i.wallHeight-.05&&this.standingWall!==null,a=Math.max(.01,(n==null?void 0:n.hangDistance)??.1);if(n)if(this.position.z<=.01)n.isAssistClampArmed=!1,n.hasLeftClampZoneSinceDismount=!0;else if(o&&this.standingWall){const V=this.standingWall,u=[V];for(const M of i.walls)M.id!==V.id&&i.areWallsContiguous(V,M)&&u.push(M);let E=1/0;for(const M of u){const P=Math.max(M.x,Math.min(this.position.x,M.x+M.width)),$=Math.max(M.y,Math.min(this.position.y,M.y+M.height)),C=Math.hypot(this.position.x-P,this.position.y-$);C<E&&(E=C)}E<=a+.001?l.isClimbInputHeld&&!n.dismountSuppressedUntilRelease?(n.isAssistClampArmed=!1,n.hasLeftClampZoneSinceDismount=!1):n.hasLeftClampZoneSinceDismount&&(n.isAssistClampArmed=!0):(n.hasLeftClampZoneSinceDismount=!0,n.isAssistClampArmed=!1)}else n.isAssistClampArmed=!1;const d=!!(l&&o&&(n!=null&&n.enabled)&&(n!=null&&n.preventWalkOff)&&(n!=null&&n.isAssistClampArmed)),c=this.velocity.x*t,y=this.velocity.y*t,g=Math.hypot(c,y);if(g>1e-4)if(d){const V=Math.max(.01,((F=l==null?void 0:l.climbingModule)==null?void 0:F.hangDistance)??.1);let u=this.standingWall??i.getSupportingWall(this.position.x,this.position.y,V);this.standingWall=u;const E=this.position.x+c,x=this.position.y+y,M=[];if(u){M.push(u);for(const $ of i.walls)$.id!==u.id&&i.areWallsContiguous(u,$)&&M.push($)}let P=null;for(const $ of M)if(i.testWallOverlap(E,x,V,$)){P=$;break}if(P)this.position.x=E,this.position.y=x,this.standingWall=P;else if(M.length>0){let $=1/0,C=null;for(const R of M){const A=Math.max(R.x,Math.min(E,R.x+R.width)),D=Math.max(R.y,Math.min(x,R.y+R.height)),z=E-A,H=x-D,j=z*z+H*H;j<$&&($=j,C={wall:R,closestX:A,closestY:D,dist:Math.sqrt(j),dx:z,dy:H})}if(C&&C.dist>0){const R=C.dx/C.dist,A=C.dy/C.dist,D=this.velocity.x*R+this.velocity.y*A;D>0&&(this.velocity.x-=D*R,this.velocity.y-=D*A);const z=V-.002;C.dist>z?(this.position.x=C.closestX+R*z,this.position.y=C.closestY+A*z):(this.position.x=E,this.position.y=x);const H=i.testWallOverlap(this.position.x,this.position.y,V,C.wall)?C.wall:M.find(j=>i.testWallOverlap(this.position.x,this.position.y,V,j));H&&(this.standingWall=H)}else this.velocity.x=0,this.velocity.y=0}}else{const u=Math.max(1,Math.ceil(g/.01)),E=c/u,x=y/u;let M=this.standingWall??(o?i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null),P=!1;for(let $=1;$<=u;$++){const C=this.position.x+E,R=this.position.y+x;if(M){let D=null;if(i.testWallOverlap(C,R,this.colliderRadius,M))D=M;else for(const z of i.walls)if(i.areWallsContiguous(M,z)&&i.testWallOverlap(C,R,this.colliderRadius,z)){D=z;break}D?(M=D,this.standingWall=D):(k=l==null?void 0:l.climbingModule)!=null&&k.dismountSuppressedUntilRelease||(P=!0,M=null,this.standingWall=null,this.supportingSurfaceHeight=0,l!=null&&l.climbingModule&&(l.climbingModule.isDismountFreefall=!0,l.climbingModule.climbSuppressedUntilRelease=!0))}if(this.position.x=C,this.position.y=R,!this.isClimbing&&(P||!this.standingWall&&!!((W=l==null?void 0:l.climbingModule)!=null&&W.isDismountFreefall||(B=l==null?void 0:l.climbingModule)!=null&&B.climbSuppressedUntilRePress))&&this.hasCollider)for(const D of i.walls)this.position.z<=D.wallHeight&&this.resolveWallCollision(D)}}if(this.hasCollider){const V=this.colliderRadius,u=V,E=i.width-V,x=V,M=i.height-V,P=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<u?(this.position.x=u,this.resolveWallImpact(1,0,P)):this.position.x>E&&(this.position.x=E,this.resolveWallImpact(-1,0,P)),this.position.y<x?(this.position.y=x,this.resolveWallImpact(0,1,P)):this.position.y>M&&(this.position.y=M,this.resolveWallImpact(0,-1,P));const $=!!((T=l==null?void 0:l.climbingModule)!=null&&T.isDismountFreefall||(O=l==null?void 0:l.climbingModule)!=null&&O.climbSuppressedUntilRePress);for(const C of i.walls)if(this.position.z<=C.wallHeight){if(this.position.z>=C.wallHeight-.05&&!$&&(((L=this.standingWall)==null?void 0:L.id)===C.id||i.testWallOverlap(this.position.x,this.position.y,this.colliderRadius,C)))continue;if(this.position.z<C.wallHeight-.05||$||this.standingWall===null){if(this.standingWall&&(this.standingWall.id===C.id||i.areWallsContiguous(this.standingWall,C)))continue;this.resolveWallCollision(C)}}}const p=16,f=Math.hypot(this.velocity.x,this.velocity.y);if(f>p){const V=p/f;this.velocity.x*=V,this.velocity.y*=V}if(this.rollModule&&this.rollModule.enabled){const u=this.rollModule.angularSpeed;if(u>35){const E=35/u;this.rollModule.angularVelocity.x*=E,this.rollModule.angularVelocity.y*=E,this.rollModule.angularVelocity.z*=E}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}static getClosestWallPoint(t,i,s){if(!s.walls||s.walls.length===0)return null;let e=1/0,l=null;for(const n of s.walls){const o=Math.max(n.x,Math.min(t,n.x+n.width)),a=Math.max(n.y,Math.min(i,n.y+n.height)),d=t-o,c=i-a,y=d*d+c*c;y<e&&(e=y,l={wall:n,closestX:o,closestY:a,dist:Math.sqrt(y),dx:d,dy:c})}return l}resolveWallImpact(t,i,s){this.lastThrower=null;const e=this.velocity.x*t+this.velocity.y*i;if(e>=0)return;const l=e;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*i):(this.velocity.x-=l*t,this.velocity.y-=l*i),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const n=this.rollModule,o=this.colliderRadius>0?this.colliderRadius:.3,a=.4,d=.35,c=-i,y=t,g=this.velocity.x*c+this.velocity.y*y,p=-(1+s)*this.mass*l,f=g-n.angularVelocity.z*o,m=Math.abs(f)*this.mass/(1+1/a),S=d*p,b=Math.min(m,S),v=-Math.sign(f)*b,w=g,F=w+v/this.mass,k=Math.abs(F)<=Math.abs(w)+.01?F-w:-w*.1;this.velocity.x+=k*c,this.velocity.y+=k*y;const B=-(k*this.mass)/(a*this.mass*o);n.angularVelocity.z+=B,n.angularVelocity.z=Math.max(-30,Math.min(30,n.angularVelocity.z)),n.angularVelocity.y=this.velocity.x/o,n.angularVelocity.x=-this.velocity.y/o}}resolveWallCollision(t){if(!this.hasCollider)return;const i=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),e=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,n=this.position.y-e,o=l*l+n*n;if(o<i*i){this.lastThrower=null;const a=Math.sqrt(o);let d=0,c=0,y=0;if(a===0){const p=Math.abs(this.position.x-t.x),f=Math.abs(t.x+t.width-this.position.x),m=Math.abs(this.position.y-t.y),S=Math.abs(t.y+t.height-this.position.y),b=Math.min(p,f,m,S);b===p?(d=-1,y=p+i):b===f?(d=1,y=f+i):b===m?(c=-1,y=m+i):(c=1,y=S+i)}else y=i-a,d=l/a,c=n/a;this.position.x+=d*y,this.position.y+=c*y;const g=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(d,c,g)}}}class Wt{constructor(){r(this,"id","walking");r(this,"name","Walking Module");r(this,"enabled",!0);r(this,"maxWalkForce",35);r(this,"maxWalkSpeed",5.2);r(this,"dragDamping",8.01)}update(t,i,s,e){var T;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((T=t.frictionModule)!=null&&T.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(i.x,i.y),n=l>.05;if(t.isActivelyWalking=n,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const d=e.frictionCoeff/10,c=a*d,g=t.carriedMass/(Math.max(.1,t.strength)*8),p=this.maxWalkSpeed/(1+g);let f=0,m=0;if(n){const O=i.x/l,L=i.y/l;f=O*p,m=L*p}const S=f-t.velocity.x,b=m-t.velocity.y,v=Math.hypot(S,b);if(v<.001){t.velocity.x=f,t.velocity.y=m;return}const w=Math.hypot(t.velocity.x,t.velocity.y),F=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),k=t.hasMass?Math.max(.2,t.baseMass):1,B=this.maxWalkForce*t.strength/k*c*s;if(v<=B||!n&&w<F)t.velocity.x=f,t.velocity.y=m;else{const O=B/v;t.velocity.x+=S*O,t.velocity.y+=b*O}}}class Rt{constructor(){r(this,"id","pickup");r(this,"name","Pickup Ability");r(this,"enabled",!0);r(this,"pickupReach",1.3);r(this,"crossLayerReachRatio",.55)}isObjectInReach(t,i,s=1){var c;if(!this.enabled||i===t||i.isHeld||i.isCharacter||i.lastThrower===t)return!1;const e=t.position.z>=s-.05?1:0,l=i.position.z>=s-.05?1:0,o=e!==l?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,a=i.hasCollider?i.colliderRadius:((c=i.colliderModule)==null?void 0:c.radius)??.32;return Math.hypot(i.position.x-t.position.x,i.position.y-t.position.y)<=o+a}findTargetObject(t,i,s,e,l=1){if(!this.enabled)return null;let n=null,o=1/0;for(const a of e){if(!this.isObjectInReach(t,a,l))continue;const d=Math.hypot(a.position.x-i,a.position.y-s);d<o&&(o=d,n=a)}return n}pickup(t,i){if(!this.enabled||t.heldObject)return!1;const s=i.velocity.x,e=i.velocity.y,l=i.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=e*l,t.isAboveGround&&Math.abs(i.verticalVelocity)>.1&&(t.verticalVelocity+=i.verticalVelocity*l),t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=i.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const i=t.heldObject;return t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.velocity.x=t.velocity.x*.4,i.velocity.y=t.velocity.y*.4,i.verticalVelocity=0,i}}class Pt{constructor(){r(this,"id","throw");r(this,"name","Throw Ability");r(this,"enabled",!0);r(this,"baseThrowForce",7.6);r(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),n=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,a=i-n;return o*o+a*a<s*s}computeLaunchVelocity(t,i,s,e,l,n,o,a=!0,d=!0,c=.35){const y=e-t,g=l-i,p=Math.hypot(y,g);if(p<.1)return null;const f=Math.min(p,this.maxThrowAimDistance),m=y/p,S=g/p,b=t+m*f,v=i+S*f;if(!a||!d){const M=Math.max(3,o),P=Math.max(.14,f/M),$=m*M,C=S*M;return{vx:$,vy:C,vz:0,totalTime:P,finalTargetX:b,finalTargetY:v,targetSurfaceHeight:s}}const w=n.getSupportingSurfaceHeight(b,v),F=w-s,k=Math.max(3,o);let B=Math.max(.14,f/k);F>0&&(B=Math.max(B,Math.sqrt(2*F/n.gravity)));const T=40,O=c>0?c:.35,L=.25;for(let M=1;M<T;M++){const P=M/T,$=t+(b-t)*P,C=i+(v-i)*P;for(const R of n.walls)if(this.testWallIntersection($,C,O,R)){if(w>0&&b>=R.x&&b<=R.x+R.width&&v>=R.y&&v<=R.y+R.height&&P>.65)continue;const D=(1-P)*s+P*w,H=R.wallHeight+L-D;if(H>0){const j=n.gravity*P*(1-P);if(j>.001){const G=2*H/j;if(G>0){const U=Math.sqrt(G);U>B&&(B=U)}}}}}if(B<=.05)return null;const V=(F+.5*n.gravity*B*B)/B,u=f/B,E=m*u,x=S*u;return{vx:E,vy:x,vz:V,totalTime:B,finalTargetX:b,finalTargetY:v,targetSurfaceHeight:w}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,n=l.position.x,o=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,c=l.hasGravity&&l.hasVerticalVelocity,y=this.computeLaunchVelocity(n,o,a,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!y)return null;const{vx:g,vy:p,vz:f,totalTime:m,finalTargetX:S,finalTargetY:b,targetSurfaceHeight:v}=y,w=90,F=m/w,k=[];let W=!1,B=v>0,T;for(let L=0;L<=w;L++){const V=L*F,u=L===w?S:n+g*V,E=L===w?b:o+p*V,x=c?a+f*V-.5*e.gravity*V*V:a,M=c?L===w?v:Math.max(v,x):a,P=c?f-e.gravity*V:0,$=M>e.wallHeight;let C=!1,R=!1;for(const A of e.walls)if(this.testWallIntersection(u,E,l.colliderRadius,A)&&(C=!0,M<=A.wallHeight+.001)){if(k.length>0&&k[k.length-1].z>=A.wallHeight-.05&&P<=0){if(v>0&&(L>=w-2||Math.hypot(u-S,E-b)<.2)){B=!0;break}else if(v===0){B=!0,R=!0,W=!0,T=A.id;break}}else if(M<A.wallHeight-.05){R=!0,W=!0,T=A.id;break}}if(k.push({x:u,y:E,z:M,t:V,couldClearWall:$,isOverWall:C,collidesWall:R}),R)break}const O=k[k.length-1];return{points:k,landPoint:{x:W?O.x:S,y:W?O.y:b},isBlockedByWall:W,isLandingOnWallTop:W?B:v>0,blockedAtWallId:T}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,n=l.position.x,o=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,c=this.computeLaunchVelocity(n,o,a,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!c)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=c.vx,l.velocity.y=c.vy,l.verticalVelocity=c.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const S=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=c.vx/S,l.rollModule.angularVelocity.x=-c.vy/S}const y=l.hasMass?l.mass:0,g=t.hasMass?Math.max(.2,t.baseMass):0,p=y>0&&g>0?y/g:0;t.heldObject=null;const f=c.vx-t.velocity.x,m=c.vy-t.velocity.y;if(t.velocity.x-=f*p,t.velocity.y-=m*p,t.isAboveGround&&l.hasVerticalVelocity){const S=c.vz-t.verticalVelocity;t.verticalVelocity-=S*p}return l}}class Ft{constructor(t){r(this,"id","climbing");r(this,"name","Climbing Module");r(this,"enabled",!0);r(this,"maxAdhesion",35);r(this,"maxClimbSpeed",3);r(this,"preventWalkOff",!0);r(this,"horizontalClimb",!1);r(this,"hangDistance",.1);r(this,"dismountSuppressedUntilRelease",!1);r(this,"climbSuppressedUntilRelease",!1);r(this,"isDismountFreefall",!1);r(this,"isAssistClampArmed",!1);r(this,"hasLeftClampZoneSinceDismount",!0);r(this,"wasClimbHeldLastTick",!1);(t==null?void 0:t.maxAdhesion)!==void 0&&(this.maxAdhesion=t.maxAdhesion),(t==null?void 0:t.maxClimbSpeed)!==void 0&&(this.maxClimbSpeed=t.maxClimbSpeed),(t==null?void 0:t.preventWalkOff)!==void 0&&(this.preventWalkOff=t.preventWalkOff),(t==null?void 0:t.horizontalClimb)!==void 0&&(this.horizontalClimb=t.horizontalClimb),(t==null?void 0:t.hangDistance)!==void 0&&(this.hangDistance=t.hangDistance)}get climbSuppressedUntilRePress(){return this.isDismountFreefall||this.climbSuppressedUntilRelease}set climbSuppressedUntilRePress(t){this.isDismountFreefall=t,this.climbSuppressedUntilRelease=t}update(t,i,s,e,l){const n=s&&!this.wasClimbHeldLastTick;if(this.wasClimbHeldLastTick=s,s||(this.dismountSuppressedUntilRelease=!1,this.climbSuppressedUntilRelease=!1),(t.position.z<=.01||n)&&(this.isDismountFreefall=!1,t.position.z<=.01&&(this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)),this.climbSuppressedUntilRelease||!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const o=t.hasCollider?t.colliderRadius:.44,a=Math.hypot(i.x,i.y),d=a>=.05,c=d?i.x/a:0,y=d?i.y/a:0;if(!t.isClimbing&&(t.standingWall!==null||t.position.z>=l.wallHeight))return t.isClimbing=!1,!1;let g=null,p=1/0,f=0,m=0,S=0;for(const k of l.walls){const W=Math.max(k.x,Math.min(t.position.x,k.x+k.width)),B=Math.max(k.y,Math.min(t.position.y,k.y+k.height)),T=W-t.position.x,O=B-t.position.y,L=Math.hypot(T,O);L<=o+.15&&L<p&&(p=L,g=k,f=d?c*T+y*O:0,m=T,S=O)}if(!g)return t.isClimbing=!1,!1;const b=t.mass;if(b*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;const w=t.isClimbing;if(w&&t.position.z<g.wallHeight){const k=p>.001?m/p:0,W=p>.001?S/p:0,B=-W,T=k,O=d?c*k+y*W:0,L=d?c*B+y*T:0;if(d&&(O<-.3||!this.horizontalClimb&&f<-.1))return t.isClimbing=!1,t.velocity.x=c*3,t.velocity.y=y*3,s&&(this.climbSuppressedUntilRelease=!0),!1;if(t.isClimbing=!0,t.verticalVelocity=0,t.standingWall=null,this.horizontalClimb&&d&&Math.abs(L)>=.1){const V=t.baseMass,u=Math.max(.5,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*V*t.strength/Math.max(.1,b)));t.velocity.x=B*L*u,t.velocity.y=T*L*u}else t.velocity.x=0,t.velocity.y=0;if(s){const V=t.baseMass,u=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*V*t.strength/Math.max(.1,b)));t.position.z+=u*e,t.position.z>=g.wallHeight&&(t.position.z=g.wallHeight,t.supportingSurfaceHeight=g.wallHeight,t.standingWall=g,t.verticalVelocity=0,t.isClimbing=!1,this.dismountSuppressedUntilRelease=!0,this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)}return!0}if(!w&&t.position.z>.05&&t.position.z<g.wallHeight)return n?(t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0,!0):(t.isClimbing=!1,!1);if(s&&d&&f>.01&&p<=o+.03&&t.position.z<g.wallHeight){if(p>.001){const B=m/p,T=S/p;t.position.x=t.position.x+m-B*o,t.position.y=t.position.y+S-T*o}t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const k=t.baseMass,W=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*k*t.strength/Math.max(.1,b)));return t.position.z+=W*e,!0}return t.isClimbing=!1,!1}}class wt{constructor(t={}){r(this,"id","strength");r(this,"name","Strength Module");r(this,"enabled",!0);r(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class xt extends tt{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});r(this,"strengthModule");r(this,"facingAngle");r(this,"heldObject");r(this,"isCharacter",!0);r(this,"isActivelyWalking",!1);r(this,"isClimbInputHeld",!1);r(this,"baseMass",1.2);r(this,"walkingModule");r(this,"pickupModule");r(this,"throwModule");r(this,"climbingModule");r(this,"isAiming");r(this,"aimTarget");r(this,"activeTrajectory");this.baseMass=i.mass??1.2,this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new wt({strength:i.strength??1}),this.walkingModule=new Wt,this.pickupModule=new Rt,this.throwModule=new Pt,this.climbingModule=new Ft}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(i){this.strengthModule?this.strengthModule.strength=Math.max(.1,i):this.strengthModule=new wt({strength:i})}get mass(){const i=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return i+s}set mass(i){this.baseMass=Math.max(.1,i),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}get hangDistance(){return this.climbingModule?this.climbingModule.hangDistance:.1}set hangDistance(i){this.climbingModule&&(this.climbingModule.hangDistance=Math.max(0,i))}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,n=s.y-this.position.y;if(Math.hypot(l,n)>.1){this.facingAngle=Math.atan2(n,l);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,l,n,o=!1){if(this.isClimbInputHeld=o,this.climbingModule&&this.climbingModule.update(this,s,o,i,n),this.walkingModule&&this.walkingModule.update(this,s,i,n),this.updatePosition(i,n),this.updateFacingDirection(e,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,n):this.activeTrajectory=null}}class Mt{constructor(t={}){r(this,"enabled",!0);r(this,"angularVelocity",{x:0,y:0,z:0});r(this,"rollResistance",.4);r(this,"visualPhase",0);var i,s,e;this.enabled=t.enabled??!0,this.angularVelocity={x:((i=t.angularVelocity)==null?void 0:i.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((e=t.angularVelocity)==null?void 0:e.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const i=this.angularSpeed;i>.001&&(this.visualPhase=(this.visualPhase+i*t)%(Math.PI*2))}}class rt{constructor(t){r(this,"ctx");this.ctx=t}render(t,i,s,e,l=!1,n,o,a=!1,d){const c=this.ctx,y=c.canvas.width/t.width;c.clearRect(0,0,c.canvas.width,c.canvas.height),this.drawFloorGrid(t,y),this.drawWalls(t,y),a&&d&&this.drawWallEditorHover(t,d,y);const g=[i,...s];g.sort((p,f)=>Math.abs(p.position.z-f.position.z)>.001?p.position.z-f.position.z:Math.abs(p.verticalVelocity-f.verticalVelocity)>.001?p.verticalVelocity-f.verticalVelocity:p.position.y-f.position.y);for(const p of g)p instanceof xt?this.drawCharacter(p,g,y,t):this.drawFreebodyObject(p,g,i,y,p===o,t),this.drawObjectShadow(p,t,y);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,y),l&&(n&&n!==e&&this.drawHoverGizmo(n,y),e&&this.drawSelectionGizmo(e,l,y))}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawWallEditorHover(t,i,s){if(i.col<0||i.col>=t.cols||i.row<0||i.row>=t.rows)return;const e=this.ctx,l=i.col*t.tileSize*s,n=i.row*t.tileSize*s,o=t.tileSize*s,a=t.hasWall(i.col,i.row);e.save(),a?(e.fillStyle="rgba(239, 68, 68, 0.35)",e.strokeStyle="#ef4444",e.lineWidth=2.5,e.fillRect(l,n,o,o),e.strokeRect(l,n,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#fca5a5",e.textAlign="center",e.textBaseline="middle",e.fillText("✕ Erase",l+o/2,n+o/2)):(e.fillStyle="rgba(56, 189, 248, 0.3)",e.strokeStyle="#38bdf8",e.lineWidth=2.5,e.fillRect(l,n,o,o),e.strokeRect(l,n,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#7dd3fc",e.textAlign="center",e.textBaseline="middle",e.fillText("+ Draw",l+o/2,n+o/2)),e.restore()}static getAltitudeScale(t,i){return 1+Math.max(0,t)/Math.max(.1,i)*.5}isEntityPassingOverAnother(t,i,s){var a,d;const e=t.position.z,l=rt.getAltitudeScale(e,s.wallHeight),n=t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32,o=n*l;for(const c of i){if(c===t)continue;const y=c.position.z;if(!(e>y+.001||Math.abs(e-y)<=.01&&t.verticalVelocity>c.verticalVelocity))continue;const p=rt.getAltitudeScale(y,s.wallHeight),f=c.hasCollider?c.colliderRadius:((d=c.colliderModule)==null?void 0:d.radius)??.32,m=f*p,S=Math.hypot(t.position.x-c.position.x,t.position.y-c.position.y),b=Math.max(n+f,o+m*.7);if(S<b)return!0}return!1}drawObjectShadow(t,i,s){const e=this.ctx,l=t.position.x*s,n=t.position.y*s,o=t.position.z,a=t.colliderRadius*s,d=o>=i.wallHeight-.001;if(e.save(),e.beginPath(),t.visualShape==="box"){const c=a*2,y=Math.max(3,a*.16);e.roundRect?e.roundRect(l-a,n-a,c,c,y):e.rect(l-a,n-a,c,c)}else e.arc(l,n,a,0,Math.PI*2);o>.01&&e.setLineDash([7,4]),e.strokeStyle="rgba(0, 0, 0, 0.85)",e.lineWidth=d?5.2:4,e.stroke(),d?(e.strokeStyle="#38bdf8",e.lineWidth=3.2,e.shadowColor="#0284c7",e.shadowBlur=8):(e.strokeStyle="#ffffff",e.lineWidth=2.2),e.stroke(),e.restore()}drawFreebodyObject(t,i,s,e,l=!1,n){var S,b;const o=this.ctx,a=t.position.x*e,d=t.position.y*e,c=rt.getAltitudeScale(t.position.z,n.wallHeight),g=(t.hasCollider?t.colliderRadius:((S=t.colliderModule)==null?void 0:S.radius)??.32)*e*c,f=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled&&!t.isHeld&&(((b=s.pickupModule)==null?void 0:b.isObjectInReach(s,t,n.wallHeight))??!1);if(f){if(o.save(),o.beginPath(),t.visualShape==="box"){const v=(g+5)*2;o.roundRect?o.roundRect(a-g-5,d-g-5,v,v,6):o.rect(a-g-5,d-g-5,v,v)}else o.arc(a,d,g+5,0,Math.PI*2);l?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",a,d-g-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}const m=this.isEntityPassingOverAnother(t,i,n);if(o.save(),o.globalAlpha=m?.55:1,t.visualShape==="box"){const v=g*2,w=Math.max(3,g*.16),F=a-g,k=d-g;o.beginPath(),o.roundRect?o.roundRect(F,k,v,v,w):o.rect(F,k,v,v),o.fillStyle=t.color,o.fill(),o.strokeStyle=f?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=f?2.5:2,o.stroke();const W=Math.max(3,g*.22);o.beginPath(),o.roundRect?o.roundRect(F+W,k+W,v-W*2,v-W*2,w*.7):o.rect(F+W,k+W,v-W*2,v-W*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(F+W,k+W),o.lineTo(F+v-W,k+v-W),o.moveTo(F+v-W,k+W),o.lineTo(F+W,k+v-W),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(a,d,g,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=f?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=f?2.5:2,o.stroke();this.drawRollIndicator(t,a,d,g),o.restore()}drawCharacter(t,i,s,e){const l=this.ctx,n=t.position.x*s,o=t.position.y*s,a=rt.getAltitudeScale(t.position.z,e.wallHeight),d=t.colliderRadius*s*a,c=this.isEntityPassingOverAnother(t,i,e);l.save(),l.globalAlpha=c?.55:1,l.beginPath(),l.arc(n,o,d,0,Math.PI*2),l.fillStyle=t.color,l.fill(),l.strokeStyle="#ffffff",l.lineWidth=2.5,l.stroke(),this.drawRollIndicator(t,n,o,d);const y=.52,g=d*.72,p=Math.max(3.5,d*.18),f=t.facingAngle-y,m=t.facingAngle+y,S=n+Math.cos(f)*g,b=o+Math.sin(f)*g,v=n+Math.cos(m)*g,w=o+Math.sin(m)*g;l.fillStyle="#000000",l.beginPath(),l.arc(S,b,p,0,Math.PI*2),l.arc(v,w,p,0,Math.PI*2),l.fill(),t.heldObject&&(l.strokeStyle="rgba(255, 255, 255, 0.6)",l.setLineDash([3,3]),l.lineWidth=1.5,l.beginPath(),l.moveTo(n,o),l.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),l.stroke(),l.setLineDash([])),l.restore()}drawRollIndicator(t,i,s,e){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,n=l.angularVelocity.x,o=l.angularVelocity.y,a=l.angularVelocity.z,d=Math.hypot(n,o,a);if(d<.02)return;const c=this.ctx,g=Math.hypot(n,o)<.05*d,p=2.5,f=5,m=4;if(c.save(),c.shadowColor="rgba(0, 0, 0, 0.75)",c.shadowBlur=3,g){const S=e*.5,b=e*.88;c.beginPath(),c.arc(i,s,S,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.5)",c.lineWidth=1.8,c.setLineDash([]),c.stroke(),c.beginPath(),c.arc(i,s,b,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.98)",c.lineWidth=p,c.setLineDash([f,m]),c.lineDashOffset=-l.visualPhase*b*Math.sign(a||1),c.stroke()}else{const S=Math.atan2(-n,o),b=e*.9,v=Math.abs(a)/d,w=b*Math.max(.35,Math.pow(v,.65));c.translate(i,s),c.rotate(S);const F=a!==0?Math.sign(a):1;c.beginPath(),c.ellipse(0,0,b,w,0,0,Math.PI),c.strokeStyle="rgba(255, 255, 255, 0.98)",c.lineWidth=p,c.setLineDash([f,m]),c.lineDashOffset=-l.visualPhase*b*F,c.stroke(),c.beginPath(),c.ellipse(0,0,b,w,0,Math.PI,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.35)",c.lineWidth=1.8,c.setLineDash([f,m]),c.lineDashOffset=-l.visualPhase*b*F,c.stroke()}c.restore()}drawTrajectory(t,i){const s=this.ctx,e=t.points;if(e.length<2)return;s.save();for(let n=0;n<e.length-1;n++){const o=e[n],a=e[n+1];s.beginPath(),s.moveTo(o.x*i,o.y*i),s.lineTo(a.x*i,a.y*i),o.couldClearWall||a.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const l=e[e.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const n=8;s.beginPath(),s.moveTo(l.x*i-n,l.y*i-n),s.lineTo(l.x*i+n,l.y*i+n),s.moveTo(l.x*i+n,l.y*i-n),s.lineTo(l.x*i-n,l.y*i+n),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,i){var a;const s=this.ctx,e=t.position.x*i,l=t.position.y*i,o=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*i;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(e,l,o,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,i,s){var g;const e=this.ctx,l=t.position.x*s,n=t.position.y*s,d=(t.hasCollider?t.colliderRadius:((g=t.colliderModule)==null?void 0:g.radius)??.32)*s+6,c=Math.max(6,d*.4),y=i?"#fbbf24":"#38bdf8";if(e.save(),e.strokeStyle=y,e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.moveTo(l-d,n-d+c),e.lineTo(l-d,n-d),e.lineTo(l-d+c,n-d),e.stroke(),e.beginPath(),e.moveTo(l+d-c,n-d),e.lineTo(l+d,n-d),e.lineTo(l+d,n-d+c),e.stroke(),e.beginPath(),e.moveTo(l+d,n+d-c),e.lineTo(l+d,n+d),e.lineTo(l+d-c,n+d),e.stroke(),e.beginPath(),e.moveTo(l-d+c,n+d),e.lineTo(l-d,n+d),e.lineTo(l-d,n+d-c),e.stroke(),i){const p=`${t.name} (${t.mass.toFixed(1)}kg)`;e.font="bold 10px 'Segoe UI', system-ui, sans-serif";const m=e.measureText(p).width+12,S=16,b=l-m/2,v=n-d-S-4;e.fillStyle="rgba(15, 23, 42, 0.85)",e.strokeStyle=y,e.lineWidth=1,e.beginPath(),e.roundRect(b,v,m,S,4),e.fill(),e.stroke(),e.fillStyle=y,e.textAlign="center",e.textBaseline="middle",e.fillText(p,l,v+S/2)}e.restore()}}class At{constructor(t,i){r(this,"canvas");r(this,"arena");r(this,"keysPressed",new Set);r(this,"mousePos",{x:0,y:0});r(this,"isMouseDown",!1);r(this,"isRightMouseDown",!1);r(this,"hoverWallTile",null);r(this,"movementVector",{x:0,y:0});r(this,"justPickedUp",!1);r(this,"isThrowingPress",!1);r(this,"hoverEntity",null);r(this,"selectedCanvasEntity",null);r(this,"draggedEntity",null);r(this,"dragOffset",{x:0,y:0});r(this,"handleClick");r(this,"onMouseDown");r(this,"onRightMouseDown");r(this,"onMouseUp");r(this,"onRightClick");r(this,"onDropAttempt");r(this,"onMouseMove");this.canvas=t,this.arena=i,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){e&&(this.selectedCanvasEntity=e.selectedEntity);const l=(a,d,c=.35)=>{var p;for(let f=s.length-1;f>=0;f--){const m=s[f],S=m.hasCollider?m.colliderRadius:((p=m.colliderModule)==null?void 0:p.radius)??.32;if(Math.hypot(m.position.x-a,m.position.y-d)<=S+c)return m}const y=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-d)<=y+c?t:null},n=(a,d)=>{if(a<0||a>=i.cols||d<0||d>=i.rows)return;if(i.setWallTile(a,d,!0)){const y=[t,...s];i.syncEntitiesWithWalls(y),i.currentPresetId="custom",e==null||e.updateWallPresetUI()}},o=(a,d)=>{if(!(a<0||a>=i.cols||d<0||d>=i.rows)&&i.tileGrid[d][a]===1){i.setWallTile(a,d,!1);const c=[t,...s];i.syncEntitiesWithWalls(c),i.currentPresetId="custom",e==null||e.updateWallPresetUI()}};this.onMouseDown=(a,d)=>{if(e!=null&&e.isEditMode){if(e.editTool==="walls"){const y=Math.floor(a/i.tileSize),g=Math.floor(d/i.tileSize);n(y,g);return}const c=l(a,d,.35);c?(this.selectedCanvasEntity=c,e.setSelectedEntity(c),this.draggedEntity=c,this.dragOffset.x=c.position.x-a,this.dragOffset.y=c.position.y-d,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"){const c=Math.floor(a/i.tileSize),y=Math.floor(d/i.tileSize);o(c,y)}},this.onMouseMove=(a,d)=>{var g;const c=Math.floor(a/i.tileSize),y=Math.floor(d/i.tileSize);if(c>=0&&c<i.cols&&y>=0&&y<i.rows?this.hoverWallTile={col:c,row:y}:this.hoverWallTile=null,e!=null&&e.isEditMode){if(e.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?n(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&o(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const p=a+this.dragOffset.x,f=d+this.dragOffset.y,m=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((g=this.draggedEntity.colliderModule)==null?void 0:g.radius)??.32;this.draggedEntity.position.x=Math.max(m,Math.min(i.width-m,p)),this.draggedEntity.position.y=Math.max(m,Math.min(i.height-m,f)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const p=l(a,d,.3);this.hoverEntity=p,this.canvas.style.cursor=p?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,d)=>{if(this.draggedEntity&&(i.syncEntitiesWithWalls([this.draggedEntity]),this.draggedEntity=null),e!=null&&e.isEditMode)if(e.editTool==="walls")this.canvas.style.cursor="cell";else{const c=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=c,this.canvas.style.cursor=c?"grab":"crosshair"}},this.handleClick=(a,d)=>{if(!(e!=null&&e.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,d,i),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const c=t.pickupModule.findTargetObject(t,a,d,s,i.wallHeight);c&&(t.pickupModule.pickup(t,c),this.justPickedUp=!0)}}},this.onRightClick=(a,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"||!e)return;const c=l(a,d,.4);c&&(this.selectedCanvasEntity=c,e.setSelectedEntity(c))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,i.wallHeight);a&&t.pickupModule.pickup(t,a)}}}}class Bt{constructor(t){r(this,"container");r(this,"character");r(this,"arena");r(this,"objects");r(this,"onSpawnObject");r(this,"onDeleteObject");r(this,"onClearObjects");r(this,"selectedEntity");r(this,"isEditMode",!1);r(this,"editTool","entities");r(this,"onSelectionChange");r(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});r(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});r(this,"inspectorEl");r(this,"entitySelectorEl");r(this,"characterSpecificControlsEl");r(this,"objectSpecificControlsEl");r(this,"modePlayBtn");r(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var i;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(i=this.onSelectionChange)==null||i.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const i=this.container.querySelector("#edit-submode-container");i&&(i.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const i=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");i&&s&&(i.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const i=this.container.querySelector("#edit-hint-label");i&&(this.isEditMode?this.editTool==="walls"?i.textContent="Left-drag: Draw | Right-drag: Erase":i.textContent="Click & drag object in arena":i.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const e of this.objects){const l=e.id===t?"selected":"",n=e.visualShape==="box"?"📦":"⚪",o=e.hasMass?`${e.mass.toFixed(1)}kg`:"Massless";i+=`<option value="${e.id}" ${l}>${n} ${e.name} (${o})</option>`}this.entitySelectorEl.innerHTML=i;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,i,s,e,l,n,o,a,d,c,y,g,p,f,m,S,b,v,w,F,k,W,B,T,O,L,V,u,E,x,M,P,$,C,R,A,D,z,H,j,G,U,h,I,X,Y,K,et,gt,it,st,pt,lt,ot,vt,at,nt,bt,ct,Q,Z,N,_,kt,Vt,Et,Ct;this.container.innerHTML=`
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
                  <span id="val-entity-static-fric">${(((d=this.selectedEntity.frictionModule)==null?void 0:d.staticFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${((c=this.selectedEntity.frictionModule)==null?void 0:c.staticFrictionMod)??1}">
              </div>
              <div class="slider-group">
                <div class="slider-label">
                  <span>Dynamic Friction Mod</span>
                  <span id="val-entity-dynamic-fric">${(((y=this.selectedEntity.frictionModule)==null?void 0:y.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((g=this.selectedEntity.frictionModule)==null?void 0:g.dynamicFrictionMod)??1}">
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
              <button id="toggle-mod-bounce" class="btn-toggle ${(f=this.selectedEntity.bounceModule)!=null&&f.enabled?"active":""}">
                ${(m=this.selectedEntity.bounceModule)!=null&&m.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((S=this.selectedEntity.bounceModule)!=null&&S.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(b=this.selectedEntity.bounceModule)!=null&&b.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((v=this.selectedEntity.bounceModule)==null?void 0:v.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((w=this.selectedEntity.bounceModule)==null?void 0:w.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(F=this.selectedEntity.bounceModule)!=null&&F.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(k=this.selectedEntity.bounceModule)!=null&&k.enabled&&((W=this.selectedEntity.bounceModule)!=null&&W.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${(B=this.selectedEntity.bounceModule)!=null&&B.enabled?"none":"block"};">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(T=this.selectedEntity.rollModule)!=null&&T.enabled?"active":""}">
                ${(O=this.selectedEntity.rollModule)!=null&&O.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(L=this.selectedEntity.rollModule)!=null&&L.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(V=this.selectedEntity.rollModule)!=null&&V.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((u=this.selectedEntity.rollModule)==null?void 0:u.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((E=this.selectedEntity.rollModule)==null?void 0:E.rollResistance)??.4}">
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
                  ${(M=this.character.walkingModule)!=null&&M.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((P=this.character.walkingModule)!=null&&P.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&(($=this.character.walkingModule)!=null&&$.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(C=this.character.walkingModule)!=null&&C.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((R=this.character.walkingModule)==null?void 0:R.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((A=this.character.walkingModule)==null?void 0:A.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((D=this.character.walkingModule)==null?void 0:D.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((z=this.character.walkingModule)==null?void 0:z.maxWalkSpeed)??5.2}">
                </div>
              </div>
            </div>

            <!-- Strength Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>💪 Strength Ability</label>
                <button id="toggle-strength" class="btn-toggle ${(H=this.character.strengthModule)!=null&&H.enabled?"active":""}">
                  ${(j=this.character.strengthModule)!=null&&j.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-strength" style="display: ${(G=this.character.strengthModule)!=null&&G.enabled?"block":"none"};">
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
                  ${(h=this.character.pickupModule)!=null&&h.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(I=this.character.pickupModule)!=null&&I.enabled?"block":"none"};">
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
                    <span id="val-pickup-cross-layer">${(((K=this.character.pickupModule)==null?void 0:K.crossLayerReachRatio)??.55).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-pickup-cross-layer" min="0.10" max="1.00" step="0.05" value="${((et=this.character.pickupModule)==null?void 0:et.crossLayerReachRatio)??.55}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(gt=this.character.throwModule)!=null&&gt.enabled?"active":""}">
                  ${(it=this.character.throwModule)!=null&&it.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(st=this.character.throwModule)!=null&&st.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((pt=this.character.throwModule)==null?void 0:pt.baseThrowForce)??7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((lt=this.character.throwModule)==null?void 0:lt.baseThrowForce)??7.6}">
                </div>
              </div>
            </div>

            <!-- Climbing Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🧗 Climbing Ability</label>
                <button id="toggle-climb" class="btn-toggle ${(ot=this.character.climbingModule)!=null&&ot.enabled?"active":""}">
                  ${(vt=this.character.climbingModule)!=null&&vt.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-climb-deps" class="module-dep-warning" style="display: ${(!this.character.hasVerticalPosition||!this.character.hasStrength)&&((at=this.character.climbingModule)!=null&&at.enabled)?"block":"none"};">
                ${this.character.hasVerticalPosition?this.character.hasStrength?"":"⚠️ Requires Strength Ability to climb":"⚠️ Requires Vertical Position (3D Z-axis)"}
              </div>
              <div id="group-mod-climb" style="display: ${(nt=this.character.climbingModule)!=null&&nt.enabled?"block":"none"};">
                <div class="toggle-row" style="margin-bottom: 8px;">
                  <label style="font-size: 0.8rem;">Prevent Walk-Off (Require Space)</label>
                  <button id="toggle-climb-walkoff" class="btn-toggle ${(bt=this.character.climbingModule)!=null&&bt.preventWalkOff?"active":""}">
                    ${(ct=this.character.climbingModule)!=null&&ct.preventWalkOff?"Active":"Inactive"}
                  </button>
                </div>
                <div class="toggle-row" style="margin-bottom: 8px;">
                  <label style="font-size: 0.8rem;">Sideways Climb (Traverse Wall)</label>
                  <button id="toggle-climb-sideways" class="btn-toggle ${(Q=this.character.climbingModule)!=null&&Q.horizontalClimb?"active":""}">
                    ${(Z=this.character.climbingModule)!=null&&Z.horizontalClimb?"Active":"Inactive"}
                  </button>
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Adhesion (N)</span>
                    <span id="val-climb-adhesion">${(((N=this.character.climbingModule)==null?void 0:N.maxAdhesion)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-climb-adhesion" min="5.0" max="80.0" step="1.0" value="${((_=this.character.climbingModule)==null?void 0:_.maxAdhesion)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Climb Speed (u/s)</span>
                    <span id="val-climb-speed">${(((kt=this.character.climbingModule)==null?void 0:kt.maxClimbSpeed)??3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${((Vt=this.character.climbingModule)==null?void 0:Vt.maxClimbSpeed)??3}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Ledge Hang Distance (u)</span>
                    <span id="val-climb-hang">${(((Et=this.character.climbingModule)==null?void 0:Et.hangDistance)??.1).toFixed(2)}</span>
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var A,D,z,H,j,G,U;const t=this.selectedEntity,i=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=i?"none":"flex");const e=this.container.querySelector("#toggle-entity-shape");e&&(t.visualShape==="box"?(e.textContent="Box 📦",e.classList.add("active")):(e.textContent="Circle ⚪",e.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),n=this.container.querySelector("#group-mod-collider"),o=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),n&&(n.style.display=t.hasCollider?"block":"none"),o&&(o.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((A=t.colliderModule)==null?void 0:A.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),d=this.container.querySelector("#group-mod-mass"),c=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),c&&(c.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((D=t.massModule)==null?void 0:D.mass)??1,1);const y=this.container.querySelector("#toggle-mod-friction"),g=this.container.querySelector("#group-mod-friction"),p=this.container.querySelector("#note-mod-friction"),f=this.container.querySelector("#warn-friction-mass"),m=!!(t.frictionModule&&t.frictionModule.enabled);y&&(y.textContent=m?"Attached":"Detached",y.classList.toggle("active",m)),g&&(g.style.display=m?"flex":"none"),p&&(p.style.display=m?"none":"block"),f&&(f.style.display=!t.hasMass&&m?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((z=t.frictionModule)==null?void 0:z.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((H=t.frictionModule)==null?void 0:H.dynamicFrictionMod)??1,2);const S=this.container.querySelector("#toggle-mod-bounce"),b=this.container.querySelector("#group-mod-bounce"),v=this.container.querySelector("#note-mod-bounce"),w=this.container.querySelector("#warn-bounce-mass"),F=!!(t.bounceModule&&t.bounceModule.enabled);S&&(S.textContent=F?"Attached":"Detached",S.classList.toggle("active",F)),b&&(b.style.display=F?"block":"none"),v&&(v.style.display=F?"none":"block"),w&&(w.style.display=!t.hasMass&&F?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const k=this.container.querySelector("#check-mod-vert-bounce"),W=this.container.querySelector("#warn-bounce-vert-vel");if(k&&(k.checked=!!((G=t.bounceModule)!=null&&G.verticalBounce)),W){const h=!!(F&&((U=t.bounceModule)!=null&&U.verticalBounce)&&!t.hasVerticalVelocity);W.style.display=h?"block":"none"}const B=this.container.querySelector("#toggle-mod-vert-pos"),T=this.container.querySelector("#group-mod-vert-pos"),O=this.container.querySelector("#note-mod-vert-pos"),L=t.hasVerticalPosition;B&&(B.textContent=L?"Attached":"Detached",B.classList.toggle("active",L)),T&&(T.style.display=L?"block":"none"),O&&(O.style.display=L?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const V=this.container.querySelector("#toggle-mod-vert-vel"),u=this.container.querySelector("#group-mod-vert-vel"),E=t.hasVerticalVelocity;V&&(V.textContent=E?"Enabled":"Disabled",V.classList.toggle("active",E)),u&&(u.style.display=E?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const x=this.container.querySelector("#toggle-mod-gravity"),M=this.container.querySelector("#note-mod-gravity");x&&(x.textContent=t.hasGravity?"Attached":"Detached",x.classList.toggle("active",t.hasGravity)),M&&(M.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const P=this.container.querySelector("#toggle-mod-roll"),$=this.container.querySelector("#group-mod-roll"),C=this.container.querySelector("#note-roll-friction"),R=!!(t.rollModule&&t.rollModule.enabled);if(P&&(P.textContent=R?"Attached":"Detached",P.classList.toggle("active",R)),$&&($.style.display=R?"block":"none"),C&&(C.style.display=R&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),i){const h=this.container.querySelector("#toggle-walk"),I=this.container.querySelector("#group-mod-walking"),X=this.container.querySelector("#warn-walk-friction"),Y=this.container.querySelector("#warn-walk-strength"),K=!!(this.character.walkingModule&&this.character.walkingModule.enabled);h&&(h.textContent=K?"Attached":"Detached",h.classList.toggle("active",K)),I&&(I.style.display=K?"flex":"none"),X&&(X.style.display=K&&!this.character.hasFriction?"block":"none"),Y&&(Y.style.display=K&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const et=this.container.querySelector("#toggle-strength"),gt=this.container.querySelector("#group-mod-strength"),it=!!(this.character.strengthModule&&this.character.strengthModule.enabled);et&&(et.textContent=it?"Attached":"Detached",et.classList.toggle("active",it)),gt&&(gt.style.display=it?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const st=this.container.querySelector("#toggle-pickup"),pt=this.container.querySelector("#group-mod-pickup"),lt=!!(this.character.pickupModule&&this.character.pickupModule.enabled);st&&(st.textContent=lt?"Attached":"Detached",st.classList.toggle("active",lt)),pt&&(pt.style.display=lt?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const ot=this.container.querySelector("#toggle-throw"),vt=this.container.querySelector("#group-mod-throw"),at=!!(this.character.throwModule&&this.character.throwModule.enabled);ot&&(ot.textContent=at?"Attached":"Detached",ot.classList.toggle("active",at)),vt&&(vt.style.display=at?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const nt=this.container.querySelector("#toggle-climb"),bt=this.container.querySelector("#group-mod-climb"),ct=this.container.querySelector("#warn-climb-deps"),Q=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(nt&&(nt.textContent=Q?"Attached":"Detached",nt.classList.toggle("active",Q)),bt&&(bt.style.display=Q?"block":"none"),ct){const Z=!this.character.hasVerticalPosition,N=!this.character.hasStrength;ct.style.display=Q&&(Z||N)?"block":"none",ct.textContent=Z?"⚠️ Requires Vertical Position (3D Z-axis)":N?"⚠️ Requires Strength Ability to climb":""}if(this.character.climbingModule){const Z=this.container.querySelector("#toggle-climb-walkoff");if(Z){const _=!!this.character.climbingModule.preventWalkOff;Z.textContent=_?"Active":"Inactive",Z.classList.toggle("active",_)}const N=this.container.querySelector("#toggle-climb-sideways");if(N){const _=!!this.character.climbingModule.horizontalClimb;N.textContent=_?"Active":"Inactive",N.classList.toggle("active",_)}this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1),this.setSliderVal("slide-climb-hang","val-climb-hang",this.character.climbingModule.hangDistance,2)}}}setSliderVal(t,i,s,e){const l=this.container.querySelector(`#${t}`),n=this.container.querySelector(`#${i}`);l&&(l.value=s.toString()),n&&(n.textContent=e>0?s.toFixed(e):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,i=this.container.querySelector("#creator-name");i&&(i.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const e=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");e&&(e.value=t.color),l&&(l.textContent=t.color);const n=this.container.querySelector("#creator-toggle-collider"),o=this.container.querySelector("#grp-creator-radius");n&&(n.textContent=t.hasCollider?"Attached":"Detached",n.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),d=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const c=this.container.querySelector("#creator-toggle-friction"),y=this.container.querySelector("#grp-creator-fric");c&&(c.textContent=t.hasFriction?"Attached":"Detached",c.classList.toggle("active",t.hasFriction)),y&&(y.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const g=this.container.querySelector("#creator-toggle-bounce"),p=this.container.querySelector("#grp-creator-bounce"),f=this.container.querySelector("#creator-check-vert-bounce"),m=this.container.querySelector("#creator-warn-bounce-vert");g&&(g.textContent=t.hasBounce?"Attached":"Detached",g.classList.toggle("active",t.hasBounce)),p&&(p.style.display=t.hasBounce?"block":"none"),f&&(f.checked=t.verticalBounce),m&&(m.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const S=this.container.querySelector("#creator-toggle-vert-pos"),b=this.container.querySelector("#grp-creator-vert-pos");S&&(S.textContent=t.hasVerticalPosition?"Attached":"Detached",S.classList.toggle("active",t.hasVerticalPosition)),b&&(b.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const v=this.container.querySelector("#creator-toggle-vert-vel");v&&(v.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",v.classList.toggle("active",t.hasVerticalVelocity));const w=this.container.querySelector("#creator-toggle-gravity");w&&(w.textContent=t.hasGravity?"Attached":"Detached",w.classList.toggle("active",t.hasGravity));const F=this.container.querySelector("#creator-toggle-roll"),k=this.container.querySelector("#group-creator-roll-resist");F&&(F.textContent=t.hasRollModule?"Enabled":"Disabled",F.classList.toggle("active",t.hasRollModule)),k&&(k.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var $,C,R,A,D,z,H,j,G,U;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),($=this.container.querySelector("#submode-entities"))==null||$.addEventListener("click",()=>{this.setEditTool("entities")}),(C=this.container.querySelector("#submode-walls"))==null||C.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var I;const h=this.entitySelectorEl.value;if(h===this.character.id)this.selectedEntity=this.character;else{const X=this.objects.find(Y=>Y.id===h);X&&(this.selectedEntity=X)}this.updateSelectorOptions(),this.syncEntitySliders(),(I=this.onSelectionChange)==null||I.call(this,this.selectedEntity)}),(R=this.container.querySelector("#btn-duplicate-entity"))==null||R.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(A=this.container.querySelector("#btn-delete-entity"))==null||A.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const i=this.container.querySelector("#toggle-mod-collider");i==null||i.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new dt({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",h=>{this.selectedEntity.colliderRadius=h},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new ht({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",h=>{this.selectedEntity.mass=h,this.updateSelectorOptions()},1);const e=this.container.querySelector("#toggle-mod-friction");e==null||e.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new ut,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",h=>{this.selectedEntity.staticGroundFrictionMod=h},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",h=>{this.selectedEntity.dynamicGroundFrictionMod=h},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new yt({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",h=>{this.selectedEntity.bounceMod=h},2);const n=this.container.querySelector("#check-mod-vert-bounce");n==null||n.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=n.checked),this.syncEntitySliders(),this.updateInspector()});const o=this.container.querySelector("#toggle-mod-vert-pos");o==null||o.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new ft({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",h=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=h),this.selectedEntity.position.z=h,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",h=>{this.selectedEntity.verticalVelocity=h},2);const d=this.container.querySelector("#toggle-mod-gravity");d==null||d.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new mt,this.syncEntitySliders()});const c=this.container.querySelector("#toggle-mod-roll");c==null||c.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new Mt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",h=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=h)},2);const y=this.container.querySelector("#toggle-walk");y==null||y.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new Wt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",h=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=h)},0),this.setupSlider("slide-walk-speed","val-walk-speed",h=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=h)},1);const g=this.container.querySelector("#toggle-strength");g==null||g.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new wt({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",h=>{this.character.strength=h},1);const p=this.container.querySelector("#toggle-pickup");p==null||p.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new Rt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",h=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=h)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",h=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=h)},2);const f=this.container.querySelector("#toggle-throw");f==null||f.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new Pt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",h=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=h)},1);const m=this.container.querySelector("#toggle-climb");m==null||m.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Ft,this.syncEntitySliders()});const S=this.container.querySelector("#toggle-climb-walkoff");S==null||S.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.preventWalkOff=!this.character.climbingModule.preventWalkOff),this.syncEntitySliders()});const b=this.container.querySelector("#toggle-climb-sideways");b==null||b.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.horizontalClimb=!this.character.climbingModule.horizontalClimb),this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",h=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=h)},0),this.setupSlider("slide-climb-speed","val-climb-speed",h=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=h)},1),this.setupSlider("slide-climb-hang","val-climb-hang",h=>{this.character.climbingModule&&(this.character.climbingModule.hangDistance=h)},2),this.setupSlider("slide-gravity","val-gravity",h=>{this.arena.gravity=h},1),this.setupSlider("slide-wall-height","val-wall-height",h=>{this.arena.setStandardWallHeight(h),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",h,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",h=>{this.arena.setStandardWallHeight(h),this.setSliderVal("slide-wall-height","val-wall-height",h,1)},1);const v=this.container.querySelector("#select-wall-preset");v==null||v.addEventListener("change",()=>{this.arena.loadWallPreset(v.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(D=this.container.querySelector("#btn-prev-wall-map"))==null||D.addEventListener("click",()=>{const h=J.WALL_PRESETS,X=(h.findIndex(Y=>Y.id===this.arena.currentPresetId)-1+h.length)%h.length;this.arena.loadWallPreset(h[X].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(z=this.container.querySelector("#btn-next-wall-map"))==null||z.addEventListener("click",()=>{const h=J.WALL_PRESETS,X=(h.findIndex(Y=>Y.id===this.arena.currentPresetId)+1)%h.length;this.arena.loadWallPreset(h[X].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(H=this.container.querySelector("#btn-reset-walls"))==null||H.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(j=this.container.querySelector("#btn-clear-walls"))==null||j.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",h=>{this.arena.frictionCoeff=h},1),this.setupSlider("slide-static-thresh","val-static-thresh",h=>{this.arena.staticFrictionThreshold=h},2),this.container.querySelectorAll(".preset-chip").forEach(h=>{h.addEventListener("click",()=>{const I=h.getAttribute("data-preset");I&&this.presets[I]&&(this.creatorState={...this.presets[I]},this.syncCreatorInputs())})});const F=this.container.querySelector("#creator-name");F==null||F.addEventListener("input",()=>{this.creatorState.name=F.value});const k=this.container.querySelector("#creator-toggle-shape");k==null||k.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",k.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",k.classList.toggle("active",this.creatorState.visualShape==="box")});const W=this.container.querySelector("#creator-color"),B=this.container.querySelector("#val-creator-color");W==null||W.addEventListener("input",()=>{this.creatorState.color=W.value,B&&(B.textContent=W.value)});const T=this.container.querySelector("#creator-toggle-collider");T==null||T.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,T.textContent=this.creatorState.hasCollider?"Attached":"Detached",T.classList.toggle("active",this.creatorState.hasCollider);const h=this.container.querySelector("#grp-creator-radius");h&&(h.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",h=>{this.creatorState.colliderRadius=h},2);const O=this.container.querySelector("#creator-toggle-mass");O==null||O.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,O.textContent=this.creatorState.hasMass?"Attached":"Detached",O.classList.toggle("active",this.creatorState.hasMass);const h=this.container.querySelector("#grp-creator-mass");h&&(h.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",h=>{this.creatorState.mass=h},1);const L=this.container.querySelector("#creator-toggle-friction");L==null||L.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,L.textContent=this.creatorState.hasFriction?"Attached":"Detached",L.classList.toggle("active",this.creatorState.hasFriction);const h=this.container.querySelector("#grp-creator-fric");h&&(h.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",h=>{this.creatorState.dynamicFrictionMod=h},2);const V=this.container.querySelector("#creator-toggle-bounce");V==null||V.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,V.textContent=this.creatorState.hasBounce?"Attached":"Detached",V.classList.toggle("active",this.creatorState.hasBounce);const h=this.container.querySelector("#grp-creator-bounce");h&&(h.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",h=>{this.creatorState.bounceMod=h},2);const u=this.container.querySelector("#creator-check-vert-bounce");u==null||u.addEventListener("change",()=>{this.creatorState.verticalBounce=u.checked,this.syncCreatorInputs()});const E=this.container.querySelector("#creator-toggle-vert-pos");E==null||E.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",h=>{this.creatorState.elevation=h},2);const x=this.container.querySelector("#creator-toggle-vert-vel");x==null||x.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const M=this.container.querySelector("#creator-toggle-gravity");M==null||M.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,M.textContent=this.creatorState.hasGravity?"Attached":"Detached",M.classList.toggle("active",this.creatorState.hasGravity)});const P=this.container.querySelector("#creator-toggle-roll");P==null||P.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,P.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",P.classList.toggle("active",this.creatorState.hasRollModule);const h=this.container.querySelector("#group-creator-roll-resist");h&&(h.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",h=>{this.creatorState.rollResistance=h},2),(G=this.container.querySelector("#btn-spawn-configured"))==null||G.addEventListener("click",()=>{this.spawnFromCreator()}),(U=this.container.querySelector("#btn-clear-entities"))==null||U.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,i=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),e=new tt({name:t.name||"Custom Object",position:{x:i,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new dt({radius:t.colliderRadius}):null,massModule:t.hasMass?new ht({mass:t.mass}):null,frictionModule:t.hasFriction?new ut({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new yt({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new ft({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new mt:null,rollModule:t.hasRollModule?new Mt({rollResistance:t.rollResistance}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,i=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),e=new tt({name:`${t.name} (Copy)`,position:{x:i,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new dt({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new ht({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new ut({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new yt({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new ft({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new mt({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new Mt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,i,s,e=0){const l=this.container.querySelector(`#${t}`),n=this.container.querySelector(`#${i}`);!l||!n||l.addEventListener("input",()=>{const o=parseFloat(l.value);n.textContent=e>0?o.toFixed(e):Math.round(o).toString(),s(o)})}updateInspector(){var e;const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}renderWallPresetOptions(){return J.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=J.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=J.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const i=this.container.querySelector("#label-wall-map-badge");i&&(i.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class Lt{constructor(t){r(this,"arena");r(this,"character");r(this,"objects");r(this,"renderer");r(this,"inputManager");r(this,"devPanel");r(this,"isRunning",!1);r(this,"lastTime",0);r(this,"accumulator",0);r(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const e=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,e,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const i=this.inputManager;i.draggedEntity!==this.character?this.character.updateCharacter(t,i.movementVector,i.isMouseDown&&!this.devPanel.isEditMode,i.mousePos,this.arena,i.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const e of this.objects)i.draggedEntity!==e&&e.updatePosition(t,this.arena);const s=i.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const e=this.character.pickupModule.findTargetObject(this.character,i.mousePos.x,i.mousePos.y,this.objects,this.arena.wallHeight);e&&(this.character.pickupModule.pickup(this.character,e),i.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],i=this.inputManager,s=3;for(let e=0;e<s;e++)for(let l=0;l<t.length;l++)for(let n=l+1;n<t.length;n++){const o=t[l],a=t[n];if(o.isHeld||a.isHeld||o===i.draggedEntity||a===i.draggedEntity||!o.hasCollider||!a.hasCollider)continue;const d=this.arena.wallHeight-.15,c=o.position.z>=d||o.supportingSurfaceHeight>=d||o.standingWall!==null||o.isAboveWalls,y=a.position.z>=d||a.supportingSurfaceHeight>=d||a.standingWall!==null||a.isAboveWalls;if(c!==y)continue;const g=a.position.x-o.position.x,p=a.position.y-o.position.y,f=g*g+p*p,m=o.colliderRadius+a.colliderRadius;if(f<m*m&&f>1e-6){const S=Math.sqrt(f),b=m-S,v=g/S,w=p/S,F=a.velocity.x-o.velocity.x,k=a.velocity.y-o.velocity.y,W=F*v+k*w,B=!o.hasMass,T=!a.hasMass;if(B&&T){if(o.position.x-=v*b*.5,o.position.y-=w*b*.5,a.position.x+=v*b*.5,a.position.y+=w*b*.5,W<0){const x=-W*.5;o.velocity.x-=x*v,o.velocity.y-=x*w,a.velocity.x+=x*v,a.velocity.y+=x*w}continue}if(!B&&T){this.isEntityPinnedAgainstWall(a,v,w)?(o.position.x-=v*b,o.position.y-=w*b,o.velocity.x=0,o.velocity.y=0):(a.position.x+=v*b,a.position.y+=w*b,W<0&&(a.velocity.x+=(o.velocity.x-a.velocity.x)*Math.abs(v),a.velocity.y+=(o.velocity.y-a.velocity.y)*Math.abs(w)));continue}if(B&&!T){this.isEntityPinnedAgainstWall(o,-v,-w)?(a.position.x+=v*b,a.position.y+=w*b,a.velocity.x=0,a.velocity.y=0):(o.position.x-=v*b,o.position.y-=w*b,W<0&&(o.velocity.x+=(a.velocity.x-o.velocity.x)*Math.abs(v),o.velocity.y+=(a.velocity.y-o.velocity.y)*Math.abs(w)));continue}const O=1/o.mass,L=1/a.mass,V=O+L;if(V<=1e-4)continue;const u=O/V,E=L/V;if(o.position.x-=v*b*u,o.position.y-=w*b*u,a.position.x+=v*b*E,a.position.y+=w*b*E,W<0){const x=o instanceof xt&&o.isActivelyWalking||a instanceof xt&&a.isActivelyWalking,M=o.hasBounce&&a.hasBounce,P=o.isCharacter||!o.hasBounce?0:o.bounceMod??0,$=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,R=-(1+(x||!M?0:Math.max(0,Math.min(.98,Math.max(P,$)))))*W/V;o.velocity.x-=R*O*v,o.velocity.y-=R*O*w,a.velocity.x+=R*L*v,a.velocity.y+=R*L*w;const A=-w,D=v,z=F*A+k*D;if(Math.abs(z)>.001){const H=.35*Math.sqrt(o.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),j=.4,G=Math.abs(z)/(V*(1+1/j)),U=H*Math.abs(R),h=Math.min(G,U)*Math.sign(z);if(o.velocity.x+=h*O*A,o.velocity.y+=h*O*D,a.velocity.x-=h*L*A,a.velocity.y-=h*L*D,o.rollModule&&o.rollModule.enabled){const I=h/(j*o.mass*o.colliderRadius);o.rollModule.angularVelocity.z+=I,o.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,o.rollModule.angularVelocity.z)),o.isRestingOnSurface&&(o.rollModule.angularVelocity.y=o.velocity.x/o.colliderRadius,o.rollModule.angularVelocity.x=-o.velocity.y/o.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const I=h/(j*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=I,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,i,s){const e=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(i>.3&&t.position.x>=this.arena.width-e-l||i<-.3&&t.position.x<=e+l||s>.3&&t.position.y>=this.arena.height-e-l||s<-.3&&t.position.y<=e+l)return!0;for(const n of this.arena.walls)if(t.position.z<n.wallHeight-.05){const o=t.position.x+i*l,a=t.position.y+s*l,d=Math.max(n.x,Math.min(o,n.x+n.width)),c=Math.max(n.y,Math.min(a,n.y+n.height)),y=o-d,g=a-c;if(y*y+g*g<e*e)return!0}return!1}}function zt(){const q=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!q||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=q.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new J(20,14,1);q.width=1e3,q.height=700;const e=new xt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new tt({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new tt({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new tt({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new tt({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new Mt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})];s.syncEntitiesWithWalls([e,...l]);const n=new rt(i),o=new Bt({container:t,character:e,arena:s,objects:l,onSpawnObject:c=>{s.syncEntitiesWithWalls([c]),l.push(c),o.updateSelectorOptions()},onDeleteObject:c=>{const y=l.indexOf(c);y!==-1&&l.splice(y,1),o.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),l.length=0,o.updateSelectorOptions()}}),a=new At(q,s);a.handleInteractions(e,s,l,o),o.onSelectionChange=c=>{a.selectedCanvasEntity=c},new Lt({arena:s,character:e,objects:l,renderer:n,inputManager:a,devPanel:o}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",zt);

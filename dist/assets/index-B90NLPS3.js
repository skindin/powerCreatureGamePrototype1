var $t=Object.defineProperty;var Dt=(H,t,i)=>t in H?$t(H,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):H[t]=i;var c=(H,t,i)=>Dt(H,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const l of e)if(l.type==="childList")for(const o of l.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function i(e){const l={};return e.integrity&&(l.integrity=e.integrity),e.referrerPolicy&&(l.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?l.credentials="include":e.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(e){if(e.ep)return;e.ep=!0;const l=i(e);fetch(e.href,l)}})();class ft{constructor(t={}){c(this,"z");c(this,"hasVerticalVelocity");c(this,"verticalVelocity");c(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const St=class St{constructor(t=20,i=14,s=1){c(this,"width");c(this,"height");c(this,"tileSize");c(this,"cols");c(this,"rows");c(this,"wallHeight");c(this,"gravity");c(this,"frictionCoeff");c(this,"staticFrictionThreshold");c(this,"tileGrid");c(this,"walls",[]);c(this,"currentPresetId","trenches");this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("trenches")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,i,s){if(t<0||t>=this.cols||i<0||i>=this.rows)return!1;const e=s?1:0;return this.tileGrid[i][t]===e?!1:(this.tileGrid[i][t]=e,this.rebuildWalls(),!0)}hasWall(t,i){return t<0||t>=this.cols||i<0||i>=this.rows?!1:this.tileGrid[i][t]===1}loadWallPreset(t,i){const s=St.WALL_PRESETS.find(e=>e.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(i),!0):!1}syncEntitiesWithWalls(t){var i;if(t)for(const s of t){const e=s.hasCollider?s.colliderRadius:((i=s.colliderModule)==null?void 0:i.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,e);if(l)s.position.z<l.wallHeight?(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new ft({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.standingWall=l,s.verticalVelocity=0):(s.standingWall=l,s.supportingSurfaceHeight=l.wallHeight);else if((s.supportingSurfaceHeight>=this.wallHeight-.05||s.standingWall!==null)&&(s.standingWall=null,s.supportingSurfaceHeight=0,s.isCharacter)){const o=s;o.climbingModule&&(o.climbingModule.isDismountFreefall=!0,o.climbingModule.climbSuppressedUntilRelease=!0)}}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("trenches",t)}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),o=Math.max(e.y,Math.min(i,e.y+e.height)),n=t-l,a=i-o;return n*n+a*a<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}areWallsContiguous(t,i){if(t.id===i.id)return!0;const s=Math.max(0,Math.max(t.x,i.x)-Math.min(t.x+t.width,i.x+i.width)),e=Math.max(0,Math.max(t.y,i.y)-Math.min(t.y+t.height,i.y+i.height)),l=Math.min(t.x+t.width,i.x+i.width)-Math.max(t.x,i.x),o=Math.min(t.y+t.height,i.y+i.height)-Math.max(t.y,i.y);return s<.001&&o>.05||e<.001&&l>.05}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}};c(St,"WALL_PRESETS",[{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>1));for(let e=2;e<=17;e++)s[3][e]=0,s[7][e]=0,s[10][e]=0;for(let e=2;e<=11;e++)s[e][5]=0,s[e][10]=0,s[e][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let e=5;e<=9;e++)s[e][2]=0;for(let e=5;e<=9;e++)s[e][17]=0;for(let e=2;e<=5;e++)s[5][e]=0;for(let e=10;e<=14;e++)s[5][e]=0;for(let e=5;e<=10;e++)s[9][e]=0;for(let e=14;e<=17;e++)s[9][e]=0;return s[7][5]=0,s}},{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=10;for(let l=1;l<=4;l++)s[l][e]=1;for(let l=8;l<=12;l++)s[l][e]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=2;e<=4;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=9;e<=11;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=6;e<=7;e++)for(let l=9;l<=10;l++)s[e][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,o]of e)s[o][l]=1,s[o+1][l]=1,s[o][l+1]=1,s[o+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=1;e<=9;e++)s[e][4]=1;for(let e=4;e<=12;e++)s[e][7]=1;for(let e=1;e<=9;e++)s[e][10]=1;for(let e=4;e<=12;e++)s[e][13]=1;for(let e=1;e<=9;e++)s[e][16]=1;for(let e=7;e<=10;e++)s[4][e]=1;for(let e=13;e<=16;e++)s[4][e]=1;for(let e=4;e<=7;e++)s[9][e]=1;for(let e=10;e<=13;e++)s[9][e]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,i)=>Array.from({length:i},()=>Array.from({length:t},()=>0))}]);let Q=St;class dt{constructor(t={}){c(this,"radius");c(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class ht{constructor(t={}){c(this,"mass");c(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class ut{constructor(t={}){c(this,"staticFrictionMod");c(this,"dynamicFrictionMod");c(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class yt{constructor(t={}){c(this,"bounceMod");c(this,"verticalBounce");c(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class mt{constructor(t={}){c(this,"enabled");this.enabled=t.enabled??!0}}class et{constructor(t={}){c(this,"id");c(this,"name");c(this,"position");c(this,"velocity");c(this,"color");c(this,"isHeld");c(this,"heldBy");c(this,"lastThrower",null);c(this,"isCharacter",!1);c(this,"isClimbing",!1);c(this,"visualShape","circle");c(this,"colliderModule",null);c(this,"massModule",null);c(this,"frictionModule",null);c(this,"bounceModule",null);c(this,"verticalPositionModule",null);c(this,"gravityModule",null);c(this,"rollModule",null);c(this,"supportingSurfaceHeight",0);c(this,"standingWall",null);var i,s,e,l,o;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((o=t.velocity)==null?void 0:o.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new dt({radius:t.colliderRadius}):new dt({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new ht({mass:t.mass}):new ht({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new ut({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new yt({bounceMod:t.bounceMod}):new yt({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new ft({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new mt,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new dt({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new ht({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new ut({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new ut({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new yt({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.85||this.supportingSurfaceHeight>=.85||this.standingWall!==null)}updatePosition(t,i){var b,k,g,S,m,P,E,D,T,O,A,B;if(this.isHeld)return;if(this.lastThrower){const C=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,y=(((b=this.lastThrower.pickupModule)==null?void 0:b.pickupReach)??1.3)+this.colliderRadius+C;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>y||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0;if(this.hasCollider&&this.hasVerticalPosition&&i.walls.length>0)if(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05&&this.position.z>=i.wallHeight-.2||this.standingWall!==null){const y=this.isCharacter?this:null;if(!!((k=y==null?void 0:y.climbingModule)!=null&&k.isDismountFreefall||(g=y==null?void 0:y.climbingModule)!=null&&g.climbSuppressedUntilRePress))this.standingWall=null,s=0;else if(this.isCharacter){if(this.standingWall){const x=i.walls.find(F=>F.id===this.standingWall.id),w=this.colliderRadius;if((x?i.testWallOverlap(this.position.x,this.position.y,w,x):!1)&&x)this.standingWall=x,s=x.wallHeight;else if(x&&((S=y==null?void 0:y.climbingModule)!=null&&S.dismountSuppressedUntilRelease))this.standingWall=x,s=x.wallHeight;else{let F=null;if(x){for(const R of i.walls)if(i.areWallsContiguous(x,R)&&i.testWallOverlap(this.position.x,this.position.y,w,R)){F=R;break}}else F=i.getSupportingWall(this.position.x,this.position.y,w);F?(this.standingWall=F,s=F.wallHeight):(this.standingWall=null,s=0,y!=null&&y.climbingModule&&(y.climbingModule.isDismountFreefall=!0,y.climbingModule.climbSuppressedUntilRelease=!0))}}else if(!this.isClimbing&&(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05)){const x=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);x&&(this.standingWall=x,s=x.wallHeight)}}else{const x=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);x?(this.standingWall=x,s=x.wallHeight):(this.standingWall=null,s=0)}}else this.standingWall=null;else this.standingWall=null,s=0;if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const C=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const y=this.rollModule,M=this.colliderRadius>0?this.colliderRadius:.3,x=.4,w=this.bounceMod,z=(1+w)*this.mass*C,F=i.frictionCoeff*this.dynamicGroundFrictionMod*.05,R=this.velocity.x-y.angularVelocity.y*M,$=this.velocity.y+y.angularVelocity.x*M,L=Math.hypot(R,$);if(L>.001&&F>0){const V=F*z,q=L*this.mass/(1+1/x),j=Math.min(q,V),I=R/L*j,X=$/L*j;this.velocity.x-=I/this.mass,this.velocity.y-=X/this.mass,y.angularVelocity.y+=I/(x*this.mass*M),y.angularVelocity.x-=X/(x*this.mass*M)}const W=Math.max(.65,1-(1-w)*.35);y.angularVelocity.x*=W,y.angularVelocity.y*=W,y.angularVelocity.z*=W}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((m=this.walkingModule)==null?void 0:m.enabled)))if(this.rollModule&&this.rollModule.enabled){const y=this.rollModule,M=this.colliderRadius>0?this.colliderRadius:.3,x=i.frictionCoeff*this.dynamicGroundFrictionMod,w=.4,z=this.velocity.x-y.angularVelocity.y*M,F=this.velocity.y+y.angularVelocity.x*M,R=Math.hypot(z,F);if(x>0&&R>.001){const L=x*(1+1/w)*t;if(R<=L){const W=this.velocity.x+w*y.angularVelocity.y*M,V=this.velocity.y-w*y.angularVelocity.x*M,q=W/(1+w),j=V/(1+w);this.velocity.x=q,this.velocity.y=j,y.angularVelocity.y=q/M,y.angularVelocity.x=-j/M}else{const W=z/R*x*t,V=F/R*x*t;this.velocity.x-=W,this.velocity.y-=V,y.angularVelocity.y+=W/(w*M),y.angularVelocity.x-=V/(w*M)}}const $=Math.hypot(this.velocity.x,this.velocity.y);if($>0){if(y.rollResistance>0){const L=y.rollResistance*t,W=Math.max(0,$-L);if(W<.005)this.velocity.x=0,this.velocity.y=0,y.angularVelocity.x=0,y.angularVelocity.y=0;else{const V=W/$;this.velocity.x*=V,this.velocity.y*=V,y.angularVelocity.x*=V,y.angularVelocity.y*=V}}}else{const L=Math.hypot(y.angularVelocity.x,y.angularVelocity.y);if(L>0&&x>0){const W=x/(w*M)*t,V=Math.max(0,L-W),q=L>0?V/L:0;y.angularVelocity.x*=q,y.angularVelocity.y*=q}}if(Math.abs(y.angularVelocity.z)>.001&&y.rollResistance>0){const L=y.rollResistance/(w*M)*t,W=Math.sign(y.angularVelocity.z),V=Math.abs(y.angularVelocity.z);y.angularVelocity.z=V<=L?0:W*(V-L)}y.updateVisualPhase(t)}else{const y=Math.hypot(this.velocity.x,this.velocity.y);if(y>0){const M=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(y<M)this.velocity.x=0,this.velocity.y=0;else{const x=i.frictionCoeff*this.dynamicGroundFrictionMod*t,z=Math.max(0,y-x)/y;this.velocity.x*=z,this.velocity.y*=z}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);const l=this.isCharacter?this:null,o=l==null?void 0:l.climbingModule,n=!this.isClimbing&&this.supportingSurfaceHeight>=i.wallHeight-.05&&this.standingWall!==null,a=Math.max(.01,(o==null?void 0:o.hangDistance)??.1);if(o)if(this.position.z<=.01)o.isAssistClampArmed=!1,o.hasLeftClampZoneSinceDismount=!0;else if(n&&this.standingWall){const C=this.standingWall,y=[C];for(const w of i.walls)w.id!==C.id&&i.areWallsContiguous(C,w)&&y.push(w);let M=1/0;for(const w of y){const z=Math.max(w.x,Math.min(this.position.x,w.x+w.width)),F=Math.max(w.y,Math.min(this.position.y,w.y+w.height)),R=Math.hypot(this.position.x-z,this.position.y-F);R<M&&(M=R)}M<=a+.001?l.isClimbInputHeld&&!o.dismountSuppressedUntilRelease?(o.isAssistClampArmed=!1,o.hasLeftClampZoneSinceDismount=!1):o.hasLeftClampZoneSinceDismount&&(o.isAssistClampArmed=!0):(o.hasLeftClampZoneSinceDismount=!0,o.isAssistClampArmed=!1)}else o.isAssistClampArmed=!1;const d=!!(l&&n&&(o!=null&&o.enabled)&&(o!=null&&o.preventWalkOff)&&(o!=null&&o.isAssistClampArmed)),r=this.velocity.x*t,h=this.velocity.y*t,v=Math.hypot(r,h);if(v>1e-4)if(d){const C=Math.max(.01,((P=l==null?void 0:l.climbingModule)==null?void 0:P.hangDistance)??.1);let y=this.standingWall??i.getSupportingWall(this.position.x,this.position.y,C);this.standingWall=y;const M=this.position.x+r,x=this.position.y+h,w=[];if(y){w.push(y);for(const F of i.walls)F.id!==y.id&&i.areWallsContiguous(y,F)&&w.push(F)}let z=null;for(const F of w)if(i.testWallOverlap(M,x,C,F)){z=F;break}if(z)this.position.x=M,this.position.y=x,this.standingWall=z;else if(w.length>0){let F=1/0,R=null;for(const $ of w){const L=Math.max($.x,Math.min(M,$.x+$.width)),W=Math.max($.y,Math.min(x,$.y+$.height)),V=M-L,q=x-W,j=V*V+q*q;j<F&&(F=j,R={wall:$,closestX:L,closestY:W,dist:Math.sqrt(j),dx:V,dy:q})}if(R&&R.dist>0){const $=R.dx/R.dist,L=R.dy/R.dist,W=this.velocity.x*$+this.velocity.y*L;W>0&&(this.velocity.x-=W*$,this.velocity.y-=W*L);const V=C-.002;R.dist>V?(this.position.x=R.closestX+$*V,this.position.y=R.closestY+L*V):(this.position.x=M,this.position.y=x);const q=i.testWallOverlap(this.position.x,this.position.y,C,R.wall)?R.wall:w.find(j=>i.testWallOverlap(this.position.x,this.position.y,C,j));q&&(this.standingWall=q)}else this.velocity.x=0,this.velocity.y=0}}else{const y=Math.max(1,Math.ceil(v/.01)),M=r/y,x=h/y;let w=this.standingWall??(n?i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null),z=!1;for(let F=1;F<=y;F++){const R=this.position.x+M,$=this.position.y+x;if(w){let W=null;if(i.testWallOverlap(R,$,this.colliderRadius,w))W=w;else for(const V of i.walls)if(i.areWallsContiguous(w,V)&&i.testWallOverlap(R,$,this.colliderRadius,V)){W=V;break}W?(w=W,this.standingWall=W):(E=l==null?void 0:l.climbingModule)!=null&&E.dismountSuppressedUntilRelease||(z=!0,w=null,this.standingWall=null,this.supportingSurfaceHeight=0,l!=null&&l.climbingModule&&(l.climbingModule.isDismountFreefall=!0,l.climbingModule.climbSuppressedUntilRelease=!0))}if(this.position.x=R,this.position.y=$,!this.isClimbing&&(z||!this.standingWall&&!!((D=l==null?void 0:l.climbingModule)!=null&&D.isDismountFreefall||(T=l==null?void 0:l.climbingModule)!=null&&T.climbSuppressedUntilRePress))&&this.hasCollider)for(const W of i.walls)this.position.z<=W.wallHeight&&this.resolveWallCollision(W)}}if(this.hasCollider){const C=this.colliderRadius,y=C,M=i.width-C,x=C,w=i.height-C,z=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<y?(this.position.x=y,this.resolveWallImpact(1,0,z)):this.position.x>M&&(this.position.x=M,this.resolveWallImpact(-1,0,z)),this.position.y<x?(this.position.y=x,this.resolveWallImpact(0,1,z)):this.position.y>w&&(this.position.y=w,this.resolveWallImpact(0,-1,z));const F=!!((O=l==null?void 0:l.climbingModule)!=null&&O.isDismountFreefall||(A=l==null?void 0:l.climbingModule)!=null&&A.climbSuppressedUntilRePress);for(const R of i.walls)if(this.position.z<=R.wallHeight){if(this.position.z>=R.wallHeight-.05&&!F&&(((B=this.standingWall)==null?void 0:B.id)===R.id||i.testWallOverlap(this.position.x,this.position.y,this.colliderRadius,R)))continue;if(this.position.z<R.wallHeight-.05||F||this.standingWall===null){if(this.standingWall&&(this.standingWall.id===R.id||i.areWallsContiguous(this.standingWall,R)))continue;this.resolveWallCollision(R)}}}const p=16,f=Math.hypot(this.velocity.x,this.velocity.y);if(f>p){const C=p/f;this.velocity.x*=C,this.velocity.y*=C}if(this.rollModule&&this.rollModule.enabled){const y=this.rollModule.angularSpeed;if(y>35){const M=35/y;this.rollModule.angularVelocity.x*=M,this.rollModule.angularVelocity.y*=M,this.rollModule.angularVelocity.z*=M}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}static getClosestWallPoint(t,i,s){if(!s.walls||s.walls.length===0)return null;let e=1/0,l=null;for(const o of s.walls){const n=Math.max(o.x,Math.min(t,o.x+o.width)),a=Math.max(o.y,Math.min(i,o.y+o.height)),d=t-n,r=i-a,h=d*d+r*r;h<e&&(e=h,l={wall:o,closestX:n,closestY:a,dist:Math.sqrt(h),dx:d,dy:r})}return l}resolveWallImpact(t,i,s){this.lastThrower=null;const e=this.velocity.x*t+this.velocity.y*i;if(e>=0)return;const l=e;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*i):(this.velocity.x-=l*t,this.velocity.y-=l*i),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const o=this.rollModule,n=this.colliderRadius>0?this.colliderRadius:.3,a=.4,d=.35,r=-i,h=t,v=this.velocity.x*r+this.velocity.y*h,p=-(1+s)*this.mass*l,f=v-o.angularVelocity.z*n,b=Math.abs(f)*this.mass/(1+1/a),k=d*p,g=Math.min(b,k),S=-Math.sign(f)*g,m=v,P=m+S/this.mass,E=Math.abs(P)<=Math.abs(m)+.01?P-m:-m*.1;this.velocity.x+=E*r,this.velocity.y+=E*h;const T=-(E*this.mass)/(a*this.mass*n);o.angularVelocity.z+=T,o.angularVelocity.z=Math.max(-30,Math.min(30,o.angularVelocity.z)),o.angularVelocity.y=this.velocity.x/n,o.angularVelocity.x=-this.velocity.y/n}}resolveWallCollision(t){if(!this.hasCollider)return;const i=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),e=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,o=this.position.y-e,n=l*l+o*o;if(n<i*i){this.lastThrower=null;const a=Math.sqrt(n);let d=0,r=0,h=0;if(a===0){const p=Math.abs(this.position.x-t.x),f=Math.abs(t.x+t.width-this.position.x),b=Math.abs(this.position.y-t.y),k=Math.abs(t.y+t.height-this.position.y),g=Math.min(p,f,b,k);g===p?(d=-1,h=p+i):g===f?(d=1,h=f+i):g===b?(r=-1,h=b+i):(r=1,h=k+i)}else h=i-a,d=l/a,r=o/a;this.position.x+=d*h,this.position.y+=r*h;const v=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(d,r,v)}}}class Rt{constructor(){c(this,"id","walking");c(this,"name","Walking Module");c(this,"enabled",!0);c(this,"maxWalkForce",35);c(this,"maxWalkSpeed",5.2);c(this,"dragDamping",8.01)}update(t,i,s,e){var O;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((O=t.frictionModule)!=null&&O.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(i.x,i.y),o=l>.05;if(t.isActivelyWalking=o,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const d=e.frictionCoeff/10,r=a*d,v=t.carriedMass/(Math.max(.1,t.strength)*8),p=this.maxWalkSpeed/(1+v);let f=0,b=0;if(o){const A=i.x/l,B=i.y/l;f=A*p,b=B*p}const k=f-t.velocity.x,g=b-t.velocity.y,S=Math.hypot(k,g);if(S<.001){t.velocity.x=f,t.velocity.y=b;return}const m=Math.hypot(t.velocity.x,t.velocity.y),P=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),E=t.hasMass?Math.max(.2,t.baseMass):1,T=this.maxWalkForce*t.strength/E*r*s;if(S<=T||!o&&m<P)t.velocity.x=f,t.velocity.y=b;else{const A=T/S;t.velocity.x+=k*A,t.velocity.y+=g*A}}}class Wt{constructor(){c(this,"id","pickup");c(this,"name","Pickup Ability");c(this,"enabled",!0);c(this,"pickupReach",1.3);c(this,"crossLayerReachRatio",.55)}isObjectInReach(t,i,s=1){var r;if(!this.enabled||i===t||i.isHeld||i.isCharacter||i.lastThrower===t)return!1;const e=t.position.z>=s-.05?1:0,l=i.position.z>=s-.05?1:0,n=e!==l?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,a=i.hasCollider?i.colliderRadius:((r=i.colliderModule)==null?void 0:r.radius)??.32;return Math.hypot(i.position.x-t.position.x,i.position.y-t.position.y)<=n+a}findTargetObject(t,i,s,e,l=1){if(!this.enabled)return null;let o=null,n=1/0;for(const a of e){if(!this.isObjectInReach(t,a,l))continue;const d=Math.hypot(a.position.x-i,a.position.y-s);d<n&&(n=d,o=a)}return o}pickup(t,i){if(!this.enabled||t.heldObject)return!1;const s=i.velocity.x,e=i.velocity.y,l=i.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=e*l,t.isAboveGround&&Math.abs(i.verticalVelocity)>.1&&(t.verticalVelocity+=i.verticalVelocity*l),t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=i.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const i=t.heldObject;if(t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.lastThrower=t,i.velocity.x=t.velocity.x,i.velocity.y=t.velocity.y,i.verticalVelocity=t.isAboveGround?t.verticalVelocity:0,i.hasFriction&&i.rollModule&&i.rollModule.enabled){const s=i.colliderRadius>0?i.colliderRadius:.3;i.rollModule.angularVelocity.y=i.velocity.x/s,i.rollModule.angularVelocity.x=-i.velocity.y/s}return i}}class Pt{constructor(){c(this,"id","throw");c(this,"name","Throw Ability");c(this,"enabled",!0);c(this,"baseThrowForce",7.6);c(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),o=Math.max(e.y,Math.min(i,e.y+e.height)),n=t-l,a=i-o;return n*n+a*a<s*s}computeLaunchVelocity(t,i,s,e,l,o,n,a=!0,d=!0,r=.35,h){const v=e-t,p=l-i,f=Math.hypot(v,p);if(f<.1)return null;const b=Math.min(f,this.maxThrowAimDistance),k=v/f,g=p/f,S=t+k*b,m=i+g*b,P=(h==null?void 0:h.x)??0,E=(h==null?void 0:h.y)??0,D=P*k+E*g,T=P*-g+E*k,O=Math.sqrt(Math.max(.25,n*n-T*T)),A=Math.max(1.5,D+O);if(!a||!d){const W=Math.max(.14,b/A),V=k*A,q=g*A;return{vx:V,vy:q,vz:0,totalTime:W,finalTargetX:S,finalTargetY:m,targetSurfaceHeight:s}}const B=o.getSupportingSurfaceHeight(S,m),C=B-s;let M=Math.max(.14,b/A);C>0&&(M=Math.max(M,Math.sqrt(2*C/o.gravity)));const x=40,w=r>0?r:.35,z=.25;for(let W=1;W<x;W++){const V=W/x,q=t+(S-t)*V,j=i+(m-i)*V;for(const I of o.walls)if(this.testWallIntersection(q,j,w,I)){if(B>0&&S>=I.x&&S<=I.x+I.width&&m>=I.y&&m<=I.y+I.height&&V>.65)continue;const u=(1-V)*s+V*B,U=I.wallHeight+z-u;if(U>0){const Y=o.gravity*V*(1-V);if(Y>.001){const Z=2*U/Y;if(Z>0){const N=Math.sqrt(Z);N>M&&(M=N)}}}}}if(M<=.05)return null;const F=(C+.5*o.gravity*M*M)/M,R=b/M,$=k*R,L=g*R;return{vx:$,vy:L,vz:F,totalTime:M,finalTargetX:S,finalTargetY:m,targetSurfaceHeight:B}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,n=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,r=l.hasGravity&&l.hasVerticalVelocity,h={x:t.velocity.x,y:t.velocity.y,z:t.isAboveGround?t.verticalVelocity:0},v=this.computeLaunchVelocity(o,n,a,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius,h);if(!v)return null;const{vx:p,vy:f,vz:b,totalTime:k,finalTargetX:g,finalTargetY:S,targetSurfaceHeight:m}=v,P=90,E=k/P,D=[];let T=!1,O=m>0,A,B=a;for(let y=0;y<=P;y++){const M=y*E,x=y===P?g:o+p*M,w=y===P?S:n+f*M,z=r?a+b*M-.5*e.gravity*M*M:a,F=r?y===P?m:Math.max(m,z):a,R=r?b-e.gravity*M:0;F>B&&(B=F);const $=F>e.wallHeight;let L=!1,W=!1;for(const V of e.walls)if(this.testWallIntersection(x,w,l.colliderRadius,V)&&(L=!0,F<=V.wallHeight+.001)){if(D.length>0&&D[D.length-1].z>=V.wallHeight-.05&&R<=0){if(m>0&&(y>=P-2||Math.hypot(x-g,w-S)<.2)){O=!0;break}else if(m===0){O=!0,W=!0,T=!0,A=V.id;break}}else if(F<V.wallHeight-.05){W=!0,T=!0,A=V.id;break}}if(D.push({x,y:w,z:F,t:M,couldClearWall:$,isOverWall:L,collidesWall:W}),W)break}const C=D[D.length-1];return{points:D,landPoint:{x:T?C.x:g,y:T?C.y:S},isBlockedByWall:T,isLandingOnWallTop:T?O:m>0,blockedAtWallId:A,peakHeight:B,flightTime:k}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,n=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,r={x:t.velocity.x,y:t.velocity.y,z:t.isAboveGround?t.verticalVelocity:0},h=this.computeLaunchVelocity(o,n,a,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius,r);if(!h)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=h.vx,l.velocity.y=h.vy,l.verticalVelocity=h.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const g=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=h.vx/g,l.rollModule.angularVelocity.x=-h.vy/g}const v=l.hasMass?l.mass:0,p=t.hasMass?Math.max(.2,t.baseMass):0,f=v>0&&p>0?v/p:0;t.heldObject=null;const b=h.vx-t.velocity.x,k=h.vy-t.velocity.y;if(t.velocity.x-=b*f,t.velocity.y-=k*f,t.isAboveGround&&l.hasVerticalVelocity){const g=h.vz-t.verticalVelocity;t.verticalVelocity-=g*f}return l}}class Ft{constructor(t){c(this,"id","climbing");c(this,"name","Climbing Module");c(this,"enabled",!0);c(this,"maxAdhesion",35);c(this,"maxClimbSpeed",3);c(this,"preventWalkOff",!0);c(this,"horizontalClimb",!1);c(this,"hangDistance",.1);c(this,"dismountSuppressedUntilRelease",!1);c(this,"climbSuppressedUntilRelease",!1);c(this,"isDismountFreefall",!1);c(this,"isAssistClampArmed",!1);c(this,"hasLeftClampZoneSinceDismount",!0);c(this,"wasClimbHeldLastTick",!1);(t==null?void 0:t.maxAdhesion)!==void 0&&(this.maxAdhesion=t.maxAdhesion),(t==null?void 0:t.maxClimbSpeed)!==void 0&&(this.maxClimbSpeed=t.maxClimbSpeed),(t==null?void 0:t.preventWalkOff)!==void 0&&(this.preventWalkOff=t.preventWalkOff),(t==null?void 0:t.horizontalClimb)!==void 0&&(this.horizontalClimb=t.horizontalClimb),(t==null?void 0:t.hangDistance)!==void 0&&(this.hangDistance=t.hangDistance)}get climbSuppressedUntilRePress(){return this.isDismountFreefall||this.climbSuppressedUntilRelease}set climbSuppressedUntilRePress(t){this.isDismountFreefall=t,this.climbSuppressedUntilRelease=t}update(t,i,s,e,l){const o=s&&!this.wasClimbHeldLastTick;if(this.wasClimbHeldLastTick=s,s||(this.dismountSuppressedUntilRelease=!1,this.climbSuppressedUntilRelease=!1),(t.position.z<=.01||o)&&(this.isDismountFreefall=!1,t.position.z<=.01&&(this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)),this.climbSuppressedUntilRelease||!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const n=t.hasCollider?t.colliderRadius:.44,a=Math.hypot(i.x,i.y),d=a>=.05,r=d?i.x/a:0,h=d?i.y/a:0;if(!t.isClimbing&&(t.standingWall!==null||t.position.z>=l.wallHeight))return t.isClimbing=!1,!1;let v=null,p=1/0,f=0,b=0,k=0;for(const E of l.walls){const D=Math.max(E.x,Math.min(t.position.x,E.x+E.width)),T=Math.max(E.y,Math.min(t.position.y,E.y+E.height)),O=D-t.position.x,A=T-t.position.y,B=Math.hypot(O,A);B<=n+.15&&B<p&&(p=B,v=E,f=d?r*O+h*A:0,b=O,k=A)}if(!v)return t.isClimbing=!1,!1;const g=t.mass;if(g*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;const m=t.isClimbing;if(m&&t.position.z<v.wallHeight){const E=p>.001?b/p:0,D=p>.001?k/p:0,T=-D,O=E,A=d?r*E+h*D:0,B=d?r*T+h*O:0;if(d&&(A<-.3||!this.horizontalClimb&&f<-.1))return t.isClimbing=!1,t.velocity.x=r*3,t.velocity.y=h*3,s&&(this.climbSuppressedUntilRelease=!0),!1;if(t.isClimbing=!0,t.verticalVelocity=0,t.standingWall=null,this.horizontalClimb&&d&&Math.abs(B)>=.1){const C=t.baseMass,y=Math.max(.5,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*C*t.strength/Math.max(.1,g)));t.velocity.x=T*B*y,t.velocity.y=O*B*y}else t.velocity.x=0,t.velocity.y=0;if(s){const C=t.baseMass,y=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*C*t.strength/Math.max(.1,g)));t.position.z+=y*e,t.position.z>=v.wallHeight&&(t.position.z=v.wallHeight,t.supportingSurfaceHeight=v.wallHeight,t.standingWall=v,t.verticalVelocity=0,t.isClimbing=!1,this.dismountSuppressedUntilRelease=!0,this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)}return!0}if(!m&&t.position.z>.05&&t.position.z<v.wallHeight)return o?(t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0,!0):(t.isClimbing=!1,!1);if(s&&d&&f>.01&&p<=n+.03&&t.position.z<v.wallHeight){if(p>.001){const T=b/p,O=k/p;t.position.x=t.position.x+b-T*n,t.position.y=t.position.y+k-O*n}t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const E=t.baseMass,D=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*E*t.strength/Math.max(.1,g)));return t.position.z+=D*e,!0}return t.isClimbing=!1,!1}}class wt{constructor(t={}){c(this,"id","strength");c(this,"name","Strength Module");c(this,"enabled",!0);c(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class xt extends et{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});c(this,"strengthModule");c(this,"facingAngle");c(this,"heldObject");c(this,"isCharacter",!0);c(this,"isActivelyWalking",!1);c(this,"isClimbInputHeld",!1);c(this,"baseMass",1.2);c(this,"walkingModule");c(this,"pickupModule");c(this,"throwModule");c(this,"climbingModule");c(this,"isAiming");c(this,"aimTarget");c(this,"activeTrajectory");this.baseMass=i.mass??1.2,this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new wt({strength:i.strength??1}),this.walkingModule=new Rt,this.pickupModule=new Wt,this.throwModule=new Pt,this.climbingModule=new Ft}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(i){this.strengthModule?this.strengthModule.strength=Math.max(.1,i):this.strengthModule=new wt({strength:i})}get mass(){const i=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return i+s}set mass(i){this.baseMass=Math.max(.1,i),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}get hangDistance(){return this.climbingModule?this.climbingModule.hangDistance:.1}set hangDistance(i){this.climbingModule&&(this.climbingModule.hangDistance=Math.max(0,i))}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,o=s.y-this.position.y;if(Math.hypot(l,o)>.1){this.facingAngle=Math.atan2(o,l);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,l,o,n=!1){if(this.isClimbInputHeld=n,this.climbingModule&&this.climbingModule.update(this,s,n,i,o),this.walkingModule&&this.walkingModule.update(this,s,i,o),this.updatePosition(i,o),this.updateFacingDirection(e,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,o):this.activeTrajectory=null}}class Mt{constructor(t={}){c(this,"enabled",!0);c(this,"angularVelocity",{x:0,y:0,z:0});c(this,"rollResistance",.4);c(this,"visualPhase",0);var i,s,e;this.enabled=t.enabled??!0,this.angularVelocity={x:((i=t.angularVelocity)==null?void 0:i.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((e=t.angularVelocity)==null?void 0:e.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const i=this.angularSpeed;i>.001&&(this.visualPhase=(this.visualPhase+i*t)%(Math.PI*2))}}class rt{constructor(t){c(this,"ctx");this.ctx=t}render(t,i,s,e,l=!1,o,n,a=!1,d){const r=this.ctx,h=r.canvas.width/t.width;r.clearRect(0,0,r.canvas.width,r.canvas.height),this.drawFloorGrid(t,h),this.drawWalls(t,h),a&&d&&this.drawWallEditorHover(t,d,h);const v=[i,...s];v.sort((p,f)=>Math.abs(p.position.z-f.position.z)>.001?p.position.z-f.position.z:Math.abs(p.verticalVelocity-f.verticalVelocity)>.001?p.verticalVelocity-f.verticalVelocity:p.position.y-f.position.y);for(const p of v)p instanceof xt?this.drawCharacter(p,h,t):this.drawFreebodyObject(p,i,h,p===n,t),this.drawObjectShadow(p,h);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,h,t),l&&(o&&o!==e&&this.drawHoverGizmo(o,h),e&&this.drawSelectionGizmo(e,l,h))}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawWallEditorHover(t,i,s){if(i.col<0||i.col>=t.cols||i.row<0||i.row>=t.rows)return;const e=this.ctx,l=i.col*t.tileSize*s,o=i.row*t.tileSize*s,n=t.tileSize*s,a=t.hasWall(i.col,i.row);e.save(),a?(e.fillStyle="rgba(239, 68, 68, 0.35)",e.strokeStyle="#ef4444",e.lineWidth=2.5,e.fillRect(l,o,n,n),e.strokeRect(l,o,n,n),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#fca5a5",e.textAlign="center",e.textBaseline="middle",e.fillText("✕ Erase",l+n/2,o+n/2)):(e.fillStyle="rgba(56, 189, 248, 0.3)",e.strokeStyle="#38bdf8",e.lineWidth=2.5,e.fillRect(l,o,n,n),e.strokeRect(l,o,n,n),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#7dd3fc",e.textAlign="center",e.textBaseline="middle",e.fillText("+ Draw",l+n/2,o+n/2)),e.restore()}static getAltitudeScale(t,i){return 1+Math.max(0,t)/Math.max(.1,i)*.5}static isEntityOnLayer2(t,i){const s=i-.05;return t.position.z>=s||t.supportingSurfaceHeight>=s||t.standingWall!==null||t.isAboveWalls}drawObjectShadow(t,i){if(t.position.z<=.01)return;const e=this.ctx,l=t.position.x*i,o=t.position.y*i,n=t.colliderRadius*i;if(e.save(),e.beginPath(),t.visualShape==="box"){const a=n*2,d=Math.max(3,n*.16);e.roundRect?e.roundRect(l-n,o-n,a,a,d):e.rect(l-n,o-n,a,a)}else e.arc(l,o,n,0,Math.PI*2);e.strokeStyle="rgba(255, 255, 255, 0.85)",e.lineWidth=1.8,e.setLineDash([4,4]),e.stroke(),e.restore()}drawFreebodyObject(t,i,s,e=!1,l){var b,k;const o=this.ctx,n=t.position.x*s,a=t.position.y*s,d=rt.getAltitudeScale(t.position.z,l.wallHeight),h=(t.hasCollider?t.colliderRadius:((b=t.colliderModule)==null?void 0:b.radius)??.32)*s*d,p=!i.heldObject&&i.pickupModule!==null&&i.pickupModule.enabled&&!t.isHeld&&(((k=i.pickupModule)==null?void 0:k.isObjectInReach(i,t,l.wallHeight))??!1);if(p){if(o.save(),o.beginPath(),t.visualShape==="box"){const g=(h+5)*2;o.roundRect?o.roundRect(n-h-5,a-h-5,g,g,6):o.rect(n-h-5,a-h-5,g,g)}else o.arc(n,a,h+5,0,Math.PI*2);e?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",n,a-h-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}const f=rt.isEntityOnLayer2(t,l.wallHeight);if(o.save(),o.globalAlpha=f?.55:1,t.visualShape==="box"){const g=h*2,S=Math.max(3,h*.16),m=n-h,P=a-h;o.beginPath(),o.roundRect?o.roundRect(m,P,g,g,S):o.rect(m,P,g,g),o.fillStyle=t.color,o.fill(),o.strokeStyle=p?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=p?2.5:2,o.stroke();const E=Math.max(3,h*.22);o.beginPath(),o.roundRect?o.roundRect(m+E,P+E,g-E*2,g-E*2,S*.7):o.rect(m+E,P+E,g-E*2,g-E*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(m+E,P+E),o.lineTo(m+g-E,P+g-E),o.moveTo(m+g-E,P+E),o.lineTo(m+E,P+g-E),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(n,a,h,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=p?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=p?2.5:2,o.stroke();this.drawRollIndicator(t,n,a,h),o.restore()}drawCharacter(t,i,s){const e=this.ctx,l=t.position.x*i,o=t.position.y*i,n=rt.getAltitudeScale(t.position.z,s.wallHeight),a=t.colliderRadius*i*n,d=rt.isEntityOnLayer2(t,s.wallHeight);e.save(),e.globalAlpha=d?.55:1,e.beginPath(),e.arc(l,o,a,0,Math.PI*2),e.fillStyle=t.color,e.fill(),e.strokeStyle="#ffffff",e.lineWidth=2.5,e.stroke(),this.drawRollIndicator(t,l,o,a);const r=.52,h=a*.72,v=Math.max(3.5,a*.18),p=t.facingAngle-r,f=t.facingAngle+r,b=l+Math.cos(p)*h,k=o+Math.sin(p)*h,g=l+Math.cos(f)*h,S=o+Math.sin(f)*h;e.fillStyle="#000000",e.beginPath(),e.arc(b,k,v,0,Math.PI*2),e.arc(g,S,v,0,Math.PI*2),e.fill(),t.heldObject&&(e.strokeStyle="rgba(255, 255, 255, 0.6)",e.setLineDash([3,3]),e.lineWidth=1.5,e.beginPath(),e.moveTo(l,o),e.lineTo(t.heldObject.position.x*i,t.heldObject.position.y*i),e.stroke(),e.setLineDash([])),e.restore()}drawRollIndicator(t,i,s,e){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,o=l.angularVelocity.x,n=l.angularVelocity.y,a=l.angularVelocity.z,d=Math.hypot(o,n,a);if(d<.02)return;const r=this.ctx,v=Math.hypot(o,n)<.05*d,p=2.5,f=5,b=4;if(r.save(),r.shadowColor="rgba(0, 0, 0, 0.75)",r.shadowBlur=3,v){const k=e*.5,g=e*.88;r.beginPath(),r.arc(i,s,k,0,Math.PI*2),r.strokeStyle="rgba(255, 255, 255, 0.5)",r.lineWidth=1.8,r.setLineDash([]),r.stroke(),r.beginPath(),r.arc(i,s,g,0,Math.PI*2),r.strokeStyle="rgba(255, 255, 255, 0.98)",r.lineWidth=p,r.setLineDash([f,b]),r.lineDashOffset=-l.visualPhase*g*Math.sign(a||1),r.stroke()}else{const k=Math.atan2(-o,n),g=e*.9,S=Math.abs(a)/d,m=g*Math.max(.35,Math.pow(S,.65));r.translate(i,s),r.rotate(k);const P=a!==0?Math.sign(a):1;r.beginPath(),r.ellipse(0,0,g,m,0,0,Math.PI),r.strokeStyle="rgba(255, 255, 255, 0.98)",r.lineWidth=p,r.setLineDash([f,b]),r.lineDashOffset=-l.visualPhase*g*P,r.stroke(),r.beginPath(),r.ellipse(0,0,g,m,0,Math.PI,Math.PI*2),r.strokeStyle="rgba(255, 255, 255, 0.35)",r.lineWidth=1.8,r.setLineDash([f,b]),r.lineDashOffset=-l.visualPhase*g*P,r.stroke()}r.restore()}drawTrajectory(t,i,s){const e=this.ctx,l=t.points;if(l.length<2)return;e.save(),e.shadowColor="rgba(0, 0, 0, 0.6)",e.shadowBlur=3;const o=.38;let n=0,a=o*.5;const d=Math.max(2.2,.048*i),r=s.wallHeight-.05;for(let v=0;v<l.length-1;v++){const p=l[v],f=l[v+1],b=f.x-p.x,k=f.y-p.y,g=f.z-p.z,S=Math.hypot(b,k,g);if(!(S<=1e-4)){for(;n+S>=a;){const m=(a-n)/S,P=p.x+b*m,E=p.y+k*m,D=p.z+g*m,T=Math.max(0,D)/Math.max(.1,s.wallHeight),O=d*(1+T*.75),A=D>=r;e.fillStyle=A?"rgba(255, 255, 255, 0.38)":"rgba(255, 255, 255, 0.95)",e.beginPath(),e.arc(P*i,E*i,O,0,Math.PI*2),e.fill(),a+=o}n+=S}}e.shadowBlur=0;const h=l[l.length-1];if(t.isBlockedByWall){e.strokeStyle="#ef4444",e.lineWidth=3,e.setLineDash([]);const v=8;e.beginPath(),e.moveTo(h.x*i-v,h.y*i-v),e.lineTo(h.x*i+v,h.y*i+v),e.moveTo(h.x*i+v,h.y*i-v),e.lineTo(h.x*i-v,h.y*i+v),e.stroke()}else t.isLandingOnWallTop?(e.strokeStyle="rgba(56, 189, 248, 0.65)",e.fillStyle="rgba(56, 189, 248, 0.25)",e.lineWidth=2.5,e.setLineDash([]),e.beginPath(),e.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),e.fill(),e.stroke(),e.beginPath(),e.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),e.fillStyle="rgba(56, 189, 248, 0.75)",e.fill()):(e.strokeStyle="#22c55e",e.fillStyle="rgba(34, 197, 94, 0.25)",e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),e.fill(),e.stroke(),e.beginPath(),e.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),e.fillStyle="#22c55e",e.fill());e.restore()}drawHoverGizmo(t,i){var a;const s=this.ctx,e=t.position.x*i,l=t.position.y*i,n=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*i;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(e,l,n,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,i,s){var v;const e=this.ctx,l=t.position.x*s,o=t.position.y*s,d=(t.hasCollider?t.colliderRadius:((v=t.colliderModule)==null?void 0:v.radius)??.32)*s+6,r=Math.max(6,d*.4),h=i?"#fbbf24":"#38bdf8";if(e.save(),e.strokeStyle=h,e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.moveTo(l-d,o-d+r),e.lineTo(l-d,o-d),e.lineTo(l-d+r,o-d),e.stroke(),e.beginPath(),e.moveTo(l+d-r,o-d),e.lineTo(l+d,o-d),e.lineTo(l+d,o-d+r),e.stroke(),e.beginPath(),e.moveTo(l+d,o+d-r),e.lineTo(l+d,o+d),e.lineTo(l+d-r,o+d),e.stroke(),e.beginPath(),e.moveTo(l-d+r,o+d),e.lineTo(l-d,o+d),e.lineTo(l-d,o+d-r),e.stroke(),i){const p=`${t.name} (${t.mass.toFixed(1)}kg)`;e.font="bold 10px 'Segoe UI', system-ui, sans-serif";const b=e.measureText(p).width+12,k=16,g=l-b/2,S=o-d-k-4;e.fillStyle="rgba(15, 23, 42, 0.85)",e.strokeStyle=h,e.lineWidth=1,e.beginPath(),e.roundRect(g,S,b,k,4),e.fill(),e.stroke(),e.fillStyle=h,e.textAlign="center",e.textBaseline="middle",e.fillText(p,l,S+k/2)}e.restore()}}class At{constructor(t,i){c(this,"canvas");c(this,"arena");c(this,"keysPressed",new Set);c(this,"mousePos",{x:0,y:0});c(this,"isMouseDown",!1);c(this,"isRightMouseDown",!1);c(this,"hoverWallTile",null);c(this,"movementVector",{x:0,y:0});c(this,"justPickedUp",!1);c(this,"isThrowingPress",!1);c(this,"hoverEntity",null);c(this,"selectedCanvasEntity",null);c(this,"draggedEntity",null);c(this,"dragOffset",{x:0,y:0});c(this,"handleClick");c(this,"onMouseDown");c(this,"onRightMouseDown");c(this,"onMouseUp");c(this,"onRightClick");c(this,"onDropAttempt");c(this,"onMouseMove");this.canvas=t,this.arena=i,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){e&&(this.selectedCanvasEntity=e.selectedEntity);const l=(a,d,r=.35)=>{var p;for(let f=s.length-1;f>=0;f--){const b=s[f],k=b.hasCollider?b.colliderRadius:((p=b.colliderModule)==null?void 0:p.radius)??.32;if(Math.hypot(b.position.x-a,b.position.y-d)<=k+r)return b}const h=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-d)<=h+r?t:null},o=(a,d)=>{if(a<0||a>=i.cols||d<0||d>=i.rows)return;if(i.setWallTile(a,d,!0)){const h=[t,...s];i.syncEntitiesWithWalls(h),i.currentPresetId="custom",e==null||e.updateWallPresetUI()}},n=(a,d)=>{if(!(a<0||a>=i.cols||d<0||d>=i.rows)&&i.tileGrid[d][a]===1){i.setWallTile(a,d,!1);const r=[t,...s];i.syncEntitiesWithWalls(r),i.currentPresetId="custom",e==null||e.updateWallPresetUI()}};this.onMouseDown=(a,d)=>{if(e!=null&&e.isEditMode){if(e.editTool==="walls"){const h=Math.floor(a/i.tileSize),v=Math.floor(d/i.tileSize);o(h,v);return}const r=l(a,d,.35);r?(this.selectedCanvasEntity=r,e.setSelectedEntity(r),this.draggedEntity=r,this.dragOffset.x=r.position.x-a,this.dragOffset.y=r.position.y-d,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"){const r=Math.floor(a/i.tileSize),h=Math.floor(d/i.tileSize);n(r,h)}},this.onMouseMove=(a,d)=>{var v;const r=Math.floor(a/i.tileSize),h=Math.floor(d/i.tileSize);if(r>=0&&r<i.cols&&h>=0&&h<i.rows?this.hoverWallTile={col:r,row:h}:this.hoverWallTile=null,e!=null&&e.isEditMode){if(e.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?o(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&n(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const p=a+this.dragOffset.x,f=d+this.dragOffset.y,b=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((v=this.draggedEntity.colliderModule)==null?void 0:v.radius)??.32;this.draggedEntity.position.x=Math.max(b,Math.min(i.width-b,p)),this.draggedEntity.position.y=Math.max(b,Math.min(i.height-b,f)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const p=l(a,d,.3);this.hoverEntity=p,this.canvas.style.cursor=p?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,d)=>{if(this.draggedEntity&&(i.syncEntitiesWithWalls([this.draggedEntity]),this.draggedEntity=null),e!=null&&e.isEditMode)if(e.editTool==="walls")this.canvas.style.cursor="cell";else{const r=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=r,this.canvas.style.cursor=r?"grab":"crosshair"}},this.handleClick=(a,d)=>{if(!(e!=null&&e.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,d,i),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const r=t.pickupModule.findTargetObject(t,a,d,s,i.wallHeight);r&&(t.pickupModule.pickup(t,r),this.justPickedUp=!0)}}},this.onRightClick=(a,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"||!e)return;const r=l(a,d,.4);r&&(this.selectedCanvasEntity=r,e.setSelectedEntity(r))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,i.wallHeight);a&&t.pickupModule.pickup(t,a)}}}}class Bt{constructor(t){c(this,"container");c(this,"character");c(this,"arena");c(this,"objects");c(this,"onSpawnObject");c(this,"onDeleteObject");c(this,"onClearObjects");c(this,"selectedEntity");c(this,"isEditMode",!1);c(this,"editTool","entities");c(this,"onSelectionChange");c(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});c(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});c(this,"inspectorEl");c(this,"entitySelectorEl");c(this,"characterSpecificControlsEl");c(this,"objectSpecificControlsEl");c(this,"modePlayBtn");c(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var i;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(i=this.onSelectionChange)==null||i.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const i=this.container.querySelector("#edit-submode-container");i&&(i.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const i=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");i&&s&&(i.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const i=this.container.querySelector("#edit-hint-label");i&&(this.isEditMode?this.editTool==="walls"?i.textContent="Left-drag: Draw | Right-drag: Erase":i.textContent="Click & drag object in arena":i.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const e of this.objects){const l=e.id===t?"selected":"",o=e.visualShape==="box"?"📦":"⚪",n=e.hasMass?`${e.mass.toFixed(1)}kg`:"Massless";i+=`<option value="${e.id}" ${l}>${o} ${e.name} (${n})</option>`}this.entitySelectorEl.innerHTML=i;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,i,s,e,l,o,n,a,d,r,h,v,p,f,b,k,g,S,m,P,E,D,T,O,A,B,C,y,M,x,w,z,F,R,$,L,W,V,q,j,I,X,u,G,U,Y,Z,N,gt,it,st,pt,lt,ot,vt,at,nt,bt,ct,tt,K,_,J,kt,Et,Vt,Ct;this.container.innerHTML=`
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
                <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${((r=this.selectedEntity.frictionModule)==null?void 0:r.staticFrictionMod)??1}">
              </div>
              <div class="slider-group">
                <div class="slider-label">
                  <span>Dynamic Friction Mod</span>
                  <span id="val-entity-dynamic-fric">${(((h=this.selectedEntity.frictionModule)==null?void 0:h.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((v=this.selectedEntity.frictionModule)==null?void 0:v.dynamicFrictionMod)??1}">
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
                ${(b=this.selectedEntity.bounceModule)!=null&&b.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((k=this.selectedEntity.bounceModule)!=null&&k.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(g=this.selectedEntity.bounceModule)!=null&&g.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((S=this.selectedEntity.bounceModule)==null?void 0:S.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((m=this.selectedEntity.bounceModule)==null?void 0:m.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(P=this.selectedEntity.bounceModule)!=null&&P.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(E=this.selectedEntity.bounceModule)!=null&&E.enabled&&((D=this.selectedEntity.bounceModule)!=null&&D.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
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
                ${(A=this.selectedEntity.rollModule)!=null&&A.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(B=this.selectedEntity.rollModule)!=null&&B.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
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
                  ${(w=this.character.walkingModule)!=null&&w.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((z=this.character.walkingModule)!=null&&z.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&((F=this.character.walkingModule)!=null&&F.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(R=this.character.walkingModule)!=null&&R.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${((($=this.character.walkingModule)==null?void 0:$.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((L=this.character.walkingModule)==null?void 0:L.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((W=this.character.walkingModule)==null?void 0:W.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((V=this.character.walkingModule)==null?void 0:V.maxWalkSpeed)??5.2}">
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
                  ${(u=this.character.pickupModule)!=null&&u.enabled?"Attached":"Detached"}
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var L,W,V,q,j,I,X;const t=this.selectedEntity,i=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=i?"none":"flex");const e=this.container.querySelector("#toggle-entity-shape");e&&(t.visualShape==="box"?(e.textContent="Box 📦",e.classList.add("active")):(e.textContent="Circle ⚪",e.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),o=this.container.querySelector("#group-mod-collider"),n=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),n&&(n.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((L=t.colliderModule)==null?void 0:L.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),d=this.container.querySelector("#group-mod-mass"),r=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),r&&(r.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((W=t.massModule)==null?void 0:W.mass)??1,1);const h=this.container.querySelector("#toggle-mod-friction"),v=this.container.querySelector("#group-mod-friction"),p=this.container.querySelector("#note-mod-friction"),f=this.container.querySelector("#warn-friction-mass"),b=!!(t.frictionModule&&t.frictionModule.enabled);h&&(h.textContent=b?"Attached":"Detached",h.classList.toggle("active",b)),v&&(v.style.display=b?"flex":"none"),p&&(p.style.display=b?"none":"block"),f&&(f.style.display=!t.hasMass&&b?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((V=t.frictionModule)==null?void 0:V.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((q=t.frictionModule)==null?void 0:q.dynamicFrictionMod)??1,2);const k=this.container.querySelector("#toggle-mod-bounce"),g=this.container.querySelector("#group-mod-bounce"),S=this.container.querySelector("#note-mod-bounce"),m=this.container.querySelector("#warn-bounce-mass"),P=!!(t.bounceModule&&t.bounceModule.enabled);k&&(k.textContent=P?"Attached":"Detached",k.classList.toggle("active",P)),g&&(g.style.display=P?"block":"none"),S&&(S.style.display=P?"none":"block"),m&&(m.style.display=!t.hasMass&&P?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const E=this.container.querySelector("#check-mod-vert-bounce"),D=this.container.querySelector("#warn-bounce-vert-vel");if(E&&(E.checked=!!((I=t.bounceModule)!=null&&I.verticalBounce)),D){const u=!!(P&&((X=t.bounceModule)!=null&&X.verticalBounce)&&!t.hasVerticalVelocity);D.style.display=u?"block":"none"}const T=this.container.querySelector("#toggle-mod-vert-pos"),O=this.container.querySelector("#group-mod-vert-pos"),A=this.container.querySelector("#note-mod-vert-pos"),B=t.hasVerticalPosition;T&&(T.textContent=B?"Attached":"Detached",T.classList.toggle("active",B)),O&&(O.style.display=B?"block":"none"),A&&(A.style.display=B?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const C=this.container.querySelector("#toggle-mod-vert-vel"),y=this.container.querySelector("#group-mod-vert-vel"),M=t.hasVerticalVelocity;C&&(C.textContent=M?"Enabled":"Disabled",C.classList.toggle("active",M)),y&&(y.style.display=M?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const x=this.container.querySelector("#toggle-mod-gravity"),w=this.container.querySelector("#note-mod-gravity");x&&(x.textContent=t.hasGravity?"Attached":"Detached",x.classList.toggle("active",t.hasGravity)),w&&(w.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const z=this.container.querySelector("#toggle-mod-roll"),F=this.container.querySelector("#group-mod-roll"),R=this.container.querySelector("#note-roll-friction"),$=!!(t.rollModule&&t.rollModule.enabled);if(z&&(z.textContent=$?"Attached":"Detached",z.classList.toggle("active",$)),F&&(F.style.display=$?"block":"none"),R&&(R.style.display=$&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),i){const u=this.container.querySelector("#toggle-walk"),G=this.container.querySelector("#group-mod-walking"),U=this.container.querySelector("#warn-walk-friction"),Y=this.container.querySelector("#warn-walk-strength"),Z=!!(this.character.walkingModule&&this.character.walkingModule.enabled);u&&(u.textContent=Z?"Attached":"Detached",u.classList.toggle("active",Z)),G&&(G.style.display=Z?"flex":"none"),U&&(U.style.display=Z&&!this.character.hasFriction?"block":"none"),Y&&(Y.style.display=Z&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const N=this.container.querySelector("#toggle-strength"),gt=this.container.querySelector("#group-mod-strength"),it=!!(this.character.strengthModule&&this.character.strengthModule.enabled);N&&(N.textContent=it?"Attached":"Detached",N.classList.toggle("active",it)),gt&&(gt.style.display=it?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const st=this.container.querySelector("#toggle-pickup"),pt=this.container.querySelector("#group-mod-pickup"),lt=!!(this.character.pickupModule&&this.character.pickupModule.enabled);st&&(st.textContent=lt?"Attached":"Detached",st.classList.toggle("active",lt)),pt&&(pt.style.display=lt?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const ot=this.container.querySelector("#toggle-throw"),vt=this.container.querySelector("#group-mod-throw"),at=!!(this.character.throwModule&&this.character.throwModule.enabled);ot&&(ot.textContent=at?"Attached":"Detached",ot.classList.toggle("active",at)),vt&&(vt.style.display=at?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const nt=this.container.querySelector("#toggle-climb"),bt=this.container.querySelector("#group-mod-climb"),ct=this.container.querySelector("#warn-climb-deps"),tt=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(nt&&(nt.textContent=tt?"Attached":"Detached",nt.classList.toggle("active",tt)),bt&&(bt.style.display=tt?"block":"none"),ct){const K=!this.character.hasVerticalPosition,_=!this.character.hasStrength;ct.style.display=tt&&(K||_)?"block":"none",ct.textContent=K?"⚠️ Requires Vertical Position (3D Z-axis)":_?"⚠️ Requires Strength Ability to climb":""}if(this.character.climbingModule){const K=this.container.querySelector("#toggle-climb-walkoff");if(K){const J=!!this.character.climbingModule.preventWalkOff;K.textContent=J?"Active":"Inactive",K.classList.toggle("active",J)}const _=this.container.querySelector("#toggle-climb-sideways");if(_){const J=!!this.character.climbingModule.horizontalClimb;_.textContent=J?"Active":"Inactive",_.classList.toggle("active",J)}this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1),this.setSliderVal("slide-climb-hang","val-climb-hang",this.character.climbingModule.hangDistance,2)}}}setSliderVal(t,i,s,e){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${i}`);l&&(l.value=s.toString()),o&&(o.textContent=e>0?s.toFixed(e):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,i=this.container.querySelector("#creator-name");i&&(i.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const e=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");e&&(e.value=t.color),l&&(l.textContent=t.color);const o=this.container.querySelector("#creator-toggle-collider"),n=this.container.querySelector("#grp-creator-radius");o&&(o.textContent=t.hasCollider?"Attached":"Detached",o.classList.toggle("active",t.hasCollider)),n&&(n.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),d=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const r=this.container.querySelector("#creator-toggle-friction"),h=this.container.querySelector("#grp-creator-fric");r&&(r.textContent=t.hasFriction?"Attached":"Detached",r.classList.toggle("active",t.hasFriction)),h&&(h.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const v=this.container.querySelector("#creator-toggle-bounce"),p=this.container.querySelector("#grp-creator-bounce"),f=this.container.querySelector("#creator-check-vert-bounce"),b=this.container.querySelector("#creator-warn-bounce-vert");v&&(v.textContent=t.hasBounce?"Attached":"Detached",v.classList.toggle("active",t.hasBounce)),p&&(p.style.display=t.hasBounce?"block":"none"),f&&(f.checked=t.verticalBounce),b&&(b.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const k=this.container.querySelector("#creator-toggle-vert-pos"),g=this.container.querySelector("#grp-creator-vert-pos");k&&(k.textContent=t.hasVerticalPosition?"Attached":"Detached",k.classList.toggle("active",t.hasVerticalPosition)),g&&(g.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const S=this.container.querySelector("#creator-toggle-vert-vel");S&&(S.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",S.classList.toggle("active",t.hasVerticalVelocity));const m=this.container.querySelector("#creator-toggle-gravity");m&&(m.textContent=t.hasGravity?"Attached":"Detached",m.classList.toggle("active",t.hasGravity));const P=this.container.querySelector("#creator-toggle-roll"),E=this.container.querySelector("#group-creator-roll-resist");P&&(P.textContent=t.hasRollModule?"Enabled":"Disabled",P.classList.toggle("active",t.hasRollModule)),E&&(E.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var F,R,$,L,W,V,q,j,I,X;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(F=this.container.querySelector("#submode-entities"))==null||F.addEventListener("click",()=>{this.setEditTool("entities")}),(R=this.container.querySelector("#submode-walls"))==null||R.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var G;const u=this.entitySelectorEl.value;if(u===this.character.id)this.selectedEntity=this.character;else{const U=this.objects.find(Y=>Y.id===u);U&&(this.selectedEntity=U)}this.updateSelectorOptions(),this.syncEntitySliders(),(G=this.onSelectionChange)==null||G.call(this,this.selectedEntity)}),($=this.container.querySelector("#btn-duplicate-entity"))==null||$.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(L=this.container.querySelector("#btn-delete-entity"))==null||L.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const i=this.container.querySelector("#toggle-mod-collider");i==null||i.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new dt({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",u=>{this.selectedEntity.colliderRadius=u},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new ht({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",u=>{this.selectedEntity.mass=u,this.updateSelectorOptions()},1);const e=this.container.querySelector("#toggle-mod-friction");e==null||e.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new ut,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",u=>{this.selectedEntity.staticGroundFrictionMod=u},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",u=>{this.selectedEntity.dynamicGroundFrictionMod=u},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new yt({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",u=>{this.selectedEntity.bounceMod=u},2);const o=this.container.querySelector("#check-mod-vert-bounce");o==null||o.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=o.checked),this.syncEntitySliders(),this.updateInspector()});const n=this.container.querySelector("#toggle-mod-vert-pos");n==null||n.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new ft({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",u=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=u),this.selectedEntity.position.z=u,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",u=>{this.selectedEntity.verticalVelocity=u},2);const d=this.container.querySelector("#toggle-mod-gravity");d==null||d.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new mt,this.syncEntitySliders()});const r=this.container.querySelector("#toggle-mod-roll");r==null||r.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new Mt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",u=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=u)},2);const h=this.container.querySelector("#toggle-walk");h==null||h.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new Rt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=u)},0),this.setupSlider("slide-walk-speed","val-walk-speed",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=u)},1);const v=this.container.querySelector("#toggle-strength");v==null||v.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new wt({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",u=>{this.character.strength=u},1);const p=this.container.querySelector("#toggle-pickup");p==null||p.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new Wt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",u=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=u)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",u=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=u)},2);const f=this.container.querySelector("#toggle-throw");f==null||f.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new Pt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",u=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=u)},1);const b=this.container.querySelector("#toggle-climb");b==null||b.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Ft,this.syncEntitySliders()});const k=this.container.querySelector("#toggle-climb-walkoff");k==null||k.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.preventWalkOff=!this.character.climbingModule.preventWalkOff),this.syncEntitySliders()});const g=this.container.querySelector("#toggle-climb-sideways");g==null||g.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.horizontalClimb=!this.character.climbingModule.horizontalClimb),this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",u=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=u)},0),this.setupSlider("slide-climb-speed","val-climb-speed",u=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=u)},1),this.setupSlider("slide-climb-hang","val-climb-hang",u=>{this.character.climbingModule&&(this.character.climbingModule.hangDistance=u)},2),this.setupSlider("slide-gravity","val-gravity",u=>{this.arena.gravity=u},1),this.setupSlider("slide-wall-height","val-wall-height",u=>{this.arena.setStandardWallHeight(u),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",u,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",u=>{this.arena.setStandardWallHeight(u),this.setSliderVal("slide-wall-height","val-wall-height",u,1)},1);const S=this.container.querySelector("#select-wall-preset");S==null||S.addEventListener("change",()=>{this.arena.loadWallPreset(S.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(W=this.container.querySelector("#btn-prev-wall-map"))==null||W.addEventListener("click",()=>{const u=Q.WALL_PRESETS,U=(u.findIndex(Y=>Y.id===this.arena.currentPresetId)-1+u.length)%u.length;this.arena.loadWallPreset(u[U].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(V=this.container.querySelector("#btn-next-wall-map"))==null||V.addEventListener("click",()=>{const u=Q.WALL_PRESETS,U=(u.findIndex(Y=>Y.id===this.arena.currentPresetId)+1)%u.length;this.arena.loadWallPreset(u[U].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(q=this.container.querySelector("#btn-reset-walls"))==null||q.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(j=this.container.querySelector("#btn-clear-walls"))==null||j.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",u=>{this.arena.frictionCoeff=u},1),this.setupSlider("slide-static-thresh","val-static-thresh",u=>{this.arena.staticFrictionThreshold=u},2),this.container.querySelectorAll(".preset-chip").forEach(u=>{u.addEventListener("click",()=>{const G=u.getAttribute("data-preset");G&&this.presets[G]&&(this.creatorState={...this.presets[G]},this.syncCreatorInputs())})});const P=this.container.querySelector("#creator-name");P==null||P.addEventListener("input",()=>{this.creatorState.name=P.value});const E=this.container.querySelector("#creator-toggle-shape");E==null||E.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",E.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",E.classList.toggle("active",this.creatorState.visualShape==="box")});const D=this.container.querySelector("#creator-color"),T=this.container.querySelector("#val-creator-color");D==null||D.addEventListener("input",()=>{this.creatorState.color=D.value,T&&(T.textContent=D.value)});const O=this.container.querySelector("#creator-toggle-collider");O==null||O.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,O.textContent=this.creatorState.hasCollider?"Attached":"Detached",O.classList.toggle("active",this.creatorState.hasCollider);const u=this.container.querySelector("#grp-creator-radius");u&&(u.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",u=>{this.creatorState.colliderRadius=u},2);const A=this.container.querySelector("#creator-toggle-mass");A==null||A.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,A.textContent=this.creatorState.hasMass?"Attached":"Detached",A.classList.toggle("active",this.creatorState.hasMass);const u=this.container.querySelector("#grp-creator-mass");u&&(u.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",u=>{this.creatorState.mass=u},1);const B=this.container.querySelector("#creator-toggle-friction");B==null||B.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,B.textContent=this.creatorState.hasFriction?"Attached":"Detached",B.classList.toggle("active",this.creatorState.hasFriction);const u=this.container.querySelector("#grp-creator-fric");u&&(u.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",u=>{this.creatorState.dynamicFrictionMod=u},2);const C=this.container.querySelector("#creator-toggle-bounce");C==null||C.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,C.textContent=this.creatorState.hasBounce?"Attached":"Detached",C.classList.toggle("active",this.creatorState.hasBounce);const u=this.container.querySelector("#grp-creator-bounce");u&&(u.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",u=>{this.creatorState.bounceMod=u},2);const y=this.container.querySelector("#creator-check-vert-bounce");y==null||y.addEventListener("change",()=>{this.creatorState.verticalBounce=y.checked,this.syncCreatorInputs()});const M=this.container.querySelector("#creator-toggle-vert-pos");M==null||M.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",u=>{this.creatorState.elevation=u},2);const x=this.container.querySelector("#creator-toggle-vert-vel");x==null||x.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const w=this.container.querySelector("#creator-toggle-gravity");w==null||w.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,w.textContent=this.creatorState.hasGravity?"Attached":"Detached",w.classList.toggle("active",this.creatorState.hasGravity)});const z=this.container.querySelector("#creator-toggle-roll");z==null||z.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,z.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",z.classList.toggle("active",this.creatorState.hasRollModule);const u=this.container.querySelector("#group-creator-roll-resist");u&&(u.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",u=>{this.creatorState.rollResistance=u},2),(I=this.container.querySelector("#btn-spawn-configured"))==null||I.addEventListener("click",()=>{this.spawnFromCreator()}),(X=this.container.querySelector("#btn-clear-entities"))==null||X.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,i=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),e=new et({name:t.name||"Custom Object",position:{x:i,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new dt({radius:t.colliderRadius}):null,massModule:t.hasMass?new ht({mass:t.mass}):null,frictionModule:t.hasFriction?new ut({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new yt({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new ft({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new mt:null,rollModule:t.hasRollModule?new Mt({rollResistance:t.rollResistance}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,i=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),e=new et({name:`${t.name} (Copy)`,position:{x:i,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new dt({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new ht({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new ut({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new yt({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new ft({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new mt({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new Mt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,i,s,e=0){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${i}`);!l||!o||l.addEventListener("input",()=>{const n=parseFloat(l.value);o.textContent=e>0?n.toFixed(e):Math.round(n).toString(),s(n)})}updateInspector(){var e;const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}renderWallPresetOptions(){return Q.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=Q.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=Q.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const i=this.container.querySelector("#label-wall-map-badge");i&&(i.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class Lt{constructor(t){c(this,"arena");c(this,"character");c(this,"objects");c(this,"renderer");c(this,"inputManager");c(this,"devPanel");c(this,"isRunning",!1);c(this,"lastTime",0);c(this,"accumulator",0);c(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const e=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,e,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const i=this.inputManager;i.draggedEntity!==this.character?this.character.updateCharacter(t,i.movementVector,i.isMouseDown&&!this.devPanel.isEditMode,i.mousePos,this.arena,i.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const e of this.objects)i.draggedEntity!==e&&e.updatePosition(t,this.arena);const s=i.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const e=this.character.pickupModule.findTargetObject(this.character,i.mousePos.x,i.mousePos.y,this.objects,this.arena.wallHeight);e&&(this.character.pickupModule.pickup(this.character,e),i.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],i=this.inputManager,s=3;for(let e=0;e<s;e++)for(let l=0;l<t.length;l++)for(let o=l+1;o<t.length;o++){const n=t[l],a=t[o];if(n.isHeld||a.isHeld||n===i.draggedEntity||a===i.draggedEntity||!n.hasCollider||!a.hasCollider)continue;const d=this.arena.wallHeight-.15,r=n.position.z>=d||n.supportingSurfaceHeight>=d||n.standingWall!==null||n.isAboveWalls,h=a.position.z>=d||a.supportingSurfaceHeight>=d||a.standingWall!==null||a.isAboveWalls;if(r!==h)continue;const v=a.position.x-n.position.x,p=a.position.y-n.position.y,f=v*v+p*p,b=n.colliderRadius+a.colliderRadius;if(f<b*b&&f>1e-6){const k=Math.sqrt(f),g=b-k,S=v/k,m=p/k,P=a.velocity.x-n.velocity.x,E=a.velocity.y-n.velocity.y,D=P*S+E*m,T=!n.hasMass,O=!a.hasMass;if(T&&O){if(n.position.x-=S*g*.5,n.position.y-=m*g*.5,a.position.x+=S*g*.5,a.position.y+=m*g*.5,D<0){const x=-D*.5;n.velocity.x-=x*S,n.velocity.y-=x*m,a.velocity.x+=x*S,a.velocity.y+=x*m}continue}if(!T&&O){this.isEntityPinnedAgainstWall(a,S,m)?(n.position.x-=S*g,n.position.y-=m*g,n.velocity.x=0,n.velocity.y=0):(a.position.x+=S*g,a.position.y+=m*g,D<0&&(a.velocity.x+=(n.velocity.x-a.velocity.x)*Math.abs(S),a.velocity.y+=(n.velocity.y-a.velocity.y)*Math.abs(m)));continue}if(T&&!O){this.isEntityPinnedAgainstWall(n,-S,-m)?(a.position.x+=S*g,a.position.y+=m*g,a.velocity.x=0,a.velocity.y=0):(n.position.x-=S*g,n.position.y-=m*g,D<0&&(n.velocity.x+=(a.velocity.x-n.velocity.x)*Math.abs(S),n.velocity.y+=(a.velocity.y-n.velocity.y)*Math.abs(m)));continue}const A=1/n.mass,B=1/a.mass,C=A+B;if(C<=1e-4)continue;const y=A/C,M=B/C;if(n.position.x-=S*g*y,n.position.y-=m*g*y,a.position.x+=S*g*M,a.position.y+=m*g*M,D<0){const x=n instanceof xt&&n.isActivelyWalking||a instanceof xt&&a.isActivelyWalking,w=n.hasBounce&&a.hasBounce,z=n.isCharacter||!n.hasBounce?0:n.bounceMod??0,F=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,$=-(1+(x||!w?0:Math.max(0,Math.min(.98,Math.max(z,F)))))*D/C;n.velocity.x-=$*A*S,n.velocity.y-=$*A*m,a.velocity.x+=$*B*S,a.velocity.y+=$*B*m;const L=-m,W=S,V=P*L+E*W;if(Math.abs(V)>.001){const q=.35*Math.sqrt(n.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),j=.4,I=Math.abs(V)/(C*(1+1/j)),X=q*Math.abs($),u=Math.min(I,X)*Math.sign(V);if(n.velocity.x+=u*A*L,n.velocity.y+=u*A*W,a.velocity.x-=u*B*L,a.velocity.y-=u*B*W,n.rollModule&&n.rollModule.enabled){const G=u/(j*n.mass*n.colliderRadius);n.rollModule.angularVelocity.z+=G,n.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,n.rollModule.angularVelocity.z)),n.isRestingOnSurface&&(n.rollModule.angularVelocity.y=n.velocity.x/n.colliderRadius,n.rollModule.angularVelocity.x=-n.velocity.y/n.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const G=u/(j*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=G,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,i,s){const e=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(i>.3&&t.position.x>=this.arena.width-e-l||i<-.3&&t.position.x<=e+l||s>.3&&t.position.y>=this.arena.height-e-l||s<-.3&&t.position.y<=e+l)return!0;for(const o of this.arena.walls)if(t.position.z<o.wallHeight-.05){const n=t.position.x+i*l,a=t.position.y+s*l,d=Math.max(o.x,Math.min(n,o.x+o.width)),r=Math.max(o.y,Math.min(a,o.y+o.height)),h=n-d,v=a-r;if(h*h+v*v<e*e)return!0}return!1}}function zt(){const H=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!H||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=H.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new Q(20,14,1);H.width=1e3,H.height=700;const e=new xt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new et({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new et({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new et({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new et({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new Mt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})];s.syncEntitiesWithWalls([e,...l]);const o=new rt(i),n=new Bt({container:t,character:e,arena:s,objects:l,onSpawnObject:r=>{s.syncEntitiesWithWalls([r]),l.push(r),n.updateSelectorOptions()},onDeleteObject:r=>{const h=l.indexOf(r);h!==-1&&l.splice(h,1),n.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),l.length=0,n.updateSelectorOptions()}}),a=new At(H,s);a.handleInteractions(e,s,l,n),n.onSelectionChange=r=>{a.selectedCanvasEntity=r},new Lt({arena:s,character:e,objects:l,renderer:o,inputManager:a,devPanel:n}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",zt);

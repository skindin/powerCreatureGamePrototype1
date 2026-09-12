var $t=Object.defineProperty;var At=(H,t,e)=>t in H?$t(H,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):H[t]=e;var c=(H,t,e)=>At(H,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const l of i)if(l.type==="childList")for(const o of l.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function e(i){const l={};return i.integrity&&(l.integrity=i.integrity),i.referrerPolicy&&(l.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?l.credentials="include":i.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(i){if(i.ep)return;i.ep=!0;const l=e(i);fetch(i.href,l)}})();class ft{constructor(t={}){c(this,"z");c(this,"hasVerticalVelocity");c(this,"verticalVelocity");c(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const St=class St{constructor(t=20,e=14,s=1){c(this,"width");c(this,"height");c(this,"tileSize");c(this,"cols");c(this,"rows");c(this,"wallHeight");c(this,"gravity");c(this,"frictionCoeff");c(this,"staticFrictionThreshold");c(this,"tileGrid");c(this,"walls",[]);c(this,"currentPresetId","trenches");this.width=t,this.height=e,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(e/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("trenches")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]===1&&this.walls.push({id:`wall-${e}-${t}`,x:e*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,e,s){if(t<0||t>=this.cols||e<0||e>=this.rows)return!1;const i=s?1:0;return this.tileGrid[e][t]===i?!1:(this.tileGrid[e][t]=i,this.rebuildWalls(),!0)}hasWall(t,e){return t<0||t>=this.cols||e<0||e>=this.rows?!1:this.tileGrid[e][t]===1}loadWallPreset(t,e){const s=St.WALL_PRESETS.find(i=>i.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(e),!0):!1}syncEntitiesWithWalls(t){var e;if(t)for(const s of t){const i=s.hasCollider?s.colliderRadius:((e=s.colliderModule)==null?void 0:e.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,i);if(l)s.position.z<l.wallHeight?(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new ft({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.standingWall=l,s.verticalVelocity=0):(s.standingWall=l,s.supportingSurfaceHeight=l.wallHeight);else if((s.supportingSurfaceHeight>=this.wallHeight-.05||s.standingWall!==null)&&(s.standingWall=null,s.supportingSurfaceHeight=0,s.isCharacter)){const o=s;o.climbingModule&&(o.climbingModule.isDismountFreefall=!0,o.climbingModule.climbSuppressedUntilRelease=!0)}}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("trenches",t)}getWallAt(t,e){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&e>=s.y&&e<=s.y+s.height)return s;return null}testWallOverlap(t,e,s,i){const l=Math.max(i.x,Math.min(t,i.x+i.width)),o=Math.max(i.y,Math.min(e,i.y+i.height)),n=t-l,a=e-o;return n*n+a*a<s*s}getSupportingWall(t,e,s=0){if(s<=0)return this.getWallAt(t,e);for(const i of this.walls)if(this.testWallOverlap(t,e,s,i))return i;return null}areWallsContiguous(t,e){if(t.id===e.id)return!0;const s=Math.max(0,Math.max(t.x,e.x)-Math.min(t.x+t.width,e.x+e.width)),i=Math.max(0,Math.max(t.y,e.y)-Math.min(t.y+t.height,e.y+e.height)),l=Math.min(t.x+t.width,e.x+e.width)-Math.max(t.x,e.x),o=Math.min(t.y+t.height,e.y+e.height)-Math.max(t.y,e.y);return s<.001&&o>.05||i<.001&&l>.05}getSupportingSurfaceHeight(t,e,s=0){const i=this.getSupportingWall(t,e,s);return i?i.wallHeight:0}};c(St,"WALL_PRESETS",[{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>1));for(let i=2;i<=17;i++)s[3][i]=0,s[7][i]=0,s[10][i]=0;for(let i=2;i<=11;i++)s[i][5]=0,s[i][10]=0,s[i][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let i=5;i<=9;i++)s[i][2]=0;for(let i=5;i<=9;i++)s[i][17]=0;for(let i=2;i<=5;i++)s[5][i]=0;for(let i=10;i<=14;i++)s[5][i]=0;for(let i=5;i<=10;i++)s[9][i]=0;for(let i=14;i<=17;i++)s[9][i]=0;return s[7][5]=0,s}},{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>0)),i=10;for(let l=1;l<=4;l++)s[l][i]=1;for(let l=8;l<=12;l++)s[l][i]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>0));for(let i=2;i<=4;i++){for(let l=3;l<=6;l++)s[i][l]=1;for(let l=13;l<=16;l++)s[i][l]=1}for(let i=9;i<=11;i++){for(let l=3;l<=6;l++)s[i][l]=1;for(let l=13;l<=16;l++)s[i][l]=1}for(let i=6;i<=7;i++)for(let l=9;l<=10;l++)s[i][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>0)),i=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,o]of i)s[o][l]=1,s[o+1][l]=1,s[o][l+1]=1,s[o+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>0));for(let i=1;i<=9;i++)s[i][4]=1;for(let i=4;i<=12;i++)s[i][7]=1;for(let i=1;i<=9;i++)s[i][10]=1;for(let i=4;i<=12;i++)s[i][13]=1;for(let i=1;i<=9;i++)s[i][16]=1;for(let i=7;i<=10;i++)s[4][i]=1;for(let i=13;i<=16;i++)s[4][i]=1;for(let i=4;i<=7;i++)s[9][i]=1;for(let i=10;i<=13;i++)s[9][i]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,e)=>Array.from({length:e},()=>Array.from({length:t},()=>0))}]);let Q=St;class dt{constructor(t={}){c(this,"radius");c(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class ht{constructor(t={}){c(this,"mass");c(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class ut{constructor(t={}){c(this,"staticFrictionMod");c(this,"dynamicFrictionMod");c(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class yt{constructor(t={}){c(this,"bounceMod");c(this,"verticalBounce");c(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class mt{constructor(t={}){c(this,"enabled");this.enabled=t.enabled??!0}}class it{constructor(t={}){c(this,"id");c(this,"name");c(this,"position");c(this,"velocity");c(this,"color");c(this,"isHeld");c(this,"heldBy");c(this,"lastThrower",null);c(this,"isCharacter",!1);c(this,"isClimbing",!1);c(this,"visualShape","circle");c(this,"colliderModule",null);c(this,"massModule",null);c(this,"frictionModule",null);c(this,"bounceModule",null);c(this,"verticalPositionModule",null);c(this,"gravityModule",null);c(this,"rollModule",null);c(this,"supportingSurfaceHeight",0);c(this,"standingWall",null);var e,s,i,l,o;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((e=t.position)==null?void 0:e.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((i=t.position)==null?void 0:i.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((o=t.velocity)==null?void 0:o.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new dt({radius:t.colliderRadius}):new dt({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new ht({mass:t.mass}):new ht({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new ut({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new yt({bounceMod:t.bounceMod}):new yt({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new ft({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new mt,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new dt({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new ht({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new ut({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new ut({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new yt({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.85||this.supportingSurfaceHeight>=.85||this.standingWall!==null)}updatePosition(t,e){var v,E,g,w,M,P,k,B,T,O,L,A;if(this.isHeld)return;if(this.lastThrower){const C=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,y=(((v=this.lastThrower.pickupModule)==null?void 0:v.pickupReach)??1.3)+this.colliderRadius+C;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>y||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0;if(this.hasCollider&&this.hasVerticalPosition&&e.walls.length>0)if(this.position.z>=e.wallHeight-.05||this.supportingSurfaceHeight>=e.wallHeight-.05&&this.position.z>=e.wallHeight-.2||this.standingWall!==null){const y=this.isCharacter?this:null;if(!!((E=y==null?void 0:y.climbingModule)!=null&&E.isDismountFreefall||(g=y==null?void 0:y.climbingModule)!=null&&g.climbSuppressedUntilRePress))this.standingWall=null,s=0;else if(this.isCharacter){if(this.standingWall){const f=e.walls.find(F=>F.id===this.standingWall.id),S=this.colliderRadius;if((f?e.testWallOverlap(this.position.x,this.position.y,S,f):!1)&&f)this.standingWall=f,s=f.wallHeight;else if(f&&((w=y==null?void 0:y.climbingModule)!=null&&w.dismountSuppressedUntilRelease))this.standingWall=f,s=f.wallHeight;else{let F=null;if(f){for(const W of e.walls)if(e.areWallsContiguous(f,W)&&e.testWallOverlap(this.position.x,this.position.y,S,W)){F=W;break}}else F=e.getSupportingWall(this.position.x,this.position.y,S);F?(this.standingWall=F,s=F.wallHeight):(this.standingWall=null,s=0,y!=null&&y.climbingModule&&(y.climbingModule.isDismountFreefall=!0,y.climbingModule.climbSuppressedUntilRelease=!0))}}else if(!this.isClimbing&&(this.position.z>=e.wallHeight-.05||this.supportingSurfaceHeight>=e.wallHeight-.05)){const f=e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);f&&(this.standingWall=f,s=f.wallHeight)}}else{const f=e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);f?(this.standingWall=f,s=f.wallHeight):(this.standingWall=null,s=0)}}else this.standingWall=null;else this.standingWall=null,s=0;if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=e.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const C=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const y=this.rollModule,b=this.colliderRadius>0?this.colliderRadius:.3,f=.4,S=this.bounceMod,z=(1+S)*this.mass*C,F=e.frictionCoeff*this.dynamicGroundFrictionMod*.05,W=this.velocity.x-y.angularVelocity.y*b,$=this.velocity.y+y.angularVelocity.x*b,D=Math.hypot(W,$);if(D>.001&&F>0){const V=F*z,q=D*this.mass/(1+1/f),j=Math.min(q,V),I=W/D*j,X=$/D*j;this.velocity.x-=I/this.mass,this.velocity.y-=X/this.mass,y.angularVelocity.y+=I/(f*this.mass*b),y.angularVelocity.x-=X/(f*this.mass*b)}const R=Math.max(.65,1-(1-S)*.35);y.angularVelocity.x*=R,y.angularVelocity.y*=R,y.angularVelocity.z*=R}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((M=this.walkingModule)==null?void 0:M.enabled)))if(this.rollModule&&this.rollModule.enabled){const y=this.rollModule,b=this.colliderRadius>0?this.colliderRadius:.3,f=e.frictionCoeff*this.dynamicGroundFrictionMod,S=.4,z=this.velocity.x-y.angularVelocity.y*b,F=this.velocity.y+y.angularVelocity.x*b,W=Math.hypot(z,F);if(f>0&&W>.001){const D=f*(1+1/S)*t;if(W<=D){const R=this.velocity.x+S*y.angularVelocity.y*b,V=this.velocity.y-S*y.angularVelocity.x*b,q=R/(1+S),j=V/(1+S);this.velocity.x=q,this.velocity.y=j,y.angularVelocity.y=q/b,y.angularVelocity.x=-j/b}else{const R=z/W*f*t,V=F/W*f*t;this.velocity.x-=R,this.velocity.y-=V,y.angularVelocity.y+=R/(S*b),y.angularVelocity.x-=V/(S*b)}}const $=Math.hypot(this.velocity.x,this.velocity.y);if($>0){if(y.rollResistance>0){const D=y.rollResistance*t,R=Math.max(0,$-D);if(R<.005)this.velocity.x=0,this.velocity.y=0,y.angularVelocity.x=0,y.angularVelocity.y=0;else{const V=R/$;this.velocity.x*=V,this.velocity.y*=V,y.angularVelocity.x*=V,y.angularVelocity.y*=V}}}else{const D=Math.hypot(y.angularVelocity.x,y.angularVelocity.y);if(D>0&&f>0){const R=f/(S*b)*t,V=Math.max(0,D-R),q=D>0?V/D:0;y.angularVelocity.x*=q,y.angularVelocity.y*=q}}if(Math.abs(y.angularVelocity.z)>.001&&y.rollResistance>0){const D=y.rollResistance/(S*b)*t,R=Math.sign(y.angularVelocity.z),V=Math.abs(y.angularVelocity.z);y.angularVelocity.z=V<=D?0:R*(V-D)}y.updateVisualPhase(t)}else{const y=Math.hypot(this.velocity.x,this.velocity.y);if(y>0){const b=e.staticFrictionThreshold*this.staticGroundFrictionMod;if(y<b)this.velocity.x=0,this.velocity.y=0;else{const f=e.frictionCoeff*this.dynamicGroundFrictionMod*t,z=Math.max(0,y-f)/y;this.velocity.x*=z,this.velocity.y*=z}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);const l=this.isCharacter?this:null,o=l==null?void 0:l.climbingModule,n=!this.isClimbing&&this.supportingSurfaceHeight>=e.wallHeight-.05&&this.standingWall!==null,a=Math.max(.01,(o==null?void 0:o.hangDistance)??.1);if(o)if(this.position.z<=.01)o.isAssistClampArmed=!1,o.hasLeftClampZoneSinceDismount=!0;else if(n&&this.standingWall){const C=this.standingWall,y=[C];for(const S of e.walls)S.id!==C.id&&e.areWallsContiguous(C,S)&&y.push(S);let b=1/0;for(const S of y){const z=Math.max(S.x,Math.min(this.position.x,S.x+S.width)),F=Math.max(S.y,Math.min(this.position.y,S.y+S.height)),W=Math.hypot(this.position.x-z,this.position.y-F);W<b&&(b=W)}b<=a+.001?l.isClimbInputHeld&&!o.dismountSuppressedUntilRelease?(o.isAssistClampArmed=!1,o.hasLeftClampZoneSinceDismount=!1):o.hasLeftClampZoneSinceDismount&&(o.isAssistClampArmed=!0):(o.hasLeftClampZoneSinceDismount=!0,o.isAssistClampArmed=!1)}else o.isAssistClampArmed=!1;const d=!!(l&&n&&(o!=null&&o.enabled)&&(o!=null&&o.preventWalkOff)&&(o!=null&&o.isAssistClampArmed)),r=this.velocity.x*t,h=this.velocity.y*t,x=Math.hypot(r,h);if(x>1e-4)if(d){const C=Math.max(.01,((P=l==null?void 0:l.climbingModule)==null?void 0:P.hangDistance)??.1);let y=this.standingWall??e.getSupportingWall(this.position.x,this.position.y,C);this.standingWall=y;const b=this.position.x+r,f=this.position.y+h,S=[];if(y){S.push(y);for(const F of e.walls)F.id!==y.id&&e.areWallsContiguous(y,F)&&S.push(F)}let z=null;for(const F of S)if(e.testWallOverlap(b,f,C,F)){z=F;break}if(z)this.position.x=b,this.position.y=f,this.standingWall=z;else if(S.length>0){let F=1/0,W=null;for(const $ of S){const D=Math.max($.x,Math.min(b,$.x+$.width)),R=Math.max($.y,Math.min(f,$.y+$.height)),V=b-D,q=f-R,j=V*V+q*q;j<F&&(F=j,W={wall:$,closestX:D,closestY:R,dist:Math.sqrt(j),dx:V,dy:q})}if(W&&W.dist>0){const $=W.dx/W.dist,D=W.dy/W.dist,R=this.velocity.x*$+this.velocity.y*D;R>0&&(this.velocity.x-=R*$,this.velocity.y-=R*D);const V=C-.002;W.dist>V?(this.position.x=W.closestX+$*V,this.position.y=W.closestY+D*V):(this.position.x=b,this.position.y=f);const q=e.testWallOverlap(this.position.x,this.position.y,C,W.wall)?W.wall:S.find(j=>e.testWallOverlap(this.position.x,this.position.y,C,j));q&&(this.standingWall=q)}else this.velocity.x=0,this.velocity.y=0}}else{const y=Math.max(1,Math.ceil(x/.01)),b=r/y,f=h/y;let S=this.standingWall??(n?e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null),z=!1;for(let F=1;F<=y;F++){const W=this.position.x+b,$=this.position.y+f;if(S){let R=null;if(e.testWallOverlap(W,$,this.colliderRadius,S))R=S;else for(const V of e.walls)if(e.areWallsContiguous(S,V)&&e.testWallOverlap(W,$,this.colliderRadius,V)){R=V;break}R?(S=R,this.standingWall=R):(k=l==null?void 0:l.climbingModule)!=null&&k.dismountSuppressedUntilRelease||(z=!0,S=null,this.standingWall=null,this.supportingSurfaceHeight=0,l!=null&&l.climbingModule&&(l.climbingModule.isDismountFreefall=!0,l.climbingModule.climbSuppressedUntilRelease=!0))}if(this.position.x=W,this.position.y=$,!this.isClimbing&&(z||!this.standingWall&&!!((B=l==null?void 0:l.climbingModule)!=null&&B.isDismountFreefall||(T=l==null?void 0:l.climbingModule)!=null&&T.climbSuppressedUntilRePress))&&this.hasCollider)for(const R of e.walls)this.position.z<=R.wallHeight&&this.resolveWallCollision(R)}}if(this.hasCollider){const C=this.colliderRadius,y=C,b=e.width-C,f=C,S=e.height-C,z=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<y?(this.position.x=y,this.resolveWallImpact(1,0,z)):this.position.x>b&&(this.position.x=b,this.resolveWallImpact(-1,0,z)),this.position.y<f?(this.position.y=f,this.resolveWallImpact(0,1,z)):this.position.y>S&&(this.position.y=S,this.resolveWallImpact(0,-1,z));const F=!!((O=l==null?void 0:l.climbingModule)!=null&&O.isDismountFreefall||(L=l==null?void 0:l.climbingModule)!=null&&L.climbSuppressedUntilRePress);for(const W of e.walls)if(this.position.z<=W.wallHeight){if(this.position.z>=W.wallHeight-.05&&!F&&(((A=this.standingWall)==null?void 0:A.id)===W.id||e.testWallOverlap(this.position.x,this.position.y,this.colliderRadius,W)))continue;if(this.position.z<W.wallHeight-.05||F||this.standingWall===null){if(this.standingWall&&(this.standingWall.id===W.id||e.areWallsContiguous(this.standingWall,W)))continue;this.resolveWallCollision(W)}}}const p=16,m=Math.hypot(this.velocity.x,this.velocity.y);if(m>p){const C=p/m;this.velocity.x*=C,this.velocity.y*=C}if(this.rollModule&&this.rollModule.enabled){const y=this.rollModule.angularSpeed;if(y>35){const b=35/y;this.rollModule.angularVelocity.x*=b,this.rollModule.angularVelocity.y*=b,this.rollModule.angularVelocity.z*=b}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}static getClosestWallPoint(t,e,s){if(!s.walls||s.walls.length===0)return null;let i=1/0,l=null;for(const o of s.walls){const n=Math.max(o.x,Math.min(t,o.x+o.width)),a=Math.max(o.y,Math.min(e,o.y+o.height)),d=t-n,r=e-a,h=d*d+r*r;h<i&&(i=h,l={wall:o,closestX:n,closestY:a,dist:Math.sqrt(h),dx:d,dy:r})}return l}resolveWallImpact(t,e,s){this.lastThrower=null;const i=this.velocity.x*t+this.velocity.y*e;if(i>=0)return;const l=i;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*e):(this.velocity.x-=l*t,this.velocity.y-=l*e),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const o=this.rollModule,n=this.colliderRadius>0?this.colliderRadius:.3,a=.4,d=.35,r=-e,h=t,x=this.velocity.x*r+this.velocity.y*h,p=-(1+s)*this.mass*l,m=x-o.angularVelocity.z*n,v=Math.abs(m)*this.mass/(1+1/a),E=d*p,g=Math.min(v,E),w=-Math.sign(m)*g,M=x,P=M+w/this.mass,k=Math.abs(P)<=Math.abs(M)+.01?P-M:-M*.1;this.velocity.x+=k*r,this.velocity.y+=k*h;const T=-(k*this.mass)/(a*this.mass*n);o.angularVelocity.z+=T,o.angularVelocity.z=Math.max(-30,Math.min(30,o.angularVelocity.z)),o.angularVelocity.y=this.velocity.x/n,o.angularVelocity.x=-this.velocity.y/n}}resolveWallCollision(t){if(!this.hasCollider)return;const e=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),i=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,o=this.position.y-i,n=l*l+o*o;if(n<e*e){this.lastThrower=null;const a=Math.sqrt(n);let d=0,r=0,h=0;if(a===0){const p=Math.abs(this.position.x-t.x),m=Math.abs(t.x+t.width-this.position.x),v=Math.abs(this.position.y-t.y),E=Math.abs(t.y+t.height-this.position.y),g=Math.min(p,m,v,E);g===p?(d=-1,h=p+e):g===m?(d=1,h=m+e):g===v?(r=-1,h=v+e):(r=1,h=E+e)}else h=e-a,d=l/a,r=o/a;this.position.x+=d*h,this.position.y+=r*h;const x=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(d,r,x)}}}class Wt{constructor(){c(this,"id","walking");c(this,"name","Walking Module");c(this,"enabled",!0);c(this,"maxWalkForce",35);c(this,"maxWalkSpeed",5.2);c(this,"dragDamping",8.01)}update(t,e,s,i){var O;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((O=t.frictionModule)!=null&&O.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(e.x,e.y),o=l>.05;if(t.isActivelyWalking=o,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const d=i.frictionCoeff/10,r=a*d,x=t.carriedMass/(Math.max(.1,t.strength)*8),p=this.maxWalkSpeed/(1+x);let m=0,v=0;if(o){const L=e.x/l,A=e.y/l;m=L*p,v=A*p}const E=m-t.velocity.x,g=v-t.velocity.y,w=Math.hypot(E,g);if(w<.001){t.velocity.x=m,t.velocity.y=v;return}const M=Math.hypot(t.velocity.x,t.velocity.y),P=Math.max(.02,i.staticFrictionThreshold*t.staticGroundFrictionMod),k=t.hasMass?Math.max(.2,t.baseMass):1,T=this.maxWalkForce*t.strength/k*r*s;if(w<=T||!o&&M<P)t.velocity.x=m,t.velocity.y=v;else{const L=T/w;t.velocity.x+=E*L,t.velocity.y+=g*L}}}class Rt{constructor(){c(this,"id","pickup");c(this,"name","Pickup Ability");c(this,"enabled",!0);c(this,"pickupReach",1.3);c(this,"crossLayerReachRatio",.55)}isObjectInReach(t,e,s=1){var r;if(!this.enabled||e===t||e.isHeld||e.isCharacter||e.lastThrower===t)return!1;const i=t.position.z>=s-.05?1:0,l=e.position.z>=s-.05?1:0,n=i!==l?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,a=e.hasCollider?e.colliderRadius:((r=e.colliderModule)==null?void 0:r.radius)??.32;return Math.hypot(e.position.x-t.position.x,e.position.y-t.position.y)<=n+a}findTargetObject(t,e,s,i,l=1){if(!this.enabled)return null;let o=null,n=1/0;for(const a of i){if(!this.isObjectInReach(t,a,l))continue;const d=Math.hypot(a.position.x-e,a.position.y-s);d<n&&(n=d,o=a)}return o}pickup(t,e){if(!this.enabled||t.heldObject)return!1;const s=e.velocity.x,i=e.velocity.y,l=e.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=i*l,t.isAboveGround&&Math.abs(e.verticalVelocity)>.1&&(t.verticalVelocity+=e.verticalVelocity*l),t.heldObject=e,e.isHeld=!0,e.heldBy=t,e.velocity.x=0,e.velocity.y=0,e.verticalVelocity=0,e.position.z=e.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const e=t.heldObject;if(t.heldObject=null,e.isHeld=!1,e.heldBy=null,e.lastThrower=t,e.velocity.x=t.velocity.x,e.velocity.y=t.velocity.y,e.verticalVelocity=t.isAboveGround?t.verticalVelocity:0,e.hasFriction&&e.rollModule&&e.rollModule.enabled){const s=e.colliderRadius>0?e.colliderRadius:.3;e.rollModule.angularVelocity.y=e.velocity.x/s,e.rollModule.angularVelocity.x=-e.velocity.y/s}return e}}class Pt{constructor(){c(this,"id","throw");c(this,"name","Throw Ability");c(this,"enabled",!0);c(this,"baseThrowForce",7.6);c(this,"maxThrowAimDistance",13)}testWallIntersection(t,e,s,i){const l=Math.max(i.x,Math.min(t,i.x+i.width)),o=Math.max(i.y,Math.min(e,i.y+i.height)),n=t-l,a=e-o;return n*n+a*a<s*s}computeLaunchVelocity(t,e,s,i,l,o,n,a=!0,d=!0,r=.35,h){const x=i-t,p=l-e,m=Math.hypot(x,p);if(m<.1)return null;const v=Math.min(m,this.maxThrowAimDistance),E=x/m,g=p/m,w=t+E*v,M=e+g*v,P=(h==null?void 0:h.x)??0,k=(h==null?void 0:h.y)??0,B=P*E+k*g,T=P*-g+k*E,O=Math.sqrt(Math.max(.25,n*n-T*T)),L=Math.max(1.5,B+O);if(!a||!d){const R=Math.max(.14,v/L),V=E*L,q=g*L;return{vx:V,vy:q,vz:0,totalTime:R,finalTargetX:w,finalTargetY:M,targetSurfaceHeight:s}}const A=o.getSupportingSurfaceHeight(w,M),C=A-s;let b=Math.max(.14,v/L);C>0&&(b=Math.max(b,Math.sqrt(2*C/o.gravity)));const f=40,S=r>0?r:.35,z=.25;for(let R=1;R<f;R++){const V=R/f,q=t+(w-t)*V,j=e+(M-e)*V;for(const I of o.walls)if(this.testWallIntersection(q,j,S,I)){if(A>0&&w>=I.x&&w<=I.x+I.width&&M>=I.y&&M<=I.y+I.height&&V>.65)continue;const u=(1-V)*s+V*A,U=I.wallHeight+z-u;if(U>0){const Y=o.gravity*V*(1-V);if(Y>.001){const Z=2*U/Y;if(Z>0){const N=Math.sqrt(Z);N>b&&(b=N)}}}}}if(b<=.05)return null;const F=(C+.5*o.gravity*b*b)/b,W=v/b,$=E*W,D=g*W;return{vx:$,vy:D,vz:F,totalTime:b,finalTargetX:w,finalTargetY:M,targetSurfaceHeight:A}}calculateTrajectory(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,n=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,r=l.hasGravity&&l.hasVerticalVelocity,h={x:t.velocity.x,y:t.velocity.y,z:t.isAboveGround?t.verticalVelocity:0},x=this.computeLaunchVelocity(o,n,a,e,s,i,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius,h);if(!x)return null;const{vx:p,vy:m,vz:v,totalTime:E,finalTargetX:g,finalTargetY:w,targetSurfaceHeight:M}=x,P=90,k=E/P,B=[];let T=!1,O=M>0,L,A=a;for(let y=0;y<=P;y++){const b=y*k,f=y===P?g:o+p*b,S=y===P?w:n+m*b,z=r?a+v*b-.5*i.gravity*b*b:a,F=r?y===P?M:Math.max(M,z):a,W=r?v-i.gravity*b:0;F>A&&(A=F);const $=F>i.wallHeight;let D=!1,R=!1;for(const V of i.walls)if(this.testWallIntersection(f,S,l.colliderRadius,V)&&(D=!0,F<=V.wallHeight+.001)){if(B.length>0&&B[B.length-1].z>=V.wallHeight-.05&&W<=0){if(M>0&&(y>=P-2||Math.hypot(f-g,S-w)<.2)){O=!0;break}else if(M===0){O=!0,R=!0,T=!0,L=V.id;break}}else if(F<V.wallHeight-.05){R=!0,T=!0,L=V.id;break}}if(B.push({x:f,y:S,z:F,t:b,couldClearWall:$,isOverWall:D,collidesWall:R}),R)break}const C=B[B.length-1];return{points:B,landPoint:{x:T?C.x:g,y:T?C.y:w},isBlockedByWall:T,isLandingOnWallTop:T?O:M>0,blockedAtWallId:L,peakHeight:A,flightTime:E}}throwHeldObject(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,n=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,r={x:t.velocity.x,y:t.velocity.y,z:t.isAboveGround?t.verticalVelocity:0},h=this.computeLaunchVelocity(o,n,a,e,s,i,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius,r);if(!h)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=h.vx,l.velocity.y=h.vy,l.verticalVelocity=h.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const g=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=h.vx/g,l.rollModule.angularVelocity.x=-h.vy/g}const x=l.hasMass?l.mass:0,p=t.hasMass?Math.max(.2,t.baseMass):0,m=x>0&&p>0?x/p:0;t.heldObject=null;const v=h.vx-t.velocity.x,E=h.vy-t.velocity.y;if(t.velocity.x-=v*m,t.velocity.y-=E*m,t.isAboveGround&&l.hasVerticalVelocity){const g=h.vz-t.verticalVelocity;t.verticalVelocity-=g*m}return l}}class Ft{constructor(t){c(this,"id","climbing");c(this,"name","Climbing Module");c(this,"enabled",!0);c(this,"maxAdhesion",35);c(this,"maxClimbSpeed",3);c(this,"preventWalkOff",!0);c(this,"horizontalClimb",!1);c(this,"hangDistance",.1);c(this,"dismountSuppressedUntilRelease",!1);c(this,"climbSuppressedUntilRelease",!1);c(this,"isDismountFreefall",!1);c(this,"isAssistClampArmed",!1);c(this,"hasLeftClampZoneSinceDismount",!0);c(this,"wasClimbHeldLastTick",!1);(t==null?void 0:t.maxAdhesion)!==void 0&&(this.maxAdhesion=t.maxAdhesion),(t==null?void 0:t.maxClimbSpeed)!==void 0&&(this.maxClimbSpeed=t.maxClimbSpeed),(t==null?void 0:t.preventWalkOff)!==void 0&&(this.preventWalkOff=t.preventWalkOff),(t==null?void 0:t.horizontalClimb)!==void 0&&(this.horizontalClimb=t.horizontalClimb),(t==null?void 0:t.hangDistance)!==void 0&&(this.hangDistance=t.hangDistance)}get climbSuppressedUntilRePress(){return this.isDismountFreefall||this.climbSuppressedUntilRelease}set climbSuppressedUntilRePress(t){this.isDismountFreefall=t,this.climbSuppressedUntilRelease=t}update(t,e,s,i,l){const o=s&&!this.wasClimbHeldLastTick;if(this.wasClimbHeldLastTick=s,s||(this.dismountSuppressedUntilRelease=!1,this.climbSuppressedUntilRelease=!1),(t.position.z<=.01||o)&&(this.isDismountFreefall=!1,t.position.z<=.01&&(this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)),this.climbSuppressedUntilRelease||!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const n=t.hasCollider?t.colliderRadius:.44,a=Math.hypot(e.x,e.y),d=a>=.05,r=d?e.x/a:0,h=d?e.y/a:0;if(!t.isClimbing&&(t.standingWall!==null||t.position.z>=l.wallHeight))return t.isClimbing=!1,!1;let x=null,p=1/0,m=0,v=0,E=0;for(const k of l.walls){const B=Math.max(k.x,Math.min(t.position.x,k.x+k.width)),T=Math.max(k.y,Math.min(t.position.y,k.y+k.height)),O=B-t.position.x,L=T-t.position.y,A=Math.hypot(O,L);A<=n+.15&&A<p&&(p=A,x=k,m=d?r*O+h*L:0,v=O,E=L)}if(!x)return t.isClimbing=!1,!1;const g=t.mass;if(g*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;const M=t.isClimbing;if(M&&t.position.z<x.wallHeight){const k=p>.001?v/p:0,B=p>.001?E/p:0,T=-B,O=k,L=d?r*k+h*B:0,A=d?r*T+h*O:0;if(d&&(L<-.3||!this.horizontalClimb&&m<-.1))return t.isClimbing=!1,t.velocity.x=r*3,t.velocity.y=h*3,s&&(this.climbSuppressedUntilRelease=!0),!1;if(t.isClimbing=!0,t.verticalVelocity=0,t.standingWall=null,this.horizontalClimb&&d&&Math.abs(A)>=.1){const C=t.baseMass,y=Math.max(.5,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*C*t.strength/Math.max(.1,g)));t.velocity.x=T*A*y,t.velocity.y=O*A*y}else t.velocity.x=0,t.velocity.y=0;if(s){const C=t.baseMass,y=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*C*t.strength/Math.max(.1,g)));t.position.z+=y*i,t.position.z>=x.wallHeight&&(t.position.z=x.wallHeight,t.supportingSurfaceHeight=x.wallHeight,t.standingWall=x,t.verticalVelocity=0,t.isClimbing=!1,this.dismountSuppressedUntilRelease=!0,this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)}return!0}if(!M&&t.position.z>.05&&t.position.z<x.wallHeight)return o?(t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0,!0):(t.isClimbing=!1,!1);if(s&&d&&m>.01&&p<=n+.03&&t.position.z<x.wallHeight){if(p>.001){const T=v/p,O=E/p;t.position.x=t.position.x+v-T*n,t.position.y=t.position.y+E-O*n}t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const k=t.baseMass,B=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*k*t.strength/Math.max(.1,g)));return t.position.z+=B*i,!0}return t.isClimbing=!1,!1}}class wt{constructor(t={}){c(this,"id","strength");c(this,"name","Strength Module");c(this,"enabled",!0);c(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class xt extends it{constructor(e={}){super({name:"Player Character",position:{x:e.x??5,y:e.y??7,z:0},mass:e.mass??1.2,colliderRadius:e.colliderRadius??.44,color:e.color??"#f59e0b",bounceMod:.1});c(this,"strengthModule");c(this,"facingAngle");c(this,"heldObject");c(this,"isCharacter",!0);c(this,"isActivelyWalking",!1);c(this,"isClimbInputHeld",!1);c(this,"baseMass",1.2);c(this,"walkingModule");c(this,"pickupModule");c(this,"throwModule");c(this,"climbingModule");c(this,"isAiming");c(this,"aimTarget");c(this,"activeTrajectory");this.baseMass=e.mass??1.2,this.strength=e.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new wt({strength:e.strength??1}),this.walkingModule=new Wt,this.pickupModule=new Rt,this.throwModule=new Pt,this.climbingModule=new Ft}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(e){this.strengthModule?this.strengthModule.strength=Math.max(.1,e):this.strengthModule=new wt({strength:e})}get mass(){const e=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return e+s}set mass(e){this.baseMass=Math.max(.1,e),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}get hangDistance(){return this.climbingModule?this.climbingModule.hangDistance:.1}set hangDistance(e){this.climbingModule&&(this.climbingModule.hangDistance=Math.max(0,e))}updateFacingDirection(e,s,i){if((this.heldObject!==null||e)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,o=s.y-this.position.y;if(Math.hypot(l,o)>.1){this.facingAngle=Math.atan2(o,l);return}}i&&Math.hypot(i.x,i.y)>.05&&(this.facingAngle=Math.atan2(i.y,i.x))}updateCharacter(e,s,i,l,o,n=!1){if(this.isClimbInputHeld=n,this.climbingModule&&this.climbingModule.update(this,s,n,e,o),this.walkingModule&&this.walkingModule.update(this,s,e,o),this.updatePosition(e,o),this.updateFacingDirection(i,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||i,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,o):this.activeTrajectory=null}}class Mt{constructor(t={}){c(this,"enabled",!0);c(this,"angularVelocity",{x:0,y:0,z:0});c(this,"rollResistance",.4);c(this,"visualPhase",0);var e,s,i;this.enabled=t.enabled??!0,this.angularVelocity={x:((e=t.angularVelocity)==null?void 0:e.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((i=t.angularVelocity)==null?void 0:i.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const e=this.angularSpeed;e>.001&&(this.visualPhase=(this.visualPhase+e*t)%(Math.PI*2))}}class et{constructor(t){c(this,"ctx");this.ctx=t}render(t,e,s,i,l=!1,o,n,a=!1,d){const r=this.ctx,h=r.canvas.width/t.width;r.clearRect(0,0,r.canvas.width,r.canvas.height),this.drawFloorGrid(t,h),this.drawWalls(t,h),a&&d&&this.drawWallEditorHover(t,d,h);const x=[e,...s];x.sort((p,m)=>Math.abs(p.position.z-m.position.z)>.001?p.position.z-m.position.z:Math.abs(p.verticalVelocity-m.verticalVelocity)>.001?p.verticalVelocity-m.verticalVelocity:p.position.y-m.position.y);for(const p of x)p instanceof xt?this.drawCharacter(p,h,t):this.drawFreebodyObject(p,e,h,p===n,t),this.drawObjectShadow(p,h);e.activeTrajectory&&this.drawTrajectory(e.activeTrajectory,h),l&&(o&&o!==i&&this.drawHoverGizmo(o,h),i&&this.drawSelectionGizmo(i,l,h))}drawFloorGrid(t,e){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*e,t.height*e),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let i=1;i<t.width;i++)s.beginPath(),s.moveTo(i*e,0),s.lineTo(i*e,t.height*e),s.stroke();for(let i=1;i<t.height;i++)s.beginPath(),s.moveTo(0,i*e),s.lineTo(t.width*e,i*e),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*e-3,t.height*e-3)}drawWalls(t,e){const s=this.ctx;for(const i of t.walls)s.fillStyle="#1e293b",s.fillRect(i.x*e,i.y*e,i.width*e,i.height*e),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(i.x*e,i.y*e,i.width*e,i.height*e)}drawWallEditorHover(t,e,s){if(e.col<0||e.col>=t.cols||e.row<0||e.row>=t.rows)return;const i=this.ctx,l=e.col*t.tileSize*s,o=e.row*t.tileSize*s,n=t.tileSize*s,a=t.hasWall(e.col,e.row);i.save(),a?(i.fillStyle="rgba(239, 68, 68, 0.35)",i.strokeStyle="#ef4444",i.lineWidth=2.5,i.fillRect(l,o,n,n),i.strokeRect(l,o,n,n),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#fca5a5",i.textAlign="center",i.textBaseline="middle",i.fillText("✕ Erase",l+n/2,o+n/2)):(i.fillStyle="rgba(56, 189, 248, 0.3)",i.strokeStyle="#38bdf8",i.lineWidth=2.5,i.fillRect(l,o,n,n),i.strokeRect(l,o,n,n),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#7dd3fc",i.textAlign="center",i.textBaseline="middle",i.fillText("+ Draw",l+n/2,o+n/2)),i.restore()}static getAltitudeScale(t,e){return 1+Math.max(0,t)/Math.max(.1,e)*.5}static isEntityOnLayer2(t,e){const s=e-.05;return t.position.z>=s||t.supportingSurfaceHeight>=s||t.standingWall!==null||t.isAboveWalls}drawObjectShadow(t,e){if(t.position.z<=.01)return;const i=this.ctx,l=t.position.x*e,o=t.position.y*e,n=t.colliderRadius*e;if(i.save(),i.beginPath(),t.visualShape==="box"){const a=n*2,d=Math.max(3,n*.16);i.roundRect?i.roundRect(l-n,o-n,a,a,d):i.rect(l-n,o-n,a,a)}else i.arc(l,o,n,0,Math.PI*2);i.strokeStyle="rgba(255, 255, 255, 0.85)",i.lineWidth=1.8,i.setLineDash([4,4]),i.stroke(),i.restore()}drawFreebodyObject(t,e,s,i=!1,l){var v,E;const o=this.ctx,n=t.position.x*s,a=t.position.y*s,d=et.getAltitudeScale(t.position.z,l.wallHeight),h=(t.hasCollider?t.colliderRadius:((v=t.colliderModule)==null?void 0:v.radius)??.32)*s*d,p=!e.heldObject&&e.pickupModule!==null&&e.pickupModule.enabled&&!t.isHeld&&(((E=e.pickupModule)==null?void 0:E.isObjectInReach(e,t,l.wallHeight))??!1);if(p){if(o.save(),o.beginPath(),t.visualShape==="box"){const g=(h+5)*2;o.roundRect?o.roundRect(n-h-5,a-h-5,g,g,6):o.rect(n-h-5,a-h-5,g,g)}else o.arc(n,a,h+5,0,Math.PI*2);i?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",n,a-h-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}const m=et.isEntityOnLayer2(t,l.wallHeight);if(o.save(),o.globalAlpha=m?.55:1,t.visualShape==="box"){const g=h*2,w=Math.max(3,h*.16),M=n-h,P=a-h;o.beginPath(),o.roundRect?o.roundRect(M,P,g,g,w):o.rect(M,P,g,g),o.fillStyle=t.color,o.fill(),o.strokeStyle=p?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=p?2.5:2,o.stroke();const k=Math.max(3,h*.22);o.beginPath(),o.roundRect?o.roundRect(M+k,P+k,g-k*2,g-k*2,w*.7):o.rect(M+k,P+k,g-k*2,g-k*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(M+k,P+k),o.lineTo(M+g-k,P+g-k),o.moveTo(M+g-k,P+k),o.lineTo(M+k,P+g-k),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(n,a,h,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=p?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=p?2.5:2,o.stroke();this.drawRollIndicator(t,n,a,h),o.restore()}drawCharacter(t,e,s){const i=this.ctx,l=t.position.x*e,o=t.position.y*e,n=et.getAltitudeScale(t.position.z,s.wallHeight),a=t.colliderRadius*e*n,d=et.isEntityOnLayer2(t,s.wallHeight);i.save(),i.globalAlpha=d?.55:1,i.beginPath(),i.arc(l,o,a,0,Math.PI*2),i.fillStyle=t.color,i.fill(),i.strokeStyle="#ffffff",i.lineWidth=2.5,i.stroke(),this.drawRollIndicator(t,l,o,a);const r=.52,h=a*.72,x=Math.max(3.5,a*.18),p=t.facingAngle-r,m=t.facingAngle+r,v=l+Math.cos(p)*h,E=o+Math.sin(p)*h,g=l+Math.cos(m)*h,w=o+Math.sin(m)*h;i.fillStyle="#000000",i.beginPath(),i.arc(v,E,x,0,Math.PI*2),i.arc(g,w,x,0,Math.PI*2),i.fill(),t.heldObject&&(i.strokeStyle="rgba(255, 255, 255, 0.6)",i.setLineDash([3,3]),i.lineWidth=1.5,i.beginPath(),i.moveTo(l,o),i.lineTo(t.heldObject.position.x*e,t.heldObject.position.y*e),i.stroke(),i.setLineDash([])),i.restore()}drawRollIndicator(t,e,s,i){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,o=l.angularVelocity.x,n=l.angularVelocity.y,a=l.angularVelocity.z,d=Math.hypot(o,n,a);if(d<.02)return;const r=this.ctx,x=Math.hypot(o,n)<.05*d,p=2.5,m=5,v=4;if(r.save(),r.shadowColor="rgba(0, 0, 0, 0.75)",r.shadowBlur=3,x){const E=i*.5,g=i*.88;r.beginPath(),r.arc(e,s,E,0,Math.PI*2),r.strokeStyle="rgba(255, 255, 255, 0.5)",r.lineWidth=1.8,r.setLineDash([]),r.stroke(),r.beginPath(),r.arc(e,s,g,0,Math.PI*2),r.strokeStyle="rgba(255, 255, 255, 0.98)",r.lineWidth=p,r.setLineDash([m,v]),r.lineDashOffset=-l.visualPhase*g*Math.sign(a||1),r.stroke()}else{const E=Math.atan2(-o,n),g=i*.9,w=Math.abs(a)/d,M=g*Math.max(.35,Math.pow(w,.65));r.translate(e,s),r.rotate(E);const P=a!==0?Math.sign(a):1;r.beginPath(),r.ellipse(0,0,g,M,0,0,Math.PI),r.strokeStyle="rgba(255, 255, 255, 0.98)",r.lineWidth=p,r.setLineDash([m,v]),r.lineDashOffset=-l.visualPhase*g*P,r.stroke(),r.beginPath(),r.ellipse(0,0,g,M,0,Math.PI,Math.PI*2),r.strokeStyle="rgba(255, 255, 255, 0.35)",r.lineWidth=1.8,r.setLineDash([m,v]),r.lineDashOffset=-l.visualPhase*g*P,r.stroke()}r.restore()}drawTrajectory(t,e){const s=this.ctx,i=t.points;if(i.length<2)return;s.save();for(let o=0;o<i.length-1;o++){const n=i[o],a=i[o+1];s.beginPath(),s.moveTo(n.x*e,n.y*e),s.lineTo(a.x*e,a.y*e);const d=(n.z+a.z)*.5,r=et.getAltitudeScale(d,1);n.couldClearWall||a.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=3.6*r,s.setLineDash([7,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.2*r,s.setLineDash([4,4])),s.stroke()}if(i.length>2&&t.peakHeight&&t.peakHeight>.25){let o=i[0];for(const r of i)r.z>o.z&&(o=r);s.save();const n=o.x*e,a=o.y*e,d=o.z>=1;s.fillStyle=d?"#38bdf8":"#f59e0b",s.beginPath(),s.arc(n,a,d?4:3,0,Math.PI*2),s.fill(),s.restore()}const l=i[i.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const o=8;s.beginPath(),s.moveTo(l.x*e-o,l.y*e-o),s.lineTo(l.x*e+o,l.y*e+o),s.moveTo(l.x*e+o,l.y*e-o),s.lineTo(l.x*e-o,l.y*e+o),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,e){var a;const s=this.ctx,i=t.position.x*e,l=t.position.y*e,n=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*e;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(i,l,n,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,e,s){var x;const i=this.ctx,l=t.position.x*s,o=t.position.y*s,d=(t.hasCollider?t.colliderRadius:((x=t.colliderModule)==null?void 0:x.radius)??.32)*s+6,r=Math.max(6,d*.4),h=e?"#fbbf24":"#38bdf8";if(i.save(),i.strokeStyle=h,i.lineWidth=2,i.setLineDash([]),i.beginPath(),i.moveTo(l-d,o-d+r),i.lineTo(l-d,o-d),i.lineTo(l-d+r,o-d),i.stroke(),i.beginPath(),i.moveTo(l+d-r,o-d),i.lineTo(l+d,o-d),i.lineTo(l+d,o-d+r),i.stroke(),i.beginPath(),i.moveTo(l+d,o+d-r),i.lineTo(l+d,o+d),i.lineTo(l+d-r,o+d),i.stroke(),i.beginPath(),i.moveTo(l-d+r,o+d),i.lineTo(l-d,o+d),i.lineTo(l-d,o+d-r),i.stroke(),e){const p=`${t.name} (${t.mass.toFixed(1)}kg)`;i.font="bold 10px 'Segoe UI', system-ui, sans-serif";const v=i.measureText(p).width+12,E=16,g=l-v/2,w=o-d-E-4;i.fillStyle="rgba(15, 23, 42, 0.85)",i.strokeStyle=h,i.lineWidth=1,i.beginPath(),i.roundRect(g,w,v,E,4),i.fill(),i.stroke(),i.fillStyle=h,i.textAlign="center",i.textBaseline="middle",i.fillText(p,l,w+E/2)}i.restore()}}class Dt{constructor(t,e){c(this,"canvas");c(this,"arena");c(this,"keysPressed",new Set);c(this,"mousePos",{x:0,y:0});c(this,"isMouseDown",!1);c(this,"isRightMouseDown",!1);c(this,"hoverWallTile",null);c(this,"movementVector",{x:0,y:0});c(this,"justPickedUp",!1);c(this,"isThrowingPress",!1);c(this,"hoverEntity",null);c(this,"selectedCanvasEntity",null);c(this,"draggedEntity",null);c(this,"dragOffset",{x:0,y:0});c(this,"handleClick");c(this,"onMouseDown");c(this,"onRightMouseDown");c(this,"onMouseUp");c(this,"onRightClick");c(this,"onDropAttempt");c(this,"onMouseMove");this.canvas=t,this.arena=e,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateTouchPos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateMovementVector(){let t=0,e=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(e-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(e+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,e);s>0?(this.movementVector.x=t/s,this.movementVector.y=e/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,e,s,i){i&&(this.selectedCanvasEntity=i.selectedEntity);const l=(a,d,r=.35)=>{var p;for(let m=s.length-1;m>=0;m--){const v=s[m],E=v.hasCollider?v.colliderRadius:((p=v.colliderModule)==null?void 0:p.radius)??.32;if(Math.hypot(v.position.x-a,v.position.y-d)<=E+r)return v}const h=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-d)<=h+r?t:null},o=(a,d)=>{if(a<0||a>=e.cols||d<0||d>=e.rows)return;if(e.setWallTile(a,d,!0)){const h=[t,...s];e.syncEntitiesWithWalls(h),e.currentPresetId="custom",i==null||i.updateWallPresetUI()}},n=(a,d)=>{if(!(a<0||a>=e.cols||d<0||d>=e.rows)&&e.tileGrid[d][a]===1){e.setWallTile(a,d,!1);const r=[t,...s];e.syncEntitiesWithWalls(r),e.currentPresetId="custom",i==null||i.updateWallPresetUI()}};this.onMouseDown=(a,d)=>{if(i!=null&&i.isEditMode){if(i.editTool==="walls"){const h=Math.floor(a/e.tileSize),x=Math.floor(d/e.tileSize);o(h,x);return}const r=l(a,d,.35);r?(this.selectedCanvasEntity=r,i.setSelectedEntity(r),this.draggedEntity=r,this.dragOffset.x=r.position.x-a,this.dragOffset.y=r.position.y-d,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,d)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"){const r=Math.floor(a/e.tileSize),h=Math.floor(d/e.tileSize);n(r,h)}},this.onMouseMove=(a,d)=>{var x;const r=Math.floor(a/e.tileSize),h=Math.floor(d/e.tileSize);if(r>=0&&r<e.cols&&h>=0&&h<e.rows?this.hoverWallTile={col:r,row:h}:this.hoverWallTile=null,i!=null&&i.isEditMode){if(i.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?o(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&n(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const p=a+this.dragOffset.x,m=d+this.dragOffset.y,v=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((x=this.draggedEntity.colliderModule)==null?void 0:x.radius)??.32;this.draggedEntity.position.x=Math.max(v,Math.min(e.width-v,p)),this.draggedEntity.position.y=Math.max(v,Math.min(e.height-v,m)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const p=l(a,d,.3);this.hoverEntity=p,this.canvas.style.cursor=p?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,d)=>{if(this.draggedEntity&&(e.syncEntitiesWithWalls([this.draggedEntity]),this.draggedEntity=null),i!=null&&i.isEditMode)if(i.editTool==="walls")this.canvas.style.cursor="cell";else{const r=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=r,this.canvas.style.cursor=r?"grab":"crosshair"}},this.handleClick=(a,d)=>{if(!(i!=null&&i.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,d,e),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const r=t.pickupModule.findTargetObject(t,a,d,s,e.wallHeight);r&&(t.pickupModule.pickup(t,r),this.justPickedUp=!0)}}},this.onRightClick=(a,d)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"||!i)return;const r=l(a,d,.4);r&&(this.selectedCanvasEntity=r,i.setSelectedEntity(r))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,e.wallHeight);a&&t.pickupModule.pickup(t,a)}}}}class Lt{constructor(t){c(this,"container");c(this,"character");c(this,"arena");c(this,"objects");c(this,"onSpawnObject");c(this,"onDeleteObject");c(this,"onClearObjects");c(this,"selectedEntity");c(this,"isEditMode",!1);c(this,"editTool","entities");c(this,"onSelectionChange");c(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});c(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});c(this,"inspectorEl");c(this,"entitySelectorEl");c(this,"characterSpecificControlsEl");c(this,"objectSpecificControlsEl");c(this,"modePlayBtn");c(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var e;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(e=this.onSelectionChange)==null||e.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const e=this.container.querySelector("#edit-submode-container");e&&(e.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const e=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");e&&s&&(e.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const e=this.container.querySelector("#edit-hint-label");e&&(this.isEditMode?this.editTool==="walls"?e.textContent="Left-drag: Draw | Right-drag: Erase":e.textContent="Click & drag object in arena":e.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let e=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const i of this.objects){const l=i.id===t?"selected":"",o=i.visualShape==="box"?"📦":"⚪",n=i.hasMass?`${i.mass.toFixed(1)}kg`:"Massless";e+=`<option value="${i.id}" ${l}>${o} ${i.name} (${n})</option>`}this.entitySelectorEl.innerHTML=e;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,e,s,i,l,o,n,a,d,r,h,x,p,m,v,E,g,w,M,P,k,B,T,O,L,A,C,y,b,f,S,z,F,W,$,D,R,V,q,j,I,X,u,G,U,Y,Z,N,gt,st,lt,pt,ot,at,vt,nt,ct,bt,rt,tt,K,_,J,kt,Et,Vt,Ct;this.container.innerHTML=`
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
                <input type="range" id="slide-entity-radius" min="0.1" max="1.5" step="0.02" value="${((e=this.selectedEntity.colliderModule)==null?void 0:e.radius)??.32}">
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
                <input type="range" id="slide-entity-mass" min="0.1" max="8.0" step="0.1" value="${((i=this.selectedEntity.massModule)==null?void 0:i.mass)??1}">
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
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((x=this.selectedEntity.frictionModule)==null?void 0:x.dynamicFrictionMod)??1}">
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
              <button id="toggle-mod-bounce" class="btn-toggle ${(m=this.selectedEntity.bounceModule)!=null&&m.enabled?"active":""}">
                ${(v=this.selectedEntity.bounceModule)!=null&&v.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((E=this.selectedEntity.bounceModule)!=null&&E.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(g=this.selectedEntity.bounceModule)!=null&&g.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((w=this.selectedEntity.bounceModule)==null?void 0:w.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((M=this.selectedEntity.bounceModule)==null?void 0:M.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(P=this.selectedEntity.bounceModule)!=null&&P.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(k=this.selectedEntity.bounceModule)!=null&&k.enabled&&((B=this.selectedEntity.bounceModule)!=null&&B.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
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
                ${(L=this.selectedEntity.rollModule)!=null&&L.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(A=this.selectedEntity.rollModule)!=null&&A.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(C=this.selectedEntity.rollModule)!=null&&C.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((y=this.selectedEntity.rollModule)==null?void 0:y.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((b=this.selectedEntity.rollModule)==null?void 0:b.rollResistance)??.4}">
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
                <button id="toggle-walk" class="btn-toggle ${(f=this.character.walkingModule)!=null&&f.enabled?"active":""}">
                  ${(S=this.character.walkingModule)!=null&&S.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((z=this.character.walkingModule)!=null&&z.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&((F=this.character.walkingModule)!=null&&F.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(W=this.character.walkingModule)!=null&&W.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${((($=this.character.walkingModule)==null?void 0:$.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((D=this.character.walkingModule)==null?void 0:D.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((R=this.character.walkingModule)==null?void 0:R.maxWalkSpeed)??5.2).toFixed(1)}</span>
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var D,R,V,q,j,I,X;const t=this.selectedEntity,e=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=e?"none":"flex");const i=this.container.querySelector("#toggle-entity-shape");i&&(t.visualShape==="box"?(i.textContent="Box 📦",i.classList.add("active")):(i.textContent="Circle ⚪",i.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),o=this.container.querySelector("#group-mod-collider"),n=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),n&&(n.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((D=t.colliderModule)==null?void 0:D.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),d=this.container.querySelector("#group-mod-mass"),r=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),r&&(r.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((R=t.massModule)==null?void 0:R.mass)??1,1);const h=this.container.querySelector("#toggle-mod-friction"),x=this.container.querySelector("#group-mod-friction"),p=this.container.querySelector("#note-mod-friction"),m=this.container.querySelector("#warn-friction-mass"),v=!!(t.frictionModule&&t.frictionModule.enabled);h&&(h.textContent=v?"Attached":"Detached",h.classList.toggle("active",v)),x&&(x.style.display=v?"flex":"none"),p&&(p.style.display=v?"none":"block"),m&&(m.style.display=!t.hasMass&&v?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((V=t.frictionModule)==null?void 0:V.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((q=t.frictionModule)==null?void 0:q.dynamicFrictionMod)??1,2);const E=this.container.querySelector("#toggle-mod-bounce"),g=this.container.querySelector("#group-mod-bounce"),w=this.container.querySelector("#note-mod-bounce"),M=this.container.querySelector("#warn-bounce-mass"),P=!!(t.bounceModule&&t.bounceModule.enabled);E&&(E.textContent=P?"Attached":"Detached",E.classList.toggle("active",P)),g&&(g.style.display=P?"block":"none"),w&&(w.style.display=P?"none":"block"),M&&(M.style.display=!t.hasMass&&P?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const k=this.container.querySelector("#check-mod-vert-bounce"),B=this.container.querySelector("#warn-bounce-vert-vel");if(k&&(k.checked=!!((I=t.bounceModule)!=null&&I.verticalBounce)),B){const u=!!(P&&((X=t.bounceModule)!=null&&X.verticalBounce)&&!t.hasVerticalVelocity);B.style.display=u?"block":"none"}const T=this.container.querySelector("#toggle-mod-vert-pos"),O=this.container.querySelector("#group-mod-vert-pos"),L=this.container.querySelector("#note-mod-vert-pos"),A=t.hasVerticalPosition;T&&(T.textContent=A?"Attached":"Detached",T.classList.toggle("active",A)),O&&(O.style.display=A?"block":"none"),L&&(L.style.display=A?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const C=this.container.querySelector("#toggle-mod-vert-vel"),y=this.container.querySelector("#group-mod-vert-vel"),b=t.hasVerticalVelocity;C&&(C.textContent=b?"Enabled":"Disabled",C.classList.toggle("active",b)),y&&(y.style.display=b?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const f=this.container.querySelector("#toggle-mod-gravity"),S=this.container.querySelector("#note-mod-gravity");f&&(f.textContent=t.hasGravity?"Attached":"Detached",f.classList.toggle("active",t.hasGravity)),S&&(S.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const z=this.container.querySelector("#toggle-mod-roll"),F=this.container.querySelector("#group-mod-roll"),W=this.container.querySelector("#note-roll-friction"),$=!!(t.rollModule&&t.rollModule.enabled);if(z&&(z.textContent=$?"Attached":"Detached",z.classList.toggle("active",$)),F&&(F.style.display=$?"block":"none"),W&&(W.style.display=$&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),e){const u=this.container.querySelector("#toggle-walk"),G=this.container.querySelector("#group-mod-walking"),U=this.container.querySelector("#warn-walk-friction"),Y=this.container.querySelector("#warn-walk-strength"),Z=!!(this.character.walkingModule&&this.character.walkingModule.enabled);u&&(u.textContent=Z?"Attached":"Detached",u.classList.toggle("active",Z)),G&&(G.style.display=Z?"flex":"none"),U&&(U.style.display=Z&&!this.character.hasFriction?"block":"none"),Y&&(Y.style.display=Z&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const N=this.container.querySelector("#toggle-strength"),gt=this.container.querySelector("#group-mod-strength"),st=!!(this.character.strengthModule&&this.character.strengthModule.enabled);N&&(N.textContent=st?"Attached":"Detached",N.classList.toggle("active",st)),gt&&(gt.style.display=st?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const lt=this.container.querySelector("#toggle-pickup"),pt=this.container.querySelector("#group-mod-pickup"),ot=!!(this.character.pickupModule&&this.character.pickupModule.enabled);lt&&(lt.textContent=ot?"Attached":"Detached",lt.classList.toggle("active",ot)),pt&&(pt.style.display=ot?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const at=this.container.querySelector("#toggle-throw"),vt=this.container.querySelector("#group-mod-throw"),nt=!!(this.character.throwModule&&this.character.throwModule.enabled);at&&(at.textContent=nt?"Attached":"Detached",at.classList.toggle("active",nt)),vt&&(vt.style.display=nt?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const ct=this.container.querySelector("#toggle-climb"),bt=this.container.querySelector("#group-mod-climb"),rt=this.container.querySelector("#warn-climb-deps"),tt=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(ct&&(ct.textContent=tt?"Attached":"Detached",ct.classList.toggle("active",tt)),bt&&(bt.style.display=tt?"block":"none"),rt){const K=!this.character.hasVerticalPosition,_=!this.character.hasStrength;rt.style.display=tt&&(K||_)?"block":"none",rt.textContent=K?"⚠️ Requires Vertical Position (3D Z-axis)":_?"⚠️ Requires Strength Ability to climb":""}if(this.character.climbingModule){const K=this.container.querySelector("#toggle-climb-walkoff");if(K){const J=!!this.character.climbingModule.preventWalkOff;K.textContent=J?"Active":"Inactive",K.classList.toggle("active",J)}const _=this.container.querySelector("#toggle-climb-sideways");if(_){const J=!!this.character.climbingModule.horizontalClimb;_.textContent=J?"Active":"Inactive",_.classList.toggle("active",J)}this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1),this.setSliderVal("slide-climb-hang","val-climb-hang",this.character.climbingModule.hangDistance,2)}}}setSliderVal(t,e,s,i){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${e}`);l&&(l.value=s.toString()),o&&(o.textContent=i>0?s.toFixed(i):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,e=this.container.querySelector("#creator-name");e&&(e.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const i=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");i&&(i.value=t.color),l&&(l.textContent=t.color);const o=this.container.querySelector("#creator-toggle-collider"),n=this.container.querySelector("#grp-creator-radius");o&&(o.textContent=t.hasCollider?"Attached":"Detached",o.classList.toggle("active",t.hasCollider)),n&&(n.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),d=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const r=this.container.querySelector("#creator-toggle-friction"),h=this.container.querySelector("#grp-creator-fric");r&&(r.textContent=t.hasFriction?"Attached":"Detached",r.classList.toggle("active",t.hasFriction)),h&&(h.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const x=this.container.querySelector("#creator-toggle-bounce"),p=this.container.querySelector("#grp-creator-bounce"),m=this.container.querySelector("#creator-check-vert-bounce"),v=this.container.querySelector("#creator-warn-bounce-vert");x&&(x.textContent=t.hasBounce?"Attached":"Detached",x.classList.toggle("active",t.hasBounce)),p&&(p.style.display=t.hasBounce?"block":"none"),m&&(m.checked=t.verticalBounce),v&&(v.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const E=this.container.querySelector("#creator-toggle-vert-pos"),g=this.container.querySelector("#grp-creator-vert-pos");E&&(E.textContent=t.hasVerticalPosition?"Attached":"Detached",E.classList.toggle("active",t.hasVerticalPosition)),g&&(g.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const w=this.container.querySelector("#creator-toggle-vert-vel");w&&(w.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",w.classList.toggle("active",t.hasVerticalVelocity));const M=this.container.querySelector("#creator-toggle-gravity");M&&(M.textContent=t.hasGravity?"Attached":"Detached",M.classList.toggle("active",t.hasGravity));const P=this.container.querySelector("#creator-toggle-roll"),k=this.container.querySelector("#group-creator-roll-resist");P&&(P.textContent=t.hasRollModule?"Enabled":"Disabled",P.classList.toggle("active",t.hasRollModule)),k&&(k.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var F,W,$,D,R,V,q,j,I,X;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(F=this.container.querySelector("#submode-entities"))==null||F.addEventListener("click",()=>{this.setEditTool("entities")}),(W=this.container.querySelector("#submode-walls"))==null||W.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var G;const u=this.entitySelectorEl.value;if(u===this.character.id)this.selectedEntity=this.character;else{const U=this.objects.find(Y=>Y.id===u);U&&(this.selectedEntity=U)}this.updateSelectorOptions(),this.syncEntitySliders(),(G=this.onSelectionChange)==null||G.call(this,this.selectedEntity)}),($=this.container.querySelector("#btn-duplicate-entity"))==null||$.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(D=this.container.querySelector("#btn-delete-entity"))==null||D.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const e=this.container.querySelector("#toggle-mod-collider");e==null||e.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new dt({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",u=>{this.selectedEntity.colliderRadius=u},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new ht({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",u=>{this.selectedEntity.mass=u,this.updateSelectorOptions()},1);const i=this.container.querySelector("#toggle-mod-friction");i==null||i.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new ut,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",u=>{this.selectedEntity.staticGroundFrictionMod=u},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",u=>{this.selectedEntity.dynamicGroundFrictionMod=u},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new yt({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",u=>{this.selectedEntity.bounceMod=u},2);const o=this.container.querySelector("#check-mod-vert-bounce");o==null||o.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=o.checked),this.syncEntitySliders(),this.updateInspector()});const n=this.container.querySelector("#toggle-mod-vert-pos");n==null||n.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new ft({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",u=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=u),this.selectedEntity.position.z=u,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",u=>{this.selectedEntity.verticalVelocity=u},2);const d=this.container.querySelector("#toggle-mod-gravity");d==null||d.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new mt,this.syncEntitySliders()});const r=this.container.querySelector("#toggle-mod-roll");r==null||r.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new Mt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",u=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=u)},2);const h=this.container.querySelector("#toggle-walk");h==null||h.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new Wt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=u)},0),this.setupSlider("slide-walk-speed","val-walk-speed",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=u)},1);const x=this.container.querySelector("#toggle-strength");x==null||x.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new wt({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",u=>{this.character.strength=u},1);const p=this.container.querySelector("#toggle-pickup");p==null||p.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new Rt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",u=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=u)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",u=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=u)},2);const m=this.container.querySelector("#toggle-throw");m==null||m.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new Pt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",u=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=u)},1);const v=this.container.querySelector("#toggle-climb");v==null||v.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Ft,this.syncEntitySliders()});const E=this.container.querySelector("#toggle-climb-walkoff");E==null||E.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.preventWalkOff=!this.character.climbingModule.preventWalkOff),this.syncEntitySliders()});const g=this.container.querySelector("#toggle-climb-sideways");g==null||g.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.horizontalClimb=!this.character.climbingModule.horizontalClimb),this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",u=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=u)},0),this.setupSlider("slide-climb-speed","val-climb-speed",u=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=u)},1),this.setupSlider("slide-climb-hang","val-climb-hang",u=>{this.character.climbingModule&&(this.character.climbingModule.hangDistance=u)},2),this.setupSlider("slide-gravity","val-gravity",u=>{this.arena.gravity=u},1),this.setupSlider("slide-wall-height","val-wall-height",u=>{this.arena.setStandardWallHeight(u),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",u,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",u=>{this.arena.setStandardWallHeight(u),this.setSliderVal("slide-wall-height","val-wall-height",u,1)},1);const w=this.container.querySelector("#select-wall-preset");w==null||w.addEventListener("change",()=>{this.arena.loadWallPreset(w.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(R=this.container.querySelector("#btn-prev-wall-map"))==null||R.addEventListener("click",()=>{const u=Q.WALL_PRESETS,U=(u.findIndex(Y=>Y.id===this.arena.currentPresetId)-1+u.length)%u.length;this.arena.loadWallPreset(u[U].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(V=this.container.querySelector("#btn-next-wall-map"))==null||V.addEventListener("click",()=>{const u=Q.WALL_PRESETS,U=(u.findIndex(Y=>Y.id===this.arena.currentPresetId)+1)%u.length;this.arena.loadWallPreset(u[U].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(q=this.container.querySelector("#btn-reset-walls"))==null||q.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(j=this.container.querySelector("#btn-clear-walls"))==null||j.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",u=>{this.arena.frictionCoeff=u},1),this.setupSlider("slide-static-thresh","val-static-thresh",u=>{this.arena.staticFrictionThreshold=u},2),this.container.querySelectorAll(".preset-chip").forEach(u=>{u.addEventListener("click",()=>{const G=u.getAttribute("data-preset");G&&this.presets[G]&&(this.creatorState={...this.presets[G]},this.syncCreatorInputs())})});const P=this.container.querySelector("#creator-name");P==null||P.addEventListener("input",()=>{this.creatorState.name=P.value});const k=this.container.querySelector("#creator-toggle-shape");k==null||k.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",k.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",k.classList.toggle("active",this.creatorState.visualShape==="box")});const B=this.container.querySelector("#creator-color"),T=this.container.querySelector("#val-creator-color");B==null||B.addEventListener("input",()=>{this.creatorState.color=B.value,T&&(T.textContent=B.value)});const O=this.container.querySelector("#creator-toggle-collider");O==null||O.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,O.textContent=this.creatorState.hasCollider?"Attached":"Detached",O.classList.toggle("active",this.creatorState.hasCollider);const u=this.container.querySelector("#grp-creator-radius");u&&(u.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",u=>{this.creatorState.colliderRadius=u},2);const L=this.container.querySelector("#creator-toggle-mass");L==null||L.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,L.textContent=this.creatorState.hasMass?"Attached":"Detached",L.classList.toggle("active",this.creatorState.hasMass);const u=this.container.querySelector("#grp-creator-mass");u&&(u.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",u=>{this.creatorState.mass=u},1);const A=this.container.querySelector("#creator-toggle-friction");A==null||A.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,A.textContent=this.creatorState.hasFriction?"Attached":"Detached",A.classList.toggle("active",this.creatorState.hasFriction);const u=this.container.querySelector("#grp-creator-fric");u&&(u.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",u=>{this.creatorState.dynamicFrictionMod=u},2);const C=this.container.querySelector("#creator-toggle-bounce");C==null||C.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,C.textContent=this.creatorState.hasBounce?"Attached":"Detached",C.classList.toggle("active",this.creatorState.hasBounce);const u=this.container.querySelector("#grp-creator-bounce");u&&(u.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",u=>{this.creatorState.bounceMod=u},2);const y=this.container.querySelector("#creator-check-vert-bounce");y==null||y.addEventListener("change",()=>{this.creatorState.verticalBounce=y.checked,this.syncCreatorInputs()});const b=this.container.querySelector("#creator-toggle-vert-pos");b==null||b.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",u=>{this.creatorState.elevation=u},2);const f=this.container.querySelector("#creator-toggle-vert-vel");f==null||f.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const S=this.container.querySelector("#creator-toggle-gravity");S==null||S.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,S.textContent=this.creatorState.hasGravity?"Attached":"Detached",S.classList.toggle("active",this.creatorState.hasGravity)});const z=this.container.querySelector("#creator-toggle-roll");z==null||z.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,z.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",z.classList.toggle("active",this.creatorState.hasRollModule);const u=this.container.querySelector("#group-creator-roll-resist");u&&(u.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",u=>{this.creatorState.rollResistance=u},2),(I=this.container.querySelector("#btn-spawn-configured"))==null||I.addEventListener("click",()=>{this.spawnFromCreator()}),(X=this.container.querySelector("#btn-clear-entities"))==null||X.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,e=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),i=new it({name:t.name||"Custom Object",position:{x:e,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new dt({radius:t.colliderRadius}):null,massModule:t.hasMass?new ht({mass:t.mass}):null,frictionModule:t.hasFriction?new ut({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new yt({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new ft({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new mt:null,rollModule:t.hasRollModule?new Mt({rollResistance:t.rollResistance}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,e=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),i=new it({name:`${t.name} (Copy)`,position:{x:e,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new dt({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new ht({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new ut({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new yt({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new ft({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new mt({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new Mt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,e,s,i=0){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${e}`);!l||!o||l.addEventListener("input",()=>{const n=parseFloat(l.value);o.textContent=i>0?n.toFixed(i):Math.round(n).toString(),s(n)})}updateInspector(){var i;const t=this.selectedEntity,e=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
        <span class="inspect-v">${e} u/s</span>
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
        <span class="inspect-v">${(((i=this.character.climbingModule)==null?void 0:i.hangDistance)??.1).toFixed(2)} u</span>
      </div>
      `:""}
    `}renderWallPresetOptions(){return Q.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=Q.WALL_PRESETS.find(e=>e.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=Q.WALL_PRESETS.find(e=>e.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const e=this.container.querySelector("#label-wall-map-badge");e&&(e.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class zt{constructor(t){c(this,"arena");c(this,"character");c(this,"objects");c(this,"renderer");c(this,"inputManager");c(this,"devPanel");c(this,"isRunning",!1);c(this,"lastTime",0);c(this,"accumulator",0);c(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let e=(t-this.lastTime)/1e3;for(this.lastTime=t,e>.2&&(e=.2),this.accumulator+=e;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const i=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,i,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const e=this.inputManager;e.draggedEntity!==this.character?this.character.updateCharacter(t,e.movementVector,e.isMouseDown&&!this.devPanel.isEditMode,e.mousePos,this.arena,e.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const i of this.objects)e.draggedEntity!==i&&i.updatePosition(t,this.arena);const s=e.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const i=this.character.pickupModule.findTargetObject(this.character,e.mousePos.x,e.mousePos.y,this.objects,this.arena.wallHeight);i&&(this.character.pickupModule.pickup(this.character,i),e.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],e=this.inputManager,s=3;for(let i=0;i<s;i++)for(let l=0;l<t.length;l++)for(let o=l+1;o<t.length;o++){const n=t[l],a=t[o];if(n.isHeld||a.isHeld||n===e.draggedEntity||a===e.draggedEntity||!n.hasCollider||!a.hasCollider)continue;const d=this.arena.wallHeight-.15,r=n.position.z>=d||n.supportingSurfaceHeight>=d||n.standingWall!==null||n.isAboveWalls,h=a.position.z>=d||a.supportingSurfaceHeight>=d||a.standingWall!==null||a.isAboveWalls;if(r!==h)continue;const x=a.position.x-n.position.x,p=a.position.y-n.position.y,m=x*x+p*p,v=n.colliderRadius+a.colliderRadius;if(m<v*v&&m>1e-6){const E=Math.sqrt(m),g=v-E,w=x/E,M=p/E,P=a.velocity.x-n.velocity.x,k=a.velocity.y-n.velocity.y,B=P*w+k*M,T=!n.hasMass,O=!a.hasMass;if(T&&O){if(n.position.x-=w*g*.5,n.position.y-=M*g*.5,a.position.x+=w*g*.5,a.position.y+=M*g*.5,B<0){const f=-B*.5;n.velocity.x-=f*w,n.velocity.y-=f*M,a.velocity.x+=f*w,a.velocity.y+=f*M}continue}if(!T&&O){this.isEntityPinnedAgainstWall(a,w,M)?(n.position.x-=w*g,n.position.y-=M*g,n.velocity.x=0,n.velocity.y=0):(a.position.x+=w*g,a.position.y+=M*g,B<0&&(a.velocity.x+=(n.velocity.x-a.velocity.x)*Math.abs(w),a.velocity.y+=(n.velocity.y-a.velocity.y)*Math.abs(M)));continue}if(T&&!O){this.isEntityPinnedAgainstWall(n,-w,-M)?(a.position.x+=w*g,a.position.y+=M*g,a.velocity.x=0,a.velocity.y=0):(n.position.x-=w*g,n.position.y-=M*g,B<0&&(n.velocity.x+=(a.velocity.x-n.velocity.x)*Math.abs(w),n.velocity.y+=(a.velocity.y-n.velocity.y)*Math.abs(M)));continue}const L=1/n.mass,A=1/a.mass,C=L+A;if(C<=1e-4)continue;const y=L/C,b=A/C;if(n.position.x-=w*g*y,n.position.y-=M*g*y,a.position.x+=w*g*b,a.position.y+=M*g*b,B<0){const f=n instanceof xt&&n.isActivelyWalking||a instanceof xt&&a.isActivelyWalking,S=n.hasBounce&&a.hasBounce,z=n.isCharacter||!n.hasBounce?0:n.bounceMod??0,F=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,$=-(1+(f||!S?0:Math.max(0,Math.min(.98,Math.max(z,F)))))*B/C;n.velocity.x-=$*L*w,n.velocity.y-=$*L*M,a.velocity.x+=$*A*w,a.velocity.y+=$*A*M;const D=-M,R=w,V=P*D+k*R;if(Math.abs(V)>.001){const q=.35*Math.sqrt(n.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),j=.4,I=Math.abs(V)/(C*(1+1/j)),X=q*Math.abs($),u=Math.min(I,X)*Math.sign(V);if(n.velocity.x+=u*L*D,n.velocity.y+=u*L*R,a.velocity.x-=u*A*D,a.velocity.y-=u*A*R,n.rollModule&&n.rollModule.enabled){const G=u/(j*n.mass*n.colliderRadius);n.rollModule.angularVelocity.z+=G,n.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,n.rollModule.angularVelocity.z)),n.isRestingOnSurface&&(n.rollModule.angularVelocity.y=n.velocity.x/n.colliderRadius,n.rollModule.angularVelocity.x=-n.velocity.y/n.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const G=u/(j*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=G,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,e,s){const i=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(e>.3&&t.position.x>=this.arena.width-i-l||e<-.3&&t.position.x<=i+l||s>.3&&t.position.y>=this.arena.height-i-l||s<-.3&&t.position.y<=i+l)return!0;for(const o of this.arena.walls)if(t.position.z<o.wallHeight-.05){const n=t.position.x+e*l,a=t.position.y+s*l,d=Math.max(o.x,Math.min(n,o.x+o.width)),r=Math.max(o.y,Math.min(a,o.y+o.height)),h=n-d,x=a-r;if(h*h+x*x<i*i)return!0}return!1}}function Bt(){const H=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!H||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const e=H.getContext("2d");if(!e){console.error("Failed to acquire 2D canvas context");return}const s=new Q(20,14,1);H.width=1e3,H.height=700;const i=new xt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new it({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new it({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new it({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new it({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new Mt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})];s.syncEntitiesWithWalls([i,...l]);const o=new et(e),n=new Lt({container:t,character:i,arena:s,objects:l,onSpawnObject:r=>{s.syncEntitiesWithWalls([r]),l.push(r),n.updateSelectorOptions()},onDeleteObject:r=>{const h=l.indexOf(r);h!==-1&&l.splice(h,1),n.updateSelectorOptions()},onClearObjects:()=>{i.heldObject&&(i.heldObject.isHeld=!1,i.heldObject.heldBy=null,i.heldObject=null),l.length=0,n.updateSelectorOptions()}}),a=new Dt(H,s);a.handleInteractions(i,s,l,n),n.onSelectionChange=r=>{a.selectedCanvasEntity=r},new zt({arena:s,character:i,objects:l,renderer:o,inputManager:a,devPanel:n}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",Bt);

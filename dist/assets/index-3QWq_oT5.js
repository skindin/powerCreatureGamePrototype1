var Rt=Object.defineProperty;var $t=(B,t,i)=>t in B?Rt(B,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):B[t]=i;var r=(B,t,i)=>$t(B,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const l of e)if(l.type==="childList")for(const n of l.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function i(e){const l={};return e.integrity&&(l.integrity=e.integrity),e.referrerPolicy&&(l.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?l.credentials="include":e.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(e){if(e.ep)return;e.ep=!0;const l=i(e);fetch(e.href,l)}})();class rt{constructor(t={}){r(this,"z");r(this,"hasVerticalVelocity");r(this,"verticalVelocity");r(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const xt=class xt{constructor(t=20,i=14,s=1){r(this,"width");r(this,"height");r(this,"tileSize");r(this,"cols");r(this,"rows");r(this,"wallHeight");r(this,"gravity");r(this,"frictionCoeff");r(this,"staticFrictionThreshold");r(this,"tileGrid");r(this,"walls",[]);r(this,"currentPresetId","standard");this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("standard")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,i,s){if(t<0||t>=this.cols||i<0||i>=this.rows)return!1;const e=s?1:0;return this.tileGrid[i][t]===e?!1:(this.tileGrid[i][t]=e,this.rebuildWalls(),!0)}hasWall(t,i){return t<0||t>=this.cols||i<0||i>=this.rows?!1:this.tileGrid[i][t]===1}loadWallPreset(t,i){const s=xt.WALL_PRESETS.find(e=>e.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(i),!0):!1}syncEntitiesWithWalls(t){var i;if(t)for(const s of t){const e=s.hasCollider?s.colliderRadius:((i=s.colliderModule)==null?void 0:i.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,e);l&&s.position.z<l.wallHeight&&(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new rt({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.verticalVelocity=0)}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("standard",t)}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),n=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,a=i-n;return o*o+a*a<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}};r(xt,"WALL_PRESETS",[{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=10;for(let l=1;l<=4;l++)s[l][e]=1;for(let l=8;l<=12;l++)s[l][e]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>1));for(let e=2;e<=17;e++)s[3][e]=0,s[7][e]=0,s[10][e]=0;for(let e=2;e<=11;e++)s[e][5]=0,s[e][10]=0,s[e][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let e=5;e<=9;e++)s[e][2]=0;for(let e=5;e<=9;e++)s[e][17]=0;for(let e=2;e<=5;e++)s[5][e]=0;for(let e=10;e<=14;e++)s[5][e]=0;for(let e=5;e<=10;e++)s[9][e]=0;for(let e=14;e<=17;e++)s[9][e]=0;return s[7][5]=0,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=2;e<=4;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=9;e<=11;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=6;e<=7;e++)for(let l=9;l<=10;l++)s[e][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,n]of e)s[n][l]=1,s[n+1][l]=1,s[n][l+1]=1,s[n+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=1;e<=9;e++)s[e][4]=1;for(let e=4;e<=12;e++)s[e][7]=1;for(let e=1;e<=9;e++)s[e][10]=1;for(let e=4;e<=12;e++)s[e][13]=1;for(let e=1;e<=9;e++)s[e][16]=1;for(let e=7;e<=10;e++)s[4][e]=1;for(let e=13;e<=16;e++)s[4][e]=1;for(let e=4;e<=7;e++)s[9][e]=1;for(let e=10;e<=13;e++)s[9][e]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,i)=>Array.from({length:i},()=>Array.from({length:t},()=>0))}]);let Q=xt;class dt{constructor(t={}){r(this,"radius");r(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class ht{constructor(t={}){r(this,"mass");r(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class ut{constructor(t={}){r(this,"staticFrictionMod");r(this,"dynamicFrictionMod");r(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class yt{constructor(t={}){r(this,"bounceMod");r(this,"verticalBounce");r(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class ft{constructor(t={}){r(this,"enabled");this.enabled=t.enabled??!0}}class K{constructor(t={}){r(this,"id");r(this,"name");r(this,"position");r(this,"velocity");r(this,"color");r(this,"isHeld");r(this,"heldBy");r(this,"lastThrower",null);r(this,"isCharacter",!1);r(this,"isClimbing",!1);r(this,"visualShape","circle");r(this,"colliderModule",null);r(this,"massModule",null);r(this,"frictionModule",null);r(this,"bounceModule",null);r(this,"verticalPositionModule",null);r(this,"gravityModule",null);r(this,"rollModule",null);r(this,"supportingSurfaceHeight",0);var i,s,e,l,n;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((n=t.velocity)==null?void 0:n.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new dt({radius:t.colliderRadius}):new dt({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new ht({mass:t.mass}):new ht({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new ut({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new yt({bounceMod:t.bounceMod}):new yt({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new rt({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new ft,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new dt({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new ht({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new ut({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new ut({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new yt({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.95||this.supportingSurfaceHeight>=.95)}updatePosition(t,i){var M,p,v,x,S,g;if(this.isHeld)return;if(this.lastThrower){const f=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,h=(((M=this.lastThrower.pickupModule)==null?void 0:M.pickupReach)??1.3)+this.colliderRadius+f;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>h||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0,e=null;if(this.hasCollider&&this.hasVerticalPosition&&i.walls.length>0&&(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05&&this.position.z>=i.wallHeight-.2)){const h=this.isCharacter?this:null;!!((p=h==null?void 0:h.climbingModule)!=null&&p.climbSuppressedUntilRePress)?(e=i.getWallAt(this.position.x,this.position.y),e&&(s=e.wallHeight)):(e=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius),e&&(s=e.wallHeight))}if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const f=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const h=this.rollModule,b=this.colliderRadius>0?this.colliderRadius:.3,m=.4,w=this.bounceMod,k=(1+w)*this.mass*f,P=i.frictionCoeff*this.dynamicGroundFrictionMod*.05,E=this.velocity.x-h.angularVelocity.y*b,C=this.velocity.y+h.angularVelocity.x*b,V=Math.hypot(E,C);if(V>.001&&P>0){const $=P*k,W=V*this.mass/(1+1/m),F=Math.min(W,$),z=E/V*F,D=C/V*F;this.velocity.x-=z/this.mass,this.velocity.y-=D/this.mass,h.angularVelocity.y+=z/(m*this.mass*b),h.angularVelocity.x-=D/(m*this.mass*b)}const R=Math.max(.65,1-(1-w)*.35);h.angularVelocity.x*=R,h.angularVelocity.y*=R,h.angularVelocity.z*=R}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((v=this.walkingModule)==null?void 0:v.enabled)))if(this.rollModule&&this.rollModule.enabled){const h=this.rollModule,b=this.colliderRadius>0?this.colliderRadius:.3,m=i.frictionCoeff*this.dynamicGroundFrictionMod,w=.4,k=this.velocity.x-h.angularVelocity.y*b,P=this.velocity.y+h.angularVelocity.x*b,E=Math.hypot(k,P);if(m>0&&E>.001){const V=m*(1+1/w)*t;if(E<=V){const R=this.velocity.x+w*h.angularVelocity.y*b,$=this.velocity.y-w*h.angularVelocity.x*b,W=R/(1+w),F=$/(1+w);this.velocity.x=W,this.velocity.y=F,h.angularVelocity.y=W/b,h.angularVelocity.x=-F/b}else{const R=k/E*m*t,$=P/E*m*t;this.velocity.x-=R,this.velocity.y-=$,h.angularVelocity.y+=R/(w*b),h.angularVelocity.x-=$/(w*b)}}const C=Math.hypot(this.velocity.x,this.velocity.y);if(C>0){if(h.rollResistance>0){const V=h.rollResistance*t,R=Math.max(0,C-V);if(R<.005)this.velocity.x=0,this.velocity.y=0,h.angularVelocity.x=0,h.angularVelocity.y=0;else{const $=R/C;this.velocity.x*=$,this.velocity.y*=$,h.angularVelocity.x*=$,h.angularVelocity.y*=$}}}else{const V=Math.hypot(h.angularVelocity.x,h.angularVelocity.y);if(V>0&&m>0){const R=m/(w*b)*t,$=Math.max(0,V-R),W=V>0?$/V:0;h.angularVelocity.x*=W,h.angularVelocity.y*=W}}if(Math.abs(h.angularVelocity.z)>.001&&h.rollResistance>0){const V=h.rollResistance/(w*b)*t,R=Math.sign(h.angularVelocity.z),$=Math.abs(h.angularVelocity.z);h.angularVelocity.z=$<=V?0:R*($-V)}h.updateVisualPhase(t)}else{const h=Math.hypot(this.velocity.x,this.velocity.y);if(h>0){const b=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(h<b)this.velocity.x=0,this.velocity.y=0;else{const m=i.frictionCoeff*this.dynamicGroundFrictionMod*t,k=Math.max(0,h-m)/h;this.velocity.x*=k,this.velocity.y*=k}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);const n=this.isCharacter?this:null,o=!this.isClimbing&&this.supportingSurfaceHeight>=i.wallHeight-.05,a=!!(o&&(n!=null&&n.isClimbInputHeld)&&!((x=n==null?void 0:n.climbingModule)!=null&&x.dismountSuppressedUntilRelease));if(!!(n&&o&&((S=n.climbingModule)!=null&&S.enabled)&&((g=n.climbingModule)!=null&&g.preventWalkOff)&&!a))if(i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius)){const h=this.position.x+this.velocity.x*t,b=this.position.y+this.velocity.y*t;if(i.getSupportingWall(h,b,this.colliderRadius))this.position.x=h,this.position.y=b;else{const w=K.getClosestWallPoint(h,b,i);if(w&&w.dist>0){const k=this.colliderRadius,P=w.dx/w.dist,E=w.dy/w.dist,C=this.velocity.x*P+this.velocity.y*E;C>0&&(this.velocity.x-=C*P,this.velocity.y-=C*E);const V=k-.002;w.dist>V?(this.position.x=w.closestX+P*V,this.position.y=w.closestY+E*V):(this.position.x=h,this.position.y=b)}else this.velocity.x=0,this.velocity.y=0}}else this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t;else this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t,n&&o&&a&&!i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius)&&n.climbingModule&&(n.climbingModule.climbSuppressedUntilRelease=!0);if(this.hasCollider){const f=this.colliderRadius,h=f,b=i.width-f,m=f,w=i.height-f,k=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<h?(this.position.x=h,this.resolveWallImpact(1,0,k)):this.position.x>b&&(this.position.x=b,this.resolveWallImpact(-1,0,k)),this.position.y<m?(this.position.y=m,this.resolveWallImpact(0,1,k)):this.position.y>w&&(this.position.y=w,this.resolveWallImpact(0,-1,k));for(const P of i.walls)this.position.z<P.wallHeight-.05&&this.resolveWallCollision(P)}const c=16,u=Math.hypot(this.velocity.x,this.velocity.y);if(u>c){const f=c/u;this.velocity.x*=f,this.velocity.y*=f}if(this.rollModule&&this.rollModule.enabled){const h=this.rollModule.angularSpeed;if(h>35){const b=35/h;this.rollModule.angularVelocity.x*=b,this.rollModule.angularVelocity.y*=b,this.rollModule.angularVelocity.z*=b}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}static getClosestWallPoint(t,i,s){if(!s.walls||s.walls.length===0)return null;let e=1/0,l=null;for(const n of s.walls){const o=Math.max(n.x,Math.min(t,n.x+n.width)),a=Math.max(n.y,Math.min(i,n.y+n.height)),d=t-o,c=i-a,u=d*d+c*c;u<e&&(e=u,l={wall:n,closestX:o,closestY:a,dist:Math.sqrt(u),dx:d,dy:c})}return l}resolveWallImpact(t,i,s){this.lastThrower=null;const e=this.velocity.x*t+this.velocity.y*i;if(e>=0)return;const l=e;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*i):(this.velocity.x-=l*t,this.velocity.y-=l*i),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const n=this.rollModule,o=this.colliderRadius>0?this.colliderRadius:.3,a=.4,d=.35,c=-i,u=t,M=this.velocity.x*c+this.velocity.y*u,p=-(1+s)*this.mass*l,v=M-n.angularVelocity.z*o,x=Math.abs(v)*this.mass/(1+1/a),S=d*p,g=Math.min(x,S),f=-Math.sign(v)*g,h=M,b=h+f/this.mass,m=Math.abs(b)<=Math.abs(h)+.01?b-h:-h*.1;this.velocity.x+=m*c,this.velocity.y+=m*u;const k=-(m*this.mass)/(a*this.mass*o);n.angularVelocity.z+=k,n.angularVelocity.z=Math.max(-30,Math.min(30,n.angularVelocity.z)),n.angularVelocity.y=this.velocity.x/o,n.angularVelocity.x=-this.velocity.y/o}}resolveWallCollision(t){if(!this.hasCollider)return;const i=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),e=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,n=this.position.y-e,o=l*l+n*n;if(o<i*i){this.lastThrower=null;const a=Math.sqrt(o);let d=0,c=0,u=0;if(a===0){const p=Math.abs(this.position.x-t.x),v=Math.abs(t.x+t.width-this.position.x),x=Math.abs(this.position.y-t.y),S=Math.abs(t.y+t.height-this.position.y),g=Math.min(p,v,x,S);g===p?(d=-1,u=p+i):g===v?(d=1,u=v+i):g===x?(c=-1,u=x+i):(c=1,u=S+i)}else u=i-a,d=l/a,c=n/a;this.position.x+=d*u,this.position.y+=c*u;const M=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(d,c,M)}}}class Vt{constructor(){r(this,"id","walking");r(this,"name","Walking Module");r(this,"enabled",!0);r(this,"maxWalkForce",35);r(this,"maxWalkSpeed",5.2);r(this,"dragDamping",8.01)}update(t,i,s,e){var P;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((P=t.frictionModule)!=null&&P.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(i.x,i.y),n=l>.05;if(t.isActivelyWalking=n,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const d=e.frictionCoeff/10,c=a*d,M=t.carriedMass/(Math.max(.1,t.strength)*8),p=this.maxWalkSpeed/(1+M);let v=0,x=0;if(n){const E=i.x/l,C=i.y/l;v=E*p,x=C*p}const S=v-t.velocity.x,g=x-t.velocity.y,f=Math.hypot(S,g);if(f<.001){t.velocity.x=v,t.velocity.y=x;return}const h=Math.hypot(t.velocity.x,t.velocity.y),b=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),m=t.hasMass?Math.max(.2,t.baseMass):1,k=this.maxWalkForce*t.strength/m*c*s;if(f<=k||!n&&h<b)t.velocity.x=v,t.velocity.y=x;else{const E=k/f;t.velocity.x+=S*E,t.velocity.y+=g*E}}}class Et{constructor(){r(this,"id","pickup");r(this,"name","Pickup Ability");r(this,"enabled",!0);r(this,"pickupReach",1.3);r(this,"crossLayerReachRatio",.55)}isObjectInReach(t,i,s=1){var c;if(!this.enabled||i===t||i.isHeld||i.isCharacter||i.lastThrower===t)return!1;const e=t.position.z>=s-.05?1:0,l=i.position.z>=s-.05?1:0,o=e!==l?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,a=i.hasCollider?i.colliderRadius:((c=i.colliderModule)==null?void 0:c.radius)??.32;return Math.hypot(i.position.x-t.position.x,i.position.y-t.position.y)<=o+a}findTargetObject(t,i,s,e,l=1){if(!this.enabled)return null;let n=null,o=1/0;for(const a of e){if(!this.isObjectInReach(t,a,l))continue;const d=Math.hypot(a.position.x-i,a.position.y-s);d<o&&(o=d,n=a)}return n}pickup(t,i){if(!this.enabled||t.heldObject)return!1;const s=i.velocity.x,e=i.velocity.y,l=i.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=e*l,t.isAboveGround&&Math.abs(i.verticalVelocity)>.1&&(t.verticalVelocity+=i.verticalVelocity*l),t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=i.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const i=t.heldObject;return t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.velocity.x=t.velocity.x*.4,i.velocity.y=t.velocity.y*.4,i.verticalVelocity=0,i}}class Ct{constructor(){r(this,"id","throw");r(this,"name","Throw Ability");r(this,"enabled",!0);r(this,"baseThrowForce",7.6);r(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),n=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,a=i-n;return o*o+a*a<s*s}computeLaunchVelocity(t,i,s,e,l,n,o,a=!0,d=!0,c=.35){const u=e-t,M=l-i,p=Math.hypot(u,M);if(p<.1)return null;const v=Math.min(p,this.maxThrowAimDistance),x=u/p,S=M/p,g=t+x*v,f=i+S*v;if(!a||!d){const F=Math.max(3,o),z=Math.max(.14,v/F),D=x*F,O=S*F;return{vx:D,vy:O,vz:0,totalTime:z,finalTargetX:g,finalTargetY:f,targetSurfaceHeight:s}}const h=n.getSupportingSurfaceHeight(g,f),b=h-s,m=Math.max(3,o);let k=Math.max(.14,v/m);b>0&&(k=Math.max(k,Math.sqrt(2*b/n.gravity)));const P=40,E=c>0?c:.35,C=.25;for(let F=1;F<P;F++){const z=F/P,D=t+(g-t)*z,O=i+(f-i)*z;for(const A of n.walls)if(this.testWallIntersection(D,O,E,A)){if(h>0&&g>=A.x&&g<=A.x+A.width&&f>=A.y&&f<=A.y+A.height&&z>.65)continue;const q=(1-z)*s+z*h,I=A.wallHeight+C-q;if(I>0){const j=n.gravity*z*(1-z);if(j>.001){const G=2*I/j;if(G>0){const U=Math.sqrt(G);U>k&&(k=U)}}}}}if(k<=.05)return null;const V=(b+.5*n.gravity*k*k)/k,R=v/k,$=x*R,W=S*R;return{vx:$,vy:W,vz:V,totalTime:k,finalTargetX:g,finalTargetY:f,targetSurfaceHeight:h}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,n=l.position.x,o=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,c=l.hasGravity&&l.hasVerticalVelocity,u=this.computeLaunchVelocity(n,o,a,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!u)return null;const{vx:M,vy:p,vz:v,totalTime:x,finalTargetX:S,finalTargetY:g,targetSurfaceHeight:f}=u,h=90,b=x/h,m=[];let w=!1,k=f>0,P;for(let C=0;C<=h;C++){const V=C*b,R=C===h?S:n+M*V,$=C===h?g:o+p*V,W=c?a+v*V-.5*e.gravity*V*V:a,F=c?C===h?f:Math.max(f,W):a,z=c?v-e.gravity*V:0,D=F>e.wallHeight;let O=!1,A=!1;for(const T of e.walls)if(this.testWallIntersection(R,$,l.colliderRadius,T)&&(O=!0,F<=T.wallHeight+.001)){if(m.length>0&&m[m.length-1].z>=T.wallHeight-.05&&z<=0){if(f>0&&(C>=h-2||Math.hypot(R-S,$-g)<.2)){k=!0;break}else if(f===0){k=!0,A=!0,w=!0,P=T.id;break}}else if(F<T.wallHeight-.05){A=!0,w=!0,P=T.id;break}}if(m.push({x:R,y:$,z:F,t:V,couldClearWall:D,isOverWall:O,collidesWall:A}),A)break}const E=m[m.length-1];return{points:m,landPoint:{x:w?E.x:S,y:w?E.y:g},isBlockedByWall:w,isLandingOnWallTop:w?k:f>0,blockedAtWallId:P}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,n=l.position.x,o=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,c=this.computeLaunchVelocity(n,o,a,i,s,e,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!c)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=c.vx,l.velocity.y=c.vy,l.verticalVelocity=c.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const S=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=c.vx/S,l.rollModule.angularVelocity.x=-c.vy/S}const u=l.hasMass?l.mass:0,M=t.hasMass?Math.max(.2,t.baseMass):0,p=u>0&&M>0?u/M:0;t.heldObject=null;const v=c.vx-t.velocity.x,x=c.vy-t.velocity.y;if(t.velocity.x-=v*p,t.velocity.y-=x*p,t.isAboveGround&&l.hasVerticalVelocity){const S=c.vz-t.verticalVelocity;t.verticalVelocity-=S*p}return l}}class Pt{constructor(t){r(this,"id","climbing");r(this,"name","Climbing Module");r(this,"enabled",!0);r(this,"maxAdhesion",35);r(this,"maxClimbSpeed",3);r(this,"preventWalkOff",!0);r(this,"horizontalClimb",!1);r(this,"dismountSuppressedUntilRelease",!1);r(this,"climbSuppressedUntilRelease",!1);r(this,"wasClimbHeldLastTick",!1);(t==null?void 0:t.maxAdhesion)!==void 0&&(this.maxAdhesion=t.maxAdhesion),(t==null?void 0:t.maxClimbSpeed)!==void 0&&(this.maxClimbSpeed=t.maxClimbSpeed),(t==null?void 0:t.preventWalkOff)!==void 0&&(this.preventWalkOff=t.preventWalkOff),(t==null?void 0:t.horizontalClimb)!==void 0&&(this.horizontalClimb=t.horizontalClimb)}get climbSuppressedUntilRePress(){return this.climbSuppressedUntilRelease}set climbSuppressedUntilRePress(t){this.climbSuppressedUntilRelease=t}update(t,i,s,e,l){const n=s&&!this.wasClimbHeldLastTick;if(this.wasClimbHeldLastTick=s,s||(this.dismountSuppressedUntilRelease=!1,this.climbSuppressedUntilRelease=!1),t.position.z<=.01&&(this.climbSuppressedUntilRelease=!1),this.climbSuppressedUntilRelease||!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const o=t.hasCollider?t.colliderRadius:.44,a=Math.hypot(i.x,i.y),d=a>=.05,c=d?i.x/a:0,u=d?i.y/a:0;if(t.position.z>=l.wallHeight-.05&&!this.dismountSuppressedUntilRelease&&n){const b=d?c:Math.cos(t.facingAngle),m=d?u:Math.sin(t.facingAngle);return t.velocity.x=b*3.5,t.velocity.y=m*3.5,this.climbSuppressedUntilRelease=!0,t.isClimbing=!1,!1}let M=null,p=1/0,v=0,x=0,S=0;for(const b of l.walls){const m=Math.max(b.x,Math.min(t.position.x,b.x+b.width)),w=Math.max(b.y,Math.min(t.position.y,b.y+b.height)),k=m-t.position.x,P=w-t.position.y,E=Math.hypot(k,P);E<=o+.15&&E<p&&(p=E,M=b,v=d?c*k+u*P:0,x=k,S=P)}if(!M)return t.isClimbing=!1,!1;const g=t.mass;if(g*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;if((t.isClimbing||t.position.z>.05)&&t.position.z<M.wallHeight){const b=p>.001?x/p:0,m=p>.001?S/p:0,w=-m,k=b,P=d?c*b+u*m:0,E=d?c*w+u*k:0;if(d&&(P<-.3||!this.horizontalClimb&&v<-.1))return t.isClimbing=!1,t.velocity.x=c*3,t.velocity.y=u*3,!1;if(t.isClimbing=!0,t.verticalVelocity=0,this.horizontalClimb&&d&&Math.abs(E)>=.1){const C=t.baseMass,V=Math.max(.5,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*C*t.strength/Math.max(.1,g)));t.velocity.x=w*E*V,t.velocity.y=k*E*V}else t.velocity.x=0,t.velocity.y=0;if(s){const C=t.baseMass,V=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*C*t.strength/Math.max(.1,g)));if(t.position.z+=V*e,t.position.z>=M.wallHeight)if(t.position.z=M.wallHeight,t.supportingSurfaceHeight=M.wallHeight,t.verticalVelocity=0,t.isClimbing=!1,this.dismountSuppressedUntilRelease=!0,d)t.velocity.x=c*3.5,t.velocity.y=u*3.5;else{const R=p>.001?x/p:0,$=p>.001?S/p:0;t.velocity.x=R*1.5,t.velocity.y=$*1.5}}return!0}if(s&&d&&v>.01&&t.position.z<M.wallHeight){t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const b=t.baseMass,m=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*b*t.strength/Math.max(.1,g)));return t.position.z+=m*e,!0}return t.isClimbing=!1,!1}}class St{constructor(t={}){r(this,"id","strength");r(this,"name","Strength Module");r(this,"enabled",!0);r(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class Mt extends K{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});r(this,"strengthModule");r(this,"facingAngle");r(this,"heldObject");r(this,"isCharacter",!0);r(this,"isActivelyWalking",!1);r(this,"isClimbInputHeld",!1);r(this,"baseMass",1.2);r(this,"walkingModule");r(this,"pickupModule");r(this,"throwModule");r(this,"climbingModule");r(this,"isAiming");r(this,"aimTarget");r(this,"activeTrajectory");this.baseMass=i.mass??1.2,this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new St({strength:i.strength??1}),this.walkingModule=new Vt,this.pickupModule=new Et,this.throwModule=new Ct,this.climbingModule=new Pt}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(i){this.strengthModule?this.strengthModule.strength=Math.max(.1,i):this.strengthModule=new St({strength:i})}get mass(){const i=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return i+s}set mass(i){this.baseMass=Math.max(.1,i),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,n=s.y-this.position.y;if(Math.hypot(l,n)>.1){this.facingAngle=Math.atan2(n,l);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,l,n,o=!1){if(this.isClimbInputHeld=o,this.climbingModule&&this.climbingModule.update(this,s,o,i,n),this.walkingModule&&this.walkingModule.update(this,s,i,n),this.updatePosition(i,n),this.updateFacingDirection(e,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,n):this.activeTrajectory=null}}class mt{constructor(t={}){r(this,"enabled",!0);r(this,"angularVelocity",{x:0,y:0,z:0});r(this,"rollResistance",.4);r(this,"visualPhase",0);var i,s,e;this.enabled=t.enabled??!0,this.angularVelocity={x:((i=t.angularVelocity)==null?void 0:i.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((e=t.angularVelocity)==null?void 0:e.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const i=this.angularSpeed;i>.001&&(this.visualPhase=(this.visualPhase+i*t)%(Math.PI*2))}}class Ft{constructor(t){r(this,"ctx");this.ctx=t}render(t,i,s,e,l=!1,n,o,a=!1,d){const c=this.ctx,u=c.canvas.width/t.width;c.clearRect(0,0,c.canvas.width,c.canvas.height),this.drawFloorGrid(t,u),this.drawWalls(t,u),a&&d&&this.drawWallEditorHover(t,d,u);const M=[i,...s];M.sort((p,v)=>Math.abs(p.position.z-v.position.z)>.001?p.position.z-v.position.z:Math.abs(p.verticalVelocity-v.verticalVelocity)>.001?p.verticalVelocity-v.verticalVelocity:p.position.y-v.position.y);for(const p of M)p instanceof Mt?this.drawCharacter(p,s,u):this.drawFreebodyObject(p,M,i,u,p===o,t.wallHeight);for(const p of M)this.drawObjectShadow(p,t,u);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,u),l&&(n&&n!==e&&this.drawHoverGizmo(n,u),e&&this.drawSelectionGizmo(e,l,u))}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawWallEditorHover(t,i,s){if(i.col<0||i.col>=t.cols||i.row<0||i.row>=t.rows)return;const e=this.ctx,l=i.col*t.tileSize*s,n=i.row*t.tileSize*s,o=t.tileSize*s,a=t.hasWall(i.col,i.row);e.save(),a?(e.fillStyle="rgba(239, 68, 68, 0.35)",e.strokeStyle="#ef4444",e.lineWidth=2.5,e.fillRect(l,n,o,o),e.strokeRect(l,n,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#fca5a5",e.textAlign="center",e.textBaseline="middle",e.fillText("✕ Erase",l+o/2,n+o/2)):(e.fillStyle="rgba(56, 189, 248, 0.3)",e.strokeStyle="#38bdf8",e.lineWidth=2.5,e.fillRect(l,n,o,o),e.strokeRect(l,n,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#7dd3fc",e.textAlign="center",e.textBaseline="middle",e.fillText("+ Draw",l+o/2,n+o/2)),e.restore()}drawObjectShadow(t,i,s){const e=this.ctx,l=t.position.x*s,n=t.position.y*s,o=t.position.z,a=1+o/i.wallHeight*1.5,d=t.colliderRadius*s*a,c=Math.max(.3,.85-o/(i.wallHeight*7)*.25),u=o>=i.wallHeight-.001;if(e.save(),e.beginPath(),t.visualShape==="box"){const M=d*2,p=Math.max(3,4*a);e.roundRect?e.roundRect(l-d,n-d,M,M,p):e.rect(l-d,n-d,M,M)}else e.arc(l,n,d,0,Math.PI*2);u?(e.strokeStyle=`rgba(56, 189, 248, ${c})`,e.lineWidth=2.5):(e.strokeStyle=`rgba(255, 255, 255, ${c})`,e.lineWidth=1.8),o>.01&&e.setLineDash([4,3]),e.stroke(),e.restore()}drawFreebodyObject(t,i,s,e,l=!1,n=1){var x,S;const o=this.ctx,a=t.position.x*e,d=t.position.y*e,u=(t.hasCollider?t.colliderRadius:((x=t.colliderModule)==null?void 0:x.radius)??.32)*e,p=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled&&!t.isHeld&&(((S=s.pickupModule)==null?void 0:S.isObjectInReach(s,t,n))??!1);if(p){if(o.save(),o.beginPath(),t.visualShape==="box"){const g=(u+5)*2;o.roundRect?o.roundRect(a-u-5,d-u-5,g,g,6):o.rect(a-u-5,d-u-5,g,g)}else o.arc(a,d,u+5,0,Math.PI*2);l?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",a,d-u-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}let v=!1;if(t.isAboveGround)for(const g of i){if(g===t)continue;if(Math.hypot(t.position.x-g.position.x,t.position.y-g.position.y)<t.colliderRadius+g.colliderRadius&&(t.position.z>g.position.z||Math.abs(t.position.z-g.position.z)<=.01&&t.verticalVelocity>g.verticalVelocity)){v=!0;break}}if(o.save(),o.globalAlpha=v?.55:1,t.visualShape==="box"){const g=u*2,f=Math.max(3,u*.16),h=a-u,b=d-u;o.beginPath(),o.roundRect?o.roundRect(h,b,g,g,f):o.rect(h,b,g,g),o.fillStyle=t.color,o.fill(),o.strokeStyle=p?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=p?2.5:2,o.stroke();const m=Math.max(3,u*.22);o.beginPath(),o.roundRect?o.roundRect(h+m,b+m,g-m*2,g-m*2,f*.7):o.rect(h+m,b+m,g-m*2,g-m*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(h+m,b+m),o.lineTo(h+g-m,b+g-m),o.moveTo(h+g-m,b+m),o.lineTo(h+m,b+g-m),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(a,d,u,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=p?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=p?2.5:2,o.stroke();this.drawRollIndicator(t,a,d,u),o.restore()}drawCharacter(t,i,s){const e=this.ctx,l=t.position.x*s,n=t.position.y*s,o=t.colliderRadius*s;let a=!1;if(t.isAboveGround)for(const f of i){if(f===t)continue;if(Math.hypot(t.position.x-f.position.x,t.position.y-f.position.y)<t.colliderRadius+f.colliderRadius&&(t.position.z>f.position.z||Math.abs(t.position.z-f.position.z)<=.01&&t.verticalVelocity>f.verticalVelocity)){a=!0;break}}e.save(),e.globalAlpha=a?.55:1,e.beginPath(),e.arc(l,n,o,0,Math.PI*2),e.fillStyle=t.color,e.fill(),e.strokeStyle="#ffffff",e.lineWidth=2.5,e.stroke(),this.drawRollIndicator(t,l,n,o);const d=.52,c=o*.72,u=Math.max(3.5,o*.18),M=t.facingAngle-d,p=t.facingAngle+d,v=l+Math.cos(M)*c,x=n+Math.sin(M)*c,S=l+Math.cos(p)*c,g=n+Math.sin(p)*c;e.fillStyle="#000000",e.beginPath(),e.arc(v,x,u,0,Math.PI*2),e.arc(S,g,u,0,Math.PI*2),e.fill(),t.heldObject&&(e.strokeStyle="rgba(255, 255, 255, 0.6)",e.setLineDash([3,3]),e.lineWidth=1.5,e.beginPath(),e.moveTo(l,n),e.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),e.stroke(),e.setLineDash([])),e.restore()}drawRollIndicator(t,i,s,e){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,n=l.angularVelocity.x,o=l.angularVelocity.y,a=l.angularVelocity.z,d=Math.hypot(n,o,a);if(d<.02)return;const c=this.ctx,M=Math.hypot(n,o)<.05*d;if(c.save(),M){const p=e*.45,v=e*.78;c.beginPath(),c.arc(i,s,p,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.45)",c.lineWidth=1.5,c.setLineDash([]),c.stroke(),c.beginPath(),c.arc(i,s,v,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*v*Math.sign(a||1),c.stroke()}else{const p=Math.atan2(-n,o),v=e*.82,x=Math.abs(a)/d,S=v*Math.pow(x,.85);c.translate(i,s),c.rotate(p);const g=a!==0?Math.sign(a):1;S<.5?(c.beginPath(),c.moveTo(-v,0),c.lineTo(v,0),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2.2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*v,c.stroke()):(c.beginPath(),c.ellipse(0,0,v,S,0,0,Math.PI),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2.2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*v*g,c.stroke(),c.beginPath(),c.ellipse(0,0,v,S,0,Math.PI,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.25)",c.lineWidth=1.8,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*v*g,c.stroke())}c.restore()}drawTrajectory(t,i){const s=this.ctx,e=t.points;if(e.length<2)return;s.save();for(let n=0;n<e.length-1;n++){const o=e[n],a=e[n+1];s.beginPath(),s.moveTo(o.x*i,o.y*i),s.lineTo(a.x*i,a.y*i),o.couldClearWall||a.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const l=e[e.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const n=8;s.beginPath(),s.moveTo(l.x*i-n,l.y*i-n),s.lineTo(l.x*i+n,l.y*i+n),s.moveTo(l.x*i+n,l.y*i-n),s.lineTo(l.x*i-n,l.y*i+n),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,i){var a;const s=this.ctx,e=t.position.x*i,l=t.position.y*i,o=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*i;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(e,l,o,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,i,s){var M;const e=this.ctx,l=t.position.x*s,n=t.position.y*s,d=(t.hasCollider?t.colliderRadius:((M=t.colliderModule)==null?void 0:M.radius)??.32)*s+6,c=Math.max(6,d*.4),u=i?"#fbbf24":"#38bdf8";if(e.save(),e.strokeStyle=u,e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.moveTo(l-d,n-d+c),e.lineTo(l-d,n-d),e.lineTo(l-d+c,n-d),e.stroke(),e.beginPath(),e.moveTo(l+d-c,n-d),e.lineTo(l+d,n-d),e.lineTo(l+d,n-d+c),e.stroke(),e.beginPath(),e.moveTo(l+d,n+d-c),e.lineTo(l+d,n+d),e.lineTo(l+d-c,n+d),e.stroke(),e.beginPath(),e.moveTo(l-d+c,n+d),e.lineTo(l-d,n+d),e.lineTo(l-d,n+d-c),e.stroke(),i){const p=`${t.name} (${t.mass.toFixed(1)}kg)`;e.font="bold 10px 'Segoe UI', system-ui, sans-serif";const x=e.measureText(p).width+12,S=16,g=l-x/2,f=n-d-S-4;e.fillStyle="rgba(15, 23, 42, 0.85)",e.strokeStyle=u,e.lineWidth=1,e.beginPath(),e.roundRect(g,f,x,S,4),e.fill(),e.stroke(),e.fillStyle=u,e.textAlign="center",e.textBaseline="middle",e.fillText(p,l,f+S/2)}e.restore()}}class Wt{constructor(t,i){r(this,"canvas");r(this,"arena");r(this,"keysPressed",new Set);r(this,"mousePos",{x:0,y:0});r(this,"isMouseDown",!1);r(this,"isRightMouseDown",!1);r(this,"hoverWallTile",null);r(this,"movementVector",{x:0,y:0});r(this,"justPickedUp",!1);r(this,"isThrowingPress",!1);r(this,"hoverEntity",null);r(this,"selectedCanvasEntity",null);r(this,"draggedEntity",null);r(this,"dragOffset",{x:0,y:0});r(this,"handleClick");r(this,"onMouseDown");r(this,"onRightMouseDown");r(this,"onMouseUp");r(this,"onRightClick");r(this,"onDropAttempt");r(this,"onMouseMove");this.canvas=t,this.arena=i,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){e&&(this.selectedCanvasEntity=e.selectedEntity);const l=(a,d,c=.35)=>{var p;for(let v=s.length-1;v>=0;v--){const x=s[v],S=x.hasCollider?x.colliderRadius:((p=x.colliderModule)==null?void 0:p.radius)??.32;if(Math.hypot(x.position.x-a,x.position.y-d)<=S+c)return x}const u=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-d)<=u+c?t:null},n=(a,d)=>{var u;if(a<0||a>=i.cols||d<0||d>=i.rows)return;if(i.setWallTile(a,d,!0)){const M={id:`wall-${a}-${d}`,x:a*i.tileSize,y:d*i.tileSize,width:i.tileSize,height:i.tileSize,wallHeight:i.wallHeight},p=[t,...s];for(const v of p){const x=v.hasCollider?v.colliderRadius:((u=v.colliderModule)==null?void 0:u.radius)??.32;i.testWallOverlap(v.position.x,v.position.y,x,M)&&v.position.z<i.wallHeight&&(v.hasVerticalPosition||(v.verticalPositionModule?v.verticalPositionModule.enabled=!0:v.verticalPositionModule=new rt({z:i.wallHeight,hasVerticalVelocity:!0})),v.position.z=i.wallHeight,v.supportingSurfaceHeight=i.wallHeight,v.verticalVelocity=0)}i.currentPresetId="custom",e==null||e.updateWallPresetUI()}},o=(a,d)=>{a<0||a>=i.cols||d<0||d>=i.rows||i.tileGrid[d][a]===1&&(i.setWallTile(a,d,!1),i.currentPresetId="custom",e==null||e.updateWallPresetUI())};this.onMouseDown=(a,d)=>{if(e!=null&&e.isEditMode){if(e.editTool==="walls"){const u=Math.floor(a/i.tileSize),M=Math.floor(d/i.tileSize);n(u,M);return}const c=l(a,d,.35);c?(this.selectedCanvasEntity=c,e.setSelectedEntity(c),this.draggedEntity=c,this.dragOffset.x=c.position.x-a,this.dragOffset.y=c.position.y-d,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"){const c=Math.floor(a/i.tileSize),u=Math.floor(d/i.tileSize);o(c,u)}},this.onMouseMove=(a,d)=>{var M;const c=Math.floor(a/i.tileSize),u=Math.floor(d/i.tileSize);if(c>=0&&c<i.cols&&u>=0&&u<i.rows?this.hoverWallTile={col:c,row:u}:this.hoverWallTile=null,e!=null&&e.isEditMode){if(e.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?n(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&o(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const p=a+this.dragOffset.x,v=d+this.dragOffset.y,x=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((M=this.draggedEntity.colliderModule)==null?void 0:M.radius)??.32;this.draggedEntity.position.x=Math.max(x,Math.min(i.width-x,p)),this.draggedEntity.position.y=Math.max(x,Math.min(i.height-x,v)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const p=l(a,d,.3);this.hoverEntity=p,this.canvas.style.cursor=p?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,d)=>{if(this.draggedEntity&&(this.draggedEntity=null),e!=null&&e.isEditMode)if(e.editTool==="walls")this.canvas.style.cursor="cell";else{const c=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=c,this.canvas.style.cursor=c?"grab":"crosshair"}},this.handleClick=(a,d)=>{if(!(e!=null&&e.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,d,i),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const c=t.pickupModule.findTargetObject(t,a,d,s,i.wallHeight);c&&(t.pickupModule.pickup(t,c),this.justPickedUp=!0)}}},this.onRightClick=(a,d)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"||!e)return;const c=l(a,d,.4);c&&(this.selectedCanvasEntity=c,e.setSelectedEntity(c))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,i.wallHeight);a&&t.pickupModule.pickup(t,a)}}}}class At{constructor(t){r(this,"container");r(this,"character");r(this,"arena");r(this,"objects");r(this,"onSpawnObject");r(this,"onDeleteObject");r(this,"onClearObjects");r(this,"selectedEntity");r(this,"isEditMode",!1);r(this,"editTool","entities");r(this,"onSelectionChange");r(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});r(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});r(this,"inspectorEl");r(this,"entitySelectorEl");r(this,"characterSpecificControlsEl");r(this,"objectSpecificControlsEl");r(this,"modePlayBtn");r(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var i;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(i=this.onSelectionChange)==null||i.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const i=this.container.querySelector("#edit-submode-container");i&&(i.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const i=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");i&&s&&(i.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const i=this.container.querySelector("#edit-hint-label");i&&(this.isEditMode?this.editTool==="walls"?i.textContent="Left-drag: Draw | Right-drag: Erase":i.textContent="Click & drag object in arena":i.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const e of this.objects){const l=e.id===t?"selected":"",n=e.visualShape==="box"?"📦":"⚪",o=e.hasMass?`${e.mass.toFixed(1)}kg`:"Massless";i+=`<option value="${e.id}" ${l}>${n} ${e.name} (${o})</option>`}this.entitySelectorEl.innerHTML=i;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,i,s,e,l,n,o,a,d,c,u,M,p,v,x,S,g,f,h,b,m,w,k,P,E,C,V,R,$,W,F,z,D,O,A,T,q,H,I,j,G,U,y,L,X,Y,_,et,pt,it,st,gt,lt,ot,vt,at,nt,bt,ct,tt,N,Z,J,wt,kt;this.container.innerHTML=`
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
                  <span id="val-entity-dynamic-fric">${(((u=this.selectedEntity.frictionModule)==null?void 0:u.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((M=this.selectedEntity.frictionModule)==null?void 0:M.dynamicFrictionMod)??1}">
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
              <button id="toggle-mod-bounce" class="btn-toggle ${(v=this.selectedEntity.bounceModule)!=null&&v.enabled?"active":""}">
                ${(x=this.selectedEntity.bounceModule)!=null&&x.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((S=this.selectedEntity.bounceModule)!=null&&S.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(g=this.selectedEntity.bounceModule)!=null&&g.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((f=this.selectedEntity.bounceModule)==null?void 0:f.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((h=this.selectedEntity.bounceModule)==null?void 0:h.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(b=this.selectedEntity.bounceModule)!=null&&b.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(m=this.selectedEntity.bounceModule)!=null&&m.enabled&&((w=this.selectedEntity.bounceModule)!=null&&w.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${(k=this.selectedEntity.bounceModule)!=null&&k.enabled?"none":"block"};">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(P=this.selectedEntity.rollModule)!=null&&P.enabled?"active":""}">
                ${(E=this.selectedEntity.rollModule)!=null&&E.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(C=this.selectedEntity.rollModule)!=null&&C.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(V=this.selectedEntity.rollModule)!=null&&V.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((R=this.selectedEntity.rollModule)==null?void 0:R.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${(($=this.selectedEntity.rollModule)==null?void 0:$.rollResistance)??.4}">
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
                <button id="toggle-walk" class="btn-toggle ${(W=this.character.walkingModule)!=null&&W.enabled?"active":""}">
                  ${(F=this.character.walkingModule)!=null&&F.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((z=this.character.walkingModule)!=null&&z.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&((D=this.character.walkingModule)!=null&&D.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(O=this.character.walkingModule)!=null&&O.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((A=this.character.walkingModule)==null?void 0:A.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((T=this.character.walkingModule)==null?void 0:T.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((q=this.character.walkingModule)==null?void 0:q.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((H=this.character.walkingModule)==null?void 0:H.maxWalkSpeed)??5.2}">
                </div>
              </div>
            </div>

            <!-- Strength Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>💪 Strength Ability</label>
                <button id="toggle-strength" class="btn-toggle ${(I=this.character.strengthModule)!=null&&I.enabled?"active":""}">
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
                  ${(y=this.character.pickupModule)!=null&&y.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(L=this.character.pickupModule)!=null&&L.enabled?"block":"none"};">
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
                    <span id="val-pickup-cross-layer">${(((_=this.character.pickupModule)==null?void 0:_.crossLayerReachRatio)??.55).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-pickup-cross-layer" min="0.10" max="1.00" step="0.05" value="${((et=this.character.pickupModule)==null?void 0:et.crossLayerReachRatio)??.55}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(pt=this.character.throwModule)!=null&&pt.enabled?"active":""}">
                  ${(it=this.character.throwModule)!=null&&it.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(st=this.character.throwModule)!=null&&st.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((gt=this.character.throwModule)==null?void 0:gt.baseThrowForce)??7.6).toFixed(1)}</span>
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
                    ${(N=this.character.climbingModule)!=null&&N.horizontalClimb?"Active":"Inactive"}
                  </button>
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Adhesion (N)</span>
                    <span id="val-climb-adhesion">${(((Z=this.character.climbingModule)==null?void 0:Z.maxAdhesion)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-climb-adhesion" min="5.0" max="80.0" step="1.0" value="${((J=this.character.climbingModule)==null?void 0:J.maxAdhesion)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Climb Speed (u/s)</span>
                    <span id="val-climb-speed">${(((wt=this.character.climbingModule)==null?void 0:wt.maxClimbSpeed)??3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${((kt=this.character.climbingModule)==null?void 0:kt.maxClimbSpeed)??3}">
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var T,q,H,I,j,G,U;const t=this.selectedEntity,i=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=i?"none":"flex");const e=this.container.querySelector("#toggle-entity-shape");e&&(t.visualShape==="box"?(e.textContent="Box 📦",e.classList.add("active")):(e.textContent="Circle ⚪",e.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),n=this.container.querySelector("#group-mod-collider"),o=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),n&&(n.style.display=t.hasCollider?"block":"none"),o&&(o.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((T=t.colliderModule)==null?void 0:T.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),d=this.container.querySelector("#group-mod-mass"),c=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),c&&(c.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((q=t.massModule)==null?void 0:q.mass)??1,1);const u=this.container.querySelector("#toggle-mod-friction"),M=this.container.querySelector("#group-mod-friction"),p=this.container.querySelector("#note-mod-friction"),v=this.container.querySelector("#warn-friction-mass"),x=!!(t.frictionModule&&t.frictionModule.enabled);u&&(u.textContent=x?"Attached":"Detached",u.classList.toggle("active",x)),M&&(M.style.display=x?"flex":"none"),p&&(p.style.display=x?"none":"block"),v&&(v.style.display=!t.hasMass&&x?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((H=t.frictionModule)==null?void 0:H.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((I=t.frictionModule)==null?void 0:I.dynamicFrictionMod)??1,2);const S=this.container.querySelector("#toggle-mod-bounce"),g=this.container.querySelector("#group-mod-bounce"),f=this.container.querySelector("#note-mod-bounce"),h=this.container.querySelector("#warn-bounce-mass"),b=!!(t.bounceModule&&t.bounceModule.enabled);S&&(S.textContent=b?"Attached":"Detached",S.classList.toggle("active",b)),g&&(g.style.display=b?"block":"none"),f&&(f.style.display=b?"none":"block"),h&&(h.style.display=!t.hasMass&&b?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const m=this.container.querySelector("#check-mod-vert-bounce"),w=this.container.querySelector("#warn-bounce-vert-vel");if(m&&(m.checked=!!((G=t.bounceModule)!=null&&G.verticalBounce)),w){const y=!!(b&&((U=t.bounceModule)!=null&&U.verticalBounce)&&!t.hasVerticalVelocity);w.style.display=y?"block":"none"}const k=this.container.querySelector("#toggle-mod-vert-pos"),P=this.container.querySelector("#group-mod-vert-pos"),E=this.container.querySelector("#note-mod-vert-pos"),C=t.hasVerticalPosition;k&&(k.textContent=C?"Attached":"Detached",k.classList.toggle("active",C)),P&&(P.style.display=C?"block":"none"),E&&(E.style.display=C?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const V=this.container.querySelector("#toggle-mod-vert-vel"),R=this.container.querySelector("#group-mod-vert-vel"),$=t.hasVerticalVelocity;V&&(V.textContent=$?"Enabled":"Disabled",V.classList.toggle("active",$)),R&&(R.style.display=$?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const W=this.container.querySelector("#toggle-mod-gravity"),F=this.container.querySelector("#note-mod-gravity");W&&(W.textContent=t.hasGravity?"Attached":"Detached",W.classList.toggle("active",t.hasGravity)),F&&(F.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const z=this.container.querySelector("#toggle-mod-roll"),D=this.container.querySelector("#group-mod-roll"),O=this.container.querySelector("#note-roll-friction"),A=!!(t.rollModule&&t.rollModule.enabled);if(z&&(z.textContent=A?"Attached":"Detached",z.classList.toggle("active",A)),D&&(D.style.display=A?"block":"none"),O&&(O.style.display=A&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),i){const y=this.container.querySelector("#toggle-walk"),L=this.container.querySelector("#group-mod-walking"),X=this.container.querySelector("#warn-walk-friction"),Y=this.container.querySelector("#warn-walk-strength"),_=!!(this.character.walkingModule&&this.character.walkingModule.enabled);y&&(y.textContent=_?"Attached":"Detached",y.classList.toggle("active",_)),L&&(L.style.display=_?"flex":"none"),X&&(X.style.display=_&&!this.character.hasFriction?"block":"none"),Y&&(Y.style.display=_&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const et=this.container.querySelector("#toggle-strength"),pt=this.container.querySelector("#group-mod-strength"),it=!!(this.character.strengthModule&&this.character.strengthModule.enabled);et&&(et.textContent=it?"Attached":"Detached",et.classList.toggle("active",it)),pt&&(pt.style.display=it?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const st=this.container.querySelector("#toggle-pickup"),gt=this.container.querySelector("#group-mod-pickup"),lt=!!(this.character.pickupModule&&this.character.pickupModule.enabled);st&&(st.textContent=lt?"Attached":"Detached",st.classList.toggle("active",lt)),gt&&(gt.style.display=lt?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const ot=this.container.querySelector("#toggle-throw"),vt=this.container.querySelector("#group-mod-throw"),at=!!(this.character.throwModule&&this.character.throwModule.enabled);ot&&(ot.textContent=at?"Attached":"Detached",ot.classList.toggle("active",at)),vt&&(vt.style.display=at?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const nt=this.container.querySelector("#toggle-climb"),bt=this.container.querySelector("#group-mod-climb"),ct=this.container.querySelector("#warn-climb-deps"),tt=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(nt&&(nt.textContent=tt?"Attached":"Detached",nt.classList.toggle("active",tt)),bt&&(bt.style.display=tt?"block":"none"),ct){const N=!this.character.hasVerticalPosition,Z=!this.character.hasStrength;ct.style.display=tt&&(N||Z)?"block":"none",ct.textContent=N?"⚠️ Requires Vertical Position (3D Z-axis)":Z?"⚠️ Requires Strength Ability to climb":""}if(this.character.climbingModule){const N=this.container.querySelector("#toggle-climb-walkoff");if(N){const J=!!this.character.climbingModule.preventWalkOff;N.textContent=J?"Active":"Inactive",N.classList.toggle("active",J)}const Z=this.container.querySelector("#toggle-climb-sideways");if(Z){const J=!!this.character.climbingModule.horizontalClimb;Z.textContent=J?"Active":"Inactive",Z.classList.toggle("active",J)}this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1)}}}setSliderVal(t,i,s,e){const l=this.container.querySelector(`#${t}`),n=this.container.querySelector(`#${i}`);l&&(l.value=s.toString()),n&&(n.textContent=e>0?s.toFixed(e):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,i=this.container.querySelector("#creator-name");i&&(i.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const e=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");e&&(e.value=t.color),l&&(l.textContent=t.color);const n=this.container.querySelector("#creator-toggle-collider"),o=this.container.querySelector("#grp-creator-radius");n&&(n.textContent=t.hasCollider?"Attached":"Detached",n.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),d=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const c=this.container.querySelector("#creator-toggle-friction"),u=this.container.querySelector("#grp-creator-fric");c&&(c.textContent=t.hasFriction?"Attached":"Detached",c.classList.toggle("active",t.hasFriction)),u&&(u.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const M=this.container.querySelector("#creator-toggle-bounce"),p=this.container.querySelector("#grp-creator-bounce"),v=this.container.querySelector("#creator-check-vert-bounce"),x=this.container.querySelector("#creator-warn-bounce-vert");M&&(M.textContent=t.hasBounce?"Attached":"Detached",M.classList.toggle("active",t.hasBounce)),p&&(p.style.display=t.hasBounce?"block":"none"),v&&(v.checked=t.verticalBounce),x&&(x.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const S=this.container.querySelector("#creator-toggle-vert-pos"),g=this.container.querySelector("#grp-creator-vert-pos");S&&(S.textContent=t.hasVerticalPosition?"Attached":"Detached",S.classList.toggle("active",t.hasVerticalPosition)),g&&(g.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const f=this.container.querySelector("#creator-toggle-vert-vel");f&&(f.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",f.classList.toggle("active",t.hasVerticalVelocity));const h=this.container.querySelector("#creator-toggle-gravity");h&&(h.textContent=t.hasGravity?"Attached":"Detached",h.classList.toggle("active",t.hasGravity));const b=this.container.querySelector("#creator-toggle-roll"),m=this.container.querySelector("#group-creator-roll-resist");b&&(b.textContent=t.hasRollModule?"Enabled":"Disabled",b.classList.toggle("active",t.hasRollModule)),m&&(m.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var D,O,A,T,q,H,I,j,G,U;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(D=this.container.querySelector("#submode-entities"))==null||D.addEventListener("click",()=>{this.setEditTool("entities")}),(O=this.container.querySelector("#submode-walls"))==null||O.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var L;const y=this.entitySelectorEl.value;if(y===this.character.id)this.selectedEntity=this.character;else{const X=this.objects.find(Y=>Y.id===y);X&&(this.selectedEntity=X)}this.updateSelectorOptions(),this.syncEntitySliders(),(L=this.onSelectionChange)==null||L.call(this,this.selectedEntity)}),(A=this.container.querySelector("#btn-duplicate-entity"))==null||A.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(T=this.container.querySelector("#btn-delete-entity"))==null||T.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const i=this.container.querySelector("#toggle-mod-collider");i==null||i.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new dt({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",y=>{this.selectedEntity.colliderRadius=y},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new ht({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",y=>{this.selectedEntity.mass=y,this.updateSelectorOptions()},1);const e=this.container.querySelector("#toggle-mod-friction");e==null||e.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new ut,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",y=>{this.selectedEntity.staticGroundFrictionMod=y},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",y=>{this.selectedEntity.dynamicGroundFrictionMod=y},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new yt({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",y=>{this.selectedEntity.bounceMod=y},2);const n=this.container.querySelector("#check-mod-vert-bounce");n==null||n.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=n.checked),this.syncEntitySliders(),this.updateInspector()});const o=this.container.querySelector("#toggle-mod-vert-pos");o==null||o.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new rt({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",y=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=y),this.selectedEntity.position.z=y,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",y=>{this.selectedEntity.verticalVelocity=y},2);const d=this.container.querySelector("#toggle-mod-gravity");d==null||d.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new ft,this.syncEntitySliders()});const c=this.container.querySelector("#toggle-mod-roll");c==null||c.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new mt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",y=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=y)},2);const u=this.container.querySelector("#toggle-walk");u==null||u.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new Vt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",y=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=y)},0),this.setupSlider("slide-walk-speed","val-walk-speed",y=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=y)},1);const M=this.container.querySelector("#toggle-strength");M==null||M.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new St({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",y=>{this.character.strength=y},1);const p=this.container.querySelector("#toggle-pickup");p==null||p.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new Et,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",y=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=y)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",y=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=y)},2);const v=this.container.querySelector("#toggle-throw");v==null||v.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new Ct,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",y=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=y)},1);const x=this.container.querySelector("#toggle-climb");x==null||x.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Pt,this.syncEntitySliders()});const S=this.container.querySelector("#toggle-climb-walkoff");S==null||S.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.preventWalkOff=!this.character.climbingModule.preventWalkOff),this.syncEntitySliders()});const g=this.container.querySelector("#toggle-climb-sideways");g==null||g.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.horizontalClimb=!this.character.climbingModule.horizontalClimb),this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",y=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=y)},0),this.setupSlider("slide-climb-speed","val-climb-speed",y=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=y)},1),this.setupSlider("slide-gravity","val-gravity",y=>{this.arena.gravity=y},1),this.setupSlider("slide-wall-height","val-wall-height",y=>{this.arena.setStandardWallHeight(y),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",y,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",y=>{this.arena.setStandardWallHeight(y),this.setSliderVal("slide-wall-height","val-wall-height",y,1)},1);const f=this.container.querySelector("#select-wall-preset");f==null||f.addEventListener("change",()=>{this.arena.loadWallPreset(f.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(q=this.container.querySelector("#btn-prev-wall-map"))==null||q.addEventListener("click",()=>{const y=Q.WALL_PRESETS,X=(y.findIndex(Y=>Y.id===this.arena.currentPresetId)-1+y.length)%y.length;this.arena.loadWallPreset(y[X].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(H=this.container.querySelector("#btn-next-wall-map"))==null||H.addEventListener("click",()=>{const y=Q.WALL_PRESETS,X=(y.findIndex(Y=>Y.id===this.arena.currentPresetId)+1)%y.length;this.arena.loadWallPreset(y[X].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(I=this.container.querySelector("#btn-reset-walls"))==null||I.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(j=this.container.querySelector("#btn-clear-walls"))==null||j.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",y=>{this.arena.frictionCoeff=y},1),this.setupSlider("slide-static-thresh","val-static-thresh",y=>{this.arena.staticFrictionThreshold=y},2),this.container.querySelectorAll(".preset-chip").forEach(y=>{y.addEventListener("click",()=>{const L=y.getAttribute("data-preset");L&&this.presets[L]&&(this.creatorState={...this.presets[L]},this.syncCreatorInputs())})});const b=this.container.querySelector("#creator-name");b==null||b.addEventListener("input",()=>{this.creatorState.name=b.value});const m=this.container.querySelector("#creator-toggle-shape");m==null||m.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",m.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",m.classList.toggle("active",this.creatorState.visualShape==="box")});const w=this.container.querySelector("#creator-color"),k=this.container.querySelector("#val-creator-color");w==null||w.addEventListener("input",()=>{this.creatorState.color=w.value,k&&(k.textContent=w.value)});const P=this.container.querySelector("#creator-toggle-collider");P==null||P.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,P.textContent=this.creatorState.hasCollider?"Attached":"Detached",P.classList.toggle("active",this.creatorState.hasCollider);const y=this.container.querySelector("#grp-creator-radius");y&&(y.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",y=>{this.creatorState.colliderRadius=y},2);const E=this.container.querySelector("#creator-toggle-mass");E==null||E.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,E.textContent=this.creatorState.hasMass?"Attached":"Detached",E.classList.toggle("active",this.creatorState.hasMass);const y=this.container.querySelector("#grp-creator-mass");y&&(y.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",y=>{this.creatorState.mass=y},1);const C=this.container.querySelector("#creator-toggle-friction");C==null||C.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,C.textContent=this.creatorState.hasFriction?"Attached":"Detached",C.classList.toggle("active",this.creatorState.hasFriction);const y=this.container.querySelector("#grp-creator-fric");y&&(y.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",y=>{this.creatorState.dynamicFrictionMod=y},2);const V=this.container.querySelector("#creator-toggle-bounce");V==null||V.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,V.textContent=this.creatorState.hasBounce?"Attached":"Detached",V.classList.toggle("active",this.creatorState.hasBounce);const y=this.container.querySelector("#grp-creator-bounce");y&&(y.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",y=>{this.creatorState.bounceMod=y},2);const R=this.container.querySelector("#creator-check-vert-bounce");R==null||R.addEventListener("change",()=>{this.creatorState.verticalBounce=R.checked,this.syncCreatorInputs()});const $=this.container.querySelector("#creator-toggle-vert-pos");$==null||$.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",y=>{this.creatorState.elevation=y},2);const W=this.container.querySelector("#creator-toggle-vert-vel");W==null||W.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const F=this.container.querySelector("#creator-toggle-gravity");F==null||F.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,F.textContent=this.creatorState.hasGravity?"Attached":"Detached",F.classList.toggle("active",this.creatorState.hasGravity)});const z=this.container.querySelector("#creator-toggle-roll");z==null||z.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,z.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",z.classList.toggle("active",this.creatorState.hasRollModule);const y=this.container.querySelector("#group-creator-roll-resist");y&&(y.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",y=>{this.creatorState.rollResistance=y},2),(G=this.container.querySelector("#btn-spawn-configured"))==null||G.addEventListener("click",()=>{this.spawnFromCreator()}),(U=this.container.querySelector("#btn-clear-entities"))==null||U.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,i=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),e=new K({name:t.name||"Custom Object",position:{x:i,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new dt({radius:t.colliderRadius}):null,massModule:t.hasMass?new ht({mass:t.mass}):null,frictionModule:t.hasFriction?new ut({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new yt({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new rt({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new ft:null,rollModule:t.hasRollModule?new mt({rollResistance:t.rollResistance}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,i=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),e=new K({name:`${t.name} (Copy)`,position:{x:i,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new dt({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new ht({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new ut({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new yt({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new rt({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new ft({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new mt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,i,s,e=0){const l=this.container.querySelector(`#${t}`),n=this.container.querySelector(`#${i}`);!l||!n||l.addEventListener("input",()=>{const o=parseFloat(l.value);n.textContent=e>0?o.toFixed(e):Math.round(o).toString(),s(o)})}updateInspector(){const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
      `:""}
    `}renderWallPresetOptions(){return Q.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=Q.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=Q.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const i=this.container.querySelector("#label-wall-map-badge");i&&(i.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class Bt{constructor(t){r(this,"arena");r(this,"character");r(this,"objects");r(this,"renderer");r(this,"inputManager");r(this,"devPanel");r(this,"isRunning",!1);r(this,"lastTime",0);r(this,"accumulator",0);r(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const e=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,e,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const i=this.inputManager;i.draggedEntity!==this.character?this.character.updateCharacter(t,i.movementVector,i.isMouseDown&&!this.devPanel.isEditMode,i.mousePos,this.arena,i.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const e of this.objects)i.draggedEntity!==e&&e.updatePosition(t,this.arena);const s=i.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const e=this.character.pickupModule.findTargetObject(this.character,i.mousePos.x,i.mousePos.y,this.objects,this.arena.wallHeight);e&&(this.character.pickupModule.pickup(this.character,e),i.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],i=this.inputManager,s=3;for(let e=0;e<s;e++)for(let l=0;l<t.length;l++)for(let n=l+1;n<t.length;n++){const o=t[l],a=t[n];if(o.isHeld||a.isHeld||o===i.draggedEntity||a===i.draggedEntity||!o.hasCollider||!a.hasCollider)continue;const d=this.arena.wallHeight-.15,c=o.position.z>=d||o.supportingSurfaceHeight>=d,u=a.position.z>=d||a.supportingSurfaceHeight>=d;if(c!==u)continue;const M=a.position.x-o.position.x,p=a.position.y-o.position.y,v=M*M+p*p,x=o.colliderRadius+a.colliderRadius;if(v<x*x&&v>1e-6){const S=Math.sqrt(v),g=x-S,f=M/S,h=p/S,b=a.velocity.x-o.velocity.x,m=a.velocity.y-o.velocity.y,w=b*f+m*h,k=!o.hasMass,P=!a.hasMass;if(k&&P){if(o.position.x-=f*g*.5,o.position.y-=h*g*.5,a.position.x+=f*g*.5,a.position.y+=h*g*.5,w<0){const W=-w*.5;o.velocity.x-=W*f,o.velocity.y-=W*h,a.velocity.x+=W*f,a.velocity.y+=W*h}continue}if(!k&&P){this.isEntityPinnedAgainstWall(a,f,h)?(o.position.x-=f*g,o.position.y-=h*g,o.velocity.x=0,o.velocity.y=0):(a.position.x+=f*g,a.position.y+=h*g,w<0&&(a.velocity.x+=(o.velocity.x-a.velocity.x)*Math.abs(f),a.velocity.y+=(o.velocity.y-a.velocity.y)*Math.abs(h)));continue}if(k&&!P){this.isEntityPinnedAgainstWall(o,-f,-h)?(a.position.x+=f*g,a.position.y+=h*g,a.velocity.x=0,a.velocity.y=0):(o.position.x-=f*g,o.position.y-=h*g,w<0&&(o.velocity.x+=(a.velocity.x-o.velocity.x)*Math.abs(f),o.velocity.y+=(a.velocity.y-o.velocity.y)*Math.abs(h)));continue}const E=1/o.mass,C=1/a.mass,V=E+C;if(V<=1e-4)continue;const R=E/V,$=C/V;if(o.position.x-=f*g*R,o.position.y-=h*g*R,a.position.x+=f*g*$,a.position.y+=h*g*$,w<0){const W=o instanceof Mt&&o.isActivelyWalking||a instanceof Mt&&a.isActivelyWalking,F=o.hasBounce&&a.hasBounce,z=o.isCharacter||!o.hasBounce?0:o.bounceMod??0,D=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,A=-(1+(W||!F?0:Math.max(0,Math.min(.98,Math.max(z,D)))))*w/V;o.velocity.x-=A*E*f,o.velocity.y-=A*E*h,a.velocity.x+=A*C*f,a.velocity.y+=A*C*h;const T=-h,q=f,H=b*T+m*q;if(Math.abs(H)>.001){const I=.35*Math.sqrt(o.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),j=.4,G=Math.abs(H)/(V*(1+1/j)),U=I*Math.abs(A),y=Math.min(G,U)*Math.sign(H);if(o.velocity.x+=y*E*T,o.velocity.y+=y*E*q,a.velocity.x-=y*C*T,a.velocity.y-=y*C*q,o.rollModule&&o.rollModule.enabled){const L=y/(j*o.mass*o.colliderRadius);o.rollModule.angularVelocity.z+=L,o.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,o.rollModule.angularVelocity.z)),o.isRestingOnSurface&&(o.rollModule.angularVelocity.y=o.velocity.x/o.colliderRadius,o.rollModule.angularVelocity.x=-o.velocity.y/o.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const L=y/(j*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=L,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,i,s){const e=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(i>.3&&t.position.x>=this.arena.width-e-l||i<-.3&&t.position.x<=e+l||s>.3&&t.position.y>=this.arena.height-e-l||s<-.3&&t.position.y<=e+l)return!0;for(const n of this.arena.walls)if(t.position.z<n.wallHeight-.05){const o=t.position.x+i*l,a=t.position.y+s*l,d=Math.max(n.x,Math.min(o,n.x+n.width)),c=Math.max(n.y,Math.min(a,n.y+n.height)),u=o-d,M=a-c;if(u*u+M*M<e*e)return!0}return!1}}function zt(){const B=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!B||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=B.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new Q(20,14,1);B.width=1e3,B.height=700;const e=new Mt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new K({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new K({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new K({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new K({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new mt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})],n=new Ft(i),o=new At({container:t,character:e,arena:s,objects:l,onSpawnObject:c=>{l.push(c),o.updateSelectorOptions()},onDeleteObject:c=>{const u=l.indexOf(c);u!==-1&&l.splice(u,1),o.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),l.length=0,o.updateSelectorOptions()}}),a=new Wt(B,s);a.handleInteractions(e,s,l,o),o.onSelectionChange=c=>{a.selectedCanvasEntity=c},new Bt({arena:s,character:e,objects:l,renderer:n,inputManager:a,devPanel:o}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",zt);

var $t=Object.defineProperty;var Dt=(O,t,e)=>t in O?$t(O,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):O[t]=e;var r=(O,t,e)=>Dt(O,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const l of i)if(l.type==="childList")for(const n of l.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function e(i){const l={};return i.integrity&&(l.integrity=i.integrity),i.referrerPolicy&&(l.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?l.credentials="include":i.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(i){if(i.ep)return;i.ep=!0;const l=e(i);fetch(i.href,l)}})();class rt{constructor(t={}){r(this,"z");r(this,"hasVerticalVelocity");r(this,"verticalVelocity");r(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const St=class St{constructor(t=20,e=14,s=1){r(this,"width");r(this,"height");r(this,"tileSize");r(this,"cols");r(this,"rows");r(this,"wallHeight");r(this,"gravity");r(this,"frictionCoeff");r(this,"staticFrictionThreshold");r(this,"tileGrid");r(this,"walls",[]);r(this,"currentPresetId","trenches");this.width=t,this.height=e,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(e/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("trenches")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]===1&&this.walls.push({id:`wall-${e}-${t}`,x:e*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,e,s){if(t<0||t>=this.cols||e<0||e>=this.rows)return!1;const i=s?1:0;return this.tileGrid[e][t]===i?!1:(this.tileGrid[e][t]=i,this.rebuildWalls(),!0)}hasWall(t,e){return t<0||t>=this.cols||e<0||e>=this.rows?!1:this.tileGrid[e][t]===1}loadWallPreset(t,e){const s=St.WALL_PRESETS.find(i=>i.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(e),!0):!1}syncEntitiesWithWalls(t){var e;if(t)for(const s of t){const i=s.hasCollider?s.colliderRadius:((e=s.colliderModule)==null?void 0:e.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,i);l&&s.position.z<l.wallHeight&&(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new rt({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.standingWall=l,s.verticalVelocity=0)}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("trenches",t)}getWallAt(t,e){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&e>=s.y&&e<=s.y+s.height)return s;return null}testWallOverlap(t,e,s,i){const l=Math.max(i.x,Math.min(t,i.x+i.width)),n=Math.max(i.y,Math.min(e,i.y+i.height)),o=t-l,a=e-n;return o*o+a*a<s*s}getSupportingWall(t,e,s=0){if(s<=0)return this.getWallAt(t,e);for(const i of this.walls)if(this.testWallOverlap(t,e,s,i))return i;return null}areWallsContiguous(t,e){if(t.id===e.id)return!0;const s=Math.max(0,Math.max(t.x,e.x)-Math.min(t.x+t.width,e.x+e.width)),i=Math.max(0,Math.max(t.y,e.y)-Math.min(t.y+t.height,e.y+e.height)),l=Math.min(t.x+t.width,e.x+e.width)-Math.max(t.x,e.x),n=Math.min(t.y+t.height,e.y+e.height)-Math.max(t.y,e.y);return s<.001&&n>.05||i<.001&&l>.05}getSupportingSurfaceHeight(t,e,s=0){const i=this.getSupportingWall(t,e,s);return i?i.wallHeight:0}};r(St,"WALL_PRESETS",[{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>1));for(let i=2;i<=17;i++)s[3][i]=0,s[7][i]=0,s[10][i]=0;for(let i=2;i<=11;i++)s[i][5]=0,s[i][10]=0,s[i][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let i=5;i<=9;i++)s[i][2]=0;for(let i=5;i<=9;i++)s[i][17]=0;for(let i=2;i<=5;i++)s[5][i]=0;for(let i=10;i<=14;i++)s[5][i]=0;for(let i=5;i<=10;i++)s[9][i]=0;for(let i=14;i<=17;i++)s[9][i]=0;return s[7][5]=0,s}},{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>0)),i=10;for(let l=1;l<=4;l++)s[l][i]=1;for(let l=8;l<=12;l++)s[l][i]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>0));for(let i=2;i<=4;i++){for(let l=3;l<=6;l++)s[i][l]=1;for(let l=13;l<=16;l++)s[i][l]=1}for(let i=9;i<=11;i++){for(let l=3;l<=6;l++)s[i][l]=1;for(let l=13;l<=16;l++)s[i][l]=1}for(let i=6;i<=7;i++)for(let l=9;l<=10;l++)s[i][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>0)),i=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,n]of i)s[n][l]=1,s[n+1][l]=1,s[n][l+1]=1,s[n+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,e)=>{const s=Array.from({length:e},()=>Array.from({length:t},()=>0));for(let i=1;i<=9;i++)s[i][4]=1;for(let i=4;i<=12;i++)s[i][7]=1;for(let i=1;i<=9;i++)s[i][10]=1;for(let i=4;i<=12;i++)s[i][13]=1;for(let i=1;i<=9;i++)s[i][16]=1;for(let i=7;i<=10;i++)s[4][i]=1;for(let i=13;i<=16;i++)s[4][i]=1;for(let i=4;i<=7;i++)s[9][i]=1;for(let i=10;i<=13;i++)s[9][i]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,e)=>Array.from({length:e},()=>Array.from({length:t},()=>0))}]);let J=St;class dt{constructor(t={}){r(this,"radius");r(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class ht{constructor(t={}){r(this,"mass");r(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class ut{constructor(t={}){r(this,"staticFrictionMod");r(this,"dynamicFrictionMod");r(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class yt{constructor(t={}){r(this,"bounceMod");r(this,"verticalBounce");r(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class ft{constructor(t={}){r(this,"enabled");this.enabled=t.enabled??!0}}class tt{constructor(t={}){r(this,"id");r(this,"name");r(this,"position");r(this,"velocity");r(this,"color");r(this,"isHeld");r(this,"heldBy");r(this,"lastThrower",null);r(this,"isCharacter",!1);r(this,"isClimbing",!1);r(this,"visualShape","circle");r(this,"colliderModule",null);r(this,"massModule",null);r(this,"frictionModule",null);r(this,"bounceModule",null);r(this,"verticalPositionModule",null);r(this,"gravityModule",null);r(this,"rollModule",null);r(this,"supportingSurfaceHeight",0);r(this,"standingWall",null);var e,s,i,l,n;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((e=t.position)==null?void 0:e.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((i=t.position)==null?void 0:i.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((n=t.velocity)==null?void 0:n.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new dt({radius:t.colliderRadius}):new dt({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new ht({mass:t.mass}):new ht({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new ut({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new yt({bounceMod:t.bounceMod}):new yt({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new rt({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new ft,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new dt({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new ht({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new ut({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new ut({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new yt({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.85||this.supportingSurfaceHeight>=.85||this.standingWall!==null)}updatePosition(t,e){var f,w,m,p,k,P,V,C,z,L,T;if(this.isHeld)return;if(this.lastThrower){const M=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,h=(((f=this.lastThrower.pickupModule)==null?void 0:f.pickupReach)??1.3)+this.colliderRadius+M;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>h||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0;if(this.hasCollider&&this.hasVerticalPosition&&e.walls.length>0)if(this.position.z>=e.wallHeight-.05||this.supportingSurfaceHeight>=e.wallHeight-.05&&this.position.z>=e.wallHeight-.2||this.standingWall!==null){const h=this.isCharacter?this:null;if(!!((w=h==null?void 0:h.climbingModule)!=null&&w.isDismountFreefall||(m=h==null?void 0:h.climbingModule)!=null&&m.climbSuppressedUntilRePress))this.standingWall=null,s=0;else if(this.standingWall){const $=this.colliderRadius;if(e.testWallOverlap(this.position.x,this.position.y,$,this.standingWall))s=this.standingWall.wallHeight;else if((p=h==null?void 0:h.climbingModule)!=null&&p.dismountSuppressedUntilRelease)s=this.standingWall.wallHeight;else{let R=null;for(const W of e.walls)if(e.areWallsContiguous(this.standingWall,W)&&e.testWallOverlap(this.position.x,this.position.y,$,W)){R=W;break}R?(this.standingWall=R,s=R.wallHeight):(this.standingWall=null,s=0,h!=null&&h.climbingModule&&(h.climbingModule.isDismountFreefall=!0,h.climbingModule.climbSuppressedUntilRelease=!0))}}else if(!this.isClimbing&&(this.position.z>=e.wallHeight-.05||this.supportingSurfaceHeight>=e.wallHeight-.05)){const $=e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);$&&(this.standingWall=$,s=$.wallHeight)}}else this.standingWall=null;if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=e.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const M=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const h=this.rollModule,S=this.colliderRadius>0?this.colliderRadius:.3,$=.4,x=this.bounceMod,R=(1+x)*this.mass*M,W=e.frictionCoeff*this.dynamicGroundFrictionMod*.05,D=this.velocity.x-h.angularVelocity.y*S,B=this.velocity.y+h.angularVelocity.x*S,E=Math.hypot(D,B);if(E>.001&&W>0){const A=W*R,q=E*this.mass/(1+1/$),H=Math.min(q,A),j=D/E*H,G=B/E*H;this.velocity.x-=j/this.mass,this.velocity.y-=G/this.mass,h.angularVelocity.y+=j/($*this.mass*S),h.angularVelocity.x-=G/($*this.mass*S)}const F=Math.max(.65,1-(1-x)*.35);h.angularVelocity.x*=F,h.angularVelocity.y*=F,h.angularVelocity.z*=F}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((k=this.walkingModule)==null?void 0:k.enabled)))if(this.rollModule&&this.rollModule.enabled){const h=this.rollModule,S=this.colliderRadius>0?this.colliderRadius:.3,$=e.frictionCoeff*this.dynamicGroundFrictionMod,x=.4,R=this.velocity.x-h.angularVelocity.y*S,W=this.velocity.y+h.angularVelocity.x*S,D=Math.hypot(R,W);if($>0&&D>.001){const E=$*(1+1/x)*t;if(D<=E){const F=this.velocity.x+x*h.angularVelocity.y*S,A=this.velocity.y-x*h.angularVelocity.x*S,q=F/(1+x),H=A/(1+x);this.velocity.x=q,this.velocity.y=H,h.angularVelocity.y=q/S,h.angularVelocity.x=-H/S}else{const F=R/D*$*t,A=W/D*$*t;this.velocity.x-=F,this.velocity.y-=A,h.angularVelocity.y+=F/(x*S),h.angularVelocity.x-=A/(x*S)}}const B=Math.hypot(this.velocity.x,this.velocity.y);if(B>0){if(h.rollResistance>0){const E=h.rollResistance*t,F=Math.max(0,B-E);if(F<.005)this.velocity.x=0,this.velocity.y=0,h.angularVelocity.x=0,h.angularVelocity.y=0;else{const A=F/B;this.velocity.x*=A,this.velocity.y*=A,h.angularVelocity.x*=A,h.angularVelocity.y*=A}}}else{const E=Math.hypot(h.angularVelocity.x,h.angularVelocity.y);if(E>0&&$>0){const F=$/(x*S)*t,A=Math.max(0,E-F),q=E>0?A/E:0;h.angularVelocity.x*=q,h.angularVelocity.y*=q}}if(Math.abs(h.angularVelocity.z)>.001&&h.rollResistance>0){const E=h.rollResistance/(x*S)*t,F=Math.sign(h.angularVelocity.z),A=Math.abs(h.angularVelocity.z);h.angularVelocity.z=A<=E?0:F*(A-E)}h.updateVisualPhase(t)}else{const h=Math.hypot(this.velocity.x,this.velocity.y);if(h>0){const S=e.staticFrictionThreshold*this.staticGroundFrictionMod;if(h<S)this.velocity.x=0,this.velocity.y=0;else{const $=e.frictionCoeff*this.dynamicGroundFrictionMod*t,R=Math.max(0,h-$)/h;this.velocity.x*=R,this.velocity.y*=R}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);const l=this.isCharacter?this:null,n=l==null?void 0:l.climbingModule,o=!this.isClimbing&&this.supportingSurfaceHeight>=e.wallHeight-.05&&this.standingWall!==null,a=Math.max(.01,(n==null?void 0:n.hangDistance)??.1);if(n)if(this.position.z<=.01)n.isAssistClampArmed=!1,n.hasLeftClampZoneSinceDismount=!0;else if(o&&this.standingWall){const M=this.standingWall,h=[M];for(const x of e.walls)x.id!==M.id&&e.areWallsContiguous(M,x)&&h.push(x);let S=1/0;for(const x of h){const R=Math.max(x.x,Math.min(this.position.x,x.x+x.width)),W=Math.max(x.y,Math.min(this.position.y,x.y+x.height)),D=Math.hypot(this.position.x-R,this.position.y-W);D<S&&(S=D)}S<=a+.001?l.isClimbInputHeld&&!n.dismountSuppressedUntilRelease?(n.isAssistClampArmed=!1,n.hasLeftClampZoneSinceDismount=!1):n.hasLeftClampZoneSinceDismount&&(n.isAssistClampArmed=!0):(n.hasLeftClampZoneSinceDismount=!0,n.isAssistClampArmed=!1)}else n.isAssistClampArmed=!1;const d=!!(l&&o&&(n!=null&&n.enabled)&&(n!=null&&n.preventWalkOff)&&(n!=null&&n.isAssistClampArmed)),c=this.velocity.x*t,g=this.velocity.y*t,v=Math.hypot(c,g);if(v>1e-4)if(d){const M=Math.max(.01,((P=l==null?void 0:l.climbingModule)==null?void 0:P.hangDistance)??.1);let h=this.standingWall??e.getSupportingWall(this.position.x,this.position.y,M);this.standingWall=h;const S=this.position.x+c,$=this.position.y+g,x=[];if(h){x.push(h);for(const W of e.walls)W.id!==h.id&&e.areWallsContiguous(h,W)&&x.push(W)}let R=null;for(const W of x)if(e.testWallOverlap(S,$,M,W)){R=W;break}if(R)this.position.x=S,this.position.y=$,this.standingWall=R;else if(x.length>0){let W=1/0,D=null;for(const B of x){const E=Math.max(B.x,Math.min(S,B.x+B.width)),F=Math.max(B.y,Math.min($,B.y+B.height)),A=S-E,q=$-F,H=A*A+q*q;H<W&&(W=H,D={wall:B,closestX:E,closestY:F,dist:Math.sqrt(H),dx:A,dy:q})}if(D&&D.dist>0){const B=D.dx/D.dist,E=D.dy/D.dist,F=this.velocity.x*B+this.velocity.y*E;F>0&&(this.velocity.x-=F*B,this.velocity.y-=F*E);const A=M-.002;D.dist>A?(this.position.x=D.closestX+B*A,this.position.y=D.closestY+E*A):(this.position.x=S,this.position.y=$);const q=e.testWallOverlap(this.position.x,this.position.y,M,D.wall)?D.wall:x.find(H=>e.testWallOverlap(this.position.x,this.position.y,M,H));q&&(this.standingWall=q)}else this.velocity.x=0,this.velocity.y=0}}else{const h=Math.max(1,Math.ceil(v/.01)),S=c/h,$=g/h;let x=this.standingWall??(o?e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null),R=!1;for(let W=1;W<=h;W++){const D=this.position.x+S,B=this.position.y+$;if(x){let F=null;if(e.testWallOverlap(D,B,this.colliderRadius,x))F=x;else for(const A of e.walls)if(e.areWallsContiguous(x,A)&&e.testWallOverlap(D,B,this.colliderRadius,A)){F=A;break}F?(x=F,this.standingWall=F):(V=l==null?void 0:l.climbingModule)!=null&&V.dismountSuppressedUntilRelease||(R=!0,x=null,this.standingWall=null,this.supportingSurfaceHeight=0,l!=null&&l.climbingModule&&(l.climbingModule.isDismountFreefall=!0,l.climbingModule.climbSuppressedUntilRelease=!0))}if(this.position.x=D,this.position.y=B,!this.isClimbing&&(R||!this.standingWall&&!!((C=l==null?void 0:l.climbingModule)!=null&&C.isDismountFreefall||(z=l==null?void 0:l.climbingModule)!=null&&z.climbSuppressedUntilRePress))&&this.hasCollider)for(const F of e.walls)this.position.z<=F.wallHeight&&this.resolveWallCollision(F)}}if(this.hasCollider){const M=this.colliderRadius,h=M,S=e.width-M,$=M,x=e.height-M,R=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<h?(this.position.x=h,this.resolveWallImpact(1,0,R)):this.position.x>S&&(this.position.x=S,this.resolveWallImpact(-1,0,R)),this.position.y<$?(this.position.y=$,this.resolveWallImpact(0,1,R)):this.position.y>x&&(this.position.y=x,this.resolveWallImpact(0,-1,R));const W=!!((L=l==null?void 0:l.climbingModule)!=null&&L.isDismountFreefall||(T=l==null?void 0:l.climbingModule)!=null&&T.climbSuppressedUntilRePress);for(const D of e.walls)if(this.position.z<=D.wallHeight&&(this.position.z<D.wallHeight-.05||W||this.standingWall===null)){if(this.standingWall&&(this.standingWall.id===D.id||e.areWallsContiguous(this.standingWall,D)))continue;this.resolveWallCollision(D)}}const b=16,y=Math.hypot(this.velocity.x,this.velocity.y);if(y>b){const M=b/y;this.velocity.x*=M,this.velocity.y*=M}if(this.rollModule&&this.rollModule.enabled){const h=this.rollModule.angularSpeed;if(h>35){const S=35/h;this.rollModule.angularVelocity.x*=S,this.rollModule.angularVelocity.y*=S,this.rollModule.angularVelocity.z*=S}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}static getClosestWallPoint(t,e,s){if(!s.walls||s.walls.length===0)return null;let i=1/0,l=null;for(const n of s.walls){const o=Math.max(n.x,Math.min(t,n.x+n.width)),a=Math.max(n.y,Math.min(e,n.y+n.height)),d=t-o,c=e-a,g=d*d+c*c;g<i&&(i=g,l={wall:n,closestX:o,closestY:a,dist:Math.sqrt(g),dx:d,dy:c})}return l}resolveWallImpact(t,e,s){this.lastThrower=null;const i=this.velocity.x*t+this.velocity.y*e;if(i>=0)return;const l=i;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*e):(this.velocity.x-=l*t,this.velocity.y-=l*e),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const n=this.rollModule,o=this.colliderRadius>0?this.colliderRadius:.3,a=.4,d=.35,c=-e,g=t,v=this.velocity.x*c+this.velocity.y*g,b=-(1+s)*this.mass*l,y=v-n.angularVelocity.z*o,f=Math.abs(y)*this.mass/(1+1/a),w=d*b,m=Math.min(f,w),p=-Math.sign(y)*m,k=v,P=k+p/this.mass,V=Math.abs(P)<=Math.abs(k)+.01?P-k:-k*.1;this.velocity.x+=V*c,this.velocity.y+=V*g;const z=-(V*this.mass)/(a*this.mass*o);n.angularVelocity.z+=z,n.angularVelocity.z=Math.max(-30,Math.min(30,n.angularVelocity.z)),n.angularVelocity.y=this.velocity.x/o,n.angularVelocity.x=-this.velocity.y/o}}resolveWallCollision(t){if(!this.hasCollider)return;const e=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),i=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,n=this.position.y-i,o=l*l+n*n;if(o<e*e){this.lastThrower=null;const a=Math.sqrt(o);let d=0,c=0,g=0;if(a===0){const b=Math.abs(this.position.x-t.x),y=Math.abs(t.x+t.width-this.position.x),f=Math.abs(this.position.y-t.y),w=Math.abs(t.y+t.height-this.position.y),m=Math.min(b,y,f,w);m===b?(d=-1,g=b+e):m===y?(d=1,g=y+e):m===f?(c=-1,g=f+e):(c=1,g=w+e)}else g=e-a,d=l/a,c=n/a;this.position.x+=d*g,this.position.y+=c*g;const v=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(d,c,v)}}}class Pt{constructor(){r(this,"id","walking");r(this,"name","Walking Module");r(this,"enabled",!0);r(this,"maxWalkForce",35);r(this,"maxWalkSpeed",5.2);r(this,"dragDamping",8.01)}update(t,e,s,i){var L;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((L=t.frictionModule)!=null&&L.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(e.x,e.y),n=l>.05;if(t.isActivelyWalking=n,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const d=i.frictionCoeff/10,c=a*d,v=t.carriedMass/(Math.max(.1,t.strength)*8),b=this.maxWalkSpeed/(1+v);let y=0,f=0;if(n){const T=e.x/l,M=e.y/l;y=T*b,f=M*b}const w=y-t.velocity.x,m=f-t.velocity.y,p=Math.hypot(w,m);if(p<.001){t.velocity.x=y,t.velocity.y=f;return}const k=Math.hypot(t.velocity.x,t.velocity.y),P=Math.max(.02,i.staticFrictionThreshold*t.staticGroundFrictionMod),V=t.hasMass?Math.max(.2,t.baseMass):1,z=this.maxWalkForce*t.strength/V*c*s;if(p<=z||!n&&k<P)t.velocity.x=y,t.velocity.y=f;else{const T=z/p;t.velocity.x+=w*T,t.velocity.y+=m*T}}}class Rt{constructor(){r(this,"id","pickup");r(this,"name","Pickup Ability");r(this,"enabled",!0);r(this,"pickupReach",1.3);r(this,"crossLayerReachRatio",.55)}isObjectInReach(t,e,s=1){var c;if(!this.enabled||e===t||e.isHeld||e.isCharacter||e.lastThrower===t)return!1;const i=t.position.z>=s-.05?1:0,l=e.position.z>=s-.05?1:0,o=i!==l?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,a=e.hasCollider?e.colliderRadius:((c=e.colliderModule)==null?void 0:c.radius)??.32;return Math.hypot(e.position.x-t.position.x,e.position.y-t.position.y)<=o+a}findTargetObject(t,e,s,i,l=1){if(!this.enabled)return null;let n=null,o=1/0;for(const a of i){if(!this.isObjectInReach(t,a,l))continue;const d=Math.hypot(a.position.x-e,a.position.y-s);d<o&&(o=d,n=a)}return n}pickup(t,e){if(!this.enabled||t.heldObject)return!1;const s=e.velocity.x,i=e.velocity.y,l=e.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=i*l,t.isAboveGround&&Math.abs(e.verticalVelocity)>.1&&(t.verticalVelocity+=e.verticalVelocity*l),t.heldObject=e,e.isHeld=!0,e.heldBy=t,e.velocity.x=0,e.velocity.y=0,e.verticalVelocity=0,e.position.z=e.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const e=t.heldObject;return t.heldObject=null,e.isHeld=!1,e.heldBy=null,e.velocity.x=t.velocity.x*.4,e.velocity.y=t.velocity.y*.4,e.verticalVelocity=0,e}}class Wt{constructor(){r(this,"id","throw");r(this,"name","Throw Ability");r(this,"enabled",!0);r(this,"baseThrowForce",7.6);r(this,"maxThrowAimDistance",13)}testWallIntersection(t,e,s,i){const l=Math.max(i.x,Math.min(t,i.x+i.width)),n=Math.max(i.y,Math.min(e,i.y+i.height)),o=t-l,a=e-n;return o*o+a*a<s*s}computeLaunchVelocity(t,e,s,i,l,n,o,a=!0,d=!0,c=.35){const g=i-t,v=l-e,b=Math.hypot(g,v);if(b<.1)return null;const y=Math.min(b,this.maxThrowAimDistance),f=g/b,w=v/b,m=t+f*y,p=e+w*y;if(!a||!d){const R=Math.max(3,o),W=Math.max(.14,y/R),D=f*R,B=w*R;return{vx:D,vy:B,vz:0,totalTime:W,finalTargetX:m,finalTargetY:p,targetSurfaceHeight:s}}const k=n.getSupportingSurfaceHeight(m,p),P=k-s,V=Math.max(3,o);let z=Math.max(.14,y/V);P>0&&(z=Math.max(z,Math.sqrt(2*P/n.gravity)));const L=40,T=c>0?c:.35,M=.25;for(let R=1;R<L;R++){const W=R/L,D=t+(m-t)*W,B=e+(p-e)*W;for(const E of n.walls)if(this.testWallIntersection(D,B,T,E)){if(k>0&&m>=E.x&&m<=E.x+E.width&&p>=E.y&&p<=E.y+E.height&&W>.65)continue;const A=(1-W)*s+W*k,H=E.wallHeight+M-A;if(H>0){const j=n.gravity*W*(1-W);if(j>.001){const G=2*H/j;if(G>0){const U=Math.sqrt(G);U>z&&(z=U)}}}}}if(z<=.05)return null;const h=(P+.5*n.gravity*z*z)/z,S=y/z,$=f*S,x=w*S;return{vx:$,vy:x,vz:h,totalTime:z,finalTargetX:m,finalTargetY:p,targetSurfaceHeight:k}}calculateTrajectory(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,n=l.position.x,o=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,c=l.hasGravity&&l.hasVerticalVelocity,g=this.computeLaunchVelocity(n,o,a,e,s,i,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!g)return null;const{vx:v,vy:b,vz:y,totalTime:f,finalTargetX:w,finalTargetY:m,targetSurfaceHeight:p}=g,k=90,P=f/k,V=[];let C=!1,z=p>0,L;for(let M=0;M<=k;M++){const h=M*P,S=M===k?w:n+v*h,$=M===k?m:o+b*h,x=c?a+y*h-.5*i.gravity*h*h:a,R=c?M===k?p:Math.max(p,x):a,W=c?y-i.gravity*h:0,D=R>i.wallHeight;let B=!1,E=!1;for(const F of i.walls)if(this.testWallIntersection(S,$,l.colliderRadius,F)&&(B=!0,R<=F.wallHeight+.001)){if(V.length>0&&V[V.length-1].z>=F.wallHeight-.05&&W<=0){if(p>0&&(M>=k-2||Math.hypot(S-w,$-m)<.2)){z=!0;break}else if(p===0){z=!0,E=!0,C=!0,L=F.id;break}}else if(R<F.wallHeight-.05){E=!0,C=!0,L=F.id;break}}if(V.push({x:S,y:$,z:R,t:h,couldClearWall:D,isOverWall:B,collidesWall:E}),E)break}const T=V[V.length-1];return{points:V,landPoint:{x:C?T.x:w,y:C?T.y:m},isBlockedByWall:C,isLandingOnWallTop:C?z:p>0,blockedAtWallId:L}}throwHeldObject(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,n=l.position.x,o=l.position.y,a=l.position.z,d=this.baseThrowForce*t.strength,c=this.computeLaunchVelocity(n,o,a,e,s,i,d,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!c)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=c.vx,l.velocity.y=c.vy,l.verticalVelocity=c.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const w=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=c.vx/w,l.rollModule.angularVelocity.x=-c.vy/w}const g=l.hasMass?l.mass:0,v=t.hasMass?Math.max(.2,t.baseMass):0,b=g>0&&v>0?g/v:0;t.heldObject=null;const y=c.vx-t.velocity.x,f=c.vy-t.velocity.y;if(t.velocity.x-=y*b,t.velocity.y-=f*b,t.isAboveGround&&l.hasVerticalVelocity){const w=c.vz-t.verticalVelocity;t.verticalVelocity-=w*b}return l}}class Ft{constructor(t){r(this,"id","climbing");r(this,"name","Climbing Module");r(this,"enabled",!0);r(this,"maxAdhesion",35);r(this,"maxClimbSpeed",3);r(this,"preventWalkOff",!0);r(this,"horizontalClimb",!1);r(this,"hangDistance",.1);r(this,"dismountSuppressedUntilRelease",!1);r(this,"climbSuppressedUntilRelease",!1);r(this,"isDismountFreefall",!1);r(this,"isAssistClampArmed",!1);r(this,"hasLeftClampZoneSinceDismount",!0);r(this,"wasClimbHeldLastTick",!1);(t==null?void 0:t.maxAdhesion)!==void 0&&(this.maxAdhesion=t.maxAdhesion),(t==null?void 0:t.maxClimbSpeed)!==void 0&&(this.maxClimbSpeed=t.maxClimbSpeed),(t==null?void 0:t.preventWalkOff)!==void 0&&(this.preventWalkOff=t.preventWalkOff),(t==null?void 0:t.horizontalClimb)!==void 0&&(this.horizontalClimb=t.horizontalClimb),(t==null?void 0:t.hangDistance)!==void 0&&(this.hangDistance=t.hangDistance)}get climbSuppressedUntilRePress(){return this.isDismountFreefall||this.climbSuppressedUntilRelease}set climbSuppressedUntilRePress(t){this.isDismountFreefall=t,this.climbSuppressedUntilRelease=t}update(t,e,s,i,l){const n=s&&!this.wasClimbHeldLastTick;if(this.wasClimbHeldLastTick=s,s||(this.dismountSuppressedUntilRelease=!1,this.climbSuppressedUntilRelease=!1),(t.position.z<=.01||n)&&(this.isDismountFreefall=!1,t.position.z<=.01&&(this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)),this.climbSuppressedUntilRelease||!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const o=t.hasCollider?t.colliderRadius:.44,a=Math.hypot(e.x,e.y),d=a>=.05,c=d?e.x/a:0,g=d?e.y/a:0;if(!t.isClimbing&&(t.standingWall!==null||t.position.z>=l.wallHeight))return t.isClimbing=!1,!1;let v=null,b=1/0,y=0,f=0,w=0;for(const V of l.walls){const C=Math.max(V.x,Math.min(t.position.x,V.x+V.width)),z=Math.max(V.y,Math.min(t.position.y,V.y+V.height)),L=C-t.position.x,T=z-t.position.y,M=Math.hypot(L,T);M<=o+.15&&M<b&&(b=M,v=V,y=d?c*L+g*T:0,f=L,w=T)}if(!v)return t.isClimbing=!1,!1;const m=t.mass;if(m*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;const k=t.isClimbing;if(k&&t.position.z<v.wallHeight){const V=b>.001?f/b:0,C=b>.001?w/b:0,z=-C,L=V,T=d?c*V+g*C:0,M=d?c*z+g*L:0;if(d&&(T<-.3||!this.horizontalClimb&&y<-.1))return t.isClimbing=!1,t.velocity.x=c*3,t.velocity.y=g*3,s&&(this.climbSuppressedUntilRelease=!0),!1;if(t.isClimbing=!0,t.verticalVelocity=0,t.standingWall=null,this.horizontalClimb&&d&&Math.abs(M)>=.1){const h=t.baseMass,S=Math.max(.5,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*h*t.strength/Math.max(.1,m)));t.velocity.x=z*M*S,t.velocity.y=L*M*S}else t.velocity.x=0,t.velocity.y=0;if(s){const h=t.baseMass,S=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*h*t.strength/Math.max(.1,m)));t.position.z+=S*i,t.position.z>=v.wallHeight&&(t.position.z=v.wallHeight,t.supportingSurfaceHeight=v.wallHeight,t.standingWall=v,t.verticalVelocity=0,t.isClimbing=!1,this.dismountSuppressedUntilRelease=!0,this.isAssistClampArmed=!1,this.hasLeftClampZoneSinceDismount=!0)}return!0}if(!k&&t.position.z>.05&&t.position.z<v.wallHeight)return n?(t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0,!0):(t.isClimbing=!1,!1);if(s&&d&&y>.01&&b<=o+.03&&t.position.z<v.wallHeight){if(b>.001){const z=f/b,L=w/b;t.position.x=t.position.x+f-z*o,t.position.y=t.position.y+w-L*o}t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const V=t.baseMass,C=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*V*t.strength/Math.max(.1,m)));return t.position.z+=C*i,!0}return t.isClimbing=!1,!1}}class wt{constructor(t={}){r(this,"id","strength");r(this,"name","Strength Module");r(this,"enabled",!0);r(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class Mt extends tt{constructor(e={}){super({name:"Player Character",position:{x:e.x??5,y:e.y??7,z:0},mass:e.mass??1.2,colliderRadius:e.colliderRadius??.44,color:e.color??"#f59e0b",bounceMod:.1});r(this,"strengthModule");r(this,"facingAngle");r(this,"heldObject");r(this,"isCharacter",!0);r(this,"isActivelyWalking",!1);r(this,"isClimbInputHeld",!1);r(this,"baseMass",1.2);r(this,"walkingModule");r(this,"pickupModule");r(this,"throwModule");r(this,"climbingModule");r(this,"isAiming");r(this,"aimTarget");r(this,"activeTrajectory");this.baseMass=e.mass??1.2,this.strength=e.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new wt({strength:e.strength??1}),this.walkingModule=new Pt,this.pickupModule=new Rt,this.throwModule=new Wt,this.climbingModule=new Ft}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(e){this.strengthModule?this.strengthModule.strength=Math.max(.1,e):this.strengthModule=new wt({strength:e})}get mass(){const e=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return e+s}set mass(e){this.baseMass=Math.max(.1,e),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}get hangDistance(){return this.climbingModule?this.climbingModule.hangDistance:.1}set hangDistance(e){this.climbingModule&&(this.climbingModule.hangDistance=Math.max(0,e))}updateFacingDirection(e,s,i){if((this.heldObject!==null||e)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,n=s.y-this.position.y;if(Math.hypot(l,n)>.1){this.facingAngle=Math.atan2(n,l);return}}i&&Math.hypot(i.x,i.y)>.05&&(this.facingAngle=Math.atan2(i.y,i.x))}updateCharacter(e,s,i,l,n,o=!1){if(this.isClimbInputHeld=o,this.climbingModule&&this.climbingModule.update(this,s,o,e,n),this.walkingModule&&this.walkingModule.update(this,s,e,n),this.updatePosition(e,n),this.updateFacingDirection(i,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||i,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,n):this.activeTrajectory=null}}class mt{constructor(t={}){r(this,"enabled",!0);r(this,"angularVelocity",{x:0,y:0,z:0});r(this,"rollResistance",.4);r(this,"visualPhase",0);var e,s,i;this.enabled=t.enabled??!0,this.angularVelocity={x:((e=t.angularVelocity)==null?void 0:e.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((i=t.angularVelocity)==null?void 0:i.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const e=this.angularSpeed;e>.001&&(this.visualPhase=(this.visualPhase+e*t)%(Math.PI*2))}}class xt{constructor(t){r(this,"ctx");this.ctx=t}render(t,e,s,i,l=!1,n,o,a=!1,d){const c=this.ctx,g=c.canvas.width/t.width;c.clearRect(0,0,c.canvas.width,c.canvas.height),this.drawFloorGrid(t,g),this.drawWalls(t,g),a&&d&&this.drawWallEditorHover(t,d,g);const v=[e,...s];v.sort((b,y)=>Math.abs(b.position.z-y.position.z)>.001?b.position.z-y.position.z:Math.abs(b.verticalVelocity-y.verticalVelocity)>.001?b.verticalVelocity-y.verticalVelocity:b.position.y-y.position.y);for(const b of v)b instanceof Mt?this.drawCharacter(b,s,g,t):this.drawFreebodyObject(b,v,e,g,b===o,t),this.drawObjectShadow(b,t,g);e.activeTrajectory&&this.drawTrajectory(e.activeTrajectory,g),l&&(n&&n!==i&&this.drawHoverGizmo(n,g),i&&this.drawSelectionGizmo(i,l,g))}drawFloorGrid(t,e){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*e,t.height*e),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let i=1;i<t.width;i++)s.beginPath(),s.moveTo(i*e,0),s.lineTo(i*e,t.height*e),s.stroke();for(let i=1;i<t.height;i++)s.beginPath(),s.moveTo(0,i*e),s.lineTo(t.width*e,i*e),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*e-3,t.height*e-3)}drawWalls(t,e){const s=this.ctx;for(const i of t.walls)s.fillStyle="#1e293b",s.fillRect(i.x*e,i.y*e,i.width*e,i.height*e),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(i.x*e,i.y*e,i.width*e,i.height*e)}drawWallEditorHover(t,e,s){if(e.col<0||e.col>=t.cols||e.row<0||e.row>=t.rows)return;const i=this.ctx,l=e.col*t.tileSize*s,n=e.row*t.tileSize*s,o=t.tileSize*s,a=t.hasWall(e.col,e.row);i.save(),a?(i.fillStyle="rgba(239, 68, 68, 0.35)",i.strokeStyle="#ef4444",i.lineWidth=2.5,i.fillRect(l,n,o,o),i.strokeRect(l,n,o,o),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#fca5a5",i.textAlign="center",i.textBaseline="middle",i.fillText("✕ Erase",l+o/2,n+o/2)):(i.fillStyle="rgba(56, 189, 248, 0.3)",i.strokeStyle="#38bdf8",i.lineWidth=2.5,i.fillRect(l,n,o,o),i.strokeRect(l,n,o,o),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#7dd3fc",i.textAlign="center",i.textBaseline="middle",i.fillText("+ Draw",l+o/2,n+o/2)),i.restore()}static getAltitudeScale(t,e){return 1+Math.max(0,t)/Math.max(.1,e)*.5}drawObjectShadow(t,e,s){const i=this.ctx,l=t.position.x*s,n=t.position.y*s,o=t.position.z,a=t.colliderRadius*s,d=Math.max(.3,.85-o/(e.wallHeight*7)*.25),c=o>=e.wallHeight-.001;if(i.save(),i.beginPath(),t.visualShape==="box"){const g=a*2,v=Math.max(3,a*.16);i.roundRect?i.roundRect(l-a,n-a,g,g,v):i.rect(l-a,n-a,g,g)}else i.arc(l,n,a,0,Math.PI*2);c?(i.strokeStyle=`rgba(56, 189, 248, ${d})`,i.lineWidth=2.5):(i.strokeStyle=`rgba(255, 255, 255, ${d})`,i.lineWidth=1.8),o>.01&&i.setLineDash([4,3]),i.stroke(),i.restore()}drawFreebodyObject(t,e,s,i,l=!1,n){var w,m;const o=this.ctx,a=t.position.x*i,d=t.position.y*i,c=xt.getAltitudeScale(t.position.z,n.wallHeight),v=(t.hasCollider?t.colliderRadius:((w=t.colliderModule)==null?void 0:w.radius)??.32)*i*c,y=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled&&!t.isHeld&&(((m=s.pickupModule)==null?void 0:m.isObjectInReach(s,t,n.wallHeight))??!1);if(y){if(o.save(),o.beginPath(),t.visualShape==="box"){const p=(v+5)*2;o.roundRect?o.roundRect(a-v-5,d-v-5,p,p,6):o.rect(a-v-5,d-v-5,p,p)}else o.arc(a,d,v+5,0,Math.PI*2);l?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",a,d-v-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}let f=!1;if(t.isAboveGround)for(const p of e){if(p===t)continue;if(Math.hypot(t.position.x-p.position.x,t.position.y-p.position.y)<t.colliderRadius+p.colliderRadius&&(t.position.z>p.position.z||Math.abs(t.position.z-p.position.z)<=.01&&t.verticalVelocity>p.verticalVelocity)){f=!0;break}}if(o.save(),o.globalAlpha=f?.55:1,t.visualShape==="box"){const p=v*2,k=Math.max(3,v*.16),P=a-v,V=d-v;o.beginPath(),o.roundRect?o.roundRect(P,V,p,p,k):o.rect(P,V,p,p),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();const C=Math.max(3,v*.22);o.beginPath(),o.roundRect?o.roundRect(P+C,V+C,p-C*2,p-C*2,k*.7):o.rect(P+C,V+C,p-C*2,p-C*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(P+C,V+C),o.lineTo(P+p-C,V+p-C),o.moveTo(P+p-C,V+C),o.lineTo(P+C,V+p-C),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(a,d,v,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();this.drawRollIndicator(t,a,d,v),o.restore()}drawCharacter(t,e,s,i){const l=this.ctx,n=t.position.x*s,o=t.position.y*s,a=xt.getAltitudeScale(t.position.z,i.wallHeight),d=t.colliderRadius*s*a;let c=!1;if(t.isAboveGround)for(const P of e){if(P===t)continue;if(Math.hypot(t.position.x-P.position.x,t.position.y-P.position.y)<t.colliderRadius+P.colliderRadius&&(t.position.z>P.position.z||Math.abs(t.position.z-P.position.z)<=.01&&t.verticalVelocity>P.verticalVelocity)){c=!0;break}}l.save(),l.globalAlpha=c?.55:1,l.beginPath(),l.arc(n,o,d,0,Math.PI*2),l.fillStyle=t.color,l.fill(),l.strokeStyle="#ffffff",l.lineWidth=2.5,l.stroke(),this.drawRollIndicator(t,n,o,d);const g=.52,v=d*.72,b=Math.max(3.5,d*.18),y=t.facingAngle-g,f=t.facingAngle+g,w=n+Math.cos(y)*v,m=o+Math.sin(y)*v,p=n+Math.cos(f)*v,k=o+Math.sin(f)*v;l.fillStyle="#000000",l.beginPath(),l.arc(w,m,b,0,Math.PI*2),l.arc(p,k,b,0,Math.PI*2),l.fill(),t.heldObject&&(l.strokeStyle="rgba(255, 255, 255, 0.6)",l.setLineDash([3,3]),l.lineWidth=1.5,l.beginPath(),l.moveTo(n,o),l.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),l.stroke(),l.setLineDash([])),l.restore()}drawRollIndicator(t,e,s,i){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,n=l.angularVelocity.x,o=l.angularVelocity.y,a=l.angularVelocity.z,d=Math.hypot(n,o,a);if(d<.02)return;const c=this.ctx,v=Math.hypot(n,o)<.05*d;if(c.save(),v){const b=i*.45,y=i*.78;c.beginPath(),c.arc(e,s,b,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.45)",c.lineWidth=1.5,c.setLineDash([]),c.stroke(),c.beginPath(),c.arc(e,s,y,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*y*Math.sign(a||1),c.stroke()}else{const b=Math.atan2(-n,o),y=i*.82,f=Math.abs(a)/d,w=y*Math.pow(f,.85);c.translate(e,s),c.rotate(b);const m=a!==0?Math.sign(a):1;w<.5?(c.beginPath(),c.moveTo(-y,0),c.lineTo(y,0),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2.2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*y,c.stroke()):(c.beginPath(),c.ellipse(0,0,y,w,0,0,Math.PI),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2.2,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*y*m,c.stroke(),c.beginPath(),c.ellipse(0,0,y,w,0,Math.PI,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.25)",c.lineWidth=1.8,c.setLineDash([4,4]),c.lineDashOffset=-l.visualPhase*y*m,c.stroke())}c.restore()}drawTrajectory(t,e){const s=this.ctx,i=t.points;if(i.length<2)return;s.save();for(let n=0;n<i.length-1;n++){const o=i[n],a=i[n+1];s.beginPath(),s.moveTo(o.x*e,o.y*e),s.lineTo(a.x*e,a.y*e),o.couldClearWall||a.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const l=i[i.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const n=8;s.beginPath(),s.moveTo(l.x*e-n,l.y*e-n),s.lineTo(l.x*e+n,l.y*e+n),s.moveTo(l.x*e+n,l.y*e-n),s.lineTo(l.x*e-n,l.y*e+n),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,e){var a;const s=this.ctx,i=t.position.x*e,l=t.position.y*e,o=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*e;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(i,l,o,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,e,s){var v;const i=this.ctx,l=t.position.x*s,n=t.position.y*s,d=(t.hasCollider?t.colliderRadius:((v=t.colliderModule)==null?void 0:v.radius)??.32)*s+6,c=Math.max(6,d*.4),g=e?"#fbbf24":"#38bdf8";if(i.save(),i.strokeStyle=g,i.lineWidth=2,i.setLineDash([]),i.beginPath(),i.moveTo(l-d,n-d+c),i.lineTo(l-d,n-d),i.lineTo(l-d+c,n-d),i.stroke(),i.beginPath(),i.moveTo(l+d-c,n-d),i.lineTo(l+d,n-d),i.lineTo(l+d,n-d+c),i.stroke(),i.beginPath(),i.moveTo(l+d,n+d-c),i.lineTo(l+d,n+d),i.lineTo(l+d-c,n+d),i.stroke(),i.beginPath(),i.moveTo(l-d+c,n+d),i.lineTo(l-d,n+d),i.lineTo(l-d,n+d-c),i.stroke(),e){const b=`${t.name} (${t.mass.toFixed(1)}kg)`;i.font="bold 10px 'Segoe UI', system-ui, sans-serif";const f=i.measureText(b).width+12,w=16,m=l-f/2,p=n-d-w-4;i.fillStyle="rgba(15, 23, 42, 0.85)",i.strokeStyle=g,i.lineWidth=1,i.beginPath(),i.roundRect(m,p,f,w,4),i.fill(),i.stroke(),i.fillStyle=g,i.textAlign="center",i.textBaseline="middle",i.fillText(b,l,p+w/2)}i.restore()}}class At{constructor(t,e){r(this,"canvas");r(this,"arena");r(this,"keysPressed",new Set);r(this,"mousePos",{x:0,y:0});r(this,"isMouseDown",!1);r(this,"isRightMouseDown",!1);r(this,"hoverWallTile",null);r(this,"movementVector",{x:0,y:0});r(this,"justPickedUp",!1);r(this,"isThrowingPress",!1);r(this,"hoverEntity",null);r(this,"selectedCanvasEntity",null);r(this,"draggedEntity",null);r(this,"dragOffset",{x:0,y:0});r(this,"handleClick");r(this,"onMouseDown");r(this,"onRightMouseDown");r(this,"onMouseUp");r(this,"onRightClick");r(this,"onDropAttempt");r(this,"onMouseMove");this.canvas=t,this.arena=e,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateTouchPos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateMovementVector(){let t=0,e=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(e-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(e+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,e);s>0?(this.movementVector.x=t/s,this.movementVector.y=e/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,e,s,i){i&&(this.selectedCanvasEntity=i.selectedEntity);const l=(a,d,c=.35)=>{var b;for(let y=s.length-1;y>=0;y--){const f=s[y],w=f.hasCollider?f.colliderRadius:((b=f.colliderModule)==null?void 0:b.radius)??.32;if(Math.hypot(f.position.x-a,f.position.y-d)<=w+c)return f}const g=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-d)<=g+c?t:null},n=(a,d)=>{var g;if(a<0||a>=e.cols||d<0||d>=e.rows)return;if(e.setWallTile(a,d,!0)){const v={id:`wall-${a}-${d}`,x:a*e.tileSize,y:d*e.tileSize,width:e.tileSize,height:e.tileSize,wallHeight:e.wallHeight},b=[t,...s];for(const y of b){const f=y.hasCollider?y.colliderRadius:((g=y.colliderModule)==null?void 0:g.radius)??.32;e.testWallOverlap(y.position.x,y.position.y,f,v)&&y.position.z<e.wallHeight&&(y.hasVerticalPosition||(y.verticalPositionModule?y.verticalPositionModule.enabled=!0:y.verticalPositionModule=new rt({z:e.wallHeight,hasVerticalVelocity:!0})),y.position.z=e.wallHeight,y.supportingSurfaceHeight=e.wallHeight,y.verticalVelocity=0)}e.currentPresetId="custom",i==null||i.updateWallPresetUI()}},o=(a,d)=>{a<0||a>=e.cols||d<0||d>=e.rows||e.tileGrid[d][a]===1&&(e.setWallTile(a,d,!1),e.currentPresetId="custom",i==null||i.updateWallPresetUI())};this.onMouseDown=(a,d)=>{if(i!=null&&i.isEditMode){if(i.editTool==="walls"){const g=Math.floor(a/e.tileSize),v=Math.floor(d/e.tileSize);n(g,v);return}const c=l(a,d,.35);c?(this.selectedCanvasEntity=c,i.setSelectedEntity(c),this.draggedEntity=c,this.dragOffset.x=c.position.x-a,this.dragOffset.y=c.position.y-d,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,d)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"){const c=Math.floor(a/e.tileSize),g=Math.floor(d/e.tileSize);o(c,g)}},this.onMouseMove=(a,d)=>{var v;const c=Math.floor(a/e.tileSize),g=Math.floor(d/e.tileSize);if(c>=0&&c<e.cols&&g>=0&&g<e.rows?this.hoverWallTile={col:c,row:g}:this.hoverWallTile=null,i!=null&&i.isEditMode){if(i.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?n(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&o(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const b=a+this.dragOffset.x,y=d+this.dragOffset.y,f=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((v=this.draggedEntity.colliderModule)==null?void 0:v.radius)??.32;this.draggedEntity.position.x=Math.max(f,Math.min(e.width-f,b)),this.draggedEntity.position.y=Math.max(f,Math.min(e.height-f,y)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const b=l(a,d,.3);this.hoverEntity=b,this.canvas.style.cursor=b?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,d)=>{if(this.draggedEntity&&(e.syncEntitiesWithWalls([this.draggedEntity]),this.draggedEntity=null),i!=null&&i.isEditMode)if(i.editTool==="walls")this.canvas.style.cursor="cell";else{const c=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=c,this.canvas.style.cursor=c?"grab":"crosshair"}},this.handleClick=(a,d)=>{if(!(i!=null&&i.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,d,e),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const c=t.pickupModule.findTargetObject(t,a,d,s,e.wallHeight);c&&(t.pickupModule.pickup(t,c),this.justPickedUp=!0)}}},this.onRightClick=(a,d)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"||!i)return;const c=l(a,d,.4);c&&(this.selectedCanvasEntity=c,i.setSelectedEntity(c))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,e.wallHeight);a&&t.pickupModule.pickup(t,a)}}}}class zt{constructor(t){r(this,"container");r(this,"character");r(this,"arena");r(this,"objects");r(this,"onSpawnObject");r(this,"onDeleteObject");r(this,"onClearObjects");r(this,"selectedEntity");r(this,"isEditMode",!1);r(this,"editTool","entities");r(this,"onSelectionChange");r(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});r(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});r(this,"inspectorEl");r(this,"entitySelectorEl");r(this,"characterSpecificControlsEl");r(this,"objectSpecificControlsEl");r(this,"modePlayBtn");r(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var e;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(e=this.onSelectionChange)==null||e.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const e=this.container.querySelector("#edit-submode-container");e&&(e.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const e=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");e&&s&&(e.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const e=this.container.querySelector("#edit-hint-label");e&&(this.isEditMode?this.editTool==="walls"?e.textContent="Left-drag: Draw | Right-drag: Erase":e.textContent="Click & drag object in arena":e.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let e=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const i of this.objects){const l=i.id===t?"selected":"",n=i.visualShape==="box"?"📦":"⚪",o=i.hasMass?`${i.mass.toFixed(1)}kg`:"Massless";e+=`<option value="${i.id}" ${l}>${n} ${i.name} (${o})</option>`}this.entitySelectorEl.innerHTML=e;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,e,s,i,l,n,o,a,d,c,g,v,b,y,f,w,m,p,k,P,V,C,z,L,T,M,h,S,$,x,R,W,D,B,E,F,A,q,H,j,G,U,u,I,X,Y,K,et,gt,it,st,pt,lt,ot,vt,at,nt,bt,ct,Q,Z,N,_,kt,Vt,Et,Ct;this.container.innerHTML=`
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
                  <span id="val-entity-dynamic-fric">${(((g=this.selectedEntity.frictionModule)==null?void 0:g.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((v=this.selectedEntity.frictionModule)==null?void 0:v.dynamicFrictionMod)??1}">
              </div>
            </div>
            <div id="note-mod-friction" class="module-detached-note" style="display: ${(b=this.selectedEntity.frictionModule)!=null&&b.enabled?"none":"block"};">
              Frictionless: glides indefinitely without ground resistance
            </div>
          </div>

          <!-- 4. Bounciness (Requires Mass) -->
          <div class="module-card" id="card-mod-bounce">
            <div class="toggle-row">
              <label>🏀 Bounciness</label>
              <button id="toggle-mod-bounce" class="btn-toggle ${(y=this.selectedEntity.bounceModule)!=null&&y.enabled?"active":""}">
                ${(f=this.selectedEntity.bounceModule)!=null&&f.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((w=this.selectedEntity.bounceModule)!=null&&w.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(m=this.selectedEntity.bounceModule)!=null&&m.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((p=this.selectedEntity.bounceModule)==null?void 0:p.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((k=this.selectedEntity.bounceModule)==null?void 0:k.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(P=this.selectedEntity.bounceModule)!=null&&P.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(V=this.selectedEntity.bounceModule)!=null&&V.enabled&&((C=this.selectedEntity.bounceModule)!=null&&C.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${(z=this.selectedEntity.bounceModule)!=null&&z.enabled?"none":"block"};">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(L=this.selectedEntity.rollModule)!=null&&L.enabled?"active":""}">
                ${(T=this.selectedEntity.rollModule)!=null&&T.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(M=this.selectedEntity.rollModule)!=null&&M.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(h=this.selectedEntity.rollModule)!=null&&h.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((S=this.selectedEntity.rollModule)==null?void 0:S.rollResistance)??.4).toFixed(2)}</span>
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
                <button id="toggle-walk" class="btn-toggle ${(x=this.character.walkingModule)!=null&&x.enabled?"active":""}">
                  ${(R=this.character.walkingModule)!=null&&R.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((W=this.character.walkingModule)!=null&&W.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&((D=this.character.walkingModule)!=null&&D.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(B=this.character.walkingModule)!=null&&B.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((E=this.character.walkingModule)==null?void 0:E.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((F=this.character.walkingModule)==null?void 0:F.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((A=this.character.walkingModule)==null?void 0:A.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((q=this.character.walkingModule)==null?void 0:q.maxWalkSpeed)??5.2}">
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
                  ${(u=this.character.pickupModule)!=null&&u.enabled?"Attached":"Detached"}
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var F,A,q,H,j,G,U;const t=this.selectedEntity,e=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=e?"none":"flex");const i=this.container.querySelector("#toggle-entity-shape");i&&(t.visualShape==="box"?(i.textContent="Box 📦",i.classList.add("active")):(i.textContent="Circle ⚪",i.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),n=this.container.querySelector("#group-mod-collider"),o=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),n&&(n.style.display=t.hasCollider?"block":"none"),o&&(o.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((F=t.colliderModule)==null?void 0:F.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),d=this.container.querySelector("#group-mod-mass"),c=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),c&&(c.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((A=t.massModule)==null?void 0:A.mass)??1,1);const g=this.container.querySelector("#toggle-mod-friction"),v=this.container.querySelector("#group-mod-friction"),b=this.container.querySelector("#note-mod-friction"),y=this.container.querySelector("#warn-friction-mass"),f=!!(t.frictionModule&&t.frictionModule.enabled);g&&(g.textContent=f?"Attached":"Detached",g.classList.toggle("active",f)),v&&(v.style.display=f?"flex":"none"),b&&(b.style.display=f?"none":"block"),y&&(y.style.display=!t.hasMass&&f?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((q=t.frictionModule)==null?void 0:q.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((H=t.frictionModule)==null?void 0:H.dynamicFrictionMod)??1,2);const w=this.container.querySelector("#toggle-mod-bounce"),m=this.container.querySelector("#group-mod-bounce"),p=this.container.querySelector("#note-mod-bounce"),k=this.container.querySelector("#warn-bounce-mass"),P=!!(t.bounceModule&&t.bounceModule.enabled);w&&(w.textContent=P?"Attached":"Detached",w.classList.toggle("active",P)),m&&(m.style.display=P?"block":"none"),p&&(p.style.display=P?"none":"block"),k&&(k.style.display=!t.hasMass&&P?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const V=this.container.querySelector("#check-mod-vert-bounce"),C=this.container.querySelector("#warn-bounce-vert-vel");if(V&&(V.checked=!!((G=t.bounceModule)!=null&&G.verticalBounce)),C){const u=!!(P&&((U=t.bounceModule)!=null&&U.verticalBounce)&&!t.hasVerticalVelocity);C.style.display=u?"block":"none"}const z=this.container.querySelector("#toggle-mod-vert-pos"),L=this.container.querySelector("#group-mod-vert-pos"),T=this.container.querySelector("#note-mod-vert-pos"),M=t.hasVerticalPosition;z&&(z.textContent=M?"Attached":"Detached",z.classList.toggle("active",M)),L&&(L.style.display=M?"block":"none"),T&&(T.style.display=M?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const h=this.container.querySelector("#toggle-mod-vert-vel"),S=this.container.querySelector("#group-mod-vert-vel"),$=t.hasVerticalVelocity;h&&(h.textContent=$?"Enabled":"Disabled",h.classList.toggle("active",$)),S&&(S.style.display=$?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const x=this.container.querySelector("#toggle-mod-gravity"),R=this.container.querySelector("#note-mod-gravity");x&&(x.textContent=t.hasGravity?"Attached":"Detached",x.classList.toggle("active",t.hasGravity)),R&&(R.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const W=this.container.querySelector("#toggle-mod-roll"),D=this.container.querySelector("#group-mod-roll"),B=this.container.querySelector("#note-roll-friction"),E=!!(t.rollModule&&t.rollModule.enabled);if(W&&(W.textContent=E?"Attached":"Detached",W.classList.toggle("active",E)),D&&(D.style.display=E?"block":"none"),B&&(B.style.display=E&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),e){const u=this.container.querySelector("#toggle-walk"),I=this.container.querySelector("#group-mod-walking"),X=this.container.querySelector("#warn-walk-friction"),Y=this.container.querySelector("#warn-walk-strength"),K=!!(this.character.walkingModule&&this.character.walkingModule.enabled);u&&(u.textContent=K?"Attached":"Detached",u.classList.toggle("active",K)),I&&(I.style.display=K?"flex":"none"),X&&(X.style.display=K&&!this.character.hasFriction?"block":"none"),Y&&(Y.style.display=K&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const et=this.container.querySelector("#toggle-strength"),gt=this.container.querySelector("#group-mod-strength"),it=!!(this.character.strengthModule&&this.character.strengthModule.enabled);et&&(et.textContent=it?"Attached":"Detached",et.classList.toggle("active",it)),gt&&(gt.style.display=it?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const st=this.container.querySelector("#toggle-pickup"),pt=this.container.querySelector("#group-mod-pickup"),lt=!!(this.character.pickupModule&&this.character.pickupModule.enabled);st&&(st.textContent=lt?"Attached":"Detached",st.classList.toggle("active",lt)),pt&&(pt.style.display=lt?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const ot=this.container.querySelector("#toggle-throw"),vt=this.container.querySelector("#group-mod-throw"),at=!!(this.character.throwModule&&this.character.throwModule.enabled);ot&&(ot.textContent=at?"Attached":"Detached",ot.classList.toggle("active",at)),vt&&(vt.style.display=at?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const nt=this.container.querySelector("#toggle-climb"),bt=this.container.querySelector("#group-mod-climb"),ct=this.container.querySelector("#warn-climb-deps"),Q=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(nt&&(nt.textContent=Q?"Attached":"Detached",nt.classList.toggle("active",Q)),bt&&(bt.style.display=Q?"block":"none"),ct){const Z=!this.character.hasVerticalPosition,N=!this.character.hasStrength;ct.style.display=Q&&(Z||N)?"block":"none",ct.textContent=Z?"⚠️ Requires Vertical Position (3D Z-axis)":N?"⚠️ Requires Strength Ability to climb":""}if(this.character.climbingModule){const Z=this.container.querySelector("#toggle-climb-walkoff");if(Z){const _=!!this.character.climbingModule.preventWalkOff;Z.textContent=_?"Active":"Inactive",Z.classList.toggle("active",_)}const N=this.container.querySelector("#toggle-climb-sideways");if(N){const _=!!this.character.climbingModule.horizontalClimb;N.textContent=_?"Active":"Inactive",N.classList.toggle("active",_)}this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1),this.setSliderVal("slide-climb-hang","val-climb-hang",this.character.climbingModule.hangDistance,2)}}}setSliderVal(t,e,s,i){const l=this.container.querySelector(`#${t}`),n=this.container.querySelector(`#${e}`);l&&(l.value=s.toString()),n&&(n.textContent=i>0?s.toFixed(i):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,e=this.container.querySelector("#creator-name");e&&(e.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const i=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");i&&(i.value=t.color),l&&(l.textContent=t.color);const n=this.container.querySelector("#creator-toggle-collider"),o=this.container.querySelector("#grp-creator-radius");n&&(n.textContent=t.hasCollider?"Attached":"Detached",n.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),d=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const c=this.container.querySelector("#creator-toggle-friction"),g=this.container.querySelector("#grp-creator-fric");c&&(c.textContent=t.hasFriction?"Attached":"Detached",c.classList.toggle("active",t.hasFriction)),g&&(g.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const v=this.container.querySelector("#creator-toggle-bounce"),b=this.container.querySelector("#grp-creator-bounce"),y=this.container.querySelector("#creator-check-vert-bounce"),f=this.container.querySelector("#creator-warn-bounce-vert");v&&(v.textContent=t.hasBounce?"Attached":"Detached",v.classList.toggle("active",t.hasBounce)),b&&(b.style.display=t.hasBounce?"block":"none"),y&&(y.checked=t.verticalBounce),f&&(f.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const w=this.container.querySelector("#creator-toggle-vert-pos"),m=this.container.querySelector("#grp-creator-vert-pos");w&&(w.textContent=t.hasVerticalPosition?"Attached":"Detached",w.classList.toggle("active",t.hasVerticalPosition)),m&&(m.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const p=this.container.querySelector("#creator-toggle-vert-vel");p&&(p.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",p.classList.toggle("active",t.hasVerticalVelocity));const k=this.container.querySelector("#creator-toggle-gravity");k&&(k.textContent=t.hasGravity?"Attached":"Detached",k.classList.toggle("active",t.hasGravity));const P=this.container.querySelector("#creator-toggle-roll"),V=this.container.querySelector("#group-creator-roll-resist");P&&(P.textContent=t.hasRollModule?"Enabled":"Disabled",P.classList.toggle("active",t.hasRollModule)),V&&(V.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var D,B,E,F,A,q,H,j,G,U;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(D=this.container.querySelector("#submode-entities"))==null||D.addEventListener("click",()=>{this.setEditTool("entities")}),(B=this.container.querySelector("#submode-walls"))==null||B.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var I;const u=this.entitySelectorEl.value;if(u===this.character.id)this.selectedEntity=this.character;else{const X=this.objects.find(Y=>Y.id===u);X&&(this.selectedEntity=X)}this.updateSelectorOptions(),this.syncEntitySliders(),(I=this.onSelectionChange)==null||I.call(this,this.selectedEntity)}),(E=this.container.querySelector("#btn-duplicate-entity"))==null||E.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(F=this.container.querySelector("#btn-delete-entity"))==null||F.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const e=this.container.querySelector("#toggle-mod-collider");e==null||e.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new dt({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",u=>{this.selectedEntity.colliderRadius=u},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new ht({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",u=>{this.selectedEntity.mass=u,this.updateSelectorOptions()},1);const i=this.container.querySelector("#toggle-mod-friction");i==null||i.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new ut,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",u=>{this.selectedEntity.staticGroundFrictionMod=u},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",u=>{this.selectedEntity.dynamicGroundFrictionMod=u},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new yt({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",u=>{this.selectedEntity.bounceMod=u},2);const n=this.container.querySelector("#check-mod-vert-bounce");n==null||n.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=n.checked),this.syncEntitySliders(),this.updateInspector()});const o=this.container.querySelector("#toggle-mod-vert-pos");o==null||o.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new rt({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",u=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=u),this.selectedEntity.position.z=u,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",u=>{this.selectedEntity.verticalVelocity=u},2);const d=this.container.querySelector("#toggle-mod-gravity");d==null||d.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new ft,this.syncEntitySliders()});const c=this.container.querySelector("#toggle-mod-roll");c==null||c.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new mt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",u=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=u)},2);const g=this.container.querySelector("#toggle-walk");g==null||g.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new Pt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=u)},0),this.setupSlider("slide-walk-speed","val-walk-speed",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=u)},1);const v=this.container.querySelector("#toggle-strength");v==null||v.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new wt({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",u=>{this.character.strength=u},1);const b=this.container.querySelector("#toggle-pickup");b==null||b.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new Rt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",u=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=u)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",u=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=u)},2);const y=this.container.querySelector("#toggle-throw");y==null||y.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new Wt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",u=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=u)},1);const f=this.container.querySelector("#toggle-climb");f==null||f.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Ft,this.syncEntitySliders()});const w=this.container.querySelector("#toggle-climb-walkoff");w==null||w.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.preventWalkOff=!this.character.climbingModule.preventWalkOff),this.syncEntitySliders()});const m=this.container.querySelector("#toggle-climb-sideways");m==null||m.addEventListener("click",()=>{this.character.climbingModule&&(this.character.climbingModule.horizontalClimb=!this.character.climbingModule.horizontalClimb),this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",u=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=u)},0),this.setupSlider("slide-climb-speed","val-climb-speed",u=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=u)},1),this.setupSlider("slide-climb-hang","val-climb-hang",u=>{this.character.climbingModule&&(this.character.climbingModule.hangDistance=u)},2),this.setupSlider("slide-gravity","val-gravity",u=>{this.arena.gravity=u},1),this.setupSlider("slide-wall-height","val-wall-height",u=>{this.arena.setStandardWallHeight(u),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",u,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",u=>{this.arena.setStandardWallHeight(u),this.setSliderVal("slide-wall-height","val-wall-height",u,1)},1);const p=this.container.querySelector("#select-wall-preset");p==null||p.addEventListener("change",()=>{this.arena.loadWallPreset(p.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(A=this.container.querySelector("#btn-prev-wall-map"))==null||A.addEventListener("click",()=>{const u=J.WALL_PRESETS,X=(u.findIndex(Y=>Y.id===this.arena.currentPresetId)-1+u.length)%u.length;this.arena.loadWallPreset(u[X].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(q=this.container.querySelector("#btn-next-wall-map"))==null||q.addEventListener("click",()=>{const u=J.WALL_PRESETS,X=(u.findIndex(Y=>Y.id===this.arena.currentPresetId)+1)%u.length;this.arena.loadWallPreset(u[X].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(H=this.container.querySelector("#btn-reset-walls"))==null||H.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(j=this.container.querySelector("#btn-clear-walls"))==null||j.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",u=>{this.arena.frictionCoeff=u},1),this.setupSlider("slide-static-thresh","val-static-thresh",u=>{this.arena.staticFrictionThreshold=u},2),this.container.querySelectorAll(".preset-chip").forEach(u=>{u.addEventListener("click",()=>{const I=u.getAttribute("data-preset");I&&this.presets[I]&&(this.creatorState={...this.presets[I]},this.syncCreatorInputs())})});const P=this.container.querySelector("#creator-name");P==null||P.addEventListener("input",()=>{this.creatorState.name=P.value});const V=this.container.querySelector("#creator-toggle-shape");V==null||V.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",V.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",V.classList.toggle("active",this.creatorState.visualShape==="box")});const C=this.container.querySelector("#creator-color"),z=this.container.querySelector("#val-creator-color");C==null||C.addEventListener("input",()=>{this.creatorState.color=C.value,z&&(z.textContent=C.value)});const L=this.container.querySelector("#creator-toggle-collider");L==null||L.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,L.textContent=this.creatorState.hasCollider?"Attached":"Detached",L.classList.toggle("active",this.creatorState.hasCollider);const u=this.container.querySelector("#grp-creator-radius");u&&(u.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",u=>{this.creatorState.colliderRadius=u},2);const T=this.container.querySelector("#creator-toggle-mass");T==null||T.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,T.textContent=this.creatorState.hasMass?"Attached":"Detached",T.classList.toggle("active",this.creatorState.hasMass);const u=this.container.querySelector("#grp-creator-mass");u&&(u.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",u=>{this.creatorState.mass=u},1);const M=this.container.querySelector("#creator-toggle-friction");M==null||M.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,M.textContent=this.creatorState.hasFriction?"Attached":"Detached",M.classList.toggle("active",this.creatorState.hasFriction);const u=this.container.querySelector("#grp-creator-fric");u&&(u.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",u=>{this.creatorState.dynamicFrictionMod=u},2);const h=this.container.querySelector("#creator-toggle-bounce");h==null||h.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,h.textContent=this.creatorState.hasBounce?"Attached":"Detached",h.classList.toggle("active",this.creatorState.hasBounce);const u=this.container.querySelector("#grp-creator-bounce");u&&(u.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",u=>{this.creatorState.bounceMod=u},2);const S=this.container.querySelector("#creator-check-vert-bounce");S==null||S.addEventListener("change",()=>{this.creatorState.verticalBounce=S.checked,this.syncCreatorInputs()});const $=this.container.querySelector("#creator-toggle-vert-pos");$==null||$.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",u=>{this.creatorState.elevation=u},2);const x=this.container.querySelector("#creator-toggle-vert-vel");x==null||x.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const R=this.container.querySelector("#creator-toggle-gravity");R==null||R.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,R.textContent=this.creatorState.hasGravity?"Attached":"Detached",R.classList.toggle("active",this.creatorState.hasGravity)});const W=this.container.querySelector("#creator-toggle-roll");W==null||W.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,W.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",W.classList.toggle("active",this.creatorState.hasRollModule);const u=this.container.querySelector("#group-creator-roll-resist");u&&(u.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",u=>{this.creatorState.rollResistance=u},2),(G=this.container.querySelector("#btn-spawn-configured"))==null||G.addEventListener("click",()=>{this.spawnFromCreator()}),(U=this.container.querySelector("#btn-clear-entities"))==null||U.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,e=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),i=new tt({name:t.name||"Custom Object",position:{x:e,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new dt({radius:t.colliderRadius}):null,massModule:t.hasMass?new ht({mass:t.mass}):null,frictionModule:t.hasFriction?new ut({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new yt({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new rt({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new ft:null,rollModule:t.hasRollModule?new mt({rollResistance:t.rollResistance}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,e=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),i=new tt({name:`${t.name} (Copy)`,position:{x:e,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new dt({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new ht({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new ut({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new yt({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new rt({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new ft({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new mt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,e,s,i=0){const l=this.container.querySelector(`#${t}`),n=this.container.querySelector(`#${e}`);!l||!n||l.addEventListener("input",()=>{const o=parseFloat(l.value);n.textContent=i>0?o.toFixed(i):Math.round(o).toString(),s(o)})}updateInspector(){var i;const t=this.selectedEntity,e=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}renderWallPresetOptions(){return J.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=J.WALL_PRESETS.find(e=>e.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=J.WALL_PRESETS.find(e=>e.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const e=this.container.querySelector("#label-wall-map-badge");e&&(e.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class Bt{constructor(t){r(this,"arena");r(this,"character");r(this,"objects");r(this,"renderer");r(this,"inputManager");r(this,"devPanel");r(this,"isRunning",!1);r(this,"lastTime",0);r(this,"accumulator",0);r(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let e=(t-this.lastTime)/1e3;for(this.lastTime=t,e>.2&&(e=.2),this.accumulator+=e;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const i=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,i,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const e=this.inputManager;e.draggedEntity!==this.character?this.character.updateCharacter(t,e.movementVector,e.isMouseDown&&!this.devPanel.isEditMode,e.mousePos,this.arena,e.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const i of this.objects)e.draggedEntity!==i&&i.updatePosition(t,this.arena);const s=e.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const i=this.character.pickupModule.findTargetObject(this.character,e.mousePos.x,e.mousePos.y,this.objects,this.arena.wallHeight);i&&(this.character.pickupModule.pickup(this.character,i),e.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],e=this.inputManager,s=3;for(let i=0;i<s;i++)for(let l=0;l<t.length;l++)for(let n=l+1;n<t.length;n++){const o=t[l],a=t[n];if(o.isHeld||a.isHeld||o===e.draggedEntity||a===e.draggedEntity||!o.hasCollider||!a.hasCollider)continue;const d=this.arena.wallHeight-.15,c=o.position.z>=d||o.supportingSurfaceHeight>=d||o.standingWall!==null||o.isAboveWalls,g=a.position.z>=d||a.supportingSurfaceHeight>=d||a.standingWall!==null||a.isAboveWalls;if(c!==g)continue;const v=a.position.x-o.position.x,b=a.position.y-o.position.y,y=v*v+b*b,f=o.colliderRadius+a.colliderRadius;if(y<f*f&&y>1e-6){const w=Math.sqrt(y),m=f-w,p=v/w,k=b/w,P=a.velocity.x-o.velocity.x,V=a.velocity.y-o.velocity.y,C=P*p+V*k,z=!o.hasMass,L=!a.hasMass;if(z&&L){if(o.position.x-=p*m*.5,o.position.y-=k*m*.5,a.position.x+=p*m*.5,a.position.y+=k*m*.5,C<0){const x=-C*.5;o.velocity.x-=x*p,o.velocity.y-=x*k,a.velocity.x+=x*p,a.velocity.y+=x*k}continue}if(!z&&L){this.isEntityPinnedAgainstWall(a,p,k)?(o.position.x-=p*m,o.position.y-=k*m,o.velocity.x=0,o.velocity.y=0):(a.position.x+=p*m,a.position.y+=k*m,C<0&&(a.velocity.x+=(o.velocity.x-a.velocity.x)*Math.abs(p),a.velocity.y+=(o.velocity.y-a.velocity.y)*Math.abs(k)));continue}if(z&&!L){this.isEntityPinnedAgainstWall(o,-p,-k)?(a.position.x+=p*m,a.position.y+=k*m,a.velocity.x=0,a.velocity.y=0):(o.position.x-=p*m,o.position.y-=k*m,C<0&&(o.velocity.x+=(a.velocity.x-o.velocity.x)*Math.abs(p),o.velocity.y+=(a.velocity.y-o.velocity.y)*Math.abs(k)));continue}const T=1/o.mass,M=1/a.mass,h=T+M;if(h<=1e-4)continue;const S=T/h,$=M/h;if(o.position.x-=p*m*S,o.position.y-=k*m*S,a.position.x+=p*m*$,a.position.y+=k*m*$,C<0){const x=o instanceof Mt&&o.isActivelyWalking||a instanceof Mt&&a.isActivelyWalking,R=o.hasBounce&&a.hasBounce,W=o.isCharacter||!o.hasBounce?0:o.bounceMod??0,D=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,E=-(1+(x||!R?0:Math.max(0,Math.min(.98,Math.max(W,D)))))*C/h;o.velocity.x-=E*T*p,o.velocity.y-=E*T*k,a.velocity.x+=E*M*p,a.velocity.y+=E*M*k;const F=-k,A=p,q=P*F+V*A;if(Math.abs(q)>.001){const H=.35*Math.sqrt(o.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),j=.4,G=Math.abs(q)/(h*(1+1/j)),U=H*Math.abs(E),u=Math.min(G,U)*Math.sign(q);if(o.velocity.x+=u*T*F,o.velocity.y+=u*T*A,a.velocity.x-=u*M*F,a.velocity.y-=u*M*A,o.rollModule&&o.rollModule.enabled){const I=u/(j*o.mass*o.colliderRadius);o.rollModule.angularVelocity.z+=I,o.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,o.rollModule.angularVelocity.z)),o.isRestingOnSurface&&(o.rollModule.angularVelocity.y=o.velocity.x/o.colliderRadius,o.rollModule.angularVelocity.x=-o.velocity.y/o.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const I=u/(j*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=I,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,e,s){const i=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(e>.3&&t.position.x>=this.arena.width-i-l||e<-.3&&t.position.x<=i+l||s>.3&&t.position.y>=this.arena.height-i-l||s<-.3&&t.position.y<=i+l)return!0;for(const n of this.arena.walls)if(t.position.z<n.wallHeight-.05){const o=t.position.x+e*l,a=t.position.y+s*l,d=Math.max(n.x,Math.min(o,n.x+n.width)),c=Math.max(n.y,Math.min(a,n.y+n.height)),g=o-d,v=a-c;if(g*g+v*v<i*i)return!0}return!1}}function Lt(){const O=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!O||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const e=O.getContext("2d");if(!e){console.error("Failed to acquire 2D canvas context");return}const s=new J(20,14,1);O.width=1e3,O.height=700;const i=new Mt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new tt({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new tt({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new tt({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new tt({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new mt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})];s.syncEntitiesWithWalls([i,...l]);const n=new xt(e),o=new zt({container:t,character:i,arena:s,objects:l,onSpawnObject:c=>{s.syncEntitiesWithWalls([c]),l.push(c),o.updateSelectorOptions()},onDeleteObject:c=>{const g=l.indexOf(c);g!==-1&&l.splice(g,1),o.updateSelectorOptions()},onClearObjects:()=>{i.heldObject&&(i.heldObject.isHeld=!1,i.heldObject.heldBy=null,i.heldObject=null),l.length=0,o.updateSelectorOptions()}}),a=new At(O,s);a.handleInteractions(i,s,l,o),o.onSelectionChange=c=>{a.selectedCanvasEntity=c},new Bt({arena:s,character:i,objects:l,renderer:n,inputManager:a,devPanel:o}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",Lt);

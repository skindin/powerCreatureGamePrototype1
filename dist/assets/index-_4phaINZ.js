var Et=Object.defineProperty;var Pt=(R,t,i)=>t in R?Et(R,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):R[t]=i;var d=(R,t,i)=>Pt(R,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const l of e)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function i(e){const l={};return e.integrity&&(l.integrity=e.integrity),e.referrerPolicy&&(l.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?l.credentials="include":e.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(e){if(e.ep)return;e.ep=!0;const l=i(e);fetch(e.href,l)}})();class lt{constructor(t={}){d(this,"z");d(this,"hasVerticalVelocity");d(this,"verticalVelocity");d(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}const Mt=class Mt{constructor(t=20,i=14,s=1){d(this,"width");d(this,"height");d(this,"tileSize");d(this,"cols");d(this,"rows");d(this,"wallHeight");d(this,"gravity");d(this,"frictionCoeff");d(this,"staticFrictionThreshold");d(this,"tileGrid");d(this,"walls",[]);d(this,"currentPresetId","standard");this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.loadWallPreset("standard")}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,i,s){if(t<0||t>=this.cols||i<0||i>=this.rows)return!1;const e=s?1:0;return this.tileGrid[i][t]===e?!1:(this.tileGrid[i][t]=e,this.rebuildWalls(),!0)}hasWall(t,i){return t<0||t>=this.cols||i<0||i>=this.rows?!1:this.tileGrid[i][t]===1}loadWallPreset(t,i){const s=Mt.WALL_PRESETS.find(e=>e.id===t);return s?(this.currentPresetId=t,this.tileGrid=s.generate(this.cols,this.rows),this.rebuildWalls(),this.syncEntitiesWithWalls(i),!0):!1}syncEntitiesWithWalls(t){var i;if(t)for(const s of t){const e=s.hasCollider?s.colliderRadius:((i=s.colliderModule)==null?void 0:i.radius)??.32,l=this.getSupportingWall(s.position.x,s.position.y,e);l&&s.position.z<l.wallHeight&&(s.hasVerticalPosition||(s.verticalPositionModule?s.verticalPositionModule.enabled=!0:s.verticalPositionModule=new lt({z:l.wallHeight,hasVerticalVelocity:!0})),s.position.z=l.wallHeight,s.supportingSurfaceHeight=l.wallHeight,s.verticalVelocity=0)}}clearAllWalls(t){this.loadWallPreset("empty",t)}resetDefaultWalls(t){this.loadWallPreset("standard",t)}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),c=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,a=i-c;return o*o+a*a<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}};d(Mt,"WALL_PRESETS",[{id:"standard",name:"🏛️ Standard Arena",badge:"Balanced",description:"Center dividing wall with an open gateway and two 2×2 cover obstacles.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=10;for(let l=1;l<=4;l++)s[l][e]=1;for(let l=8;l<=12;l++)s[l][e]=1;return s[4][4]=1,s[5][4]=1,s[4][5]=1,s[5][5]=1,s[7][15]=1,s[8][15]=1,s[7][16]=1,s[8][16]=1,s}},{id:"trenches",name:"⛏️ Trench Tunnels",badge:"Dense Walls",description:"Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>1));for(let e=2;e<=17;e++)s[3][e]=0,s[7][e]=0,s[10][e]=0;for(let e=2;e<=11;e++)s[e][5]=0,s[e][10]=0,s[e][14]=0;s[1][10]=0,s[12][10]=0,s[7][1]=0,s[7][18]=0;for(let e=5;e<=9;e++)s[e][2]=0;for(let e=5;e<=9;e++)s[e][17]=0;for(let e=2;e<=5;e++)s[5][e]=0;for(let e=10;e<=14;e++)s[5][e]=0;for(let e=5;e<=10;e++)s[9][e]=0;for(let e=14;e<=17;e++)s[9][e]=0;return s[7][5]=0,s}},{id:"courtyards",name:"🏰 Courtyards & Platforms",badge:"4 Quadrants",description:"Four large raised platforms in each corner with a central dais and open courtyards.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=2;e<=4;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=9;e<=11;e++){for(let l=3;l<=6;l++)s[e][l]=1;for(let l=13;l<=16;l++)s[e][l]=1}for(let e=6;e<=7;e++)for(let l=9;l<=10;l++)s[e][l]=1;return s}},{id:"pillars",name:"🗿 Pillars & Monoliths",badge:"Tactical Cover",description:"Raised monoliths and stepping-stone pillars scattered across the arena.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0)),e=[[3,2],[8,2],[15,2],[3,10],[8,10],[15,10],[5,6],[13,6],[9,6]];for(const[l,c]of e)s[c][l]=1,s[c+1][l]=1,s[c][l+1]=1,s[c+1][l+1]=1;return s}},{id:"maze",name:"🌀 Labyrinth Maze",badge:"Winding Paths",description:"Interlocking corridors and winding paths with high walls to climb over or navigate.",generate:(t,i)=>{const s=Array.from({length:i},()=>Array.from({length:t},()=>0));for(let e=1;e<=9;e++)s[e][4]=1;for(let e=4;e<=12;e++)s[e][7]=1;for(let e=1;e<=9;e++)s[e][10]=1;for(let e=4;e<=12;e++)s[e][13]=1;for(let e=1;e<=9;e++)s[e][16]=1;for(let e=7;e<=10;e++)s[4][e]=1;for(let e=13;e<=16;e++)s[4][e]=1;for(let e=4;e<=7;e++)s[9][e]=1;for(let e=10;e<=13;e++)s[9][e]=1;return s}},{id:"empty",name:"⬜ Empty (Open Arena)",badge:"Clean Slate",description:"Completely open arena with zero walls for custom level design.",generate:(t,i)=>Array.from({length:i},()=>Array.from({length:t},()=>0))}]);let U=Mt;class ot{constructor(t={}){d(this,"radius");d(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class at{constructor(t={}){d(this,"mass");d(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class nt{constructor(t={}){d(this,"staticFrictionMod");d(this,"dynamicFrictionMod");d(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class ct{constructor(t={}){d(this,"bounceMod");d(this,"verticalBounce");d(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class vt{constructor(t={}){d(this,"enabled");this.enabled=t.enabled??!0}}class N{constructor(t={}){d(this,"id");d(this,"name");d(this,"position");d(this,"velocity");d(this,"color");d(this,"isHeld");d(this,"heldBy");d(this,"lastThrower",null);d(this,"isCharacter",!1);d(this,"isClimbing",!1);d(this,"visualShape","circle");d(this,"colliderModule",null);d(this,"massModule",null);d(this,"frictionModule",null);d(this,"bounceModule",null);d(this,"verticalPositionModule",null);d(this,"gravityModule",null);d(this,"rollModule",null);d(this,"supportingSurfaceHeight",0);var i,s,e,l,c;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((c=t.velocity)==null?void 0:c.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new ot({radius:t.colliderRadius}):new ot({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new at({mass:t.mass}):new at({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new nt({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new ct({bounceMod:t.bounceMod}):new ct({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new lt({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new vt,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new ot({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new at({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new nt({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new nt({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new ct({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.95||this.supportingSurfaceHeight>=.95)}updatePosition(t,i){var a,h;if(this.isHeld)return;if(this.lastThrower){const n=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,r=(((a=this.lastThrower.pickupModule)==null?void 0:a.pickupReach)??1.3)+this.colliderRadius+n;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>r||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0,e=null;if(this.hasCollider&&this.hasVerticalPosition&&i.walls.length>0&&(this.position.z>=i.wallHeight-.05||this.supportingSurfaceHeight>=i.wallHeight-.05&&this.position.z>=i.wallHeight-.2)&&(e=i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius),e&&(s=e.wallHeight)),this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const n=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const r=this.rollModule,g=this.colliderRadius>0?this.colliderRadius:.3,y=.4,u=this.bounceMod,f=(1+u)*this.mass*n,m=i.frictionCoeff*this.dynamicGroundFrictionMod*.05,b=this.velocity.x-r.angularVelocity.y*g,M=this.velocity.y+r.angularVelocity.x*g,v=Math.hypot(b,M);if(v>.001&&m>0){const x=m*f,k=v*this.mass/(1+1/y),w=Math.min(k,x),V=b/v*w,E=M/v*w;this.velocity.x-=V/this.mass,this.velocity.y-=E/this.mass,r.angularVelocity.y+=V/(y*this.mass*g),r.angularVelocity.x-=E/(y*this.mass*g)}const S=Math.max(.65,1-(1-u)*.35);r.angularVelocity.x*=S,r.angularVelocity.y*=S,r.angularVelocity.z*=S}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((h=this.walkingModule)==null?void 0:h.enabled)))if(this.rollModule&&this.rollModule.enabled){const r=this.rollModule,g=this.colliderRadius>0?this.colliderRadius:.3,y=i.frictionCoeff*this.dynamicGroundFrictionMod,u=.4,f=this.velocity.x-r.angularVelocity.y*g,m=this.velocity.y+r.angularVelocity.x*g,b=Math.hypot(f,m);if(y>0&&b>.001){const v=y*(1+1/u)*t;if(b<=v){const S=this.velocity.x+u*r.angularVelocity.y*g,x=this.velocity.y-u*r.angularVelocity.x*g,k=S/(1+u),w=x/(1+u);this.velocity.x=k,this.velocity.y=w,r.angularVelocity.y=k/g,r.angularVelocity.x=-w/g}else{const S=f/b*y*t,x=m/b*y*t;this.velocity.x-=S,this.velocity.y-=x,r.angularVelocity.y+=S/(u*g),r.angularVelocity.x-=x/(u*g)}}const M=Math.hypot(this.velocity.x,this.velocity.y);if(M>0){if(r.rollResistance>0){const v=r.rollResistance*t,S=Math.max(0,M-v);if(S<.005)this.velocity.x=0,this.velocity.y=0,r.angularVelocity.x=0,r.angularVelocity.y=0;else{const x=S/M;this.velocity.x*=x,this.velocity.y*=x,r.angularVelocity.x*=x,r.angularVelocity.y*=x}}}else{const v=Math.hypot(r.angularVelocity.x,r.angularVelocity.y);if(v>0&&y>0){const S=y/(u*g)*t,x=Math.max(0,v-S),k=v>0?x/v:0;r.angularVelocity.x*=k,r.angularVelocity.y*=k}}if(Math.abs(r.angularVelocity.z)>.001&&r.rollResistance>0){const v=r.rollResistance/(u*g)*t,S=Math.sign(r.angularVelocity.z),x=Math.abs(r.angularVelocity.z);r.angularVelocity.z=x<=v?0:S*(x-v)}r.updateVisualPhase(t)}else{const r=Math.hypot(this.velocity.x,this.velocity.y);if(r>0){const g=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(r<g)this.velocity.x=0,this.velocity.y=0;else{const y=i.frictionCoeff*this.dynamicGroundFrictionMod*t,f=Math.max(0,r-y)/r;this.velocity.x*=f,this.velocity.y*=f}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);if(this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t,this.hasCollider){const n=this.colliderRadius,r=n,g=i.width-n,y=n,u=i.height-n,f=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.position.x<r?(this.position.x=r,this.resolveWallImpact(1,0,f)):this.position.x>g&&(this.position.x=g,this.resolveWallImpact(-1,0,f)),this.position.y<y?(this.position.y=y,this.resolveWallImpact(0,1,f)):this.position.y>u&&(this.position.y=u,this.resolveWallImpact(0,-1,f));for(const m of i.walls)this.position.z<m.wallHeight-.05&&this.resolveWallCollision(m)}const c=16,o=Math.hypot(this.velocity.x,this.velocity.y);if(o>c){const n=c/o;this.velocity.x*=n,this.velocity.y*=n}if(this.rollModule&&this.rollModule.enabled){const r=this.rollModule.angularSpeed;if(r>35){const g=35/r;this.rollModule.angularVelocity.x*=g,this.rollModule.angularVelocity.y*=g,this.rollModule.angularVelocity.z*=g}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}resolveWallImpact(t,i,s){this.lastThrower=null;const e=this.velocity.x*t+this.velocity.y*i;if(e>=0)return;const l=e;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*i):(this.velocity.x-=l*t,this.velocity.y-=l*i),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const c=this.rollModule,o=this.colliderRadius>0?this.colliderRadius:.3,a=.4,h=.35,n=-i,r=t,g=this.velocity.x*n+this.velocity.y*r,y=-(1+s)*this.mass*l,u=g-c.angularVelocity.z*o,f=Math.abs(u)*this.mass/(1+1/a),m=h*y,b=Math.min(f,m),M=-Math.sign(u)*b,v=g,S=v+M/this.mass,x=Math.abs(S)<=Math.abs(v)+.01?S-v:-v*.1;this.velocity.x+=x*n,this.velocity.y+=x*r;const w=-(x*this.mass)/(a*this.mass*o);c.angularVelocity.z+=w,c.angularVelocity.z=Math.max(-30,Math.min(30,c.angularVelocity.z)),c.angularVelocity.y=this.velocity.x/o,c.angularVelocity.x=-this.velocity.y/o}}resolveWallCollision(t){if(!this.hasCollider)return;const i=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),e=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,c=this.position.y-e,o=l*l+c*c;if(o<i*i){this.lastThrower=null;const a=Math.sqrt(o);let h=0,n=0,r=0;if(a===0){const y=Math.abs(this.position.x-t.x),u=Math.abs(t.x+t.width-this.position.x),f=Math.abs(this.position.y-t.y),m=Math.abs(t.y+t.height-this.position.y),b=Math.min(y,u,f,m);b===y?(h=-1,r=y+i):b===u?(h=1,r=u+i):b===f?(n=-1,r=f+i):(n=1,r=m+i)}else r=i-a,h=l/a,n=c/a;this.position.x+=h*r,this.position.y+=n*r;const g=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(h,n,g)}}}class St{constructor(){d(this,"id","walking");d(this,"name","Walking Module");d(this,"enabled",!0);d(this,"maxWalkForce",35);d(this,"maxWalkSpeed",5.2);d(this,"dragDamping",8.01)}update(t,i,s,e){var V;if(!this.enabled||!t.isRestingOnSurface||t.isClimbing){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((V=t.frictionModule)!=null&&V.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(i.x,i.y),c=l>.05;if(t.isActivelyWalking=c,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const h=e.frictionCoeff/10,n=a*h,g=t.carriedMass/(Math.max(.1,t.strength)*8),y=this.maxWalkSpeed/(1+g);let u=0,f=0;if(c){const E=i.x/l,P=i.y/l;u=E*y,f=P*y}const m=u-t.velocity.x,b=f-t.velocity.y,M=Math.hypot(m,b);if(M<.001){t.velocity.x=u,t.velocity.y=f;return}const v=Math.hypot(t.velocity.x,t.velocity.y),S=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),x=t.hasMass?Math.max(.2,t.baseMass):1,w=this.maxWalkForce*t.strength/x*n*s;if(M<=w||!c&&v<S)t.velocity.x=u,t.velocity.y=f;else{const E=w/M;t.velocity.x+=m*E,t.velocity.y+=b*E}}}class wt{constructor(){d(this,"id","pickup");d(this,"name","Pickup Ability");d(this,"enabled",!0);d(this,"pickupReach",1.3);d(this,"crossLayerReachRatio",.55)}isObjectInReach(t,i,s=1){var n;if(!this.enabled||i===t||i.isHeld||i.isCharacter||i.lastThrower===t)return!1;const e=t.position.z>=s-.05?1:0,l=i.position.z>=s-.05?1:0,o=e!==l?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,a=i.hasCollider?i.colliderRadius:((n=i.colliderModule)==null?void 0:n.radius)??.32;return Math.hypot(i.position.x-t.position.x,i.position.y-t.position.y)<=o+a}findTargetObject(t,i,s,e,l=1){if(!this.enabled)return null;let c=null,o=1/0;for(const a of e){if(!this.isObjectInReach(t,a,l))continue;const h=Math.hypot(a.position.x-i,a.position.y-s);h<o&&(o=h,c=a)}return c}pickup(t,i){if(!this.enabled||t.heldObject)return!1;const s=i.velocity.x,e=i.velocity.y,l=i.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=e*l,t.isAboveGround&&Math.abs(i.verticalVelocity)>.1&&(t.verticalVelocity+=i.verticalVelocity*l),t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=i.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const i=t.heldObject;return t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.velocity.x=t.velocity.x*.4,i.velocity.y=t.velocity.y*.4,i.verticalVelocity=0,i}}class kt{constructor(){d(this,"id","throw");d(this,"name","Throw Ability");d(this,"enabled",!0);d(this,"baseThrowForce",7.6);d(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const l=Math.max(e.x,Math.min(t,e.x+e.width)),c=Math.max(e.y,Math.min(i,e.y+e.height)),o=t-l,a=i-c;return o*o+a*a<s*s}computeLaunchVelocity(t,i,s,e,l,c,o,a=!0,h=!0,n=.35){const r=e-t,g=l-i,y=Math.hypot(r,g);if(y<.1)return null;const u=Math.min(y,this.maxThrowAimDistance),f=r/y,m=g/y,b=t+f*u,M=i+m*u;if(!a||!h){const W=Math.max(3,o),B=Math.max(.14,u/W),q=f*W,O=m*W;return{vx:q,vy:O,vz:0,totalTime:B,finalTargetX:b,finalTargetY:M,targetSurfaceHeight:s}}const v=c.getSupportingSurfaceHeight(b,M),S=v-s,x=Math.max(3,o);let w=Math.max(.14,u/x);S>0&&(w=Math.max(w,Math.sqrt(2*S/c.gravity)));const V=40,E=n>0?n:.35,P=.25;for(let W=1;W<V;W++){const B=W/V,q=t+(b-t)*B,O=i+(M-i)*B;for(const C of c.walls)if(this.testWallIntersection(q,O,E,C)){if(v>0&&b>=C.x&&b<=C.x+C.width&&M>=C.y&&M<=C.y+C.height&&B>.65)continue;const j=(1-B)*s+B*v,X=C.wallHeight+P-j;if(X>0){const H=c.gravity*B*(1-B);if(H>.001){const p=2*X/H;if(p>0){const L=Math.sqrt(p);L>w&&(w=L)}}}}}if(w<=.05)return null;const $=(S+.5*c.gravity*w*w)/w,D=u/w,T=f*D,F=m*D;return{vx:T,vy:F,vz:$,totalTime:w,finalTargetX:b,finalTargetY:M,targetSurfaceHeight:v}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,c=l.position.x,o=l.position.y,a=l.position.z,h=this.baseThrowForce*t.strength,n=l.hasGravity&&l.hasVerticalVelocity,r=this.computeLaunchVelocity(c,o,a,i,s,e,h,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!r)return null;const{vx:g,vy:y,vz:u,totalTime:f,finalTargetX:m,finalTargetY:b,targetSurfaceHeight:M}=r,v=90,S=f/v,x=[];let k=!1,w=M>0,V;for(let P=0;P<=v;P++){const $=P*S,D=P===v?m:c+g*$,T=P===v?b:o+y*$,F=n?a+u*$-.5*e.gravity*$*$:a,W=n?P===v?M:Math.max(M,F):a,B=n?u-e.gravity*$:0,q=W>e.wallHeight;let O=!1,C=!1;for(const z of e.walls)if(this.testWallIntersection(D,T,l.colliderRadius,z)&&(O=!0,W<=z.wallHeight+.001)){if(x.length>0&&x[x.length-1].z>=z.wallHeight-.05&&B<=0){if(M>0&&(P>=v-2||Math.hypot(D-m,T-b)<.2)){w=!0;break}else if(M===0){w=!0,C=!0,k=!0,V=z.id;break}}else if(W<z.wallHeight-.05){C=!0,k=!0,V=z.id;break}}if(x.push({x:D,y:T,z:W,t:$,couldClearWall:q,isOverWall:O,collidesWall:C}),C)break}const E=x[x.length-1];return{points:x,landPoint:{x:k?E.x:m,y:k?E.y:b},isBlockedByWall:k,isLandingOnWallTop:k?w:M>0,blockedAtWallId:V}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,c=l.position.x,o=l.position.y,a=l.position.z,h=this.baseThrowForce*t.strength,n=this.computeLaunchVelocity(c,o,a,i,s,e,h,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!n)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=n.vx,l.velocity.y=n.vy,l.verticalVelocity=n.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const m=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=n.vx/m,l.rollModule.angularVelocity.x=-n.vy/m}const r=l.hasMass?l.mass:0,g=t.hasMass?Math.max(.2,t.baseMass):0,y=r>0&&g>0?r/g:0;t.heldObject=null;const u=n.vx-t.velocity.x,f=n.vy-t.velocity.y;if(t.velocity.x-=u*y,t.velocity.y-=f*y,t.isAboveGround&&l.hasVerticalVelocity){const m=n.vz-t.verticalVelocity;t.verticalVelocity-=m*y}return l}}class Vt{constructor(){d(this,"id","climbing");d(this,"name","Climbing Module");d(this,"enabled",!0);d(this,"maxAdhesion",35);d(this,"maxClimbSpeed",3)}update(t,i,s,e,l){if(!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const c=t.hasCollider?t.colliderRadius:.44,o=Math.hypot(i.x,i.y),a=o>=.05,h=a?i.x/o:0,n=a?i.y/o:0;let r=null,g=1/0,y=0,u=0,f=0;for(const v of l.walls){const S=Math.max(v.x,Math.min(t.position.x,v.x+v.width)),x=Math.max(v.y,Math.min(t.position.y,v.y+v.height)),k=S-t.position.x,w=x-t.position.y,V=Math.hypot(k,w);V<=c+.15&&V<g&&(g=V,r=v,y=a?h*k+n*w:0,u=k,f=w)}if(!r)return t.isClimbing=!1,!1;const m=t.mass;if(m*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;if((t.isClimbing||t.position.z>.05)&&t.position.z<r.wallHeight){if(a&&y<-.1)return t.isClimbing=!1,t.velocity.x=h*3,t.velocity.y=n*3,!1;if(t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0,s){const v=t.baseMass,S=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*v*t.strength/Math.max(.1,m)));if(t.position.z+=S*e,t.position.z>=r.wallHeight)if(t.position.z=r.wallHeight,t.supportingSurfaceHeight=r.wallHeight,t.verticalVelocity=0,t.isClimbing=!1,a)t.velocity.x=h*3.5,t.velocity.y=n*3.5;else{const x=g>.001?u/g:0,k=g>.001?f/g:0;t.velocity.x=x*1.5,t.velocity.y=k*1.5}}return!0}if(s&&a&&y>.01&&t.position.z<r.wallHeight){t.isClimbing=!0,t.verticalVelocity=0,t.velocity.x=0,t.velocity.y=0;const v=t.baseMass,S=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*v*t.strength/Math.max(.1,m)));return t.position.z+=S*e,!0}return t.isClimbing=!1,!1}}class mt{constructor(t={}){d(this,"id","strength");d(this,"name","Strength Module");d(this,"enabled",!0);d(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class ft extends N{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});d(this,"strengthModule");d(this,"facingAngle");d(this,"heldObject");d(this,"isCharacter",!0);d(this,"isActivelyWalking",!1);d(this,"baseMass",1.2);d(this,"walkingModule");d(this,"pickupModule");d(this,"throwModule");d(this,"climbingModule");d(this,"isAiming");d(this,"aimTarget");d(this,"activeTrajectory");this.baseMass=i.mass??1.2,this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new mt({strength:i.strength??1}),this.walkingModule=new St,this.pickupModule=new wt,this.throwModule=new kt,this.climbingModule=new Vt}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(i){this.strengthModule?this.strengthModule.strength=Math.max(.1,i):this.strengthModule=new mt({strength:i})}get mass(){const i=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return i+s}set mass(i){this.baseMass=Math.max(.1,i),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,c=s.y-this.position.y;if(Math.hypot(l,c)>.1){this.facingAngle=Math.atan2(c,l);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,l,c,o=!1){if(this.climbingModule&&this.climbingModule.update(this,s,o,i,c),this.walkingModule&&this.walkingModule.update(this,s,i,c),this.updatePosition(i,c),this.updateFacingDirection(e,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,c):this.activeTrajectory=null}}class bt{constructor(t={}){d(this,"enabled",!0);d(this,"angularVelocity",{x:0,y:0,z:0});d(this,"rollResistance",.4);d(this,"visualPhase",0);var i,s,e;this.enabled=t.enabled??!0,this.angularVelocity={x:((i=t.angularVelocity)==null?void 0:i.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((e=t.angularVelocity)==null?void 0:e.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const i=this.angularSpeed;i>.001&&(this.visualPhase=(this.visualPhase+i*t)%(Math.PI*2))}}class Ct{constructor(t){d(this,"ctx");this.ctx=t}render(t,i,s,e,l=!1,c,o,a=!1,h){const n=this.ctx,r=n.canvas.width/t.width;n.clearRect(0,0,n.canvas.width,n.canvas.height),this.drawFloorGrid(t,r),this.drawWalls(t,r),a&&h&&this.drawWallEditorHover(t,h,r);const g=[i,...s];g.sort((y,u)=>Math.abs(y.position.z-u.position.z)>.001?y.position.z-u.position.z:Math.abs(y.verticalVelocity-u.verticalVelocity)>.001?y.verticalVelocity-u.verticalVelocity:y.position.y-u.position.y);for(const y of g)y instanceof ft?this.drawCharacter(y,s,r):this.drawFreebodyObject(y,g,i,r,y===o,t.wallHeight);for(const y of g)this.drawObjectShadow(y,t,r);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,r),l&&(c&&c!==e&&this.drawHoverGizmo(c,r),e&&this.drawSelectionGizmo(e,l,r))}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawWallEditorHover(t,i,s){if(i.col<0||i.col>=t.cols||i.row<0||i.row>=t.rows)return;const e=this.ctx,l=i.col*t.tileSize*s,c=i.row*t.tileSize*s,o=t.tileSize*s,a=t.hasWall(i.col,i.row);e.save(),a?(e.fillStyle="rgba(239, 68, 68, 0.35)",e.strokeStyle="#ef4444",e.lineWidth=2.5,e.fillRect(l,c,o,o),e.strokeRect(l,c,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#fca5a5",e.textAlign="center",e.textBaseline="middle",e.fillText("✕ Erase",l+o/2,c+o/2)):(e.fillStyle="rgba(56, 189, 248, 0.3)",e.strokeStyle="#38bdf8",e.lineWidth=2.5,e.fillRect(l,c,o,o),e.strokeRect(l,c,o,o),e.font="bold 12px system-ui, sans-serif",e.fillStyle="#7dd3fc",e.textAlign="center",e.textBaseline="middle",e.fillText("+ Draw",l+o/2,c+o/2)),e.restore()}drawObjectShadow(t,i,s){const e=this.ctx,l=t.position.x*s,c=t.position.y*s,o=t.position.z,a=1+o/i.wallHeight*1.5,h=t.colliderRadius*s*a,n=Math.max(.3,.85-o/(i.wallHeight*7)*.25),r=o>=i.wallHeight-.001;if(e.save(),e.beginPath(),t.visualShape==="box"){const g=h*2,y=Math.max(3,4*a);e.roundRect?e.roundRect(l-h,c-h,g,g,y):e.rect(l-h,c-h,g,g)}else e.arc(l,c,h,0,Math.PI*2);r?(e.strokeStyle=`rgba(56, 189, 248, ${n})`,e.lineWidth=2.5):(e.strokeStyle=`rgba(255, 255, 255, ${n})`,e.lineWidth=1.8),o>.01&&e.setLineDash([4,3]),e.stroke(),e.restore()}drawFreebodyObject(t,i,s,e,l=!1,c=1){var f,m;const o=this.ctx,a=t.position.x*e,h=t.position.y*e,r=(t.hasCollider?t.colliderRadius:((f=t.colliderModule)==null?void 0:f.radius)??.32)*e,y=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled&&!t.isHeld&&(((m=s.pickupModule)==null?void 0:m.isObjectInReach(s,t,c))??!1);if(y){if(o.save(),o.beginPath(),t.visualShape==="box"){const b=(r+5)*2;o.roundRect?o.roundRect(a-r-5,h-r-5,b,b,6):o.rect(a-r-5,h-r-5,b,b)}else o.arc(a,h,r+5,0,Math.PI*2);l?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",a,h-r-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}let u=!1;if(t.isAboveGround)for(const b of i){if(b===t)continue;if(Math.hypot(t.position.x-b.position.x,t.position.y-b.position.y)<t.colliderRadius+b.colliderRadius&&(t.position.z>b.position.z||Math.abs(t.position.z-b.position.z)<=.01&&t.verticalVelocity>b.verticalVelocity)){u=!0;break}}if(o.save(),o.globalAlpha=u?.55:1,t.visualShape==="box"){const b=r*2,M=Math.max(3,r*.16),v=a-r,S=h-r;o.beginPath(),o.roundRect?o.roundRect(v,S,b,b,M):o.rect(v,S,b,b),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();const x=Math.max(3,r*.22);o.beginPath(),o.roundRect?o.roundRect(v+x,S+x,b-x*2,b-x*2,M*.7):o.rect(v+x,S+x,b-x*2,b-x*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(v+x,S+x),o.lineTo(v+b-x,S+b-x),o.moveTo(v+b-x,S+x),o.lineTo(v+x,S+b-x),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(a,h,r,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();this.drawRollIndicator(t,a,h,r),o.restore()}drawCharacter(t,i,s){const e=this.ctx,l=t.position.x*s,c=t.position.y*s,o=t.colliderRadius*s;let a=!1;if(t.isAboveGround)for(const M of i){if(M===t)continue;if(Math.hypot(t.position.x-M.position.x,t.position.y-M.position.y)<t.colliderRadius+M.colliderRadius&&(t.position.z>M.position.z||Math.abs(t.position.z-M.position.z)<=.01&&t.verticalVelocity>M.verticalVelocity)){a=!0;break}}e.save(),e.globalAlpha=a?.55:1,e.beginPath(),e.arc(l,c,o,0,Math.PI*2),e.fillStyle=t.color,e.fill(),e.strokeStyle="#ffffff",e.lineWidth=2.5,e.stroke(),this.drawRollIndicator(t,l,c,o);const h=.52,n=o*.72,r=Math.max(3.5,o*.18),g=t.facingAngle-h,y=t.facingAngle+h,u=l+Math.cos(g)*n,f=c+Math.sin(g)*n,m=l+Math.cos(y)*n,b=c+Math.sin(y)*n;e.fillStyle="#000000",e.beginPath(),e.arc(u,f,r,0,Math.PI*2),e.arc(m,b,r,0,Math.PI*2),e.fill(),t.heldObject&&(e.strokeStyle="rgba(255, 255, 255, 0.6)",e.setLineDash([3,3]),e.lineWidth=1.5,e.beginPath(),e.moveTo(l,c),e.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),e.stroke(),e.setLineDash([])),e.restore()}drawRollIndicator(t,i,s,e){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,c=l.angularVelocity.x,o=l.angularVelocity.y,a=l.angularVelocity.z,h=Math.hypot(c,o,a);if(h<.02)return;const n=this.ctx,g=Math.hypot(c,o)<.05*h;if(n.save(),g){const y=e*.45,u=e*.78;n.beginPath(),n.arc(i,s,y,0,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.45)",n.lineWidth=1.5,n.setLineDash([]),n.stroke(),n.beginPath(),n.arc(i,s,u,0,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2,n.setLineDash([4,4]),n.lineDashOffset=-l.visualPhase*u*Math.sign(a||1),n.stroke()}else{const y=Math.atan2(-c,o),u=e*.82,f=Math.abs(a)/h,m=u*Math.pow(f,.85);n.translate(i,s),n.rotate(y);const b=a!==0?Math.sign(a):1;m<.5?(n.beginPath(),n.moveTo(-u,0),n.lineTo(u,0),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2.2,n.setLineDash([4,4]),n.lineDashOffset=-l.visualPhase*u,n.stroke()):(n.beginPath(),n.ellipse(0,0,u,m,0,0,Math.PI),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2.2,n.setLineDash([4,4]),n.lineDashOffset=-l.visualPhase*u*b,n.stroke(),n.beginPath(),n.ellipse(0,0,u,m,0,Math.PI,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.25)",n.lineWidth=1.8,n.setLineDash([4,4]),n.lineDashOffset=-l.visualPhase*u*b,n.stroke())}n.restore()}drawTrajectory(t,i){const s=this.ctx,e=t.points;if(e.length<2)return;s.save();for(let c=0;c<e.length-1;c++){const o=e[c],a=e[c+1];s.beginPath(),s.moveTo(o.x*i,o.y*i),s.lineTo(a.x*i,a.y*i),o.couldClearWall||a.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const l=e[e.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const c=8;s.beginPath(),s.moveTo(l.x*i-c,l.y*i-c),s.lineTo(l.x*i+c,l.y*i+c),s.moveTo(l.x*i+c,l.y*i-c),s.lineTo(l.x*i-c,l.y*i+c),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,i){var a;const s=this.ctx,e=t.position.x*i,l=t.position.y*i,o=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*i;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(e,l,o,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,i,s){var g;const e=this.ctx,l=t.position.x*s,c=t.position.y*s,h=(t.hasCollider?t.colliderRadius:((g=t.colliderModule)==null?void 0:g.radius)??.32)*s+6,n=Math.max(6,h*.4),r=i?"#fbbf24":"#38bdf8";if(e.save(),e.strokeStyle=r,e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.moveTo(l-h,c-h+n),e.lineTo(l-h,c-h),e.lineTo(l-h+n,c-h),e.stroke(),e.beginPath(),e.moveTo(l+h-n,c-h),e.lineTo(l+h,c-h),e.lineTo(l+h,c-h+n),e.stroke(),e.beginPath(),e.moveTo(l+h,c+h-n),e.lineTo(l+h,c+h),e.lineTo(l+h-n,c+h),e.stroke(),e.beginPath(),e.moveTo(l-h+n,c+h),e.lineTo(l-h,c+h),e.lineTo(l-h,c+h-n),e.stroke(),i){const y=`${t.name} (${t.mass.toFixed(1)}kg)`;e.font="bold 10px 'Segoe UI', system-ui, sans-serif";const f=e.measureText(y).width+12,m=16,b=l-f/2,M=c-h-m-4;e.fillStyle="rgba(15, 23, 42, 0.85)",e.strokeStyle=r,e.lineWidth=1,e.beginPath(),e.roundRect(b,M,f,m,4),e.fill(),e.stroke(),e.fillStyle=r,e.textAlign="center",e.textBaseline="middle",e.fillText(y,l,M+m/2)}e.restore()}}class Rt{constructor(t,i){d(this,"canvas");d(this,"arena");d(this,"keysPressed",new Set);d(this,"mousePos",{x:0,y:0});d(this,"isMouseDown",!1);d(this,"isRightMouseDown",!1);d(this,"hoverWallTile",null);d(this,"movementVector",{x:0,y:0});d(this,"justPickedUp",!1);d(this,"isThrowingPress",!1);d(this,"hoverEntity",null);d(this,"selectedCanvasEntity",null);d(this,"draggedEntity",null);d(this,"dragOffset",{x:0,y:0});d(this,"handleClick");d(this,"onMouseDown");d(this,"onRightMouseDown");d(this,"onMouseUp");d(this,"onRightClick");d(this,"onDropAttempt");d(this,"onMouseMove");this.canvas=t,this.arena=i,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){e&&(this.selectedCanvasEntity=e.selectedEntity);const l=(a,h,n=.35)=>{var y;for(let u=s.length-1;u>=0;u--){const f=s[u],m=f.hasCollider?f.colliderRadius:((y=f.colliderModule)==null?void 0:y.radius)??.32;if(Math.hypot(f.position.x-a,f.position.y-h)<=m+n)return f}const r=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-h)<=r+n?t:null},c=(a,h)=>{var r;if(a<0||a>=i.cols||h<0||h>=i.rows)return;if(i.setWallTile(a,h,!0)){const g={id:`wall-${a}-${h}`,x:a*i.tileSize,y:h*i.tileSize,width:i.tileSize,height:i.tileSize,wallHeight:i.wallHeight},y=[t,...s];for(const u of y){const f=u.hasCollider?u.colliderRadius:((r=u.colliderModule)==null?void 0:r.radius)??.32;i.testWallOverlap(u.position.x,u.position.y,f,g)&&u.position.z<i.wallHeight&&(u.hasVerticalPosition||(u.verticalPositionModule?u.verticalPositionModule.enabled=!0:u.verticalPositionModule=new lt({z:i.wallHeight,hasVerticalVelocity:!0})),u.position.z=i.wallHeight,u.supportingSurfaceHeight=i.wallHeight,u.verticalVelocity=0)}i.currentPresetId="custom",e==null||e.updateWallPresetUI()}},o=(a,h)=>{a<0||a>=i.cols||h<0||h>=i.rows||i.tileGrid[h][a]===1&&(i.setWallTile(a,h,!1),i.currentPresetId="custom",e==null||e.updateWallPresetUI())};this.onMouseDown=(a,h)=>{if(e!=null&&e.isEditMode){if(e.editTool==="walls"){const r=Math.floor(a/i.tileSize),g=Math.floor(h/i.tileSize);c(r,g);return}const n=l(a,h,.35);n?(this.selectedCanvasEntity=n,e.setSelectedEntity(n),this.draggedEntity=n,this.dragOffset.x=n.position.x-a,this.dragOffset.y=n.position.y-h,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,h)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"){const n=Math.floor(a/i.tileSize),r=Math.floor(h/i.tileSize);o(n,r)}},this.onMouseMove=(a,h)=>{var g;const n=Math.floor(a/i.tileSize),r=Math.floor(h/i.tileSize);if(n>=0&&n<i.cols&&r>=0&&r<i.rows?this.hoverWallTile={col:n,row:r}:this.hoverWallTile=null,e!=null&&e.isEditMode){if(e.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?c(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&o(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const y=a+this.dragOffset.x,u=h+this.dragOffset.y,f=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((g=this.draggedEntity.colliderModule)==null?void 0:g.radius)??.32;this.draggedEntity.position.x=Math.max(f,Math.min(i.width-f,y)),this.draggedEntity.position.y=Math.max(f,Math.min(i.height-f,u)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const y=l(a,h,.3);this.hoverEntity=y,this.canvas.style.cursor=y?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,h)=>{if(this.draggedEntity&&(this.draggedEntity=null),e!=null&&e.isEditMode)if(e.editTool==="walls")this.canvas.style.cursor="cell";else{const n=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=n,this.canvas.style.cursor=n?"grab":"crosshair"}},this.handleClick=(a,h)=>{if(!(e!=null&&e.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,h,i),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const n=t.pickupModule.findTargetObject(t,a,h,s,i.wallHeight);n&&(t.pickupModule.pickup(t,n),this.justPickedUp=!0)}}},this.onRightClick=(a,h)=>{if(e!=null&&e.isEditMode&&e.editTool==="walls"||!e)return;const n=l(a,h,.4);n&&(this.selectedCanvasEntity=n,e.setSelectedEntity(n))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,i.wallHeight);a&&t.pickupModule.pickup(t,a)}}}}class $t{constructor(t){d(this,"container");d(this,"character");d(this,"arena");d(this,"objects");d(this,"onSpawnObject");d(this,"onDeleteObject");d(this,"onClearObjects");d(this,"selectedEntity");d(this,"isEditMode",!1);d(this,"editTool","entities");d(this,"onSelectionChange");d(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});d(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});d(this,"inspectorEl");d(this,"entitySelectorEl");d(this,"characterSpecificControlsEl");d(this,"objectSpecificControlsEl");d(this,"modePlayBtn");d(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var i;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(i=this.onSelectionChange)==null||i.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const i=this.container.querySelector("#edit-submode-container");i&&(i.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const i=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");i&&s&&(i.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const i=this.container.querySelector("#edit-hint-label");i&&(this.isEditMode?this.editTool==="walls"?i.textContent="Left-drag: Draw | Right-drag: Erase":i.textContent="Click & drag object in arena":i.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const e of this.objects){const l=e.id===t?"selected":"",c=e.visualShape==="box"?"📦":"⚪",o=e.hasMass?`${e.mass.toFixed(1)}kg`:"Massless";i+=`<option value="${e.id}" ${l}>${c} ${e.name} (${o})</option>`}this.entitySelectorEl.innerHTML=i;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,i,s,e,l,c,o,a,h,n,r,g,y,u,f,m,b,M,v,S,x,k,w,V,E,P,$,D,T,F,W,B,q,O,C,z,j,I,X,H,p,L,A,G,rt,dt,Y,K,ht,_,J,ut,Q,tt,yt,et,it,pt,st,Z,gt;this.container.innerHTML=`
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
                ${(c=this.selectedEntity.frictionModule)!=null&&c.enabled?"Attached":"Detached"}
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
                <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${((n=this.selectedEntity.frictionModule)==null?void 0:n.staticFrictionMod)??1}">
              </div>
              <div class="slider-group">
                <div class="slider-label">
                  <span>Dynamic Friction Mod</span>
                  <span id="val-entity-dynamic-fric">${(((r=this.selectedEntity.frictionModule)==null?void 0:r.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((g=this.selectedEntity.frictionModule)==null?void 0:g.dynamicFrictionMod)??1}">
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
              <button id="toggle-mod-bounce" class="btn-toggle ${(u=this.selectedEntity.bounceModule)!=null&&u.enabled?"active":""}">
                ${(f=this.selectedEntity.bounceModule)!=null&&f.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((m=this.selectedEntity.bounceModule)!=null&&m.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(b=this.selectedEntity.bounceModule)!=null&&b.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((M=this.selectedEntity.bounceModule)==null?void 0:M.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((v=this.selectedEntity.bounceModule)==null?void 0:v.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(S=this.selectedEntity.bounceModule)!=null&&S.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(x=this.selectedEntity.bounceModule)!=null&&x.enabled&&((k=this.selectedEntity.bounceModule)!=null&&k.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${(w=this.selectedEntity.bounceModule)!=null&&w.enabled?"none":"block"};">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(V=this.selectedEntity.rollModule)!=null&&V.enabled?"active":""}">
                ${(E=this.selectedEntity.rollModule)!=null&&E.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(P=this.selectedEntity.rollModule)!=null&&P.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${($=this.selectedEntity.rollModule)!=null&&$.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((D=this.selectedEntity.rollModule)==null?void 0:D.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((T=this.selectedEntity.rollModule)==null?void 0:T.rollResistance)??.4}">
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
                <button id="toggle-walk" class="btn-toggle ${(F=this.character.walkingModule)!=null&&F.enabled?"active":""}">
                  ${(W=this.character.walkingModule)!=null&&W.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((B=this.character.walkingModule)!=null&&B.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&((q=this.character.walkingModule)!=null&&q.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(O=this.character.walkingModule)!=null&&O.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((C=this.character.walkingModule)==null?void 0:C.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((z=this.character.walkingModule)==null?void 0:z.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((j=this.character.walkingModule)==null?void 0:j.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((I=this.character.walkingModule)==null?void 0:I.maxWalkSpeed)??5.2}">
                </div>
              </div>
            </div>

            <!-- Strength Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>💪 Strength Ability</label>
                <button id="toggle-strength" class="btn-toggle ${(X=this.character.strengthModule)!=null&&X.enabled?"active":""}">
                  ${(H=this.character.strengthModule)!=null&&H.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-strength" style="display: ${(p=this.character.strengthModule)!=null&&p.enabled?"block":"none"};">
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
                <button id="toggle-pickup" class="btn-toggle ${(L=this.character.pickupModule)!=null&&L.enabled?"active":""}">
                  ${(A=this.character.pickupModule)!=null&&A.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(G=this.character.pickupModule)!=null&&G.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(((rt=this.character.pickupModule)==null?void 0:rt.pickupReach)??1.3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${((dt=this.character.pickupModule)==null?void 0:dt.pickupReach)??1.3}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Cross-Layer Reach Ratio</span>
                    <span id="val-pickup-cross-layer">${(((Y=this.character.pickupModule)==null?void 0:Y.crossLayerReachRatio)??.55).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-pickup-cross-layer" min="0.10" max="1.00" step="0.05" value="${((K=this.character.pickupModule)==null?void 0:K.crossLayerReachRatio)??.55}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(ht=this.character.throwModule)!=null&&ht.enabled?"active":""}">
                  ${(_=this.character.throwModule)!=null&&_.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(J=this.character.throwModule)!=null&&J.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((ut=this.character.throwModule)==null?void 0:ut.baseThrowForce)??7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((Q=this.character.throwModule)==null?void 0:Q.baseThrowForce)??7.6}">
                </div>
              </div>
            </div>

            <!-- Climbing Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🧗 Climbing Ability</label>
                <button id="toggle-climb" class="btn-toggle ${(tt=this.character.climbingModule)!=null&&tt.enabled?"active":""}">
                  ${(yt=this.character.climbingModule)!=null&&yt.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-climb-deps" class="module-dep-warning" style="display: ${(!this.character.hasVerticalPosition||!this.character.hasStrength)&&((et=this.character.climbingModule)!=null&&et.enabled)?"block":"none"};">
                ${this.character.hasVerticalPosition?this.character.hasStrength?"":"⚠️ Requires Strength Ability to climb":"⚠️ Requires Vertical Position (3D Z-axis)"}
              </div>
              <div id="group-mod-climb" style="display: ${(it=this.character.climbingModule)!=null&&it.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Adhesion (N)</span>
                    <span id="val-climb-adhesion">${(((pt=this.character.climbingModule)==null?void 0:pt.maxAdhesion)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-climb-adhesion" min="5.0" max="80.0" step="1.0" value="${((st=this.character.climbingModule)==null?void 0:st.maxAdhesion)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Climb Speed (u/s)</span>
                    <span id="val-climb-speed">${(((Z=this.character.climbingModule)==null?void 0:Z.maxClimbSpeed)??3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${((gt=this.character.climbingModule)==null?void 0:gt.maxClimbSpeed)??3}">
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var z,j,I,X,H,p,L;const t=this.selectedEntity,i=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=i?"none":"flex");const e=this.container.querySelector("#toggle-entity-shape");e&&(t.visualShape==="box"?(e.textContent="Box 📦",e.classList.add("active")):(e.textContent="Circle ⚪",e.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),c=this.container.querySelector("#group-mod-collider"),o=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),c&&(c.style.display=t.hasCollider?"block":"none"),o&&(o.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((z=t.colliderModule)==null?void 0:z.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),h=this.container.querySelector("#group-mod-mass"),n=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),n&&(n.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((j=t.massModule)==null?void 0:j.mass)??1,1);const r=this.container.querySelector("#toggle-mod-friction"),g=this.container.querySelector("#group-mod-friction"),y=this.container.querySelector("#note-mod-friction"),u=this.container.querySelector("#warn-friction-mass"),f=!!(t.frictionModule&&t.frictionModule.enabled);r&&(r.textContent=f?"Attached":"Detached",r.classList.toggle("active",f)),g&&(g.style.display=f?"flex":"none"),y&&(y.style.display=f?"none":"block"),u&&(u.style.display=!t.hasMass&&f?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((I=t.frictionModule)==null?void 0:I.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((X=t.frictionModule)==null?void 0:X.dynamicFrictionMod)??1,2);const m=this.container.querySelector("#toggle-mod-bounce"),b=this.container.querySelector("#group-mod-bounce"),M=this.container.querySelector("#note-mod-bounce"),v=this.container.querySelector("#warn-bounce-mass"),S=!!(t.bounceModule&&t.bounceModule.enabled);m&&(m.textContent=S?"Attached":"Detached",m.classList.toggle("active",S)),b&&(b.style.display=S?"block":"none"),M&&(M.style.display=S?"none":"block"),v&&(v.style.display=!t.hasMass&&S?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((H=t.bounceModule)==null?void 0:H.bounceMod)??.4,2);const x=this.container.querySelector("#check-mod-vert-bounce"),k=this.container.querySelector("#warn-bounce-vert-vel");if(x&&(x.checked=!!((p=t.bounceModule)!=null&&p.verticalBounce)),k){const A=!!(S&&((L=t.bounceModule)!=null&&L.verticalBounce)&&!t.hasVerticalVelocity);k.style.display=A?"block":"none"}const w=this.container.querySelector("#toggle-mod-vert-pos"),V=this.container.querySelector("#group-mod-vert-pos"),E=this.container.querySelector("#note-mod-vert-pos"),P=t.hasVerticalPosition;w&&(w.textContent=P?"Attached":"Detached",w.classList.toggle("active",P)),V&&(V.style.display=P?"block":"none"),E&&(E.style.display=P?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const $=this.container.querySelector("#toggle-mod-vert-vel"),D=this.container.querySelector("#group-mod-vert-vel"),T=t.hasVerticalVelocity;$&&($.textContent=T?"Enabled":"Disabled",$.classList.toggle("active",T)),D&&(D.style.display=T?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const F=this.container.querySelector("#toggle-mod-gravity"),W=this.container.querySelector("#note-mod-gravity");F&&(F.textContent=t.hasGravity?"Attached":"Detached",F.classList.toggle("active",t.hasGravity)),W&&(W.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const B=this.container.querySelector("#toggle-mod-roll"),q=this.container.querySelector("#group-mod-roll"),O=this.container.querySelector("#note-roll-friction"),C=!!(t.rollModule&&t.rollModule.enabled);if(B&&(B.textContent=C?"Attached":"Detached",B.classList.toggle("active",C)),q&&(q.style.display=C?"block":"none"),O&&(O.style.display=C&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),i){const A=this.container.querySelector("#toggle-walk"),G=this.container.querySelector("#group-mod-walking"),rt=this.container.querySelector("#warn-walk-friction"),dt=this.container.querySelector("#warn-walk-strength"),Y=!!(this.character.walkingModule&&this.character.walkingModule.enabled);A&&(A.textContent=Y?"Attached":"Detached",A.classList.toggle("active",Y)),G&&(G.style.display=Y?"flex":"none"),rt&&(rt.style.display=Y&&!this.character.hasFriction?"block":"none"),dt&&(dt.style.display=Y&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const K=this.container.querySelector("#toggle-strength"),ht=this.container.querySelector("#group-mod-strength"),_=!!(this.character.strengthModule&&this.character.strengthModule.enabled);K&&(K.textContent=_?"Attached":"Detached",K.classList.toggle("active",_)),ht&&(ht.style.display=_?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const J=this.container.querySelector("#toggle-pickup"),ut=this.container.querySelector("#group-mod-pickup"),Q=!!(this.character.pickupModule&&this.character.pickupModule.enabled);J&&(J.textContent=Q?"Attached":"Detached",J.classList.toggle("active",Q)),ut&&(ut.style.display=Q?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const tt=this.container.querySelector("#toggle-throw"),yt=this.container.querySelector("#group-mod-throw"),et=!!(this.character.throwModule&&this.character.throwModule.enabled);tt&&(tt.textContent=et?"Attached":"Detached",tt.classList.toggle("active",et)),yt&&(yt.style.display=et?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const it=this.container.querySelector("#toggle-climb"),pt=this.container.querySelector("#group-mod-climb"),st=this.container.querySelector("#warn-climb-deps"),Z=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(it&&(it.textContent=Z?"Attached":"Detached",it.classList.toggle("active",Z)),pt&&(pt.style.display=Z?"block":"none"),st){const gt=!this.character.hasVerticalPosition,xt=!this.character.hasStrength;st.style.display=Z&&(gt||xt)?"block":"none",st.textContent=gt?"⚠️ Requires Vertical Position (3D Z-axis)":xt?"⚠️ Requires Strength Ability to climb":""}this.character.climbingModule&&(this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1))}}setSliderVal(t,i,s,e){const l=this.container.querySelector(`#${t}`),c=this.container.querySelector(`#${i}`);l&&(l.value=s.toString()),c&&(c.textContent=e>0?s.toFixed(e):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,i=this.container.querySelector("#creator-name");i&&(i.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const e=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");e&&(e.value=t.color),l&&(l.textContent=t.color);const c=this.container.querySelector("#creator-toggle-collider"),o=this.container.querySelector("#grp-creator-radius");c&&(c.textContent=t.hasCollider?"Attached":"Detached",c.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),h=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const n=this.container.querySelector("#creator-toggle-friction"),r=this.container.querySelector("#grp-creator-fric");n&&(n.textContent=t.hasFriction?"Attached":"Detached",n.classList.toggle("active",t.hasFriction)),r&&(r.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const g=this.container.querySelector("#creator-toggle-bounce"),y=this.container.querySelector("#grp-creator-bounce"),u=this.container.querySelector("#creator-check-vert-bounce"),f=this.container.querySelector("#creator-warn-bounce-vert");g&&(g.textContent=t.hasBounce?"Attached":"Detached",g.classList.toggle("active",t.hasBounce)),y&&(y.style.display=t.hasBounce?"block":"none"),u&&(u.checked=t.verticalBounce),f&&(f.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const m=this.container.querySelector("#creator-toggle-vert-pos"),b=this.container.querySelector("#grp-creator-vert-pos");m&&(m.textContent=t.hasVerticalPosition?"Attached":"Detached",m.classList.toggle("active",t.hasVerticalPosition)),b&&(b.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const M=this.container.querySelector("#creator-toggle-vert-vel");M&&(M.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",M.classList.toggle("active",t.hasVerticalVelocity));const v=this.container.querySelector("#creator-toggle-gravity");v&&(v.textContent=t.hasGravity?"Attached":"Detached",v.classList.toggle("active",t.hasGravity));const S=this.container.querySelector("#creator-toggle-roll"),x=this.container.querySelector("#group-creator-roll-resist");S&&(S.textContent=t.hasRollModule?"Enabled":"Disabled",S.classList.toggle("active",t.hasRollModule)),x&&(x.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var W,B,q,O,C,z,j,I,X,H;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(W=this.container.querySelector("#submode-entities"))==null||W.addEventListener("click",()=>{this.setEditTool("entities")}),(B=this.container.querySelector("#submode-walls"))==null||B.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var L;const p=this.entitySelectorEl.value;if(p===this.character.id)this.selectedEntity=this.character;else{const A=this.objects.find(G=>G.id===p);A&&(this.selectedEntity=A)}this.updateSelectorOptions(),this.syncEntitySliders(),(L=this.onSelectionChange)==null||L.call(this,this.selectedEntity)}),(q=this.container.querySelector("#btn-duplicate-entity"))==null||q.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(O=this.container.querySelector("#btn-delete-entity"))==null||O.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const i=this.container.querySelector("#toggle-mod-collider");i==null||i.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new ot({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",p=>{this.selectedEntity.colliderRadius=p},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new at({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",p=>{this.selectedEntity.mass=p,this.updateSelectorOptions()},1);const e=this.container.querySelector("#toggle-mod-friction");e==null||e.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new nt,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",p=>{this.selectedEntity.staticGroundFrictionMod=p},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",p=>{this.selectedEntity.dynamicGroundFrictionMod=p},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new ct({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",p=>{this.selectedEntity.bounceMod=p},2);const c=this.container.querySelector("#check-mod-vert-bounce");c==null||c.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=c.checked),this.syncEntitySliders(),this.updateInspector()});const o=this.container.querySelector("#toggle-mod-vert-pos");o==null||o.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new lt({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",p=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=p),this.selectedEntity.position.z=p,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",p=>{this.selectedEntity.verticalVelocity=p},2);const h=this.container.querySelector("#toggle-mod-gravity");h==null||h.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new vt,this.syncEntitySliders()});const n=this.container.querySelector("#toggle-mod-roll");n==null||n.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new bt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",p=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=p)},2);const r=this.container.querySelector("#toggle-walk");r==null||r.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new St,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",p=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=p)},0),this.setupSlider("slide-walk-speed","val-walk-speed",p=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=p)},1);const g=this.container.querySelector("#toggle-strength");g==null||g.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new mt({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",p=>{this.character.strength=p},1);const y=this.container.querySelector("#toggle-pickup");y==null||y.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new wt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",p=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=p)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",p=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=p)},2);const u=this.container.querySelector("#toggle-throw");u==null||u.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new kt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",p=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=p)},1);const f=this.container.querySelector("#toggle-climb");f==null||f.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new Vt,this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",p=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=p)},0),this.setupSlider("slide-climb-speed","val-climb-speed",p=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=p)},1),this.setupSlider("slide-gravity","val-gravity",p=>{this.arena.gravity=p},1),this.setupSlider("slide-wall-height","val-wall-height",p=>{this.arena.setStandardWallHeight(p),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",p,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",p=>{this.arena.setStandardWallHeight(p),this.setSliderVal("slide-wall-height","val-wall-height",p,1)},1);const m=this.container.querySelector("#select-wall-preset");m==null||m.addEventListener("change",()=>{this.arena.loadWallPreset(m.value,[this.character,...this.objects]),this.updateWallPresetUI()}),(C=this.container.querySelector("#btn-prev-wall-map"))==null||C.addEventListener("click",()=>{const p=U.WALL_PRESETS,A=(p.findIndex(G=>G.id===this.arena.currentPresetId)-1+p.length)%p.length;this.arena.loadWallPreset(p[A].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(z=this.container.querySelector("#btn-next-wall-map"))==null||z.addEventListener("click",()=>{const p=U.WALL_PRESETS,A=(p.findIndex(G=>G.id===this.arena.currentPresetId)+1)%p.length;this.arena.loadWallPreset(p[A].id,[this.character,...this.objects]),this.updateWallPresetUI()}),(j=this.container.querySelector("#btn-reset-walls"))==null||j.addEventListener("click",()=>{this.arena.resetDefaultWalls([this.character,...this.objects]),this.updateWallPresetUI()}),(I=this.container.querySelector("#btn-clear-walls"))==null||I.addEventListener("click",()=>{this.arena.clearAllWalls([this.character,...this.objects]),this.updateWallPresetUI()}),this.setupSlider("slide-friction","val-friction",p=>{this.arena.frictionCoeff=p},1),this.setupSlider("slide-static-thresh","val-static-thresh",p=>{this.arena.staticFrictionThreshold=p},2),this.container.querySelectorAll(".preset-chip").forEach(p=>{p.addEventListener("click",()=>{const L=p.getAttribute("data-preset");L&&this.presets[L]&&(this.creatorState={...this.presets[L]},this.syncCreatorInputs())})});const M=this.container.querySelector("#creator-name");M==null||M.addEventListener("input",()=>{this.creatorState.name=M.value});const v=this.container.querySelector("#creator-toggle-shape");v==null||v.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",v.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",v.classList.toggle("active",this.creatorState.visualShape==="box")});const S=this.container.querySelector("#creator-color"),x=this.container.querySelector("#val-creator-color");S==null||S.addEventListener("input",()=>{this.creatorState.color=S.value,x&&(x.textContent=S.value)});const k=this.container.querySelector("#creator-toggle-collider");k==null||k.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,k.textContent=this.creatorState.hasCollider?"Attached":"Detached",k.classList.toggle("active",this.creatorState.hasCollider);const p=this.container.querySelector("#grp-creator-radius");p&&(p.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",p=>{this.creatorState.colliderRadius=p},2);const w=this.container.querySelector("#creator-toggle-mass");w==null||w.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,w.textContent=this.creatorState.hasMass?"Attached":"Detached",w.classList.toggle("active",this.creatorState.hasMass);const p=this.container.querySelector("#grp-creator-mass");p&&(p.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",p=>{this.creatorState.mass=p},1);const V=this.container.querySelector("#creator-toggle-friction");V==null||V.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,V.textContent=this.creatorState.hasFriction?"Attached":"Detached",V.classList.toggle("active",this.creatorState.hasFriction);const p=this.container.querySelector("#grp-creator-fric");p&&(p.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",p=>{this.creatorState.dynamicFrictionMod=p},2);const E=this.container.querySelector("#creator-toggle-bounce");E==null||E.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,E.textContent=this.creatorState.hasBounce?"Attached":"Detached",E.classList.toggle("active",this.creatorState.hasBounce);const p=this.container.querySelector("#grp-creator-bounce");p&&(p.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",p=>{this.creatorState.bounceMod=p},2);const P=this.container.querySelector("#creator-check-vert-bounce");P==null||P.addEventListener("change",()=>{this.creatorState.verticalBounce=P.checked,this.syncCreatorInputs()});const $=this.container.querySelector("#creator-toggle-vert-pos");$==null||$.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",p=>{this.creatorState.elevation=p},2);const D=this.container.querySelector("#creator-toggle-vert-vel");D==null||D.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const T=this.container.querySelector("#creator-toggle-gravity");T==null||T.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,T.textContent=this.creatorState.hasGravity?"Attached":"Detached",T.classList.toggle("active",this.creatorState.hasGravity)});const F=this.container.querySelector("#creator-toggle-roll");F==null||F.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,F.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",F.classList.toggle("active",this.creatorState.hasRollModule);const p=this.container.querySelector("#group-creator-roll-resist");p&&(p.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",p=>{this.creatorState.rollResistance=p},2),(X=this.container.querySelector("#btn-spawn-configured"))==null||X.addEventListener("click",()=>{this.spawnFromCreator()}),(H=this.container.querySelector("#btn-clear-entities"))==null||H.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,i=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),e=new N({name:t.name||"Custom Object",position:{x:i,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new ot({radius:t.colliderRadius}):null,massModule:t.hasMass?new at({mass:t.mass}):null,frictionModule:t.hasFriction?new nt({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new ct({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new lt({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new vt:null,rollModule:t.hasRollModule?new bt({rollResistance:t.rollResistance}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,i=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),e=new N({name:`${t.name} (Copy)`,position:{x:i,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new ot({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new at({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new nt({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new ct({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new lt({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new vt({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new bt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,i,s,e=0){const l=this.container.querySelector(`#${t}`),c=this.container.querySelector(`#${i}`);!l||!c||l.addEventListener("input",()=>{const o=parseFloat(l.value);c.textContent=e>0?o.toFixed(e):Math.round(o).toString(),s(o)})}updateInspector(){const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}renderWallPresetOptions(){return U.WALL_PRESETS.map(t=>`<option value="${t.id}" ${this.arena.currentPresetId===t.id?"selected":""}>${t.name}</option>`).join("")}getCurrentWallPresetBadge(){const t=U.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.badge:"Custom"}getCurrentWallPresetDesc(){const t=U.WALL_PRESETS.find(i=>i.id===this.arena.currentPresetId);return t?t.description:"Custom wall layout painted in the arena."}updateWallPresetUI(){const t=this.container.querySelector("#select-wall-preset");t&&(t.value=this.arena.currentPresetId);const i=this.container.querySelector("#label-wall-map-badge");i&&(i.textContent=this.getCurrentWallPresetBadge());const s=this.container.querySelector("#desc-wall-map");s&&(s.textContent=this.getCurrentWallPresetDesc())}}class Ft{constructor(t){d(this,"arena");d(this,"character");d(this,"objects");d(this,"renderer");d(this,"inputManager");d(this,"devPanel");d(this,"isRunning",!1);d(this,"lastTime",0);d(this,"accumulator",0);d(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const e=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,e,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const i=this.inputManager;i.draggedEntity!==this.character?this.character.updateCharacter(t,i.movementVector,i.isMouseDown&&!this.devPanel.isEditMode,i.mousePos,this.arena,i.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const e of this.objects)i.draggedEntity!==e&&e.updatePosition(t,this.arena);const s=i.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const e=this.character.pickupModule.findTargetObject(this.character,i.mousePos.x,i.mousePos.y,this.objects,this.arena.wallHeight);e&&(this.character.pickupModule.pickup(this.character,e),i.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],i=this.inputManager,s=3;for(let e=0;e<s;e++)for(let l=0;l<t.length;l++)for(let c=l+1;c<t.length;c++){const o=t[l],a=t[c];if(o.isHeld||a.isHeld||o===i.draggedEntity||a===i.draggedEntity||!o.hasCollider||!a.hasCollider)continue;const h=this.arena.wallHeight-.15,n=o.position.z>=h||o.supportingSurfaceHeight>=h,r=a.position.z>=h||a.supportingSurfaceHeight>=h;if(n!==r)continue;const g=a.position.x-o.position.x,y=a.position.y-o.position.y,u=g*g+y*y,f=o.colliderRadius+a.colliderRadius;if(u<f*f&&u>1e-6){const m=Math.sqrt(u),b=f-m,M=g/m,v=y/m,S=a.velocity.x-o.velocity.x,x=a.velocity.y-o.velocity.y,k=S*M+x*v,w=!o.hasMass,V=!a.hasMass;if(w&&V){if(o.position.x-=M*b*.5,o.position.y-=v*b*.5,a.position.x+=M*b*.5,a.position.y+=v*b*.5,k<0){const F=-k*.5;o.velocity.x-=F*M,o.velocity.y-=F*v,a.velocity.x+=F*M,a.velocity.y+=F*v}continue}if(!w&&V){this.isEntityPinnedAgainstWall(a,M,v)?(o.position.x-=M*b,o.position.y-=v*b,o.velocity.x=0,o.velocity.y=0):(a.position.x+=M*b,a.position.y+=v*b,k<0&&(a.velocity.x+=(o.velocity.x-a.velocity.x)*Math.abs(M),a.velocity.y+=(o.velocity.y-a.velocity.y)*Math.abs(v)));continue}if(w&&!V){this.isEntityPinnedAgainstWall(o,-M,-v)?(a.position.x+=M*b,a.position.y+=v*b,a.velocity.x=0,a.velocity.y=0):(o.position.x-=M*b,o.position.y-=v*b,k<0&&(o.velocity.x+=(a.velocity.x-o.velocity.x)*Math.abs(M),o.velocity.y+=(a.velocity.y-o.velocity.y)*Math.abs(v)));continue}const E=1/o.mass,P=1/a.mass,$=E+P;if($<=1e-4)continue;const D=E/$,T=P/$;if(o.position.x-=M*b*D,o.position.y-=v*b*D,a.position.x+=M*b*T,a.position.y+=v*b*T,k<0){const F=o instanceof ft&&o.isActivelyWalking||a instanceof ft&&a.isActivelyWalking,W=o.hasBounce&&a.hasBounce,B=o.isCharacter||!o.hasBounce?0:o.bounceMod??0,q=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,C=-(1+(F||!W?0:Math.max(0,Math.min(.98,Math.max(B,q)))))*k/$;o.velocity.x-=C*E*M,o.velocity.y-=C*E*v,a.velocity.x+=C*P*M,a.velocity.y+=C*P*v;const z=-v,j=M,I=S*z+x*j;if(Math.abs(I)>.001){const X=.35*Math.sqrt(o.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),H=.4,p=Math.abs(I)/($*(1+1/H)),L=X*Math.abs(C),A=Math.min(p,L)*Math.sign(I);if(o.velocity.x+=A*E*z,o.velocity.y+=A*E*j,a.velocity.x-=A*P*z,a.velocity.y-=A*P*j,o.rollModule&&o.rollModule.enabled){const G=A/(H*o.mass*o.colliderRadius);o.rollModule.angularVelocity.z+=G,o.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,o.rollModule.angularVelocity.z)),o.isRestingOnSurface&&(o.rollModule.angularVelocity.y=o.velocity.x/o.colliderRadius,o.rollModule.angularVelocity.x=-o.velocity.y/o.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const G=A/(H*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=G,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,i,s){const e=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(i>.3&&t.position.x>=this.arena.width-e-l||i<-.3&&t.position.x<=e+l||s>.3&&t.position.y>=this.arena.height-e-l||s<-.3&&t.position.y<=e+l)return!0;for(const c of this.arena.walls)if(t.position.z<c.wallHeight-.05){const o=t.position.x+i*l,a=t.position.y+s*l,h=Math.max(c.x,Math.min(o,c.x+c.width)),n=Math.max(c.y,Math.min(a,c.y+c.height)),r=o-h,g=a-n;if(r*r+g*g<e*e)return!0}return!1}}function Wt(){const R=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!R||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=R.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new U(20,14,1);R.width=1e3,R.height=700;const e=new ft({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new N({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new N({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new N({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new N({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new bt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})],c=new Ct(i),o=new $t({container:t,character:e,arena:s,objects:l,onSpawnObject:n=>{l.push(n),o.updateSelectorOptions()},onDeleteObject:n=>{const r=l.indexOf(n);r!==-1&&l.splice(r,1),o.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),l.length=0,o.updateSelectorOptions()}}),a=new Rt(R,s);a.handleInteractions(e,s,l,o),o.onSelectionChange=n=>{a.selectedCanvasEntity=n},new Ft({arena:s,character:e,objects:l,renderer:c,inputManager:a,devPanel:o}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",Wt);

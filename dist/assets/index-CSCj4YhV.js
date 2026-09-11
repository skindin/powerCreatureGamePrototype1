var kt=Object.defineProperty;var Vt=(V,t,e)=>t in V?kt(V,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):V[t]=e;var d=(V,t,e)=>Vt(V,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const l of i)if(l.type==="childList")for(const o of l.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function e(i){const l={};return i.integrity&&(l.integrity=i.integrity),i.referrerPolicy&&(l.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?l.credentials="include":i.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(i){if(i.ep)return;i.ep=!0;const l=e(i);fetch(i.href,l)}})();class Et{constructor(t=20,e=14,s=1){d(this,"width");d(this,"height");d(this,"tileSize");d(this,"cols");d(this,"rows");d(this,"wallHeight");d(this,"gravity");d(this,"frictionCoeff");d(this,"staticFrictionThreshold");d(this,"tileGrid");d(this,"walls",[]);this.width=t,this.height=e,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(e/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.setupDefaultTileMap(),this.rebuildWalls()}setupDefaultTileMap(){for(let e=1;e<=4;e++)this.tileGrid[e][10]=1;for(let e=8;e<=12;e++)this.tileGrid[e][10]=1;this.tileGrid[4][4]=1,this.tileGrid[5][4]=1,this.tileGrid[4][5]=1,this.tileGrid[5][5]=1,this.tileGrid[7][15]=1,this.tileGrid[8][15]=1,this.tileGrid[7][16]=1,this.tileGrid[8][16]=1}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]===1&&this.walls.push({id:`wall-${e}-${t}`,x:e*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,e,s){if(t<0||t>=this.cols||e<0||e>=this.rows)return!1;const i=s?1:0;return this.tileGrid[e][t]===i?!1:(this.tileGrid[e][t]=i,this.rebuildWalls(),!0)}hasWall(t,e){return t<0||t>=this.cols||e<0||e>=this.rows?!1:this.tileGrid[e][t]===1}clearAllWalls(){for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]=0;this.rebuildWalls()}resetDefaultWalls(){for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]=0;this.setupDefaultTileMap(),this.rebuildWalls()}getWallAt(t,e){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&e>=s.y&&e<=s.y+s.height)return s;return null}testWallOverlap(t,e,s,i){const l=Math.max(i.x,Math.min(t,i.x+i.width)),o=Math.max(i.y,Math.min(e,i.y+i.height)),c=t-l,n=e-o;return c*c+n*n<s*s}getSupportingWall(t,e,s=0){if(s<=0)return this.getWallAt(t,e);for(const i of this.walls)if(this.testWallOverlap(t,e,s,i))return i;return null}getSupportingSurfaceHeight(t,e,s=0){const i=this.getSupportingWall(t,e,s);return i?i.wallHeight:0}}class st{constructor(t={}){d(this,"radius");d(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class ot{constructor(t={}){d(this,"mass");d(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class lt{constructor(t={}){d(this,"staticFrictionMod");d(this,"dynamicFrictionMod");d(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class at{constructor(t={}){d(this,"bounceMod");d(this,"verticalBounce");d(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class gt{constructor(t={}){d(this,"enabled");this.enabled=t.enabled??!0}}class pt{constructor(t={}){d(this,"z");d(this,"hasVerticalVelocity");d(this,"verticalVelocity");d(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}class U{constructor(t={}){d(this,"id");d(this,"name");d(this,"position");d(this,"velocity");d(this,"color");d(this,"isHeld");d(this,"heldBy");d(this,"lastThrower",null);d(this,"isCharacter",!1);d(this,"isClimbing",!1);d(this,"visualShape","circle");d(this,"colliderModule",null);d(this,"massModule",null);d(this,"frictionModule",null);d(this,"bounceModule",null);d(this,"verticalPositionModule",null);d(this,"gravityModule",null);d(this,"rollModule",null);d(this,"supportingSurfaceHeight",0);var e,s,i,l,o;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((e=t.position)==null?void 0:e.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((i=t.position)==null?void 0:i.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((o=t.velocity)==null?void 0:o.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new st({radius:t.colliderRadius}):new st({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new ot({mass:t.mass}):new ot({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new lt({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new at({bounceMod:t.bounceMod}):new at({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new pt({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new gt,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new st({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new ot({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new lt({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new lt({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new at({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.95||this.supportingSurfaceHeight>=.95)}updatePosition(t,e){var n,h;if(this.isHeld)return;if(this.lastThrower){const a=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,r=(((n=this.lastThrower.pickupModule)==null?void 0:n.pickupReach)??1.3)+this.colliderRadius+a;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>r||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0,i=null;if(this.hasCollider&&this.hasVerticalPosition){if(this.position.z>=e.wallHeight-.15||this.supportingSurfaceHeight>.01&&this.position.z>=e.wallHeight-.35)if(i=e.getWallAt(this.position.x,this.position.y),!i&&this.isCharacter){const r=e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius);if(r){const g=Math.max(r.x,Math.min(this.position.x,r.x+r.width)),y=Math.max(r.y,Math.min(this.position.y,r.y+r.height)),u=g-this.position.x,M=y-this.position.y;this.velocity.x*u+this.velocity.y*M>.01&&(i=r)}}else!i&&!this.isCharacter&&(i=e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius*.5));s=i?i.wallHeight:0}if(this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=e.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,!this.isCharacter&&this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const a=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const r=this.rollModule,g=this.colliderRadius>0?this.colliderRadius:.3,y=.4,u=this.bounceMod,M=(1+u)*this.mass*a,m=e.frictionCoeff*this.dynamicGroundFrictionMod*.05,p=this.velocity.x-r.angularVelocity.y*g,f=this.velocity.y+r.angularVelocity.x*g,b=Math.hypot(p,f);if(b>.001&&m>0){const x=m*M,k=b*this.mass/(1+1/y),w=Math.min(k,x),P=p/b*w,R=f/b*w;this.velocity.x-=P/this.mass,this.velocity.y-=R/this.mass,r.angularVelocity.y+=P/(y*this.mass*g),r.angularVelocity.x-=R/(y*this.mass*g)}const S=Math.max(.65,1-(1-u)*.35);r.angularVelocity.x*=S,r.angularVelocity.y*=S,r.angularVelocity.z*=S}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((h=this.walkingModule)==null?void 0:h.enabled)))if(this.rollModule&&this.rollModule.enabled){const r=this.rollModule,g=this.colliderRadius>0?this.colliderRadius:.3,y=e.frictionCoeff*this.dynamicGroundFrictionMod,u=.4,M=this.velocity.x-r.angularVelocity.y*g,m=this.velocity.y+r.angularVelocity.x*g,p=Math.hypot(M,m);if(y>0&&p>.001){const b=y*(1+1/u)*t;if(p<=b){const S=this.velocity.x+u*r.angularVelocity.y*g,x=this.velocity.y-u*r.angularVelocity.x*g,k=S/(1+u),w=x/(1+u);this.velocity.x=k,this.velocity.y=w,r.angularVelocity.y=k/g,r.angularVelocity.x=-w/g}else{const S=M/p*y*t,x=m/p*y*t;this.velocity.x-=S,this.velocity.y-=x,r.angularVelocity.y+=S/(u*g),r.angularVelocity.x-=x/(u*g)}}const f=Math.hypot(this.velocity.x,this.velocity.y);if(f>0){if(r.rollResistance>0){const b=r.rollResistance*t,S=Math.max(0,f-b);if(S<.005)this.velocity.x=0,this.velocity.y=0,r.angularVelocity.x=0,r.angularVelocity.y=0;else{const x=S/f;this.velocity.x*=x,this.velocity.y*=x,r.angularVelocity.x*=x,r.angularVelocity.y*=x}}}else{const b=Math.hypot(r.angularVelocity.x,r.angularVelocity.y);if(b>0&&y>0){const S=y/(u*g)*t,x=Math.max(0,b-S),k=b>0?x/b:0;r.angularVelocity.x*=k,r.angularVelocity.y*=k}}if(Math.abs(r.angularVelocity.z)>.001&&r.rollResistance>0){const b=r.rollResistance/(u*g)*t,S=Math.sign(r.angularVelocity.z),x=Math.abs(r.angularVelocity.z);r.angularVelocity.z=x<=b?0:S*(x-b)}r.updateVisualPhase(t)}else{const r=Math.hypot(this.velocity.x,this.velocity.y);if(r>0){const g=e.staticFrictionThreshold*this.staticGroundFrictionMod;if(r<g)this.velocity.x=0,this.velocity.y=0;else{const y=e.frictionCoeff*this.dynamicGroundFrictionMod*t,M=Math.max(0,r-y)/r;this.velocity.x*=M,this.velocity.y*=M}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);if(this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t,this.hasCollider){const a=this.colliderRadius,r=a,g=e.width-a,y=a,u=e.height-a,M=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;if(this.position.x<r?(this.position.x=r,this.resolveWallImpact(1,0,M)):this.position.x>g&&(this.position.x=g,this.resolveWallImpact(-1,0,M)),this.position.y<y?(this.position.y=y,this.resolveWallImpact(0,1,M)):this.position.y>u&&(this.position.y=u,this.resolveWallImpact(0,-1,M)),!i)for(const m of e.walls)this.position.z<m.wallHeight-.05&&this.resolveWallCollision(m)}const o=16,c=Math.hypot(this.velocity.x,this.velocity.y);if(c>o){const a=o/c;this.velocity.x*=a,this.velocity.y*=a}if(this.rollModule&&this.rollModule.enabled){const r=this.rollModule.angularSpeed;if(r>35){const g=35/r;this.rollModule.angularVelocity.x*=g,this.rollModule.angularVelocity.y*=g,this.rollModule.angularVelocity.z*=g}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}resolveWallImpact(t,e,s){this.lastThrower=null;const i=this.velocity.x*t+this.velocity.y*e;if(i>=0)return;const l=i;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*e):(this.velocity.x-=l*t,this.velocity.y-=l*e),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const o=this.rollModule,c=this.colliderRadius>0?this.colliderRadius:.3,n=.4,h=.35,a=-e,r=t,g=this.velocity.x*a+this.velocity.y*r,y=-(1+s)*this.mass*l,u=g-o.angularVelocity.z*c,M=Math.abs(u)*this.mass/(1+1/n),m=h*y,p=Math.min(M,m),f=-Math.sign(u)*p,b=g,S=b+f/this.mass,x=Math.abs(S)<=Math.abs(b)+.01?S-b:-b*.1;this.velocity.x+=x*a,this.velocity.y+=x*r;const w=-(x*this.mass)/(n*this.mass*c);o.angularVelocity.z+=w,o.angularVelocity.z=Math.max(-30,Math.min(30,o.angularVelocity.z)),o.angularVelocity.y=this.velocity.x/c,o.angularVelocity.x=-this.velocity.y/c}}resolveWallCollision(t){if(!this.hasCollider)return;const e=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),i=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,o=this.position.y-i,c=l*l+o*o;if(c<e*e){this.lastThrower=null;const n=Math.sqrt(c);let h=0,a=0,r=0;if(n===0){const y=Math.abs(this.position.x-t.x),u=Math.abs(t.x+t.width-this.position.x),M=Math.abs(this.position.y-t.y),m=Math.abs(t.y+t.height-this.position.y),p=Math.min(y,u,M,m);p===y?(h=-1,r=y+e):p===u?(h=1,r=u+e):p===M?(a=-1,r=M+e):(a=1,r=m+e)}else r=e-n,h=l/n,a=o/n;this.position.x+=h*r,this.position.y+=a*r;const g=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(h,a,g)}}}class mt{constructor(){d(this,"id","walking");d(this,"name","Walking Module");d(this,"enabled",!0);d(this,"maxWalkForce",35);d(this,"maxWalkSpeed",5.2);d(this,"dragDamping",8.01)}update(t,e,s,i){var P;if(!this.enabled||!t.isRestingOnSurface){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((P=t.frictionModule)!=null&&P.enabled)||!t.hasMass||!t.hasStrength||t.strength<=0){t.isActivelyWalking=!1;return}const l=Math.hypot(e.x,e.y),o=l>.05;if(t.isActivelyWalking=o,t.mass<=.01)return;const n=t.dynamicGroundFrictionMod;if(n<=.001)return;const h=i.frictionCoeff/10,a=n*h,g=t.carriedMass/(Math.max(.1,t.strength)*8),y=this.maxWalkSpeed/(1+g);let u=0,M=0;if(o){const R=e.x/l,C=e.y/l;u=R*y,M=C*y}const m=u-t.velocity.x,p=M-t.velocity.y,f=Math.hypot(m,p);if(f<.001){t.velocity.x=u,t.velocity.y=M;return}const b=Math.hypot(t.velocity.x,t.velocity.y),S=Math.max(.02,i.staticFrictionThreshold*t.staticGroundFrictionMod),x=t.hasMass?Math.max(.2,t.baseMass):1,w=this.maxWalkForce*t.strength/x*a*s;if(f<=w||!o&&b<S)t.velocity.x=u,t.velocity.y=M;else{const R=w/f;t.velocity.x+=m*R,t.velocity.y+=p*R}}}class xt{constructor(){d(this,"id","pickup");d(this,"name","Pickup Ability");d(this,"enabled",!0);d(this,"pickupReach",1.3);d(this,"crossLayerReachRatio",.55)}findTargetObject(t,e,s,i,l=1){var h;if(!this.enabled)return null;let o=null,c=1/0;const n=t.position.z>=l-.05?1:0;for(const a of i){if(a===t||a.isHeld||a.isCharacter||a.lastThrower===t)continue;const r=a.position.z>=l-.05?1:0,y=n!==r?this.pickupReach*this.crossLayerReachRatio:this.pickupReach,u=a.hasCollider?a.colliderRadius:((h=a.colliderModule)==null?void 0:h.radius)??.32;if(Math.hypot(a.position.x-t.position.x,a.position.y-t.position.y)>y+u)continue;const m=Math.hypot(a.position.x-e,a.position.y-s);m<c&&(c=m,o=a)}return o}pickup(t,e){if(!this.enabled||t.heldObject)return!1;const s=e.velocity.x,i=e.velocity.y,l=e.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=i*l,t.isAboveGround&&Math.abs(e.verticalVelocity)>.1&&(t.verticalVelocity+=e.verticalVelocity*l),t.heldObject=e,e.isHeld=!0,e.heldBy=t,e.velocity.x=0,e.velocity.y=0,e.verticalVelocity=0,e.position.z=e.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const e=t.heldObject;return t.heldObject=null,e.isHeld=!1,e.heldBy=null,e.velocity.x=t.velocity.x*.4,e.velocity.y=t.velocity.y*.4,e.verticalVelocity=0,e}}class St{constructor(){d(this,"id","throw");d(this,"name","Throw Ability");d(this,"enabled",!0);d(this,"baseThrowForce",7.6);d(this,"maxThrowAimDistance",13)}testWallIntersection(t,e,s,i){const l=Math.max(i.x,Math.min(t,i.x+i.width)),o=Math.max(i.y,Math.min(e,i.y+i.height)),c=t-l,n=e-o;return c*c+n*n<s*s}computeLaunchVelocity(t,e,s,i,l,o,c,n=!0,h=!0,a=.35){const r=i-t,g=l-e,y=Math.hypot(r,g);if(y<.1)return null;const u=Math.min(y,this.maxThrowAimDistance),M=r/y,m=g/y,p=t+M*u,f=e+m*u;if(!n||!h){const $=Math.max(3,c),B=Math.max(.14,u/$),L=M*$,O=m*$;return{vx:L,vy:O,vz:0,totalTime:B,finalTargetX:p,finalTargetY:f,targetSurfaceHeight:s}}const b=o.getSupportingSurfaceHeight(p,f),S=b-s,x=Math.max(3,c);let w=Math.max(.14,u/x);S>0&&(w=Math.max(w,Math.sqrt(2*S/o.gravity)));const P=40,R=a>0?a:.35,C=.25;for(let $=1;$<P;$++){const B=$/P,L=t+(p-t)*B,O=e+(f-e)*B;for(const E of o.walls)if(this.testWallIntersection(L,O,R,E)){if(b>0&&p>=E.x&&p<=E.x+E.width&&f>=E.y&&f<=E.y+E.height&&B>.65)continue;const q=(1-B)*s+B*b,A=E.wallHeight+C-q;if(A>0){const j=o.gravity*B*(1-B);if(j>.001){const H=2*A/j;if(H>0){const I=Math.sqrt(H);I>w&&(w=I)}}}}}if(w<=.05)return null;const F=(S+.5*o.gravity*w*w)/w,D=u/w,z=M*D,T=m*D;return{vx:z,vy:T,vz:F,totalTime:w,finalTargetX:p,finalTargetY:f,targetSurfaceHeight:b}}calculateTrajectory(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,c=l.position.y,n=l.position.z,h=this.baseThrowForce*t.strength,a=l.hasGravity&&l.hasVerticalVelocity,r=this.computeLaunchVelocity(o,c,n,e,s,i,h,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!r)return null;const{vx:g,vy:y,vz:u,totalTime:M,finalTargetX:m,finalTargetY:p,targetSurfaceHeight:f}=r,b=90,S=M/b,x=[];let k=!1,w=f>0,P;for(let C=0;C<=b;C++){const F=C*S,D=C===b?m:o+g*F,z=C===b?p:c+y*F,T=a?n+u*F-.5*i.gravity*F*F:n,$=a?C===b?f:Math.max(f,T):n,B=a?u-i.gravity*F:0,L=$>i.wallHeight;let O=!1,E=!1;for(const W of i.walls)if(this.testWallIntersection(D,z,l.colliderRadius,W)&&(O=!0,$<=W.wallHeight+.001)){if(x.length>0&&x[x.length-1].z>=W.wallHeight-.05&&B<=0){if(f>0&&(C>=b-2||Math.hypot(D-m,z-p)<.2)){w=!0;break}else if(f===0){w=!0,E=!0,k=!0,P=W.id;break}}else if($<W.wallHeight-.05){E=!0,k=!0,P=W.id;break}}if(x.push({x:D,y:z,z:$,t:F,couldClearWall:L,isOverWall:O,collidesWall:E}),E)break}const R=x[x.length-1];return{points:x,landPoint:{x:k?R.x:m,y:k?R.y:p},isBlockedByWall:k,isLandingOnWallTop:k?w:f>0,blockedAtWallId:P}}throwHeldObject(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,c=l.position.y,n=l.position.z,h=this.baseThrowForce*t.strength,a=this.computeLaunchVelocity(o,c,n,e,s,i,h,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!a)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=a.vx,l.velocity.y=a.vy,l.verticalVelocity=a.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const m=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=a.vx/m,l.rollModule.angularVelocity.x=-a.vy/m}const r=l.hasMass?l.mass:0,g=t.hasMass?Math.max(.2,t.baseMass):0,y=r>0&&g>0?r/g:0;t.heldObject=null;const u=a.vx-t.velocity.x,M=a.vy-t.velocity.y;if(t.velocity.x-=u*y,t.velocity.y-=M*y,t.isAboveGround&&l.hasVerticalVelocity){const m=a.vz-t.verticalVelocity;t.verticalVelocity-=m*y}return l}}class wt{constructor(){d(this,"id","climbing");d(this,"name","Climbing Module");d(this,"enabled",!0);d(this,"maxAdhesion",35);d(this,"maxClimbSpeed",3)}update(t,e,s,i,l){if(!this.enabled||!t.hasVerticalPosition||!t.hasStrength||t.strength<=0)return t.isClimbing=!1,!1;const o=t.hasCollider?t.colliderRadius:.44,c=Math.hypot(e.x,e.y),n=c>=.05,h=n?e.x/c:0,a=n?e.y/c:0;let r=null,g=1/0,y=0;for(const m of l.walls){const p=Math.max(m.x,Math.min(t.position.x,m.x+m.width)),f=Math.max(m.y,Math.min(t.position.y,m.y+m.height)),b=p-t.position.x,S=f-t.position.y,x=Math.hypot(b,S);x<=o+.15&&x<g&&(g=x,r=m,y=n?h*b+a*S:0)}if(!r)return t.isClimbing=!1,!1;const u=t.mass;if(u*l.gravity>this.maxAdhesion)return t.isClimbing=!1,!1;if(t.position.z>.05){if(n&&y<-.1)return t.isClimbing=!1,t.velocity.x=h*3,t.velocity.y=a*3,!1;if(t.isClimbing=!0,t.verticalVelocity=0,s&&n&&y>.01&&t.position.z<r.wallHeight){const m=t.baseMass,p=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*m*t.strength/Math.max(.1,u)));t.position.z+=p*i,t.position.z>=r.wallHeight&&(t.position.z=r.wallHeight,t.supportingSurfaceHeight=r.wallHeight,t.verticalVelocity=0,t.velocity.x=h*3.5,t.velocity.y=a*3.5)}return!0}if(s&&n&&y>.01&&t.position.z<r.wallHeight){t.isClimbing=!0,t.verticalVelocity=0;const m=t.baseMass,p=Math.max(.2,Math.min(this.maxClimbSpeed,this.maxClimbSpeed*m*t.strength/Math.max(.1,u)));return t.position.z+=p*i,!0}return t.isClimbing=!1,!1}}class Mt{constructor(t={}){d(this,"id","strength");d(this,"name","Strength Module");d(this,"enabled",!0);d(this,"strength",1);this.strength=t.strength??1,this.enabled=t.enabled??!0}}class bt extends U{constructor(e={}){super({name:"Player Character",position:{x:e.x??5,y:e.y??7,z:0},mass:e.mass??1.2,colliderRadius:e.colliderRadius??.44,color:e.color??"#f59e0b",bounceMod:.1});d(this,"strengthModule");d(this,"facingAngle");d(this,"heldObject");d(this,"isCharacter",!0);d(this,"isActivelyWalking",!1);d(this,"baseMass",1.2);d(this,"walkingModule");d(this,"pickupModule");d(this,"throwModule");d(this,"climbingModule");d(this,"isAiming");d(this,"aimTarget");d(this,"activeTrajectory");this.baseMass=e.mass??1.2,this.strength=e.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.strengthModule=new Mt({strength:e.strength??1}),this.walkingModule=new mt,this.pickupModule=new xt,this.throwModule=new St,this.climbingModule=new wt}get hasStrength(){return!!(this.strengthModule&&this.strengthModule.enabled&&this.strengthModule.strength>0)}get strength(){return this.hasStrength?this.strengthModule.strength:0}set strength(e){this.strengthModule?this.strengthModule.strength=Math.max(.1,e):this.strengthModule=new Mt({strength:e})}get mass(){const e=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return e+s}set mass(e){this.baseMass=Math.max(.1,e),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}updateFacingDirection(e,s,i){if((this.heldObject!==null||e)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,o=s.y-this.position.y;if(Math.hypot(l,o)>.1){this.facingAngle=Math.atan2(o,l);return}}i&&Math.hypot(i.x,i.y)>.05&&(this.facingAngle=Math.atan2(i.y,i.x))}updateCharacter(e,s,i,l,o,c=!1){if(this.climbingModule&&this.climbingModule.update(this,s,c,e,o),this.walkingModule&&this.walkingModule.update(this,s,e,o),this.updatePosition(e,o),this.updateFacingDirection(i,l,s),this.heldObject){const n=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*n,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*n,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||i,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,o):this.activeTrajectory=null}}class vt{constructor(t={}){d(this,"enabled",!0);d(this,"angularVelocity",{x:0,y:0,z:0});d(this,"rollResistance",.4);d(this,"visualPhase",0);var e,s,i;this.enabled=t.enabled??!0,this.angularVelocity={x:((e=t.angularVelocity)==null?void 0:e.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((i=t.angularVelocity)==null?void 0:i.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const e=this.angularSpeed;e>.001&&(this.visualPhase=(this.visualPhase+e*t)%(Math.PI*2))}}class Rt{constructor(t){d(this,"ctx");this.ctx=t}render(t,e,s,i,l=!1,o,c,n=!1,h){const a=this.ctx,r=a.canvas.width/t.width;a.clearRect(0,0,a.canvas.width,a.canvas.height),this.drawFloorGrid(t,r),this.drawWalls(t,r),n&&h&&this.drawWallEditorHover(t,h,r);const g=[e,...s];g.sort((y,u)=>Math.abs(y.position.z-u.position.z)>.001?y.position.z-u.position.z:Math.abs(y.verticalVelocity-u.verticalVelocity)>.001?y.verticalVelocity-u.verticalVelocity:y.position.y-u.position.y);for(const y of g)y instanceof bt?this.drawCharacter(y,s,r):this.drawFreebodyObject(y,g,e,r,y===c);for(const y of g)this.drawObjectShadow(y,t,r);e.activeTrajectory&&this.drawTrajectory(e.activeTrajectory,r),l&&(o&&o!==i&&this.drawHoverGizmo(o,r),i&&this.drawSelectionGizmo(i,l,r))}drawFloorGrid(t,e){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*e,t.height*e),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let i=1;i<t.width;i++)s.beginPath(),s.moveTo(i*e,0),s.lineTo(i*e,t.height*e),s.stroke();for(let i=1;i<t.height;i++)s.beginPath(),s.moveTo(0,i*e),s.lineTo(t.width*e,i*e),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*e-3,t.height*e-3)}drawWalls(t,e){const s=this.ctx;for(const i of t.walls)s.fillStyle="#1e293b",s.fillRect(i.x*e,i.y*e,i.width*e,i.height*e),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(i.x*e,i.y*e,i.width*e,i.height*e)}drawWallEditorHover(t,e,s){if(e.col<0||e.col>=t.cols||e.row<0||e.row>=t.rows)return;const i=this.ctx,l=e.col*t.tileSize*s,o=e.row*t.tileSize*s,c=t.tileSize*s,n=t.hasWall(e.col,e.row);i.save(),n?(i.fillStyle="rgba(239, 68, 68, 0.35)",i.strokeStyle="#ef4444",i.lineWidth=2.5,i.fillRect(l,o,c,c),i.strokeRect(l,o,c,c),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#fca5a5",i.textAlign="center",i.textBaseline="middle",i.fillText("✕ Erase",l+c/2,o+c/2)):(i.fillStyle="rgba(56, 189, 248, 0.3)",i.strokeStyle="#38bdf8",i.lineWidth=2.5,i.fillRect(l,o,c,c),i.strokeRect(l,o,c,c),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#7dd3fc",i.textAlign="center",i.textBaseline="middle",i.fillText("+ Draw",l+c/2,o+c/2)),i.restore()}drawObjectShadow(t,e,s){const i=this.ctx,l=t.position.x*s,o=t.position.y*s,c=t.position.z,n=1+c/e.wallHeight*1.5,h=t.colliderRadius*s*n,a=Math.max(.3,.85-c/(e.wallHeight*7)*.25),r=c>=e.wallHeight-.001;if(i.save(),i.beginPath(),t.visualShape==="box"){const g=h*2,y=Math.max(3,4*n);i.roundRect?i.roundRect(l-h,o-h,g,g,y):i.rect(l-h,o-h,g,g)}else i.arc(l,o,h,0,Math.PI*2);r?(i.strokeStyle=`rgba(56, 189, 248, ${a})`,i.lineWidth=2.5):(i.strokeStyle=`rgba(255, 255, 255, ${a})`,i.lineWidth=1.8),c>.01&&i.setLineDash([4,3]),i.stroke(),i.restore()}drawFreebodyObject(t,e,s,i,l=!1){var M,m;const o=this.ctx,c=t.position.x*i,n=t.position.y*i,h=t.hasCollider?t.colliderRadius:((M=t.colliderModule)==null?void 0:M.radius)??.32,a=h*i,r=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled,g=Math.hypot(t.position.x-s.position.x,t.position.y-s.position.y),y=r&&!t.isHeld&&g<=(((m=s.pickupModule)==null?void 0:m.pickupReach)??1.3)+h;if(y){if(o.save(),o.beginPath(),t.visualShape==="box"){const p=(a+5)*2;o.roundRect?o.roundRect(c-a-5,n-a-5,p,p,6):o.rect(c-a-5,n-a-5,p,p)}else o.arc(c,n,a+5,0,Math.PI*2);l?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",c,n-a-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}let u=!1;if(t.isAboveGround)for(const p of e){if(p===t)continue;if(Math.hypot(t.position.x-p.position.x,t.position.y-p.position.y)<t.colliderRadius+p.colliderRadius&&(t.position.z>p.position.z||Math.abs(t.position.z-p.position.z)<=.01&&t.verticalVelocity>p.verticalVelocity)){u=!0;break}}if(o.save(),o.globalAlpha=u?.55:1,t.visualShape==="box"){const p=a*2,f=Math.max(3,a*.16),b=c-a,S=n-a;o.beginPath(),o.roundRect?o.roundRect(b,S,p,p,f):o.rect(b,S,p,p),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();const x=Math.max(3,a*.22);o.beginPath(),o.roundRect?o.roundRect(b+x,S+x,p-x*2,p-x*2,f*.7):o.rect(b+x,S+x,p-x*2,p-x*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(b+x,S+x),o.lineTo(b+p-x,S+p-x),o.moveTo(b+p-x,S+x),o.lineTo(b+x,S+p-x),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(c,n,a,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();this.drawRollIndicator(t,c,n,a),o.restore()}drawCharacter(t,e,s){const i=this.ctx,l=t.position.x*s,o=t.position.y*s,c=t.colliderRadius*s;let n=!1;if(t.isAboveGround)for(const f of e){if(f===t)continue;if(Math.hypot(t.position.x-f.position.x,t.position.y-f.position.y)<t.colliderRadius+f.colliderRadius&&(t.position.z>f.position.z||Math.abs(t.position.z-f.position.z)<=.01&&t.verticalVelocity>f.verticalVelocity)){n=!0;break}}i.save(),i.globalAlpha=n?.55:1,i.beginPath(),i.arc(l,o,c,0,Math.PI*2),i.fillStyle=t.color,i.fill(),i.strokeStyle="#ffffff",i.lineWidth=2.5,i.stroke(),this.drawRollIndicator(t,l,o,c);const h=.52,a=c*.72,r=Math.max(3.5,c*.18),g=t.facingAngle-h,y=t.facingAngle+h,u=l+Math.cos(g)*a,M=o+Math.sin(g)*a,m=l+Math.cos(y)*a,p=o+Math.sin(y)*a;i.fillStyle="#000000",i.beginPath(),i.arc(u,M,r,0,Math.PI*2),i.arc(m,p,r,0,Math.PI*2),i.fill(),t.heldObject&&(i.strokeStyle="rgba(255, 255, 255, 0.6)",i.setLineDash([3,3]),i.lineWidth=1.5,i.beginPath(),i.moveTo(l,o),i.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),i.stroke(),i.setLineDash([])),i.restore()}drawRollIndicator(t,e,s,i){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,o=l.angularVelocity.x,c=l.angularVelocity.y,n=l.angularVelocity.z,h=Math.hypot(o,c,n);if(h<.02)return;const a=this.ctx,g=Math.hypot(o,c)<.05*h;if(a.save(),g){const y=i*.45,u=i*.78;a.beginPath(),a.arc(e,s,y,0,Math.PI*2),a.strokeStyle="rgba(255, 255, 255, 0.45)",a.lineWidth=1.5,a.setLineDash([]),a.stroke(),a.beginPath(),a.arc(e,s,u,0,Math.PI*2),a.strokeStyle="rgba(255, 255, 255, 0.95)",a.lineWidth=2,a.setLineDash([4,4]),a.lineDashOffset=-l.visualPhase*u*Math.sign(n||1),a.stroke()}else{const y=Math.atan2(-o,c),u=i*.82,M=Math.abs(n)/h,m=u*Math.pow(M,.85);a.translate(e,s),a.rotate(y);const p=n!==0?Math.sign(n):1;m<.5?(a.beginPath(),a.moveTo(-u,0),a.lineTo(u,0),a.strokeStyle="rgba(255, 255, 255, 0.95)",a.lineWidth=2.2,a.setLineDash([4,4]),a.lineDashOffset=-l.visualPhase*u,a.stroke()):(a.beginPath(),a.ellipse(0,0,u,m,0,0,Math.PI),a.strokeStyle="rgba(255, 255, 255, 0.95)",a.lineWidth=2.2,a.setLineDash([4,4]),a.lineDashOffset=-l.visualPhase*u*p,a.stroke(),a.beginPath(),a.ellipse(0,0,u,m,0,Math.PI,Math.PI*2),a.strokeStyle="rgba(255, 255, 255, 0.25)",a.lineWidth=1.8,a.setLineDash([4,4]),a.lineDashOffset=-l.visualPhase*u*p,a.stroke())}a.restore()}drawTrajectory(t,e){const s=this.ctx,i=t.points;if(i.length<2)return;s.save();for(let o=0;o<i.length-1;o++){const c=i[o],n=i[o+1];s.beginPath(),s.moveTo(c.x*e,c.y*e),s.lineTo(n.x*e,n.y*e),c.couldClearWall||n.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const l=i[i.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const o=8;s.beginPath(),s.moveTo(l.x*e-o,l.y*e-o),s.lineTo(l.x*e+o,l.y*e+o),s.moveTo(l.x*e+o,l.y*e-o),s.lineTo(l.x*e-o,l.y*e+o),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,e){var n;const s=this.ctx,i=t.position.x*e,l=t.position.y*e,c=((t.hasCollider?t.colliderRadius:((n=t.colliderModule)==null?void 0:n.radius)??.32)+.08)*e;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(i,l,c,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,e,s){var g;const i=this.ctx,l=t.position.x*s,o=t.position.y*s,h=(t.hasCollider?t.colliderRadius:((g=t.colliderModule)==null?void 0:g.radius)??.32)*s+6,a=Math.max(6,h*.4),r=e?"#fbbf24":"#38bdf8";if(i.save(),i.strokeStyle=r,i.lineWidth=2,i.setLineDash([]),i.beginPath(),i.moveTo(l-h,o-h+a),i.lineTo(l-h,o-h),i.lineTo(l-h+a,o-h),i.stroke(),i.beginPath(),i.moveTo(l+h-a,o-h),i.lineTo(l+h,o-h),i.lineTo(l+h,o-h+a),i.stroke(),i.beginPath(),i.moveTo(l+h,o+h-a),i.lineTo(l+h,o+h),i.lineTo(l+h-a,o+h),i.stroke(),i.beginPath(),i.moveTo(l-h+a,o+h),i.lineTo(l-h,o+h),i.lineTo(l-h,o+h-a),i.stroke(),e){const y=`${t.name} (${t.mass.toFixed(1)}kg)`;i.font="bold 10px 'Segoe UI', system-ui, sans-serif";const M=i.measureText(y).width+12,m=16,p=l-M/2,f=o-h-m-4;i.fillStyle="rgba(15, 23, 42, 0.85)",i.strokeStyle=r,i.lineWidth=1,i.beginPath(),i.roundRect(p,f,M,m,4),i.fill(),i.stroke(),i.fillStyle=r,i.textAlign="center",i.textBaseline="middle",i.fillText(y,l,f+m/2)}i.restore()}}class Ct{constructor(t,e){d(this,"canvas");d(this,"arena");d(this,"keysPressed",new Set);d(this,"mousePos",{x:0,y:0});d(this,"isMouseDown",!1);d(this,"isRightMouseDown",!1);d(this,"hoverWallTile",null);d(this,"movementVector",{x:0,y:0});d(this,"justPickedUp",!1);d(this,"isThrowingPress",!1);d(this,"hoverEntity",null);d(this,"selectedCanvasEntity",null);d(this,"draggedEntity",null);d(this,"dragOffset",{x:0,y:0});d(this,"handleClick");d(this,"onMouseDown");d(this,"onRightMouseDown");d(this,"onMouseUp");d(this,"onRightClick");d(this,"onDropAttempt");d(this,"onMouseMove");this.canvas=t,this.arena=e,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateTouchPos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateMovementVector(){let t=0,e=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(e-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(e+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,e);s>0?(this.movementVector.x=t/s,this.movementVector.y=e/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,e,s,i){i&&(this.selectedCanvasEntity=i.selectedEntity);const l=(n,h,a=.35)=>{var y;for(let u=s.length-1;u>=0;u--){const M=s[u],m=M.hasCollider?M.colliderRadius:((y=M.colliderModule)==null?void 0:y.radius)??.32;if(Math.hypot(M.position.x-n,M.position.y-h)<=m+a)return M}const r=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-n,t.position.y-h)<=r+a?t:null},o=(n,h)=>{var r;if(n<0||n>=e.cols||h<0||h>=e.rows)return;if(e.setWallTile(n,h,!0)){const g={id:`wall-${n}-${h}`,x:n*e.tileSize,y:h*e.tileSize,width:e.tileSize,height:e.tileSize,wallHeight:e.wallHeight},y=[t,...s];for(const u of y){const M=u.hasCollider?u.colliderRadius:((r=u.colliderModule)==null?void 0:r.radius)??.32;e.testWallOverlap(u.position.x,u.position.y,M,g)&&u.position.z<e.wallHeight&&(u.hasVerticalPosition||(u.verticalPositionModule?u.verticalPositionModule.enabled=!0:u.verticalPositionModule=new pt({z:e.wallHeight,hasVerticalVelocity:!0})),u.position.z=e.wallHeight,u.supportingSurfaceHeight=e.wallHeight,u.verticalVelocity=0)}}},c=(n,h)=>{n<0||n>=e.cols||h<0||h>=e.rows||e.setWallTile(n,h,!1)};this.onMouseDown=(n,h)=>{if(i!=null&&i.isEditMode){if(i.editTool==="walls"){const r=Math.floor(n/e.tileSize),g=Math.floor(h/e.tileSize);o(r,g);return}const a=l(n,h,.35);a?(this.selectedCanvasEntity=a,i.setSelectedEntity(a),this.draggedEntity=a,this.dragOffset.x=a.position.x-n,this.dragOffset.y=a.position.y-h,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(n,h)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"){const a=Math.floor(n/e.tileSize),r=Math.floor(h/e.tileSize);c(a,r)}},this.onMouseMove=(n,h)=>{var g;const a=Math.floor(n/e.tileSize),r=Math.floor(h/e.tileSize);if(a>=0&&a<e.cols&&r>=0&&r<e.rows?this.hoverWallTile={col:a,row:r}:this.hoverWallTile=null,i!=null&&i.isEditMode){if(i.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?o(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&c(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const y=n+this.dragOffset.x,u=h+this.dragOffset.y,M=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((g=this.draggedEntity.colliderModule)==null?void 0:g.radius)??.32;this.draggedEntity.position.x=Math.max(M,Math.min(e.width-M,y)),this.draggedEntity.position.y=Math.max(M,Math.min(e.height-M,u)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const y=l(n,h,.3);this.hoverEntity=y,this.canvas.style.cursor=y?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(n,h)=>{if(this.draggedEntity&&(this.draggedEntity=null),i!=null&&i.isEditMode)if(i.editTool==="walls")this.canvas.style.cursor="cell";else{const a=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=a,this.canvas.style.cursor=a?"grab":"crosshair"}},this.handleClick=(n,h)=>{if(!(i!=null&&i.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,n,h,e),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,n,h,s,e.wallHeight);a&&(t.pickupModule.pickup(t,a),this.justPickedUp=!0)}}},this.onRightClick=(n,h)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"||!i)return;const a=l(n,h,.4);a&&(this.selectedCanvasEntity=a,i.setSelectedEntity(a))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const n=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s,e.wallHeight);n&&t.pickupModule.pickup(t,n)}}}}class Pt{constructor(t){d(this,"container");d(this,"character");d(this,"arena");d(this,"objects");d(this,"onSpawnObject");d(this,"onDeleteObject");d(this,"onClearObjects");d(this,"selectedEntity");d(this,"isEditMode",!1);d(this,"editTool","entities");d(this,"onSelectionChange");d(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});d(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});d(this,"inspectorEl");d(this,"entitySelectorEl");d(this,"characterSpecificControlsEl");d(this,"objectSpecificControlsEl");d(this,"modePlayBtn");d(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var e;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(e=this.onSelectionChange)==null||e.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const e=this.container.querySelector("#edit-submode-container");e&&(e.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const e=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");e&&s&&(e.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const e=this.container.querySelector("#edit-hint-label");e&&(this.isEditMode?this.editTool==="walls"?e.textContent="Left-drag: Draw | Right-drag: Erase":e.textContent="Click & drag object in arena":e.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let e=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const i of this.objects){const l=i.id===t?"selected":"",o=i.visualShape==="box"?"📦":"⚪",c=i.hasMass?`${i.mass.toFixed(1)}kg`:"Massless";e+=`<option value="${i.id}" ${l}>${o} ${i.name} (${c})</option>`}this.entitySelectorEl.innerHTML=e;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,e,s,i,l,o,c,n,h,a,r,g,y,u,M,m,p,f,b,S,x,k,w,P,R,C,F,D,z,T,$,B,L,O,E,W,q,v,A,j,H,I,G,X,nt,ct,Y,N,rt,K,_,dt,J,Q,ht,tt,et,ut,it,Z,yt;this.container.innerHTML=`
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
            <div id="warn-friction-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((c=this.selectedEntity.frictionModule)!=null&&c.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no normal force)
            </div>
            <div id="group-mod-friction" style="display: ${(n=this.selectedEntity.frictionModule)!=null&&n.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Static Friction Mod</span>
                  <span id="val-entity-static-fric">${(((h=this.selectedEntity.frictionModule)==null?void 0:h.staticFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${((a=this.selectedEntity.frictionModule)==null?void 0:a.staticFrictionMod)??1}">
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
                ${(M=this.selectedEntity.bounceModule)!=null&&M.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((m=this.selectedEntity.bounceModule)!=null&&m.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(p=this.selectedEntity.bounceModule)!=null&&p.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((f=this.selectedEntity.bounceModule)==null?void 0:f.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((b=this.selectedEntity.bounceModule)==null?void 0:b.bounceMod)??.4}">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(P=this.selectedEntity.rollModule)!=null&&P.enabled?"active":""}">
                ${(R=this.selectedEntity.rollModule)!=null&&R.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(C=this.selectedEntity.rollModule)!=null&&C.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(F=this.selectedEntity.rollModule)!=null&&F.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((D=this.selectedEntity.rollModule)==null?void 0:D.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((z=this.selectedEntity.rollModule)==null?void 0:z.rollResistance)??.4}">
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
                <button id="toggle-walk" class="btn-toggle ${(T=this.character.walkingModule)!=null&&T.enabled?"active":""}">
                  ${($=this.character.walkingModule)!=null&&$.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((B=this.character.walkingModule)!=null&&B.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength&&((L=this.character.walkingModule)!=null&&L.enabled)?"block":"none"};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${(O=this.character.walkingModule)!=null&&O.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((E=this.character.walkingModule)==null?void 0:E.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((W=this.character.walkingModule)==null?void 0:W.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((q=this.character.walkingModule)==null?void 0:q.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((v=this.character.walkingModule)==null?void 0:v.maxWalkSpeed)??5.2}">
                </div>
              </div>
            </div>

            <!-- Strength Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>💪 Strength Ability</label>
                <button id="toggle-strength" class="btn-toggle ${(A=this.character.strengthModule)!=null&&A.enabled?"active":""}">
                  ${(j=this.character.strengthModule)!=null&&j.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-strength" style="display: ${(H=this.character.strengthModule)!=null&&H.enabled?"block":"none"};">
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
                <button id="toggle-pickup" class="btn-toggle ${(I=this.character.pickupModule)!=null&&I.enabled?"active":""}">
                  ${(G=this.character.pickupModule)!=null&&G.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(X=this.character.pickupModule)!=null&&X.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(((nt=this.character.pickupModule)==null?void 0:nt.pickupReach)??1.3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${((ct=this.character.pickupModule)==null?void 0:ct.pickupReach)??1.3}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Cross-Layer Reach Ratio</span>
                    <span id="val-pickup-cross-layer">${(((Y=this.character.pickupModule)==null?void 0:Y.crossLayerReachRatio)??.55).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-pickup-cross-layer" min="0.10" max="1.00" step="0.05" value="${((N=this.character.pickupModule)==null?void 0:N.crossLayerReachRatio)??.55}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(rt=this.character.throwModule)!=null&&rt.enabled?"active":""}">
                  ${(K=this.character.throwModule)!=null&&K.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(_=this.character.throwModule)!=null&&_.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((dt=this.character.throwModule)==null?void 0:dt.baseThrowForce)??7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((J=this.character.throwModule)==null?void 0:J.baseThrowForce)??7.6}">
                </div>
              </div>
            </div>

            <!-- Climbing Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🧗 Climbing Ability</label>
                <button id="toggle-climb" class="btn-toggle ${(Q=this.character.climbingModule)!=null&&Q.enabled?"active":""}">
                  ${(ht=this.character.climbingModule)!=null&&ht.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-climb-deps" class="module-dep-warning" style="display: ${(!this.character.hasVerticalPosition||!this.character.hasStrength)&&((tt=this.character.climbingModule)!=null&&tt.enabled)?"block":"none"};">
                ${this.character.hasVerticalPosition?this.character.hasStrength?"":"⚠️ Requires Strength Ability to climb":"⚠️ Requires Vertical Position (3D Z-axis)"}
              </div>
              <div id="group-mod-climb" style="display: ${(et=this.character.climbingModule)!=null&&et.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Adhesion (N)</span>
                    <span id="val-climb-adhesion">${(((ut=this.character.climbingModule)==null?void 0:ut.maxAdhesion)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-climb-adhesion" min="5.0" max="80.0" step="1.0" value="${((it=this.character.climbingModule)==null?void 0:it.maxAdhesion)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Climb Speed (u/s)</span>
                    <span id="val-climb-speed">${(((Z=this.character.climbingModule)==null?void 0:Z.maxClimbSpeed)??3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${((yt=this.character.climbingModule)==null?void 0:yt.maxClimbSpeed)??3}">
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var W,q,v,A,j,H,I;const t=this.selectedEntity,e=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=e?"none":"flex");const i=this.container.querySelector("#toggle-entity-shape");i&&(t.visualShape==="box"?(i.textContent="Box 📦",i.classList.add("active")):(i.textContent="Circle ⚪",i.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),o=this.container.querySelector("#group-mod-collider"),c=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),c&&(c.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((W=t.colliderModule)==null?void 0:W.radius)??.32,2);const n=this.container.querySelector("#toggle-mod-mass"),h=this.container.querySelector("#group-mod-mass"),a=this.container.querySelector("#note-mod-mass");n&&(n.textContent=t.hasMass?"Attached":"Detached",n.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),a&&(a.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((q=t.massModule)==null?void 0:q.mass)??1,1);const r=this.container.querySelector("#toggle-mod-friction"),g=this.container.querySelector("#group-mod-friction"),y=this.container.querySelector("#note-mod-friction"),u=this.container.querySelector("#warn-friction-mass"),M=!!(t.frictionModule&&t.frictionModule.enabled);r&&(r.textContent=M?"Attached":"Detached",r.classList.toggle("active",M)),g&&(g.style.display=M?"flex":"none"),y&&(y.style.display=M?"none":"block"),u&&(u.style.display=!t.hasMass&&M?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((v=t.frictionModule)==null?void 0:v.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((A=t.frictionModule)==null?void 0:A.dynamicFrictionMod)??1,2);const m=this.container.querySelector("#toggle-mod-bounce"),p=this.container.querySelector("#group-mod-bounce"),f=this.container.querySelector("#note-mod-bounce"),b=this.container.querySelector("#warn-bounce-mass"),S=!!(t.bounceModule&&t.bounceModule.enabled);m&&(m.textContent=S?"Attached":"Detached",m.classList.toggle("active",S)),p&&(p.style.display=S?"block":"none"),f&&(f.style.display=S?"none":"block"),b&&(b.style.display=!t.hasMass&&S?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const x=this.container.querySelector("#check-mod-vert-bounce"),k=this.container.querySelector("#warn-bounce-vert-vel");if(x&&(x.checked=!!((H=t.bounceModule)!=null&&H.verticalBounce)),k){const G=!!(S&&((I=t.bounceModule)!=null&&I.verticalBounce)&&!t.hasVerticalVelocity);k.style.display=G?"block":"none"}const w=this.container.querySelector("#toggle-mod-vert-pos"),P=this.container.querySelector("#group-mod-vert-pos"),R=this.container.querySelector("#note-mod-vert-pos"),C=t.hasVerticalPosition;w&&(w.textContent=C?"Attached":"Detached",w.classList.toggle("active",C)),P&&(P.style.display=C?"block":"none"),R&&(R.style.display=C?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const F=this.container.querySelector("#toggle-mod-vert-vel"),D=this.container.querySelector("#group-mod-vert-vel"),z=t.hasVerticalVelocity;F&&(F.textContent=z?"Enabled":"Disabled",F.classList.toggle("active",z)),D&&(D.style.display=z?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const T=this.container.querySelector("#toggle-mod-gravity"),$=this.container.querySelector("#note-mod-gravity");T&&(T.textContent=t.hasGravity?"Attached":"Detached",T.classList.toggle("active",t.hasGravity)),$&&($.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const B=this.container.querySelector("#toggle-mod-roll"),L=this.container.querySelector("#group-mod-roll"),O=this.container.querySelector("#note-roll-friction"),E=!!(t.rollModule&&t.rollModule.enabled);if(B&&(B.textContent=E?"Attached":"Detached",B.classList.toggle("active",E)),L&&(L.style.display=E?"block":"none"),O&&(O.style.display=E&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),e){const G=this.container.querySelector("#toggle-walk"),X=this.container.querySelector("#group-mod-walking"),nt=this.container.querySelector("#warn-walk-friction"),ct=this.container.querySelector("#warn-walk-strength"),Y=!!(this.character.walkingModule&&this.character.walkingModule.enabled);G&&(G.textContent=Y?"Attached":"Detached",G.classList.toggle("active",Y)),X&&(X.style.display=Y?"flex":"none"),nt&&(nt.style.display=Y&&!this.character.hasFriction?"block":"none"),ct&&(ct.style.display=Y&&!this.character.hasStrength?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1));const N=this.container.querySelector("#toggle-strength"),rt=this.container.querySelector("#group-mod-strength"),K=!!(this.character.strengthModule&&this.character.strengthModule.enabled);N&&(N.textContent=K?"Attached":"Detached",N.classList.toggle("active",K)),rt&&(rt.style.display=K?"block":"none"),this.character.strengthModule&&this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const _=this.container.querySelector("#toggle-pickup"),dt=this.container.querySelector("#group-mod-pickup"),J=!!(this.character.pickupModule&&this.character.pickupModule.enabled);_&&(_.textContent=J?"Attached":"Detached",_.classList.toggle("active",J)),dt&&(dt.style.display=J?"block":"none"),this.character.pickupModule&&(this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.setSliderVal("slide-pickup-cross-layer","val-pickup-cross-layer",this.character.pickupModule.crossLayerReachRatio,2));const Q=this.container.querySelector("#toggle-throw"),ht=this.container.querySelector("#group-mod-throw"),tt=!!(this.character.throwModule&&this.character.throwModule.enabled);Q&&(Q.textContent=tt?"Attached":"Detached",Q.classList.toggle("active",tt)),ht&&(ht.style.display=tt?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const et=this.container.querySelector("#toggle-climb"),ut=this.container.querySelector("#group-mod-climb"),it=this.container.querySelector("#warn-climb-deps"),Z=!!(this.character.climbingModule&&this.character.climbingModule.enabled);if(et&&(et.textContent=Z?"Attached":"Detached",et.classList.toggle("active",Z)),ut&&(ut.style.display=Z?"block":"none"),it){const yt=!this.character.hasVerticalPosition,ft=!this.character.hasStrength;it.style.display=Z&&(yt||ft)?"block":"none",it.textContent=yt?"⚠️ Requires Vertical Position (3D Z-axis)":ft?"⚠️ Requires Strength Ability to climb":""}this.character.climbingModule&&(this.setSliderVal("slide-climb-adhesion","val-climb-adhesion",this.character.climbingModule.maxAdhesion,0),this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.maxClimbSpeed,1))}}setSliderVal(t,e,s,i){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${e}`);l&&(l.value=s.toString()),o&&(o.textContent=i>0?s.toFixed(i):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,e=this.container.querySelector("#creator-name");e&&(e.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const i=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");i&&(i.value=t.color),l&&(l.textContent=t.color);const o=this.container.querySelector("#creator-toggle-collider"),c=this.container.querySelector("#grp-creator-radius");o&&(o.textContent=t.hasCollider?"Attached":"Detached",o.classList.toggle("active",t.hasCollider)),c&&(c.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const n=this.container.querySelector("#creator-toggle-mass"),h=this.container.querySelector("#grp-creator-mass");n&&(n.textContent=t.hasMass?"Attached":"Detached",n.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const a=this.container.querySelector("#creator-toggle-friction"),r=this.container.querySelector("#grp-creator-fric");a&&(a.textContent=t.hasFriction?"Attached":"Detached",a.classList.toggle("active",t.hasFriction)),r&&(r.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const g=this.container.querySelector("#creator-toggle-bounce"),y=this.container.querySelector("#grp-creator-bounce"),u=this.container.querySelector("#creator-check-vert-bounce"),M=this.container.querySelector("#creator-warn-bounce-vert");g&&(g.textContent=t.hasBounce?"Attached":"Detached",g.classList.toggle("active",t.hasBounce)),y&&(y.style.display=t.hasBounce?"block":"none"),u&&(u.checked=t.verticalBounce),M&&(M.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const m=this.container.querySelector("#creator-toggle-vert-pos"),p=this.container.querySelector("#grp-creator-vert-pos");m&&(m.textContent=t.hasVerticalPosition?"Attached":"Detached",m.classList.toggle("active",t.hasVerticalPosition)),p&&(p.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const f=this.container.querySelector("#creator-toggle-vert-vel");f&&(f.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",f.classList.toggle("active",t.hasVerticalVelocity));const b=this.container.querySelector("#creator-toggle-gravity");b&&(b.textContent=t.hasGravity?"Attached":"Detached",b.classList.toggle("active",t.hasGravity));const S=this.container.querySelector("#creator-toggle-roll"),x=this.container.querySelector("#group-creator-roll-resist");S&&(S.textContent=t.hasRollModule?"Enabled":"Disabled",S.classList.toggle("active",t.hasRollModule)),x&&(x.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var T,$,B,L,O,E,W,q;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(T=this.container.querySelector("#submode-entities"))==null||T.addEventListener("click",()=>{this.setEditTool("entities")}),($=this.container.querySelector("#submode-walls"))==null||$.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var A;const v=this.entitySelectorEl.value;if(v===this.character.id)this.selectedEntity=this.character;else{const j=this.objects.find(H=>H.id===v);j&&(this.selectedEntity=j)}this.updateSelectorOptions(),this.syncEntitySliders(),(A=this.onSelectionChange)==null||A.call(this,this.selectedEntity)}),(B=this.container.querySelector("#btn-duplicate-entity"))==null||B.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(L=this.container.querySelector("#btn-delete-entity"))==null||L.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const e=this.container.querySelector("#toggle-mod-collider");e==null||e.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new st({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",v=>{this.selectedEntity.colliderRadius=v},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new ot({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",v=>{this.selectedEntity.mass=v,this.updateSelectorOptions()},1);const i=this.container.querySelector("#toggle-mod-friction");i==null||i.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new lt,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",v=>{this.selectedEntity.staticGroundFrictionMod=v},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",v=>{this.selectedEntity.dynamicGroundFrictionMod=v},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new at({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",v=>{this.selectedEntity.bounceMod=v},2);const o=this.container.querySelector("#check-mod-vert-bounce");o==null||o.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=o.checked),this.syncEntitySliders(),this.updateInspector()});const c=this.container.querySelector("#toggle-mod-vert-pos");c==null||c.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new pt({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",v=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=v),this.selectedEntity.position.z=v,this.syncEntitySliders(),this.updateInspector()},2);const n=this.container.querySelector("#toggle-mod-vert-vel");n==null||n.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",v=>{this.selectedEntity.verticalVelocity=v},2);const h=this.container.querySelector("#toggle-mod-gravity");h==null||h.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new gt,this.syncEntitySliders()});const a=this.container.querySelector("#toggle-mod-roll");a==null||a.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new vt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",v=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=v)},2);const r=this.container.querySelector("#toggle-walk");r==null||r.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new mt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",v=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=v)},0),this.setupSlider("slide-walk-speed","val-walk-speed",v=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=v)},1);const g=this.container.querySelector("#toggle-strength");g==null||g.addEventListener("click",()=>{this.character.strengthModule?this.character.strengthModule.enabled=!this.character.strengthModule.enabled:this.character.strengthModule=new Mt({strength:1}),this.syncEntitySliders()}),this.setupSlider("slide-strength","val-strength",v=>{this.character.strength=v},1);const y=this.container.querySelector("#toggle-pickup");y==null||y.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new xt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",v=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=v)},1),this.setupSlider("slide-pickup-cross-layer","val-pickup-cross-layer",v=>{this.character.pickupModule&&(this.character.pickupModule.crossLayerReachRatio=v)},2);const u=this.container.querySelector("#toggle-throw");u==null||u.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new St,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",v=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=v)},1);const M=this.container.querySelector("#toggle-climb");M==null||M.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new wt,this.syncEntitySliders()}),this.setupSlider("slide-climb-adhesion","val-climb-adhesion",v=>{this.character.climbingModule&&(this.character.climbingModule.maxAdhesion=v)},0),this.setupSlider("slide-climb-speed","val-climb-speed",v=>{this.character.climbingModule&&(this.character.climbingModule.maxClimbSpeed=v)},1),this.setupSlider("slide-gravity","val-gravity",v=>{this.arena.gravity=v},1),this.setupSlider("slide-wall-height","val-wall-height",v=>{this.arena.setStandardWallHeight(v),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",v,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",v=>{this.arena.setStandardWallHeight(v),this.setSliderVal("slide-wall-height","val-wall-height",v,1)},1),(O=this.container.querySelector("#btn-reset-walls"))==null||O.addEventListener("click",()=>{this.arena.resetDefaultWalls()}),(E=this.container.querySelector("#btn-clear-walls"))==null||E.addEventListener("click",()=>{this.arena.clearAllWalls()}),this.setupSlider("slide-friction","val-friction",v=>{this.arena.frictionCoeff=v},1),this.setupSlider("slide-static-thresh","val-static-thresh",v=>{this.arena.staticFrictionThreshold=v},2),this.container.querySelectorAll(".preset-chip").forEach(v=>{v.addEventListener("click",()=>{const A=v.getAttribute("data-preset");A&&this.presets[A]&&(this.creatorState={...this.presets[A]},this.syncCreatorInputs())})});const p=this.container.querySelector("#creator-name");p==null||p.addEventListener("input",()=>{this.creatorState.name=p.value});const f=this.container.querySelector("#creator-toggle-shape");f==null||f.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",f.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",f.classList.toggle("active",this.creatorState.visualShape==="box")});const b=this.container.querySelector("#creator-color"),S=this.container.querySelector("#val-creator-color");b==null||b.addEventListener("input",()=>{this.creatorState.color=b.value,S&&(S.textContent=b.value)});const x=this.container.querySelector("#creator-toggle-collider");x==null||x.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,x.textContent=this.creatorState.hasCollider?"Attached":"Detached",x.classList.toggle("active",this.creatorState.hasCollider);const v=this.container.querySelector("#grp-creator-radius");v&&(v.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",v=>{this.creatorState.colliderRadius=v},2);const k=this.container.querySelector("#creator-toggle-mass");k==null||k.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,k.textContent=this.creatorState.hasMass?"Attached":"Detached",k.classList.toggle("active",this.creatorState.hasMass);const v=this.container.querySelector("#grp-creator-mass");v&&(v.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",v=>{this.creatorState.mass=v},1);const w=this.container.querySelector("#creator-toggle-friction");w==null||w.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,w.textContent=this.creatorState.hasFriction?"Attached":"Detached",w.classList.toggle("active",this.creatorState.hasFriction);const v=this.container.querySelector("#grp-creator-fric");v&&(v.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",v=>{this.creatorState.dynamicFrictionMod=v},2);const P=this.container.querySelector("#creator-toggle-bounce");P==null||P.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,P.textContent=this.creatorState.hasBounce?"Attached":"Detached",P.classList.toggle("active",this.creatorState.hasBounce);const v=this.container.querySelector("#grp-creator-bounce");v&&(v.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",v=>{this.creatorState.bounceMod=v},2);const R=this.container.querySelector("#creator-check-vert-bounce");R==null||R.addEventListener("change",()=>{this.creatorState.verticalBounce=R.checked,this.syncCreatorInputs()});const C=this.container.querySelector("#creator-toggle-vert-pos");C==null||C.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",v=>{this.creatorState.elevation=v},2);const F=this.container.querySelector("#creator-toggle-vert-vel");F==null||F.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const D=this.container.querySelector("#creator-toggle-gravity");D==null||D.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,D.textContent=this.creatorState.hasGravity?"Attached":"Detached",D.classList.toggle("active",this.creatorState.hasGravity)});const z=this.container.querySelector("#creator-toggle-roll");z==null||z.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,z.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",z.classList.toggle("active",this.creatorState.hasRollModule);const v=this.container.querySelector("#group-creator-roll-resist");v&&(v.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",v=>{this.creatorState.rollResistance=v},2),(W=this.container.querySelector("#btn-spawn-configured"))==null||W.addEventListener("click",()=>{this.spawnFromCreator()}),(q=this.container.querySelector("#btn-clear-entities"))==null||q.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,e=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),i=new U({name:t.name||"Custom Object",position:{x:e,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new st({radius:t.colliderRadius}):null,massModule:t.hasMass?new ot({mass:t.mass}):null,frictionModule:t.hasFriction?new lt({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new at({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new pt({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new gt:null,rollModule:t.hasRollModule?new vt({rollResistance:t.rollResistance}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,e=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),i=new U({name:`${t.name} (Copy)`,position:{x:e,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new st({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new ot({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new lt({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new at({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new pt({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new gt({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new vt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,e,s,i=0){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${e}`);!l||!o||l.addEventListener("input",()=>{const c=parseFloat(l.value);o.textContent=i>0?c.toFixed(i):Math.round(c).toString(),s(c)})}updateInspector(){const t=this.selectedEntity,e=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
      `:""}
    `}}class Ft{constructor(t){d(this,"arena");d(this,"character");d(this,"objects");d(this,"renderer");d(this,"inputManager");d(this,"devPanel");d(this,"isRunning",!1);d(this,"lastTime",0);d(this,"accumulator",0);d(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let e=(t-this.lastTime)/1e3;for(this.lastTime=t,e>.2&&(e=.2),this.accumulator+=e;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects,this.arena.wallHeight));const i=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,i,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const e=this.inputManager;e.draggedEntity!==this.character?this.character.updateCharacter(t,e.movementVector,e.isMouseDown&&!this.devPanel.isEditMode,e.mousePos,this.arena,e.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const i of this.objects)e.draggedEntity!==i&&i.updatePosition(t,this.arena);const s=e.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const i=this.character.pickupModule.findTargetObject(this.character,e.mousePos.x,e.mousePos.y,this.objects,this.arena.wallHeight);i&&(this.character.pickupModule.pickup(this.character,i),e.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],e=this.inputManager,s=3;for(let i=0;i<s;i++)for(let l=0;l<t.length;l++)for(let o=l+1;o<t.length;o++){const c=t[l],n=t[o];if(c.isHeld||n.isHeld||c===e.draggedEntity||n===e.draggedEntity||!c.hasCollider||!n.hasCollider)continue;const h=this.arena.wallHeight-.15,a=c.position.z>=h||c.supportingSurfaceHeight>=h,r=n.position.z>=h||n.supportingSurfaceHeight>=h;if(a!==r)continue;const g=n.position.x-c.position.x,y=n.position.y-c.position.y,u=g*g+y*y,M=c.colliderRadius+n.colliderRadius;if(u<M*M&&u>1e-6){const m=Math.sqrt(u),p=M-m,f=g/m,b=y/m,S=n.velocity.x-c.velocity.x,x=n.velocity.y-c.velocity.y,k=S*f+x*b,w=!c.hasMass,P=!n.hasMass;if(w&&P){if(c.position.x-=f*p*.5,c.position.y-=b*p*.5,n.position.x+=f*p*.5,n.position.y+=b*p*.5,k<0){const T=-k*.5;c.velocity.x-=T*f,c.velocity.y-=T*b,n.velocity.x+=T*f,n.velocity.y+=T*b}continue}if(!w&&P){this.isEntityPinnedAgainstWall(n,f,b)?(c.position.x-=f*p,c.position.y-=b*p,c.velocity.x=0,c.velocity.y=0):(n.position.x+=f*p,n.position.y+=b*p,k<0&&(n.velocity.x+=(c.velocity.x-n.velocity.x)*Math.abs(f),n.velocity.y+=(c.velocity.y-n.velocity.y)*Math.abs(b)));continue}if(w&&!P){this.isEntityPinnedAgainstWall(c,-f,-b)?(n.position.x+=f*p,n.position.y+=b*p,n.velocity.x=0,n.velocity.y=0):(c.position.x-=f*p,c.position.y-=b*p,k<0&&(c.velocity.x+=(n.velocity.x-c.velocity.x)*Math.abs(f),c.velocity.y+=(n.velocity.y-c.velocity.y)*Math.abs(b)));continue}const R=1/c.mass,C=1/n.mass,F=R+C;if(F<=1e-4)continue;const D=R/F,z=C/F;if(c.position.x-=f*p*D,c.position.y-=b*p*D,n.position.x+=f*p*z,n.position.y+=b*p*z,k<0){const T=c instanceof bt&&c.isActivelyWalking||n instanceof bt&&n.isActivelyWalking,$=c.hasBounce&&n.hasBounce,B=c.isCharacter||!c.hasBounce?0:c.bounceMod??0,L=n.isCharacter||!n.hasBounce?0:n.bounceMod??0,E=-(1+(T||!$?0:Math.max(0,Math.min(.98,Math.max(B,L)))))*k/F;c.velocity.x-=E*R*f,c.velocity.y-=E*R*b,n.velocity.x+=E*C*f,n.velocity.y+=E*C*b;const W=-b,q=f,v=S*W+x*q;if(Math.abs(v)>.001){const A=.35*Math.sqrt(c.dynamicGroundFrictionMod*n.dynamicGroundFrictionMod),j=.4,H=Math.abs(v)/(F*(1+1/j)),I=A*Math.abs(E),G=Math.min(H,I)*Math.sign(v);if(c.velocity.x+=G*R*W,c.velocity.y+=G*R*q,n.velocity.x-=G*C*W,n.velocity.y-=G*C*q,c.rollModule&&c.rollModule.enabled){const X=G/(j*c.mass*c.colliderRadius);c.rollModule.angularVelocity.z+=X,c.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,c.rollModule.angularVelocity.z)),c.isRestingOnSurface&&(c.rollModule.angularVelocity.y=c.velocity.x/c.colliderRadius,c.rollModule.angularVelocity.x=-c.velocity.y/c.colliderRadius)}if(n.rollModule&&n.rollModule.enabled){const X=G/(j*n.mass*n.colliderRadius);n.rollModule.angularVelocity.z-=X,n.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,n.rollModule.angularVelocity.z)),n.isRestingOnSurface&&(n.rollModule.angularVelocity.y=n.velocity.x/n.colliderRadius,n.rollModule.angularVelocity.x=-n.velocity.y/n.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,e,s){const i=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(e>.3&&t.position.x>=this.arena.width-i-l||e<-.3&&t.position.x<=i+l||s>.3&&t.position.y>=this.arena.height-i-l||s<-.3&&t.position.y<=i+l)return!0;for(const o of this.arena.walls)if(t.position.z<o.wallHeight-.05){const c=t.position.x+e*l,n=t.position.y+s*l,h=Math.max(o.x,Math.min(c,o.x+o.width)),a=Math.max(o.y,Math.min(n,o.y+o.height)),r=c-h,g=n-a;if(r*r+g*g<i*i)return!0}return!1}}function $t(){const V=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!V||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const e=V.getContext("2d");if(!e){console.error("Failed to acquire 2D canvas context");return}const s=new Et(20,14,1);V.width=1e3,V.height=700;const i=new bt({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new U({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new U({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new U({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new U({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new vt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})],o=new Rt(e),c=new Pt({container:t,character:i,arena:s,objects:l,onSpawnObject:a=>{l.push(a),c.updateSelectorOptions()},onDeleteObject:a=>{const r=l.indexOf(a);r!==-1&&l.splice(r,1),c.updateSelectorOptions()},onClearObjects:()=>{i.heldObject&&(i.heldObject.isHeld=!1,i.heldObject.heldBy=null,i.heldObject=null),l.length=0,c.updateSelectorOptions()}}),n=new Ct(V,s);n.handleInteractions(i,s,l,c),c.onSelectionChange=a=>{n.selectedCanvasEntity=a},new Ft({arena:s,character:i,objects:l,renderer:o,inputManager:n,devPanel:c}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",$t);

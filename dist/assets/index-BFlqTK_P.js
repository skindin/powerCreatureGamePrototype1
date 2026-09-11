var ut=Object.defineProperty;var yt=(E,t,e)=>t in E?ut(E,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):E[t]=e;var d=(E,t,e)=>yt(E,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();class pt{constructor(t=20,e=14,s=1){d(this,"width");d(this,"height");d(this,"tileSize");d(this,"cols");d(this,"rows");d(this,"wallHeight");d(this,"gravity");d(this,"frictionCoeff");d(this,"staticFrictionThreshold");d(this,"tileGrid");d(this,"walls",[]);this.width=t,this.height=e,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(e/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.setupDefaultTileMap(),this.rebuildWalls()}setupDefaultTileMap(){for(let e=1;e<=4;e++)this.tileGrid[e][10]=1;for(let e=8;e<=12;e++)this.tileGrid[e][10]=1;this.tileGrid[4][4]=1,this.tileGrid[5][4]=1,this.tileGrid[4][5]=1,this.tileGrid[5][5]=1,this.tileGrid[7][15]=1,this.tileGrid[8][15]=1,this.tileGrid[7][16]=1,this.tileGrid[8][16]=1}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]===1&&this.walls.push({id:`wall-${e}-${t}`,x:e*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,e,s){if(t<0||t>=this.cols||e<0||e>=this.rows)return!1;const i=s?1:0;return this.tileGrid[e][t]===i?!1:(this.tileGrid[e][t]=i,this.rebuildWalls(),!0)}hasWall(t,e){return t<0||t>=this.cols||e<0||e>=this.rows?!1:this.tileGrid[e][t]===1}clearAllWalls(){for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]=0;this.rebuildWalls()}resetDefaultWalls(){for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]=0;this.setupDefaultTileMap(),this.rebuildWalls()}getWallAt(t,e){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&e>=s.y&&e<=s.y+s.height)return s;return null}testWallOverlap(t,e,s,i){const o=Math.max(i.x,Math.min(t,i.x+i.width)),l=Math.max(i.y,Math.min(e,i.y+i.height)),c=t-o,a=e-l;return c*c+a*a<s*s}getSupportingWall(t,e,s=0){if(s<=0)return this.getWallAt(t,e);for(const i of this.walls)if(this.testWallOverlap(t,e,s,i))return i;return null}getSupportingSurfaceHeight(t,e,s=0){const i=this.getSupportingWall(t,e,s);return i?i.wallHeight:0}}class N{constructor(t={}){d(this,"radius");d(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class K{constructor(t={}){d(this,"mass");d(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class _{constructor(t={}){d(this,"staticFrictionMod");d(this,"dynamicFrictionMod");d(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class J{constructor(t={}){d(this,"bounceMod");d(this,"verticalBounce");d(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class et{constructor(t={}){d(this,"enabled");this.enabled=t.enabled??!0}}class tt{constructor(t={}){d(this,"z");d(this,"hasVerticalVelocity");d(this,"verticalVelocity");d(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}class U{constructor(t={}){d(this,"id");d(this,"name");d(this,"position");d(this,"velocity");d(this,"color");d(this,"isHeld");d(this,"heldBy");d(this,"lastThrower",null);d(this,"isCharacter",!1);d(this,"visualShape","circle");d(this,"colliderModule",null);d(this,"massModule",null);d(this,"frictionModule",null);d(this,"bounceModule",null);d(this,"verticalPositionModule",null);d(this,"gravityModule",null);d(this,"rollModule",null);d(this,"supportingSurfaceHeight",0);var e,s,i,o,l;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((e=t.position)==null?void 0:e.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((i=t.position)==null?void 0:i.z)??0},this.velocity={x:((o=t.velocity)==null?void 0:o.x)??0,y:((l=t.velocity)==null?void 0:l.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new N({radius:t.colliderRadius}):new N({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new K({mass:t.mass}):new K({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new _({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new J({bounceMod:t.bounceMod}):new J({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new tt({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new et,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new N({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new K({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new _({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new _({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new J({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.95||this.supportingSurfaceHeight>=.95)}updatePosition(t,e){var a,h;if(this.isHeld)return;if(this.lastThrower){const n=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,r=(((a=this.lastThrower.pickupModule)==null?void 0:a.pickupReach)??1.3)+this.colliderRadius+n;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>r||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0,i=null;if(this.hasCollider&&this.hasVerticalPosition&&(i=this.position.z>=e.wallHeight-.15||this.supportingSurfaceHeight>.01&&this.position.z>=e.wallHeight-.35?e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null,s=i?i.wallHeight:0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=e.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const n=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const r=this.rollModule,g=this.colliderRadius>0?this.colliderRadius:.3,y=.4,u=this.bounceMod,f=(1+u)*this.mass*n,x=e.frictionCoeff*this.dynamicGroundFrictionMod*.05,p=this.velocity.x-r.angularVelocity.y*g,M=this.velocity.y+r.angularVelocity.x*g,b=Math.hypot(p,M);if(b>.001&&x>0){const m=x*f,w=b*this.mass/(1+1/y),V=Math.min(w,m),C=p/b*V,P=M/b*V;this.velocity.x-=C/this.mass,this.velocity.y-=P/this.mass,r.angularVelocity.y+=C/(y*this.mass*g),r.angularVelocity.x-=P/(y*this.mass*g)}const S=Math.max(.65,1-(1-u)*.35);r.angularVelocity.x*=S,r.angularVelocity.y*=S,r.angularVelocity.z*=S}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((h=this.walkingModule)==null?void 0:h.enabled)))if(this.rollModule&&this.rollModule.enabled){const r=this.rollModule,g=this.colliderRadius>0?this.colliderRadius:.3,y=e.frictionCoeff*this.dynamicGroundFrictionMod,u=.4,f=this.velocity.x-r.angularVelocity.y*g,x=this.velocity.y+r.angularVelocity.x*g,p=Math.hypot(f,x);if(y>0&&p>.001){const b=y*(1+1/u)*t;if(p<=b){const S=this.velocity.x+u*r.angularVelocity.y*g,m=this.velocity.y-u*r.angularVelocity.x*g,w=S/(1+u),V=m/(1+u);this.velocity.x=w,this.velocity.y=V,r.angularVelocity.y=w/g,r.angularVelocity.x=-V/g}else{const S=f/p*y*t,m=x/p*y*t;this.velocity.x-=S,this.velocity.y-=m,r.angularVelocity.y+=S/(u*g),r.angularVelocity.x-=m/(u*g)}}const M=Math.hypot(this.velocity.x,this.velocity.y);if(M>0){if(r.rollResistance>0){const b=r.rollResistance*t,S=Math.max(0,M-b);if(S<.005)this.velocity.x=0,this.velocity.y=0,r.angularVelocity.x=0,r.angularVelocity.y=0;else{const m=S/M;this.velocity.x*=m,this.velocity.y*=m,r.angularVelocity.x*=m,r.angularVelocity.y*=m}}}else{const b=Math.hypot(r.angularVelocity.x,r.angularVelocity.y);if(b>0&&y>0){const S=y/(u*g)*t,m=Math.max(0,b-S),w=b>0?m/b:0;r.angularVelocity.x*=w,r.angularVelocity.y*=w}}if(Math.abs(r.angularVelocity.z)>.001&&r.rollResistance>0){const b=r.rollResistance/(u*g)*t,S=Math.sign(r.angularVelocity.z),m=Math.abs(r.angularVelocity.z);r.angularVelocity.z=m<=b?0:S*(m-b)}r.updateVisualPhase(t)}else{const r=Math.hypot(this.velocity.x,this.velocity.y);if(r>0){const g=e.staticFrictionThreshold*this.staticGroundFrictionMod;if(r<g)this.velocity.x=0,this.velocity.y=0;else{const y=e.frictionCoeff*this.dynamicGroundFrictionMod*t,f=Math.max(0,r-y)/r;this.velocity.x*=f,this.velocity.y*=f}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);if(this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t,this.hasCollider){const n=this.colliderRadius,r=n,g=e.width-n,y=n,u=e.height-n,f=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;if(this.position.x<r?(this.position.x=r,this.resolveWallImpact(1,0,f)):this.position.x>g&&(this.position.x=g,this.resolveWallImpact(-1,0,f)),this.position.y<y?(this.position.y=y,this.resolveWallImpact(0,1,f)):this.position.y>u&&(this.position.y=u,this.resolveWallImpact(0,-1,f)),!i)for(const x of e.walls)this.position.z<x.wallHeight-.05&&this.resolveWallCollision(x)}const l=16,c=Math.hypot(this.velocity.x,this.velocity.y);if(c>l){const n=l/c;this.velocity.x*=n,this.velocity.y*=n}if(this.rollModule&&this.rollModule.enabled){const r=this.rollModule.angularSpeed;if(r>35){const g=35/r;this.rollModule.angularVelocity.x*=g,this.rollModule.angularVelocity.y*=g,this.rollModule.angularVelocity.z*=g}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}resolveWallImpact(t,e,s){this.lastThrower=null;const i=this.velocity.x*t+this.velocity.y*e;if(i>=0)return;const o=i;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*o*t,this.velocity.y-=(1+s)*o*e):(this.velocity.x-=o*t,this.velocity.y-=o*e),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const l=this.rollModule,c=this.colliderRadius>0?this.colliderRadius:.3,a=.4,h=.35,n=-e,r=t,g=this.velocity.x*n+this.velocity.y*r,y=-(1+s)*this.mass*o,u=g-l.angularVelocity.z*c,f=Math.abs(u)*this.mass/(1+1/a),x=h*y,p=Math.min(f,x),M=-Math.sign(u)*p,b=g,S=b+M/this.mass,m=Math.abs(S)<=Math.abs(b)+.01?S-b:-b*.1;this.velocity.x+=m*n,this.velocity.y+=m*r;const V=-(m*this.mass)/(a*this.mass*c);l.angularVelocity.z+=V,l.angularVelocity.z=Math.max(-30,Math.min(30,l.angularVelocity.z)),l.angularVelocity.y=this.velocity.x/c,l.angularVelocity.x=-this.velocity.y/c}}resolveWallCollision(t){if(!this.hasCollider)return;const e=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),i=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),o=this.position.x-s,l=this.position.y-i,c=o*o+l*l;if(c<e*e){this.lastThrower=null;const a=Math.sqrt(c);let h=0,n=0,r=0;if(a===0){const y=Math.abs(this.position.x-t.x),u=Math.abs(t.x+t.width-this.position.x),f=Math.abs(this.position.y-t.y),x=Math.abs(t.y+t.height-this.position.y),p=Math.min(y,u,f,x);p===y?(h=-1,r=y+e):p===u?(h=1,r=u+e):p===f?(n=-1,r=f+e):(n=1,r=x+e)}else r=e-a,h=o/a,n=l/a;this.position.x+=h*r,this.position.y+=n*r;const g=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(h,n,g)}}}class rt{constructor(){d(this,"id","walking");d(this,"name","Walking Module");d(this,"enabled",!0);d(this,"maxWalkForce",35);d(this,"maxWalkSpeed",5.2);d(this,"dragDamping",8.01)}update(t,e,s,i){var C;if(!this.enabled||t.isAboveGround){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((C=t.frictionModule)!=null&&C.enabled)||!t.hasMass){t.isActivelyWalking=!1;return}const o=Math.hypot(e.x,e.y),l=o>.05;if(t.isActivelyWalking=l,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const h=i.frictionCoeff/10,n=a*h,g=t.carriedMass/(Math.max(.1,t.strength)*8),y=this.maxWalkSpeed/(1+g);let u=0,f=0;if(l){const P=e.x/o,k=e.y/o;u=P*y,f=k*y}const x=u-t.velocity.x,p=f-t.velocity.y,M=Math.hypot(x,p);if(M<.001){t.velocity.x=u,t.velocity.y=f;return}const b=Math.hypot(t.velocity.x,t.velocity.y),S=Math.max(.02,i.staticFrictionThreshold*t.staticGroundFrictionMod),m=t.hasMass?Math.max(.2,t.baseMass):1,V=this.maxWalkForce*t.strength/m*n*s;if(M<=V||!l&&b<S)t.velocity.x=u,t.velocity.y=f;else{const P=V/M;t.velocity.x+=x*P,t.velocity.y+=p*P}}}class dt{constructor(){d(this,"id","pickup");d(this,"name","Pickup Ability");d(this,"enabled",!0);d(this,"pickupReach",1.3)}findTargetObject(t,e,s,i){var c;if(!this.enabled)return null;let o=null,l=1/0;for(const a of i){if(a===t||a.isHeld||a.isCharacter||a.lastThrower===t)continue;const h=a.hasCollider?a.colliderRadius:((c=a.colliderModule)==null?void 0:c.radius)??.32;if(Math.hypot(a.position.x-t.position.x,a.position.y-t.position.y)>this.pickupReach+h)continue;const r=Math.hypot(a.position.x-e,a.position.y-s);r<l&&(l=r,o=a)}return o}pickup(t,e){if(!this.enabled||t.heldObject)return!1;const s=e.velocity.x,i=e.velocity.y,o=e.mass/Math.max(.2,t.mass);return t.velocity.x+=s*o,t.velocity.y+=i*o,t.isAboveGround&&Math.abs(e.verticalVelocity)>.1&&(t.verticalVelocity+=e.verticalVelocity*o),t.heldObject=e,e.isHeld=!0,e.heldBy=t,e.velocity.x=0,e.velocity.y=0,e.verticalVelocity=0,e.position.z=e.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const e=t.heldObject;return t.heldObject=null,e.isHeld=!1,e.heldBy=null,e.velocity.x=t.velocity.x*.4,e.velocity.y=t.velocity.y*.4,e.verticalVelocity=0,e}}class ht{constructor(){d(this,"id","throw");d(this,"name","Throw Ability");d(this,"enabled",!0);d(this,"baseThrowForce",7.6);d(this,"maxThrowAimDistance",13)}testWallIntersection(t,e,s,i){const o=Math.max(i.x,Math.min(t,i.x+i.width)),l=Math.max(i.y,Math.min(e,i.y+i.height)),c=t-o,a=e-l;return c*c+a*a<s*s}computeLaunchVelocity(t,e,s,i,o,l,c,a=!0,h=!0,n=.35){const r=i-t,g=o-e,y=Math.hypot(r,g);if(y<.1)return null;const u=Math.min(y,this.maxThrowAimDistance),f=r/y,x=g/y,p=t+f*u,M=e+x*u;if(!a||!h){const W=Math.max(3,c),T=Math.max(.14,u/W),$=f*W,v=x*W;return{vx:$,vy:v,vz:0,totalTime:T,finalTargetX:p,finalTargetY:M,targetSurfaceHeight:s}}const b=l.getSupportingSurfaceHeight(p,M),S=b-s;let m=1;S>0&&(m=Math.max(m,(S+.15)/u));const w=40,V=n>0?n:.35,C=.25;for(let W=1;W<w;W++){const T=W/w,$=t+(p-t)*T,v=e+(M-e)*T;for(const F of l.walls)if(this.testWallIntersection($,v,V,F)){if(b>0&&p>=F.x&&p<=F.x+F.width&&M>=F.y&&M<=F.y+F.height&&T>.65)continue;const G=(1-T)*s+T*b,H=F.wallHeight+C-G;if(H>0){const I=T*(1-T)*u;if(I>.001){const O=H/I;O>m&&(m=O)}}}}const P=Math.tan(85*Math.PI/180),k=Math.min(P,m),R=2*(u*k-S);if(R<=0)return null;const z=Math.sqrt(R/l.gravity);if(z<=.05)return null;const D=u/z,B=D*k,A=f*D,L=x*D;return{vx:A,vy:L,vz:B,totalTime:z,finalTargetX:p,finalTargetY:M,targetSurfaceHeight:b}}calculateTrajectory(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const o=t.heldObject,l=o.position.x,c=o.position.y,a=o.position.z,h=this.baseThrowForce*t.strength,n=o.hasGravity&&o.hasVerticalVelocity,r=this.computeLaunchVelocity(l,c,a,e,s,i,h,o.hasGravity,o.hasVerticalVelocity,o.colliderRadius);if(!r)return null;const{vx:g,vy:y,vz:u,totalTime:f,finalTargetX:x,finalTargetY:p,targetSurfaceHeight:M}=r,b=90,S=f/b,m=[];let w=!1,V=M>0,C;for(let k=0;k<=b;k++){const R=k*S,z=k===b?x:l+g*R,D=k===b?p:c+y*R,B=n?a+u*R-.5*i.gravity*R*R:a,A=n?k===b?M:Math.max(M,B):a,L=n?u-i.gravity*R:0,W=A>i.wallHeight;let T=!1,$=!1;for(const v of i.walls)if(this.testWallIntersection(z,D,o.colliderRadius,v)&&(T=!0,A<=v.wallHeight+.001)){if(m.length>0&&m[m.length-1].z>=v.wallHeight-.05&&L<=0){if(M>0&&(k>=b-2||Math.hypot(z-x,D-p)<.2)){V=!0;break}else if(M===0){V=!0,$=!0,w=!0,C=v.id;break}}else if(A<v.wallHeight-.05){$=!0,w=!0,C=v.id;break}}if(m.push({x:z,y:D,z:A,t:R,couldClearWall:W,isOverWall:T,collidesWall:$}),$)break}const P=m[m.length-1];return{points:m,landPoint:{x:w?P.x:x,y:w?P.y:p},isBlockedByWall:w,isLandingOnWallTop:w?V:M>0,blockedAtWallId:C}}throwHeldObject(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const o=t.heldObject,l=o.position.x,c=o.position.y,a=o.position.z,h=this.baseThrowForce*t.strength,n=this.computeLaunchVelocity(l,c,a,e,s,i,h,o.hasGravity,o.hasVerticalVelocity,o.colliderRadius);if(!n)return null;if(o.isHeld=!1,o.heldBy=null,o.lastThrower=t,o.velocity.x=n.vx,o.velocity.y=n.vy,o.verticalVelocity=n.vz,o.position.z=o.hasVerticalPosition?Math.max(.3,o.position.z):0,o.hasFriction&&o.rollModule&&o.rollModule.enabled){const x=o.colliderRadius>0?o.colliderRadius:.3;o.rollModule.angularVelocity.y=n.vx/x,o.rollModule.angularVelocity.x=-n.vy/x}const r=o.hasMass?o.mass:0,g=t.hasMass?Math.max(.2,t.baseMass):0,y=r>0&&g>0?r/g:0;t.heldObject=null;const u=n.vx-t.velocity.x,f=n.vy-t.velocity.y;if(t.velocity.x-=u*y,t.velocity.y-=f*y,t.isAboveGround&&o.hasVerticalVelocity){const x=n.vz-t.verticalVelocity;t.verticalVelocity-=x*y}return o}}class st extends U{constructor(e={}){super({name:"Player Character",position:{x:e.x??5,y:e.y??7,z:0},mass:e.mass??1.2,colliderRadius:e.colliderRadius??.44,color:e.color??"#f59e0b",bounceMod:.1});d(this,"strength");d(this,"facingAngle");d(this,"heldObject");d(this,"isCharacter",!0);d(this,"isActivelyWalking",!1);d(this,"baseMass",1.2);d(this,"walkingModule");d(this,"pickupModule");d(this,"throwModule");d(this,"isAiming");d(this,"aimTarget");d(this,"activeTrajectory");this.baseMass=e.mass??1.2,this.strength=e.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.walkingModule=new rt,this.pickupModule=new dt,this.throwModule=new ht}get mass(){const e=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return e+s}set mass(e){this.baseMass=Math.max(.1,e),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}updateFacingDirection(e,s,i){if((this.heldObject!==null||e)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const o=s.x-this.position.x,l=s.y-this.position.y;if(Math.hypot(o,l)>.1){this.facingAngle=Math.atan2(l,o);return}}i&&Math.hypot(i.x,i.y)>.05&&(this.facingAngle=Math.atan2(i.y,i.x))}updateCharacter(e,s,i,o,l){if(this.walkingModule&&this.walkingModule.update(this,s,e,l),this.updatePosition(e,l),this.updateFacingDirection(i,o,s),this.heldObject){const c=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*c,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*c,this.heldObject.position.z=this.heldObject.hasVerticalPosition?.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||i,this.aimTarget=o,this.heldObject&&this.throwModule&&o?this.activeTrajectory=this.throwModule.calculateTrajectory(this,o.x,o.y,l):this.activeTrajectory=null}}class it{constructor(t={}){d(this,"enabled",!0);d(this,"angularVelocity",{x:0,y:0,z:0});d(this,"rollResistance",.4);d(this,"visualPhase",0);var e,s,i;this.enabled=t.enabled??!0,this.angularVelocity={x:((e=t.angularVelocity)==null?void 0:e.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((i=t.angularVelocity)==null?void 0:i.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const e=this.angularSpeed;e>.001&&(this.visualPhase=(this.visualPhase+e*t)%(Math.PI*2))}}class vt{constructor(t){d(this,"ctx");this.ctx=t}render(t,e,s,i,o=!1,l,c,a=!1,h){const n=this.ctx,r=n.canvas.width/t.width;n.clearRect(0,0,n.canvas.width,n.canvas.height),this.drawFloorGrid(t,r),this.drawWalls(t,r),a&&h&&this.drawWallEditorHover(t,h,r);const g=[e,...s];g.sort((y,u)=>Math.abs(y.position.z-u.position.z)>.001?y.position.z-u.position.z:Math.abs(y.verticalVelocity-u.verticalVelocity)>.001?y.verticalVelocity-u.verticalVelocity:y.position.y-u.position.y);for(const y of g)y instanceof st?this.drawCharacter(y,s,r):this.drawFreebodyObject(y,g,e,r,y===c);for(const y of g)this.drawObjectShadow(y,t,r);e.activeTrajectory&&this.drawTrajectory(e.activeTrajectory,r),o&&(l&&l!==i&&this.drawHoverGizmo(l,r),i&&this.drawSelectionGizmo(i,o,r))}drawFloorGrid(t,e){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*e,t.height*e),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let i=1;i<t.width;i++)s.beginPath(),s.moveTo(i*e,0),s.lineTo(i*e,t.height*e),s.stroke();for(let i=1;i<t.height;i++)s.beginPath(),s.moveTo(0,i*e),s.lineTo(t.width*e,i*e),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*e-3,t.height*e-3)}drawWalls(t,e){const s=this.ctx;for(const i of t.walls)s.fillStyle="#1e293b",s.fillRect(i.x*e,i.y*e,i.width*e,i.height*e),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(i.x*e,i.y*e,i.width*e,i.height*e)}drawWallEditorHover(t,e,s){if(e.col<0||e.col>=t.cols||e.row<0||e.row>=t.rows)return;const i=this.ctx,o=e.col*t.tileSize*s,l=e.row*t.tileSize*s,c=t.tileSize*s,a=t.hasWall(e.col,e.row);i.save(),a?(i.fillStyle="rgba(239, 68, 68, 0.35)",i.strokeStyle="#ef4444",i.lineWidth=2.5,i.fillRect(o,l,c,c),i.strokeRect(o,l,c,c),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#fca5a5",i.textAlign="center",i.textBaseline="middle",i.fillText("✕ Erase",o+c/2,l+c/2)):(i.fillStyle="rgba(56, 189, 248, 0.3)",i.strokeStyle="#38bdf8",i.lineWidth=2.5,i.fillRect(o,l,c,c),i.strokeRect(o,l,c,c),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#7dd3fc",i.textAlign="center",i.textBaseline="middle",i.fillText("+ Draw",o+c/2,l+c/2)),i.restore()}drawObjectShadow(t,e,s){const i=this.ctx,o=t.position.x*s,l=t.position.y*s,c=t.position.z,a=1+c/e.wallHeight*1.5,h=t.colliderRadius*s*a,n=Math.max(.3,.85-c/(e.wallHeight*7)*.25),r=c>e.wallHeight;if(i.save(),i.beginPath(),t.visualShape==="box"){const g=h*2,y=Math.max(3,4*a);i.roundRect?i.roundRect(o-h,l-h,g,g,y):i.rect(o-h,l-h,g,g)}else i.arc(o,l,h,0,Math.PI*2);r?(i.strokeStyle=`rgba(56, 189, 248, ${n})`,i.lineWidth=2.5):(i.strokeStyle=`rgba(255, 255, 255, ${n})`,i.lineWidth=1.8),c>.01&&i.setLineDash([4,3]),i.stroke(),i.restore()}drawFreebodyObject(t,e,s,i,o=!1){var f,x;const l=this.ctx,c=t.position.x*i,a=t.position.y*i,h=t.hasCollider?t.colliderRadius:((f=t.colliderModule)==null?void 0:f.radius)??.32,n=h*i,r=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled,g=Math.hypot(t.position.x-s.position.x,t.position.y-s.position.y),y=r&&!t.isHeld&&g<=(((x=s.pickupModule)==null?void 0:x.pickupReach)??1.3)+h;if(y){if(l.save(),l.beginPath(),t.visualShape==="box"){const p=(n+5)*2;l.roundRect?l.roundRect(c-n-5,a-n-5,p,p,6):l.rect(c-n-5,a-n-5,p,p)}else l.arc(c,a,n+5,0,Math.PI*2);o?(l.strokeStyle="#38bdf8",l.lineWidth=3,l.setLineDash([]),l.stroke(),l.fillStyle="#38bdf8",l.font="bold 11px sans-serif",l.textAlign="center",l.fillText("GRAB",c,a-n-8)):(l.strokeStyle="rgba(56, 189, 248, 0.45)",l.lineWidth=1.8,l.setLineDash([4,4]),l.stroke()),l.restore()}let u=!1;if(t.isAboveGround)for(const p of e){if(p===t)continue;if(Math.hypot(t.position.x-p.position.x,t.position.y-p.position.y)<t.colliderRadius+p.colliderRadius&&(t.position.z>p.position.z||Math.abs(t.position.z-p.position.z)<=.01&&t.verticalVelocity>p.verticalVelocity)){u=!0;break}}if(l.save(),l.globalAlpha=u?.55:1,t.visualShape==="box"){const p=n*2,M=Math.max(3,n*.16),b=c-n,S=a-n;l.beginPath(),l.roundRect?l.roundRect(b,S,p,p,M):l.rect(b,S,p,p),l.fillStyle=t.color,l.fill(),l.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",l.lineWidth=y?2.5:2,l.stroke();const m=Math.max(3,n*.22);l.beginPath(),l.roundRect?l.roundRect(b+m,S+m,p-m*2,p-m*2,M*.7):l.rect(b+m,S+m,p-m*2,p-m*2),l.strokeStyle="rgba(0, 0, 0, 0.25)",l.lineWidth=1.6,l.stroke(),l.beginPath(),l.moveTo(b+m,S+m),l.lineTo(b+p-m,S+p-m),l.moveTo(b+p-m,S+m),l.lineTo(b+m,S+p-m),l.strokeStyle="rgba(0, 0, 0, 0.16)",l.lineWidth=1.4,l.stroke()}else l.beginPath(),l.arc(c,a,n,0,Math.PI*2),l.fillStyle=t.color,l.fill(),l.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",l.lineWidth=y?2.5:2,l.stroke();this.drawRollIndicator(t,c,a,n),l.restore()}drawCharacter(t,e,s){const i=this.ctx,o=t.position.x*s,l=t.position.y*s,c=t.colliderRadius*s;let a=!1;if(t.isAboveGround)for(const M of e){if(M===t)continue;if(Math.hypot(t.position.x-M.position.x,t.position.y-M.position.y)<t.colliderRadius+M.colliderRadius&&(t.position.z>M.position.z||Math.abs(t.position.z-M.position.z)<=.01&&t.verticalVelocity>M.verticalVelocity)){a=!0;break}}i.save(),i.globalAlpha=a?.55:1,i.beginPath(),i.arc(o,l,c,0,Math.PI*2),i.fillStyle=t.color,i.fill(),i.strokeStyle="#ffffff",i.lineWidth=2.5,i.stroke(),this.drawRollIndicator(t,o,l,c);const h=.52,n=c*.72,r=Math.max(3.5,c*.18),g=t.facingAngle-h,y=t.facingAngle+h,u=o+Math.cos(g)*n,f=l+Math.sin(g)*n,x=o+Math.cos(y)*n,p=l+Math.sin(y)*n;i.fillStyle="#000000",i.beginPath(),i.arc(u,f,r,0,Math.PI*2),i.arc(x,p,r,0,Math.PI*2),i.fill(),t.heldObject&&(i.strokeStyle="rgba(255, 255, 255, 0.6)",i.setLineDash([3,3]),i.lineWidth=1.5,i.beginPath(),i.moveTo(o,l),i.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),i.stroke(),i.setLineDash([])),i.restore()}drawRollIndicator(t,e,s,i){if(!t.rollModule||!t.rollModule.enabled)return;const o=t.rollModule,l=o.angularVelocity.x,c=o.angularVelocity.y,a=o.angularVelocity.z,h=Math.hypot(l,c,a);if(h<.02)return;const n=this.ctx,g=Math.hypot(l,c)<.05*h;if(n.save(),g){const y=i*.45,u=i*.78;n.beginPath(),n.arc(e,s,y,0,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.45)",n.lineWidth=1.5,n.setLineDash([]),n.stroke(),n.beginPath(),n.arc(e,s,u,0,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2,n.setLineDash([4,4]),n.lineDashOffset=-o.visualPhase*u*Math.sign(a||1),n.stroke()}else{const y=Math.atan2(-l,c),u=i*.82,f=Math.abs(a)/h,x=u*Math.pow(f,.85);n.translate(e,s),n.rotate(y);const p=a!==0?Math.sign(a):1;x<.5?(n.beginPath(),n.moveTo(-u,0),n.lineTo(u,0),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2.2,n.setLineDash([4,4]),n.lineDashOffset=-o.visualPhase*u,n.stroke()):(n.beginPath(),n.ellipse(0,0,u,x,0,0,Math.PI),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2.2,n.setLineDash([4,4]),n.lineDashOffset=-o.visualPhase*u*p,n.stroke(),n.beginPath(),n.ellipse(0,0,u,x,0,Math.PI,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.25)",n.lineWidth=1.8,n.setLineDash([4,4]),n.lineDashOffset=-o.visualPhase*u*p,n.stroke())}n.restore()}drawTrajectory(t,e){const s=this.ctx,i=t.points;if(i.length<2)return;s.save();for(let l=0;l<i.length-1;l++){const c=i[l],a=i[l+1];s.beginPath(),s.moveTo(c.x*e,c.y*e),s.lineTo(a.x*e,a.y*e),c.couldClearWall||a.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const o=i[i.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const l=8;s.beginPath(),s.moveTo(o.x*e-l,o.y*e-l),s.lineTo(o.x*e+l,o.y*e+l),s.moveTo(o.x*e+l,o.y*e-l),s.lineTo(o.x*e-l,o.y*e+l),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,e){var a;const s=this.ctx,i=t.position.x*e,o=t.position.y*e,c=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*e;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(i,o,c,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,e,s){var g;const i=this.ctx,o=t.position.x*s,l=t.position.y*s,h=(t.hasCollider?t.colliderRadius:((g=t.colliderModule)==null?void 0:g.radius)??.32)*s+6,n=Math.max(6,h*.4),r=e?"#fbbf24":"#38bdf8";if(i.save(),i.strokeStyle=r,i.lineWidth=2,i.setLineDash([]),i.beginPath(),i.moveTo(o-h,l-h+n),i.lineTo(o-h,l-h),i.lineTo(o-h+n,l-h),i.stroke(),i.beginPath(),i.moveTo(o+h-n,l-h),i.lineTo(o+h,l-h),i.lineTo(o+h,l-h+n),i.stroke(),i.beginPath(),i.moveTo(o+h,l+h-n),i.lineTo(o+h,l+h),i.lineTo(o+h-n,l+h),i.stroke(),i.beginPath(),i.moveTo(o-h+n,l+h),i.lineTo(o-h,l+h),i.lineTo(o-h,l+h-n),i.stroke(),e){const y=`${t.name} (${t.mass.toFixed(1)}kg)`;i.font="bold 10px 'Segoe UI', system-ui, sans-serif";const f=i.measureText(y).width+12,x=16,p=o-f/2,M=l-h-x-4;i.fillStyle="rgba(15, 23, 42, 0.85)",i.strokeStyle=r,i.lineWidth=1,i.beginPath(),i.roundRect(p,M,f,x,4),i.fill(),i.stroke(),i.fillStyle=r,i.textAlign="center",i.textBaseline="middle",i.fillText(y,o,M+x/2)}i.restore()}}class gt{constructor(t,e){d(this,"canvas");d(this,"arena");d(this,"keysPressed",new Set);d(this,"mousePos",{x:0,y:0});d(this,"isMouseDown",!1);d(this,"isRightMouseDown",!1);d(this,"hoverWallTile",null);d(this,"movementVector",{x:0,y:0});d(this,"justPickedUp",!1);d(this,"isThrowingPress",!1);d(this,"hoverEntity",null);d(this,"selectedCanvasEntity",null);d(this,"draggedEntity",null);d(this,"dragOffset",{x:0,y:0});d(this,"handleClick");d(this,"onMouseDown");d(this,"onRightMouseDown");d(this,"onMouseUp");d(this,"onRightClick");d(this,"onDropAttempt");d(this,"onMouseMove");this.canvas=t,this.arena=e,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateTouchPos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateMovementVector(){let t=0,e=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(e-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(e+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,e);s>0?(this.movementVector.x=t/s,this.movementVector.y=e/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,e,s,i){i&&(this.selectedCanvasEntity=i.selectedEntity);const o=(a,h,n=.35)=>{var y;for(let u=s.length-1;u>=0;u--){const f=s[u],x=f.hasCollider?f.colliderRadius:((y=f.colliderModule)==null?void 0:y.radius)??.32;if(Math.hypot(f.position.x-a,f.position.y-h)<=x+n)return f}const r=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-h)<=r+n?t:null},l=(a,h)=>{var r;if(a<0||a>=e.cols||h<0||h>=e.rows)return;if(e.setWallTile(a,h,!0)){const g={id:`wall-${a}-${h}`,x:a*e.tileSize,y:h*e.tileSize,width:e.tileSize,height:e.tileSize,wallHeight:e.wallHeight},y=[t,...s];for(const u of y){const f=u.hasCollider?u.colliderRadius:((r=u.colliderModule)==null?void 0:r.radius)??.32;e.testWallOverlap(u.position.x,u.position.y,f,g)&&u.position.z<e.wallHeight&&(u.hasVerticalPosition||(u.verticalPositionModule?u.verticalPositionModule.enabled=!0:u.verticalPositionModule=new tt({z:e.wallHeight,hasVerticalVelocity:!0})),u.position.z=e.wallHeight,u.supportingSurfaceHeight=e.wallHeight,u.verticalVelocity=0)}}},c=(a,h)=>{a<0||a>=e.cols||h<0||h>=e.rows||e.setWallTile(a,h,!1)};this.onMouseDown=(a,h)=>{if(i!=null&&i.isEditMode){if(i.editTool==="walls"){const r=Math.floor(a/e.tileSize),g=Math.floor(h/e.tileSize);l(r,g);return}const n=o(a,h,.35);n?(this.selectedCanvasEntity=n,i.setSelectedEntity(n),this.draggedEntity=n,this.dragOffset.x=n.position.x-a,this.dragOffset.y=n.position.y-h,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,h)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"){const n=Math.floor(a/e.tileSize),r=Math.floor(h/e.tileSize);c(n,r)}},this.onMouseMove=(a,h)=>{var g;const n=Math.floor(a/e.tileSize),r=Math.floor(h/e.tileSize);if(n>=0&&n<e.cols&&r>=0&&r<e.rows?this.hoverWallTile={col:n,row:r}:this.hoverWallTile=null,i!=null&&i.isEditMode){if(i.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?l(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&c(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const y=a+this.dragOffset.x,u=h+this.dragOffset.y,f=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((g=this.draggedEntity.colliderModule)==null?void 0:g.radius)??.32;this.draggedEntity.position.x=Math.max(f,Math.min(e.width-f,y)),this.draggedEntity.position.y=Math.max(f,Math.min(e.height-f,u)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const y=o(a,h,.3);this.hoverEntity=y,this.canvas.style.cursor=y?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,h)=>{if(this.draggedEntity&&(this.draggedEntity=null),i!=null&&i.isEditMode)if(i.editTool==="walls")this.canvas.style.cursor="cell";else{const n=o(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=n,this.canvas.style.cursor=n?"grab":"crosshair"}},this.handleClick=(a,h)=>{if(!(i!=null&&i.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,h,e),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const n=t.pickupModule.findTargetObject(t,a,h,s);n&&(t.pickupModule.pickup(t,n),this.justPickedUp=!0)}}},this.onRightClick=(a,h)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"||!i)return;const n=o(a,h,.4);n&&(this.selectedCanvasEntity=n,i.setSelectedEntity(n))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s);a&&t.pickupModule.pickup(t,a)}}}}class bt{constructor(t){d(this,"container");d(this,"character");d(this,"arena");d(this,"objects");d(this,"onSpawnObject");d(this,"onDeleteObject");d(this,"onClearObjects");d(this,"selectedEntity");d(this,"isEditMode",!1);d(this,"editTool","entities");d(this,"onSelectionChange");d(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});d(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});d(this,"inspectorEl");d(this,"entitySelectorEl");d(this,"characterSpecificControlsEl");d(this,"objectSpecificControlsEl");d(this,"modePlayBtn");d(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var e;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(e=this.onSelectionChange)==null||e.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const e=this.container.querySelector("#edit-submode-container");e&&(e.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const e=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");e&&s&&(e.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const e=this.container.querySelector("#edit-hint-label");e&&(this.isEditMode?this.editTool==="walls"?e.textContent="Left-drag: Draw | Right-drag: Erase":e.textContent="Click & drag object in arena":e.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let e=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const i of this.objects){const o=i.id===t?"selected":"",l=i.visualShape==="box"?"📦":"⚪",c=i.hasMass?`${i.mass.toFixed(1)}kg`:"Massless";e+=`<option value="${i.id}" ${o}>${l} ${i.name} (${c})</option>`}this.entitySelectorEl.innerHTML=e;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,e,s,i,o,l,c,a,h,n,r,g,y,u,f,x,p,M,b,S,m,w,V,C,P,k,R,z,D,B,A,L,W,T,$,v,F,q,G,j,H,I,O,X,Q,Y,Z;this.container.innerHTML=`
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
              <button id="toggle-mod-friction" class="btn-toggle ${(o=this.selectedEntity.frictionModule)!=null&&o.enabled?"active":""}">
                ${(l=this.selectedEntity.frictionModule)!=null&&l.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-friction-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((c=this.selectedEntity.frictionModule)!=null&&c.enabled)?"block":"none"};">
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
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((x=this.selectedEntity.bounceModule)!=null&&x.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(p=this.selectedEntity.bounceModule)!=null&&p.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((M=this.selectedEntity.bounceModule)==null?void 0:M.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((b=this.selectedEntity.bounceModule)==null?void 0:b.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(S=this.selectedEntity.bounceModule)!=null&&S.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(m=this.selectedEntity.bounceModule)!=null&&m.enabled&&((w=this.selectedEntity.bounceModule)!=null&&w.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${(V=this.selectedEntity.bounceModule)!=null&&V.enabled?"none":"block"};">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(C=this.selectedEntity.rollModule)!=null&&C.enabled?"active":""}">
                ${(P=this.selectedEntity.rollModule)!=null&&P.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(k=this.selectedEntity.rollModule)!=null&&k.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(R=this.selectedEntity.rollModule)!=null&&R.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((z=this.selectedEntity.rollModule)==null?void 0:z.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((D=this.selectedEntity.rollModule)==null?void 0:D.rollResistance)??.4}">
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
                <button id="toggle-walk" class="btn-toggle ${(B=this.character.walkingModule)!=null&&B.enabled?"active":""}">
                  ${(A=this.character.walkingModule)!=null&&A.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((L=this.character.walkingModule)!=null&&L.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="group-mod-walking" style="display: ${(W=this.character.walkingModule)!=null&&W.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((T=this.character.walkingModule)==null?void 0:T.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${(($=this.character.walkingModule)==null?void 0:$.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((v=this.character.walkingModule)==null?void 0:v.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((F=this.character.walkingModule)==null?void 0:F.maxWalkSpeed)??5.2}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Character Strength</span>
                    <span id="val-strength">${(this.character.strength??1).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-strength" min="0.3" max="4.0" step="0.1" value="${this.character.strength??1}">
                </div>
              </div>
            </div>

            <!-- Pickup Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>✋ Pickup Ability</label>
                <button id="toggle-pickup" class="btn-toggle ${(q=this.character.pickupModule)!=null&&q.enabled?"active":""}">
                  ${(G=this.character.pickupModule)!=null&&G.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(j=this.character.pickupModule)!=null&&j.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(((H=this.character.pickupModule)==null?void 0:H.pickupReach)??1.3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${((I=this.character.pickupModule)==null?void 0:I.pickupReach)??1.3}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(O=this.character.throwModule)!=null&&O.enabled?"active":""}">
                  ${(X=this.character.throwModule)!=null&&X.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(Q=this.character.throwModule)!=null&&Q.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((Y=this.character.throwModule)==null?void 0:Y.baseThrowForce)??7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((Z=this.character.throwModule)==null?void 0:Z.baseThrowForce)??7.6}">
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var v,F,q,G,j,H,I;const t=this.selectedEntity,e=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=e?"none":"flex");const i=this.container.querySelector("#toggle-entity-shape");i&&(t.visualShape==="box"?(i.textContent="Box 📦",i.classList.add("active")):(i.textContent="Circle ⚪",i.classList.remove("active")));const o=this.container.querySelector("#toggle-mod-collider"),l=this.container.querySelector("#group-mod-collider"),c=this.container.querySelector("#note-mod-collider");o&&(o.textContent=t.hasCollider?"Attached":"Detached",o.classList.toggle("active",t.hasCollider)),l&&(l.style.display=t.hasCollider?"block":"none"),c&&(c.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((v=t.colliderModule)==null?void 0:v.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),h=this.container.querySelector("#group-mod-mass"),n=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),n&&(n.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((F=t.massModule)==null?void 0:F.mass)??1,1);const r=this.container.querySelector("#toggle-mod-friction"),g=this.container.querySelector("#group-mod-friction"),y=this.container.querySelector("#note-mod-friction"),u=this.container.querySelector("#warn-friction-mass"),f=!!(t.frictionModule&&t.frictionModule.enabled);r&&(r.textContent=f?"Attached":"Detached",r.classList.toggle("active",f)),g&&(g.style.display=f?"flex":"none"),y&&(y.style.display=f?"none":"block"),u&&(u.style.display=!t.hasMass&&f?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((q=t.frictionModule)==null?void 0:q.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((G=t.frictionModule)==null?void 0:G.dynamicFrictionMod)??1,2);const x=this.container.querySelector("#toggle-mod-bounce"),p=this.container.querySelector("#group-mod-bounce"),M=this.container.querySelector("#note-mod-bounce"),b=this.container.querySelector("#warn-bounce-mass"),S=!!(t.bounceModule&&t.bounceModule.enabled);x&&(x.textContent=S?"Attached":"Detached",x.classList.toggle("active",S)),p&&(p.style.display=S?"block":"none"),M&&(M.style.display=S?"none":"block"),b&&(b.style.display=!t.hasMass&&S?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const m=this.container.querySelector("#check-mod-vert-bounce"),w=this.container.querySelector("#warn-bounce-vert-vel");if(m&&(m.checked=!!((H=t.bounceModule)!=null&&H.verticalBounce)),w){const O=!!(S&&((I=t.bounceModule)!=null&&I.verticalBounce)&&!t.hasVerticalVelocity);w.style.display=O?"block":"none"}const V=this.container.querySelector("#toggle-mod-vert-pos"),C=this.container.querySelector("#group-mod-vert-pos"),P=this.container.querySelector("#note-mod-vert-pos"),k=t.hasVerticalPosition;V&&(V.textContent=k?"Attached":"Detached",V.classList.toggle("active",k)),C&&(C.style.display=k?"block":"none"),P&&(P.style.display=k?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const R=this.container.querySelector("#toggle-mod-vert-vel"),z=this.container.querySelector("#group-mod-vert-vel"),D=t.hasVerticalVelocity;R&&(R.textContent=D?"Enabled":"Disabled",R.classList.toggle("active",D)),z&&(z.style.display=D?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const B=this.container.querySelector("#toggle-mod-gravity"),A=this.container.querySelector("#note-mod-gravity");B&&(B.textContent=t.hasGravity?"Attached":"Detached",B.classList.toggle("active",t.hasGravity)),A&&(A.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const L=this.container.querySelector("#toggle-mod-roll"),W=this.container.querySelector("#group-mod-roll"),T=this.container.querySelector("#note-roll-friction"),$=!!(t.rollModule&&t.rollModule.enabled);if(L&&(L.textContent=$?"Attached":"Detached",L.classList.toggle("active",$)),W&&(W.style.display=$?"block":"none"),T&&(T.style.display=$&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),e){const O=this.container.querySelector("#toggle-walk"),X=this.container.querySelector("#group-mod-walking"),Q=this.container.querySelector("#warn-walk-friction"),Y=!!(this.character.walkingModule&&this.character.walkingModule.enabled);O&&(O.textContent=Y?"Attached":"Detached",O.classList.toggle("active",Y)),X&&(X.style.display=Y?"flex":"none"),Q&&(Q.style.display=Y&&!this.character.hasFriction?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1)),this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const Z=this.container.querySelector("#toggle-pickup"),nt=this.container.querySelector("#group-mod-pickup"),ot=!!(this.character.pickupModule&&this.character.pickupModule.enabled);Z&&(Z.textContent=ot?"Attached":"Detached",Z.classList.toggle("active",ot)),nt&&(nt.style.display=ot?"block":"none"),this.character.pickupModule&&this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1);const lt=this.container.querySelector("#toggle-throw"),ct=this.container.querySelector("#group-mod-throw"),at=!!(this.character.throwModule&&this.character.throwModule.enabled);lt&&(lt.textContent=at?"Attached":"Detached",lt.classList.toggle("active",at)),ct&&(ct.style.display=at?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1)}}setSliderVal(t,e,s,i){const o=this.container.querySelector(`#${t}`),l=this.container.querySelector(`#${e}`);o&&(o.value=s.toString()),l&&(l.textContent=i>0?s.toFixed(i):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,e=this.container.querySelector("#creator-name");e&&(e.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const i=this.container.querySelector("#creator-color"),o=this.container.querySelector("#val-creator-color");i&&(i.value=t.color),o&&(o.textContent=t.color);const l=this.container.querySelector("#creator-toggle-collider"),c=this.container.querySelector("#grp-creator-radius");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),c&&(c.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),h=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const n=this.container.querySelector("#creator-toggle-friction"),r=this.container.querySelector("#grp-creator-fric");n&&(n.textContent=t.hasFriction?"Attached":"Detached",n.classList.toggle("active",t.hasFriction)),r&&(r.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const g=this.container.querySelector("#creator-toggle-bounce"),y=this.container.querySelector("#grp-creator-bounce"),u=this.container.querySelector("#creator-check-vert-bounce"),f=this.container.querySelector("#creator-warn-bounce-vert");g&&(g.textContent=t.hasBounce?"Attached":"Detached",g.classList.toggle("active",t.hasBounce)),y&&(y.style.display=t.hasBounce?"block":"none"),u&&(u.checked=t.verticalBounce),f&&(f.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const x=this.container.querySelector("#creator-toggle-vert-pos"),p=this.container.querySelector("#grp-creator-vert-pos");x&&(x.textContent=t.hasVerticalPosition?"Attached":"Detached",x.classList.toggle("active",t.hasVerticalPosition)),p&&(p.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const M=this.container.querySelector("#creator-toggle-vert-vel");M&&(M.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",M.classList.toggle("active",t.hasVerticalVelocity));const b=this.container.querySelector("#creator-toggle-gravity");b&&(b.textContent=t.hasGravity?"Attached":"Detached",b.classList.toggle("active",t.hasGravity));const S=this.container.querySelector("#creator-toggle-roll"),m=this.container.querySelector("#group-creator-roll-resist");S&&(S.textContent=t.hasRollModule?"Enabled":"Disabled",S.classList.toggle("active",t.hasRollModule)),m&&(m.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var z,D,B,A,L,W,T,$;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(z=this.container.querySelector("#submode-entities"))==null||z.addEventListener("click",()=>{this.setEditTool("entities")}),(D=this.container.querySelector("#submode-walls"))==null||D.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var F;const v=this.entitySelectorEl.value;if(v===this.character.id)this.selectedEntity=this.character;else{const q=this.objects.find(G=>G.id===v);q&&(this.selectedEntity=q)}this.updateSelectorOptions(),this.syncEntitySliders(),(F=this.onSelectionChange)==null||F.call(this,this.selectedEntity)}),(B=this.container.querySelector("#btn-duplicate-entity"))==null||B.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(A=this.container.querySelector("#btn-delete-entity"))==null||A.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const e=this.container.querySelector("#toggle-mod-collider");e==null||e.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new N({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",v=>{this.selectedEntity.colliderRadius=v},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new K({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",v=>{this.selectedEntity.mass=v,this.updateSelectorOptions()},1);const i=this.container.querySelector("#toggle-mod-friction");i==null||i.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new _,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",v=>{this.selectedEntity.staticGroundFrictionMod=v},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",v=>{this.selectedEntity.dynamicGroundFrictionMod=v},2);const o=this.container.querySelector("#toggle-mod-bounce");o==null||o.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new J({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",v=>{this.selectedEntity.bounceMod=v},2);const l=this.container.querySelector("#check-mod-vert-bounce");l==null||l.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=l.checked),this.syncEntitySliders(),this.updateInspector()});const c=this.container.querySelector("#toggle-mod-vert-pos");c==null||c.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new tt({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",v=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=v),this.selectedEntity.position.z=v,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",v=>{this.selectedEntity.verticalVelocity=v},2);const h=this.container.querySelector("#toggle-mod-gravity");h==null||h.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new et,this.syncEntitySliders()});const n=this.container.querySelector("#toggle-mod-roll");n==null||n.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new it({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",v=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=v)},2);const r=this.container.querySelector("#toggle-walk");r==null||r.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new rt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",v=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=v)},0),this.setupSlider("slide-walk-speed","val-walk-speed",v=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=v)},1),this.setupSlider("slide-strength","val-strength",v=>{this.character.strength=v},1);const g=this.container.querySelector("#toggle-pickup");g==null||g.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new dt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",v=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=v)},1);const y=this.container.querySelector("#toggle-throw");y==null||y.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new ht,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",v=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=v)},1),this.setupSlider("slide-gravity","val-gravity",v=>{this.arena.gravity=v},1),this.setupSlider("slide-wall-height","val-wall-height",v=>{this.arena.setStandardWallHeight(v),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",v,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",v=>{this.arena.setStandardWallHeight(v),this.setSliderVal("slide-wall-height","val-wall-height",v,1)},1),(L=this.container.querySelector("#btn-reset-walls"))==null||L.addEventListener("click",()=>{this.arena.resetDefaultWalls()}),(W=this.container.querySelector("#btn-clear-walls"))==null||W.addEventListener("click",()=>{this.arena.clearAllWalls()}),this.setupSlider("slide-friction","val-friction",v=>{this.arena.frictionCoeff=v},1),this.setupSlider("slide-static-thresh","val-static-thresh",v=>{this.arena.staticFrictionThreshold=v},2),this.container.querySelectorAll(".preset-chip").forEach(v=>{v.addEventListener("click",()=>{const F=v.getAttribute("data-preset");F&&this.presets[F]&&(this.creatorState={...this.presets[F]},this.syncCreatorInputs())})});const f=this.container.querySelector("#creator-name");f==null||f.addEventListener("input",()=>{this.creatorState.name=f.value});const x=this.container.querySelector("#creator-toggle-shape");x==null||x.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",x.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",x.classList.toggle("active",this.creatorState.visualShape==="box")});const p=this.container.querySelector("#creator-color"),M=this.container.querySelector("#val-creator-color");p==null||p.addEventListener("input",()=>{this.creatorState.color=p.value,M&&(M.textContent=p.value)});const b=this.container.querySelector("#creator-toggle-collider");b==null||b.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,b.textContent=this.creatorState.hasCollider?"Attached":"Detached",b.classList.toggle("active",this.creatorState.hasCollider);const v=this.container.querySelector("#grp-creator-radius");v&&(v.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",v=>{this.creatorState.colliderRadius=v},2);const S=this.container.querySelector("#creator-toggle-mass");S==null||S.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,S.textContent=this.creatorState.hasMass?"Attached":"Detached",S.classList.toggle("active",this.creatorState.hasMass);const v=this.container.querySelector("#grp-creator-mass");v&&(v.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",v=>{this.creatorState.mass=v},1);const m=this.container.querySelector("#creator-toggle-friction");m==null||m.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,m.textContent=this.creatorState.hasFriction?"Attached":"Detached",m.classList.toggle("active",this.creatorState.hasFriction);const v=this.container.querySelector("#grp-creator-fric");v&&(v.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",v=>{this.creatorState.dynamicFrictionMod=v},2);const w=this.container.querySelector("#creator-toggle-bounce");w==null||w.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,w.textContent=this.creatorState.hasBounce?"Attached":"Detached",w.classList.toggle("active",this.creatorState.hasBounce);const v=this.container.querySelector("#grp-creator-bounce");v&&(v.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",v=>{this.creatorState.bounceMod=v},2);const V=this.container.querySelector("#creator-check-vert-bounce");V==null||V.addEventListener("change",()=>{this.creatorState.verticalBounce=V.checked,this.syncCreatorInputs()});const C=this.container.querySelector("#creator-toggle-vert-pos");C==null||C.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",v=>{this.creatorState.elevation=v},2);const P=this.container.querySelector("#creator-toggle-vert-vel");P==null||P.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const k=this.container.querySelector("#creator-toggle-gravity");k==null||k.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,k.textContent=this.creatorState.hasGravity?"Attached":"Detached",k.classList.toggle("active",this.creatorState.hasGravity)});const R=this.container.querySelector("#creator-toggle-roll");R==null||R.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,R.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",R.classList.toggle("active",this.creatorState.hasRollModule);const v=this.container.querySelector("#group-creator-roll-resist");v&&(v.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",v=>{this.creatorState.rollResistance=v},2),(T=this.container.querySelector("#btn-spawn-configured"))==null||T.addEventListener("click",()=>{this.spawnFromCreator()}),($=this.container.querySelector("#btn-clear-entities"))==null||$.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,e=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),i=new U({name:t.name||"Custom Object",position:{x:e,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new N({radius:t.colliderRadius}):null,massModule:t.hasMass?new K({mass:t.mass}):null,frictionModule:t.hasFriction?new _({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new J({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new tt({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new et:null,rollModule:t.hasRollModule?new it({rollResistance:t.rollResistance}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,e=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),i=new U({name:`${t.name} (Copy)`,position:{x:e,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new N({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new K({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new _({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new J({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new tt({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new et({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new it({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,e,s,i=0){const o=this.container.querySelector(`#${t}`),l=this.container.querySelector(`#${e}`);!o||!l||o.addEventListener("input",()=>{const c=parseFloat(o.value);l.textContent=i>0?c.toFixed(i):Math.round(c).toString(),s(c)})}updateInspector(){const t=this.selectedEntity,e=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}}class ft{constructor(t){d(this,"arena");d(this,"character");d(this,"objects");d(this,"renderer");d(this,"inputManager");d(this,"devPanel");d(this,"isRunning",!1);d(this,"lastTime",0);d(this,"accumulator",0);d(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let e=(t-this.lastTime)/1e3;for(this.lastTime=t,e>.2&&(e=.2),this.accumulator+=e;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects));const i=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,i,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(o=>this.tick(o))}updatePhysics(t){const e=this.inputManager;e.draggedEntity!==this.character?this.character.updateCharacter(t,e.movementVector,e.isMouseDown&&!this.devPanel.isEditMode,e.mousePos,this.arena):(this.character.velocity.x=0,this.character.velocity.y=0);for(const i of this.objects)e.draggedEntity!==i&&i.updatePosition(t,this.arena);const s=e.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const i=this.character.pickupModule.findTargetObject(this.character,e.mousePos.x,e.mousePos.y,this.objects);i&&(this.character.pickupModule.pickup(this.character,i),e.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],e=this.inputManager,s=3;for(let i=0;i<s;i++)for(let o=0;o<t.length;o++)for(let l=o+1;l<t.length;l++){const c=t[o],a=t[l];if(c.isHeld||a.isHeld||c===e.draggedEntity||a===e.draggedEntity||!c.hasCollider||!a.hasCollider)continue;const h=this.arena.wallHeight-.15,n=c.position.z>=h||c.supportingSurfaceHeight>=h,r=a.position.z>=h||a.supportingSurfaceHeight>=h;if(n!==r)continue;const g=a.position.x-c.position.x,y=a.position.y-c.position.y,u=g*g+y*y,f=c.colliderRadius+a.colliderRadius;if(u<f*f&&u>1e-6){const x=Math.sqrt(u),p=f-x,M=g/x,b=y/x,S=a.velocity.x-c.velocity.x,m=a.velocity.y-c.velocity.y,w=S*M+m*b,V=!c.hasMass,C=!a.hasMass;if(V&&C){if(c.position.x-=M*p*.5,c.position.y-=b*p*.5,a.position.x+=M*p*.5,a.position.y+=b*p*.5,w<0){const B=-w*.5;c.velocity.x-=B*M,c.velocity.y-=B*b,a.velocity.x+=B*M,a.velocity.y+=B*b}continue}if(!V&&C){this.isEntityPinnedAgainstWall(a,M,b)?(c.position.x-=M*p,c.position.y-=b*p,c.velocity.x=0,c.velocity.y=0):(a.position.x+=M*p,a.position.y+=b*p,w<0&&(a.velocity.x+=(c.velocity.x-a.velocity.x)*Math.abs(M),a.velocity.y+=(c.velocity.y-a.velocity.y)*Math.abs(b)));continue}if(V&&!C){this.isEntityPinnedAgainstWall(c,-M,-b)?(a.position.x+=M*p,a.position.y+=b*p,a.velocity.x=0,a.velocity.y=0):(c.position.x-=M*p,c.position.y-=b*p,w<0&&(c.velocity.x+=(a.velocity.x-c.velocity.x)*Math.abs(M),c.velocity.y+=(a.velocity.y-c.velocity.y)*Math.abs(b)));continue}const P=1/c.mass,k=1/a.mass,R=P+k;if(R<=1e-4)continue;const z=P/R,D=k/R;if(c.position.x-=M*p*z,c.position.y-=b*p*z,a.position.x+=M*p*D,a.position.y+=b*p*D,w<0){const B=c instanceof st&&c.isActivelyWalking||a instanceof st&&a.isActivelyWalking,A=c.hasBounce&&a.hasBounce,L=c.isCharacter||!c.hasBounce?0:c.bounceMod??0,W=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,$=-(1+(B||!A?0:Math.max(0,Math.min(.98,Math.max(L,W)))))*w/R;c.velocity.x-=$*P*M,c.velocity.y-=$*P*b,a.velocity.x+=$*k*M,a.velocity.y+=$*k*b;const v=-b,F=M,q=S*v+m*F;if(Math.abs(q)>.001){const G=.35*Math.sqrt(c.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),j=.4,H=Math.abs(q)/(R*(1+1/j)),I=G*Math.abs($),O=Math.min(H,I)*Math.sign(q);if(c.velocity.x+=O*P*v,c.velocity.y+=O*P*F,a.velocity.x-=O*k*v,a.velocity.y-=O*k*F,c.rollModule&&c.rollModule.enabled){const X=O/(j*c.mass*c.colliderRadius);c.rollModule.angularVelocity.z+=X,c.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,c.rollModule.angularVelocity.z)),c.isRestingOnSurface&&(c.rollModule.angularVelocity.y=c.velocity.x/c.colliderRadius,c.rollModule.angularVelocity.x=-c.velocity.y/c.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const X=O/(j*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=X,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,e,s){const i=t.colliderRadius>0?t.colliderRadius:.3,o=.05;if(e>.3&&t.position.x>=this.arena.width-i-o||e<-.3&&t.position.x<=i+o||s>.3&&t.position.y>=this.arena.height-i-o||s<-.3&&t.position.y<=i+o)return!0;for(const l of this.arena.walls)if(t.position.z<l.wallHeight-.05){const c=t.position.x+e*o,a=t.position.y+s*o,h=Math.max(l.x,Math.min(c,l.x+l.width)),n=Math.max(l.y,Math.min(a,l.y+l.height)),r=c-h,g=a-n;if(r*r+g*g<i*i)return!0}return!1}}function Mt(){const E=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!E||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const e=E.getContext("2d");if(!e){console.error("Failed to acquire 2D canvas context");return}const s=new pt(20,14,1);E.width=1e3,E.height=700;const i=new st({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),o=[new U({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new U({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new U({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new U({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new it({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})],l=new vt(e),c=new bt({container:t,character:i,arena:s,objects:o,onSpawnObject:n=>{o.push(n),c.updateSelectorOptions()},onDeleteObject:n=>{const r=o.indexOf(n);r!==-1&&o.splice(r,1),c.updateSelectorOptions()},onClearObjects:()=>{i.heldObject&&(i.heldObject.isHeld=!1,i.heldObject.heldBy=null,i.heldObject=null),o.length=0,c.updateSelectorOptions()}}),a=new gt(E,s);a.handleInteractions(i,s,o,c),c.onSelectionChange=n=>{a.selectedCanvasEntity=n},new ft({arena:s,character:i,objects:o,renderer:l,inputManager:a,devPanel:c}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",Mt);

var gt=Object.defineProperty;var bt=(E,t,e)=>t in E?gt(E,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):E[t]=e;var r=(E,t,e)=>bt(E,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const l of i)if(l.type==="childList")for(const o of l.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function e(i){const l={};return i.integrity&&(l.integrity=i.integrity),i.referrerPolicy&&(l.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?l.credentials="include":i.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(i){if(i.ep)return;i.ep=!0;const l=e(i);fetch(i.href,l)}})();class ft{constructor(t=20,e=14,s=1){r(this,"width");r(this,"height");r(this,"tileSize");r(this,"cols");r(this,"rows");r(this,"wallHeight");r(this,"gravity");r(this,"frictionCoeff");r(this,"staticFrictionThreshold");r(this,"tileGrid");r(this,"walls",[]);this.width=t,this.height=e,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(e/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.setupDefaultTileMap(),this.rebuildWalls()}setupDefaultTileMap(){for(let e=1;e<=4;e++)this.tileGrid[e][10]=1;for(let e=8;e<=12;e++)this.tileGrid[e][10]=1;this.tileGrid[4][4]=1,this.tileGrid[5][4]=1,this.tileGrid[4][5]=1,this.tileGrid[5][5]=1,this.tileGrid[7][15]=1,this.tileGrid[8][15]=1,this.tileGrid[7][16]=1,this.tileGrid[8][16]=1}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]===1&&this.walls.push({id:`wall-${e}-${t}`,x:e*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}setWallTile(t,e,s){if(t<0||t>=this.cols||e<0||e>=this.rows)return!1;const i=s?1:0;return this.tileGrid[e][t]===i?!1:(this.tileGrid[e][t]=i,this.rebuildWalls(),!0)}hasWall(t,e){return t<0||t>=this.cols||e<0||e>=this.rows?!1:this.tileGrid[e][t]===1}clearAllWalls(){for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]=0;this.rebuildWalls()}resetDefaultWalls(){for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]=0;this.setupDefaultTileMap(),this.rebuildWalls()}getWallAt(t,e){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&e>=s.y&&e<=s.y+s.height)return s;return null}testWallOverlap(t,e,s,i){const l=Math.max(i.x,Math.min(t,i.x+i.width)),o=Math.max(i.y,Math.min(e,i.y+i.height)),c=t-l,a=e-o;return c*c+a*a<s*s}getSupportingWall(t,e,s=0){if(s<=0)return this.getWallAt(t,e);for(const i of this.walls)if(this.testWallOverlap(t,e,s,i))return i;return null}getSupportingSurfaceHeight(t,e,s=0){const i=this.getSupportingWall(t,e,s);return i?i.wallHeight:0}}class J{constructor(t={}){r(this,"radius");r(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class Q{constructor(t={}){r(this,"mass");r(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class tt{constructor(t={}){r(this,"staticFrictionMod");r(this,"dynamicFrictionMod");r(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class et{constructor(t={}){r(this,"bounceMod");r(this,"verticalBounce");r(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class at{constructor(t={}){r(this,"enabled");this.enabled=t.enabled??!0}}class lt{constructor(t={}){r(this,"z");r(this,"hasVerticalVelocity");r(this,"verticalVelocity");r(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}class U{constructor(t={}){r(this,"id");r(this,"name");r(this,"position");r(this,"velocity");r(this,"color");r(this,"isHeld");r(this,"heldBy");r(this,"lastThrower",null);r(this,"isCharacter",!1);r(this,"isClimbing",!1);r(this,"visualShape","circle");r(this,"colliderModule",null);r(this,"massModule",null);r(this,"frictionModule",null);r(this,"bounceModule",null);r(this,"verticalPositionModule",null);r(this,"gravityModule",null);r(this,"rollModule",null);r(this,"supportingSurfaceHeight",0);var e,s,i,l,o;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((e=t.position)==null?void 0:e.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((i=t.position)==null?void 0:i.z)??0},this.velocity={x:((l=t.velocity)==null?void 0:l.x)??0,y:((o=t.velocity)==null?void 0:o.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new J({radius:t.colliderRadius}):new J({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new Q({mass:t.mass}):new Q({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new tt({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new et({bounceMod:t.bounceMod}):new et({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new lt({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new at,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new J({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new Q({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new tt({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new tt({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new et({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.95||this.supportingSurfaceHeight>=.95)}updatePosition(t,e){var a,h;if(this.isHeld)return;if(this.lastThrower){const n=this.lastThrower.hasCollider?this.lastThrower.colliderRadius:.44,d=(((a=this.lastThrower.pickupModule)==null?void 0:a.pickupReach)??1.3)+this.colliderRadius+n;(Math.hypot(this.position.x-this.lastThrower.position.x,this.position.y-this.lastThrower.position.y)>d||this.isRestingOnSurface)&&(this.lastThrower=null)}this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0,i=null;if(this.hasCollider&&this.hasVerticalPosition&&(i=this.position.z>=e.wallHeight-.15||this.supportingSurfaceHeight>.01&&this.position.z>=e.wallHeight-.35?e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null,s=i?i.wallHeight:0),this.isClimbing&&(s=Math.max(s,this.position.z),this.verticalVelocity=0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=e.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const n=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const d=this.rollModule,y=this.colliderRadius>0?this.colliderRadius:.3,v=.4,u=this.bounceMod,M=(1+u)*this.mass*n,m=e.frictionCoeff*this.dynamicGroundFrictionMod*.05,p=this.velocity.x-d.angularVelocity.y*y,b=this.velocity.y+d.angularVelocity.x*y,f=Math.hypot(p,b);if(f>.001&&m>0){const x=m*M,k=f*this.mass/(1+1/v),w=Math.min(k,x),F=p/f*w,C=b/f*w;this.velocity.x-=F/this.mass,this.velocity.y-=C/this.mass,d.angularVelocity.y+=F/(v*this.mass*y),d.angularVelocity.x-=C/(v*this.mass*y)}const S=Math.max(.65,1-(1-u)*.35);d.angularVelocity.x*=S,d.angularVelocity.y*=S,d.angularVelocity.z*=S}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((h=this.walkingModule)==null?void 0:h.enabled)))if(this.rollModule&&this.rollModule.enabled){const d=this.rollModule,y=this.colliderRadius>0?this.colliderRadius:.3,v=e.frictionCoeff*this.dynamicGroundFrictionMod,u=.4,M=this.velocity.x-d.angularVelocity.y*y,m=this.velocity.y+d.angularVelocity.x*y,p=Math.hypot(M,m);if(v>0&&p>.001){const f=v*(1+1/u)*t;if(p<=f){const S=this.velocity.x+u*d.angularVelocity.y*y,x=this.velocity.y-u*d.angularVelocity.x*y,k=S/(1+u),w=x/(1+u);this.velocity.x=k,this.velocity.y=w,d.angularVelocity.y=k/y,d.angularVelocity.x=-w/y}else{const S=M/p*v*t,x=m/p*v*t;this.velocity.x-=S,this.velocity.y-=x,d.angularVelocity.y+=S/(u*y),d.angularVelocity.x-=x/(u*y)}}const b=Math.hypot(this.velocity.x,this.velocity.y);if(b>0){if(d.rollResistance>0){const f=d.rollResistance*t,S=Math.max(0,b-f);if(S<.005)this.velocity.x=0,this.velocity.y=0,d.angularVelocity.x=0,d.angularVelocity.y=0;else{const x=S/b;this.velocity.x*=x,this.velocity.y*=x,d.angularVelocity.x*=x,d.angularVelocity.y*=x}}}else{const f=Math.hypot(d.angularVelocity.x,d.angularVelocity.y);if(f>0&&v>0){const S=v/(u*y)*t,x=Math.max(0,f-S),k=f>0?x/f:0;d.angularVelocity.x*=k,d.angularVelocity.y*=k}}if(Math.abs(d.angularVelocity.z)>.001&&d.rollResistance>0){const f=d.rollResistance/(u*y)*t,S=Math.sign(d.angularVelocity.z),x=Math.abs(d.angularVelocity.z);d.angularVelocity.z=x<=f?0:S*(x-f)}d.updateVisualPhase(t)}else{const d=Math.hypot(this.velocity.x,this.velocity.y);if(d>0){const y=e.staticFrictionThreshold*this.staticGroundFrictionMod;if(d<y)this.velocity.x=0,this.velocity.y=0;else{const v=e.frictionCoeff*this.dynamicGroundFrictionMod*t,M=Math.max(0,d-v)/d;this.velocity.x*=M,this.velocity.y*=M}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);if(this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t,this.hasCollider){const n=this.colliderRadius,d=n,y=e.width-n,v=n,u=e.height-n,M=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;if(this.position.x<d?(this.position.x=d,this.resolveWallImpact(1,0,M)):this.position.x>y&&(this.position.x=y,this.resolveWallImpact(-1,0,M)),this.position.y<v?(this.position.y=v,this.resolveWallImpact(0,1,M)):this.position.y>u&&(this.position.y=u,this.resolveWallImpact(0,-1,M)),!i)for(const m of e.walls)this.position.z<m.wallHeight-.05&&this.resolveWallCollision(m)}const o=16,c=Math.hypot(this.velocity.x,this.velocity.y);if(c>o){const n=o/c;this.velocity.x*=n,this.velocity.y*=n}if(this.rollModule&&this.rollModule.enabled){const d=this.rollModule.angularSpeed;if(d>35){const y=35/d;this.rollModule.angularVelocity.x*=y,this.rollModule.angularVelocity.y*=y,this.rollModule.angularVelocity.z*=y}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}resolveWallImpact(t,e,s){this.lastThrower=null;const i=this.velocity.x*t+this.velocity.y*e;if(i>=0)return;const l=i;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*l*t,this.velocity.y-=(1+s)*l*e):(this.velocity.x-=l*t,this.velocity.y-=l*e),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const o=this.rollModule,c=this.colliderRadius>0?this.colliderRadius:.3,a=.4,h=.35,n=-e,d=t,y=this.velocity.x*n+this.velocity.y*d,v=-(1+s)*this.mass*l,u=y-o.angularVelocity.z*c,M=Math.abs(u)*this.mass/(1+1/a),m=h*v,p=Math.min(M,m),b=-Math.sign(u)*p,f=y,S=f+b/this.mass,x=Math.abs(S)<=Math.abs(f)+.01?S-f:-f*.1;this.velocity.x+=x*n,this.velocity.y+=x*d;const w=-(x*this.mass)/(a*this.mass*c);o.angularVelocity.z+=w,o.angularVelocity.z=Math.max(-30,Math.min(30,o.angularVelocity.z)),o.angularVelocity.y=this.velocity.x/c,o.angularVelocity.x=-this.velocity.y/c}}resolveWallCollision(t){if(!this.hasCollider)return;const e=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),i=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),l=this.position.x-s,o=this.position.y-i,c=l*l+o*o;if(c<e*e){this.lastThrower=null;const a=Math.sqrt(c);let h=0,n=0,d=0;if(a===0){const v=Math.abs(this.position.x-t.x),u=Math.abs(t.x+t.width-this.position.x),M=Math.abs(this.position.y-t.y),m=Math.abs(t.y+t.height-this.position.y),p=Math.min(v,u,M,m);p===v?(h=-1,d=v+e):p===u?(h=1,d=u+e):p===M?(n=-1,d=M+e):(n=1,d=m+e)}else d=e-a,h=l/a,n=o/a;this.position.x+=h*d,this.position.y+=n*d;const y=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(h,n,y)}}}class ut{constructor(){r(this,"id","walking");r(this,"name","Walking Module");r(this,"enabled",!0);r(this,"maxWalkForce",35);r(this,"maxWalkSpeed",5.2);r(this,"dragDamping",8.01)}update(t,e,s,i){var F;if(!this.enabled||!t.isRestingOnSurface){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((F=t.frictionModule)!=null&&F.enabled)||!t.hasMass){t.isActivelyWalking=!1;return}const l=Math.hypot(e.x,e.y),o=l>.05;if(t.isActivelyWalking=o,t.mass<=.01)return;const a=t.dynamicGroundFrictionMod;if(a<=.001)return;const h=i.frictionCoeff/10,n=a*h,y=t.carriedMass/(Math.max(.1,t.strength)*8),v=this.maxWalkSpeed/(1+y);let u=0,M=0;if(o){const C=e.x/l,P=e.y/l;u=C*v,M=P*v}const m=u-t.velocity.x,p=M-t.velocity.y,b=Math.hypot(m,p);if(b<.001){t.velocity.x=u,t.velocity.y=M;return}const f=Math.hypot(t.velocity.x,t.velocity.y),S=Math.max(.02,i.staticFrictionThreshold*t.staticGroundFrictionMod),x=t.hasMass?Math.max(.2,t.baseMass):1,w=this.maxWalkForce*t.strength/x*n*s;if(b<=w||!o&&f<S)t.velocity.x=u,t.velocity.y=M;else{const C=w/b;t.velocity.x+=m*C,t.velocity.y+=p*C}}}class yt{constructor(){r(this,"id","pickup");r(this,"name","Pickup Ability");r(this,"enabled",!0);r(this,"pickupReach",1.3)}findTargetObject(t,e,s,i){var c;if(!this.enabled)return null;let l=null,o=1/0;for(const a of i){if(a===t||a.isHeld||a.isCharacter||a.lastThrower===t)continue;const h=a.hasCollider?a.colliderRadius:((c=a.colliderModule)==null?void 0:c.radius)??.32;if(Math.hypot(a.position.x-t.position.x,a.position.y-t.position.y)>this.pickupReach+h)continue;const d=Math.hypot(a.position.x-e,a.position.y-s);d<o&&(o=d,l=a)}return l}pickup(t,e){if(!this.enabled||t.heldObject)return!1;const s=e.velocity.x,i=e.velocity.y,l=e.mass/Math.max(.2,t.mass);return t.velocity.x+=s*l,t.velocity.y+=i*l,t.isAboveGround&&Math.abs(e.verticalVelocity)>.1&&(t.verticalVelocity+=e.verticalVelocity*l),t.heldObject=e,e.isHeld=!0,e.heldBy=t,e.velocity.x=0,e.velocity.y=0,e.verticalVelocity=0,e.position.z=e.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const e=t.heldObject;return t.heldObject=null,e.isHeld=!1,e.heldBy=null,e.velocity.x=t.velocity.x*.4,e.velocity.y=t.velocity.y*.4,e.verticalVelocity=0,e}}class pt{constructor(){r(this,"id","throw");r(this,"name","Throw Ability");r(this,"enabled",!0);r(this,"baseThrowForce",7.6);r(this,"maxThrowAimDistance",13)}testWallIntersection(t,e,s,i){const l=Math.max(i.x,Math.min(t,i.x+i.width)),o=Math.max(i.y,Math.min(e,i.y+i.height)),c=t-l,a=e-o;return c*c+a*a<s*s}computeLaunchVelocity(t,e,s,i,l,o,c,a=!0,h=!0,n=.35){const d=i-t,y=l-e,v=Math.hypot(d,y);if(v<.1)return null;const u=Math.min(v,this.maxThrowAimDistance),M=d/v,m=y/v,p=t+M*u,b=e+m*u;if(!a||!h){const $=Math.max(3,c),B=Math.max(.14,u/$),A=M*$,L=m*$;return{vx:A,vy:L,vz:0,totalTime:B,finalTargetX:p,finalTargetY:b,targetSurfaceHeight:s}}const f=o.getSupportingSurfaceHeight(p,b),S=f-s,x=Math.max(3,c);let w=Math.max(.14,u/x);S>0&&(w=Math.max(w,Math.sqrt(2*S/o.gravity)));const F=40,C=n>0?n:.35,P=.25;for(let $=1;$<F;$++){const B=$/F,A=t+(p-t)*B,L=e+(b-e)*B;for(const V of o.walls)if(this.testWallIntersection(A,L,C,V)){if(f>0&&p>=V.x&&p<=V.x+V.width&&b>=V.y&&b<=V.y+V.height&&B>.65)continue;const g=(1-B)*s+B*f,j=V.wallHeight+P-g;if(j>0){const G=o.gravity*B*(1-B);if(G>.001){const H=2*j/G;if(H>0){const I=Math.sqrt(H);I>w&&(w=I)}}}}}if(w<=.05)return null;const R=(S+.5*o.gravity*w*w)/w,D=u/w,W=M*D,T=m*D;return{vx:W,vy:T,vz:R,totalTime:w,finalTargetX:p,finalTargetY:b,targetSurfaceHeight:f}}calculateTrajectory(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,c=l.position.y,a=l.position.z,h=this.baseThrowForce*t.strength,n=l.hasGravity&&l.hasVerticalVelocity,d=this.computeLaunchVelocity(o,c,a,e,s,i,h,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!d)return null;const{vx:y,vy:v,vz:u,totalTime:M,finalTargetX:m,finalTargetY:p,targetSurfaceHeight:b}=d,f=90,S=M/f,x=[];let k=!1,w=b>0,F;for(let P=0;P<=f;P++){const R=P*S,D=P===f?m:o+y*R,W=P===f?p:c+v*R,T=n?a+u*R-.5*i.gravity*R*R:a,$=n?P===f?b:Math.max(b,T):a,B=n?u-i.gravity*R:0,A=$>i.wallHeight;let L=!1,V=!1;for(const z of i.walls)if(this.testWallIntersection(D,W,l.colliderRadius,z)&&(L=!0,$<=z.wallHeight+.001)){if(x.length>0&&x[x.length-1].z>=z.wallHeight-.05&&B<=0){if(b>0&&(P>=f-2||Math.hypot(D-m,W-p)<.2)){w=!0;break}else if(b===0){w=!0,V=!0,k=!0,F=z.id;break}}else if($<z.wallHeight-.05){V=!0,k=!0,F=z.id;break}}if(x.push({x:D,y:W,z:$,t:R,couldClearWall:A,isOverWall:L,collidesWall:V}),V)break}const C=x[x.length-1];return{points:x,landPoint:{x:k?C.x:m,y:k?C.y:p},isBlockedByWall:k,isLandingOnWallTop:k?w:b>0,blockedAtWallId:F}}throwHeldObject(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const l=t.heldObject,o=l.position.x,c=l.position.y,a=l.position.z,h=this.baseThrowForce*t.strength,n=this.computeLaunchVelocity(o,c,a,e,s,i,h,l.hasGravity,l.hasVerticalVelocity,l.colliderRadius);if(!n)return null;if(l.isHeld=!1,l.heldBy=null,l.lastThrower=t,l.velocity.x=n.vx,l.velocity.y=n.vy,l.verticalVelocity=n.vz,l.position.z=l.hasVerticalPosition?Math.max(.3,l.position.z):0,l.hasFriction&&l.rollModule&&l.rollModule.enabled){const m=l.colliderRadius>0?l.colliderRadius:.3;l.rollModule.angularVelocity.y=n.vx/m,l.rollModule.angularVelocity.x=-n.vy/m}const d=l.hasMass?l.mass:0,y=t.hasMass?Math.max(.2,t.baseMass):0,v=d>0&&y>0?d/y:0;t.heldObject=null;const u=n.vx-t.velocity.x,M=n.vy-t.velocity.y;if(t.velocity.x-=u*v,t.velocity.y-=M*v,t.isAboveGround&&l.hasVerticalVelocity){const m=n.vz-t.verticalVelocity;t.verticalVelocity-=m*v}return l}}class vt{constructor(){r(this,"id","climbing");r(this,"name","Climbing Module");r(this,"enabled",!0);r(this,"climbSpeed",2.5)}update(t,e,s,i,l){if(!this.enabled||!t.hasVerticalPosition)return t.isClimbing=!1,!1;const o=Math.hypot(e.x,e.y);if(o<.05)return t.isClimbing=!1,!1;const c=e.x/o,a=e.y/o,h=t.hasCollider?t.colliderRadius:.44;let n=null,d=1/0;for(const y of l.walls){if(t.position.z>=y.wallHeight-.001)continue;const v=Math.max(y.x,Math.min(t.position.x,y.x+y.width)),u=Math.max(y.y,Math.min(t.position.y,y.y+y.height)),M=v-t.position.x,m=u-t.position.y,p=Math.hypot(M,m);p<=h+.15&&c*M+a*m>.01&&p<d&&(d=p,n=y)}return n&&s?(t.isClimbing=!0,t.verticalVelocity=0,t.position.z+=this.climbSpeed*i,t.position.z>=n.wallHeight&&(t.position.z=n.wallHeight,t.supportingSurfaceHeight=n.wallHeight,t.verticalVelocity=0,t.isClimbing=!1,t.position.x+=c*.06,t.position.y+=a*.06),!0):(t.isClimbing=!1,!1)}}class ct extends U{constructor(e={}){super({name:"Player Character",position:{x:e.x??5,y:e.y??7,z:0},mass:e.mass??1.2,colliderRadius:e.colliderRadius??.44,color:e.color??"#f59e0b",bounceMod:.1});r(this,"strength");r(this,"facingAngle");r(this,"heldObject");r(this,"isCharacter",!0);r(this,"isActivelyWalking",!1);r(this,"baseMass",1.2);r(this,"walkingModule");r(this,"pickupModule");r(this,"throwModule");r(this,"climbingModule");r(this,"isAiming");r(this,"aimTarget");r(this,"activeTrajectory");this.baseMass=e.mass??1.2,this.strength=e.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.walkingModule=new ut,this.pickupModule=new yt,this.throwModule=new pt,this.climbingModule=new vt}get mass(){const e=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return e+s}set mass(e){this.baseMass=Math.max(.1,e),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}updateFacingDirection(e,s,i){if((this.heldObject!==null||e)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const l=s.x-this.position.x,o=s.y-this.position.y;if(Math.hypot(l,o)>.1){this.facingAngle=Math.atan2(o,l);return}}i&&Math.hypot(i.x,i.y)>.05&&(this.facingAngle=Math.atan2(i.y,i.x))}updateCharacter(e,s,i,l,o,c=!1){if(this.climbingModule&&this.climbingModule.update(this,s,c,e,o),this.walkingModule&&this.walkingModule.update(this,s,e,o),this.updatePosition(e,o),this.updateFacingDirection(i,l,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?this.position.z+.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||i,this.aimTarget=l,this.heldObject&&this.throwModule&&l?this.activeTrajectory=this.throwModule.calculateTrajectory(this,l.x,l.y,o):this.activeTrajectory=null}}class nt{constructor(t={}){r(this,"enabled",!0);r(this,"angularVelocity",{x:0,y:0,z:0});r(this,"rollResistance",.4);r(this,"visualPhase",0);var e,s,i;this.enabled=t.enabled??!0,this.angularVelocity={x:((e=t.angularVelocity)==null?void 0:e.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((i=t.angularVelocity)==null?void 0:i.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const e=this.angularSpeed;e>.001&&(this.visualPhase=(this.visualPhase+e*t)%(Math.PI*2))}}class Mt{constructor(t){r(this,"ctx");this.ctx=t}render(t,e,s,i,l=!1,o,c,a=!1,h){const n=this.ctx,d=n.canvas.width/t.width;n.clearRect(0,0,n.canvas.width,n.canvas.height),this.drawFloorGrid(t,d),this.drawWalls(t,d),a&&h&&this.drawWallEditorHover(t,h,d);const y=[e,...s];y.sort((v,u)=>Math.abs(v.position.z-u.position.z)>.001?v.position.z-u.position.z:Math.abs(v.verticalVelocity-u.verticalVelocity)>.001?v.verticalVelocity-u.verticalVelocity:v.position.y-u.position.y);for(const v of y)v instanceof ct?this.drawCharacter(v,s,d):this.drawFreebodyObject(v,y,e,d,v===c);for(const v of y)this.drawObjectShadow(v,t,d);e.activeTrajectory&&this.drawTrajectory(e.activeTrajectory,d),l&&(o&&o!==i&&this.drawHoverGizmo(o,d),i&&this.drawSelectionGizmo(i,l,d))}drawFloorGrid(t,e){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*e,t.height*e),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let i=1;i<t.width;i++)s.beginPath(),s.moveTo(i*e,0),s.lineTo(i*e,t.height*e),s.stroke();for(let i=1;i<t.height;i++)s.beginPath(),s.moveTo(0,i*e),s.lineTo(t.width*e,i*e),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*e-3,t.height*e-3)}drawWalls(t,e){const s=this.ctx;for(const i of t.walls)s.fillStyle="#1e293b",s.fillRect(i.x*e,i.y*e,i.width*e,i.height*e),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(i.x*e,i.y*e,i.width*e,i.height*e)}drawWallEditorHover(t,e,s){if(e.col<0||e.col>=t.cols||e.row<0||e.row>=t.rows)return;const i=this.ctx,l=e.col*t.tileSize*s,o=e.row*t.tileSize*s,c=t.tileSize*s,a=t.hasWall(e.col,e.row);i.save(),a?(i.fillStyle="rgba(239, 68, 68, 0.35)",i.strokeStyle="#ef4444",i.lineWidth=2.5,i.fillRect(l,o,c,c),i.strokeRect(l,o,c,c),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#fca5a5",i.textAlign="center",i.textBaseline="middle",i.fillText("✕ Erase",l+c/2,o+c/2)):(i.fillStyle="rgba(56, 189, 248, 0.3)",i.strokeStyle="#38bdf8",i.lineWidth=2.5,i.fillRect(l,o,c,c),i.strokeRect(l,o,c,c),i.font="bold 12px system-ui, sans-serif",i.fillStyle="#7dd3fc",i.textAlign="center",i.textBaseline="middle",i.fillText("+ Draw",l+c/2,o+c/2)),i.restore()}drawObjectShadow(t,e,s){const i=this.ctx,l=t.position.x*s,o=t.position.y*s,c=t.position.z,a=1+c/e.wallHeight*1.5,h=t.colliderRadius*s*a,n=Math.max(.3,.85-c/(e.wallHeight*7)*.25),d=c>=e.wallHeight-.001;if(i.save(),i.beginPath(),t.visualShape==="box"){const y=h*2,v=Math.max(3,4*a);i.roundRect?i.roundRect(l-h,o-h,y,y,v):i.rect(l-h,o-h,y,y)}else i.arc(l,o,h,0,Math.PI*2);d?(i.strokeStyle=`rgba(56, 189, 248, ${n})`,i.lineWidth=2.5):(i.strokeStyle=`rgba(255, 255, 255, ${n})`,i.lineWidth=1.8),c>.01&&i.setLineDash([4,3]),i.stroke(),i.restore()}drawFreebodyObject(t,e,s,i,l=!1){var M,m;const o=this.ctx,c=t.position.x*i,a=t.position.y*i,h=t.hasCollider?t.colliderRadius:((M=t.colliderModule)==null?void 0:M.radius)??.32,n=h*i,d=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled,y=Math.hypot(t.position.x-s.position.x,t.position.y-s.position.y),v=d&&!t.isHeld&&y<=(((m=s.pickupModule)==null?void 0:m.pickupReach)??1.3)+h;if(v){if(o.save(),o.beginPath(),t.visualShape==="box"){const p=(n+5)*2;o.roundRect?o.roundRect(c-n-5,a-n-5,p,p,6):o.rect(c-n-5,a-n-5,p,p)}else o.arc(c,a,n+5,0,Math.PI*2);l?(o.strokeStyle="#38bdf8",o.lineWidth=3,o.setLineDash([]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 11px sans-serif",o.textAlign="center",o.fillText("GRAB",c,a-n-8)):(o.strokeStyle="rgba(56, 189, 248, 0.45)",o.lineWidth=1.8,o.setLineDash([4,4]),o.stroke()),o.restore()}let u=!1;if(t.isAboveGround)for(const p of e){if(p===t)continue;if(Math.hypot(t.position.x-p.position.x,t.position.y-p.position.y)<t.colliderRadius+p.colliderRadius&&(t.position.z>p.position.z||Math.abs(t.position.z-p.position.z)<=.01&&t.verticalVelocity>p.verticalVelocity)){u=!0;break}}if(o.save(),o.globalAlpha=u?.55:1,t.visualShape==="box"){const p=n*2,b=Math.max(3,n*.16),f=c-n,S=a-n;o.beginPath(),o.roundRect?o.roundRect(f,S,p,p,b):o.rect(f,S,p,p),o.fillStyle=t.color,o.fill(),o.strokeStyle=v?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=v?2.5:2,o.stroke();const x=Math.max(3,n*.22);o.beginPath(),o.roundRect?o.roundRect(f+x,S+x,p-x*2,p-x*2,b*.7):o.rect(f+x,S+x,p-x*2,p-x*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(f+x,S+x),o.lineTo(f+p-x,S+p-x),o.moveTo(f+p-x,S+x),o.lineTo(f+x,S+p-x),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(c,a,n,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=v?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=v?2.5:2,o.stroke();this.drawRollIndicator(t,c,a,n),o.restore()}drawCharacter(t,e,s){const i=this.ctx,l=t.position.x*s,o=t.position.y*s,c=t.colliderRadius*s;let a=!1;if(t.isAboveGround)for(const b of e){if(b===t)continue;if(Math.hypot(t.position.x-b.position.x,t.position.y-b.position.y)<t.colliderRadius+b.colliderRadius&&(t.position.z>b.position.z||Math.abs(t.position.z-b.position.z)<=.01&&t.verticalVelocity>b.verticalVelocity)){a=!0;break}}i.save(),i.globalAlpha=a?.55:1,i.beginPath(),i.arc(l,o,c,0,Math.PI*2),i.fillStyle=t.color,i.fill(),i.strokeStyle="#ffffff",i.lineWidth=2.5,i.stroke(),this.drawRollIndicator(t,l,o,c);const h=.52,n=c*.72,d=Math.max(3.5,c*.18),y=t.facingAngle-h,v=t.facingAngle+h,u=l+Math.cos(y)*n,M=o+Math.sin(y)*n,m=l+Math.cos(v)*n,p=o+Math.sin(v)*n;i.fillStyle="#000000",i.beginPath(),i.arc(u,M,d,0,Math.PI*2),i.arc(m,p,d,0,Math.PI*2),i.fill(),t.heldObject&&(i.strokeStyle="rgba(255, 255, 255, 0.6)",i.setLineDash([3,3]),i.lineWidth=1.5,i.beginPath(),i.moveTo(l,o),i.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),i.stroke(),i.setLineDash([])),i.restore()}drawRollIndicator(t,e,s,i){if(!t.rollModule||!t.rollModule.enabled)return;const l=t.rollModule,o=l.angularVelocity.x,c=l.angularVelocity.y,a=l.angularVelocity.z,h=Math.hypot(o,c,a);if(h<.02)return;const n=this.ctx,y=Math.hypot(o,c)<.05*h;if(n.save(),y){const v=i*.45,u=i*.78;n.beginPath(),n.arc(e,s,v,0,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.45)",n.lineWidth=1.5,n.setLineDash([]),n.stroke(),n.beginPath(),n.arc(e,s,u,0,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2,n.setLineDash([4,4]),n.lineDashOffset=-l.visualPhase*u*Math.sign(a||1),n.stroke()}else{const v=Math.atan2(-o,c),u=i*.82,M=Math.abs(a)/h,m=u*Math.pow(M,.85);n.translate(e,s),n.rotate(v);const p=a!==0?Math.sign(a):1;m<.5?(n.beginPath(),n.moveTo(-u,0),n.lineTo(u,0),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2.2,n.setLineDash([4,4]),n.lineDashOffset=-l.visualPhase*u,n.stroke()):(n.beginPath(),n.ellipse(0,0,u,m,0,0,Math.PI),n.strokeStyle="rgba(255, 255, 255, 0.95)",n.lineWidth=2.2,n.setLineDash([4,4]),n.lineDashOffset=-l.visualPhase*u*p,n.stroke(),n.beginPath(),n.ellipse(0,0,u,m,0,Math.PI,Math.PI*2),n.strokeStyle="rgba(255, 255, 255, 0.25)",n.lineWidth=1.8,n.setLineDash([4,4]),n.lineDashOffset=-l.visualPhase*u*p,n.stroke())}n.restore()}drawTrajectory(t,e){const s=this.ctx,i=t.points;if(i.length<2)return;s.save();for(let o=0;o<i.length-1;o++){const c=i[o],a=i[o+1];s.beginPath(),s.moveTo(c.x*e,c.y*e),s.lineTo(a.x*e,a.y*e),c.couldClearWall||a.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const l=i[i.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const o=8;s.beginPath(),s.moveTo(l.x*e-o,l.y*e-o),s.lineTo(l.x*e+o,l.y*e+o),s.moveTo(l.x*e+o,l.y*e-o),s.lineTo(l.x*e-o,l.y*e+o),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,e){var a;const s=this.ctx,i=t.position.x*e,l=t.position.y*e,c=((t.hasCollider?t.colliderRadius:((a=t.colliderModule)==null?void 0:a.radius)??.32)+.08)*e;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(i,l,c,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,e,s){var y;const i=this.ctx,l=t.position.x*s,o=t.position.y*s,h=(t.hasCollider?t.colliderRadius:((y=t.colliderModule)==null?void 0:y.radius)??.32)*s+6,n=Math.max(6,h*.4),d=e?"#fbbf24":"#38bdf8";if(i.save(),i.strokeStyle=d,i.lineWidth=2,i.setLineDash([]),i.beginPath(),i.moveTo(l-h,o-h+n),i.lineTo(l-h,o-h),i.lineTo(l-h+n,o-h),i.stroke(),i.beginPath(),i.moveTo(l+h-n,o-h),i.lineTo(l+h,o-h),i.lineTo(l+h,o-h+n),i.stroke(),i.beginPath(),i.moveTo(l+h,o+h-n),i.lineTo(l+h,o+h),i.lineTo(l+h-n,o+h),i.stroke(),i.beginPath(),i.moveTo(l-h+n,o+h),i.lineTo(l-h,o+h),i.lineTo(l-h,o+h-n),i.stroke(),e){const v=`${t.name} (${t.mass.toFixed(1)}kg)`;i.font="bold 10px 'Segoe UI', system-ui, sans-serif";const M=i.measureText(v).width+12,m=16,p=l-M/2,b=o-h-m-4;i.fillStyle="rgba(15, 23, 42, 0.85)",i.strokeStyle=d,i.lineWidth=1,i.beginPath(),i.roundRect(p,b,M,m,4),i.fill(),i.stroke(),i.fillStyle=d,i.textAlign="center",i.textBaseline="middle",i.fillText(v,l,b+m/2)}i.restore()}}class mt{constructor(t,e){r(this,"canvas");r(this,"arena");r(this,"keysPressed",new Set);r(this,"mousePos",{x:0,y:0});r(this,"isMouseDown",!1);r(this,"isRightMouseDown",!1);r(this,"hoverWallTile",null);r(this,"movementVector",{x:0,y:0});r(this,"justPickedUp",!1);r(this,"isThrowingPress",!1);r(this,"hoverEntity",null);r(this,"selectedCanvasEntity",null);r(this,"draggedEntity",null);r(this,"dragOffset",{x:0,y:0});r(this,"handleClick");r(this,"onMouseDown");r(this,"onRightMouseDown");r(this,"onMouseUp");r(this,"onRightClick");r(this,"onDropAttempt");r(this,"onMouseMove");this.canvas=t,this.arena=e,this.setupListeners()}get isGrabHeld(){return!this.isThrowingPress&&this.isMouseDown}get isClimbHeld(){return this.keysPressed.has("Space")}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{if(this.updateMousePos(t),t.button===2){this.isRightMouseDown=!0,this.onRightMouseDown&&this.onRightMouseDown(this.mousePos.x,this.mousePos.y);return}t.button===0&&(this.isMouseDown=!0,this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{if(t.button===2){this.isRightMouseDown=!1;return}t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.isThrowingPress=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateTouchPos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateMovementVector(){let t=0,e=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(e-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(e+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,e);s>0?(this.movementVector.x=t/s,this.movementVector.y=e/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,e,s,i){i&&(this.selectedCanvasEntity=i.selectedEntity);const l=(a,h,n=.35)=>{var v;for(let u=s.length-1;u>=0;u--){const M=s[u],m=M.hasCollider?M.colliderRadius:((v=M.colliderModule)==null?void 0:v.radius)??.32;if(Math.hypot(M.position.x-a,M.position.y-h)<=m+n)return M}const d=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-a,t.position.y-h)<=d+n?t:null},o=(a,h)=>{var d;if(a<0||a>=e.cols||h<0||h>=e.rows)return;if(e.setWallTile(a,h,!0)){const y={id:`wall-${a}-${h}`,x:a*e.tileSize,y:h*e.tileSize,width:e.tileSize,height:e.tileSize,wallHeight:e.wallHeight},v=[t,...s];for(const u of v){const M=u.hasCollider?u.colliderRadius:((d=u.colliderModule)==null?void 0:d.radius)??.32;e.testWallOverlap(u.position.x,u.position.y,M,y)&&u.position.z<e.wallHeight&&(u.hasVerticalPosition||(u.verticalPositionModule?u.verticalPositionModule.enabled=!0:u.verticalPositionModule=new lt({z:e.wallHeight,hasVerticalVelocity:!0})),u.position.z=e.wallHeight,u.supportingSurfaceHeight=e.wallHeight,u.verticalVelocity=0)}}},c=(a,h)=>{a<0||a>=e.cols||h<0||h>=e.rows||e.setWallTile(a,h,!1)};this.onMouseDown=(a,h)=>{if(i!=null&&i.isEditMode){if(i.editTool==="walls"){const d=Math.floor(a/e.tileSize),y=Math.floor(h/e.tileSize);o(d,y);return}const n=l(a,h,.35);n?(this.selectedCanvasEntity=n,i.setSelectedEntity(n),this.draggedEntity=n,this.dragOffset.x=n.position.x-a,this.dragOffset.y=n.position.y-h,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onRightMouseDown=(a,h)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"){const n=Math.floor(a/e.tileSize),d=Math.floor(h/e.tileSize);c(n,d)}},this.onMouseMove=(a,h)=>{var y;const n=Math.floor(a/e.tileSize),d=Math.floor(h/e.tileSize);if(n>=0&&n<e.cols&&d>=0&&d<e.rows?this.hoverWallTile={col:n,row:d}:this.hoverWallTile=null,i!=null&&i.isEditMode){if(i.editTool==="walls"){this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="cell",this.isMouseDown&&this.hoverWallTile?o(this.hoverWallTile.col,this.hoverWallTile.row):this.isRightMouseDown&&this.hoverWallTile&&c(this.hoverWallTile.col,this.hoverWallTile.row);return}if(this.isMouseDown&&this.draggedEntity){const v=a+this.dragOffset.x,u=h+this.dragOffset.y,M=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((y=this.draggedEntity.colliderModule)==null?void 0:y.radius)??.32;this.draggedEntity.position.x=Math.max(M,Math.min(e.width-M,v)),this.draggedEntity.position.y=Math.max(M,Math.min(e.height-M,u)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const v=l(a,h,.3);this.hoverEntity=v,this.canvas.style.cursor=v?"grab":"crosshair"}}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(a,h)=>{if(this.draggedEntity&&(this.draggedEntity=null),i!=null&&i.isEditMode)if(i.editTool==="walls")this.canvas.style.cursor="cell";else{const n=l(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=n,this.canvas.style.cursor=n?"grab":"crosshair"}},this.handleClick=(a,h)=>{if(!(i!=null&&i.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,a,h,e),this.isThrowingPress=!0;return}if(!t.heldObject&&t.pickupModule){const n=t.pickupModule.findTargetObject(t,a,h,s);n&&(t.pickupModule.pickup(t,n),this.justPickedUp=!0)}}},this.onRightClick=(a,h)=>{if(i!=null&&i.isEditMode&&i.editTool==="walls"||!i)return;const n=l(a,h,.4);n&&(this.selectedCanvasEntity=n,i.setSelectedEntity(n))},this.onDropAttempt=()=>{if(t.heldObject&&t.pickupModule)t.pickupModule.drop(t)&&(this.isThrowingPress=!0);else if(!t.heldObject&&t.pickupModule){const a=t.pickupModule.findTargetObject(t,this.mousePos.x,this.mousePos.y,s);a&&t.pickupModule.pickup(t,a)}}}}class xt{constructor(t){r(this,"container");r(this,"character");r(this,"arena");r(this,"objects");r(this,"onSpawnObject");r(this,"onDeleteObject");r(this,"onClearObjects");r(this,"selectedEntity");r(this,"isEditMode",!1);r(this,"editTool","entities");r(this,"onSelectionChange");r(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});r(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});r(this,"inspectorEl");r(this,"entitySelectorEl");r(this,"characterSpecificControlsEl");r(this,"objectSpecificControlsEl");r(this,"modePlayBtn");r(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var e;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(e=this.onSelectionChange)==null||e.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")));const e=this.container.querySelector("#edit-submode-container");e&&(e.style.display=this.isEditMode?"flex":"none"),this.updateToolVisibility()}setEditTool(t){this.editTool=t;const e=this.container.querySelector("#submode-entities"),s=this.container.querySelector("#submode-walls");e&&s&&(e.classList.toggle("active",t==="entities"),s.classList.toggle("active",t==="walls")),this.updateToolVisibility()}updateToolVisibility(){const t=this.container.querySelector("#wall-editor-section");t&&(t.style.display=this.isEditMode&&this.editTool==="walls"?"block":"none");const e=this.container.querySelector("#edit-hint-label");e&&(this.isEditMode?this.editTool==="walls"?e.textContent="Left-drag: Draw | Right-drag: Erase":e.textContent="Click & drag object in arena":e.textContent="Right-click in arena to select")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let e=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const i of this.objects){const l=i.id===t?"selected":"",o=i.visualShape==="box"?"📦":"⚪",c=i.hasMass?`${i.mass.toFixed(1)}kg`:"Massless";e+=`<option value="${i.id}" ${l}>${o} ${i.name} (${c})</option>`}this.entitySelectorEl.innerHTML=e;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,e,s,i,l,o,c,a,h,n,d,y,v,u,M,m,p,b,f,S,x,k,w,F,C,P,R,D,W,T,$,B,A,L,V,z,g,O,j,G,H,I,q,X,it,Y,Z,st,N,K,ot,_;this.container.innerHTML=`
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
                  <span id="val-entity-dynamic-fric">${(((d=this.selectedEntity.frictionModule)==null?void 0:d.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((y=this.selectedEntity.frictionModule)==null?void 0:y.dynamicFrictionMod)??1}">
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
                  <span id="val-entity-bounce">${(((b=this.selectedEntity.bounceModule)==null?void 0:b.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((f=this.selectedEntity.bounceModule)==null?void 0:f.bounceMod)??.4}">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(F=this.selectedEntity.rollModule)!=null&&F.enabled?"active":""}">
                ${(C=this.selectedEntity.rollModule)!=null&&C.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(P=this.selectedEntity.rollModule)!=null&&P.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(R=this.selectedEntity.rollModule)!=null&&R.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((D=this.selectedEntity.rollModule)==null?void 0:D.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((W=this.selectedEntity.rollModule)==null?void 0:W.rollResistance)??.4}">
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
              <div id="group-mod-walking" style="display: ${(A=this.character.walkingModule)!=null&&A.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((L=this.character.walkingModule)==null?void 0:L.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((V=this.character.walkingModule)==null?void 0:V.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((z=this.character.walkingModule)==null?void 0:z.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((g=this.character.walkingModule)==null?void 0:g.maxWalkSpeed)??5.2}">
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
                <button id="toggle-pickup" class="btn-toggle ${(O=this.character.pickupModule)!=null&&O.enabled?"active":""}">
                  ${(j=this.character.pickupModule)!=null&&j.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(G=this.character.pickupModule)!=null&&G.enabled?"block":"none"};">
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
                <button id="toggle-throw" class="btn-toggle ${(q=this.character.throwModule)!=null&&q.enabled?"active":""}">
                  ${(X=this.character.throwModule)!=null&&X.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(it=this.character.throwModule)!=null&&it.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((Y=this.character.throwModule)==null?void 0:Y.baseThrowForce)??7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((Z=this.character.throwModule)==null?void 0:Z.baseThrowForce)??7.6}">
                </div>
              </div>
            </div>

            <!-- Climbing Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🧗 Climbing Ability</label>
                <button id="toggle-climb" class="btn-toggle ${(st=this.character.climbingModule)!=null&&st.enabled?"active":""}">
                  ${(N=this.character.climbingModule)!=null&&N.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-climb" style="display: ${(K=this.character.climbingModule)!=null&&K.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Climb Speed (u/s)</span>
                    <span id="val-climb-speed">${(((ot=this.character.climbingModule)==null?void 0:ot.climbSpeed)??2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${((_=this.character.climbingModule)==null?void 0:_.climbSpeed)??2}">
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var z,g,O,j,G,H,I;const t=this.selectedEntity,e=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=e?"none":"flex");const i=this.container.querySelector("#toggle-entity-shape");i&&(t.visualShape==="box"?(i.textContent="Box 📦",i.classList.add("active")):(i.textContent="Circle ⚪",i.classList.remove("active")));const l=this.container.querySelector("#toggle-mod-collider"),o=this.container.querySelector("#group-mod-collider"),c=this.container.querySelector("#note-mod-collider");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),o&&(o.style.display=t.hasCollider?"block":"none"),c&&(c.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((z=t.colliderModule)==null?void 0:z.radius)??.32,2);const a=this.container.querySelector("#toggle-mod-mass"),h=this.container.querySelector("#group-mod-mass"),n=this.container.querySelector("#note-mod-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),n&&(n.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((g=t.massModule)==null?void 0:g.mass)??1,1);const d=this.container.querySelector("#toggle-mod-friction"),y=this.container.querySelector("#group-mod-friction"),v=this.container.querySelector("#note-mod-friction"),u=this.container.querySelector("#warn-friction-mass"),M=!!(t.frictionModule&&t.frictionModule.enabled);d&&(d.textContent=M?"Attached":"Detached",d.classList.toggle("active",M)),y&&(y.style.display=M?"flex":"none"),v&&(v.style.display=M?"none":"block"),u&&(u.style.display=!t.hasMass&&M?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((O=t.frictionModule)==null?void 0:O.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((j=t.frictionModule)==null?void 0:j.dynamicFrictionMod)??1,2);const m=this.container.querySelector("#toggle-mod-bounce"),p=this.container.querySelector("#group-mod-bounce"),b=this.container.querySelector("#note-mod-bounce"),f=this.container.querySelector("#warn-bounce-mass"),S=!!(t.bounceModule&&t.bounceModule.enabled);m&&(m.textContent=S?"Attached":"Detached",m.classList.toggle("active",S)),p&&(p.style.display=S?"block":"none"),b&&(b.style.display=S?"none":"block"),f&&(f.style.display=!t.hasMass&&S?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((G=t.bounceModule)==null?void 0:G.bounceMod)??.4,2);const x=this.container.querySelector("#check-mod-vert-bounce"),k=this.container.querySelector("#warn-bounce-vert-vel");if(x&&(x.checked=!!((H=t.bounceModule)!=null&&H.verticalBounce)),k){const q=!!(S&&((I=t.bounceModule)!=null&&I.verticalBounce)&&!t.hasVerticalVelocity);k.style.display=q?"block":"none"}const w=this.container.querySelector("#toggle-mod-vert-pos"),F=this.container.querySelector("#group-mod-vert-pos"),C=this.container.querySelector("#note-mod-vert-pos"),P=t.hasVerticalPosition;w&&(w.textContent=P?"Attached":"Detached",w.classList.toggle("active",P)),F&&(F.style.display=P?"block":"none"),C&&(C.style.display=P?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const R=this.container.querySelector("#toggle-mod-vert-vel"),D=this.container.querySelector("#group-mod-vert-vel"),W=t.hasVerticalVelocity;R&&(R.textContent=W?"Enabled":"Disabled",R.classList.toggle("active",W)),D&&(D.style.display=W?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const T=this.container.querySelector("#toggle-mod-gravity"),$=this.container.querySelector("#note-mod-gravity");T&&(T.textContent=t.hasGravity?"Attached":"Detached",T.classList.toggle("active",t.hasGravity)),$&&($.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const B=this.container.querySelector("#toggle-mod-roll"),A=this.container.querySelector("#group-mod-roll"),L=this.container.querySelector("#note-roll-friction"),V=!!(t.rollModule&&t.rollModule.enabled);if(B&&(B.textContent=V?"Attached":"Detached",B.classList.toggle("active",V)),A&&(A.style.display=V?"block":"none"),L&&(L.style.display=V&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),e){const q=this.container.querySelector("#toggle-walk"),X=this.container.querySelector("#group-mod-walking"),it=this.container.querySelector("#warn-walk-friction"),Y=!!(this.character.walkingModule&&this.character.walkingModule.enabled);q&&(q.textContent=Y?"Attached":"Detached",q.classList.toggle("active",Y)),X&&(X.style.display=Y?"flex":"none"),it&&(it.style.display=Y&&!this.character.hasFriction?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1)),this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const Z=this.container.querySelector("#toggle-pickup"),st=this.container.querySelector("#group-mod-pickup"),N=!!(this.character.pickupModule&&this.character.pickupModule.enabled);Z&&(Z.textContent=N?"Attached":"Detached",Z.classList.toggle("active",N)),st&&(st.style.display=N?"block":"none"),this.character.pickupModule&&this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1);const K=this.container.querySelector("#toggle-throw"),ot=this.container.querySelector("#group-mod-throw"),_=!!(this.character.throwModule&&this.character.throwModule.enabled);K&&(K.textContent=_?"Attached":"Detached",K.classList.toggle("active",_)),ot&&(ot.style.display=_?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1);const rt=this.container.querySelector("#toggle-climb"),ht=this.container.querySelector("#group-mod-climb"),dt=!!(this.character.climbingModule&&this.character.climbingModule.enabled);rt&&(rt.textContent=dt?"Attached":"Detached",rt.classList.toggle("active",dt)),ht&&(ht.style.display=dt?"block":"none"),this.character.climbingModule&&this.setSliderVal("slide-climb-speed","val-climb-speed",this.character.climbingModule.climbSpeed,1)}}setSliderVal(t,e,s,i){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${e}`);l&&(l.value=s.toString()),o&&(o.textContent=i>0?s.toFixed(i):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,e=this.container.querySelector("#creator-name");e&&(e.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const i=this.container.querySelector("#creator-color"),l=this.container.querySelector("#val-creator-color");i&&(i.value=t.color),l&&(l.textContent=t.color);const o=this.container.querySelector("#creator-toggle-collider"),c=this.container.querySelector("#grp-creator-radius");o&&(o.textContent=t.hasCollider?"Attached":"Detached",o.classList.toggle("active",t.hasCollider)),c&&(c.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const a=this.container.querySelector("#creator-toggle-mass"),h=this.container.querySelector("#grp-creator-mass");a&&(a.textContent=t.hasMass?"Attached":"Detached",a.classList.toggle("active",t.hasMass)),h&&(h.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const n=this.container.querySelector("#creator-toggle-friction"),d=this.container.querySelector("#grp-creator-fric");n&&(n.textContent=t.hasFriction?"Attached":"Detached",n.classList.toggle("active",t.hasFriction)),d&&(d.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const y=this.container.querySelector("#creator-toggle-bounce"),v=this.container.querySelector("#grp-creator-bounce"),u=this.container.querySelector("#creator-check-vert-bounce"),M=this.container.querySelector("#creator-warn-bounce-vert");y&&(y.textContent=t.hasBounce?"Attached":"Detached",y.classList.toggle("active",t.hasBounce)),v&&(v.style.display=t.hasBounce?"block":"none"),u&&(u.checked=t.verticalBounce),M&&(M.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const m=this.container.querySelector("#creator-toggle-vert-pos"),p=this.container.querySelector("#grp-creator-vert-pos");m&&(m.textContent=t.hasVerticalPosition?"Attached":"Detached",m.classList.toggle("active",t.hasVerticalPosition)),p&&(p.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const b=this.container.querySelector("#creator-toggle-vert-vel");b&&(b.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",b.classList.toggle("active",t.hasVerticalVelocity));const f=this.container.querySelector("#creator-toggle-gravity");f&&(f.textContent=t.hasGravity?"Attached":"Detached",f.classList.toggle("active",t.hasGravity));const S=this.container.querySelector("#creator-toggle-roll"),x=this.container.querySelector("#group-creator-roll-resist");S&&(S.textContent=t.hasRollModule?"Enabled":"Disabled",S.classList.toggle("active",t.hasRollModule)),x&&(x.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var W,T,$,B,A,L,V,z;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1)}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0)}),(W=this.container.querySelector("#submode-entities"))==null||W.addEventListener("click",()=>{this.setEditTool("entities")}),(T=this.container.querySelector("#submode-walls"))==null||T.addEventListener("click",()=>{this.setEditTool("walls")}),this.entitySelectorEl.addEventListener("change",()=>{var O;const g=this.entitySelectorEl.value;if(g===this.character.id)this.selectedEntity=this.character;else{const j=this.objects.find(G=>G.id===g);j&&(this.selectedEntity=j)}this.updateSelectorOptions(),this.syncEntitySliders(),(O=this.onSelectionChange)==null||O.call(this,this.selectedEntity)}),($=this.container.querySelector("#btn-duplicate-entity"))==null||$.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(B=this.container.querySelector("#btn-delete-entity"))==null||B.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const e=this.container.querySelector("#toggle-mod-collider");e==null||e.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new J({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",g=>{this.selectedEntity.colliderRadius=g},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new Q({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",g=>{this.selectedEntity.mass=g,this.updateSelectorOptions()},1);const i=this.container.querySelector("#toggle-mod-friction");i==null||i.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new tt,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",g=>{this.selectedEntity.staticGroundFrictionMod=g},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",g=>{this.selectedEntity.dynamicGroundFrictionMod=g},2);const l=this.container.querySelector("#toggle-mod-bounce");l==null||l.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new et({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",g=>{this.selectedEntity.bounceMod=g},2);const o=this.container.querySelector("#check-mod-vert-bounce");o==null||o.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=o.checked),this.syncEntitySliders(),this.updateInspector()});const c=this.container.querySelector("#toggle-mod-vert-pos");c==null||c.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new lt({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",g=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=g),this.selectedEntity.position.z=g,this.syncEntitySliders(),this.updateInspector()},2);const a=this.container.querySelector("#toggle-mod-vert-vel");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",g=>{this.selectedEntity.verticalVelocity=g},2);const h=this.container.querySelector("#toggle-mod-gravity");h==null||h.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new at,this.syncEntitySliders()});const n=this.container.querySelector("#toggle-mod-roll");n==null||n.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new nt({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",g=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=g)},2);const d=this.container.querySelector("#toggle-walk");d==null||d.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new ut,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",g=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=g)},0),this.setupSlider("slide-walk-speed","val-walk-speed",g=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=g)},1),this.setupSlider("slide-strength","val-strength",g=>{this.character.strength=g},1);const y=this.container.querySelector("#toggle-pickup");y==null||y.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new yt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",g=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=g)},1);const v=this.container.querySelector("#toggle-throw");v==null||v.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new pt,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",g=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=g)},1);const u=this.container.querySelector("#toggle-climb");u==null||u.addEventListener("click",()=>{this.character.climbingModule?this.character.climbingModule.enabled=!this.character.climbingModule.enabled:this.character.climbingModule=new vt,this.syncEntitySliders()}),this.setupSlider("slide-climb-speed","val-climb-speed",g=>{this.character.climbingModule&&(this.character.climbingModule.climbSpeed=g)},1),this.setupSlider("slide-gravity","val-gravity",g=>{this.arena.gravity=g},1),this.setupSlider("slide-wall-height","val-wall-height",g=>{this.arena.setStandardWallHeight(g),this.setSliderVal("slide-editor-wall-height","val-editor-wall-height",g,1)},1),this.setupSlider("slide-editor-wall-height","val-editor-wall-height",g=>{this.arena.setStandardWallHeight(g),this.setSliderVal("slide-wall-height","val-wall-height",g,1)},1),(A=this.container.querySelector("#btn-reset-walls"))==null||A.addEventListener("click",()=>{this.arena.resetDefaultWalls()}),(L=this.container.querySelector("#btn-clear-walls"))==null||L.addEventListener("click",()=>{this.arena.clearAllWalls()}),this.setupSlider("slide-friction","val-friction",g=>{this.arena.frictionCoeff=g},1),this.setupSlider("slide-static-thresh","val-static-thresh",g=>{this.arena.staticFrictionThreshold=g},2),this.container.querySelectorAll(".preset-chip").forEach(g=>{g.addEventListener("click",()=>{const O=g.getAttribute("data-preset");O&&this.presets[O]&&(this.creatorState={...this.presets[O]},this.syncCreatorInputs())})});const m=this.container.querySelector("#creator-name");m==null||m.addEventListener("input",()=>{this.creatorState.name=m.value});const p=this.container.querySelector("#creator-toggle-shape");p==null||p.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",p.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",p.classList.toggle("active",this.creatorState.visualShape==="box")});const b=this.container.querySelector("#creator-color"),f=this.container.querySelector("#val-creator-color");b==null||b.addEventListener("input",()=>{this.creatorState.color=b.value,f&&(f.textContent=b.value)});const S=this.container.querySelector("#creator-toggle-collider");S==null||S.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,S.textContent=this.creatorState.hasCollider?"Attached":"Detached",S.classList.toggle("active",this.creatorState.hasCollider);const g=this.container.querySelector("#grp-creator-radius");g&&(g.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",g=>{this.creatorState.colliderRadius=g},2);const x=this.container.querySelector("#creator-toggle-mass");x==null||x.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,x.textContent=this.creatorState.hasMass?"Attached":"Detached",x.classList.toggle("active",this.creatorState.hasMass);const g=this.container.querySelector("#grp-creator-mass");g&&(g.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",g=>{this.creatorState.mass=g},1);const k=this.container.querySelector("#creator-toggle-friction");k==null||k.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,k.textContent=this.creatorState.hasFriction?"Attached":"Detached",k.classList.toggle("active",this.creatorState.hasFriction);const g=this.container.querySelector("#grp-creator-fric");g&&(g.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",g=>{this.creatorState.dynamicFrictionMod=g},2);const w=this.container.querySelector("#creator-toggle-bounce");w==null||w.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,w.textContent=this.creatorState.hasBounce?"Attached":"Detached",w.classList.toggle("active",this.creatorState.hasBounce);const g=this.container.querySelector("#grp-creator-bounce");g&&(g.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",g=>{this.creatorState.bounceMod=g},2);const F=this.container.querySelector("#creator-check-vert-bounce");F==null||F.addEventListener("change",()=>{this.creatorState.verticalBounce=F.checked,this.syncCreatorInputs()});const C=this.container.querySelector("#creator-toggle-vert-pos");C==null||C.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",g=>{this.creatorState.elevation=g},2);const P=this.container.querySelector("#creator-toggle-vert-vel");P==null||P.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const R=this.container.querySelector("#creator-toggle-gravity");R==null||R.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,R.textContent=this.creatorState.hasGravity?"Attached":"Detached",R.classList.toggle("active",this.creatorState.hasGravity)});const D=this.container.querySelector("#creator-toggle-roll");D==null||D.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,D.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",D.classList.toggle("active",this.creatorState.hasRollModule);const g=this.container.querySelector("#group-creator-roll-resist");g&&(g.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",g=>{this.creatorState.rollResistance=g},2),(V=this.container.querySelector("#btn-spawn-configured"))==null||V.addEventListener("click",()=>{this.spawnFromCreator()}),(z=this.container.querySelector("#btn-clear-entities"))==null||z.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,e=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),i=new U({name:t.name||"Custom Object",position:{x:e,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new J({radius:t.colliderRadius}):null,massModule:t.hasMass?new Q({mass:t.mass}):null,frictionModule:t.hasFriction?new tt({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new et({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new lt({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new at:null,rollModule:t.hasRollModule?new nt({rollResistance:t.rollResistance}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,e=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),i=new U({name:`${t.name} (Copy)`,position:{x:e,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new J({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new Q({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new tt({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new et({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new lt({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new at({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new nt({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,e,s,i=0){const l=this.container.querySelector(`#${t}`),o=this.container.querySelector(`#${e}`);!l||!o||l.addEventListener("input",()=>{const c=parseFloat(l.value);o.textContent=i>0?c.toFixed(i):Math.round(c).toString(),s(c)})}updateInspector(){const t=this.selectedEntity,e=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}}class St{constructor(t){r(this,"arena");r(this,"character");r(this,"objects");r(this,"renderer");r(this,"inputManager");r(this,"devPanel");r(this,"isRunning",!1);r(this,"lastTime",0);r(this,"accumulator",0);r(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let e=(t-this.lastTime)/1e3;for(this.lastTime=t,e>.2&&(e=.2),this.accumulator+=e;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;let s=null;!this.devPanel.isEditMode&&!this.character.heldObject&&this.character.pickupModule&&(s=this.character.pickupModule.findTargetObject(this.character,this.inputManager.mousePos.x,this.inputManager.mousePos.y,this.objects));const i=this.devPanel.isEditMode&&this.devPanel.editTool==="walls";this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,s,i,this.inputManager.hoverWallTile),this.devPanel.updateInspector(),requestAnimationFrame(l=>this.tick(l))}updatePhysics(t){const e=this.inputManager;e.draggedEntity!==this.character?this.character.updateCharacter(t,e.movementVector,e.isMouseDown&&!this.devPanel.isEditMode,e.mousePos,this.arena,e.isClimbHeld):(this.character.velocity.x=0,this.character.velocity.y=0);for(const i of this.objects)e.draggedEntity!==i&&i.updatePosition(t,this.arena);const s=e.isGrabHeld;if(!this.devPanel.isEditMode&&s&&!this.character.heldObject&&this.character.pickupModule){const i=this.character.pickupModule.findTargetObject(this.character,e.mousePos.x,e.mousePos.y,this.objects);i&&(this.character.pickupModule.pickup(this.character,i),e.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],e=this.inputManager,s=3;for(let i=0;i<s;i++)for(let l=0;l<t.length;l++)for(let o=l+1;o<t.length;o++){const c=t[l],a=t[o];if(c.isHeld||a.isHeld||c===e.draggedEntity||a===e.draggedEntity||!c.hasCollider||!a.hasCollider)continue;const h=this.arena.wallHeight-.15,n=c.position.z>=h||c.supportingSurfaceHeight>=h,d=a.position.z>=h||a.supportingSurfaceHeight>=h;if(n!==d)continue;const y=a.position.x-c.position.x,v=a.position.y-c.position.y,u=y*y+v*v,M=c.colliderRadius+a.colliderRadius;if(u<M*M&&u>1e-6){const m=Math.sqrt(u),p=M-m,b=y/m,f=v/m,S=a.velocity.x-c.velocity.x,x=a.velocity.y-c.velocity.y,k=S*b+x*f,w=!c.hasMass,F=!a.hasMass;if(w&&F){if(c.position.x-=b*p*.5,c.position.y-=f*p*.5,a.position.x+=b*p*.5,a.position.y+=f*p*.5,k<0){const T=-k*.5;c.velocity.x-=T*b,c.velocity.y-=T*f,a.velocity.x+=T*b,a.velocity.y+=T*f}continue}if(!w&&F){this.isEntityPinnedAgainstWall(a,b,f)?(c.position.x-=b*p,c.position.y-=f*p,c.velocity.x=0,c.velocity.y=0):(a.position.x+=b*p,a.position.y+=f*p,k<0&&(a.velocity.x+=(c.velocity.x-a.velocity.x)*Math.abs(b),a.velocity.y+=(c.velocity.y-a.velocity.y)*Math.abs(f)));continue}if(w&&!F){this.isEntityPinnedAgainstWall(c,-b,-f)?(a.position.x+=b*p,a.position.y+=f*p,a.velocity.x=0,a.velocity.y=0):(c.position.x-=b*p,c.position.y-=f*p,k<0&&(c.velocity.x+=(a.velocity.x-c.velocity.x)*Math.abs(b),c.velocity.y+=(a.velocity.y-c.velocity.y)*Math.abs(f)));continue}const C=1/c.mass,P=1/a.mass,R=C+P;if(R<=1e-4)continue;const D=C/R,W=P/R;if(c.position.x-=b*p*D,c.position.y-=f*p*D,a.position.x+=b*p*W,a.position.y+=f*p*W,k<0){const T=c instanceof ct&&c.isActivelyWalking||a instanceof ct&&a.isActivelyWalking,$=c.hasBounce&&a.hasBounce,B=c.isCharacter||!c.hasBounce?0:c.bounceMod??0,A=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,V=-(1+(T||!$?0:Math.max(0,Math.min(.98,Math.max(B,A)))))*k/R;c.velocity.x-=V*C*b,c.velocity.y-=V*C*f,a.velocity.x+=V*P*b,a.velocity.y+=V*P*f;const z=-f,g=b,O=S*z+x*g;if(Math.abs(O)>.001){const j=.35*Math.sqrt(c.dynamicGroundFrictionMod*a.dynamicGroundFrictionMod),G=.4,H=Math.abs(O)/(R*(1+1/G)),I=j*Math.abs(V),q=Math.min(H,I)*Math.sign(O);if(c.velocity.x+=q*C*z,c.velocity.y+=q*C*g,a.velocity.x-=q*P*z,a.velocity.y-=q*P*g,c.rollModule&&c.rollModule.enabled){const X=q/(G*c.mass*c.colliderRadius);c.rollModule.angularVelocity.z+=X,c.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,c.rollModule.angularVelocity.z)),c.isRestingOnSurface&&(c.rollModule.angularVelocity.y=c.velocity.x/c.colliderRadius,c.rollModule.angularVelocity.x=-c.velocity.y/c.colliderRadius)}if(a.rollModule&&a.rollModule.enabled){const X=q/(G*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z-=X,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,e,s){const i=t.colliderRadius>0?t.colliderRadius:.3,l=.05;if(e>.3&&t.position.x>=this.arena.width-i-l||e<-.3&&t.position.x<=i+l||s>.3&&t.position.y>=this.arena.height-i-l||s<-.3&&t.position.y<=i+l)return!0;for(const o of this.arena.walls)if(t.position.z<o.wallHeight-.05){const c=t.position.x+e*l,a=t.position.y+s*l,h=Math.max(o.x,Math.min(c,o.x+o.width)),n=Math.max(o.y,Math.min(a,o.y+o.height)),d=c-h,y=a-n;if(d*d+y*y<i*i)return!0}return!1}}function wt(){const E=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!E||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const e=E.getContext("2d");if(!e){console.error("Failed to acquire 2D canvas context");return}const s=new ft(20,14,1);E.width=1e3,E.height=700;const i=new ct({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),l=[new U({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new U({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new U({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new U({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new nt({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})],o=new Mt(e),c=new xt({container:t,character:i,arena:s,objects:l,onSpawnObject:n=>{l.push(n),c.updateSelectorOptions()},onDeleteObject:n=>{const d=l.indexOf(n);d!==-1&&l.splice(d,1),c.updateSelectorOptions()},onClearObjects:()=>{i.heldObject&&(i.heldObject.isHeld=!1,i.heldObject.heldBy=null,i.heldObject=null),l.length=0,c.updateSelectorOptions()}}),a=new mt(E,s);a.handleInteractions(i,s,l,c),c.onSelectionChange=n=>{a.selectedCanvasEntity=n},new St({arena:s,character:i,objects:l,renderer:o,inputManager:a,devPanel:c}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",wt);

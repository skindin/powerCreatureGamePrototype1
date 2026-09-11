var ut=Object.defineProperty;var yt=(k,t,e)=>t in k?ut(k,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):k[t]=e;var r=(k,t,e)=>yt(k,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();class pt{constructor(t=20,e=14,s=1){r(this,"width");r(this,"height");r(this,"tileSize");r(this,"cols");r(this,"rows");r(this,"wallHeight");r(this,"gravity");r(this,"frictionCoeff");r(this,"staticFrictionThreshold");r(this,"tileGrid");r(this,"walls",[]);this.width=t,this.height=e,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(e/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.setupDefaultTileMap(),this.rebuildWalls()}setupDefaultTileMap(){for(let e=1;e<=4;e++)this.tileGrid[e][10]=1;for(let e=8;e<=12;e++)this.tileGrid[e][10]=1;this.tileGrid[4][4]=1,this.tileGrid[5][4]=1,this.tileGrid[4][5]=1,this.tileGrid[5][5]=1,this.tileGrid[7][15]=1,this.tileGrid[8][15]=1,this.tileGrid[7][16]=1,this.tileGrid[8][16]=1}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let e=0;e<this.cols;e++)this.tileGrid[t][e]===1&&this.walls.push({id:`wall-${e}-${t}`,x:e*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}getWallAt(t,e){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&e>=s.y&&e<=s.y+s.height)return s;return null}testWallOverlap(t,e,s,i){const o=Math.max(i.x,Math.min(t,i.x+i.width)),l=Math.max(i.y,Math.min(e,i.y+i.height)),a=t-o,n=e-l;return a*a+n*n<s*s}getSupportingWall(t,e,s=0){if(s<=0)return this.getWallAt(t,e);for(const i of this.walls)if(this.testWallOverlap(t,e,s,i))return i;return null}getSupportingSurfaceHeight(t,e,s=0){const i=this.getSupportingWall(t,e,s);return i?i.wallHeight:0}}class _{constructor(t={}){r(this,"radius");r(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class K{constructor(t={}){r(this,"mass");r(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class J{constructor(t={}){r(this,"staticFrictionMod");r(this,"dynamicFrictionMod");r(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class Q{constructor(t={}){r(this,"bounceMod");r(this,"verticalBounce");r(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class et{constructor(t={}){r(this,"enabled");this.enabled=t.enabled??!0}}class it{constructor(t={}){r(this,"z");r(this,"hasVerticalVelocity");r(this,"verticalVelocity");r(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}class Z{constructor(t={}){r(this,"id");r(this,"name");r(this,"position");r(this,"velocity");r(this,"color");r(this,"isHeld");r(this,"heldBy");r(this,"isCharacter",!1);r(this,"visualShape","circle");r(this,"colliderModule",null);r(this,"massModule",null);r(this,"frictionModule",null);r(this,"bounceModule",null);r(this,"verticalPositionModule",null);r(this,"gravityModule",null);r(this,"rollModule",null);r(this,"supportingSurfaceHeight",0);var e,s,i,o,l;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((e=t.position)==null?void 0:e.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((i=t.position)==null?void 0:i.z)??0},this.velocity={x:((o=t.velocity)==null?void 0:o.x)??0,y:((l=t.velocity)==null?void 0:l.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new _({radius:t.colliderRadius}):new _({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new K({mass:t.mass}):new K({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new J({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new Q({bounceMod:t.bounceMod}):new Q({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new it({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new et,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new _({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new K({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new J({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new J({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new Q({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.95||this.supportingSurfaceHeight>=.95)}updatePosition(t,e){var n;if(this.isHeld)return;this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0,i=null;if(this.hasCollider&&this.hasVerticalPosition&&(i=this.position.z>=e.wallHeight-.15||this.supportingSurfaceHeight>.01&&this.position.z>=e.wallHeight-.35?e.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null,s=i?i.wallHeight:0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=e.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const d=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const c=this.rollModule,h=this.colliderRadius>0?this.colliderRadius:.3,y=.4,p=this.bounceMod,b=(1+p)*this.mass*d,x=e.frictionCoeff*this.dynamicGroundFrictionMod*.05,v=this.velocity.x-c.angularVelocity.y*h,M=this.velocity.y+c.angularVelocity.x*h,g=Math.hypot(v,M);if(g>.001&&x>0){const m=x*b,S=g*this.mass/(1+1/y),w=Math.min(S,m),E=v/g*w,C=M/g*w;this.velocity.x-=E/this.mass,this.velocity.y-=C/this.mass,c.angularVelocity.y+=E/(y*this.mass*h),c.angularVelocity.x-=C/(y*this.mass*h)}const f=Math.max(.65,1-(1-p)*.35);c.angularVelocity.x*=f,c.angularVelocity.y*=f,c.angularVelocity.z*=f}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((n=this.walkingModule)==null?void 0:n.enabled)))if(this.rollModule&&this.rollModule.enabled){const c=this.rollModule,h=this.colliderRadius>0?this.colliderRadius:.3,y=e.frictionCoeff*this.dynamicGroundFrictionMod,p=.4,b=this.velocity.x-c.angularVelocity.y*h,x=this.velocity.y+c.angularVelocity.x*h,v=Math.hypot(b,x);if(y>0&&v>.001){const g=y*(1+1/p)*t;if(v<=g){const f=this.velocity.x+p*c.angularVelocity.y*h,m=this.velocity.y-p*c.angularVelocity.x*h,S=f/(1+p),w=m/(1+p);this.velocity.x=S,this.velocity.y=w,c.angularVelocity.y=S/h,c.angularVelocity.x=-w/h}else{const f=b/v*y*t,m=x/v*y*t;this.velocity.x-=f,this.velocity.y-=m,c.angularVelocity.y+=f/(p*h),c.angularVelocity.x-=m/(p*h)}}const M=Math.hypot(this.velocity.x,this.velocity.y);if(M>0){if(c.rollResistance>0){const g=c.rollResistance*t,f=Math.max(0,M-g);if(f<.005)this.velocity.x=0,this.velocity.y=0,c.angularVelocity.x=0,c.angularVelocity.y=0;else{const m=f/M;this.velocity.x*=m,this.velocity.y*=m,c.angularVelocity.x*=m,c.angularVelocity.y*=m}}}else{const g=Math.hypot(c.angularVelocity.x,c.angularVelocity.y);if(g>0&&y>0){const f=y/(p*h)*t,m=Math.max(0,g-f),S=g>0?m/g:0;c.angularVelocity.x*=S,c.angularVelocity.y*=S}}if(Math.abs(c.angularVelocity.z)>.001&&c.rollResistance>0){const g=c.rollResistance/(p*h)*t,f=Math.sign(c.angularVelocity.z),m=Math.abs(c.angularVelocity.z);c.angularVelocity.z=m<=g?0:f*(m-g)}c.updateVisualPhase(t)}else{const c=Math.hypot(this.velocity.x,this.velocity.y);if(c>0){const h=e.staticFrictionThreshold*this.staticGroundFrictionMod;if(c<h)this.velocity.x=0,this.velocity.y=0;else{const y=e.frictionCoeff*this.dynamicGroundFrictionMod*t,b=Math.max(0,c-y)/c;this.velocity.x*=b,this.velocity.y*=b}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);if(this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t,this.hasCollider){const d=this.colliderRadius,c=d,h=e.width-d,y=d,p=e.height-d,b=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;if(this.position.x<c?(this.position.x=c,this.resolveWallImpact(1,0,b)):this.position.x>h&&(this.position.x=h,this.resolveWallImpact(-1,0,b)),this.position.y<y?(this.position.y=y,this.resolveWallImpact(0,1,b)):this.position.y>p&&(this.position.y=p,this.resolveWallImpact(0,-1,b)),!i)for(const x of e.walls)this.position.z<x.wallHeight-.05&&this.resolveWallCollision(x)}const l=16,a=Math.hypot(this.velocity.x,this.velocity.y);if(a>l){const d=l/a;this.velocity.x*=d,this.velocity.y*=d}if(this.rollModule&&this.rollModule.enabled){const c=this.rollModule.angularSpeed;if(c>35){const h=35/c;this.rollModule.angularVelocity.x*=h,this.rollModule.angularVelocity.y*=h,this.rollModule.angularVelocity.z*=h}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}resolveWallImpact(t,e,s){const i=this.velocity.x*t+this.velocity.y*e;if(i>=0)return;const o=i;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*o*t,this.velocity.y-=(1+s)*o*e):(this.velocity.x-=o*t,this.velocity.y-=o*e),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const l=this.rollModule,a=this.colliderRadius>0?this.colliderRadius:.3,n=.4,d=.35,c=-e,h=t,y=this.velocity.x*c+this.velocity.y*h,p=-(1+s)*this.mass*o,b=y-l.angularVelocity.z*a,x=Math.abs(b)*this.mass/(1+1/n),v=d*p,M=Math.min(x,v),g=-Math.sign(b)*M,f=y,m=f+g/this.mass,S=Math.abs(m)<=Math.abs(f)+.01?m-f:-f*.1;this.velocity.x+=S*c,this.velocity.y+=S*h;const E=-(S*this.mass)/(n*this.mass*a);l.angularVelocity.z+=E,l.angularVelocity.z=Math.max(-30,Math.min(30,l.angularVelocity.z)),l.angularVelocity.y=this.velocity.x/a,l.angularVelocity.x=-this.velocity.y/a}}resolveWallCollision(t){if(!this.hasCollider)return;const e=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),i=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),o=this.position.x-s,l=this.position.y-i,a=o*o+l*l;if(a<e*e){const n=Math.sqrt(a);let d=0,c=0,h=0;if(n===0){const p=Math.abs(this.position.x-t.x),b=Math.abs(t.x+t.width-this.position.x),x=Math.abs(this.position.y-t.y),v=Math.abs(t.y+t.height-this.position.y),M=Math.min(p,b,x,v);M===p?(d=-1,h=p+e):M===b?(d=1,h=b+e):M===x?(c=-1,h=x+e):(c=1,h=v+e)}else h=e-n,d=o/n,c=l/n;this.position.x+=d*h,this.position.y+=c*h;const y=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(d,c,y)}}}class rt{constructor(){r(this,"id","walking");r(this,"name","Walking Module");r(this,"enabled",!0);r(this,"maxWalkForce",35);r(this,"maxWalkSpeed",5.2);r(this,"dragDamping",8.01)}update(t,e,s,i){var E;if(!this.enabled||t.isAboveGround){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((E=t.frictionModule)!=null&&E.enabled)||!t.hasMass){t.isActivelyWalking=!1;return}const o=Math.hypot(e.x,e.y),l=o>.05;t.isActivelyWalking=l;const a=t.mass;if(a<=.01)return;const n=t.dynamicGroundFrictionMod;if(n<=.001)return;const d=i.frictionCoeff/10,c=n*d,y=t.carriedMass/(Math.max(.1,t.strength)*8),p=this.maxWalkSpeed/(1+y);let b=0,x=0;if(l){const C=e.x/o,F=e.y/o;b=C*p,x=F*p}const v=b-t.velocity.x,M=x-t.velocity.y,g=Math.hypot(v,M);if(g<.001){t.velocity.x=b,t.velocity.y=x;return}const f=Math.hypot(t.velocity.x,t.velocity.y),m=Math.max(.02,i.staticFrictionThreshold*t.staticGroundFrictionMod),w=this.maxWalkForce*t.strength/a*c*s;if(g<=w||!l&&f<m)t.velocity.x=b,t.velocity.y=x;else{const C=w/g;t.velocity.x+=v*C,t.velocity.y+=M*C}}}class dt{constructor(){r(this,"id","pickup");r(this,"name","Pickup Ability");r(this,"enabled",!0);r(this,"pickupReach",1.3)}findTargetObject(t,e,s,i){if(!this.enabled)return null;let o=null,l=1/0;for(const a of i){if(a===t||a.isHeld||Math.hypot(a.position.x-t.position.x,a.position.y-t.position.y)>this.pickupReach+a.colliderRadius)continue;const d=Math.hypot(a.position.x-e,a.position.y-s);d<l&&d<=a.colliderRadius+.65&&(l=d,o=a)}return o}pickup(t,e){if(!this.enabled||t.heldObject)return!1;const s=e.velocity.x,i=e.velocity.y,o=e.mass/Math.max(.2,t.mass);return t.velocity.x+=s*o,t.velocity.y+=i*o,t.isAboveGround&&Math.abs(e.verticalVelocity)>.1&&(t.verticalVelocity+=e.verticalVelocity*o),t.heldObject=e,e.isHeld=!0,e.heldBy=t,e.velocity.x=0,e.velocity.y=0,e.verticalVelocity=0,e.position.z=e.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const e=t.heldObject;return t.heldObject=null,e.isHeld=!1,e.heldBy=null,e.velocity.x=t.velocity.x*.4,e.velocity.y=t.velocity.y*.4,e.verticalVelocity=0,e}}class ht{constructor(){r(this,"id","throw");r(this,"name","Throw Ability");r(this,"enabled",!0);r(this,"baseThrowForce",7.6);r(this,"maxThrowAimDistance",13)}testWallIntersection(t,e,s,i){const o=Math.max(i.x,Math.min(t,i.x+i.width)),l=Math.max(i.y,Math.min(e,i.y+i.height)),a=t-o,n=e-l;return a*a+n*n<s*s}computeLaunchVelocity(t,e,s,i,o,l,a,n=!0,d=!0){const c=i-t,h=o-e,y=Math.hypot(c,h);if(y<.1)return null;const p=Math.min(y,this.maxThrowAimDistance),b=c/y,x=h/y,v=t+b*p,M=e+x*p;if(!n||!d){const B=Math.max(3,a),R=Math.max(.14,p/B),$=b*B,O=x*B;return{vx:$,vy:O,vz:0,totalTime:R,finalTargetX:v,finalTargetY:M,targetSurfaceHeight:s}}const g=l.getSupportingSurfaceHeight(v,M),f=Math.max(3,a);let S=Math.max(.14,p/f);const w=35,E=.35;for(let B=1;B<w;B++){const R=B/w,$=t+(v-t)*R,O=e+(M-e)*R;for(const u of l.walls)if(this.testWallIntersection($,O,E,u)){if(g>0&&v>=u.x&&v<=u.x+u.width&&M>=u.y&&M<=u.y+u.height&&R>.65)continue;const j=(1-R)*s+R*g,D=u.wallHeight+.3-j;if(D>0){const T=2*D/(l.gravity*R*(1-R));if(T>0){const H=Math.sqrt(T);H>S&&(S=H)}}}}if(S<=.05)return null;const C=(g-s+.5*l.gravity*S*S)/S,F=p/S,V=b*F,P=x*F;return{vx:V,vy:P,vz:C,totalTime:S,finalTargetX:v,finalTargetY:M,targetSurfaceHeight:g}}calculateTrajectory(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const o=t.heldObject,l=o.position.x,a=o.position.y,n=o.position.z,d=this.baseThrowForce*t.strength,c=o.hasGravity&&o.hasVerticalVelocity,h=this.computeLaunchVelocity(l,a,n,e,s,i,d,o.hasGravity,o.hasVerticalVelocity);if(!h)return null;const{vx:y,vy:p,vz:b,totalTime:x,finalTargetX:v,finalTargetY:M,targetSurfaceHeight:g}=h,f=90,m=x/f,S=[];let w=!1,E=g>0,C;for(let V=0;V<=f;V++){const P=V*m,B=V===f?v:l+y*P,R=V===f?M:a+p*P,$=c?n+b*P-.5*i.gravity*P*P:n,O=c?V===f?g:Math.max(g,$):n,u=c?b-i.gravity*P:0,z=O>i.wallHeight;let j=!1,A=!1;for(const D of i.walls)if(this.testWallIntersection(B,R,o.colliderRadius,D)&&(j=!0,O<=D.wallHeight+.001)){if(S.length>0&&S[S.length-1].z>=D.wallHeight-.05&&u<=0){if(g>0&&(V>=f-2||Math.hypot(B-v,R-M)<.2)){E=!0;break}else if(g===0){E=!0,A=!0,w=!0,C=D.id;break}}else if(O<D.wallHeight-.05){A=!0,w=!0,C=D.id;break}}if(S.push({x:B,y:R,z:O,t:P,couldClearWall:z,isOverWall:j,collidesWall:A}),A)break}const F=S[S.length-1];return{points:S,landPoint:{x:w?F.x:v,y:w?F.y:M},isBlockedByWall:w,isLandingOnWallTop:w?E:g>0,blockedAtWallId:C}}throwHeldObject(t,e,s,i){if(!this.enabled||!t.heldObject)return null;const o=t.heldObject,l=o.position.x,a=o.position.y,n=o.position.z,d=this.baseThrowForce*t.strength,c=this.computeLaunchVelocity(l,a,n,e,s,i,d,o.hasGravity,o.hasVerticalVelocity);if(!c)return null;if(o.isHeld=!1,o.heldBy=null,o.velocity.x=c.vx,o.velocity.y=c.vy,o.verticalVelocity=c.vz,o.position.z=o.hasVerticalPosition?Math.max(.3,o.position.z):0,o.hasFriction&&o.rollModule&&o.rollModule.enabled){const b=o.colliderRadius>0?o.colliderRadius:.3;o.rollModule.angularVelocity.y=c.vx/b,o.rollModule.angularVelocity.x=-c.vy/b}const h=o.hasMass?o.mass:0,y=t.hasMass?Math.max(.2,t.baseMass):0,p=h>0&&y>0?h/y:0;return t.heldObject=null,t.velocity.x-=c.vx*p,t.velocity.y-=c.vy*p,o}}class X extends Z{constructor(e={}){super({name:e.name??"Player Character",position:{x:e.x??5,y:e.y??7,z:0},mass:e.mass??1.2,colliderRadius:e.colliderRadius??.44,color:e.color??"#f59e0b",bounceMod:.1});r(this,"strength");r(this,"facingAngle");r(this,"heldObject");r(this,"isCharacter",!0);r(this,"isActivelyWalking",!1);r(this,"baseMass",1.2);r(this,"walkingModule");r(this,"pickupModule");r(this,"throwModule");r(this,"isAiming");r(this,"aimTarget");r(this,"activeTrajectory");r(this,"playerId","");r(this,"isLocalPlayer",!0);this.playerId=e.playerId??"",this.isLocalPlayer=e.isLocalPlayer??!0,this.baseMass=e.mass??1.2,this.strength=e.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.walkingModule=new rt,this.pickupModule=new dt,this.throwModule=new ht}get mass(){const e=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return e+s}set mass(e){this.baseMass=Math.max(.1,e),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}updateFacingDirection(e,s,i){if((this.heldObject!==null||e)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const o=s.x-this.position.x,l=s.y-this.position.y;if(Math.hypot(o,l)>.1){this.facingAngle=Math.atan2(l,o);return}}i&&Math.hypot(i.x,i.y)>.05&&(this.facingAngle=Math.atan2(i.y,i.x))}updateCharacter(e,s,i,o,l){if(this.walkingModule&&this.walkingModule.update(this,s,e,l),this.updatePosition(e,l),this.updateFacingDirection(i,o,s),this.heldObject){const a=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*a,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*a,this.heldObject.position.z=this.heldObject.hasVerticalPosition?.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||i,this.aimTarget=o,this.heldObject&&this.throwModule&&o?this.activeTrajectory=this.throwModule.calculateTrajectory(this,o.x,o.y,l):this.activeTrajectory=null}}class st{constructor(t={}){r(this,"enabled",!0);r(this,"angularVelocity",{x:0,y:0,z:0});r(this,"rollResistance",.4);r(this,"visualPhase",0);var e,s,i;this.enabled=t.enabled??!0,this.angularVelocity={x:((e=t.angularVelocity)==null?void 0:e.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((i=t.angularVelocity)==null?void 0:i.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const e=this.angularSpeed;e>.001&&(this.visualPhase=(this.visualPhase+e*t)%(Math.PI*2))}}class vt{constructor(t){r(this,"ctx");this.ctx=t}render(t,e,s,i,o=!1,l,a=[]){const n=this.ctx,d=n.canvas.width/t.width;n.clearRect(0,0,n.canvas.width,n.canvas.height),this.drawFloorGrid(t,d),this.drawWalls(t,d);const c=[e,...a,...s];c.sort((h,y)=>Math.abs(h.position.z-y.position.z)>.001?h.position.z-y.position.z:Math.abs(h.verticalVelocity-y.verticalVelocity)>.001?h.verticalVelocity-y.verticalVelocity:h.position.y-y.position.y);for(const h of c)h instanceof X?this.drawCharacter(h,s,d):this.drawFreebodyObject(h,c,e,d);for(const h of c)this.drawObjectShadow(h,t,d);e.activeTrajectory&&this.drawTrajectory(e.activeTrajectory,d),o&&(l&&l!==i&&this.drawHoverGizmo(l,d),i&&this.drawSelectionGizmo(i,o,d))}drawFloorGrid(t,e){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*e,t.height*e),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let i=1;i<t.width;i++)s.beginPath(),s.moveTo(i*e,0),s.lineTo(i*e,t.height*e),s.stroke();for(let i=1;i<t.height;i++)s.beginPath(),s.moveTo(0,i*e),s.lineTo(t.width*e,i*e),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*e-3,t.height*e-3)}drawWalls(t,e){const s=this.ctx;for(const i of t.walls)s.fillStyle="#1e293b",s.fillRect(i.x*e,i.y*e,i.width*e,i.height*e),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(i.x*e,i.y*e,i.width*e,i.height*e)}drawObjectShadow(t,e,s){const i=this.ctx,o=t.position.x*s,l=t.position.y*s,a=t.position.z,n=1+a/e.wallHeight*1.5,d=t.colliderRadius*s*n,c=Math.max(.3,.85-a/(e.wallHeight*7)*.25),h=a>e.wallHeight;if(i.save(),i.beginPath(),t.visualShape==="box"){const y=d*2,p=Math.max(3,4*n);i.roundRect?i.roundRect(o-d,l-d,y,y,p):i.rect(o-d,l-d,y,y)}else i.arc(o,l,d,0,Math.PI*2);h?(i.strokeStyle=`rgba(56, 189, 248, ${c})`,i.lineWidth=2.5):(i.strokeStyle=`rgba(255, 255, 255, ${c})`,i.lineWidth=1.8),a>.01&&i.setLineDash([4,3]),i.stroke(),i.restore()}drawFreebodyObject(t,e,s,i){var b,x;const o=this.ctx,l=t.position.x*i,a=t.position.y*i,n=t.hasCollider?t.colliderRadius:((b=t.colliderModule)==null?void 0:b.radius)??.32,d=n*i,c=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled,h=Math.hypot(t.position.x-s.position.x,t.position.y-s.position.y),y=c&&!t.isHeld&&h<=(((x=s.pickupModule)==null?void 0:x.pickupReach)??1.3)+n;if(y){if(o.save(),o.beginPath(),t.visualShape==="box"){const v=(d+5)*2;o.roundRect?o.roundRect(l-d-5,a-d-5,v,v,6):o.rect(l-d-5,a-d-5,v,v)}else o.arc(l,a,d+5,0,Math.PI*2);o.strokeStyle="#38bdf8",o.lineWidth=2.5,o.setLineDash([4,4]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 10px sans-serif",o.textAlign="center",o.fillText("grab",l,a-d-6),o.restore()}let p=!1;if(t.isAboveGround)for(const v of e){if(v===t)continue;if(Math.hypot(t.position.x-v.position.x,t.position.y-v.position.y)<t.colliderRadius+v.colliderRadius&&(t.position.z>v.position.z||Math.abs(t.position.z-v.position.z)<=.01&&t.verticalVelocity>v.verticalVelocity)){p=!0;break}}if(o.save(),o.globalAlpha=p?.55:1,t.visualShape==="box"){const v=d*2,M=Math.max(3,d*.16),g=l-d,f=a-d;o.beginPath(),o.roundRect?o.roundRect(g,f,v,v,M):o.rect(g,f,v,v),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();const m=Math.max(3,d*.22);o.beginPath(),o.roundRect?o.roundRect(g+m,f+m,v-m*2,v-m*2,M*.7):o.rect(g+m,f+m,v-m*2,v-m*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(g+m,f+m),o.lineTo(g+v-m,f+v-m),o.moveTo(g+v-m,f+m),o.lineTo(g+m,f+v-m),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(l,a,d,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=y?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=y?2.5:2,o.stroke();this.drawRollIndicator(t,l,a,d),o.restore()}drawCharacter(t,e,s){const i=this.ctx,o=t.position.x*s,l=t.position.y*s,a=t.colliderRadius*s;let n=!1;if(t.isAboveGround)for(const S of e){if(S===t)continue;if(Math.hypot(t.position.x-S.position.x,t.position.y-S.position.y)<t.colliderRadius+S.colliderRadius&&(t.position.z>S.position.z||Math.abs(t.position.z-S.position.z)<=.01&&t.verticalVelocity>S.verticalVelocity)){n=!0;break}}i.save(),i.globalAlpha=n?.55:1,i.beginPath(),i.arc(o,l,a,0,Math.PI*2),i.fillStyle=t.color,i.fill(),i.strokeStyle="#ffffff",i.lineWidth=2.5,i.stroke(),this.drawRollIndicator(t,o,l,a);const d=.52,c=a*.72,h=Math.max(3.5,a*.18),y=t.facingAngle-d,p=t.facingAngle+d,b=o+Math.cos(y)*c,x=l+Math.sin(y)*c,v=o+Math.cos(p)*c,M=l+Math.sin(p)*c;i.fillStyle="#000000",i.beginPath(),i.arc(b,x,h,0,Math.PI*2),i.arc(v,M,h,0,Math.PI*2),i.fill(),t.heldObject&&(i.strokeStyle="rgba(255, 255, 255, 0.6)",i.setLineDash([3,3]),i.lineWidth=1.5,i.beginPath(),i.moveTo(o,l),i.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),i.stroke(),i.setLineDash([])),i.save(),i.font="bold 11px Inter, system-ui, -apple-system, sans-serif",i.textAlign="center";const g=t.isLocalPlayer?"You":t.name,f=l-a-10,m=i.measureText(g).width;i.fillStyle="rgba(15, 23, 42, 0.85)",i.beginPath(),i.roundRect?i.roundRect(o-m/2-6,f-11,m+12,16,8):i.rect(o-m/2-6,f-11,m+12,16),i.fill(),i.strokeStyle=t.color,i.lineWidth=t.isLocalPlayer?1.8:1.2,i.stroke(),i.fillStyle="#f8fafc",i.fillText(g,o,f+1),i.restore(),i.restore()}drawRollIndicator(t,e,s,i){if(!t.rollModule||!t.rollModule.enabled)return;const o=t.rollModule,l=o.angularVelocity.x,a=o.angularVelocity.y,n=o.angularVelocity.z,d=Math.hypot(l,a,n);if(d<.02)return;const c=this.ctx,y=Math.hypot(l,a)<.05*d;if(c.save(),y){const p=i*.45,b=i*.78;c.beginPath(),c.arc(e,s,p,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.45)",c.lineWidth=1.5,c.setLineDash([]),c.stroke(),c.beginPath(),c.arc(e,s,b,0,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2,c.setLineDash([4,4]),c.lineDashOffset=-o.visualPhase*b*Math.sign(n||1),c.stroke()}else{const p=Math.atan2(-l,a),b=i*.82,x=Math.abs(n)/d,v=b*Math.pow(x,.85);c.translate(e,s),c.rotate(p);const M=n!==0?Math.sign(n):1;v<.5?(c.beginPath(),c.moveTo(-b,0),c.lineTo(b,0),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2.2,c.setLineDash([4,4]),c.lineDashOffset=-o.visualPhase*b,c.stroke()):(c.beginPath(),c.ellipse(0,0,b,v,0,0,Math.PI),c.strokeStyle="rgba(255, 255, 255, 0.95)",c.lineWidth=2.2,c.setLineDash([4,4]),c.lineDashOffset=-o.visualPhase*b*M,c.stroke(),c.beginPath(),c.ellipse(0,0,b,v,0,Math.PI,Math.PI*2),c.strokeStyle="rgba(255, 255, 255, 0.25)",c.lineWidth=1.8,c.setLineDash([4,4]),c.lineDashOffset=-o.visualPhase*b*M,c.stroke())}c.restore()}drawTrajectory(t,e){const s=this.ctx,i=t.points;if(i.length<2)return;s.save();for(let l=0;l<i.length-1;l++){const a=i[l],n=i[l+1];s.beginPath(),s.moveTo(a.x*e,a.y*e),s.lineTo(n.x*e,n.y*e),a.couldClearWall||n.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const o=i[i.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const l=8;s.beginPath(),s.moveTo(o.x*e-l,o.y*e-l),s.lineTo(o.x*e+l,o.y*e+l),s.moveTo(o.x*e+l,o.y*e-l),s.lineTo(o.x*e-l,o.y*e+l),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*e,t.landPoint.y*e,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,e){var n;const s=this.ctx,i=t.position.x*e,o=t.position.y*e,a=((t.hasCollider?t.colliderRadius:((n=t.colliderModule)==null?void 0:n.radius)??.32)+.08)*e;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(i,o,a,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,e,s){var y;const i=this.ctx,o=t.position.x*s,l=t.position.y*s,d=(t.hasCollider?t.colliderRadius:((y=t.colliderModule)==null?void 0:y.radius)??.32)*s+6,c=Math.max(6,d*.4),h=e?"#fbbf24":"#38bdf8";if(i.save(),i.strokeStyle=h,i.lineWidth=2,i.setLineDash([]),i.beginPath(),i.moveTo(o-d,l-d+c),i.lineTo(o-d,l-d),i.lineTo(o-d+c,l-d),i.stroke(),i.beginPath(),i.moveTo(o+d-c,l-d),i.lineTo(o+d,l-d),i.lineTo(o+d,l-d+c),i.stroke(),i.beginPath(),i.moveTo(o+d,l+d-c),i.lineTo(o+d,l+d),i.lineTo(o+d-c,l+d),i.stroke(),i.beginPath(),i.moveTo(o-d+c,l+d),i.lineTo(o-d,l+d),i.lineTo(o-d,l+d-c),i.stroke(),e){const p=`${t.name} (${t.mass.toFixed(1)}kg)`;i.font="bold 10px 'Segoe UI', system-ui, sans-serif";const x=i.measureText(p).width+12,v=16,M=o-x/2,g=l-d-v-4;i.fillStyle="rgba(15, 23, 42, 0.85)",i.strokeStyle=h,i.lineWidth=1,i.beginPath(),i.roundRect(M,g,x,v,4),i.fill(),i.stroke(),i.fillStyle=h,i.textAlign="center",i.textBaseline="middle",i.fillText(p,o,g+v/2)}i.restore()}}class gt{constructor(t,e){r(this,"canvas");r(this,"arena");r(this,"keysPressed",new Set);r(this,"mousePos",{x:0,y:0});r(this,"isMouseDown",!1);r(this,"movementVector",{x:0,y:0});r(this,"justPickedUp",!1);r(this,"hoverEntity",null);r(this,"selectedCanvasEntity",null);r(this,"draggedEntity",null);r(this,"dragOffset",{x:0,y:0});r(this,"handleClick");r(this,"onMouseDown");r(this,"onMouseUp");r(this,"onRightClick");r(this,"onDropAttempt");r(this,"onMouseMove");r(this,"onActionAttempt");this.canvas=t,this.arena=e,this.setupListeners()}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{t.button!==2&&t.button===0&&(this.isMouseDown=!0,this.updateMousePos(t),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateTouchPos(t){const e=this.canvas.getBoundingClientRect(),s=this.arena.width/e.width,i=this.arena.height/e.height;this.mousePos.x=(t.clientX-e.left)*s,this.mousePos.y=(t.clientY-e.top)*i}updateMovementVector(){let t=0,e=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(e-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(e+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,e);s>0?(this.movementVector.x=t/s,this.movementVector.y=e/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,e,s,i){i&&(this.selectedCanvasEntity=i.selectedEntity);const o=(l,a,n=.35)=>{var h;for(let y=s.length-1;y>=0;y--){const p=s[y],b=p.hasCollider?p.colliderRadius:((h=p.colliderModule)==null?void 0:h.radius)??.32;if(Math.hypot(p.position.x-l,p.position.y-a)<=b+n)return p}const d=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-l,t.position.y-a)<=d+n?t:null};this.onMouseDown=(l,a)=>{if(i!=null&&i.isEditMode){const n=o(l,a,.35);n?(this.selectedCanvasEntity=n,i.setSelectedEntity(n),this.draggedEntity=n,this.dragOffset.x=n.position.x-l,this.dragOffset.y=n.position.y-a,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onMouseMove=(l,a)=>{var n;if(i!=null&&i.isEditMode)if(this.isMouseDown&&this.draggedEntity){const d=l+this.dragOffset.x,c=a+this.dragOffset.y,h=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((n=this.draggedEntity.colliderModule)==null?void 0:n.radius)??.32;this.draggedEntity.position.x=Math.max(h,Math.min(e.width-h,d)),this.draggedEntity.position.y=Math.max(h,Math.min(e.height-h,c)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const d=o(l,a,.3);this.hoverEntity=d,this.canvas.style.cursor=d?"grab":"crosshair"}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(l,a)=>{if(this.draggedEntity&&(this.draggedEntity=null),i!=null&&i.isEditMode){const n=o(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=n,this.canvas.style.cursor=n?"grab":"crosshair"}},this.handleClick=(l,a)=>{var n,d;if(!(i!=null&&i.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,l,a,e),(n=this.onActionAttempt)==null||n.call(this,"throw",void 0,l,a);return}if(!t.heldObject&&t.pickupModule){const c=t.pickupModule.findTargetObject(t,l,a,s);c&&(t.pickupModule.pickup(t,c),this.justPickedUp=!0,(d=this.onActionAttempt)==null||d.call(this,"pickup",c.id))}}},this.onRightClick=(l,a)=>{if(!i)return;const n=o(l,a,.4);n&&(this.selectedCanvasEntity=n,i.setSelectedEntity(n))},this.onDropAttempt=()=>{var l;t.heldObject&&t.pickupModule&&(t.pickupModule.drop(t),(l=this.onActionAttempt)==null||l.call(this,"drop"))}}}class ft{constructor(t){r(this,"container");r(this,"character");r(this,"arena");r(this,"objects");r(this,"onSpawnObject");r(this,"onDeleteObject");r(this,"onClearObjects");r(this,"selectedEntity");r(this,"isEditMode",!1);r(this,"isHost",!0);r(this,"hostName","Host");r(this,"onSelectionChange");r(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});r(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});r(this,"inspectorEl");r(this,"entitySelectorEl");r(this,"characterSpecificControlsEl");r(this,"objectSpecificControlsEl");r(this,"modePlayBtn");r(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var e;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(e=this.onSelectionChange)==null||e.call(this,t)}setMode(t){!this.isHost&&t||(this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit"))))}setHost(t,e="Host"){this.isHost=t,this.hostName=e,!t&&this.isEditMode&&this.setMode(!1);const s=this.container.querySelector("#role-badge");s&&(s.textContent=t?"👑 Room Host (Dev Tools)":"🎮 Guest (Play Mode)",s.className=`badge ${t?"badge-host":"badge-guest"}`);const i=this.container.querySelector("#host-lock-banner");if(i){i.style.display=t?"none":"block";const a=i.querySelector("span");a&&(a.textContent=`🔒 Dev tools restricted to Room Host (${this.hostName}). You are in Play Mode.`)}this.modeEditBtn&&(t?(this.modeEditBtn.removeAttribute("disabled"),this.modeEditBtn.style.opacity="1",this.modeEditBtn.style.cursor="pointer",this.modeEditBtn.title=""):(this.modeEditBtn.setAttribute("disabled","true"),this.modeEditBtn.style.opacity="0.4",this.modeEditBtn.style.cursor="not-allowed",this.modeEditBtn.title="Edit Mode is restricted to Room Host"));const o=this.container.querySelector("#section-world-spawner");o&&(o.style.display=t?"block":"none");const l=this.container.querySelector("#section-arena-physics");l&&(l.style.display=t?"block":"none")}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let e=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const i of this.objects){const o=i.id===t?"selected":"",l=i.visualShape==="box"?"📦":"⚪",a=i.hasMass?`${i.mass.toFixed(1)}kg`:"Massless";e+=`<option value="${i.id}" ${o}>${l} ${i.name} (${a})</option>`}this.entitySelectorEl.innerHTML=e;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,e,s,i,o,l,a,n,d,c,h,y,p,b,x,v,M,g,f,m,S,w,E,C,F,V,P,B,R,$,O,u,z,j,A,D,T,H,I,W,G,N,L,q,tt,Y,U;this.container.innerHTML=`
      <div class="dev-panel-header">
        <div class="header-top-row">
          <h2>🛠️ Sandbox & Engine</h2>
          <span id="role-badge" class="badge ${this.isHost?"badge-host":"badge-guest"}">
            ${this.isHost?"👑 Room Host (Dev Tools)":"🎮 Guest (Play Mode)"}
          </span>
        </div>
        <div id="host-lock-banner" class="host-lock-banner" style="display: ${this.isHost?"none":"block"};">
          <span>🔒 Dev tools restricted to Room Host (${this.hostName}). You are in Play Mode.</span>
        </div>
        <div class="mode-switcher">
          <button id="mode-play" class="mode-btn ${this.isEditMode?"":"active-play"}">🎮 Play Mode</button>
          <button id="mode-edit" class="mode-btn ${this.isEditMode?"active-edit":""}" ${this.isHost?"":'disabled style="opacity: 0.4; cursor: not-allowed;" title="Edit Mode restricted to Room Host"'}>✏️ Edit Mode</button>
        </div>
      </div>

      <div class="dev-scrollable">
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
            <div id="warn-friction-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((a=this.selectedEntity.frictionModule)!=null&&a.enabled)?"block":"none"};">
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
                  <span id="val-entity-dynamic-fric">${(((h=this.selectedEntity.frictionModule)==null?void 0:h.dynamicFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${((y=this.selectedEntity.frictionModule)==null?void 0:y.dynamicFrictionMod)??1}">
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
              <button id="toggle-mod-bounce" class="btn-toggle ${(b=this.selectedEntity.bounceModule)!=null&&b.enabled?"active":""}">
                ${(x=this.selectedEntity.bounceModule)!=null&&x.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((v=this.selectedEntity.bounceModule)!=null&&v.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(M=this.selectedEntity.bounceModule)!=null&&M.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((g=this.selectedEntity.bounceModule)==null?void 0:g.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((f=this.selectedEntity.bounceModule)==null?void 0:f.bounceMod)??.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${(m=this.selectedEntity.bounceModule)!=null&&m.verticalBounce?"checked":""}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${(S=this.selectedEntity.bounceModule)!=null&&S.enabled&&((w=this.selectedEntity.bounceModule)!=null&&w.verticalBounce)&&!this.selectedEntity.hasVerticalVelocity?"block":"none"};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${(E=this.selectedEntity.bounceModule)!=null&&E.enabled?"none":"block"};">
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
                ${(F=this.selectedEntity.rollModule)!=null&&F.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(V=this.selectedEntity.rollModule)!=null&&V.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${(P=this.selectedEntity.rollModule)!=null&&P.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(((B=this.selectedEntity.rollModule)==null?void 0:B.rollResistance)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${((R=this.selectedEntity.rollModule)==null?void 0:R.rollResistance)??.4}">
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
                <button id="toggle-walk" class="btn-toggle ${($=this.character.walkingModule)!=null&&$.enabled?"active":""}">
                  ${(O=this.character.walkingModule)!=null&&O.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((u=this.character.walkingModule)!=null&&u.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="group-mod-walking" style="display: ${(z=this.character.walkingModule)!=null&&z.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((j=this.character.walkingModule)==null?void 0:j.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((A=this.character.walkingModule)==null?void 0:A.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((D=this.character.walkingModule)==null?void 0:D.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((T=this.character.walkingModule)==null?void 0:T.maxWalkSpeed)??5.2}">
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
                <button id="toggle-pickup" class="btn-toggle ${(H=this.character.pickupModule)!=null&&H.enabled?"active":""}">
                  ${(I=this.character.pickupModule)!=null&&I.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(W=this.character.pickupModule)!=null&&W.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(((G=this.character.pickupModule)==null?void 0:G.pickupReach)??1.3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${((N=this.character.pickupModule)==null?void 0:N.pickupReach)??1.3}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(L=this.character.throwModule)!=null&&L.enabled?"active":""}">
                  ${(q=this.character.throwModule)!=null&&q.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${(tt=this.character.throwModule)!=null&&tt.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(((Y=this.character.throwModule)==null?void 0:Y.baseThrowForce)??7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((U=this.character.throwModule)==null?void 0:U.baseThrowForce)??7.6}">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ✨ Add New Object (Creator & Presets) -->
        <div id="section-world-spawner" class="dev-section" style="display: ${this.isHost?"block":"none"};">
          <h3>✨ Add New Object</h3>
          <p class="section-desc">Pick a preset or configure custom properties. Values remain preserved across spawns.</p>
          
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
        <div id="section-arena-physics" class="dev-section" style="display: ${this.isHost?"block":"none"};">
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var D,T,H,I,W,G,N;const t=this.selectedEntity,e=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=e?"none":"flex");const i=this.container.querySelector("#toggle-entity-shape");i&&(t.visualShape==="box"?(i.textContent="Box 📦",i.classList.add("active")):(i.textContent="Circle ⚪",i.classList.remove("active")));const o=this.container.querySelector("#toggle-mod-collider"),l=this.container.querySelector("#group-mod-collider"),a=this.container.querySelector("#note-mod-collider");o&&(o.textContent=t.hasCollider?"Attached":"Detached",o.classList.toggle("active",t.hasCollider)),l&&(l.style.display=t.hasCollider?"block":"none"),a&&(a.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((D=t.colliderModule)==null?void 0:D.radius)??.32,2);const n=this.container.querySelector("#toggle-mod-mass"),d=this.container.querySelector("#group-mod-mass"),c=this.container.querySelector("#note-mod-mass");n&&(n.textContent=t.hasMass?"Attached":"Detached",n.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),c&&(c.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((T=t.massModule)==null?void 0:T.mass)??1,1);const h=this.container.querySelector("#toggle-mod-friction"),y=this.container.querySelector("#group-mod-friction"),p=this.container.querySelector("#note-mod-friction"),b=this.container.querySelector("#warn-friction-mass"),x=!!(t.frictionModule&&t.frictionModule.enabled);h&&(h.textContent=x?"Attached":"Detached",h.classList.toggle("active",x)),y&&(y.style.display=x?"flex":"none"),p&&(p.style.display=x?"none":"block"),b&&(b.style.display=!t.hasMass&&x?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((H=t.frictionModule)==null?void 0:H.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((I=t.frictionModule)==null?void 0:I.dynamicFrictionMod)??1,2);const v=this.container.querySelector("#toggle-mod-bounce"),M=this.container.querySelector("#group-mod-bounce"),g=this.container.querySelector("#note-mod-bounce"),f=this.container.querySelector("#warn-bounce-mass"),m=!!(t.bounceModule&&t.bounceModule.enabled);v&&(v.textContent=m?"Attached":"Detached",v.classList.toggle("active",m)),M&&(M.style.display=m?"block":"none"),g&&(g.style.display=m?"none":"block"),f&&(f.style.display=!t.hasMass&&m?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((W=t.bounceModule)==null?void 0:W.bounceMod)??.4,2);const S=this.container.querySelector("#check-mod-vert-bounce"),w=this.container.querySelector("#warn-bounce-vert-vel");if(S&&(S.checked=!!((G=t.bounceModule)!=null&&G.verticalBounce)),w){const L=!!(m&&((N=t.bounceModule)!=null&&N.verticalBounce)&&!t.hasVerticalVelocity);w.style.display=L?"block":"none"}const E=this.container.querySelector("#toggle-mod-vert-pos"),C=this.container.querySelector("#group-mod-vert-pos"),F=this.container.querySelector("#note-mod-vert-pos"),V=t.hasVerticalPosition;E&&(E.textContent=V?"Attached":"Detached",E.classList.toggle("active",V)),C&&(C.style.display=V?"block":"none"),F&&(F.style.display=V?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const P=this.container.querySelector("#toggle-mod-vert-vel"),B=this.container.querySelector("#group-mod-vert-vel"),R=t.hasVerticalVelocity;P&&(P.textContent=R?"Enabled":"Disabled",P.classList.toggle("active",R)),B&&(B.style.display=R?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const $=this.container.querySelector("#toggle-mod-gravity"),O=this.container.querySelector("#note-mod-gravity");$&&($.textContent=t.hasGravity?"Attached":"Detached",$.classList.toggle("active",t.hasGravity)),O&&(O.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const u=this.container.querySelector("#toggle-mod-roll"),z=this.container.querySelector("#group-mod-roll"),j=this.container.querySelector("#note-roll-friction"),A=!!(t.rollModule&&t.rollModule.enabled);if(u&&(u.textContent=A?"Attached":"Detached",u.classList.toggle("active",A)),z&&(z.style.display=A?"block":"none"),j&&(j.style.display=A&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),e){const L=this.container.querySelector("#toggle-walk"),q=this.container.querySelector("#group-mod-walking"),tt=this.container.querySelector("#warn-walk-friction"),Y=!!(this.character.walkingModule&&this.character.walkingModule.enabled);L&&(L.textContent=Y?"Attached":"Detached",L.classList.toggle("active",Y)),q&&(q.style.display=Y?"flex":"none"),tt&&(tt.style.display=Y&&!this.character.hasFriction?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1)),this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const U=this.container.querySelector("#toggle-pickup"),nt=this.container.querySelector("#group-mod-pickup"),ot=!!(this.character.pickupModule&&this.character.pickupModule.enabled);U&&(U.textContent=ot?"Attached":"Detached",U.classList.toggle("active",ot)),nt&&(nt.style.display=ot?"block":"none"),this.character.pickupModule&&this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1);const lt=this.container.querySelector("#toggle-throw"),ct=this.container.querySelector("#group-mod-throw"),at=!!(this.character.throwModule&&this.character.throwModule.enabled);lt&&(lt.textContent=at?"Attached":"Detached",lt.classList.toggle("active",at)),ct&&(ct.style.display=at?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1)}}setSliderVal(t,e,s,i){const o=this.container.querySelector(`#${t}`),l=this.container.querySelector(`#${e}`);o&&(o.value=s.toString()),l&&(l.textContent=i>0?s.toFixed(i):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,e=this.container.querySelector("#creator-name");e&&(e.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const i=this.container.querySelector("#creator-color"),o=this.container.querySelector("#val-creator-color");i&&(i.value=t.color),o&&(o.textContent=t.color);const l=this.container.querySelector("#creator-toggle-collider"),a=this.container.querySelector("#grp-creator-radius");l&&(l.textContent=t.hasCollider?"Attached":"Detached",l.classList.toggle("active",t.hasCollider)),a&&(a.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const n=this.container.querySelector("#creator-toggle-mass"),d=this.container.querySelector("#grp-creator-mass");n&&(n.textContent=t.hasMass?"Attached":"Detached",n.classList.toggle("active",t.hasMass)),d&&(d.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const c=this.container.querySelector("#creator-toggle-friction"),h=this.container.querySelector("#grp-creator-fric");c&&(c.textContent=t.hasFriction?"Attached":"Detached",c.classList.toggle("active",t.hasFriction)),h&&(h.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const y=this.container.querySelector("#creator-toggle-bounce"),p=this.container.querySelector("#grp-creator-bounce"),b=this.container.querySelector("#creator-check-vert-bounce"),x=this.container.querySelector("#creator-warn-bounce-vert");y&&(y.textContent=t.hasBounce?"Attached":"Detached",y.classList.toggle("active",t.hasBounce)),p&&(p.style.display=t.hasBounce?"block":"none"),b&&(b.checked=t.verticalBounce),x&&(x.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const v=this.container.querySelector("#creator-toggle-vert-pos"),M=this.container.querySelector("#grp-creator-vert-pos");v&&(v.textContent=t.hasVerticalPosition?"Attached":"Detached",v.classList.toggle("active",t.hasVerticalPosition)),M&&(M.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const g=this.container.querySelector("#creator-toggle-vert-vel");g&&(g.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",g.classList.toggle("active",t.hasVerticalVelocity));const f=this.container.querySelector("#creator-toggle-gravity");f&&(f.textContent=t.hasGravity?"Attached":"Detached",f.classList.toggle("active",t.hasGravity));const m=this.container.querySelector("#creator-toggle-roll"),S=this.container.querySelector("#group-creator-roll-resist");m&&(m.textContent=t.hasRollModule?"Enabled":"Disabled",m.classList.toggle("active",t.hasRollModule)),S&&(S.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var B,R,$,O;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1);const u=this.container.querySelector("#edit-hint-label");u&&(u.textContent="Right-click in arena to select")}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0);const u=this.container.querySelector("#edit-hint-label");u&&(u.textContent="Click & drag object in arena")}),this.entitySelectorEl.addEventListener("change",()=>{var z;const u=this.entitySelectorEl.value;if(u===this.character.id)this.selectedEntity=this.character;else{const j=this.objects.find(A=>A.id===u);j&&(this.selectedEntity=j)}this.updateSelectorOptions(),this.syncEntitySliders(),(z=this.onSelectionChange)==null||z.call(this,this.selectedEntity)}),(B=this.container.querySelector("#btn-duplicate-entity"))==null||B.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(R=this.container.querySelector("#btn-delete-entity"))==null||R.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const e=this.container.querySelector("#toggle-mod-collider");e==null||e.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new _({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",u=>{this.selectedEntity.colliderRadius=u},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new K({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",u=>{this.selectedEntity.mass=u,this.updateSelectorOptions()},1);const i=this.container.querySelector("#toggle-mod-friction");i==null||i.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new J,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",u=>{this.selectedEntity.staticGroundFrictionMod=u},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",u=>{this.selectedEntity.dynamicGroundFrictionMod=u},2);const o=this.container.querySelector("#toggle-mod-bounce");o==null||o.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new Q({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",u=>{this.selectedEntity.bounceMod=u},2);const l=this.container.querySelector("#check-mod-vert-bounce");l==null||l.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=l.checked),this.syncEntitySliders(),this.updateInspector()});const a=this.container.querySelector("#toggle-mod-vert-pos");a==null||a.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new it({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",u=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=u),this.selectedEntity.position.z=u,this.syncEntitySliders(),this.updateInspector()},2);const n=this.container.querySelector("#toggle-mod-vert-vel");n==null||n.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",u=>{this.selectedEntity.verticalVelocity=u},2);const d=this.container.querySelector("#toggle-mod-gravity");d==null||d.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new et,this.syncEntitySliders()});const c=this.container.querySelector("#toggle-mod-roll");c==null||c.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new st({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",u=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=u)},2);const h=this.container.querySelector("#toggle-walk");h==null||h.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new rt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=u)},0),this.setupSlider("slide-walk-speed","val-walk-speed",u=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=u)},1),this.setupSlider("slide-strength","val-strength",u=>{this.character.strength=u},1);const y=this.container.querySelector("#toggle-pickup");y==null||y.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new dt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",u=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=u)},1);const p=this.container.querySelector("#toggle-throw");p==null||p.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new ht,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",u=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=u)},1),this.setupSlider("slide-gravity","val-gravity",u=>{this.arena.gravity=u},1),this.setupSlider("slide-wall-height","val-wall-height",u=>{this.arena.setStandardWallHeight(u)},1),this.setupSlider("slide-friction","val-friction",u=>{this.arena.frictionCoeff=u},1),this.setupSlider("slide-static-thresh","val-static-thresh",u=>{this.arena.staticFrictionThreshold=u},2),this.container.querySelectorAll(".preset-chip").forEach(u=>{u.addEventListener("click",()=>{const z=u.getAttribute("data-preset");z&&this.presets[z]&&(this.creatorState={...this.presets[z]},this.syncCreatorInputs())})});const x=this.container.querySelector("#creator-name");x==null||x.addEventListener("input",()=>{this.creatorState.name=x.value});const v=this.container.querySelector("#creator-toggle-shape");v==null||v.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",v.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",v.classList.toggle("active",this.creatorState.visualShape==="box")});const M=this.container.querySelector("#creator-color"),g=this.container.querySelector("#val-creator-color");M==null||M.addEventListener("input",()=>{this.creatorState.color=M.value,g&&(g.textContent=M.value)});const f=this.container.querySelector("#creator-toggle-collider");f==null||f.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,f.textContent=this.creatorState.hasCollider?"Attached":"Detached",f.classList.toggle("active",this.creatorState.hasCollider);const u=this.container.querySelector("#grp-creator-radius");u&&(u.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",u=>{this.creatorState.colliderRadius=u},2);const m=this.container.querySelector("#creator-toggle-mass");m==null||m.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,m.textContent=this.creatorState.hasMass?"Attached":"Detached",m.classList.toggle("active",this.creatorState.hasMass);const u=this.container.querySelector("#grp-creator-mass");u&&(u.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",u=>{this.creatorState.mass=u},1);const S=this.container.querySelector("#creator-toggle-friction");S==null||S.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,S.textContent=this.creatorState.hasFriction?"Attached":"Detached",S.classList.toggle("active",this.creatorState.hasFriction);const u=this.container.querySelector("#grp-creator-fric");u&&(u.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",u=>{this.creatorState.dynamicFrictionMod=u},2);const w=this.container.querySelector("#creator-toggle-bounce");w==null||w.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,w.textContent=this.creatorState.hasBounce?"Attached":"Detached",w.classList.toggle("active",this.creatorState.hasBounce);const u=this.container.querySelector("#grp-creator-bounce");u&&(u.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",u=>{this.creatorState.bounceMod=u},2);const E=this.container.querySelector("#creator-check-vert-bounce");E==null||E.addEventListener("change",()=>{this.creatorState.verticalBounce=E.checked,this.syncCreatorInputs()});const C=this.container.querySelector("#creator-toggle-vert-pos");C==null||C.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",u=>{this.creatorState.elevation=u},2);const F=this.container.querySelector("#creator-toggle-vert-vel");F==null||F.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const V=this.container.querySelector("#creator-toggle-gravity");V==null||V.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,V.textContent=this.creatorState.hasGravity?"Attached":"Detached",V.classList.toggle("active",this.creatorState.hasGravity)});const P=this.container.querySelector("#creator-toggle-roll");P==null||P.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,P.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",P.classList.toggle("active",this.creatorState.hasRollModule);const u=this.container.querySelector("#group-creator-roll-resist");u&&(u.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",u=>{this.creatorState.rollResistance=u},2),($=this.container.querySelector("#btn-spawn-configured"))==null||$.addEventListener("click",()=>{this.spawnFromCreator()}),(O=this.container.querySelector("#btn-clear-entities"))==null||O.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,e=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),i=new Z({name:t.name||"Custom Object",position:{x:e,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new _({radius:t.colliderRadius}):null,massModule:t.hasMass?new K({mass:t.mass}):null,frictionModule:t.hasFriction?new J({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new Q({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new it({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new et:null,rollModule:t.hasRollModule?new st({rollResistance:t.rollResistance}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,e=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),i=new Z({name:`${t.name} (Copy)`,position:{x:e,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new _({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new K({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new J({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new Q({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new it({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new et({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new st({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(i),this.setSelectedEntity(i)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,e,s,i=0){const o=this.container.querySelector(`#${t}`),l=this.container.querySelector(`#${e}`);!o||!l||o.addEventListener("input",()=>{const a=parseFloat(o.value);l.textContent=i>0?a.toFixed(i):Math.round(a).toString(),s(a)})}updateInspector(){const t=this.selectedEntity,e=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}}class bt{constructor(t){r(this,"arena");r(this,"character");r(this,"objects");r(this,"renderer");r(this,"inputManager");r(this,"devPanel");r(this,"networkManager");r(this,"remoteCharacters",new Map);r(this,"isRunning",!1);r(this,"lastTime",0);r(this,"accumulator",0);r(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel,this.networkManager=t.networkManager,this.networkManager&&this.setupNetworkHandlers(this.networkManager)}setupNetworkHandlers(t){t.onInit=e=>{this.character.playerId=e.playerId,this.character.color=e.playerColor,this.character.name=e.playerName,this.devPanel.setHost(e.isHost,e.hostId);for(const s of e.players)if(s.id!==e.playerId&&!this.remoteCharacters.has(s.id)){const i=new X({name:s.name,playerId:s.id,color:s.color,isLocalPlayer:!1,x:s.x,y:s.y});this.remoteCharacters.set(s.id,i)}},t.onPlayerJoined=e=>{if(e.player.id!==this.character.playerId&&!this.remoteCharacters.has(e.player.id)){const s=new X({name:e.player.name,playerId:e.player.id,color:e.player.color,isLocalPlayer:!1,x:e.player.x,y:e.player.y});this.remoteCharacters.set(e.player.id,s),console.log(`[GameLoop] Remote player joined: ${e.player.name} (${e.player.id})`)}},t.onPlayerLeft=e=>{const s=this.remoteCharacters.get(e.playerId);s&&(s.heldObject&&(s.heldObject.isHeld=!1,s.heldObject.heldBy=null,s.heldObject=null),this.remoteCharacters.delete(e.playerId),console.log(`[GameLoop] Remote player removed: ${e.playerId}`)),e.newHostId&&this.devPanel.setHost(e.newHostId===this.character.playerId,e.newHostId)},t.onRoleChange=e=>{this.devPanel.setHost(e.isHost,e.hostId)},t.onPlayerState=e=>{const s=this.remoteCharacters.get(e.playerId);if(s)if(s.position.x=e.x,s.position.y=e.y,s.position.z=e.z,s.velocity.x=e.vx,s.velocity.y=e.vy,s.verticalVelocity=e.vz,s.facingAngle=e.facingAngle,s.isAiming=e.isAiming,s.aimTarget=e.aimTarget,s.isActivelyWalking=e.isActivelyWalking,e.heldObjectId){const i=this.objects.find(o=>o.id===e.heldObjectId);i&&(s.heldObject=i,i.isHeld=!0,i.heldBy=s)}else s.heldObject&&(s.heldObject.isHeld=!1,s.heldObject.heldBy=null,s.heldObject=null)},t.onWorldSnapshot=e=>{if(!t.isHost){e.arena&&(this.arena.gravity=e.arena.gravity,this.arena.frictionCoeff=e.arena.frictionCoeff,this.arena.staticFrictionThreshold=e.arena.staticFrictionThreshold);for(const s of e.objects){const i=this.objects.find(o=>o.id===s.id);i&&(i.isHeld||(i.position.x=s.x,i.position.y=s.y,i.position.z=s.z,i.velocity.x=s.vx,i.velocity.y=s.vy,i.verticalVelocity=s.vz,i.supportingSurfaceHeight=s.supportingSurfaceHeight,i.rollModule&&(i.rollModule.angularVelocity.x=s.rotX,i.rollModule.angularVelocity.y=s.rotY,i.rollModule.angularVelocity.z=s.rotZ)))}}},t.onClientAction=e=>{if(!t.isHost)return;const s=this.remoteCharacters.get(e.playerId);if(s)if(e.action==="pickup"&&e.targetObjectId){const i=this.objects.find(o=>o.id===e.targetObjectId);i&&!i.isHeld&&s.pickupModule&&s.pickupModule.pickup(s,i)}else e.action==="throw"&&s.heldObject&&s.throwModule?s.throwModule.throwHeldObject(s,e.aimX??s.position.x+Math.cos(s.facingAngle)*5,e.aimY??s.position.y+Math.sin(s.facingAngle)*5,this.arena):e.action==="drop"&&s.heldObject&&(s.heldObject.isHeld=!1,s.heldObject.heldBy=null,s.heldObject=null)}}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let e=(t-this.lastTime)/1e3;for(this.lastTime=t,e>.2&&(e=.2),this.accumulator+=e;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity,Array.from(this.remoteCharacters.values())),this.devPanel.updateInspector(),requestAnimationFrame(s=>this.tick(s))}updatePhysics(t){var i;const e=this.inputManager,s=!this.networkManager||this.networkManager.isHost;e.draggedEntity!==this.character?this.character.updateCharacter(t,e.movementVector,e.isMouseDown&&!this.devPanel.isEditMode,e.mousePos,this.arena):(this.character.velocity.x=0,this.character.velocity.y=0);for(const o of this.remoteCharacters.values())if(o.heldObject){const l=o.colliderRadius+o.heldObject.colliderRadius*.5+.08;o.heldObject.position.x=o.position.x+Math.cos(o.facingAngle)*l,o.heldObject.position.y=o.position.y+Math.sin(o.facingAngle)*l,o.heldObject.position.z=o.heldObject.hasVerticalPosition?.45:0,o.heldObject.velocity.x=o.velocity.x,o.heldObject.velocity.y=o.velocity.y}if(s)for(const o of this.objects)e.draggedEntity!==o&&o.updatePosition(t,this.arena);if(!this.devPanel.isEditMode&&e.isMouseDown&&!this.character.heldObject&&this.character.pickupModule){const o=this.character.pickupModule.findTargetObject(this.character,e.mousePos.x,e.mousePos.y,this.objects);o&&(this.character.pickupModule.pickup(this.character,o),e.justPickedUp=!0,this.networkManager&&!s&&this.networkManager.sendAction("pickup",o.id))}if(this.resolveFreebodyCollisions(),this.networkManager&&(this.networkManager.sendPlayerState(this.character.position.x,this.character.position.y,this.character.position.z,this.character.velocity.x,this.character.velocity.y,this.character.verticalVelocity,this.character.facingAngle,this.character.isAiming,this.character.aimTarget,((i=this.character.heldObject)==null?void 0:i.id)||null,this.character.isActivelyWalking),this.networkManager.isHost)){const o=this.objects.map(l=>{var a,n,d;return{id:l.id,x:l.position.x,y:l.position.y,z:l.position.z,vx:l.velocity.x,vy:l.velocity.y,vz:l.verticalVelocity,rotX:((a=l.rollModule)==null?void 0:a.angularVelocity.x)||0,rotY:((n=l.rollModule)==null?void 0:n.angularVelocity.y)||0,rotZ:((d=l.rollModule)==null?void 0:d.angularVelocity.z)||0,isHeld:l.isHeld,heldByPlayerId:l.heldBy instanceof X?l.heldBy.playerId:null,supportingSurfaceHeight:l.supportingSurfaceHeight}});this.networkManager.sendWorldSnapshot(o,{gravity:this.arena.gravity,frictionCoeff:this.arena.frictionCoeff,staticFrictionThreshold:this.arena.staticFrictionThreshold})}}resolveFreebodyCollisions(){const t=[this.character,...Array.from(this.remoteCharacters.values()),...this.objects],e=this.inputManager,s=3;for(let i=0;i<s;i++)for(let o=0;o<t.length;o++)for(let l=o+1;l<t.length;l++){const a=t[o],n=t[l];if(a.isHeld||n.isHeld||a===e.draggedEntity||n===e.draggedEntity||!a.hasCollider||!n.hasCollider)continue;const d=this.arena.wallHeight-.15,c=a.position.z>=d||a.supportingSurfaceHeight>=d,h=n.position.z>=d||n.supportingSurfaceHeight>=d;if(c!==h)continue;const y=n.position.x-a.position.x,p=n.position.y-a.position.y,b=y*y+p*p,x=a.colliderRadius+n.colliderRadius;if(b<x*x&&b>1e-6){const v=Math.sqrt(b),M=x-v,g=y/v,f=p/v,m=n.velocity.x-a.velocity.x,S=n.velocity.y-a.velocity.y,w=m*g+S*f,E=!a.hasMass,C=!n.hasMass;if(E&&C){if(a.position.x-=g*M*.5,a.position.y-=f*M*.5,n.position.x+=g*M*.5,n.position.y+=f*M*.5,w<0){const $=-w*.5;a.velocity.x-=$*g,a.velocity.y-=$*f,n.velocity.x+=$*g,n.velocity.y+=$*f}continue}if(!E&&C){this.isEntityPinnedAgainstWall(n,g,f)?(a.position.x-=g*M,a.position.y-=f*M,a.velocity.x=0,a.velocity.y=0):(n.position.x+=g*M,n.position.y+=f*M,w<0&&(n.velocity.x+=(a.velocity.x-n.velocity.x)*Math.abs(g),n.velocity.y+=(a.velocity.y-n.velocity.y)*Math.abs(f)));continue}if(E&&!C){this.isEntityPinnedAgainstWall(a,-g,-f)?(n.position.x+=g*M,n.position.y+=f*M,n.velocity.x=0,n.velocity.y=0):(a.position.x-=g*M,a.position.y-=f*M,w<0&&(a.velocity.x+=(n.velocity.x-a.velocity.x)*Math.abs(g),a.velocity.y+=(n.velocity.y-a.velocity.y)*Math.abs(f)));continue}const F=1/a.mass,V=1/n.mass,P=F+V;if(P<=1e-4)continue;const B=F/P,R=V/P;if(a.position.x-=g*M*B,a.position.y-=f*M*B,n.position.x+=g*M*R,n.position.y+=f*M*R,w<0){const $=a instanceof X&&a.isActivelyWalking||n instanceof X&&n.isActivelyWalking,O=a.hasBounce&&n.hasBounce,u=a.isCharacter||!a.hasBounce?0:a.bounceMod??0,z=n.isCharacter||!n.hasBounce?0:n.bounceMod??0,A=-(1+($||!O?0:Math.max(0,Math.min(.98,Math.max(u,z)))))*w/P;a.velocity.x-=A*F*g,a.velocity.y-=A*F*f,n.velocity.x+=A*V*g,n.velocity.y+=A*V*f;const D=-f,T=g,H=m*D+S*T;if(Math.abs(H)>.001){const I=.35*Math.sqrt(a.dynamicGroundFrictionMod*n.dynamicGroundFrictionMod),W=.4,G=Math.abs(H)/(P*(1+1/W)),N=I*Math.abs(A),L=Math.min(G,N)*Math.sign(H);if(a.velocity.x+=L*F*D,a.velocity.y+=L*F*T,n.velocity.x-=L*V*D,n.velocity.y-=L*V*T,a.rollModule&&a.rollModule.enabled){const q=L/(W*a.mass*a.colliderRadius);a.rollModule.angularVelocity.z+=q,a.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,a.rollModule.angularVelocity.z)),a.isRestingOnSurface&&(a.rollModule.angularVelocity.y=a.velocity.x/a.colliderRadius,a.rollModule.angularVelocity.x=-a.velocity.y/a.colliderRadius)}if(n.rollModule&&n.rollModule.enabled){const q=L/(W*n.mass*n.colliderRadius);n.rollModule.angularVelocity.z-=q,n.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,n.rollModule.angularVelocity.z)),n.isRestingOnSurface&&(n.rollModule.angularVelocity.y=n.velocity.x/n.colliderRadius,n.rollModule.angularVelocity.x=-n.velocity.y/n.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,e,s){const i=t.colliderRadius>0?t.colliderRadius:.3,o=.05;if(e>.3&&t.position.x>=this.arena.width-i-o||e<-.3&&t.position.x<=i+o||s>.3&&t.position.y>=this.arena.height-i-o||s<-.3&&t.position.y<=i+o)return!0;for(const l of this.arena.walls)if(t.position.z<l.wallHeight-.05){const a=t.position.x+e*o,n=t.position.y+s*o,d=Math.max(l.x,Math.min(a,l.x+l.width)),c=Math.max(l.y,Math.min(n,l.y+l.height)),h=a-d,y=n-c;if(h*h+y*y<i*i)return!0}return!1}}class Mt{constructor(){r(this,"ws",null);r(this,"reconnectTimer",null);r(this,"isDestroyed",!1);r(this,"playerId","");r(this,"playerColor","#f59e0b");r(this,"playerName","Player");r(this,"isHost",!1);r(this,"hostId","");r(this,"onInit",null);r(this,"onPlayerJoined",null);r(this,"onPlayerLeft",null);r(this,"onRoleChange",null);r(this,"onPlayerState",null);r(this,"onWorldSnapshot",null);r(this,"onClientAction",null);r(this,"onHostEvent",null);r(this,"lastPlayerStateSend",0);r(this,"lastSnapshotSend",0);this.connect()}connect(){if(!this.isDestroyed)try{const e=`${window.location.protocol==="https:"?"wss:":"ws:"}//${window.location.host}/ws`;console.log(`[NetworkManager] Connecting to ${e}...`),this.ws=new WebSocket(e),this.ws.onopen=()=>{console.log("[NetworkManager] Connected to multiplayer room!"),this.reconnectTimer&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null)},this.ws.onmessage=s=>{try{const i=JSON.parse(s.data);this.handlePacket(i)}catch(i){console.error("[NetworkManager] Error handling packet:",i)}},this.ws.onclose=()=>{console.warn("[NetworkManager] Connection closed. Attempting reconnect in 2s..."),this.scheduleReconnect()},this.ws.onerror=s=>{console.error("[NetworkManager] WebSocket error:",s)}}catch(t){console.error("[NetworkManager] Connection setup failed:",t),this.scheduleReconnect()}}scheduleReconnect(){this.isDestroyed||this.reconnectTimer||(this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect()},2e3))}handlePacket(t){var e,s,i,o,l,a,n,d,c;switch(t.type){case"init":{this.playerId=t.playerId,this.playerColor=t.playerColor,this.playerName=t.playerName,this.isHost=t.isHost,this.hostId=t.hostId,(e=this.onInit)==null||e.call(this,t);break}case"player_joined":{(s=this.onPlayerJoined)==null||s.call(this,t);break}case"player_left":{if(t.newHostId){this.hostId=t.newHostId;const h=this.isHost;this.isHost=t.newHostId===this.playerId,!h&&this.isHost&&(console.log("👑 [NetworkManager] Promoted to Host! Dev tools unlocked."),(i=this.onRoleChange)==null||i.call(this,{type:"role_change",isHost:!0,hostId:this.playerId}))}(o=this.onPlayerLeft)==null||o.call(this,t);break}case"role_change":{this.isHost=t.isHost,this.hostId=t.hostId,console.log(`[NetworkManager] Role changed: isHost = ${this.isHost}`),(l=this.onRoleChange)==null||l.call(this,t);break}case"player_state":{t.playerId!==this.playerId&&((a=this.onPlayerState)==null||a.call(this,t));break}case"world_snapshot":{this.isHost||(n=this.onWorldSnapshot)==null||n.call(this,t);break}case"client_action":{this.isHost&&((d=this.onClientAction)==null||d.call(this,t));break}case"host_event":{(c=this.onHostEvent)==null||c.call(this,t);break}}}send(t){this.ws&&this.ws.readyState===WebSocket.OPEN&&this.ws.send(JSON.stringify(t))}sendPlayerState(t,e,s,i,o,l,a,n,d,c,h){const y=performance.now();y-this.lastPlayerStateSend<22||(this.lastPlayerStateSend=y,this.send({type:"player_state",playerId:this.playerId,x:t,y:e,z:s,vx:i,vy:o,vz:l,facingAngle:a,isAiming:n,aimTarget:d,heldObjectId:c,isActivelyWalking:h}))}sendWorldSnapshot(t,e){if(!this.isHost)return;const s=performance.now();s-this.lastSnapshotSend<30||(this.lastSnapshotSend=s,this.send({type:"world_snapshot",hostId:this.playerId,timestamp:Date.now(),objects:t,arena:e}))}sendAction(t,e,s,i){this.send({type:"client_action",playerId:this.playerId,action:t,targetObjectId:e,aimX:s,aimY:i})}sendHostEvent(t,e,s){this.isHost&&this.send({type:"host_event",event:t,objectData:e,objectId:s})}destroy(){this.isDestroyed=!0,this.reconnectTimer&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.ws&&(this.ws.close(),this.ws=null)}}function mt(){const k=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!k||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const e=k.getContext("2d");if(!e){console.error("Failed to acquire 2D canvas context");return}const s=new Mt,i=new pt(20,14,1);k.width=1e3,k.height=700;const o=new X({x:4.8,y:7,color:s.playerColor,colliderRadius:.44,mass:1.2,strength:1}),l=[new Z({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new Z({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new Z({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new Z({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new st({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})],a=new vt(e),n=new ft({container:t,character:o,arena:i,objects:l,onSpawnObject:p=>{l.push(p),n.updateSelectorOptions()},onDeleteObject:p=>{const b=l.indexOf(p);b!==-1&&l.splice(b,1),n.updateSelectorOptions()},onClearObjects:()=>{o.heldObject&&(o.heldObject.isHeld=!1,o.heldObject.heldBy=null,o.heldObject=null),l.length=0,n.updateSelectorOptions()}}),d=new gt(k,i);d.handleInteractions(o,i,l,n),n.onSelectionChange=p=>{d.selectedCanvasEntity=p},d.onActionAttempt=(p,b,x,v)=>{s&&!s.isHost&&s.sendAction(p,b,x,v)};const c=document.querySelector(".brand-badge");c&&(c.textContent="Room 1 • Connecting...");const h=new bt({arena:i,character:o,objects:l,renderer:a,inputManager:d,devPanel:n,networkManager:s}),y=s.onInit;s.onInit=p=>{y==null||y(p),c&&(c.textContent=`Room 1 • ${p.playerName}${p.isHost?" (Host 👑)":""}`)},h.start(),console.log("🚀 Power Creature Game Multiplayer running!")}window.addEventListener("DOMContentLoaded",mt);

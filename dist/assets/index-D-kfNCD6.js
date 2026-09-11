var ut=Object.defineProperty;var yt=(V,t,i)=>t in V?ut(V,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):V[t]=i;var d=(V,t,i)=>yt(V,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function i(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(e){if(e.ep)return;e.ep=!0;const o=i(e);fetch(e.href,o)}})();class pt{constructor(t=20,i=14,s=1){d(this,"width");d(this,"height");d(this,"tileSize");d(this,"cols");d(this,"rows");d(this,"wallHeight");d(this,"gravity");d(this,"frictionCoeff");d(this,"staticFrictionThreshold");d(this,"tileGrid");d(this,"walls",[]);this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.setupDefaultTileMap(),this.rebuildWalls()}setupDefaultTileMap(){for(let i=1;i<=4;i++)this.tileGrid[i][10]=1;for(let i=8;i<=12;i++)this.tileGrid[i][10]=1;this.tileGrid[4][4]=1,this.tileGrid[5][4]=1,this.tileGrid[4][5]=1,this.tileGrid[5][5]=1,this.tileGrid[7][15]=1,this.tileGrid[8][15]=1,this.tileGrid[7][16]=1,this.tileGrid[8][16]=1}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const o=Math.max(e.x,Math.min(t,e.x+e.width)),c=Math.max(e.y,Math.min(i,e.y+e.height)),l=t-o,n=i-c;return l*l+n*n<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}}class N{constructor(t={}){d(this,"radius");d(this,"enabled");this.radius=t.radius??.32,this.enabled=t.enabled??!0}}class K{constructor(t={}){d(this,"mass");d(this,"enabled");this.mass=t.mass??1,this.enabled=t.enabled??!0}}class _{constructor(t={}){d(this,"staticFrictionMod");d(this,"dynamicFrictionMod");d(this,"enabled");this.staticFrictionMod=t.staticFrictionMod??1,this.dynamicFrictionMod=t.dynamicFrictionMod??1,this.enabled=t.enabled??!0}}class J{constructor(t={}){d(this,"bounceMod");d(this,"verticalBounce");d(this,"enabled");this.bounceMod=t.bounceMod??.4,this.verticalBounce=t.verticalBounce??!0,this.enabled=t.enabled??!0}}class tt{constructor(t={}){d(this,"enabled");this.enabled=t.enabled??!0}}class et{constructor(t={}){d(this,"z");d(this,"hasVerticalVelocity");d(this,"verticalVelocity");d(this,"enabled");this.z=t.z??0,this.hasVerticalVelocity=t.hasVerticalVelocity!==void 0?t.hasVerticalVelocity:!0,this.verticalVelocity=t.verticalVelocity??0,this.enabled=t.enabled!==void 0?t.enabled:!0}}class U{constructor(t={}){d(this,"id");d(this,"name");d(this,"position");d(this,"velocity");d(this,"color");d(this,"isHeld");d(this,"heldBy");d(this,"isCharacter",!1);d(this,"visualShape","circle");d(this,"colliderModule",null);d(this,"massModule",null);d(this,"frictionModule",null);d(this,"bounceModule",null);d(this,"verticalPositionModule",null);d(this,"gravityModule",null);d(this,"rollModule",null);d(this,"supportingSurfaceHeight",0);var i,s,e,o,c;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Entity",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.velocity={x:((o=t.velocity)==null?void 0:o.x)??0,y:((c=t.velocity)==null?void 0:c.y)??0},this.color=t.color??"#94a3b8",this.isHeld=!1,this.heldBy=null,this.visualShape=t.visualShape??"circle",this.colliderModule=t.colliderModule!==void 0?t.colliderModule:t.colliderRadius!==void 0?new N({radius:t.colliderRadius}):new N({radius:.35}),this.massModule=t.massModule!==void 0?t.massModule:t.mass!==void 0?new K({mass:t.mass}):new K({mass:1}),this.frictionModule=t.frictionModule!==void 0?t.frictionModule:new _({staticFrictionMod:t.staticGroundFrictionMod??1,dynamicFrictionMod:t.dynamicGroundFrictionMod??1}),this.bounceModule=t.bounceModule!==void 0?t.bounceModule:t.bounceMod!==void 0&&t.bounceMod!==null?new J({bounceMod:t.bounceMod}):new J({bounceMod:.4}),this.verticalPositionModule=t.verticalPositionModule!==void 0?t.verticalPositionModule:t.hasVerticalPosition===!1?null:new et({z:this.position.z,hasVerticalVelocity:t.hasVerticalVelocity!==!1,verticalVelocity:t.verticalVelocity??0}),this.hasVerticalPosition||(this.position.z=0),this.gravityModule=t.gravityModule!==void 0?t.gravityModule:t.hasGravity===!1?null:new tt,this.rollModule=t.rollModule??null}get hasCollider(){return!!(this.colliderModule&&this.colliderModule.enabled)}get colliderRadius(){return this.colliderModule&&this.colliderModule.enabled?this.colliderModule.radius:0}set colliderRadius(t){this.colliderModule?this.colliderModule.radius=t:this.colliderModule=new N({radius:t})}get hasMass(){return!!(this.massModule&&this.massModule.enabled&&this.massModule.mass>0)}get mass(){return this.massModule&&this.massModule.enabled?this.massModule.mass:0}set mass(t){this.massModule?this.massModule.mass=t:this.massModule=new K({mass:t})}get hasFriction(){return!!(this.hasMass&&this.frictionModule&&this.frictionModule.enabled)}get staticGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.staticFrictionMod:0}set staticGroundFrictionMod(t){this.frictionModule?this.frictionModule.staticFrictionMod=t:this.frictionModule=new _({staticFrictionMod:t})}get dynamicGroundFrictionMod(){return this.hasFriction&&this.frictionModule?this.frictionModule.dynamicFrictionMod:0}set dynamicGroundFrictionMod(t){this.frictionModule?this.frictionModule.dynamicFrictionMod=t:this.frictionModule=new _({dynamicFrictionMod:t})}get hasBounce(){return!!(this.hasMass&&this.bounceModule&&this.bounceModule.enabled)}get bounceMod(){return this.hasBounce&&this.bounceModule?this.bounceModule.bounceMod:null}set bounceMod(t){t===null||t<=.01?this.bounceModule=null:this.bounceModule?this.bounceModule.bounceMod=t:this.bounceModule=new J({bounceMod:t})}get hasVerticalPosition(){return!!(this.verticalPositionModule&&this.verticalPositionModule.enabled)}get hasVerticalVelocity(){var t;return!!(this.hasVerticalPosition&&((t=this.verticalPositionModule)!=null&&t.hasVerticalVelocity))}get verticalVelocity(){return this.hasVerticalVelocity&&this.verticalPositionModule?this.verticalPositionModule.verticalVelocity:0}set verticalVelocity(t){this.hasVerticalVelocity&&this.verticalPositionModule&&(this.verticalPositionModule.verticalVelocity=t)}get hasVerticalBounce(){var t;return!!(this.hasBounce&&((t=this.bounceModule)!=null&&t.verticalBounce)&&this.hasVerticalVelocity)}get hasGravity(){return!!(this.gravityModule&&this.gravityModule.enabled)}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.hasVerticalPosition&&this.position.z>.001}get isAboveWalls(){return this.hasVerticalPosition&&(this.position.z>=.95||this.supportingSurfaceHeight>=.95)}updatePosition(t,i){var n;if(this.isHeld)return;this.hasVerticalPosition||(this.position.z=0,this.verticalVelocity=0,this.supportingSurfaceHeight=0);let s=0,e=null;if(this.hasCollider&&this.hasVerticalPosition&&(e=this.position.z>=i.wallHeight-.15||this.supportingSurfaceHeight>.01&&this.position.z>=i.wallHeight-.35?i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):null,s=e?e.wallHeight:0),this.supportingSurfaceHeight=s,this.hasGravity&&this.hasVerticalVelocity){if((this.position.z>s||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=s))if(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25){const r=Math.abs(this.verticalVelocity);if(this.verticalVelocity=-this.verticalVelocity*this.bounceMod,this.hasFriction&&this.rollModule&&this.rollModule.enabled){const a=this.rollModule,u=this.colliderRadius>0?this.colliderRadius:.3,v=.4,b=this.bounceMod,f=(1+b)*this.mass*r,x=i.frictionCoeff*this.dynamicGroundFrictionMod*.05,p=this.velocity.x-a.angularVelocity.y*u,M=this.velocity.y+a.angularVelocity.x*u,y=Math.hypot(p,M);if(y>.001&&x>0){const m=x*f,S=y*this.mass/(1+1/v),w=Math.min(S,m),E=p/y*w,F=M/y*w;this.velocity.x-=E/this.mass,this.velocity.y-=F/this.mass,a.angularVelocity.y+=E/(v*this.mass*u),a.angularVelocity.x-=F/(v*this.mass*u)}const g=Math.max(.65,1-(1-b)*.35);a.angularVelocity.x*=g,a.angularVelocity.y*=g,a.angularVelocity.z*=g}}else this.verticalVelocity=0}else this.hasVerticalVelocity&&this.verticalVelocity!==0&&(this.position.z+=this.verticalVelocity*t,this.position.z<=s&&(this.position.z=s,this.hasVerticalBounce&&this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.25?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0));if(Math.abs(this.position.z-s)<=.01&&Math.abs(this.verticalVelocity)<=.05&&this.hasFriction){if(!(this.isCharacter&&((n=this.walkingModule)==null?void 0:n.enabled)))if(this.rollModule&&this.rollModule.enabled){const a=this.rollModule,u=this.colliderRadius>0?this.colliderRadius:.3,v=i.frictionCoeff*this.dynamicGroundFrictionMod,b=.4,f=this.velocity.x-a.angularVelocity.y*u,x=this.velocity.y+a.angularVelocity.x*u,p=Math.hypot(f,x);if(v>0&&p>.001){const y=v*(1+1/b)*t;if(p<=y){const g=this.velocity.x+b*a.angularVelocity.y*u,m=this.velocity.y-b*a.angularVelocity.x*u,S=g/(1+b),w=m/(1+b);this.velocity.x=S,this.velocity.y=w,a.angularVelocity.y=S/u,a.angularVelocity.x=-w/u}else{const g=f/p*v*t,m=x/p*v*t;this.velocity.x-=g,this.velocity.y-=m,a.angularVelocity.y+=g/(b*u),a.angularVelocity.x-=m/(b*u)}}const M=Math.hypot(this.velocity.x,this.velocity.y);if(M>0){if(a.rollResistance>0){const y=a.rollResistance*t,g=Math.max(0,M-y);if(g<.005)this.velocity.x=0,this.velocity.y=0,a.angularVelocity.x=0,a.angularVelocity.y=0;else{const m=g/M;this.velocity.x*=m,this.velocity.y*=m,a.angularVelocity.x*=m,a.angularVelocity.y*=m}}}else{const y=Math.hypot(a.angularVelocity.x,a.angularVelocity.y);if(y>0&&v>0){const g=v/(b*u)*t,m=Math.max(0,y-g),S=y>0?m/y:0;a.angularVelocity.x*=S,a.angularVelocity.y*=S}}if(Math.abs(a.angularVelocity.z)>.001&&a.rollResistance>0){const y=a.rollResistance/(b*u)*t,g=Math.sign(a.angularVelocity.z),m=Math.abs(a.angularVelocity.z);a.angularVelocity.z=m<=y?0:g*(m-y)}a.updateVisualPhase(t)}else{const a=Math.hypot(this.velocity.x,this.velocity.y);if(a>0){const u=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(a<u)this.velocity.x=0,this.velocity.y=0;else{const v=i.frictionCoeff*this.dynamicGroundFrictionMod*t,f=Math.max(0,a-v)/a;this.velocity.x*=f,this.velocity.y*=f}}}}else this.rollModule&&this.rollModule.enabled&&this.rollModule.updateVisualPhase(t);if(this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t,this.hasCollider){const r=this.colliderRadius,a=r,u=i.width-r,v=r,b=i.height-r,f=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;if(this.position.x<a?(this.position.x=a,this.resolveWallImpact(1,0,f)):this.position.x>u&&(this.position.x=u,this.resolveWallImpact(-1,0,f)),this.position.y<v?(this.position.y=v,this.resolveWallImpact(0,1,f)):this.position.y>b&&(this.position.y=b,this.resolveWallImpact(0,-1,f)),!e)for(const x of i.walls)this.position.z<x.wallHeight-.05&&this.resolveWallCollision(x)}const c=16,l=Math.hypot(this.velocity.x,this.velocity.y);if(l>c){const r=c/l;this.velocity.x*=r,this.velocity.y*=r}if(this.rollModule&&this.rollModule.enabled){const a=this.rollModule.angularSpeed;if(a>35){const u=35/a;this.rollModule.angularVelocity.x*=u,this.rollModule.angularVelocity.y*=u,this.rollModule.angularVelocity.z*=u}}this.verticalPositionModule&&(this.verticalPositionModule.z=this.position.z)}resolveWallImpact(t,i,s){const e=this.velocity.x*t+this.velocity.y*i;if(e>=0)return;const o=e;if(s>0&&this.hasMass?(this.velocity.x-=(1+s)*o*t,this.velocity.y-=(1+s)*o*i):(this.velocity.x-=o*t,this.velocity.y-=o*i),this.hasFriction&&this.rollModule&&this.rollModule.enabled){const c=this.rollModule,l=this.colliderRadius>0?this.colliderRadius:.3,n=.4,r=.35,a=-i,u=t,v=this.velocity.x*a+this.velocity.y*u,b=-(1+s)*this.mass*o,f=v-c.angularVelocity.z*l,x=Math.abs(f)*this.mass/(1+1/n),p=r*b,M=Math.min(x,p),y=-Math.sign(f)*M,g=v,m=g+y/this.mass,S=Math.abs(m)<=Math.abs(g)+.01?m-g:-g*.1;this.velocity.x+=S*a,this.velocity.y+=S*u;const E=-(S*this.mass)/(n*this.mass*l);c.angularVelocity.z+=E,c.angularVelocity.z=Math.max(-30,Math.min(30,c.angularVelocity.z)),c.angularVelocity.y=this.velocity.x/l,c.angularVelocity.x=-this.velocity.y/l}}resolveWallCollision(t){if(!this.hasCollider)return;const i=this.colliderRadius,s=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),e=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),o=this.position.x-s,c=this.position.y-e,l=o*o+c*c;if(l<i*i){const n=Math.sqrt(l);let r=0,a=0,u=0;if(n===0){const b=Math.abs(this.position.x-t.x),f=Math.abs(t.x+t.width-this.position.x),x=Math.abs(this.position.y-t.y),p=Math.abs(t.y+t.height-this.position.y),M=Math.min(b,f,x,p);M===b?(r=-1,u=b+i):M===f?(r=1,u=f+i):M===x?(a=-1,u=x+i):(a=1,u=p+i)}else u=i-n,r=o/n,a=c/n;this.position.x+=r*u,this.position.y+=a*u;const v=this.isCharacter?0:this.hasBounce&&this.bounceMod!==null?this.bounceMod:0;this.resolveWallImpact(r,a,v)}}}class rt{constructor(){d(this,"id","walking");d(this,"name","Walking Module");d(this,"enabled",!0);d(this,"maxWalkForce",35);d(this,"maxWalkSpeed",5.2);d(this,"dragDamping",8.01)}update(t,i,s,e){var E;if(!this.enabled||t.isAboveGround){t.isActivelyWalking=!1;return}if(!t.hasFriction||!((E=t.frictionModule)!=null&&E.enabled)||!t.hasMass){t.isActivelyWalking=!1;return}const o=Math.hypot(i.x,i.y),c=o>.05;t.isActivelyWalking=c;const l=t.mass;if(l<=.01)return;const n=t.dynamicGroundFrictionMod;if(n<=.001)return;const r=e.frictionCoeff/10,a=n*r,v=t.carriedMass/(Math.max(.1,t.strength)*8),b=this.maxWalkSpeed/(1+v);let f=0,x=0;if(c){const F=i.x/o,C=i.y/o;f=F*b,x=C*b}const p=f-t.velocity.x,M=x-t.velocity.y,y=Math.hypot(p,M);if(y<.001){t.velocity.x=f,t.velocity.y=x;return}const g=Math.hypot(t.velocity.x,t.velocity.y),m=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),w=this.maxWalkForce*t.strength/l*a*s;if(y<=w||!c&&g<m)t.velocity.x=f,t.velocity.y=x;else{const F=w/y;t.velocity.x+=p*F,t.velocity.y+=M*F}}}class dt{constructor(){d(this,"id","pickup");d(this,"name","Pickup Ability");d(this,"enabled",!0);d(this,"pickupReach",1.3)}findTargetObject(t,i,s,e){if(!this.enabled)return null;let o=null,c=1/0;for(const l of e){if(l===t||l.isHeld||Math.hypot(l.position.x-t.position.x,l.position.y-t.position.y)>this.pickupReach+l.colliderRadius)continue;const r=Math.hypot(l.position.x-i,l.position.y-s);r<c&&r<=l.colliderRadius+.65&&(c=r,o=l)}return o}pickup(t,i){if(!this.enabled||t.heldObject)return!1;const s=i.velocity.x,e=i.velocity.y,o=i.mass/Math.max(.2,t.mass);return t.velocity.x+=s*o,t.velocity.y+=e*o,t.isAboveGround&&Math.abs(i.verticalVelocity)>.1&&(t.verticalVelocity+=i.verticalVelocity*o),t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=i.hasVerticalPosition?.45:0,!0}drop(t){if(!t.heldObject)return null;const i=t.heldObject;return t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.velocity.x=t.velocity.x*.4,i.velocity.y=t.velocity.y*.4,i.verticalVelocity=0,i}}class ht{constructor(){d(this,"id","throw");d(this,"name","Throw Ability");d(this,"enabled",!0);d(this,"baseThrowForce",7.6);d(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const o=Math.max(e.x,Math.min(t,e.x+e.width)),c=Math.max(e.y,Math.min(i,e.y+e.height)),l=t-o,n=i-c;return l*l+n*n<s*s}computeLaunchVelocity(t,i,s,e,o,c,l,n=!0,r=!0){const a=e-t,u=o-i,v=Math.hypot(a,u);if(v<.1)return null;const b=Math.min(v,this.maxThrowAimDistance),f=a/v,x=u/v,p=t+f*b,M=i+x*b;if(!n||!r){const B=Math.max(3,l),R=Math.max(.14,b/B),$=f*B,O=x*B;return{vx:$,vy:O,vz:0,totalTime:R,finalTargetX:p,finalTargetY:M,targetSurfaceHeight:s}}const y=c.getSupportingSurfaceHeight(p,M),g=Math.max(3,l);let S=Math.max(.14,b/g);const w=35,E=.35;for(let B=1;B<w;B++){const R=B/w,$=t+(p-t)*R,O=i+(M-i)*R;for(const h of c.walls)if(this.testWallIntersection($,O,E,h)){if(y>0&&p>=h.x&&p<=h.x+h.width&&M>=h.y&&M<=h.y+h.height&&R>.65)continue;const q=(1-R)*s+R*y,z=h.wallHeight+.3-q;if(z>0){const W=2*z/(c.gravity*R*(1-R));if(W>0){const T=Math.sqrt(W);T>S&&(S=T)}}}}if(S<=.05)return null;const F=(y-s+.5*c.gravity*S*S)/S,C=b/S,k=f*C,P=x*C;return{vx:k,vy:P,vz:F,totalTime:S,finalTargetX:p,finalTargetY:M,targetSurfaceHeight:y}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const o=t.heldObject,c=o.position.x,l=o.position.y,n=o.position.z,r=this.baseThrowForce*t.strength,a=o.hasGravity&&o.hasVerticalVelocity,u=this.computeLaunchVelocity(c,l,n,i,s,e,r,o.hasGravity,o.hasVerticalVelocity);if(!u)return null;const{vx:v,vy:b,vz:f,totalTime:x,finalTargetX:p,finalTargetY:M,targetSurfaceHeight:y}=u,g=90,m=x/g,S=[];let w=!1,E=y>0,F;for(let k=0;k<=g;k++){const P=k*m,B=k===g?p:c+v*P,R=k===g?M:l+b*P,$=a?n+f*P-.5*e.gravity*P*P:n,O=a?k===g?y:Math.max(y,$):n,h=a?f-e.gravity*P:0,A=O>e.wallHeight;let q=!1,D=!1;for(const z of e.walls)if(this.testWallIntersection(B,R,o.colliderRadius,z)&&(q=!0,O<=z.wallHeight+.001)){if(S.length>0&&S[S.length-1].z>=z.wallHeight-.05&&h<=0){if(y>0&&(k>=g-2||Math.hypot(B-p,R-M)<.2)){E=!0;break}else if(y===0){E=!0,D=!0,w=!0,F=z.id;break}}else if(O<z.wallHeight-.05){D=!0,w=!0,F=z.id;break}}if(S.push({x:B,y:R,z:O,t:P,couldClearWall:A,isOverWall:q,collidesWall:D}),D)break}const C=S[S.length-1];return{points:S,landPoint:{x:w?C.x:p,y:w?C.y:M},isBlockedByWall:w,isLandingOnWallTop:w?E:y>0,blockedAtWallId:F}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const o=t.heldObject,c=o.position.x,l=o.position.y,n=o.position.z,r=this.baseThrowForce*t.strength,a=this.computeLaunchVelocity(c,l,n,i,s,e,r,o.hasGravity,o.hasVerticalVelocity);if(!a)return null;if(o.isHeld=!1,o.heldBy=null,o.velocity.x=a.vx,o.velocity.y=a.vy,o.verticalVelocity=a.vz,o.position.z=o.hasVerticalPosition?Math.max(.3,o.position.z):0,o.hasFriction&&o.rollModule&&o.rollModule.enabled){const f=o.colliderRadius>0?o.colliderRadius:.3;o.rollModule.angularVelocity.y=a.vx/f,o.rollModule.angularVelocity.x=-a.vy/f}const u=o.hasMass?o.mass:0,v=t.hasMass?Math.max(.2,t.baseMass):0,b=u>0&&v>0?u/v:0;return t.heldObject=null,t.velocity.x-=a.vx*b,t.velocity.y-=a.vy*b,o}}class st extends U{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});d(this,"strength");d(this,"facingAngle");d(this,"heldObject");d(this,"isCharacter",!0);d(this,"isActivelyWalking",!1);d(this,"baseMass",1.2);d(this,"walkingModule");d(this,"pickupModule");d(this,"throwModule");d(this,"isAiming");d(this,"aimTarget");d(this,"activeTrajectory");this.baseMass=i.mass??1.2,this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.walkingModule=new rt,this.pickupModule=new dt,this.throwModule=new ht}get mass(){const i=this.hasMass?this.baseMass:0,s=this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0;return i+s}set mass(i){this.baseMass=Math.max(.1,i),this.massModule&&(this.massModule.mass=this.baseMass)}get carriedMass(){return this.heldObject&&this.heldObject.hasMass?this.heldObject.mass:0}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const o=s.x-this.position.x,c=s.y-this.position.y;if(Math.hypot(o,c)>.1){this.facingAngle=Math.atan2(c,o);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,o,c){if(this.walkingModule&&this.walkingModule.update(this,s,i,c),this.updatePosition(i,c),this.updateFacingDirection(e,o,s),this.heldObject){const l=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*l,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*l,this.heldObject.position.z=this.heldObject.hasVerticalPosition?.45:0,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=o,this.heldObject&&this.throwModule&&o?this.activeTrajectory=this.throwModule.calculateTrajectory(this,o.x,o.y,c):this.activeTrajectory=null}}class it{constructor(t={}){d(this,"enabled",!0);d(this,"angularVelocity",{x:0,y:0,z:0});d(this,"rollResistance",.4);d(this,"visualPhase",0);var i,s,e;this.enabled=t.enabled??!0,this.angularVelocity={x:((i=t.angularVelocity)==null?void 0:i.x)??0,y:((s=t.angularVelocity)==null?void 0:s.y)??0,z:((e=t.angularVelocity)==null?void 0:e.z)??0},this.rollResistance=t.rollResistance??.4}get angularSpeed(){return Math.hypot(this.angularVelocity.x,this.angularVelocity.y,this.angularVelocity.z)}updateVisualPhase(t){const i=this.angularSpeed;i>.001&&(this.visualPhase=(this.visualPhase+i*t)%(Math.PI*2))}}class vt{constructor(t){d(this,"ctx");this.ctx=t}render(t,i,s,e,o=!1,c){const l=this.ctx,n=l.canvas.width/t.width;l.clearRect(0,0,l.canvas.width,l.canvas.height),this.drawFloorGrid(t,n),this.drawWalls(t,n);const r=[i,...s];r.sort((a,u)=>Math.abs(a.position.z-u.position.z)>.001?a.position.z-u.position.z:Math.abs(a.verticalVelocity-u.verticalVelocity)>.001?a.verticalVelocity-u.verticalVelocity:a.position.y-u.position.y);for(const a of r)a instanceof st?this.drawCharacter(a,s,n):this.drawFreebodyObject(a,r,i,n);for(const a of r)this.drawObjectShadow(a,t,n);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,n),o&&(c&&c!==e&&this.drawHoverGizmo(c,n),e&&this.drawSelectionGizmo(e,o,n))}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawObjectShadow(t,i,s){const e=this.ctx,o=t.position.x*s,c=t.position.y*s,l=t.position.z,n=1+l/i.wallHeight*1.5,r=t.colliderRadius*s*n,a=Math.max(.3,.85-l/(i.wallHeight*7)*.25),u=l>i.wallHeight;if(e.save(),e.beginPath(),t.visualShape==="box"){const v=r*2,b=Math.max(3,4*n);e.roundRect?e.roundRect(o-r,c-r,v,v,b):e.rect(o-r,c-r,v,v)}else e.arc(o,c,r,0,Math.PI*2);u?(e.strokeStyle=`rgba(56, 189, 248, ${a})`,e.lineWidth=2.5):(e.strokeStyle=`rgba(255, 255, 255, ${a})`,e.lineWidth=1.8),l>.01&&e.setLineDash([4,3]),e.stroke(),e.restore()}drawFreebodyObject(t,i,s,e){var f,x;const o=this.ctx,c=t.position.x*e,l=t.position.y*e,n=t.hasCollider?t.colliderRadius:((f=t.colliderModule)==null?void 0:f.radius)??.32,r=n*e,a=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled,u=Math.hypot(t.position.x-s.position.x,t.position.y-s.position.y),v=a&&!t.isHeld&&u<=(((x=s.pickupModule)==null?void 0:x.pickupReach)??1.3)+n;if(v){if(o.save(),o.beginPath(),t.visualShape==="box"){const p=(r+5)*2;o.roundRect?o.roundRect(c-r-5,l-r-5,p,p,6):o.rect(c-r-5,l-r-5,p,p)}else o.arc(c,l,r+5,0,Math.PI*2);o.strokeStyle="#38bdf8",o.lineWidth=2.5,o.setLineDash([4,4]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 10px sans-serif",o.textAlign="center",o.fillText("grab",c,l-r-6),o.restore()}let b=!1;if(t.isAboveGround)for(const p of i){if(p===t)continue;if(Math.hypot(t.position.x-p.position.x,t.position.y-p.position.y)<t.colliderRadius+p.colliderRadius&&(t.position.z>p.position.z||Math.abs(t.position.z-p.position.z)<=.01&&t.verticalVelocity>p.verticalVelocity)){b=!0;break}}if(o.save(),o.globalAlpha=b?.55:1,t.visualShape==="box"){const p=r*2,M=Math.max(3,r*.16),y=c-r,g=l-r;o.beginPath(),o.roundRect?o.roundRect(y,g,p,p,M):o.rect(y,g,p,p),o.fillStyle=t.color,o.fill(),o.strokeStyle=v?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=v?2.5:2,o.stroke();const m=Math.max(3,r*.22);o.beginPath(),o.roundRect?o.roundRect(y+m,g+m,p-m*2,p-m*2,M*.7):o.rect(y+m,g+m,p-m*2,p-m*2),o.strokeStyle="rgba(0, 0, 0, 0.25)",o.lineWidth=1.6,o.stroke(),o.beginPath(),o.moveTo(y+m,g+m),o.lineTo(y+p-m,g+p-m),o.moveTo(y+p-m,g+m),o.lineTo(y+m,g+p-m),o.strokeStyle="rgba(0, 0, 0, 0.16)",o.lineWidth=1.4,o.stroke()}else o.beginPath(),o.arc(c,l,r,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=v?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=v?2.5:2,o.stroke();this.drawRollIndicator(t,c,l,r),o.restore()}drawCharacter(t,i,s){const e=this.ctx,o=t.position.x*s,c=t.position.y*s,l=t.colliderRadius*s;let n=!1;if(t.isAboveGround)for(const y of i){if(y===t)continue;if(Math.hypot(t.position.x-y.position.x,t.position.y-y.position.y)<t.colliderRadius+y.colliderRadius&&(t.position.z>y.position.z||Math.abs(t.position.z-y.position.z)<=.01&&t.verticalVelocity>y.verticalVelocity)){n=!0;break}}e.save(),e.globalAlpha=n?.55:1,e.beginPath(),e.arc(o,c,l,0,Math.PI*2),e.fillStyle=t.color,e.fill(),e.strokeStyle="#ffffff",e.lineWidth=2.5,e.stroke(),this.drawRollIndicator(t,o,c,l);const r=.52,a=l*.72,u=Math.max(3.5,l*.18),v=t.facingAngle-r,b=t.facingAngle+r,f=o+Math.cos(v)*a,x=c+Math.sin(v)*a,p=o+Math.cos(b)*a,M=c+Math.sin(b)*a;e.fillStyle="#000000",e.beginPath(),e.arc(f,x,u,0,Math.PI*2),e.arc(p,M,u,0,Math.PI*2),e.fill(),t.heldObject&&(e.strokeStyle="rgba(255, 255, 255, 0.6)",e.setLineDash([3,3]),e.lineWidth=1.5,e.beginPath(),e.moveTo(o,c),e.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),e.stroke(),e.setLineDash([])),e.restore()}drawRollIndicator(t,i,s,e){if(!t.rollModule||!t.rollModule.enabled)return;const o=t.rollModule,c=o.angularVelocity.x,l=o.angularVelocity.y,n=o.angularVelocity.z,r=Math.hypot(c,l,n);if(r<.02)return;const a=this.ctx,v=Math.hypot(c,l)<.05*r;if(a.save(),v){const b=e*.45,f=e*.78;a.beginPath(),a.arc(i,s,b,0,Math.PI*2),a.strokeStyle="rgba(255, 255, 255, 0.45)",a.lineWidth=1.5,a.setLineDash([]),a.stroke(),a.beginPath(),a.arc(i,s,f,0,Math.PI*2),a.strokeStyle="rgba(255, 255, 255, 0.95)",a.lineWidth=2,a.setLineDash([4,4]),a.lineDashOffset=-o.visualPhase*f*Math.sign(n||1),a.stroke()}else{const b=Math.atan2(-c,l),f=e*.82,x=Math.abs(n)/r,p=f*Math.pow(x,.85);a.translate(i,s),a.rotate(b);const M=n!==0?Math.sign(n):1;p<.5?(a.beginPath(),a.moveTo(-f,0),a.lineTo(f,0),a.strokeStyle="rgba(255, 255, 255, 0.95)",a.lineWidth=2.2,a.setLineDash([4,4]),a.lineDashOffset=-o.visualPhase*f,a.stroke()):(a.beginPath(),a.ellipse(0,0,f,p,0,0,Math.PI),a.strokeStyle="rgba(255, 255, 255, 0.95)",a.lineWidth=2.2,a.setLineDash([4,4]),a.lineDashOffset=-o.visualPhase*f*M,a.stroke(),a.beginPath(),a.ellipse(0,0,f,p,0,Math.PI,Math.PI*2),a.strokeStyle="rgba(255, 255, 255, 0.25)",a.lineWidth=1.8,a.setLineDash([4,4]),a.lineDashOffset=-o.visualPhase*f*M,a.stroke())}a.restore()}drawTrajectory(t,i){const s=this.ctx,e=t.points;if(e.length<2)return;s.save();for(let c=0;c<e.length-1;c++){const l=e[c],n=e[c+1];s.beginPath(),s.moveTo(l.x*i,l.y*i),s.lineTo(n.x*i,n.y*i),l.couldClearWall||n.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const o=e[e.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const c=8;s.beginPath(),s.moveTo(o.x*i-c,o.y*i-c),s.lineTo(o.x*i+c,o.y*i+c),s.moveTo(o.x*i+c,o.y*i-c),s.lineTo(o.x*i-c,o.y*i+c),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}drawHoverGizmo(t,i){var n;const s=this.ctx,e=t.position.x*i,o=t.position.y*i,l=((t.hasCollider?t.colliderRadius:((n=t.colliderModule)==null?void 0:n.radius)??.32)+.08)*i;s.save(),s.strokeStyle="rgba(251, 191, 36, 0.6)",s.lineWidth=1.5,s.setLineDash([4,4]),s.beginPath(),s.arc(e,o,l,0,Math.PI*2),s.stroke(),s.restore()}drawSelectionGizmo(t,i,s){var v;const e=this.ctx,o=t.position.x*s,c=t.position.y*s,r=(t.hasCollider?t.colliderRadius:((v=t.colliderModule)==null?void 0:v.radius)??.32)*s+6,a=Math.max(6,r*.4),u=i?"#fbbf24":"#38bdf8";if(e.save(),e.strokeStyle=u,e.lineWidth=2,e.setLineDash([]),e.beginPath(),e.moveTo(o-r,c-r+a),e.lineTo(o-r,c-r),e.lineTo(o-r+a,c-r),e.stroke(),e.beginPath(),e.moveTo(o+r-a,c-r),e.lineTo(o+r,c-r),e.lineTo(o+r,c-r+a),e.stroke(),e.beginPath(),e.moveTo(o+r,c+r-a),e.lineTo(o+r,c+r),e.lineTo(o+r-a,c+r),e.stroke(),e.beginPath(),e.moveTo(o-r+a,c+r),e.lineTo(o-r,c+r),e.lineTo(o-r,c+r-a),e.stroke(),i){const b=`${t.name} (${t.mass.toFixed(1)}kg)`;e.font="bold 10px 'Segoe UI', system-ui, sans-serif";const x=e.measureText(b).width+12,p=16,M=o-x/2,y=c-r-p-4;e.fillStyle="rgba(15, 23, 42, 0.85)",e.strokeStyle=u,e.lineWidth=1,e.beginPath(),e.roundRect(M,y,x,p,4),e.fill(),e.stroke(),e.fillStyle=u,e.textAlign="center",e.textBaseline="middle",e.fillText(b,o,y+p/2)}e.restore()}}class gt{constructor(t,i){d(this,"canvas");d(this,"arena");d(this,"keysPressed",new Set);d(this,"mousePos",{x:0,y:0});d(this,"isMouseDown",!1);d(this,"movementVector",{x:0,y:0});d(this,"justPickedUp",!1);d(this,"hoverEntity",null);d(this,"selectedCanvasEntity",null);d(this,"draggedEntity",null);d(this,"dragOffset",{x:0,y:0});d(this,"handleClick");d(this,"onMouseDown");d(this,"onMouseUp");d(this,"onRightClick");d(this,"onDropAttempt");d(this,"onMouseMove");this.canvas=t,this.arena=i,this.setupListeners()}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y)}),this.canvas.addEventListener("mousedown",t=>{t.button!==2&&t.button===0&&(this.isMouseDown=!0,this.updateMousePos(t),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.onMouseDown&&this.onMouseDown(this.mousePos.x,this.mousePos.y),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&(this.updateTouchPos(t.touches[0]),this.onMouseMove&&this.onMouseMove(this.mousePos.x,this.mousePos.y))},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1,this.onMouseUp&&this.onMouseUp(this.mousePos.x,this.mousePos.y)})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){e&&(this.selectedCanvasEntity=e.selectedEntity);const o=(c,l,n=.35)=>{var u;for(let v=s.length-1;v>=0;v--){const b=s[v],f=b.hasCollider?b.colliderRadius:((u=b.colliderModule)==null?void 0:u.radius)??.32;if(Math.hypot(b.position.x-c,b.position.y-l)<=f+n)return b}const r=t.hasCollider?t.colliderRadius:.44;return Math.hypot(t.position.x-c,t.position.y-l)<=r+n?t:null};this.onMouseDown=(c,l)=>{if(e!=null&&e.isEditMode){const n=o(c,l,.35);n?(this.selectedCanvasEntity=n,e.setSelectedEntity(n),this.draggedEntity=n,this.dragOffset.x=n.position.x-c,this.dragOffset.y=n.position.y-l,this.canvas.style.cursor="grabbing"):(this.selectedCanvasEntity=null,this.draggedEntity=null)}},this.onMouseMove=(c,l)=>{var n;if(e!=null&&e.isEditMode)if(this.isMouseDown&&this.draggedEntity){const r=c+this.dragOffset.x,a=l+this.dragOffset.y,u=this.draggedEntity.hasCollider?this.draggedEntity.colliderRadius:((n=this.draggedEntity.colliderModule)==null?void 0:n.radius)??.32;this.draggedEntity.position.x=Math.max(u,Math.min(i.width-u,r)),this.draggedEntity.position.y=Math.max(u,Math.min(i.height-u,a)),this.draggedEntity.velocity.x=0,this.draggedEntity.velocity.y=0,this.draggedEntity.verticalVelocity=0,this.draggedEntity.rollModule&&(this.draggedEntity.rollModule.angularVelocity.x=0,this.draggedEntity.rollModule.angularVelocity.y=0,this.draggedEntity.rollModule.angularVelocity.z=0),this.canvas.style.cursor="grabbing"}else{const r=o(c,l,.3);this.hoverEntity=r,this.canvas.style.cursor=r?"grab":"crosshair"}else this.hoverEntity=null,this.draggedEntity=null,this.canvas.style.cursor="default"},this.onMouseUp=(c,l)=>{if(this.draggedEntity&&(this.draggedEntity=null),e!=null&&e.isEditMode){const n=o(this.mousePos.x,this.mousePos.y,.3);this.hoverEntity=n,this.canvas.style.cursor=n?"grab":"crosshair"}},this.handleClick=(c,l)=>{if(!(e!=null&&e.isEditMode)){if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,c,l,i);return}if(!t.heldObject&&t.pickupModule){const n=t.pickupModule.findTargetObject(t,c,l,s);n&&(t.pickupModule.pickup(t,n),this.justPickedUp=!0)}}},this.onRightClick=(c,l)=>{if(!e)return;const n=o(c,l,.4);n&&(this.selectedCanvasEntity=n,e.setSelectedEntity(n))},this.onDropAttempt=()=>{t.heldObject&&t.pickupModule&&t.pickupModule.drop(t)}}}class bt{constructor(t){d(this,"container");d(this,"character");d(this,"arena");d(this,"objects");d(this,"onSpawnObject");d(this,"onDeleteObject");d(this,"onClearObjects");d(this,"selectedEntity");d(this,"isEditMode",!1);d(this,"onSelectionChange");d(this,"creatorState",{name:"Custom Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.3,hasMass:!0,mass:1,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.2,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4});d(this,"presets",{"Light Blue Box":{name:"Light Blue Box",visualShape:"box",color:"#38bdf8",hasCollider:!0,colliderRadius:.26,hasMass:!0,mass:.7,hasFriction:!0,staticFrictionMod:1,dynamicFrictionMod:1,hasBounce:!0,bounceMod:.25,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Heavy Red Box":{name:"Heavy Red Box",visualShape:"box",color:"#f87171",hasCollider:!0,colliderRadius:.4,hasMass:!0,mass:2.6,hasFriction:!0,staticFrictionMod:1.2,dynamicFrictionMod:1.2,hasBounce:!1,bounceMod:.05,verticalBounce:!1,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Bouncy Ball":{name:"Super Bouncy Ball",visualShape:"circle",color:"#4ade80",hasCollider:!0,colliderRadius:.24,hasMass:!0,mass:.5,hasFriction:!0,staticFrictionMod:.8,dynamicFrictionMod:.8,hasBounce:!0,bounceMod:.88,verticalBounce:!0,hasVerticalPosition:!0,elevation:.6,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!1,rollResistance:.4},"Rolling Ball":{name:"Rolling Ball",visualShape:"circle",color:"#a855f7",hasCollider:!0,colliderRadius:.28,hasMass:!0,mass:.6,hasFriction:!0,staticFrictionMod:.5,dynamicFrictionMod:.5,hasBounce:!0,bounceMod:.95,verticalBounce:!0,hasVerticalPosition:!0,elevation:.1,hasVerticalVelocity:!0,hasGravity:!0,hasRollModule:!0,rollResistance:0},"Ghost Box":{name:"Ghost Box (No Collider)",visualShape:"box",color:"#94a3b8",hasCollider:!1,colliderRadius:.3,hasMass:!1,mass:0,hasFriction:!1,staticFrictionMod:0,dynamicFrictionMod:0,hasBounce:!1,bounceMod:0,verticalBounce:!1,hasVerticalPosition:!1,elevation:0,hasVerticalVelocity:!1,hasGravity:!1,hasRollModule:!1,rollResistance:0}});d(this,"inspectorEl");d(this,"entitySelectorEl");d(this,"characterSpecificControlsEl");d(this,"objectSpecificControlsEl");d(this,"modePlayBtn");d(this,"modeEditBtn");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onDeleteObject=t.onDeleteObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){var i;this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders(),(i=this.onSelectionChange)==null||i.call(this,t)}setMode(t){this.isEditMode=t,this.modePlayBtn&&this.modeEditBtn&&(this.isEditMode?(this.modePlayBtn.classList.remove("active-play"),this.modeEditBtn.classList.add("active-edit")):(this.modePlayBtn.classList.add("active-play"),this.modeEditBtn.classList.remove("active-edit")))}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;for(const e of this.objects){const o=e.id===t?"selected":"",c=e.visualShape==="box"?"📦":"⚪",l=e.hasMass?`${e.mass.toFixed(1)}kg`:"Massless";i+=`<option value="${e.id}" ${o}>${c} ${e.name} (${l})</option>`}this.entitySelectorEl.innerHTML=i;const s=this.selectedEntity===this.character;this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=s?"flex":"none"),this.objectSpecificControlsEl&&(this.objectSpecificControlsEl.style.display=s?"none":"flex")}renderPanel(){var t,i,s,e,o,c,l,n,r,a,u,v,b,f,x,p,M,y,g,m,S,w,E,F,C,k,P,B,R,$,O,h,A,q,D,z,W,T,H,j,I,X,L,G,Q,Y,Z;this.container.innerHTML=`
      <div class="dev-panel-header">
        <div class="header-top-row">
          <h2>🛠️ Sandbox & Engine</h2>
          <span class="badge">1 Wall = 1 Unit</span>
        </div>
        <div class="mode-switcher">
          <button id="mode-play" class="mode-btn ${this.isEditMode?"":"active-play"}">🎮 Play Mode</button>
          <button id="mode-edit" class="mode-btn ${this.isEditMode?"active-edit":""}">✏️ Edit Mode</button>
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
              <button id="toggle-mod-friction" class="btn-toggle ${(o=this.selectedEntity.frictionModule)!=null&&o.enabled?"active":""}">
                ${(c=this.selectedEntity.frictionModule)!=null&&c.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-friction-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((l=this.selectedEntity.frictionModule)!=null&&l.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no normal force)
            </div>
            <div id="group-mod-friction" style="display: ${(n=this.selectedEntity.frictionModule)!=null&&n.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Static Friction Mod</span>
                  <span id="val-entity-static-fric">${(((r=this.selectedEntity.frictionModule)==null?void 0:r.staticFrictionMod)??1).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${((a=this.selectedEntity.frictionModule)==null?void 0:a.staticFrictionMod)??1}">
              </div>
              <div class="slider-group">
                <div class="slider-label">
                  <span>Dynamic Friction Mod</span>
                  <span id="val-entity-dynamic-fric">${(((u=this.selectedEntity.frictionModule)==null?void 0:u.dynamicFrictionMod)??1).toFixed(2)}</span>
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
              <button id="toggle-mod-bounce" class="btn-toggle ${(f=this.selectedEntity.bounceModule)!=null&&f.enabled?"active":""}">
                ${(x=this.selectedEntity.bounceModule)!=null&&x.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass&&((p=this.selectedEntity.bounceModule)!=null&&p.enabled)?"block":"none"};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${(M=this.selectedEntity.bounceModule)!=null&&M.enabled?"block":"none"};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(((y=this.selectedEntity.bounceModule)==null?void 0:y.bounceMod)??.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${((g=this.selectedEntity.bounceModule)==null?void 0:g.bounceMod)??.4}">
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
              <button id="toggle-mod-roll" class="btn-toggle ${(F=this.selectedEntity.rollModule)!=null&&F.enabled?"active":""}">
                ${(C=this.selectedEntity.rollModule)!=null&&C.enabled?"Attached":"Detached"}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${(k=this.selectedEntity.rollModule)!=null&&k.enabled&&!this.selectedEntity.hasFriction?"block":"none"}; color: #cbd5e1;">
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
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction&&((h=this.character.walkingModule)!=null&&h.enabled)?"block":"none"};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="group-mod-walking" style="display: ${(A=this.character.walkingModule)!=null&&A.enabled?"flex":"none"}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(((q=this.character.walkingModule)==null?void 0:q.maxWalkForce)??35).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${((D=this.character.walkingModule)==null?void 0:D.maxWalkForce)??35}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(((z=this.character.walkingModule)==null?void 0:z.maxWalkSpeed)??5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((W=this.character.walkingModule)==null?void 0:W.maxWalkSpeed)??5.2}">
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
                <button id="toggle-pickup" class="btn-toggle ${(T=this.character.pickupModule)!=null&&T.enabled?"active":""}">
                  ${(H=this.character.pickupModule)!=null&&H.enabled?"Attached":"Detached"}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${(j=this.character.pickupModule)!=null&&j.enabled?"block":"none"};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(((I=this.character.pickupModule)==null?void 0:I.pickupReach)??1.3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${((X=this.character.pickupModule)==null?void 0:X.pickupReach)??1.3}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${(L=this.character.throwModule)!=null&&L.enabled?"active":""}">
                  ${(G=this.character.throwModule)!=null&&G.enabled?"Attached":"Detached"}
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
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.objectSpecificControlsEl=this.container.querySelector("#object-actions-row"),this.modePlayBtn=this.container.querySelector("#mode-play"),this.modeEditBtn=this.container.querySelector("#mode-edit"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){var z,W,T,H,j,I,X;const t=this.selectedEntity,i=t===this.character,s=this.container.querySelector("#row-visual-shape");s&&(s.style.display=i?"none":"flex");const e=this.container.querySelector("#toggle-entity-shape");e&&(t.visualShape==="box"?(e.textContent="Box 📦",e.classList.add("active")):(e.textContent="Circle ⚪",e.classList.remove("active")));const o=this.container.querySelector("#toggle-mod-collider"),c=this.container.querySelector("#group-mod-collider"),l=this.container.querySelector("#note-mod-collider");o&&(o.textContent=t.hasCollider?"Attached":"Detached",o.classList.toggle("active",t.hasCollider)),c&&(c.style.display=t.hasCollider?"block":"none"),l&&(l.style.display=t.hasCollider?"none":"block"),this.setSliderVal("slide-entity-radius","val-entity-radius",((z=t.colliderModule)==null?void 0:z.radius)??.32,2);const n=this.container.querySelector("#toggle-mod-mass"),r=this.container.querySelector("#group-mod-mass"),a=this.container.querySelector("#note-mod-mass");n&&(n.textContent=t.hasMass?"Attached":"Detached",n.classList.toggle("active",t.hasMass)),r&&(r.style.display=t.hasMass?"block":"none"),a&&(a.style.display=t.hasMass?"none":"block"),this.setSliderVal("slide-entity-mass","val-entity-mass",((W=t.massModule)==null?void 0:W.mass)??1,1);const u=this.container.querySelector("#toggle-mod-friction"),v=this.container.querySelector("#group-mod-friction"),b=this.container.querySelector("#note-mod-friction"),f=this.container.querySelector("#warn-friction-mass"),x=!!(t.frictionModule&&t.frictionModule.enabled);u&&(u.textContent=x?"Attached":"Detached",u.classList.toggle("active",x)),v&&(v.style.display=x?"flex":"none"),b&&(b.style.display=x?"none":"block"),f&&(f.style.display=!t.hasMass&&x?"block":"none"),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",((T=t.frictionModule)==null?void 0:T.staticFrictionMod)??1,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",((H=t.frictionModule)==null?void 0:H.dynamicFrictionMod)??1,2);const p=this.container.querySelector("#toggle-mod-bounce"),M=this.container.querySelector("#group-mod-bounce"),y=this.container.querySelector("#note-mod-bounce"),g=this.container.querySelector("#warn-bounce-mass"),m=!!(t.bounceModule&&t.bounceModule.enabled);p&&(p.textContent=m?"Attached":"Detached",p.classList.toggle("active",m)),M&&(M.style.display=m?"block":"none"),y&&(y.style.display=m?"none":"block"),g&&(g.style.display=!t.hasMass&&m?"block":"none"),this.setSliderVal("slide-entity-bounce","val-entity-bounce",((j=t.bounceModule)==null?void 0:j.bounceMod)??.4,2);const S=this.container.querySelector("#check-mod-vert-bounce"),w=this.container.querySelector("#warn-bounce-vert-vel");if(S&&(S.checked=!!((I=t.bounceModule)!=null&&I.verticalBounce)),w){const L=!!(m&&((X=t.bounceModule)!=null&&X.verticalBounce)&&!t.hasVerticalVelocity);w.style.display=L?"block":"none"}const E=this.container.querySelector("#toggle-mod-vert-pos"),F=this.container.querySelector("#group-mod-vert-pos"),C=this.container.querySelector("#note-mod-vert-pos"),k=t.hasVerticalPosition;E&&(E.textContent=k?"Attached":"Detached",E.classList.toggle("active",k)),F&&(F.style.display=k?"block":"none"),C&&(C.style.display=k?"none":"block"),this.setSliderVal("slide-entity-elevation","val-entity-elevation",t.position.z,2);const P=this.container.querySelector("#toggle-mod-vert-vel"),B=this.container.querySelector("#group-mod-vert-vel"),R=t.hasVerticalVelocity;P&&(P.textContent=R?"Enabled":"Disabled",P.classList.toggle("active",R)),B&&(B.style.display=R?"block":"none"),this.setSliderVal("slide-entity-vert-vel","val-entity-vert-vel",t.verticalVelocity,2);const $=this.container.querySelector("#toggle-mod-gravity"),O=this.container.querySelector("#note-mod-gravity");$&&($.textContent=t.hasGravity?"Attached":"Detached",$.classList.toggle("active",t.hasGravity)),O&&(O.textContent=t.hasGravity?"Subject to static world gravity acceleration":"Zero-G: never falls, flies horizontally in a straight line");const h=this.container.querySelector("#toggle-mod-roll"),A=this.container.querySelector("#group-mod-roll"),q=this.container.querySelector("#note-roll-friction"),D=!!(t.rollModule&&t.rollModule.enabled);if(h&&(h.textContent=D?"Attached":"Detached",h.classList.toggle("active",D)),A&&(A.style.display=D?"block":"none"),q&&(q.style.display=D&&!t.hasFriction?"block":"none"),t.rollModule&&this.setSliderVal("slide-entity-roll-resist","val-entity-roll-resist",t.rollModule.rollResistance,2),i){const L=this.container.querySelector("#toggle-walk"),G=this.container.querySelector("#group-mod-walking"),Q=this.container.querySelector("#warn-walk-friction"),Y=!!(this.character.walkingModule&&this.character.walkingModule.enabled);L&&(L.textContent=Y?"Attached":"Detached",L.classList.toggle("active",Y)),G&&(G.style.display=Y?"flex":"none"),Q&&(Q.style.display=Y&&!this.character.hasFriction?"block":"none"),this.character.walkingModule&&(this.setSliderVal("slide-walk-force","val-walk-force",this.character.walkingModule.maxWalkForce,0),this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1)),this.setSliderVal("slide-strength","val-strength",this.character.strength,1);const Z=this.container.querySelector("#toggle-pickup"),nt=this.container.querySelector("#group-mod-pickup"),ot=!!(this.character.pickupModule&&this.character.pickupModule.enabled);Z&&(Z.textContent=ot?"Attached":"Detached",Z.classList.toggle("active",ot)),nt&&(nt.style.display=ot?"block":"none"),this.character.pickupModule&&this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1);const lt=this.container.querySelector("#toggle-throw"),ct=this.container.querySelector("#group-mod-throw"),at=!!(this.character.throwModule&&this.character.throwModule.enabled);lt&&(lt.textContent=at?"Attached":"Detached",lt.classList.toggle("active",at)),ct&&(ct.style.display=at?"block":"none"),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1)}}setSliderVal(t,i,s,e){const o=this.container.querySelector(`#${t}`),c=this.container.querySelector(`#${i}`);o&&(o.value=s.toString()),c&&(c.textContent=e>0?s.toFixed(e):Math.round(s).toString())}syncCreatorInputs(){const t=this.creatorState,i=this.container.querySelector("#creator-name");i&&(i.value=t.name);const s=this.container.querySelector("#creator-toggle-shape");s&&(s.textContent=t.visualShape==="box"?"Box 📦":"Circle ⚪",s.classList.toggle("active",t.visualShape==="box"));const e=this.container.querySelector("#creator-color"),o=this.container.querySelector("#val-creator-color");e&&(e.value=t.color),o&&(o.textContent=t.color);const c=this.container.querySelector("#creator-toggle-collider"),l=this.container.querySelector("#grp-creator-radius");c&&(c.textContent=t.hasCollider?"Attached":"Detached",c.classList.toggle("active",t.hasCollider)),l&&(l.style.display=t.hasCollider?"block":"none"),this.setSliderVal("slide-creator-radius","val-creator-radius",t.colliderRadius,2);const n=this.container.querySelector("#creator-toggle-mass"),r=this.container.querySelector("#grp-creator-mass");n&&(n.textContent=t.hasMass?"Attached":"Detached",n.classList.toggle("active",t.hasMass)),r&&(r.style.display=t.hasMass?"block":"none"),this.setSliderVal("slide-creator-mass","val-creator-mass",t.mass,1);const a=this.container.querySelector("#creator-toggle-friction"),u=this.container.querySelector("#grp-creator-fric");a&&(a.textContent=t.hasFriction?"Attached":"Detached",a.classList.toggle("active",t.hasFriction)),u&&(u.style.display=t.hasFriction?"block":"none"),this.setSliderVal("slide-creator-fric","val-creator-fric",t.dynamicFrictionMod,2);const v=this.container.querySelector("#creator-toggle-bounce"),b=this.container.querySelector("#grp-creator-bounce"),f=this.container.querySelector("#creator-check-vert-bounce"),x=this.container.querySelector("#creator-warn-bounce-vert");v&&(v.textContent=t.hasBounce?"Attached":"Detached",v.classList.toggle("active",t.hasBounce)),b&&(b.style.display=t.hasBounce?"block":"none"),f&&(f.checked=t.verticalBounce),x&&(x.style.display=t.hasBounce&&t.verticalBounce&&(!t.hasVerticalPosition||!t.hasVerticalVelocity)?"block":"none"),this.setSliderVal("slide-creator-bounce","val-creator-bounce",t.bounceMod,2);const p=this.container.querySelector("#creator-toggle-vert-pos"),M=this.container.querySelector("#grp-creator-vert-pos");p&&(p.textContent=t.hasVerticalPosition?"Attached":"Detached",p.classList.toggle("active",t.hasVerticalPosition)),M&&(M.style.display=t.hasVerticalPosition?"block":"none"),this.setSliderVal("slide-creator-elevation","val-creator-elevation",t.elevation,2);const y=this.container.querySelector("#creator-toggle-vert-vel");y&&(y.textContent=t.hasVerticalVelocity?"Enabled":"Disabled",y.classList.toggle("active",t.hasVerticalVelocity));const g=this.container.querySelector("#creator-toggle-gravity");g&&(g.textContent=t.hasGravity?"Attached":"Detached",g.classList.toggle("active",t.hasGravity));const m=this.container.querySelector("#creator-toggle-roll"),S=this.container.querySelector("#group-creator-roll-resist");m&&(m.textContent=t.hasRollModule?"Enabled":"Disabled",m.classList.toggle("active",t.hasRollModule)),S&&(S.style.display=t.hasRollModule?"block":"none"),this.setSliderVal("slide-creator-roll-resist","val-creator-roll-resist",t.rollResistance,2)}bindEvents(){var B,R,$,O;this.modePlayBtn.addEventListener("click",()=>{this.setMode(!1);const h=this.container.querySelector("#edit-hint-label");h&&(h.textContent="Right-click in arena to select")}),this.modeEditBtn.addEventListener("click",()=>{this.setMode(!0);const h=this.container.querySelector("#edit-hint-label");h&&(h.textContent="Click & drag object in arena")}),this.entitySelectorEl.addEventListener("change",()=>{var A;const h=this.entitySelectorEl.value;if(h===this.character.id)this.selectedEntity=this.character;else{const q=this.objects.find(D=>D.id===h);q&&(this.selectedEntity=q)}this.updateSelectorOptions(),this.syncEntitySliders(),(A=this.onSelectionChange)==null||A.call(this,this.selectedEntity)}),(B=this.container.querySelector("#btn-duplicate-entity"))==null||B.addEventListener("click",()=>{this.duplicateSelectedEntity()}),(R=this.container.querySelector("#btn-delete-entity"))==null||R.addEventListener("click",()=>{this.deleteSelectedEntity()});const t=this.container.querySelector("#toggle-entity-shape");t==null||t.addEventListener("click",()=>{this.selectedEntity.visualShape=this.selectedEntity.visualShape==="box"?"circle":"box",t.textContent=this.selectedEntity.visualShape==="box"?"Box 📦":"Circle ⚪",t.classList.toggle("active",this.selectedEntity.visualShape==="box"),this.updateSelectorOptions()});const i=this.container.querySelector("#toggle-mod-collider");i==null||i.addEventListener("click",()=>{this.selectedEntity.colliderModule?this.selectedEntity.colliderModule.enabled=!this.selectedEntity.colliderModule.enabled:this.selectedEntity.colliderModule=new N({radius:.32}),this.syncEntitySliders()}),this.setupSlider("slide-entity-radius","val-entity-radius",h=>{this.selectedEntity.colliderRadius=h},2);const s=this.container.querySelector("#toggle-mod-mass");s==null||s.addEventListener("click",()=>{this.selectedEntity.massModule?this.selectedEntity.massModule.enabled=!this.selectedEntity.massModule.enabled:this.selectedEntity.massModule=new K({mass:1}),this.syncEntitySliders(),this.updateSelectorOptions()}),this.setupSlider("slide-entity-mass","val-entity-mass",h=>{this.selectedEntity.mass=h,this.updateSelectorOptions()},1);const e=this.container.querySelector("#toggle-mod-friction");e==null||e.addEventListener("click",()=>{this.selectedEntity.frictionModule?this.selectedEntity.frictionModule.enabled=!this.selectedEntity.frictionModule.enabled:this.selectedEntity.frictionModule=new _,this.syncEntitySliders()}),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",h=>{this.selectedEntity.staticGroundFrictionMod=h},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",h=>{this.selectedEntity.dynamicGroundFrictionMod=h},2);const o=this.container.querySelector("#toggle-mod-bounce");o==null||o.addEventListener("click",()=>{this.selectedEntity.bounceModule?this.selectedEntity.bounceModule.enabled=!this.selectedEntity.bounceModule.enabled:this.selectedEntity.bounceModule=new J({bounceMod:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-bounce","val-entity-bounce",h=>{this.selectedEntity.bounceMod=h},2);const c=this.container.querySelector("#check-mod-vert-bounce");c==null||c.addEventListener("change",()=>{this.selectedEntity.bounceModule&&(this.selectedEntity.bounceModule.verticalBounce=c.checked),this.syncEntitySliders(),this.updateInspector()});const l=this.container.querySelector("#toggle-mod-vert-pos");l==null||l.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule?(this.selectedEntity.verticalPositionModule.enabled=!this.selectedEntity.verticalPositionModule.enabled,this.selectedEntity.verticalPositionModule.enabled||(this.selectedEntity.position.z=0,this.selectedEntity.verticalVelocity=0)):this.selectedEntity.verticalPositionModule=new et({z:this.selectedEntity.position.z,hasVerticalVelocity:!0,verticalVelocity:0,enabled:!0}),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-elevation","val-entity-elevation",h=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.z=h),this.selectedEntity.position.z=h,this.syncEntitySliders(),this.updateInspector()},2);const n=this.container.querySelector("#toggle-mod-vert-vel");n==null||n.addEventListener("click",()=>{this.selectedEntity.verticalPositionModule&&(this.selectedEntity.verticalPositionModule.hasVerticalVelocity=!this.selectedEntity.verticalPositionModule.hasVerticalVelocity,this.selectedEntity.verticalPositionModule.hasVerticalVelocity||(this.selectedEntity.verticalVelocity=0)),this.syncEntitySliders(),this.updateInspector()}),this.setupSlider("slide-entity-vert-vel","val-entity-vert-vel",h=>{this.selectedEntity.verticalVelocity=h},2);const r=this.container.querySelector("#toggle-mod-gravity");r==null||r.addEventListener("click",()=>{this.selectedEntity.gravityModule?this.selectedEntity.gravityModule.enabled=!this.selectedEntity.gravityModule.enabled:this.selectedEntity.gravityModule=new tt,this.syncEntitySliders()});const a=this.container.querySelector("#toggle-mod-roll");a==null||a.addEventListener("click",()=>{this.selectedEntity.rollModule?this.selectedEntity.rollModule.enabled=!this.selectedEntity.rollModule.enabled:this.selectedEntity.rollModule=new it({rollResistance:.4}),this.syncEntitySliders()}),this.setupSlider("slide-entity-roll-resist","val-entity-roll-resist",h=>{this.selectedEntity.rollModule&&(this.selectedEntity.rollModule.rollResistance=h)},2);const u=this.container.querySelector("#toggle-walk");u==null||u.addEventListener("click",()=>{this.character.walkingModule?this.character.walkingModule.enabled=!this.character.walkingModule.enabled:this.character.walkingModule=new rt,this.syncEntitySliders()}),this.setupSlider("slide-walk-force","val-walk-force",h=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkForce=h)},0),this.setupSlider("slide-walk-speed","val-walk-speed",h=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=h)},1),this.setupSlider("slide-strength","val-strength",h=>{this.character.strength=h},1);const v=this.container.querySelector("#toggle-pickup");v==null||v.addEventListener("click",()=>{this.character.pickupModule?this.character.pickupModule.enabled=!this.character.pickupModule.enabled:this.character.pickupModule=new dt,this.syncEntitySliders()}),this.setupSlider("slide-pickup-reach","val-pickup-reach",h=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=h)},1);const b=this.container.querySelector("#toggle-throw");b==null||b.addEventListener("click",()=>{this.character.throwModule?this.character.throwModule.enabled=!this.character.throwModule.enabled:this.character.throwModule=new ht,this.syncEntitySliders()}),this.setupSlider("slide-throw-force","val-throw-force",h=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=h)},1),this.setupSlider("slide-gravity","val-gravity",h=>{this.arena.gravity=h},1),this.setupSlider("slide-wall-height","val-wall-height",h=>{this.arena.setStandardWallHeight(h)},1),this.setupSlider("slide-friction","val-friction",h=>{this.arena.frictionCoeff=h},1),this.setupSlider("slide-static-thresh","val-static-thresh",h=>{this.arena.staticFrictionThreshold=h},2),this.container.querySelectorAll(".preset-chip").forEach(h=>{h.addEventListener("click",()=>{const A=h.getAttribute("data-preset");A&&this.presets[A]&&(this.creatorState={...this.presets[A]},this.syncCreatorInputs())})});const x=this.container.querySelector("#creator-name");x==null||x.addEventListener("input",()=>{this.creatorState.name=x.value});const p=this.container.querySelector("#creator-toggle-shape");p==null||p.addEventListener("click",()=>{this.creatorState.visualShape=this.creatorState.visualShape==="box"?"circle":"box",p.textContent=this.creatorState.visualShape==="box"?"Box 📦":"Circle ⚪",p.classList.toggle("active",this.creatorState.visualShape==="box")});const M=this.container.querySelector("#creator-color"),y=this.container.querySelector("#val-creator-color");M==null||M.addEventListener("input",()=>{this.creatorState.color=M.value,y&&(y.textContent=M.value)});const g=this.container.querySelector("#creator-toggle-collider");g==null||g.addEventListener("click",()=>{this.creatorState.hasCollider=!this.creatorState.hasCollider,g.textContent=this.creatorState.hasCollider?"Attached":"Detached",g.classList.toggle("active",this.creatorState.hasCollider);const h=this.container.querySelector("#grp-creator-radius");h&&(h.style.display=this.creatorState.hasCollider?"block":"none")}),this.setupSlider("slide-creator-radius","val-creator-radius",h=>{this.creatorState.colliderRadius=h},2);const m=this.container.querySelector("#creator-toggle-mass");m==null||m.addEventListener("click",()=>{this.creatorState.hasMass=!this.creatorState.hasMass,m.textContent=this.creatorState.hasMass?"Attached":"Detached",m.classList.toggle("active",this.creatorState.hasMass);const h=this.container.querySelector("#grp-creator-mass");h&&(h.style.display=this.creatorState.hasMass?"block":"none")}),this.setupSlider("slide-creator-mass","val-creator-mass",h=>{this.creatorState.mass=h},1);const S=this.container.querySelector("#creator-toggle-friction");S==null||S.addEventListener("click",()=>{this.creatorState.hasFriction=!this.creatorState.hasFriction,S.textContent=this.creatorState.hasFriction?"Attached":"Detached",S.classList.toggle("active",this.creatorState.hasFriction);const h=this.container.querySelector("#grp-creator-fric");h&&(h.style.display=this.creatorState.hasFriction?"block":"none")}),this.setupSlider("slide-creator-fric","val-creator-fric",h=>{this.creatorState.dynamicFrictionMod=h},2);const w=this.container.querySelector("#creator-toggle-bounce");w==null||w.addEventListener("click",()=>{this.creatorState.hasBounce=!this.creatorState.hasBounce,w.textContent=this.creatorState.hasBounce?"Attached":"Detached",w.classList.toggle("active",this.creatorState.hasBounce);const h=this.container.querySelector("#grp-creator-bounce");h&&(h.style.display=this.creatorState.hasBounce?"block":"none")}),this.setupSlider("slide-creator-bounce","val-creator-bounce",h=>{this.creatorState.bounceMod=h},2);const E=this.container.querySelector("#creator-check-vert-bounce");E==null||E.addEventListener("change",()=>{this.creatorState.verticalBounce=E.checked,this.syncCreatorInputs()});const F=this.container.querySelector("#creator-toggle-vert-pos");F==null||F.addEventListener("click",()=>{this.creatorState.hasVerticalPosition=!this.creatorState.hasVerticalPosition,this.syncCreatorInputs()}),this.setupSlider("slide-creator-elevation","val-creator-elevation",h=>{this.creatorState.elevation=h},2);const C=this.container.querySelector("#creator-toggle-vert-vel");C==null||C.addEventListener("click",()=>{this.creatorState.hasVerticalVelocity=!this.creatorState.hasVerticalVelocity,this.syncCreatorInputs()});const k=this.container.querySelector("#creator-toggle-gravity");k==null||k.addEventListener("click",()=>{this.creatorState.hasGravity=!this.creatorState.hasGravity,k.textContent=this.creatorState.hasGravity?"Attached":"Detached",k.classList.toggle("active",this.creatorState.hasGravity)});const P=this.container.querySelector("#creator-toggle-roll");P==null||P.addEventListener("click",()=>{this.creatorState.hasRollModule=!this.creatorState.hasRollModule,P.textContent=this.creatorState.hasRollModule?"Enabled":"Disabled",P.classList.toggle("active",this.creatorState.hasRollModule);const h=this.container.querySelector("#group-creator-roll-resist");h&&(h.style.display=this.creatorState.hasRollModule?"block":"none")}),this.setupSlider("slide-creator-roll-resist","val-creator-roll-resist",h=>{this.creatorState.rollResistance=h},2),($=this.container.querySelector("#btn-spawn-configured"))==null||$.addEventListener("click",()=>{this.spawnFromCreator()}),(O=this.container.querySelector("#btn-clear-entities"))==null||O.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}spawnFromCreator(){const t=this.creatorState,i=Math.min(Math.max(this.character.position.x+(Math.random()*2-1),1),this.arena.width-1),s=Math.min(Math.max(this.character.position.y+(Math.random()*2-1),1),this.arena.height-1),e=new U({name:t.name||"Custom Object",position:{x:i,y:s,z:t.hasVerticalPosition?t.elevation:0},visualShape:t.visualShape,color:t.color,colliderModule:t.hasCollider?new N({radius:t.colliderRadius}):null,massModule:t.hasMass?new K({mass:t.mass}):null,frictionModule:t.hasFriction?new _({staticFrictionMod:t.staticFrictionMod,dynamicFrictionMod:t.dynamicFrictionMod}):null,bounceModule:t.hasBounce?new J({bounceMod:t.bounceMod,verticalBounce:t.verticalBounce}):null,verticalPositionModule:t.hasVerticalPosition?new et({z:t.elevation,hasVerticalVelocity:t.hasVerticalVelocity,verticalVelocity:0}):null,gravityModule:t.hasGravity?new tt:null,rollModule:t.hasRollModule?new it({rollResistance:t.rollResistance}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}duplicateSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity,i=Math.min(Math.max(t.position.x+.6,1),this.arena.width-1),s=Math.min(Math.max(t.position.y+.6,1),this.arena.height-1),e=new U({name:`${t.name} (Copy)`,position:{x:i,y:s,z:t.position.z},visualShape:t.visualShape,color:t.color,colliderModule:t.colliderModule?new N({radius:t.colliderModule.radius,enabled:t.colliderModule.enabled}):null,massModule:t.massModule?new K({mass:t.massModule.mass,enabled:t.massModule.enabled}):null,frictionModule:t.frictionModule?new _({staticFrictionMod:t.frictionModule.staticFrictionMod,dynamicFrictionMod:t.frictionModule.dynamicFrictionMod,enabled:t.frictionModule.enabled}):null,bounceModule:t.bounceModule?new J({bounceMod:t.bounceModule.bounceMod,verticalBounce:t.bounceModule.verticalBounce,enabled:t.bounceModule.enabled}):null,verticalPositionModule:t.verticalPositionModule?new et({z:t.verticalPositionModule.z,hasVerticalVelocity:t.verticalPositionModule.hasVerticalVelocity,verticalVelocity:t.verticalPositionModule.verticalVelocity,enabled:t.verticalPositionModule.enabled}):null,gravityModule:t.gravityModule?new tt({enabled:t.gravityModule.enabled}):null,rollModule:t.rollModule?new it({rollResistance:t.rollModule.rollResistance,enabled:t.rollModule.enabled}):null});this.onSpawnObject(e),this.setSelectedEntity(e)}deleteSelectedEntity(){if(this.selectedEntity===this.character)return;const t=this.selectedEntity;this.character.heldObject===t&&(t.isHeld=!1,t.heldBy=null,this.character.heldObject=null),this.onDeleteObject&&this.onDeleteObject(t),this.setSelectedEntity(this.character)}setupSlider(t,i,s,e=0){const o=this.container.querySelector(`#${t}`),c=this.container.querySelector(`#${i}`);!o||!c||o.addEventListener("input",()=>{const l=parseFloat(o.value);c.textContent=e>0?l.toFixed(e):Math.round(l).toString(),s(l)})}updateInspector(){const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
    `}}class Mt{constructor(t){d(this,"arena");d(this,"character");d(this,"objects");d(this,"renderer");d(this,"inputManager");d(this,"devPanel");d(this,"isRunning",!1);d(this,"lastTime",0);d(this,"accumulator",0);d(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;this.renderer.render(this.arena,this.character,this.objects,this.inputManager.selectedCanvasEntity,this.devPanel.isEditMode,this.inputManager.hoverEntity),this.devPanel.updateInspector(),requestAnimationFrame(s=>this.tick(s))}updatePhysics(t){const i=this.inputManager;i.draggedEntity!==this.character?this.character.updateCharacter(t,i.movementVector,i.isMouseDown&&!this.devPanel.isEditMode,i.mousePos,this.arena):(this.character.velocity.x=0,this.character.velocity.y=0);for(const s of this.objects)i.draggedEntity!==s&&s.updatePosition(t,this.arena);if(!this.devPanel.isEditMode&&i.isMouseDown&&!this.character.heldObject&&this.character.pickupModule){const s=this.character.pickupModule.findTargetObject(this.character,i.mousePos.x,i.mousePos.y,this.objects);s&&(this.character.pickupModule.pickup(this.character,s),i.justPickedUp=!0)}this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects],i=this.inputManager,s=3;for(let e=0;e<s;e++)for(let o=0;o<t.length;o++)for(let c=o+1;c<t.length;c++){const l=t[o],n=t[c];if(l.isHeld||n.isHeld||l===i.draggedEntity||n===i.draggedEntity||!l.hasCollider||!n.hasCollider)continue;const r=this.arena.wallHeight-.15,a=l.position.z>=r||l.supportingSurfaceHeight>=r,u=n.position.z>=r||n.supportingSurfaceHeight>=r;if(a!==u)continue;const v=n.position.x-l.position.x,b=n.position.y-l.position.y,f=v*v+b*b,x=l.colliderRadius+n.colliderRadius;if(f<x*x&&f>1e-6){const p=Math.sqrt(f),M=x-p,y=v/p,g=b/p,m=n.velocity.x-l.velocity.x,S=n.velocity.y-l.velocity.y,w=m*y+S*g,E=!l.hasMass,F=!n.hasMass;if(E&&F){if(l.position.x-=y*M*.5,l.position.y-=g*M*.5,n.position.x+=y*M*.5,n.position.y+=g*M*.5,w<0){const $=-w*.5;l.velocity.x-=$*y,l.velocity.y-=$*g,n.velocity.x+=$*y,n.velocity.y+=$*g}continue}if(!E&&F){this.isEntityPinnedAgainstWall(n,y,g)?(l.position.x-=y*M,l.position.y-=g*M,l.velocity.x=0,l.velocity.y=0):(n.position.x+=y*M,n.position.y+=g*M,w<0&&(n.velocity.x+=(l.velocity.x-n.velocity.x)*Math.abs(y),n.velocity.y+=(l.velocity.y-n.velocity.y)*Math.abs(g)));continue}if(E&&!F){this.isEntityPinnedAgainstWall(l,-y,-g)?(n.position.x+=y*M,n.position.y+=g*M,n.velocity.x=0,n.velocity.y=0):(l.position.x-=y*M,l.position.y-=g*M,w<0&&(l.velocity.x+=(n.velocity.x-l.velocity.x)*Math.abs(y),l.velocity.y+=(n.velocity.y-l.velocity.y)*Math.abs(g)));continue}const C=1/l.mass,k=1/n.mass,P=C+k;if(P<=1e-4)continue;const B=C/P,R=k/P;if(l.position.x-=y*M*B,l.position.y-=g*M*B,n.position.x+=y*M*R,n.position.y+=g*M*R,w<0){const $=l instanceof st&&l.isActivelyWalking||n instanceof st&&n.isActivelyWalking,O=l.hasBounce&&n.hasBounce,h=l.isCharacter||!l.hasBounce?0:l.bounceMod??0,A=n.isCharacter||!n.hasBounce?0:n.bounceMod??0,D=-(1+($||!O?0:Math.max(0,Math.min(.98,Math.max(h,A)))))*w/P;l.velocity.x-=D*C*y,l.velocity.y-=D*C*g,n.velocity.x+=D*k*y,n.velocity.y+=D*k*g;const z=-g,W=y,T=m*z+S*W;if(Math.abs(T)>.001){const H=.35*Math.sqrt(l.dynamicGroundFrictionMod*n.dynamicGroundFrictionMod),j=.4,I=Math.abs(T)/(P*(1+1/j)),X=H*Math.abs(D),L=Math.min(I,X)*Math.sign(T);if(l.velocity.x+=L*C*z,l.velocity.y+=L*C*W,n.velocity.x-=L*k*z,n.velocity.y-=L*k*W,l.rollModule&&l.rollModule.enabled){const G=L/(j*l.mass*l.colliderRadius);l.rollModule.angularVelocity.z+=G,l.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,l.rollModule.angularVelocity.z)),l.isRestingOnSurface&&(l.rollModule.angularVelocity.y=l.velocity.x/l.colliderRadius,l.rollModule.angularVelocity.x=-l.velocity.y/l.colliderRadius)}if(n.rollModule&&n.rollModule.enabled){const G=L/(j*n.mass*n.colliderRadius);n.rollModule.angularVelocity.z-=G,n.rollModule.angularVelocity.z=Math.max(-30,Math.min(30,n.rollModule.angularVelocity.z)),n.isRestingOnSurface&&(n.rollModule.angularVelocity.y=n.velocity.x/n.colliderRadius,n.rollModule.angularVelocity.x=-n.velocity.y/n.colliderRadius)}}}}}}isEntityPinnedAgainstWall(t,i,s){const e=t.colliderRadius>0?t.colliderRadius:.3,o=.05;if(i>.3&&t.position.x>=this.arena.width-e-o||i<-.3&&t.position.x<=e+o||s>.3&&t.position.y>=this.arena.height-e-o||s<-.3&&t.position.y<=e+o)return!0;for(const c of this.arena.walls)if(t.position.z<c.wallHeight-.05){const l=t.position.x+i*o,n=t.position.y+s*o,r=Math.max(c.x,Math.min(l,c.x+c.width)),a=Math.max(c.y,Math.min(n,c.y+c.height)),u=l-r,v=n-a;if(u*u+v*v<e*e)return!0}return!1}}function ft(){const V=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!V||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=V.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new pt(20,14,1);V.width=1e3,V.height=700;const e=new st({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),o=[new U({id:"stone-1",name:"Light Blue Box",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25,visualShape:"box"}),new U({id:"boulder-1",name:"Heavy Red Box",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05,visualShape:"box"}),new U({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new U({id:"rolling-1",name:"Rolling Ball",position:{x:13.6,y:7,z:0},velocity:{x:4.5,y:1.5},mass:.6,colliderRadius:.28,color:"#a855f7",bounceMod:.95,rollModule:new it({rollResistance:0,angularVelocity:{x:-1.5/.28,y:4.5/.28,z:0}})})],c=new vt(i),l=new bt({container:t,character:e,arena:s,objects:o,onSpawnObject:a=>{o.push(a),l.updateSelectorOptions()},onDeleteObject:a=>{const u=o.indexOf(a);u!==-1&&o.splice(u,1),l.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),o.length=0,l.updateSelectorOptions()}}),n=new gt(V,s);n.handleInteractions(e,s,o,l),l.onSelectionChange=a=>{n.selectedCanvasEntity=a},new Mt({arena:s,character:e,objects:o,renderer:c,inputManager:n,devPanel:l}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",ft);

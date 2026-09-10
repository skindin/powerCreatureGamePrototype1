var B=Object.defineProperty;var q=(g,t,i)=>t in g?B(g,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):g[t]=i;var a=(g,t,i)=>q(g,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function i(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(e){if(e.ep)return;e.ep=!0;const o=i(e);fetch(e.href,o)}})();class I{constructor(t=20,i=14,s=1){a(this,"width");a(this,"height");a(this,"tileSize");a(this,"cols");a(this,"rows");a(this,"wallHeight");a(this,"gravity");a(this,"frictionCoeff");a(this,"staticFrictionThreshold");a(this,"tileGrid");a(this,"walls",[]);this.width=t,this.height=i,this.tileSize=s,this.cols=Math.floor(t/s),this.rows=Math.floor(i/s),this.wallHeight=1,this.gravity=10,this.frictionCoeff=10.4,this.staticFrictionThreshold=.16,this.tileGrid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>0)),this.setupDefaultTileMap(),this.rebuildWalls()}setupDefaultTileMap(){for(let i=1;i<=4;i++)this.tileGrid[i][10]=1;for(let i=8;i<=12;i++)this.tileGrid[i][10]=1;this.tileGrid[4][4]=1,this.tileGrid[5][4]=1,this.tileGrid[4][5]=1,this.tileGrid[5][5]=1,this.tileGrid[7][15]=1,this.tileGrid[8][15]=1,this.tileGrid[7][16]=1,this.tileGrid[8][16]=1}rebuildWalls(){this.walls=[];for(let t=0;t<this.rows;t++)for(let i=0;i<this.cols;i++)this.tileGrid[t][i]===1&&this.walls.push({id:`wall-${i}-${t}`,x:i*this.tileSize,y:t*this.tileSize,width:this.tileSize,height:this.tileSize,wallHeight:this.wallHeight})}setStandardWallHeight(t){this.wallHeight=t,this.rebuildWalls()}getWallAt(t,i){for(const s of this.walls)if(t>=s.x&&t<=s.x+s.width&&i>=s.y&&i<=s.y+s.height)return s;return null}testWallOverlap(t,i,s,e){const o=Math.max(e.x,Math.min(t,e.x+e.width)),l=Math.max(e.y,Math.min(i,e.y+e.height)),c=t-o,n=i-l;return c*c+n*n<s*s}getSupportingWall(t,i,s=0){if(s<=0)return this.getWallAt(t,i);for(const e of this.walls)if(this.testWallOverlap(t,i,s,e))return e;return null}getSupportingSurfaceHeight(t,i,s=0){const e=this.getSupportingWall(t,i,s);return e?e.wallHeight:0}}class E{constructor(t={}){a(this,"id");a(this,"name");a(this,"position");a(this,"mass");a(this,"velocity");a(this,"verticalVelocity");a(this,"colliderRadius");a(this,"staticGroundFrictionMod");a(this,"dynamicGroundFrictionMod");a(this,"bounceMod");a(this,"color");a(this,"isHeld");a(this,"heldBy");a(this,"isCharacter",!1);a(this,"supportingSurfaceHeight",0);var i,s,e,o,l;this.id=t.id??`obj-${Math.random().toString(36).substring(2,9)}`,this.name=t.name??"Object",this.position={x:((i=t.position)==null?void 0:i.x)??0,y:((s=t.position)==null?void 0:s.y)??0,z:((e=t.position)==null?void 0:e.z)??0},this.mass=t.mass??1,this.velocity={x:((o=t.velocity)==null?void 0:o.x)??0,y:((l=t.velocity)==null?void 0:l.y)??0},this.verticalVelocity=t.verticalVelocity??0,this.colliderRadius=t.colliderRadius??.32,this.staticGroundFrictionMod=t.staticGroundFrictionMod??1,this.dynamicGroundFrictionMod=t.dynamicGroundFrictionMod??1,this.bounceMod=t.bounceMod!==void 0?t.bounceMod:.4,this.color=t.color??"#38bdf8",this.isHeld=!1,this.heldBy=null}get isRestingOnSurface(){return Math.abs(this.position.z-this.supportingSurfaceHeight)<=.01&&Math.abs(this.verticalVelocity)<=.05}get isAboveGround(){return this.position.z>.001}get isAboveWalls(){return this.position.z>1}updatePosition(t,i){var h;if(this.isHeld)return;const e=!this.isCharacter||this.position.z>.01||this.verticalVelocity!==0?i.getSupportingWall(this.position.x,this.position.y,this.colliderRadius):i.getWallAt(this.position.x,this.position.y),o=e?e.wallHeight:0;if(this.supportingSurfaceHeight=o,e?this.position.z<=o?(this.position.z=o,this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.4?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0):(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=o&&(this.position.z=o,this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.4?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0)):(this.position.z>0||this.verticalVelocity!==0)&&(this.verticalVelocity-=i.gravity*t,this.position.z+=this.verticalVelocity*t,this.position.z<=0&&(this.position.z=0,this.bounceMod!==null&&this.bounceMod>0&&Math.abs(this.verticalVelocity)>.4?this.verticalVelocity=-this.verticalVelocity*this.bounceMod:this.verticalVelocity=0)),Math.abs(this.position.z-o)<=.01&&Math.abs(this.verticalVelocity)<=.05&&!(this.isCharacter&&((h=this.walkingModule)==null?void 0:h.enabled))){const y=Math.hypot(this.velocity.x,this.velocity.y);if(y>0){const u=i.staticFrictionThreshold*this.staticGroundFrictionMod;if(y<u)this.velocity.x=0,this.velocity.y=0;else{const v=i.frictionCoeff*this.dynamicGroundFrictionMod*t,b=Math.max(0,y-v)/y;this.velocity.x*=b,this.velocity.y*=b}}}this.position.x+=this.velocity.x*t,this.position.y+=this.velocity.y*t;const c=this.colliderRadius,n=i.width-this.colliderRadius,r=this.colliderRadius,d=i.height-this.colliderRadius;if(this.position.x<c?(this.position.x=c,this.velocity.x=Math.abs(this.velocity.x)*(this.bounceMod??.2)):this.position.x>n&&(this.position.x=n,this.velocity.x=-Math.abs(this.velocity.x)*(this.bounceMod??.2)),this.position.y<r?(this.position.y=r,this.velocity.y=Math.abs(this.velocity.y)*(this.bounceMod??.2)):this.position.y>d&&(this.position.y=d,this.velocity.y=-Math.abs(this.velocity.y)*(this.bounceMod??.2)),!e)for(const p of i.walls)this.position.z<p.wallHeight-.05&&this.resolveWallCollision(p)}resolveWallCollision(t){const i=Math.max(t.x,Math.min(this.position.x,t.x+t.width)),s=Math.max(t.y,Math.min(this.position.y,t.y+t.height)),e=this.position.x-i,o=this.position.y-s,l=e*e+o*o;if(l<this.colliderRadius*this.colliderRadius){const c=Math.sqrt(l);let n=0,r=0,d=0;if(c===0){const p=Math.abs(this.position.x-t.x),y=Math.abs(t.x+t.width-this.position.x),u=Math.abs(this.position.y-t.y),v=Math.abs(t.y+t.height-this.position.y),m=Math.min(p,y,u,v);m===p?(n=-1,d=p+this.colliderRadius):m===y?(n=1,d=y+this.colliderRadius):m===u?(r=-1,d=u+this.colliderRadius):(r=1,d=v+this.colliderRadius)}else d=this.colliderRadius-c,n=e/c,r=o/c;this.position.x+=n*d,this.position.y+=r*d;const h=this.velocity.x*n+this.velocity.y*r;if(h<0){const p=this.bounceMod??.1;this.velocity.x-=(1+p)*h*n,this.velocity.y-=(1+p)*h*r}}}}class z{constructor(){a(this,"id","walking");a(this,"name","Walking Module");a(this,"enabled",!0);a(this,"maxWalkSpeed",5.2);a(this,"walkAcceleration",80)}update(t,i,s,e){if(!this.enabled||t.isAboveGround){t.isActivelyWalking=!1;return}const o=Math.hypot(i.x,i.y),l=o>.05;t.isActivelyWalking=l;let c=0,n=0;if(l){const f=i.x/o,F=i.y/o;c=f*this.maxWalkSpeed,n=F*this.maxWalkSpeed}const r=c-t.velocity.x,d=n-t.velocity.y,h=Math.hypot(r,d);if(h<.001){t.velocity.x=c,t.velocity.y=n;return}const p=Math.hypot(t.velocity.x,t.velocity.y),y=Math.max(.02,e.staticFrictionThreshold*t.staticGroundFrictionMod),u=t.dynamicGroundFrictionMod;if(u<=.001)return;const v=e.frictionCoeff/10,b=this.walkAcceleration*u*v*s;if(h<=b||!l&&p<y)t.velocity.x=c,t.velocity.y=n;else{const f=b/h;t.velocity.x+=r*f,t.velocity.y+=d*f}}}class D{constructor(){a(this,"id","pickup");a(this,"name","Pickup Ability");a(this,"enabled",!0);a(this,"pickupReach",1.3)}findTargetObject(t,i,s,e){if(!this.enabled)return null;let o=null,l=1/0;for(const c of e){if(c===t||c.isHeld||Math.hypot(c.position.x-t.position.x,c.position.y-t.position.y)>this.pickupReach+c.colliderRadius)continue;const r=Math.hypot(c.position.x-i,c.position.y-s);r<l&&r<=c.colliderRadius+.5&&(l=r,o=c)}return o}pickup(t,i){return!this.enabled||t.heldObject?!1:(t.heldObject=i,i.isHeld=!0,i.heldBy=t,i.velocity.x=0,i.velocity.y=0,i.verticalVelocity=0,i.position.z=.45,!0)}drop(t){if(!t.heldObject)return null;const i=t.heldObject;return t.heldObject=null,i.isHeld=!1,i.heldBy=null,i.velocity.x=t.velocity.x*.4,i.velocity.y=t.velocity.y*.4,i.verticalVelocity=0,i}}class L{constructor(){a(this,"id","throw");a(this,"name","Throw Ability");a(this,"enabled",!0);a(this,"baseThrowForce",7.6);a(this,"maxThrowAimDistance",13)}testWallIntersection(t,i,s,e){const o=Math.max(e.x,Math.min(t,e.x+e.width)),l=Math.max(e.y,Math.min(i,e.y+e.height)),c=t-o,n=i-l;return c*c+n*n<s*s}computeLaunchVelocity(t,i,s,e,o,l,c){const n=e-t,r=o-i,d=Math.hypot(n,r);if(d<.1)return null;const h=Math.min(d,this.maxThrowAimDistance),p=n/d,y=r/d,u=t+p*h,v=i+y*h;let m=0;for(const C of l.walls)for(let P=.2;P<=.8;P+=.2){const W=t+(u-t)*P,M=i+(v-i)*P;if(this.testWallIntersection(W,M,.4,C)){m=Math.max(m,C.wallHeight);break}}const b=l.getSupportingSurfaceHeight(u,v),f=Math.max(s,b,m)+.6,F=Math.max(f,Math.max(s,b)+.35+h/13*1.5*c),x=Math.sqrt(2*l.gravity*Math.max(.1,F-s)),R=x/l.gravity,A=Math.sqrt(Math.max(.001,2*(F-b))/l.gravity),S=R+A;if(S<=.05)return null;const O=h/S,w=p*O,k=y*O;return{vx:w,vy:k,vz:x,totalTime:S,finalTargetX:u,finalTargetY:v,targetSurfaceHeight:b}}calculateTrajectory(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const o=t.heldObject,l=o.position.x,c=o.position.y,n=o.position.z,r=Math.max(.3,Math.min(2.5,t.strength/o.mass)),d=this.computeLaunchVelocity(l,c,n,i,s,e,r);if(!d)return null;const{vx:h,vy:p,vz:y,totalTime:u,finalTargetX:v,finalTargetY:m,targetSurfaceHeight:b}=d,f=90,F=u/f,x=[];let R=!1,A=b>0,S;for(let w=0;w<=f;w++){const k=w*F,C=w===f?v:l+h*k,P=w===f?m:c+p*k,W=n+y*k-.5*e.gravity*k*k,M=w===f?b:Math.max(b,W),T=y-e.gravity*k,H=M>e.wallHeight;let V=!1,$=!1;for(const j of e.walls)if(this.testWallIntersection(C,P,o.colliderRadius,j)&&(V=!0,M<=j.wallHeight+.001)){if(x.length>0&&x[x.length-1].z>=j.wallHeight-.05&&T<=0){if(b>0&&(w>=f-2||Math.hypot(C-v,P-m)<.2)){A=!0;break}else if(b===0){A=!0,$=!0,S=j.id;break}}else if(M<j.wallHeight-.05){$=!0,R=!0,S=j.id;break}}if(x.push({x:C,y:P,z:M,t:k,couldClearWall:H,isOverWall:V,collidesWall:$}),$)break}const O=x[x.length-1];return{points:x,landPoint:{x:R?O.x:v,y:R?O.y:m},isBlockedByWall:R,isLandingOnWallTop:A,blockedAtWallId:S}}throwHeldObject(t,i,s,e){if(!this.enabled||!t.heldObject)return null;const o=t.heldObject,l=o.position.x,c=o.position.y,n=o.position.z,r=Math.max(.3,Math.min(2.5,t.strength/o.mass)),d=this.computeLaunchVelocity(l,c,n,i,s,e,r);if(!d)return null;o.isHeld=!1,o.heldBy=null,o.velocity.x=d.vx,o.velocity.y=d.vy,o.verticalVelocity=d.vz,o.position.z=Math.max(.3,o.position.z);const h=o.mass/Math.max(.2,t.mass);return t.velocity.x-=d.vx*h,t.velocity.y-=d.vy*h,t.heldObject=null,o}}class G extends E{constructor(i={}){super({name:"Player Character",position:{x:i.x??5,y:i.y??7,z:0},mass:i.mass??1.2,colliderRadius:i.colliderRadius??.44,color:i.color??"#f59e0b",bounceMod:.1});a(this,"strength");a(this,"facingAngle");a(this,"heldObject");a(this,"isCharacter",!0);a(this,"isActivelyWalking",!1);a(this,"walkingModule");a(this,"pickupModule");a(this,"throwModule");a(this,"isAiming");a(this,"aimTarget");a(this,"activeTrajectory");this.strength=i.strength??1,this.facingAngle=0,this.heldObject=null,this.isAiming=!1,this.aimTarget=null,this.activeTrajectory=null,this.walkingModule=new z,this.pickupModule=new D,this.throwModule=new L}updateFacingDirection(i,s,e){if((this.heldObject!==null||i)&&s&&(this.throwModule!==null||this.pickupModule!==null)){const o=s.x-this.position.x,l=s.y-this.position.y;if(Math.hypot(o,l)>.1){this.facingAngle=Math.atan2(l,o);return}}e&&Math.hypot(e.x,e.y)>.05&&(this.facingAngle=Math.atan2(e.y,e.x))}updateCharacter(i,s,e,o,l){if(this.walkingModule&&this.walkingModule.update(this,s,i,l),this.updatePosition(i,l),this.updateFacingDirection(e,o,s),this.heldObject){const c=this.colliderRadius+this.heldObject.colliderRadius*.5+.08;this.heldObject.position.x=this.position.x+Math.cos(this.facingAngle)*c,this.heldObject.position.y=this.position.y+Math.sin(this.facingAngle)*c,this.heldObject.position.z=.45,this.heldObject.velocity.x=this.velocity.x,this.heldObject.velocity.y=this.velocity.y,this.heldObject.verticalVelocity=0}this.isAiming=this.heldObject!==null||e,this.aimTarget=o,this.heldObject&&this.throwModule&&o?this.activeTrajectory=this.throwModule.calculateTrajectory(this,o.x,o.y,l):this.activeTrajectory=null}}class Y{constructor(t){a(this,"ctx");this.ctx=t}render(t,i,s,e){const o=this.ctx,l=o.canvas.width/t.width;o.clearRect(0,0,o.canvas.width,o.canvas.height),this.drawFloorGrid(t,l),this.drawWalls(t,l),this.drawObjectShadow(i,t,l);for(const n of s)this.drawObjectShadow(n,t,l);const c=[i,...s];c.sort((n,r)=>Math.abs(n.position.z-r.position.z)>.001?n.position.z-r.position.z:Math.abs(n.verticalVelocity-r.verticalVelocity)>.001?n.verticalVelocity-r.verticalVelocity:n.position.y-r.position.y);for(const n of c)n instanceof G?this.drawCharacter(n,s,l):this.drawFreebodyObject(n,c,i,l);i.activeTrajectory&&this.drawTrajectory(i.activeTrajectory,l)}drawFloorGrid(t,i){const s=this.ctx;s.fillStyle="#0f172a",s.fillRect(0,0,t.width*i,t.height*i),s.strokeStyle="rgba(148, 163, 184, 0.08)",s.lineWidth=1;for(let e=1;e<t.width;e++)s.beginPath(),s.moveTo(e*i,0),s.lineTo(e*i,t.height*i),s.stroke();for(let e=1;e<t.height;e++)s.beginPath(),s.moveTo(0,e*i),s.lineTo(t.width*i,e*i),s.stroke();s.strokeStyle="rgba(148, 163, 184, 0.35)",s.lineWidth=3,s.strokeRect(1.5,1.5,t.width*i-3,t.height*i-3)}drawWalls(t,i){const s=this.ctx;for(const e of t.walls)s.fillStyle="#1e293b",s.fillRect(e.x*i,e.y*i,e.width*i,e.height*i),s.strokeStyle="#475569",s.lineWidth=2,s.strokeRect(e.x*i,e.y*i,e.width*i,e.height*i)}drawObjectShadow(t,i,s){const e=this.ctx,o=t.position.x*s,l=t.position.y*s,c=t.position.z,n=1+c/i.wallHeight*1.5,r=t.colliderRadius*s*n,d=Math.max(.3,.85-c/(i.wallHeight*7)*.25),h=c>i.wallHeight;e.save(),e.beginPath(),e.arc(o,l,r,0,Math.PI*2),h?(e.strokeStyle=`rgba(56, 189, 248, ${d})`,e.lineWidth=2.5):(e.strokeStyle=`rgba(255, 255, 255, ${d})`,e.lineWidth=1.8),c>.01&&e.setLineDash([4,3]),e.stroke(),e.restore()}drawFreebodyObject(t,i,s,e){var y;const o=this.ctx,l=t.position.x*e,c=t.position.y*e,n=t.colliderRadius*e,r=!s.heldObject&&s.pickupModule!==null&&s.pickupModule.enabled,d=Math.hypot(t.position.x-s.position.x,t.position.y-s.position.y),h=r&&!t.isHeld&&d<=(((y=s.pickupModule)==null?void 0:y.pickupReach)??1.3)+t.colliderRadius;h&&(o.save(),o.beginPath(),o.arc(l,c,n+5,0,Math.PI*2),o.strokeStyle="#38bdf8",o.lineWidth=2.5,o.setLineDash([4,4]),o.stroke(),o.fillStyle="#38bdf8",o.font="bold 9px sans-serif",o.textAlign="center",o.fillText("READY",l,c-n-6),o.restore());let p=!1;if(t.isAboveGround)for(const u of i){if(u===t)continue;if(Math.hypot(t.position.x-u.position.x,t.position.y-u.position.y)<t.colliderRadius+u.colliderRadius&&(t.position.z>u.position.z||Math.abs(t.position.z-u.position.z)<=.01&&t.verticalVelocity>u.verticalVelocity)){p=!0;break}}o.save(),o.globalAlpha=p?.55:1,o.beginPath(),o.arc(l,c,n,0,Math.PI*2),o.fillStyle=t.color,o.fill(),o.strokeStyle=h?"#ffffff":"rgba(255, 255, 255, 0.45)",o.lineWidth=h?2.5:2,o.stroke(),o.restore()}drawCharacter(t,i,s){const e=this.ctx,o=t.position.x*s,l=t.position.y*s,c=t.colliderRadius*s;let n=!1;if(t.isAboveGround)for(const f of i){if(f===t)continue;if(Math.hypot(t.position.x-f.position.x,t.position.y-f.position.y)<t.colliderRadius+f.colliderRadius&&(t.position.z>f.position.z||Math.abs(t.position.z-f.position.z)<=.01&&t.verticalVelocity>f.verticalVelocity)){n=!0;break}}e.save(),e.globalAlpha=n?.55:1,e.beginPath(),e.arc(o,l,c,0,Math.PI*2),e.fillStyle=t.color,e.fill(),e.strokeStyle="#ffffff",e.lineWidth=2.5,e.stroke();const r=.52,d=c*.72,h=Math.max(3.5,c*.18),p=t.facingAngle-r,y=t.facingAngle+r,u=o+Math.cos(p)*d,v=l+Math.sin(p)*d,m=o+Math.cos(y)*d,b=l+Math.sin(y)*d;e.fillStyle="#000000",e.beginPath(),e.arc(u,v,h,0,Math.PI*2),e.arc(m,b,h,0,Math.PI*2),e.fill(),t.heldObject&&(e.strokeStyle="rgba(255, 255, 255, 0.6)",e.setLineDash([3,3]),e.lineWidth=1.5,e.beginPath(),e.moveTo(o,l),e.lineTo(t.heldObject.position.x*s,t.heldObject.position.y*s),e.stroke(),e.setLineDash([])),e.restore()}drawTrajectory(t,i){const s=this.ctx,e=t.points;if(e.length<2)return;s.save();for(let l=0;l<e.length-1;l++){const c=e[l],n=e[l+1];s.beginPath(),s.moveTo(c.x*i,c.y*i),s.lineTo(n.x*i,n.y*i),c.couldClearWall||n.couldClearWall?(s.strokeStyle="#38bdf8",s.lineWidth=4,s.setLineDash([6,3])):(s.strokeStyle="#f59e0b",s.lineWidth=2.5,s.setLineDash([4,4])),s.stroke()}const o=e[e.length-1];if(t.isBlockedByWall){s.strokeStyle="#ef4444",s.lineWidth=3,s.setLineDash([]);const l=8;s.beginPath(),s.moveTo(o.x*i-l,o.y*i-l),s.lineTo(o.x*i+l,o.y*i+l),s.moveTo(o.x*i+l,o.y*i-l),s.lineTo(o.x*i-l,o.y*i+l),s.stroke()}else t.isLandingOnWallTop?(s.strokeStyle="#38bdf8",s.fillStyle="rgba(56, 189, 248, 0.35)",s.lineWidth=2.5,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#38bdf8",s.fill()):(s.strokeStyle="#22c55e",s.fillStyle="rgba(34, 197, 94, 0.25)",s.lineWidth=2,s.setLineDash([]),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,14,0,Math.PI*2),s.fill(),s.stroke(),s.beginPath(),s.arc(t.landPoint.x*i,t.landPoint.y*i,4,0,Math.PI*2),s.fillStyle="#22c55e",s.fill());s.restore()}}class X{constructor(t,i){a(this,"canvas");a(this,"arena");a(this,"keysPressed",new Set);a(this,"mousePos",{x:0,y:0});a(this,"isMouseDown",!1);a(this,"movementVector",{x:0,y:0});a(this,"justPickedUp",!1);a(this,"handleClick");a(this,"onRightClick");a(this,"onDropAttempt");this.canvas=t,this.arena=i,this.setupListeners()}setupListeners(){window.addEventListener("keydown",t=>{this.keysPressed.add(t.code),this.updateMovementVector(),t.code==="KeyE"&&this.onDropAttempt&&this.onDropAttempt()}),window.addEventListener("keyup",t=>{this.keysPressed.delete(t.code),this.updateMovementVector()}),this.canvas.addEventListener("mousemove",t=>{this.updateMousePos(t)}),this.canvas.addEventListener("mousedown",t=>{t.button!==2&&t.button===0&&(this.isMouseDown=!0,this.updateMousePos(t),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))}),this.canvas.addEventListener("contextmenu",t=>{t.preventDefault(),this.updateMousePos(t),this.onRightClick&&this.onRightClick(this.mousePos.x,this.mousePos.y)}),window.addEventListener("mouseup",t=>{t.button===0&&(this.isMouseDown=!1,this.justPickedUp=!1)}),this.canvas.addEventListener("touchstart",t=>{t.touches.length>0&&(this.isMouseDown=!0,this.updateTouchPos(t.touches[0]),this.handleClick&&this.handleClick(this.mousePos.x,this.mousePos.y))},{passive:!1}),this.canvas.addEventListener("touchmove",t=>{t.touches.length>0&&this.updateTouchPos(t.touches[0])},{passive:!1}),window.addEventListener("touchend",()=>{this.isMouseDown=!1,this.justPickedUp=!1})}updateMousePos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateTouchPos(t){const i=this.canvas.getBoundingClientRect(),s=this.arena.width/i.width,e=this.arena.height/i.height;this.mousePos.x=(t.clientX-i.left)*s,this.mousePos.y=(t.clientY-i.top)*e}updateMovementVector(){let t=0,i=0;(this.keysPressed.has("KeyW")||this.keysPressed.has("ArrowUp"))&&(i-=1),(this.keysPressed.has("KeyS")||this.keysPressed.has("ArrowDown"))&&(i+=1),(this.keysPressed.has("KeyA")||this.keysPressed.has("ArrowLeft"))&&(t-=1),(this.keysPressed.has("KeyD")||this.keysPressed.has("ArrowRight"))&&(t+=1);const s=Math.hypot(t,i);s>0?(this.movementVector.x=t/s,this.movementVector.y=i/s):(this.movementVector.x=0,this.movementVector.y=0)}handleInteractions(t,i,s,e){this.handleClick=(o,l)=>{if(t.heldObject&&t.throwModule&&!this.justPickedUp){t.throwModule.throwHeldObject(t,o,l,i);return}if(!t.heldObject&&t.pickupModule){const c=t.pickupModule.findTargetObject(t,o,l,s);c&&(t.pickupModule.pickup(t,c),this.justPickedUp=!0)}},this.onRightClick=(o,l)=>{if(!e)return;if(Math.hypot(t.position.x-o,t.position.y-l)<=t.colliderRadius+.3){e.setSelectedEntity(t);return}for(const n of s)if(Math.hypot(n.position.x-o,n.position.y-l)<=n.colliderRadius+.3){e.setSelectedEntity(n);return}e.setSelectedEntity(t)},this.onDropAttempt=()=>{t.heldObject&&t.pickupModule&&t.pickupModule.drop(t)}}}class U{constructor(t){a(this,"container");a(this,"character");a(this,"arena");a(this,"objects");a(this,"onSpawnObject");a(this,"onClearObjects");a(this,"selectedEntity");a(this,"inspectorEl");a(this,"entitySelectorEl");a(this,"characterSpecificControlsEl");this.container=t.container,this.character=t.character,this.arena=t.arena,this.objects=t.objects,this.onSpawnObject=t.onSpawnObject,this.onClearObjects=t.onClearObjects,this.selectedEntity=this.character,this.renderPanel()}setSelectedEntity(t){this.selectedEntity=t,this.updateSelectorOptions(),this.syncEntitySliders()}updateSelectorOptions(){if(!this.entitySelectorEl)return;const t=this.selectedEntity.id;let i=`<option value="${this.character.id}" ${t===this.character.id?"selected":""}>⭐ Player Character</option>`;for(const s of this.objects){const e=s.id===t?"selected":"";i+=`<option value="${s.id}" ${e}>📦 ${s.name} (${s.mass}kg)</option>`}this.entitySelectorEl.innerHTML=i,this.characterSpecificControlsEl&&(this.characterSpecificControlsEl.style.display=this.selectedEntity===this.character?"flex":"none")}renderPanel(){var t,i,s,e,o,l,c,n;this.container.innerHTML=`
      <div class="dev-panel-header">
        <h2>🛠️ Property & Physics Engine</h2>
        <span class="badge">1 Wall = 1 Unit</span>
      </div>

      <div class="dev-scrollable">
        <!-- Target Selection -->
        <div class="dev-section">
          <h3>🎯 Target Entity</h3>
          <select id="entity-selector" class="dev-select"></select>
          <p class="section-desc">Select an entity or right-click it in the arena to modify its live properties.</p>
        </div>

        <!-- Live Diagnostics Inspector -->
        <div class="dev-section">
          <h3>📊 Live Diagnostics (Units)</h3>
          <div id="dev-inspector" class="inspector-grid"></div>
        </div>

        <!-- Selected Entity Physical Properties -->
        <div class="dev-section">
          <h3>⚖️ Entity Physical Properties</h3>

          <div class="slider-group">
            <div class="slider-label">
              <span>Mass (kg)</span>
              <span id="val-entity-mass">${this.selectedEntity.mass.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-entity-mass" min="0.1" max="8.0" step="0.1" value="${this.selectedEntity.mass}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Collider Radius (u)</span>
              <span id="val-entity-radius">${this.selectedEntity.colliderRadius.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-radius" min="0.1" max="1.5" step="0.02" value="${this.selectedEntity.colliderRadius}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Bounciness (Bounce Mod)</span>
              <span id="val-entity-bounce">${(this.selectedEntity.bounceMod??0).toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-bounce" min="0" max="1.0" step="0.05" value="${this.selectedEntity.bounceMod??0}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Static Friction Mod</span>
              <span id="val-entity-static-fric">${this.selectedEntity.staticGroundFrictionMod.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${this.selectedEntity.staticGroundFrictionMod}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Dynamic Friction Mod</span>
              <span id="val-entity-dynamic-fric">${this.selectedEntity.dynamicGroundFrictionMod.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${this.selectedEntity.dynamicGroundFrictionMod}">
          </div>
        </div>

        <!-- Character Specific Properties -->
        <div id="character-specific-controls" class="dev-section" style="display: flex; flex-direction: column; gap: 10px;">
          <h3>🏃 Character Abilities & Movement</h3>

          <div class="slider-group">
            <div class="slider-label">
              <span>Character Strength</span>
              <span id="val-strength">${this.character.strength.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-strength" min="0.3" max="4.0" step="0.1" value="${this.character.strength}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Max Walk Speed (u/s)</span>
              <span id="val-walk-speed">${(((t=this.character.walkingModule)==null?void 0:t.maxWalkSpeed)??5.2).toFixed(1)}</span>
            </div>
            <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${((i=this.character.walkingModule)==null?void 0:i.maxWalkSpeed)??5.2}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Walk Acceleration (u/s²)</span>
              <span id="val-walk-accel">${(((s=this.character.walkingModule)==null?void 0:s.walkAcceleration)??80).toFixed(0)}</span>
            </div>
            <input type="range" id="slide-walk-accel" min="10" max="250" step="5" value="${((e=this.character.walkingModule)==null?void 0:e.walkAcceleration)??80}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Pickup Reach (u)</span>
              <span id="val-pickup-reach">${(((o=this.character.pickupModule)==null?void 0:o.pickupReach)??1.3).toFixed(1)}</span>
            </div>
            <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${((l=this.character.pickupModule)==null?void 0:l.pickupReach)??1.3}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Base Throw Power (u/s)</span>
              <span id="val-throw-force">${(((c=this.character.throwModule)==null?void 0:c.baseThrowForce)??7.6).toFixed(1)}</span>
            </div>
            <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${((n=this.character.throwModule)==null?void 0:n.baseThrowForce)??7.6}">
          </div>
        </div>

        <!-- World & Arena Physics -->
        <div class="dev-section">
          <h3>🌍 World & Arena Properties (Units)</h3>

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

        <!-- Modular Capabilities Toggles -->
        <div class="dev-section">
          <h3>🧩 Modular Capabilities</h3>
          <p class="section-desc">Attach or detach modules to verify isolated mechanics.</p>
          
          <div class="toggle-row">
            <label>Walking Function</label>
            <button id="toggle-walk" class="btn-toggle active">Attached</button>
          </div>

          <div class="toggle-row">
            <label>Pickup Ability</label>
            <button id="toggle-pickup" class="btn-toggle active">Attached</button>
          </div>

          <div class="toggle-row">
            <label>Throw Ability</label>
            <button id="toggle-throw" class="btn-toggle active">Attached</button>
          </div>
        </div>

        <!-- Spawner -->
        <div class="dev-section">
          <h3>📦 Spawn Objects</h3>
          <div class="spawner-buttons">
            <button id="btn-spawn-light" class="btn-action">Spawn Light Stone (0.7kg, 0.26u)</button>
            <button id="btn-spawn-heavy" class="btn-action">Spawn Heavy Crate (2.6kg, 0.40u)</button>
            <button id="btn-spawn-bouncy" class="btn-action">Spawn Bouncy Ball (0.5kg, Bounce 0.88)</button>
            <button id="btn-clear-entities" class="btn-danger">Clear All Objects</button>
          </div>
        </div>
      </div>
    `,this.inspectorEl=this.container.querySelector("#dev-inspector"),this.entitySelectorEl=this.container.querySelector("#entity-selector"),this.characterSpecificControlsEl=this.container.querySelector("#character-specific-controls"),this.updateSelectorOptions(),this.bindEvents()}syncEntitySliders(){const t=this.selectedEntity;this.setSliderVal("slide-entity-mass","val-entity-mass",t.mass,1),this.setSliderVal("slide-entity-radius","val-entity-radius",t.colliderRadius,2),this.setSliderVal("slide-entity-bounce","val-entity-bounce",t.bounceMod??0,2),this.setSliderVal("slide-entity-static-fric","val-entity-static-fric",t.staticGroundFrictionMod,2),this.setSliderVal("slide-entity-dynamic-fric","val-entity-dynamic-fric",t.dynamicGroundFrictionMod,2),t===this.character&&(this.setSliderVal("slide-strength","val-strength",this.character.strength,1),this.character.walkingModule&&(this.setSliderVal("slide-walk-speed","val-walk-speed",this.character.walkingModule.maxWalkSpeed,1),this.setSliderVal("slide-walk-accel","val-walk-accel",this.character.walkingModule.walkAcceleration,0)),this.character.pickupModule&&this.setSliderVal("slide-pickup-reach","val-pickup-reach",this.character.pickupModule.pickupReach,1),this.character.throwModule&&this.setSliderVal("slide-throw-force","val-throw-force",this.character.throwModule.baseThrowForce,1))}setSliderVal(t,i,s,e){const o=this.container.querySelector(`#${t}`),l=this.container.querySelector(`#${i}`);o&&(o.value=s.toString()),l&&(l.textContent=e>0?s.toFixed(e):Math.round(s).toString())}bindEvents(){var e,o,l,c;this.entitySelectorEl.addEventListener("change",()=>{const n=this.entitySelectorEl.value;if(n===this.character.id)this.selectedEntity=this.character;else{const r=this.objects.find(d=>d.id===n);r&&(this.selectedEntity=r)}this.updateSelectorOptions(),this.syncEntitySliders()}),this.setupSlider("slide-entity-mass","val-entity-mass",n=>{this.selectedEntity.mass=n},1),this.setupSlider("slide-entity-radius","val-entity-radius",n=>{this.selectedEntity.colliderRadius=n},2),this.setupSlider("slide-entity-bounce","val-entity-bounce",n=>{this.selectedEntity.bounceMod=n<=.01?null:n},2),this.setupSlider("slide-entity-static-fric","val-entity-static-fric",n=>{this.selectedEntity.staticGroundFrictionMod=n},2),this.setupSlider("slide-entity-dynamic-fric","val-entity-dynamic-fric",n=>{this.selectedEntity.dynamicGroundFrictionMod=n},2),this.setupSlider("slide-strength","val-strength",n=>{this.character.strength=n},1),this.setupSlider("slide-walk-speed","val-walk-speed",n=>{this.character.walkingModule&&(this.character.walkingModule.maxWalkSpeed=n)},1),this.setupSlider("slide-walk-accel","val-walk-accel",n=>{this.character.walkingModule&&(this.character.walkingModule.walkAcceleration=n)},0),this.setupSlider("slide-pickup-reach","val-pickup-reach",n=>{this.character.pickupModule&&(this.character.pickupModule.pickupReach=n)},1),this.setupSlider("slide-throw-force","val-throw-force",n=>{this.character.throwModule&&(this.character.throwModule.baseThrowForce=n)},1),this.setupSlider("slide-gravity","val-gravity",n=>{this.arena.gravity=n},1),this.setupSlider("slide-wall-height","val-wall-height",n=>{this.arena.setStandardWallHeight(n)},1),this.setupSlider("slide-friction","val-friction",n=>{this.arena.frictionCoeff=n},1),this.setupSlider("slide-static-thresh","val-static-thresh",n=>{this.arena.staticFrictionThreshold=n},2);const t=this.container.querySelector("#toggle-walk");t.addEventListener("click",()=>{this.character.walkingModule?(this.character.walkingModule=null,t.textContent="Detached",t.classList.remove("active")):(this.character.walkingModule=new z,t.textContent="Attached",t.classList.add("active"))});const i=this.container.querySelector("#toggle-pickup");i.addEventListener("click",()=>{this.character.pickupModule?(this.character.pickupModule=null,i.textContent="Detached",i.classList.remove("active")):(this.character.pickupModule=new D,i.textContent="Attached",i.classList.add("active"))});const s=this.container.querySelector("#toggle-throw");s.addEventListener("click",()=>{this.character.throwModule?(this.character.throwModule=null,s.textContent="Detached",s.classList.remove("active")):(this.character.throwModule=new L,s.textContent="Attached",s.classList.add("active"))}),(e=this.container.querySelector("#btn-spawn-light"))==null||e.addEventListener("click",()=>{const n=new E({name:"Light Stone",position:{x:this.character.position.x+(Math.random()*2-1),y:this.character.position.y+(Math.random()*2-1),z:.4},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25});this.onSpawnObject(n),this.setSelectedEntity(n)}),(o=this.container.querySelector("#btn-spawn-heavy"))==null||o.addEventListener("click",()=>{const n=new E({name:"Heavy Crate",position:{x:this.character.position.x+(Math.random()*2-1),y:this.character.position.y+(Math.random()*2-1),z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05});this.onSpawnObject(n),this.setSelectedEntity(n)}),(l=this.container.querySelector("#btn-spawn-bouncy"))==null||l.addEventListener("click",()=>{const n=new E({name:"Super Bouncy Ball",position:{x:this.character.position.x+(Math.random()*2-1),y:this.character.position.y+(Math.random()*2-1),z:.7},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.88,verticalVelocity:1.6});this.onSpawnObject(n),this.setSelectedEntity(n)}),(c=this.container.querySelector("#btn-clear-entities"))==null||c.addEventListener("click",()=>{this.onClearObjects(),this.setSelectedEntity(this.character)})}setupSlider(t,i,s,e=0){const o=this.container.querySelector(`#${t}`),l=this.container.querySelector(`#${i}`);!o||!l||o.addEventListener("input",()=>{const c=parseFloat(o.value);l.textContent=e>0?c.toFixed(e):Math.round(c).toString(),s(c)})}updateInspector(){const t=this.selectedEntity,i=Math.hypot(t.velocity.x,t.velocity.y).toFixed(2),s=t===this.character;this.inspectorEl.innerHTML=`
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
        <span class="inspect-k">Speed</span>
        <span class="inspect-v">${i} u/s</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Bounce Mod</span>
        <span class="inspect-v">${t.bounceMod!==null?t.bounceMod.toFixed(2):"None"}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Static / Dyn Fric</span>
        <span class="inspect-v">${t.staticGroundFrictionMod.toFixed(2)} / ${t.dynamicGroundFrictionMod.toFixed(2)}</span>
      </div>
      ${s?`
      <div class="inspect-item">
        <span class="inspect-k">Facing Angle</span>
        <span class="inspect-v">${Math.round(this.character.facingAngle*180/Math.PI)}°</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Held Freebody</span>
        <span class="inspect-v ${this.character.heldObject?"highlight-held":""}">${this.character.heldObject?`${this.character.heldObject.name} (${this.character.heldObject.mass}kg)`:"None"}</span>
      </div>
      `:`
      <div class="inspect-item">
        <span class="inspect-k">Mass</span>
        <span class="inspect-v">${t.mass.toFixed(1)} kg</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Radius</span>
        <span class="inspect-v">${t.colliderRadius.toFixed(2)} u</span>
      </div>
      `}
    `}}class K{constructor(t){a(this,"arena");a(this,"character");a(this,"objects");a(this,"renderer");a(this,"inputManager");a(this,"devPanel");a(this,"isRunning",!1);a(this,"lastTime",0);a(this,"accumulator",0);a(this,"fixedDt",1/60);this.arena=t.arena,this.character=t.character,this.objects=t.objects,this.renderer=t.renderer,this.inputManager=t.inputManager,this.devPanel=t.devPanel}start(){this.isRunning||(this.isRunning=!0,this.lastTime=performance.now(),requestAnimationFrame(t=>this.tick(t)))}stop(){this.isRunning=!1}tick(t){if(!this.isRunning)return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,i>.2&&(i=.2),this.accumulator+=i;this.accumulator>=this.fixedDt;)this.updatePhysics(this.fixedDt),this.accumulator-=this.fixedDt;this.renderer.render(this.arena,this.character,this.objects,this.devPanel.selectedEntity),this.devPanel.updateInspector(),requestAnimationFrame(s=>this.tick(s))}updatePhysics(t){const i=this.inputManager;this.character.updateCharacter(t,i.movementVector,i.isMouseDown,i.mousePos,this.arena);for(const s of this.objects)s.updatePosition(t,this.arena);this.resolveFreebodyCollisions()}resolveFreebodyCollisions(){const t=[this.character,...this.objects];for(let i=0;i<t.length;i++)for(let s=i+1;s<t.length;s++){const e=t[i],o=t[s];if(e.isHeld||o.isHeld)continue;const l=o.position.x-e.position.x,c=o.position.y-e.position.y,n=l*l+c*c,r=e.colliderRadius+o.colliderRadius;if(n<r*r&&n>1e-5){const d=Math.abs(e.position.z-o.position.z),h=Math.min(e.colliderRadius,o.colliderRadius);if(d<h){const p=Math.sqrt(n),y=r-p,u=l/p,v=c/p,m=Math.hypot(e.velocity.x,e.velocity.y),b=Math.hypot(o.velocity.x,o.velocity.y),f=this.arena.staticFrictionThreshold*e.staticGroundFrictionMod,F=this.arena.staticFrictionThreshold*o.staticGroundFrictionMod,x=e.isRestingOnSurface&&m<f,R=o.isRestingOnSurface&&b<F,A=e.mass*(x?1+e.staticGroundFrictionMod*1.5:1+e.dynamicGroundFrictionMod*.4),S=o.mass*(R?1+o.staticGroundFrictionMod*1.5:1+o.dynamicGroundFrictionMod*.4),O=A+S,w=S/O,k=A/O;e.position.x-=u*y*w,e.position.y-=v*y*w,o.position.x+=u*y*k,o.position.y+=v*y*k;const C=o.velocity.x-e.velocity.x,P=o.velocity.y-e.velocity.y,W=C*u+P*v;if(W<0){let M=-1.15*W/(1/e.mass+1/o.mass);if(R&&o.staticGroundFrictionMod>0){const T=o.mass*this.arena.staticFrictionThreshold*o.staticGroundFrictionMod*1.5;M<T&&(M*=Math.max(.2,M/T))}if(x&&e.staticGroundFrictionMod>0){const T=e.mass*this.arena.staticFrictionThreshold*e.staticGroundFrictionMod*1.5;M<T&&(M*=Math.max(.2,M/T))}e.velocity.x-=M/e.mass*u,e.velocity.y-=M/e.mass*v,o.velocity.x+=M/o.mass*u,o.velocity.y+=M/o.mass*v}}}}}}function N(){const g=document.getElementById("game-canvas"),t=document.getElementById("dev-sidebar");if(!g||!t){console.error("Missing canvas or dev-sidebar container in DOM");return}const i=g.getContext("2d");if(!i){console.error("Failed to acquire 2D canvas context");return}const s=new I(20,14,1);g.width=1e3,g.height=700;const e=new G({x:4.8,y:7,color:"#f59e0b",colliderRadius:.44,mass:1.2,strength:1}),o=[new E({id:"stone-1",name:"Light Stone",position:{x:6.8,y:4.4,z:0},mass:.7,colliderRadius:.26,color:"#38bdf8",bounceMod:.25}),new E({id:"boulder-1",name:"Heavy Crate",position:{x:7,y:9.2,z:0},mass:2.6,colliderRadius:.4,color:"#f87171",bounceMod:.05}),new E({id:"bouncy-1",name:"Super Bouncy Ball",position:{x:5.2,y:3,z:.6},mass:.5,colliderRadius:.24,color:"#4ade80",bounceMod:.85,verticalVelocity:1}),new E({id:"stone-2",name:"Target Stone (Across Wall)",position:{x:13.6,y:7,z:0},mass:.8,colliderRadius:.28,color:"#a78bfa",bounceMod:.3})],l=new Y(i),c=new U({container:t,character:e,arena:s,objects:o,onSpawnObject:d=>{o.push(d),c.updateSelectorOptions()},onClearObjects:()=>{e.heldObject&&(e.heldObject.isHeld=!1,e.heldObject.heldBy=null,e.heldObject=null),o.length=0,c.updateSelectorOptions()}}),n=new X(g,s);n.handleInteractions(e,s,o,c),new K({arena:s,character:e,objects:o,renderer:l,inputManager:n,devPanel:c}).start(),console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!")}window.addEventListener("DOMContentLoaded",N);

const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\tealf\\.gemini\\antigravity-ide\\brain\\d7a2aeaa-b400-4406-8fa6-bbaaa2759893\\rounded_icons';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 1. Soft Bitten Apple (Consumable / Food Nutrition)
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Stem -->
  <path d="M256 85 C256 55, 275 35, 300 30" fill="none" stroke="#ffffff" stroke-width="22" stroke-linecap="round"/>
  <!-- Rounded Leaf -->
  <path d="M260 75 C310 40, 360 65, 350 105 C300 120, 260 95, 260 75 Z" fill="#ffffff"/>
  <!-- Apple Body with smooth bite cutout on right -->
  <mask id="apple-bite-mask">
    <rect width="512" height="512" fill="white"/>
    <circle cx="370" cy="260" r="76" fill="black"/>
  </mask>
  <path mask="url(#apple-bite-mask)" d="
    M 256 125
    C 285 125, 345 135, 385 185
    C 435 245, 425 355, 375 415
    C 335 465, 285 470, 256 450
    C 227 470, 177 465, 137 415
    C 87 355, 77 245, 127 185
    C 167 135, 227 125, 256 125 Z
  " fill="#ffffff"/>
  <!-- Rounded bite impression rim -->
  <circle cx="370" cy="260" r="76" fill="none" stroke="#0f172a" stroke-width="12" opacity="0.4"/>
</svg>`;

// 2. Two Balls Colliding (Round Shock Arcs & Capsule Trails)
const collisionSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Capsule Motion Trails (Left Ball) -->
  <rect x="35" y="205" width="65" height="20" rx="10" fill="#ffffff" opacity="0.4"/>
  <rect x="55" y="246" width="85" height="20" rx="10" fill="#ffffff" opacity="0.8"/>
  <rect x="35" y="287" width="65" height="20" rx="10" fill="#ffffff" opacity="0.4"/>
  <!-- Capsule Motion Trails (Right Ball) -->
  <rect x="412" y="205" width="65" height="20" rx="10" fill="#ffffff" opacity="0.4"/>
  <rect x="372" y="246" width="85" height="20" rx="10" fill="#ffffff" opacity="0.8"/>
  <rect x="412" y="287" width="65" height="20" rx="10" fill="#ffffff" opacity="0.4"/>
  <!-- Left Colliding Ball -->
  <circle cx="185" cy="256" r="74" fill="#ffffff"/>
  <!-- Right Colliding Ball -->
  <circle cx="327" cy="256" r="74" fill="#ffffff"/>
  <!-- Smooth Rounded Impact Shock Arcs -->
  <path d="M230 155 C256 175, 256 215, 230 235" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
  <path d="M282 155 C256 175, 256 215, 282 235" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
  <path d="M230 277 C256 297, 256 337, 230 357" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
  <path d="M282 277 C256 297, 256 337, 282 357" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
  <!-- Center Burst Spark (Rounded Diamond Capsule) -->
  <circle cx="256" cy="256" r="20" fill="#0f172a"/>
  <circle cx="256" cy="256" r="12" fill="#ffffff"/>
  <!-- Top and Bottom rounded spark beads -->
  <circle cx="256" cy="120" r="14" fill="#ffffff"/>
  <circle cx="256" cy="392" r="14" fill="#ffffff"/>
</svg>`;

// 3. Smooth Rounded Flame (Laser / Heat Damage)
const flameSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Smooth Curved Outer Flame with rounded tips -->
  <path d="
    M 256 50
    C 280 110, 310 145, 350 190
    C 410 260, 420 340, 380 405
    C 340 470, 275 480, 256 480
    C 237 480, 172 470, 132 405
    C 92 340, 102 260, 162 190
    C 202 145, 232 110, 256 50 Z
  " fill="#ffffff"/>
  <!-- Smooth Inner Teardrop Flame Cutout -->
  <path d="
    M 256 240
    C 275 280, 310 325, 295 380
    C 285 415, 265 435, 256 435
    C 247 435, 227 415, 217 380
    C 202 325, 237 280, 256 240 Z
  " fill="#0f172a"/>
</svg>`;

// 4. Smooth Rounded Pill Cross (Biological Healing)
const healCrossSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Circular container halo -->
  <circle cx="256" cy="256" r="185" fill="none" stroke="#ffffff" stroke-width="24" opacity="0.2"/>
  <!-- Vertical Rounded Capsule -->
  <rect x="212" y="116" width="88" height="280" rx="44" fill="#ffffff"/>
  <!-- Horizontal Rounded Capsule -->
  <rect x="116" y="212" width="280" height="88" rx="44" fill="#ffffff"/>
</svg>`;

// 5. Smooth Rounded Heart (Alternate Healing)
const heartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <path d="
    M 256 440
    C 240 425, 120 330, 80 250
    C 45 180, 75 100, 150 90
    C 205 82, 240 120, 256 145
    C 272 120, 307 82, 362 90
    C 437 100, 467 180, 432 250
    C 392 330, 272 425, 256 440 Z
  " fill="#ffffff"/>
</svg>`;

// 6. Smooth Rounded Boxing Glove (Melee Punch)
const punchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Rounded Main Glove -->
  <path d="
    M 200 130
    C 280 100, 390 120, 410 200
    C 430 270, 390 350, 320 370
    C 270 385, 220 365, 185 330
    L 135 345
    C 115 350, 95 335, 90 315
    L 80 240
    C 75 220, 90 200, 110 195
    L 160 185
    C 170 155, 180 140, 200 130 Z
  " fill="#ffffff"/>
  <!-- Rounded Thumb -->
  <path d="
    M 175 190
    C 140 210, 130 270, 165 295
    C 190 315, 225 310, 240 280
    C 255 250, 230 200, 175 190 Z
  " fill="#0f172a"/>
  <!-- Rounded Wrist Cuff -->
  <path d="M 60 365 C 60 350, 70 340, 85 340 L 150 340 C 165 340, 175 350, 175 365 C 175 380, 165 390, 150 390 L 85 390 C 70 390, 60 380, 60 365 Z" fill="#ffffff"/>
</svg>`;

// 7. Smooth Rounded Aura (Concentric Pill Rings)
const auraSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Outer smooth aura ring -->
  <circle cx="256" cy="256" r="170" fill="none" stroke="#ffffff" stroke-width="22" stroke-dasharray="60 30" stroke-linecap="round" opacity="0.4"/>
  <!-- Mid smooth aura ring -->
  <circle cx="256" cy="256" r="115" fill="none" stroke="#ffffff" stroke-width="26" stroke-dasharray="45 25" stroke-linecap="round" opacity="0.75"/>
  <!-- Inner radiant core -->
  <circle cx="256" cy="256" r="52" fill="#ffffff"/>
</svg>`;

// 8. Smooth Rounded Sneaker / Sprint
const sprintSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Speed Pill Lines behind shoe -->
  <rect x="50" y="200" width="80" height="18" rx="9" fill="#ffffff" opacity="0.4"/>
  <rect x="30" y="240" width="120" height="22" rx="11" fill="#ffffff" opacity="0.7"/>
  <rect x="65" y="285" width="75" height="18" rx="9" fill="#ffffff" opacity="0.4"/>
  <!-- Rounded Sneaker Silhouette -->
  <path d="
    M 210 160
    C 235 155, 260 170, 265 195
    L 275 235
    C 310 240, 360 255, 410 290
    C 445 315, 460 350, 440 375
    C 425 395, 395 395, 360 395
    L 200 395
    C 170 395, 150 375, 150 345
    L 155 240
    C 155 210, 180 165, 210 160 Z
  " fill="#ffffff"/>
  <!-- Rounded Sole Detail -->
  <rect x="150" y="365" width="295" height="35" rx="17" fill="#0f172a" opacity="0.4"/>
</svg>`;

// 9. Smooth Spring / Jump
const jumpSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Upward Arrow / Chevrons with round caps -->
  <path d="M 180 160 L 256 90 L 332 160" fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Smooth Curved Bouncing Spring -->
  <path d="
    M 200 220 C 310 220, 330 250, 256 265 C 180 280, 200 310, 312 315 C 330 345, 180 375, 256 390 L 256 425
  " fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Base Ground Plate -->
  <rect x="180" y="425" width="152" height="24" rx="12" fill="#ffffff"/>
</svg>`;

// 10. Smooth Rounded Throw (Trajectory Arc & Sphere)
const throwSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Parabolic trajectory arc with round cap -->
  <path d="M 80 400 C 130 180, 280 140, 380 180" fill="none" stroke="#ffffff" stroke-width="22" stroke-dasharray="35 20" stroke-linecap="round"/>
  <!-- Launched Projectile Ball with motion halo -->
  <circle cx="395" cy="190" r="54" fill="#ffffff"/>
  <circle cx="395" cy="190" r="70" fill="none" stroke="#ffffff" stroke-width="12" opacity="0.35"/>
  <!-- Origin launching base -->
  <circle cx="80" cy="400" r="22" fill="#ffffff"/>
</svg>`;

// 11. Smooth Rounded Ladder / Climb
const climbSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <!-- Left Rail -->
  <rect x="165" y="70" width="30" height="372" rx="15" fill="#ffffff"/>
  <!-- Right Rail -->
  <rect x="317" y="70" width="30" height="372" rx="15" fill="#ffffff"/>
  <!-- Rounded Rungs -->
  <rect x="175" y="130" width="162" height="26" rx="13" fill="#ffffff"/>
  <rect x="175" y="210" width="162" height="26" rx="13" fill="#ffffff"/>
  <rect x="175" y="290" width="162" height="26" rx="13" fill="#ffffff"/>
  <rect x="175" y="370" width="162" height="26" rx="13" fill="#ffffff"/>
</svg>`;

const files = {
  'apple_rounded.svg': appleSvg,
  'collision_rounded.svg': collisionSvg,
  'flame_rounded.svg': flameSvg,
  'heal_cross_rounded.svg': healCrossSvg,
  'heart_rounded.svg': heartSvg,
  'punch_rounded.svg': punchSvg,
  'aura_rounded.svg': auraSvg,
  'sprint_rounded.svg': sprintSvg,
  'jump_rounded.svg': jumpSvg,
  'throw_rounded.svg': throwSvg,
  'climb_rounded.svg': climbSvg
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, filename), content);
}

console.log('Saved 11 smooth rounded SVGs successfully!');

const fs = require('fs');
let code = fs.readFileSync('src/ui/DevPanel.ts', 'utf8');

// 1. Remove all module-dep-warning divs for energy
code = code.replace(/<div id="warn-[^"]+-energy" class="module-dep-warning"[^>]*>[\s\S]*?<\/div>\n?/g, '');

// 2. Remove warn element lookups and display toggling
code = code.replace(/\s*const warn = this\.panelElement\.querySelector<HTMLElement>\('#warn-[^']+-energy'\);\s*if \(warn\) warn\.style\.display = [^;]+;/g, '');

fs.writeFileSync('src/ui/DevPanel.ts', code, 'utf8');
console.log('DevPanel warnings cleaned.');
const matches = code.match(/warn-[a-z]+-energy/g);
console.log('Remaining warn occurrences:', matches ? matches : 'None! Clean.');

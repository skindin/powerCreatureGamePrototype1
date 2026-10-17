import fs from 'fs';

let code = fs.readFileSync('src/ui/DevPanel.ts', 'utf8');

// 1. Remove all warning divs
code = code.replace(/<div id="warn-[^"]+-energy" class="module-dep-warning"[^>]*>[\s\S]*?<\/div>\s*/g, '');

// 2. Remove warn element queries & display lines
code = code.replace(/\s*const warn = this\.container\.querySelector\("#warn-[^"]+-energy"\) as HTMLElement;\s*if \(warn\) warn\.style\.display = [^;]+;/g, '');

fs.writeFileSync('src/ui/DevPanel.ts', code, 'utf8');
console.log('DevPanel cleaned!');

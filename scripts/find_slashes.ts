import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk('src');
// Match Portuguese words separated by slash with or without spaces, e.g. "Telefone / WhatsApp", "PIN / Senha", "Ano/Modelo", "Marca/Modelo"
const slashRegex = /([a-zA-Z\u00C0-\u00FF]+(?:\s*\([a-zA-Z\u00C0-\u00FF]+\))?)\s*\/\s*([a-zA-Z\u00C0-\u00FF]+)/g;

interface MatchItem {
  file: string;
  lineNum: number;
  text: string;
  match: string;
  w1: string;
  w2: string;
}

const matches: MatchItem[] = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (line.includes('http://') || line.includes('https://') || line.includes('from ')) return;
    
    // reset regex
    slashRegex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = slashRegex.exec(line)) !== null) {
      const fullMatch = m[0];
      const w1 = m[1];
      const w2 = m[2];
      
      // Filter out HTML tags like </div> or </button
      if (line.includes(`</${w2}`)) continue;
      // Filter out comments like // or /*
      if (w1.endsWith(':') && line.includes('://')) continue;
      // Filter out math or code operations if single letters (like a / b)
      if (w1.length <= 1 || w2.length <= 1) continue;
      // Filter out regex literals like /pattern/
      if (trimmed.startsWith('/') && trimmed.endsWith('/')) continue;
      
      matches.push({ file: f, lineNum: idx + 1, text: trimmed, match: fullMatch, w1, w2 });
    }
  });
}

console.log(`TOTAL_MATCHES: ${matches.length}`);
const groupedByMatch = new Map<string, number>();
for (const m of matches) {
  const key = m.match;
  groupedByMatch.set(key, (groupedByMatch.get(key) || 0) + 1);
}

const sorted = Array.from(groupedByMatch.entries()).sort((a, b) => b[1] - a[1]);
console.log('--- FREQUENT MATCHES ---');
sorted.forEach(([k, count]) => {
  console.log(`${count.toString().padStart(4)}x : "${k}"`);
});

fs.writeFileSync('scripts/slashes_report.json', JSON.stringify(matches, null, 2), 'utf-8');
console.log('Saved detailed report to scripts/slashes_report.json');


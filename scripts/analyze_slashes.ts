import fs from 'fs';

interface MatchItem {
  file: string;
  lineNum: number;
  text: string;
  match: string;
  w1: string;
  w2: string;
}

const raw: MatchItem[] = JSON.parse(fs.readFileSync('scripts/slashes_report.json', 'utf-8'));

const ignoredWords = new Set([
  'jpeg', 'png', 'webp', 'main', 'exhaustive', 'width', 'height', 'revenue', 'profit',
  'totalItems', 'pageSize', 'totalPeriodRevenue', 'grossRevenue', 'sale', 'netProfit', 'grossProfit',
  'maxWidth', 'maxHeight', 'netProfitSimulated'
]);

const userFacing = raw.filter(item => {
  if (ignoredWords.has(item.w1) || ignoredWords.has(item.w2)) return false;
  if (item.text.includes('import ') || item.text.includes('require(')) return false;
  if (item.text.includes('typeof ') || item.text.includes('interface ') || item.text.includes('type ')) return false;
  if (item.match.includes('image/')) return false;
  if (item.match.includes('config/')) return false;
  if (item.match.includes('hooks/')) return false;
  if (item.text.startsWith('//') || item.text.startsWith('/*')) return false;
  return true;
});

const byFile = new Map<string, MatchItem[]>();
for (const item of userFacing) {
  if (!byFile.has(item.file)) byFile.set(item.file, []);
  byFile.get(item.file)!.push(item);
}

let out = `USER FACING SLASH COUNT: ${userFacing.length}\n\n`;
for (const [file, items] of byFile.entries()) {
  out += `### FILE: ${file} (${items.length} occurrences)\n`;
  for (const it of items) {
    out += `  L${it.lineNum}: [${it.match}] => ${it.text}\n`;
  }
  out += '\n';
}

fs.writeFileSync('scripts/user_facing_slashes.txt', out, 'utf-8');
console.log(`Saved ${userFacing.length} occurrences to scripts/user_facing_slashes.txt`);

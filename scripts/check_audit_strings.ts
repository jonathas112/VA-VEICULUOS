import fs from 'fs';

const audit = fs.readFileSync('scripts/run_system_audit.ts', 'utf-8');
const stringsToCheck = [
  'Telefone / WhatsApp', 'Sem Garantia / No Estado', 'Vendido no Estado / Sem Garantia',
  'Marca/Modelo', 'Ano Fab/Mod', 'Vendedor(a) / Antigo Dono', 'Pix/TED',
  'O VENDEDOR/ANTIGO DONO', 'quitou/descontou', 'Financiamento / Cartão',
  'Repasse', 'Venda', 'Atacado'
];

stringsToCheck.forEach(s => {
  if (audit.includes(s)) {
    console.log(`FOUND IN AUDIT: "${s}"`);
  }
});


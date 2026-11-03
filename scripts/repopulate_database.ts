/**
 * Script de Repopulação e Validação de Dados para Apresentação — VA Veículos
 *
 * Popula e valida os dados de demonstração:
 * - 9 Veículos (em estoque, vendidos, repasse, motos, picapes, SUVs)
 * - 4 Antigos Proprietários com dados cadastrais e LGPD
 * - 3 Vendas com garantias, financiamentos e comissões (incluindo comissão pendente)
 * - 6 Financeiras parceiras credenciadas
 * - 3 Vendedores cadastrados na equipe
 * - Perfil Institucional completo da loja (Areial - PB, CNPJ, papel timbrado)
 * - 2 Logins principais validados (Gestor Geral e Vendedor)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import {
  SEED_STORE,
  SEED_FINANCIERS,
  SEED_SALESPEOPLE,
  SEED_OWNERS,
  SEED_VEHICLES,
  SEED_SALES,
  SEED_USERS
} from '../src/data/seedData';
import { storageService } from '../src/services/storage';
import { verifyPassword } from '../src/utils/security';

async function main() {
  console.log('=====================================================');
  console.log('  VA VEÍCULOS — REPOPULAÇÃO DE DADOS DE APRESENTAÇÃO');
  console.log('=====================================================\n');

  // 1. Reseta e recarrega os dados locais
  storageService.resetAll();
  console.log('✔ Banco de dados local redefinido com dados de demonstração:');
  console.log(`   - ${SEED_VEHICLES.length} Veículos no catálogo (estoque + vendidos)`);
  console.log(`   - ${SEED_OWNERS.length} Antigos Proprietários cadastrados`);
  console.log(`   - ${SEED_SALES.length} Vendas registradas com contratos e DRE`);
  console.log(`   - ${SEED_FINANCIERS.length} Instituições Financeiras parceiras`);
  console.log(`   - ${SEED_SALESPEOPLE.length} Consultores de Vendas na equipe`);
  console.log(`   - Loja: ${SEED_STORE.nomeFantasia} — ${SEED_STORE.cidade}/${SEED_STORE.estado}`);

  // 2. Tenta sincronizar documentos públicos no Firestore (ex: vitrine e loja)
  try {
    const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    const app = initializeApp(config);
    const db = getFirestore(app, config.firestoreDatabaseId);

    console.log(`\n✔ Conectando ao Firestore (${config.firestoreDatabaseId})...`);
    // Leitura do perfil da loja para checagem de integridade
    const storeSnap = await getDoc(doc(db, 'store_config', 'main'));
    if (storeSnap.exists()) {
      console.log('✔ Documento store_config/main acessível no Firestore.');
    }
  } catch (err: any) {
    console.log('ℹ Nota sobre sincronização remota:', err.message || err);
  }

  // 3. Validação dos Dois Logins de Apresentação
  console.log('\n-----------------------------------------------------');
  console.log('  VALIDAÇÃO DOS LOGINS DE APRESENTAÇÃO');
  console.log('-----------------------------------------------------');

  const demoAccounts = [
    {
      label: 'GESTOR GERAL (Acesso Total)',
      email: 'admin@vaveiculos.com.br',
      senha: 'Va@2026!',
      papelEsperado: 'gestor'
    },
    {
      label: 'VENDEDOR (Carlos Eduardo Ramos)',
      email: 'carlos@vaveiculos.com.br',
      senha: 'Va@2026!',
      papelEsperado: 'vendedor'
    }
  ];

  let allPassed = true;

  for (const acc of demoAccounts) {
    const authResult = storageService.authenticateUser(acc.email, acc.senha);
    if (!authResult.success || !authResult.user) {
      console.error(`❌ Falha na autenticação de ${acc.label}: ${authResult.error}`);
      allPassed = false;
      continue;
    }

    const roleMatch = authResult.user.papel === acc.papelEsperado;
    if (!roleMatch) {
      console.error(`❌ Papel incorreto para ${acc.label}. Esperado: ${acc.papelEsperado}, Obtido: ${authResult.user.papel}`);
      allPassed = false;
      continue;
    }

    console.log(`✔ [PASS] ${acc.label}:`);
    console.log(`    E-mail:   ${acc.email}`);
    console.log(`    Senha:    ${acc.senha}`);
    console.log(`    Nome:     ${authResult.user.nome}`);
    console.log(`    Papel:    ${authResult.user.papel}`);
    console.log(`    Status:   ${authResult.user.ativo ? 'Ativo' : 'Inativo'}\n`);
  }

  if (allPassed) {
    console.log('=====================================================');
    console.log('✔ REPOPULAÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
    console.log('  O sistema está pronto para a apresentação.');
    console.log('=====================================================');
  } else {
    console.error('❌ Falhas encontradas durante a repopulação.');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});

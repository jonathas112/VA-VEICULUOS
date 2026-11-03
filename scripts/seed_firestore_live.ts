import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, terminate } from 'firebase/firestore';
import fs from 'fs';
import {
  SEED_STORE,
  SEED_FINANCIERS,
  SEED_SALESPEOPLE,
  SEED_VEHICLES
} from '../src/data/seedData';
import { sanitizePublicVehicle } from '../src/utils/security';

function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefinedFields(item)) as unknown as T;
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefinedFields(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

async function main() {
  console.log('--- INICIANDO GRAVAÇÃO REAL DE DADOS NO FIRESTORE (va-veiculos) ---');
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  // 1. Salva Configuração da Loja
  await setDoc(doc(db, 'store_config', 'main'), stripUndefinedFields(SEED_STORE), { merge: true });
  console.log('✔ store_config/main gravado no Firestore.');

  // 2. Salva Veículos em /vehicles e /vehicles_public
  for (const v of SEED_VEHICLES) {
    const pub = sanitizePublicVehicle(v);

    await setDoc(doc(db, 'vehicles', v.id), stripUndefinedFields({
      ...v,
      atualizadoEm: new Date().toISOString()
    }), { merge: true });

    await setDoc(doc(db, 'vehicles_public', v.id), stripUndefinedFields({
      ...pub,
      atualizadoEm: new Date().toISOString()
    }), { merge: true });

    console.log(`✔ Veículo ${v.id} (${v.marca} ${v.modelo} - ${v.placa}) gravado em /vehicles e /vehicles_public.`);
  }

  // 3. Salva Financeiras
  for (const fin of SEED_FINANCIERS) {
    await setDoc(doc(db, 'financiers', fin.id), stripUndefinedFields(fin), { merge: true });
  }
  console.log(`✔ ${SEED_FINANCIERS.length} financeiras gravadas no Firestore.`);

  // 4. Salva Vendedores
  for (const sp of SEED_SALESPEOPLE) {
    await setDoc(doc(db, 'salespeople', sp.id), stripUndefinedFields(sp), { merge: true });
  }
  console.log(`✔ ${SEED_SALESPEOPLE.length} consultores comerciais gravados no Firestore.`);

  await terminate(db);
  console.log('--- POVOAMENTO DO FIRESTORE CONCLUÍDO COM SUCESSO ---');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro na gravação:', err);
  process.exit(1);
});

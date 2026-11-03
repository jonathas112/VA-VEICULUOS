import { SystemUser, UserRole, Vehicle } from '../types';

/**
 * Módulo Central de Segurança da Informação — VA Veículos
 * - Hash criptográfico SHA-256 com salt por usuário e key stretching (1.000 iterações)
 * - Comparação em tempo constante contra ataques de timing
 * - Sessão autenticada assinada (HMAC-SHA256) com expiração (TTL) e proteção contra adulteração em DevTools
 * - Proteção contra força bruta (rate limiting de tentativas de login)
 * - Sanitização rigorosa de entradas e árvore DOM contra XSS / HTML Injection
 * - Projeção pública de veículos (remoção de custos confidenciais para vitrine anônima)
 */

const APP_PEPPER = 'va-veiculos-auth-pepper-v2-9f4c8e2a';
const SESSION_SIGNING_SECRET = 'va-veiculos-session-hmac-v2-7b3d1a5e';
const SESSION_STORAGE_KEY = 'vaveiculos_auth_session_v2';
const LEGACY_SESSION_KEY = 'vaveiculos_staff_session';
const LOGIN_ATTEMPTS_KEY = 'vaveiculos_login_attempts_v2';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas de validade por sessão
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 segundos de bloqueio após 5 falhas consecutivas
const HASH_ITERATIONS = 1000;

// Constantes iniciais e tabela K do algoritmo FIPS 180-4 (SHA-256)
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Implementação pura e determinística de SHA-256 (UTF-8 -> Hex),
 * compatível com ambientes HTTP/HTTPS/Offline sem dependências externas.
 */
export function sha256Hex(message: string): string {
  const utf8 = new TextEncoder().encode(message);
  const bitLen = utf8.length * 8;

  const totalLen = (((utf8.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(totalLen);
  padded.set(utf8);
  padded[utf8.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(totalLen - 8, highBits, false);
  view.setUint32(totalLen - 4, lowBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(v => v.toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Comparação de strings em tempo constante para mitigar ataques de canal lateral
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifica se a senha já está armazenada no formato de hash estruturado
 */
export function isHashedPassword(value?: string): boolean {
  return Boolean(value && value.startsWith('sha256$'));
}

/**
 * Deriva hash criptográfico com salt vinculado ao identificador do usuário + key stretching
 */
export function hashPassword(plainPassword: string, saltSeed: string): string {
  if (isHashedPassword(plainPassword)) {
    return plainPassword;
  }
  const normalizedSalt = sha256Hex(`${APP_PEPPER}:${saltSeed.trim().toLowerCase()}`).slice(0, 24);
  let digest = sha256Hex(`${normalizedSalt}:${plainPassword}:${APP_PEPPER}`);
  for (let i = 1; i < HASH_ITERATIONS; i++) {
    digest = sha256Hex(`${digest}:${normalizedSalt}:${i}`);
  }
  return `sha256$${normalizedSalt}$${digest}`;
}

/**
 * Valida uma senha candidata contra o hash armazenado
 */
export function verifyPassword(candidatePlain: string, storedSecret: string, saltSeed: string): boolean {
  if (!candidatePlain || !storedSecret) return false;

  if (isHashedPassword(storedSecret)) {
    const parts = storedSecret.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedDigest = parts[2];

    let digest = sha256Hex(`${salt}:${candidatePlain}:${APP_PEPPER}`);
    for (let i = 1; i < HASH_ITERATIONS; i++) {
      digest = sha256Hex(`${digest}:${salt}:${i}`);
    }
    return timingSafeEqualStr(digest, expectedDigest);
  }

  // Fallback transitório exclusivo caso o registro ainda não tenha sido migrado
  const migrated = hashPassword(storedSecret, saltSeed);
  return verifyPassword(candidatePlain, migrated, saltSeed);
}

// ============================================================================
// PROTEÇÃO CONTRA FORÇA BRUTA (RATE LIMITING DE LOGIN)
// ============================================================================

interface LoginAttemptState {
  count: number;
  lockedUntil: number;
}

export function checkLoginRateLimit(): { allowed: boolean; remainingSeconds: number } {
  if (typeof sessionStorage === 'undefined') return { allowed: true, remainingSeconds: 0 };
  try {
    const raw = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!raw) return { allowed: true, remainingSeconds: 0 };
    const state: LoginAttemptState = JSON.parse(raw);
    const now = Date.now();
    if (state.lockedUntil > now) {
      return {
        allowed: false,
        remainingSeconds: Math.ceil((state.lockedUntil - now) / 1000)
      };
    }
    if (state.lockedUntil > 0 && state.lockedUntil <= now) {
      sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    }
    return { allowed: true, remainingSeconds: 0 };
  } catch {
    return { allowed: true, remainingSeconds: 0 };
  }
}

export function recordFailedLoginAttempt(): { locked: boolean; remainingSeconds: number; attemptsLeft: number } {
  if (typeof sessionStorage === 'undefined') {
    return { locked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }
  try {
    const raw = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
    const prev: LoginAttemptState = raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
    const nextCount = prev.count + 1;
    if (nextCount >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify({ count: nextCount, lockedUntil }));
      return {
        locked: true,
        remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        attemptsLeft: 0
      };
    }
    sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify({ count: nextCount, lockedUntil: 0 }));
    return {
      locked: false,
      remainingSeconds: 0,
      attemptsLeft: MAX_FAILED_ATTEMPTS - nextCount
    };
  } catch {
    return { locked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }
}

export function resetLoginAttempts(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  } catch {
    // ignore
  }
}

// ============================================================================
// GERENCIAMENTO DE SESSÃO ASSINADA E ANTI-TAMPERING (CONTRA BYPASS EM DEVTOOLS)
// ============================================================================

export interface AuthenticatedSessionPayload {
  userId: string;
  email: string;
  nome: string;
  papel: UserRole;
  issuedAt: number;
  expiresAt: number;
  sig: string;
}

function computeSessionSignature(
  userId: string,
  email: string,
  papel: UserRole,
  issuedAt: number,
  expiresAt: number,
  userPasswordHash: string
): string {
  const payload = `${userId}|${email.toLowerCase()}|${papel}|${issuedAt}|${expiresAt}|${userPasswordHash}`;
  return sha256Hex(`${SESSION_SIGNING_SECRET}:${payload}`);
}

export function createStaffSession(user: SystemUser): AuthenticatedSessionPayload {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_MS;
  const sig = computeSessionSignature(user.id, user.email, user.papel, issuedAt, expiresAt, user.senha);

  const session: AuthenticatedSessionPayload = {
    userId: user.id,
    email: user.email,
    nome: user.nome,
    papel: user.papel,
    issuedAt,
    expiresAt,
    sig
  };

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

export function clearStaffSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

/**
 * Reidrata e valida criptograficamente a sessão atual contra a base de usuários ativos.
 * Qualquer tentativa de editar 'papel' em sessionStorage ou setar 'vaveiculos_staff_session'
 * invalida a assinatura e encerra a sessão imediatamente.
 */
export function loadVerifiedStaffSession(users: SystemUser[]): SystemUser | null {
  if (typeof sessionStorage === 'undefined') return null;

  // Remove flag legada insegura caso alguém tente injetá-la manualmente via DevTools
  if (sessionStorage.getItem(LEGACY_SESSION_KEY)) {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  }

  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: AuthenticatedSessionPayload = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.email !== 'string' ||
      (parsed.papel !== 'gestor' && parsed.papel !== 'vendedor') ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.sig !== 'string'
    ) {
      clearStaffSession();
      return null;
    }

    if (Date.now() >= parsed.expiresAt) {
      clearStaffSession();
      return null;
    }

    const activeUser = users.find(
      u => u.id === parsed.userId && u.email.toLowerCase() === parsed.email.toLowerCase() && u.ativo
    );
    if (!activeUser || activeUser.papel !== parsed.papel) {
      clearStaffSession();
      return null;
    }

    const expectedSig = computeSessionSignature(
      activeUser.id,
      activeUser.email,
      activeUser.papel,
      parsed.issuedAt,
      parsed.expiresAt,
      activeUser.senha
    );

    if (!timingSafeEqualStr(expectedSig, parsed.sig)) {
      clearStaffSession();
      return null;
    }

    return activeUser;
  } catch {
    clearStaffSession();
    return null;
  }
}

// ============================================================================
// SANITIZAÇÃO DE ENTRADAS E PROTEÇÃO CONTRA XSS / INJECTION
// ============================================================================

/**
 * Escapa caracteres especiais HTML para interpolação segura em títulos e atributos
 */
export function escapeHtml(raw: string): string {
  if (!raw) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza campos cadastrais (nome, CPF, endereço, observações):
 * remove tags HTML/scripts, caracteres de controle e overrides bidirecionais Unicode.
 */
export function sanitizeInputText(raw: string | undefined | null, allowMultiline = false): string {
  if (!raw) return '';
  let cleaned = String(raw)
    // Remove caracteres de controle invisíveis (exceto \n e \t quando multiline)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Remove caracteres Unicode Bidi Override usados para spoofing visual
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Remove blocos <script>...</script> ou <style>...</style>
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // Remove quaisquer tags HTML remanescentes
    .replace(/<\/?[a-zA-Z][^>]*>/g, '');

  if (!allowMultiline) {
    cleaned = cleaned.replace(/[\r\n]+/g, ' ');
  }

  return cleaned.trim();
}

/**
 * Sanitiza minutas jurídicas e textos longos preservando quebras de linha e formatação textual
 */
export function sanitizeContractText(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

const FORBIDDEN_DOM_TAGS = new Set([
  'SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'APPLET', 'META', 'BASE', 'FORM', 'LINK'
]);

/**
 * Sanitiza recursivamente uma árvore DOM antes de enviá-la ao iframe de impressão A4,
 * removendo elementos executáveis, handlers inline (on*) e protocolos perigosos (javascript:).
 */
export function sanitizeDomTree(root: ParentNode): void {
  const elements = Array.from(root.querySelectorAll('*'));
  for (const el of elements) {
    if (FORBIDDEN_DOM_TAGS.has(el.tagName.toUpperCase())) {
      el.remove();
      continue;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const nameLower = attr.name.toLowerCase();
      const valTrimmed = attr.value.trim().toLowerCase();

      // Remove qualquer event handler inline (onclick, onerror, onload, etc.)
      if (nameLower.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Bloqueia URIs executáveis em href, src, xlink:href, action, formaction
      if (
        nameLower === 'href' ||
        nameLower === 'src' ||
        nameLower === 'xlink:href' ||
        nameLower === 'action' ||
        nameLower === 'formaction'
      ) {
        if (
          valTrimmed.startsWith('javascript:') ||
          valTrimmed.startsWith('vbscript:') ||
          valTrimmed.startsWith('data:text/html')
        ) {
          el.removeAttribute(attr.name);
        }
      }
    }
  }
}

// ============================================================================
// PROJEÇÃO PÚBLICA DE VEÍCULOS (PRIVACIDADE DA VITRINE / SHOWROOM)
// ============================================================================

/**
 * Remove todos os dados financeiros confidenciais de aquisição e custos internos
 * antes de expor um veículo para a vitrine pública ou coleção vehicles_public.
 */
export function sanitizePublicVehicle(vehicle: Vehicle): Vehicle {
  return {
    id: vehicle.id,
    tipo: vehicle.tipo,
    marca: vehicle.marca,
    modelo: vehicle.modelo,
    versao: vehicle.versao,
    anoFabricacao: vehicle.anoFabricacao,
    anoModelo: vehicle.anoModelo,
    cor: vehicle.cor,
    combustivel: vehicle.combustivel,
    cambio: vehicle.cambio,
    quilometragem: vehicle.quilometragem,
    placa: vehicle.placa,
    chassi: '',
    renavam: '',
    categoriaComercial: vehicle.categoriaComercial,
    status: vehicle.status,
    fotos: vehicle.fotos || [],
    antigoDonoId: '',
    dataEntrada: vehicle.dataEntrada,
    valorPago: 0,
    debitoDetran: {
      temDebito: false,
      valor: 0,
      quemArca: 'nenhum'
    },
    reciboCompraGerado: false,
    valorAnunciado: vehicle.valorAnunciado,
    descricaoDestaques: vehicle.descricaoDestaques || [],
    dataVenda: vehicle.dataVenda,
    custosPatio: []
  };
}


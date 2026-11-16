/**
 * Test réel des canaux Norasend : 1 message WhatsApp, 1 message Telegram, puis une
 * diffusion à 3 destinataires sur chaque canal. N'écrit rien en base.
 *
 * ⚠️ Envoie de VRAIS messages : n'utilisez que des numéros / chats dont les titulaires
 * ont accepté de recevoir ce test (vous-même, un collègue).
 *
 * Variables (en plus de NORASEND_API_KEY, WHATSAPP_SESSION_ID, TELEGRAM_BOT_ID, SUPABASE_* et DATABASE_URL
 * exigées par la configuration commune du backend) :
 *   NORASEND_TEST_WHATSAPP="2250700000001,2250700000002,2250700000003"   (3 numéros)
 *   NORASEND_TEST_TELEGRAM="123456789,987654321,@mon_canal"              (3 chats)
 *
 * Usage (depuis backend/) :
 *   npx tsx scripts/norasend-smoke.ts --i-have-consent            # tout
 *   npx tsx scripts/norasend-smoke.ts --i-have-consent --whatsapp # un seul canal
 */
import 'dotenv/config';
import { sendWhatsAppMessage, broadcastWhatsApp } from '../src/modules/communications/norasend-whatsapp.service';
import { sendTelegramMessage, broadcastTelegram } from '../src/modules/communications/norasend-telegram.service';
import { normalizePhone, normalizeChatId } from '../src/modules/communications/communications.service';
import { isNorasendConfigured, type NorasendResult } from '../src/modules/communications/norasend.client';

const args = process.argv.slice(2);
const onlyWa = args.includes('--whatsapp');
const onlyTg = args.includes('--telegram');
const list = (name: string): string[] => (process.env[name] ?? '').split(',').map((s) => s.trim()).filter(Boolean);

function report(label: string, r: NorasendResult): boolean {
  console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${label}${r.messageId ? ` (id ${r.messageId})` : ''}${r.error ? ` — ${r.error}` : ''}`);
  for (const item of r.results ?? []) console.log(`       ${item.ok ? '✓' : '✗'} ${item.to}${item.error ? ` — ${item.error}` : ''}`);
  return r.ok;
}

async function main(): Promise<void> {
  if (!args.includes('--i-have-consent')) {
    console.error('Ce script envoie de vrais messages. Relancez avec --i-have-consent après avoir vérifié que les destinataires sont d\'accord.');
    process.exit(2);
  }
  if (!isNorasendConfigured()) {
    console.error('NORASEND_API_KEY manquante.');
    process.exit(2);
  }
  const wa = list('NORASEND_TEST_WHATSAPP').map((n) => normalizePhone(n));
  const tg = list('NORASEND_TEST_TELEGRAM').map((c) => normalizeChatId(c));
  const runWa = !onlyTg;
  const runTg = !onlyWa;
  if (runWa && (wa.length !== 3 || wa.includes(null))) throw new Error('NORASEND_TEST_WHATSAPP : 3 numéros valides requis');
  if (runTg && (tg.length !== 3 || tg.includes(null))) throw new Error('NORASEND_TEST_TELEGRAM : 3 chats valides requis');

  const stamp = new Date().toISOString().slice(11, 19);
  let allOk = true;

  if (runWa) {
    const to = wa as string[];
    allOk = report('WhatsApp — message de test', await sendWhatsAppMessage(to[0], `Test Primeo (WhatsApp) ${stamp}`)) && allOk;
    allOk = report('WhatsApp — diffusion à 3', await broadcastWhatsApp(to, `Test de diffusion Primeo ${stamp}`, undefined, 3000)) && allOk;
  }
  if (runTg) {
    const to = tg as string[];
    allOk = report('Telegram — message de test', await sendTelegramMessage(to[0], `Test Primeo (Telegram) ${stamp}`)) && allOk;
    allOk = report('Telegram — diffusion à 3', await broadcastTelegram(to, `Test de diffusion Primeo ${stamp}`, 1000)) && allOk;
  }
  console.log(allOk ? '\nTOUT EST CONFORME' : '\nAU MOINS UN ENVOI A ÉCHOUÉ');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(`Échec : ${(err as Error).message}`);
  process.exit(1);
});

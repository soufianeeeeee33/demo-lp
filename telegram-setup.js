/* =====================================================================
   Configuration Telegram (à lancer une fois) : npm run telegram:setup
   1. Lit la clé du bot dans .env
   2. Trouve votre identifiant Telegram (il faut avoir appuyé sur "Démarrer" dans le bot)
   3. L'écrit dans .env et vous envoie un message de test
   ===================================================================== */
require("./env");
const fs = require("fs");
const path = require("path");
const { sendTelegram } = require("./notify");

const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const envFile = path.join(__dirname, ".env");

(async () => {
  if (!/^\d+:[\w-]{30,}$/.test(token)) {
    console.error("❌ Clé absente ou invalide. Collez la clé de @BotFather dans .env après TELEGRAM_BOT_TOKEN=");
    process.exit(1);
  }
  const api = (m) => fetch(`https://api.telegram.org/bot${token}/${m}`, { signal: AbortSignal.timeout(10000) }).then((r) => r.json());

  const me = await api("getMe");
  if (!me.ok) { console.error("❌ Telegram refuse la clé :", me.description); process.exit(1); }
  console.log(`✅ Bot trouvé : @${me.result.username}`);

  const up = await api("getUpdates");
  const chats = (up.result || []).map((u) => (u.message || u.my_chat_member || {}).chat).filter((c) => c && c.type === "private");
  if (!chats.length) {
    console.error(`❌ Aucun message reçu. Ouvrez @${me.result.username} dans Telegram, appuyez sur "Démarrer" (ou envoyez "bonjour"), puis relancez.`);
    process.exit(1);
  }
  const chat = chats[chats.length - 1];
  process.env.TELEGRAM_CHAT_ID = String(chat.id);

  let env = fs.readFileSync(envFile, "utf8");
  env = /^TELEGRAM_CHAT_ID=.*$/m.test(env)
    ? env.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${chat.id}`)
    : `${env.trimEnd()}\nTELEGRAM_CHAT_ID=${chat.id}\n`;
  fs.writeFileSync(envFile, env);
  console.log(`✅ Identifiant enregistré pour ${chat.first_name || "vous"}`);

  await sendTelegram("✅ <b>Bot connecté !</b>\nVous recevrez ici une alerte à chaque nouvelle commande sur la landing page.");
  console.log("✅ Message de test envoyé : regardez Telegram. Redémarrez le serveur pour activer les alertes.");
})().catch((e) => { console.error("❌ Erreur :", e.message); process.exit(1); });

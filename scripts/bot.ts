import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function run() {
  // Dynamically import bot after environment config has been fully loaded into process.env
  const { bot } = await import('../lib/telegram/bot');

  console.log('----------------------------------------------------');
  console.log('              SIFT TELEGRAM BOT ENGINE              ');
  console.log('----------------------------------------------------');
  console.log('Starting Sift bot local long-polling...');

  bot.start().catch((err) => {
    console.error('[Bot Fatal Runtime Error]', err);
  });

  console.log('Telegram Bot Polling has started successfully. Listening for chats...');
}

run();


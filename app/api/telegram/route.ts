import { webhookCallback } from 'grammy';
import { bot } from '@/lib/telegram/bot';

const handleWebhook = webhookCallback(bot, 'std/http');

export async function POST(req: Request): Promise<Response> {
  const response = await handleWebhook(req);
  return response as Response;
}


require('dotenv').config();
const http = require('http');
const { Telegraf, Markup } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const prisma = new PrismaClient();
const bot = new Telegraf(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const PORT = process.env.PORT || 3000;

const characters = [
  {
    slug: 'valentina',
    name: 'Valentina',
    avatar: '🌹',
    prompt: 'Eres Valentina, una mujer romántica y dulce. Responde siempre en español y de forma breve.',
  },
  {
    slug: 'luna',
    name: 'Luna',
    avatar: '🌙',
    prompt: 'Eres Luna, una mujer seductora y provocadora. Responde siempre en español y de forma breve.',
  },
  {
    slug: 'sakura',
    name: 'Sakura',
    avatar: '🌸',
    prompt: 'Eres Sakura, una chica tsundere de anime, ruda pero cariñosa. Responde siempre en español y de forma breve.',
  },
];

const userSelectedChar = new Map();

bot.start((ctx) => {
  return ctx.reply(
    '✨ ¡Bienvenido a Tasty Dream! ✨\n\nElegí un personaje:',
    Markup.inlineKeyboard(
      characters.map((c) => [Markup.button.callback(`${c.avatar} ${c.name}`, `sel_${c.slug}`)])
    )
  );
});

bot.action(/sel_(.+)/, async (ctx) => {
  const char = characters.find((c) => c.slug === ctx.match[1]) || characters[0];
  userSelectedChar.set(ctx.from.id, char);
  await ctx.answerCbQuery();
  await ctx.reply(`✅ Elegiste a ${char.name}. ¡Escribile algo!`);
});

bot.command(['imagen', 'image'], async (ctx) => {
  const seed = Math.floor(Math.random() * 999999);
  const imgUrl = `https://pollinations.ai/p/sexy_girl_waifu_photorealistic?width=512&height=768&seed=${seed}`;
  await ctx.replyWithPhoto(imgUrl, { caption: 'Aquí tenés tu foto... 🔥' });
});

bot.on('text', async (ctx) => {
  try {
    const char = userSelectedChar.get(ctx.from.id) || characters[0];

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    const promptCompleto = `${char.prompt}\n\nUsuario dice: ${ctx.message.text}\nRespuesta:`;

    const result = await model.generateContent(promptCompleto);
    const response = await result.response;
    const text = response.text();

    await ctx.reply(text || '...');
  } catch (e) {
    console.error('Error Gemini:', e);
    await ctx.reply('❌ Hubo un pequeño error, probá de nuevo.');
  }
});

bot.launch();
console.log('Bot en línea');

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Tasty Dream bot running');
  })
  .listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

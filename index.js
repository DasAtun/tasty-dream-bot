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
  { slug: 'valentina', name: 'Valentina', avatar: '🌹', prompt: 'Eres Valentina, una mujer romántica y dulce. Responde siempre en español y de forma breve.' },
  { slug: 'luna', name: 'Luna', avatar: '🌙', prompt: 'Eres Luna, una mujer seductora y provocadora. Responde siempre en español y de forma breve.' },
  { slug: 'sakura', name: 'Sakura', avatar: '🌸', prompt: 'Eres Sakura, una chica tsundere de anime, ruda pero cariñosa. Responde siempre en español y de forma breve.' }
];

const userSelectedChar = new Map();

bot.start((ctx) => {
  return ctx.reply('✨ ¡Bienvenido a Tasty Dream! ✨\n\nElegí un personaje:',
    Markup.inlineKeyboard(characters.map(c => [Markup.button.callback(`${c.avatar} ${c.name}`, `sel_${c.slug}`)]))
  );
});

bot.action(/sel_(.+)/, async (ctx) => {
  const char = characters.find(c => c.slug === ctx.match[1]) || characters[0];
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
    // Usamos el modelo 2.0 que es el que pusiste en el proyecto nuevo
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const promptCompleto = `${char.prompt}\n\nMensaje: ${ctx.message.text}\nRespuesta corta:`;
    const result = await model.generateContent(promptCompleto);
    const text = result.response.text();

    await ctx.reply(text || '...');
  } catch (e) {
    console.error('Error Gemini:', e);
    await ctx.reply("❌ La IA está descansando un momento, probá de nuevo en unos segundos.");
  }
});

// Lanzamos el bot limpiando webhooks o conexiones anteriores
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('Bot en línea y limpio');
});

// Servidor para que Render no tire Time Out
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(PORT);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

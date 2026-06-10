require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const prisma = new PrismaClient();
const bot = new Telegraf(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const characters = [
  { slug: 'valentina', name: 'Valentina', avatar: '🌹', prompt: 'Eres Valentina, una mujer romántica y dulce. Respondé siempre en español.' },
  { slug: 'luna', name: 'Luna', avatar: '🌙', prompt: 'Eres Luna, una mujer seductora y provocadora. Respondé siempre en español.' },
  { slug: 'sakura', name: 'Sakura', avatar: '🌸', prompt: 'Eres Sakura, una chica tsundere de anime, ruda pero cariñosa. Respondé siempre en español.' }
];

const userSelectedChar = new Map();

bot.start((ctx) => {
  ctx.reply('✨ ¡Bienvenido a Tasty Dream! ✨\n\nElegí un personaje:',
    Markup.inlineKeyboard(characters.map(c => [Markup.button.callback(`${c.avatar} ${c.name}`, `sel_${c.slug}`)]))
  );
});

bot.action(/sel_(.+)/, async (ctx) => {
  const char = characters.find(c => c.slug === ctx.match[1]);
  userSelectedChar.set(ctx.from.id, char);
  await ctx.answerCbQuery();
  ctx.reply(`✅ Elegiste a ${char.name}. ¡Escribile algo!`);
});

bot.command(['imagen', 'image'], async (ctx) => {
  const seed = Math.floor(Math.random() * 999999);
  const imgUrl = `https://pollinations.ai/p/sexy_girl_waifu_photorealistic?width=512&height=768&seed=${seed}`;
  await ctx.replyWithPhoto(imgUrl, { caption: 'Aquí tenés tu foto... 🔥' });
});

bot.on('text', async (ctx) => {
  try {
    const char = userSelectedChar.get(ctx.from.id) || characters[0];
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const promptCompleto = `${char.prompt}\n\nUsuario dice: ${ctx.message.text}\nTu respuesta corta:`;
    const result = await model.generateContent(promptCompleto);
    ctx.reply(result.response.text());
  } catch (e) {
    console.error("Error Gemini:", e);
    ctx.reply("❌ Hubo un pequeño error, probá de nuevo.");
  }
});

bot.launch();
console.log("Bot en línea");

import { Telegraf, Context, Markup } from 'telegraf'
import fetch from 'node-fetch'
import store from './store'
import dotenv from 'dotenv'
import { ForceReply, Update } from 'telegraf/typings/core/types/typegram'
import { addTransaction, start } from './database'
import { OperationType, MINUTE, Transaction } from './enum'
import { getAmount, getStep, getTransaction, increaseStep, isCurrentStep, newOperation, resetStep, setAmount, setCategory } from './operation'
import { version } from './package.json'
import { getExpenses, uploadTransaction } from './firebase'
dotenv.config()

if (!process.env.BOT_TOKEN) throw 'Bot token requerido'

const bot = new Telegraf<Context<Update>>(process.env.BOT_TOKEN)

bot.start(async (ctx) => {
    console.log(ctx.chat.id)
    if (store.running) return ctx.reply('Ya esta iniciado')
    store.running = true
    start()
    
    ctx.reply('Inicio intervalo')

    setInterval(() => {
        const date = new Date()
        const hours = date.getHours()
        const minute = date.getMinutes()
        if (hours === 12 && minute === 0) ctx.reply('Ayer gastaste...')
    }, MINUTE)
})

bot.help((ctx) => {
    ctx.reply('Nada de ayuda por ahora')
})

bot.settings((ctx) => {
    ctx.reply('Ninguna configuracion por ahora')
})

/**
 * Enviar un mensaje a cierto chat.
 * Deberia guardar todos los chats ids en la base
 * y con un for loop crear un broadcast.
 */
bot.telegram.sendMessage(1174794170, 'Nueva version de bot ' + version).then(e=>e).catch(() => {})

bot.command('gastos', async (ctx) => {
    await getExpenses().then((data) => {
        const amount = data.reduce((acc, curr) => acc + curr.amount, 0)
        ctx.reply('Llevas gastando en total $' + amount)
    })
})

bot.command('pago', (ctx) => {
    newOperation(OperationType.Payment)

    const fran = {
        text: 'Fulano',
        callback_data: 'fulano'
    }

    ctx.reply('Elegir la categoria del pago', Markup.inlineKeyboard([[fran,fran,fran]]))
})

bot.on('callback_query', async (ctx) => {
    const { data } = (await ctx.callbackQuery) as {data:string}

    if (data === 'fulano') {
        increaseStep()
        setCategory('fulano')
        return ctx.reply('Que monto pagaste?', Markup.forceReply())
    }
    
    /** Guardar en base de datos */
    if (data === 'guardar') {
        const buildTransaction = getTransaction()

        uploadTransaction(buildTransaction).then(() => {
            return ctx.reply('💸')
        }).catch((reason) => {
            console.log('Failed uploading', reason)
            return ctx.reply('Hubo un error guardando tu operacion')
        })

    }
})

bot.on('text', (ctx) => {
    const { text } = ctx.message

    /** Obtener monto del pago */
    if (isCurrentStep(1)) {
        increaseStep()
        const amount = parseInt(text) || 0
        setAmount(amount)

        return ctx.reply('Destino?', Markup.forceReply())
    }

    /** Obtener destinatario del pago */
    if (isCurrentStep(2)) {
        resetStep()
        return ctx.reply(`Pagaste ${getAmount()} a ${text} ✔`, Markup.inlineKeyboard([[{
            text: 'Guardar',
            callback_data: 'guardar'
        }]]))
    }
})

bot.on('sticker', ctx => ctx.reply('No me envies stickers no los entiendo'))
/**
 * https://core.telegram.org/bots/features#global-commands
 * Telegram recomienda usar `Global Commands` para
 * interacciones consistentes para bots. 
 * /start, /help y /settings
 */

/**
 * Agrega los comandos a un menu facil de usar.
 * El comando tiene que empezar con una `/`, tiene
 * que existir y tiene que declararse de antemano.
 */
bot.telegram.setMyCommands([
    {
        command: '/pago',
        description: 'Anotar un pago'
    },
    {
        command: '/gastos',
        description: 'Anotar un pago'
    },
    {
        command: '/start',
        description: 'Anotar un pago'
    },
])

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
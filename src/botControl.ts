import { Telegraf, Context } from 'telegraf'
import dotenv from 'dotenv'
import { Update } from 'telegraf/typings/core/types/typegram'
import { getAllUsers } from './database/database'
import * as commands from './commands'
import { start } from './commands/start'
import { version } from '../package.json'
import { logger } from './logger'
import { ADMIN, BotStatus } from './enum'
import getDolarValue from './dolarAPI'
import { getDate } from './utils/handlers'
dotenv.config()

//TODO : hacer un catch general del error para que se guarde en el log

let botStatus: BotStatus = 'offline'

if (!process.env.BOT_TOKEN) throw 'Bot token requerido'

const bot = new Telegraf<Context<Update>>(process.env.BOT_TOKEN)

export function sendMessageToUser(userId: number, message: string) {
	bot.telegram.sendMessage(userId, message)
}

export const broadcastMessage = (message: string) => {
	getAllUsers().then((users) => {
		for (const user of users) {
			sendMessageToUser(user.id, message)
		}
	})
}

/**
 * TODO: mover de lugar, molesta aca
 */
export const broadcastDolarValue = async (hour = 10) => {
	const allUsers = await getAllUsers()
	const dolarValue = await getDolarValue()
	allUsers.map((user) => {
		if (user.dolar) sendMessageToUser(user.id, `Dolar: $${dolarValue}`)
	})
}

const globalInterval = setInterval(() => {
	const now = new Date()
	const h = now.getHours()
	const m = now.getMinutes()

	// broadcast a las 10
	if (h === 10 && m === 0) {
		broadcastDolarValue()
	}
}, 60 * 1000 /* 1 minuto */)

export async function startBot(): Promise<BotStatus> {
	/** Emitir la nueva version a todos los chats */
	// broadcastMessage('Iniciado con version ' + version)

	/** Escuchar texto especifico */
	// bot.hears()

	bot.start(start)
	bot.help(commands.help)
	bot.settings(commands.settings)

	for (const command of commands.list) {
		bot.command(command.name, command.procedure)
	}

	/** BROADCAST */
	bot.command('broadcast', commands.allSteps['broadcast'][0])

	/** APAGADO DE EMERGENCIA */
	bot.command('purge', (ctx) => {
		if (ctx.chat.id === ADMIN) {
			process.exit()
		}
	})

	/** Enviar lista de usuarios */
	bot.command('users', (ctx) => {
		if (ctx.chat.id === ADMIN) {
			getAllUsers()
				.then((users) => users.reduce((acc, curr) => acc + `${curr.id} ${curr.name}\n`, ''))
				.then((users) => ctx.reply(users))
		}
	})

	// bot.on('callback_query', commands.callbackMaster)
	bot.on('text', commands.textReceiver)
	bot.on('sticker', (ctx) => ctx.reply('No me envies stickers no los entiendo'))

	/**
	 * Agrega los comandos a un menu facil de usar.
	 * El comando tiene que empezar con una `/`, tiene
	 * que existir y tiene que declararse de antemano.
	 */
	bot.telegram.setMyCommands(
		commands.list.map((command) => ({
			command: command.invocator,
			description: command.description,
		}))
	)

	logger.info('Starting bot')

	// Enable graceful stop
	process.once('SIGINT', () => bot.stop('SIGINT'))
	process.once('SIGTERM', () => bot.stop('SIGTERM'))

	botStatus = 'online'

	bot.launch().catch((reason) => {
		if (reason.response?.error_code === 409) {
			logger.error('Another instance took control')
		} else {
			logger.error(`[launch] ${reason}`)
		}

		logger.info('Gracefully stoping...')
		botStatus = 'offline'
	})
	return botStatus
}

export async function stopBot() {
	botStatus = 'offline'
	logger.info('Stopping bot')
	try {
		bot.stop()
		clearInterval(globalInterval)
	} catch (error) {
		logger.error('Error stopping bot')
	}
	return botStatus
}

/** @returns "online" | "offline" {@link BotStatus} */
export function getBotStatus() {
	return botStatus
}

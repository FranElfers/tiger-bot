import { Telegraf, Context, Markup, NarrowedContext } from 'telegraf'
import { CallbackQuery, Update } from 'typegram'
import { getExpenses, getIncome } from './database/database'
import fb from './database/firebase'
import { logger } from './logger'
import { Operator } from './operator'
import { CommandsStepsList, CommandType, ContextParameter, SimpleOperation } from './commands.types'
import { incomeSteps } from './commands/income'
import { paymentSteps } from './commands/payment'
import { feedbackSteps } from './commands/feedback'
import { broadcastMessage } from './botControl'
import { ADMIN, EndReason } from './enum'
import { dolarSteps } from './commands/dolar'

export const help = (ctx: ContextParameter) => {
	return ctx.reply('Nada de ayuda por ahora')
}

export const settings = (ctx: ContextParameter) => {
	return ctx.reply('Ninguna configuracion por ahora')
}

export const callbackMaster = async (ctx: NarrowedContext<Context<Update>, Update.CallbackQueryUpdate<CallbackQuery>>) => {
	return
	/** TODO: CALLBACK */
	// const { data } = (await ctx.callbackQuery) as {data:string}

	// /** Recibe una categoria */
	// if (data !== 'guardar') {
	//     increaseStep()
	//     setCategory(data)
	//     return ctx.reply('Ingresa el monto', Markup.forceReply())
	// }

	// /** Guardar en base de datos */
	// if (data === 'guardar') {
	//     const buildTransaction = getTransaction()
	// 	closeOperation()
	//     addTransaction(buildTransaction).then(() => {
	//         return ctx.reply('💸')
	//     }).catch((reason) => {
	//         console.log('Failed uploading', reason)
	//         return ctx.reply('Hubo un error guardando tu operacion')
	//     })

	// }
}

export const textReceiver = async (ctx: ContextParameter) => {
	if (Operator.buffer[ctx.chat.id]?.isActive) Operator.executeNextStep(ctx)
	return
}

export const gastos = async (ctx: ContextParameter) => {
	const username = ctx.chat.id.toString()
	const expenses = await getExpenses(username)
	const income = await getIncome(username)

	const textBody = `Gastos
Ultimos 7 dias: $${expenses.lastWeek}
Ultimos 30 dias: $${expenses.lastMonth}
Ultimos 365 dias: $${expenses.lastYear}

Ingresos
Ultimos 7 dias: $${income.lastWeek}
Ultimos 30 dias: $${income.lastMonth}
Ultimos 365 dias: $${income.lastYear}

Fondos: $${income.total - expenses.total}`

	await ctx.reply(textBody)
}

// const eliminar = async (ctx:ContextParameter) => {
//     ctx.sendChatAction('typing')
//     const paymentsList = await fb.getCollection<Transaction>('pago')
//     const incomeList = await fb.getCollection<Transaction>('ingreso')
//     const ops = [...paymentsList, ...incomeList].sort((a,b) => a.date - b.date)

//     /** Si las transacciones son menos de 2, telegram no puede enviar un Poll con una sola opcion. */
//     if (ops.length < 2) return ctx.reply(`${ops[0].date} ${ops[0].type} $${ops[0].amount}`)

//     ctx.sendPoll('Transacciones', ops.map((op) => `${op.date} ${op.type} $${op.amount}`), Markup.inlineKeyboard([[{
//         text: 'Cancelar',
//         callback_data: 'cancelar'
//     }]]))
// }

const broadcastSteps: SimpleOperation[] = [
	async function (ctx) {
		if (ctx.chat.id !== ADMIN) return
		Operator.executeStart(ctx, 'broadcast')

		ctx.reply('Mensaje para broadcastear a todos los usuarios:')
	},
	async function (ctx) {
		const message = `🔞 Transmision del 🅰dmin a todos los usuarios 🔞\n${ctx.message.text}`
		broadcastMessage(message)
		Operator.executeEnd(ctx, EndReason.OK)
	},
]

export const allSteps: CommandsStepsList = {
	payment: paymentSteps,
	feedback: feedbackSteps,
	income: incomeSteps,
	broadcast: broadcastSteps,
	dolar: dolarSteps,
	subscribe: [async (ctx) => {}],
}

/**
 * Lista completa de comandos en la interfaz del chat de telegram.
 * El atributo `invocator` siempre tiene que empezar con una `/`.
 */
const completeList: CommandType[] = [
	{
		name: 'gastos',
		invocator: '/gastos',
		procedure: gastos,
		description: 'Anotar un pago',
		available: false,
	},
	{
		name: 'pago',
		invocator: '/pago',
		procedure: allSteps['payment'][0],
		description: 'Ver gastos',
		available: false,
	},
	{
		name: 'ingreso',
		invocator: '/ingreso',
		procedure: allSteps['income'][0],
		description: 'Anotar un ingreso',
		available: false,
	},
	{
		name: 'eliminar',
		invocator: '/eliminar',
		procedure: () => {},
		description: 'Eliminar una transaccion',
		available: false,
	},
	{
		name: 'feedback',
		invocator: '/feedback',
		procedure: allSteps['feedback'][0],
		description: 'Enviar comentarios al desarrollador',
		available: true,
	},
	{
		name: 'dolar',
		invocator: '/dolar',
		procedure: allSteps['dolar'][0],
		description: 'Suscribirse al valor del dolar blue 10:00am',
		available: true,
	},
]

/**
 * Lista de comandos disponibles en la interfaz del chat de telegram.
 */
export const list: CommandType[] = completeList.filter((command) => command.available)

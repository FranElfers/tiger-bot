import { Telegraf, Context, Markup, NarrowedContext } from 'telegraf'
import { CallbackQuery, Message, Update } from 'typegram'
import { addNewAnonFeedback, addNewUser, addTransaction, getExpenses, getIncome } from './database/database';
import { Transaction } from './enum';
import fb from './database/firebase'
import { logger } from './logger';
import { closeOperation, getTransaction, increaseStep, Operator, setCategory } from './operation';
import { CommandsStepsList, CommandType, ContextParameter, SimpleOperation } from './commands.types';
import { incomeSteps } from './commands/income';
import { paymentSteps } from './commands/payment';


export const help = (ctx:ContextParameter) => {
	return ctx.reply('Nada de ayuda por ahora')
}

export const settings = (ctx:ContextParameter) => {
	return ctx.reply('Ninguna configuracion por ahora')
}

export const callbackMaster = async (ctx:NarrowedContext<Context<Update>, Update.CallbackQueryUpdate<CallbackQuery>>) => {
    return
    /** TODO: CALLBACK */
    const { data } = (await ctx.callbackQuery) as {data:string}

	/** Recibe una categoria */
    if (data !== 'guardar') {
        increaseStep()
        setCategory(data)
        return ctx.reply('Ingresa el monto', Markup.forceReply())
    }
    
    /** Guardar en base de datos */
    if (data === 'guardar') {
        const buildTransaction = getTransaction()
		closeOperation()
        addTransaction(buildTransaction).then(() => {
            return ctx.reply('💸')
        }).catch((reason) => {
            console.log('Failed uploading', reason)
            return ctx.reply('Hubo un error guardando tu operacion')
        })

    }
}

export const textReceiver = async (ctx:ContextParameter) => {
    Operator.nextStep(ctx)
    return
}

export const gastos = async (ctx:ContextParameter) => {
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

const eliminar = async (ctx:ContextParameter) => {
    ctx.sendChatAction('typing')
    const paymentsList = await fb.getCollection<Transaction>('pago')
    const incomeList = await fb.getCollection<Transaction>('ingreso')
    const ops = [...paymentsList, ...incomeList].sort((a,b) => a.date - b.date)

    /** Si las transacciones son menos de 2, telegram no puede enviar un Poll con una sola opcion. */
    if (ops.length < 2) return ctx.reply(`${ops[0].date} ${ops[0].type} $${ops[0].amount}`)

    ctx.sendPoll('Transacciones', ops.map((op) => `${op.date} ${op.type} $${op.amount}`), Markup.inlineKeyboard([[{
        text: 'Cancelar',
        callback_data: 'cancelar'
    }]]))
}


/** Pasos de /feedback */
const feedbackSteps:SimpleOperation[] = [
	async function(ctx) {
		Operator.start(ctx, 'feedback')
		ctx.reply('Escribi tus comentarios en un solo mensaje:')
		// addNewAnonFeedback(ctx.chat.id.toString(), ctx.message.text)
	},
	async function(ctx) {
		const feedbackText = ctx.message.text
		logger.info(`[feedback] ${feedbackText}`)
		await ctx.reply('Tu mensaje:')
		await ctx.reply(feedbackText)
		await ctx.reply('Subiendo feedback')
		Operator.end(ctx)
	}
]

export const allSteps:CommandsStepsList = {
	null: [(ctx) => {
		Operator.end(ctx)
	}],
	payment: paymentSteps,
	feedback: feedbackSteps,
    income: incomeSteps,
	broadcast: [(ctx) => {}],
	subscribe: [(ctx) => {}],
}

/**
 * Lista de comandos visualizados en la interfaz del chat de telegram. 
 * El atributo `invocator` siempre tiene que empezar con una `/`.
 */
export const list:CommandType[] = [
    {
        name: 'gastos',
        invocator: '/gastos',
        procedure: gastos,
        description: 'Anotar un pago'
    },
    {
        name: 'pago',
        invocator: '/pago',
        procedure: allSteps['payment'][0],
        description: 'Ver gastos'
    },
    {
        name: 'ingreso',
        invocator: '/ingreso',
        procedure: allSteps['income'][0],
        description: 'Anotar un ingreso'
    },
    {
        name: 'eliminar',
        invocator: '/eliminar',
        procedure: eliminar,
        description: 'Eliminar una transaccion'
    },
    {
        name: 'feedback',
        invocator: '/feedback',
        procedure: allSteps['feedback'][0],
        description: 'Enviar comentarios al desarrollador'
    }
]
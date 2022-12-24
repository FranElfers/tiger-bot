import { Telegraf, Context, Markup, NarrowedContext } from 'telegraf'
import { CallbackQuery, Message, Update } from 'typegram'
import { addNewUser, addTransaction, getExpenses, getIncome } from './database';
import { ErrorCode, MINUTE, OperationType } from './enum';
import { getAmount, getTransaction, getType, increaseStep, isCurrentStep, newOperation, resetStep, setAmount, setCategory } from './operation';

type ContextParameter = NarrowedContext<Context<Update>, {
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
}>

const start = async (ctx:ContextParameter) => {
    const newUsername = ctx.chat.id

    addNewUser(newUsername.toString()).then((res) => {
        ctx.reply('Nuevo usuario registrado: ' + newUsername)
    }).catch((err) => {
        ctx.reply(err === ErrorCode.Exists ? 'Ya estas registrado':'Error desconocido')
    })
    

    setInterval(() => {
        const date = new Date()
        const hours = date.getHours()
        const minute = date.getMinutes()
        if (hours === 12 && minute === 0) ctx.reply('Ayer gastaste...')
    }, MINUTE)
}

const help = (ctx:ContextParameter) => {
	return ctx.reply('Nada de ayuda por ahora')
}

const settings = (ctx:ContextParameter) => {
	return ctx.reply('Ninguna configuracion por ahora')
}

const callbackMaster = async (ctx:NarrowedContext<Context<Update>, Update.CallbackQueryUpdate<CallbackQuery>>) => {
    const { data } = (await ctx.callbackQuery) as {data:string}

    if (data === 'fulano') {
        increaseStep()
        setCategory('fulano')
        return ctx.reply('Que monto pagaste?', Markup.forceReply())
    }
    
    /** Guardar en base de datos */
    if (data === 'guardar') {
        const buildTransaction = getTransaction()

        addTransaction(buildTransaction).then(() => {
            return ctx.reply('💸')
        }).catch((reason) => {
            console.log('Failed uploading', reason)
            return ctx.reply('Hubo un error guardando tu operacion')
        })

    }
}

const textReceiver = (ctx:ContextParameter) => {
	if (getType() === OperationType.Payment) return paymentSteps(ctx)
	if (getType() === OperationType.Income) return incomeSteps(ctx)
}
	
const paymentSteps = (ctx:ContextParameter) => {
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
}

const incomeSteps = (ctx:ContextParameter) => {
    const { text } = ctx.message

	/** Obtener monto del pago */
	if (isCurrentStep(0)) {
		resetStep()
		const amount = parseInt(text) || 0
		setAmount(amount)
		return ctx.reply(`Recibiste ${getAmount()} ✔`, Markup.inlineKeyboard([[{
			text: 'Guardar',
			callback_data: 'guardar'
		}]]))
	}
}

const gastos = async (ctx:ContextParameter) => {
	const username = ctx.chat.id.toString()
	const expenses = await getExpenses(username)
	const income = await getExpenses(username)
		
	const textBody = `Gastos
Ultimos 7 dias: $${expenses.lastWeek}
Ultimos 30 dias: $${expenses.lastMonth}
Ultimos 365 dias: $${expenses.lastYear}

Ingresos
Ultimos 7 dias: $${income.lastWeek}
Ultimos 30 dias: $${income.lastMonth}
Ultimos 365 dias: $${income.lastYear}

Fondos: $${expenses.total + income.total}`

	await ctx.reply(textBody)
}

const pago = (ctx:ContextParameter) => {
    newOperation(OperationType.Payment)

    const fran = {
        text: 'Fulano',
        callback_data: 'fulano'
    }

    ctx.reply('Elegir la categoria del pago', Markup.inlineKeyboard([[fran,fran,fran]]))
}

const ingreso = (ctx:ContextParameter) => {
	newOperation(OperationType.Income)

    ctx.reply('Que monto recibiste?', Markup.forceReply())
}

export default {
	start,
	help,
	settings,
	callbackMaster,
	textReceiver,
	gastos,
	pago,
	ingreso
}
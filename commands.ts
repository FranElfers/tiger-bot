import { Telegraf, Context, Markup, NarrowedContext } from 'telegraf'
import { CallbackQuery, Message, Update } from 'typegram'
import { incomeSteps, ingreso } from './commands/income';
import { paymentSteps, pago } from './commands/payment';
import { addNewUser, addTransaction, getExpenses, getIncome } from './database';
import { ErrorCode, MINUTE, OperationType, Transaction } from './enum';
import fb from './firebase'
import { closeOperation, getAmount, getTransaction, getType, increaseStep, isCurrentStep, newOperation, resetStep, setAmount, setCategory, setOrigin, setTarget, startTimer } from './operation';

export type ContextParameter = NarrowedContext<Context<Update>, {
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
            return ctx.reply('????')
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

const gastos = async (ctx:ContextParameter) => {
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

export default {
	start,
	help,
	settings,
	callbackMaster,
	textReceiver,
	gastos,
	pago,
	ingreso,
    eliminar
}
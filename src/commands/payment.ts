import { Markup } from 'telegraf'
import { ContextParameter, SimpleOperation } from '../commands.types'
import { logger } from '../logger'
import { Operator } from '../operator'
import fb from '../database/firebase'
import { EndReason } from '../enum'

/** Pasos de /payment */
export const paymentSteps: SimpleOperation[] = [
	async function (ctx) {
		Operator.executeStart(ctx, 'payment')
		// const username = ctx.chat.id.toString()
		// newOperation(OperationType.Payment, username)

		// ctx.reply('Elegir la categoria del pago', Markup.inlineKeyboard(listaCategorias))
		// TODO: acordarse de generalizar el listado de categorias
		ctx.reply('Enviar pago con formato "<monto> <description>"')
	},
	async function (ctx) {
		const parts = ctx.message.text.split(' ')

		if (parts.length < 2) {
			logger.error('Incomplete command')
			ctx.reply('Comando incompleto')
			Operator.executeEnd(ctx)
			return
		}

		if (parts[0].match(/[^a-z]/g)?.length) {
			// si la primera parte no tiene letras

			if (parts[1].match(/[a-z]/g)?.length) {
				// si la segunda parte tiene letras

				// si tiene un - no lo cuenta
				if (parts[0].includes('-')) {
					logger.error('"-" detected')
					Operator.executeEnd(ctx)
					return ctx.reply('No se admitem "-"')
				}

				// si numero contiene un + es un ingreso
				const esIngreso = parts[0].includes('+')
				const parseado = parseFloat(parts[0])
				const amount = esIngreso ? parseado : parseado * -1
				try {
					await fb.upload('gasto', {
						monto: amount,
						nombre: parts.slice(1, parts.length).join(' '), // array menos el primer elemento
					})
				} catch (err) {
					logger.error('Firebase push error')
					Operator.executeEnd(ctx, EndReason.OK)
					return ctx.reply('Hubo un error')
				}
				const gastos = await fb.getCollection<{ monto: number; nombre: string }>('gasto')
				const suma = gastos.reduce((acc, curr) => acc + curr.monto, 0)
				logger.info(`${ctx.message.text}: OK`)
				Operator.executeEnd(ctx)
				return ctx.reply(`$${amount} OK. Fondos: $${suma.toFixed(2)}`)
			}
		}
		logger.error('Invalid')
		Operator.executeEnd(ctx)
		return ctx.reply('Invalido')
	},
]

export const categorias = [
	['comida', 'regalo', 'ocio'],
	['compras', 'personal', 'otro'],
]

// export const listaCategorias = categorias.map((fila) => {
// 	return fila.map((cat) => ({
// 		text: capitalize(cat),
// 		callback_data: cat
// 	}))
// })

// export const pago = (ctx:ContextParameter) => {
// 	const username = ctx.chat.id.toString()
//     newOperation(OperationType.Payment, username)

//     ctx.reply('Elegir la categoria del pago', Markup.inlineKeyboard(listaCategorias))
// }

// export const paymentSteps = (ctx:ContextParameter) => {
//     const { text } = ctx.message

// 	/** Obtener monto del pago */
// 	if (isCurrentStep(1)) {
// 		increaseStep()
// 		const amount = parseInt(text) || 0
// 		setAmount(amount)

// 		return ctx.reply('Destino?', Markup.forceReply())
// 	}

// 	/** Obtener destinatario del pago */
// 	if (isCurrentStep(2)) {
// 		setTarget(text)
// 		return ctx.reply(`Pagaste ${getAmount()} a ${text} ✔`, Markup.inlineKeyboard([[{
// 			text: 'Guardar',
// 			callback_data: 'guardar'
// 		}]])).then(() => {
// 			startTimer(() => ctx.reply('Tiempo caducado'))
// 		})
// 	}
// }

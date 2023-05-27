import { SimpleOperation } from '../commands.types'
import { Operator } from '../operator'
import { EndReason } from '../enum'
import { toggleDolarSubscriptionOfUser } from '../database/database'
import { logger } from '../logger'

/** Pasos de /dolar */
export const dolarSteps: SimpleOperation[] = [
	async function (ctx) {
		Operator.executeStart(ctx, 'dolar')
		const subscribed = await toggleDolarSubscriptionOfUser(ctx.chat.id)

		logger.info('[debug] Subscribed to dolar: ' + subscribed)
		if (subscribed) {
			ctx.reply('Estas suscrito al valor del dolar, manda el comando de nuevo para cancelar la suscripcion')
		} else {
			ctx.reply('Te desuscribiste al valor del dolar, manda el comando de nuevo para suscribirte')
		}

		Operator.executeEnd(ctx, EndReason.OK)
	},
]

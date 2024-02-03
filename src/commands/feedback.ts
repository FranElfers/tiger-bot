import { sendMessageToUser } from '../botControl'
import { SimpleOperation } from '../commands.types'
import { addNewAnonFeedback } from '../database/database'
import { ADMIN, EndReason } from '../enum'
import { logger } from '../logger'
import { Operator } from '../operator'
import { getUserInfo } from '../utils/handlers'

/** Pasos de /feedback */
export const feedbackSteps: SimpleOperation[] = [
	async function (ctx) {
		Operator.executeStart(ctx, 'feedback')
		ctx.reply('Escribi tus comentarios en un solo mensaje:')
	},
	async function (ctx) {
		const feedbackText = ctx.message.text
		const userInfo = getUserInfo(ctx)
		const adminReceipt = `👤: ${userInfo.name}\n📝: ${feedbackText}`

		logger.info(`[feedback] ${feedbackText}`)
		await ctx.reply('Subiendo feedback')
		await addNewAnonFeedback(userInfo.id, feedbackText)
		sendMessageToUser(ADMIN, adminReceipt)
		Operator.executeEnd(ctx, EndReason.OK)
	},
]

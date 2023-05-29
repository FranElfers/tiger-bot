import { allSteps } from './commands'
import { EndReason, TIMEOUT } from './enum'
import { logger } from './logger'
import { ContextParameter, OperationName } from './commands.types'

let timeout: NodeJS.Timeout

export const startTimer = (cb: () => unknown) => {
	timeout = setTimeout(() => {
		cb()
	}, TIMEOUT)
}

/**
 * Instancia de operacion temporal. Se crea al iniciar los pasos de cualquier comando.
 *
 * Se hace escencialmente para individualizar las operaciones entre usuarios.
 */
export class Operation {
	userId: number
	operation: OperationName
	step: number
	isActive: boolean
	totalSteps: number
	constructor(userId: number, operation: OperationName) {
		this.userId = userId
		this.operation = operation
		this.isActive = true
		this.step = 0
		this.totalSteps = allSteps[operation].length
		logger.info(`[operation:${this.userId}] Starting new ${this.operation}`)
		// deberia empezar un timeout por aca
	}

	async nextStep(ctx: ContextParameter) {
		this.step++
		const selectedCommand = allSteps[this.operation]
		const currentCommand = selectedCommand[this.step]

		logger.info(`[operation:${this.userId}] ${this.operation} step: ${this.step}`)
		currentCommand(ctx)
	}

	end(ctx: ContextParameter, reason?: string) {
		logger.info(`[operation:${this.userId}] Closing ${this.operation}`)
		this.isActive = false
		if (reason !== EndReason.OK) ctx.reply(`Terminando operacion. Razon: ${reason || 'desconocida'}`)
	}
}

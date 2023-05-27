import { ContextParameter, OperatorStruct } from './commands.types'
import { logger } from './logger'
import { Operation } from './operation'
import { getUserInfo } from './utils/handlers'

/** Comando para facilitar el log del operator */
const operatorLogger = (step: string, data: object) => {
	return logger.info(`[operator:${step}] ${JSON.stringify(data)}`)
}

/**
 * Operador de comandos
 * @step 0: Comando sin empezar
 * @step 1: Comando seteado, esperando mensaje
 * @step 2...: Flujo normal
 */
export const Operator: OperatorStruct = {
	/**
	 * Lista para mantener las operaciones actualmente vigentes.
	 * Mantiene guardada una operacion por usuario.
	 */
	buffer: {},
	executeStart(ctx, command) {
		const user = getUserInfo(ctx)
		operatorLogger('start', { command, user })

		// Si el usuario estaba en medio de una operacion, la termina a la fuerza y empieza una nueva
		if (this.buffer[user.id]?.isActive) this.buffer[user.id].end(ctx, 'iniciando una nueva')

		this.buffer[user.id] = new Operation(user.id, command)
	},
	async executeNextStep(ctx) {
		const user = getUserInfo(ctx)
		operatorLogger('nextStep', { user })
		this.buffer[user.id].nextStep(ctx)
	},
	executeEnd(ctx, reason) {
		const user = getUserInfo(ctx)
		operatorLogger('end', { buffer: this.buffer, user, reason })
		this.buffer[user.id].end(ctx, reason)
	},
}

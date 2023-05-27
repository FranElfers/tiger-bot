import { Context, NarrowedContext } from 'telegraf'
import { Message, Update } from 'typegram'
import { EndReason } from './enum'
import { Operation } from './operation'

export type ContextParameter = NarrowedContext<
	Context<Update>,
	{
		message: Update.New & Update.NonChannel & Message.TextMessage
		update_id: number
	}
>

export type CommandsStepsList = {
	[key in OperationName]: SimpleOperation[]
}

export type CommandType = {
	name: string
	invocator: string
	description: string
	available: boolean
	procedure: (ctx: ContextParameter) => any
}

/** Tipos de operaciones */
export type OperationName = 'payment' | 'feedback' | 'subscribe' | 'broadcast' | 'income' | 'dolar'
export type SimpleOperation = (ctx: ContextParameter) => Promise<unknown>

export type OperatorStruct = {
	buffer: {
		[key in string]: Operation
	}
	executeStart: (ctx: ContextParameter, command: OperationName) => void
	executeNextStep: SimpleOperation
	executeEnd: (ctx: ContextParameter, reason?: EndReason) => void
}

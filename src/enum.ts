export enum OperationType {
	Payment = 'pago',
	Debt = 'deuda',
	Owe = 'debo',
	Plan = 'plan',
	Income = 'ingreso',
}

export interface Transaction {
	type: OperationType
	amount: number
	category: string
	from: string
	to: string
	resolved: boolean
	date: number
}
export enum Collections {
	Users = 'usuarios',
	Payments = 'pagos',
}

export interface User {
	id: number
	name: string
	dateCreated: string
	dolar: boolean
}

export enum ErrorCode {
	Exists,
}

export enum EndReason {
	OK = 'Ok',
}

export type BotStatus = 'online' | 'offline'

export const ADMIN = 1174794170

export const TIMEOUT = 15000

/** TIME IN MILISECONDS */
export const MINUTE = 60_000
export const HOUR = 3_600_000 // MINUTE * 60
export const DAY = 86_400_000 // HOUR * 24
export const WEEK = 604_800_000 // DAY * 7
export const MONTH = 2_592_000_000 // DAY * 30
export const YEAR = 220_752_000_000 // DAY * 365

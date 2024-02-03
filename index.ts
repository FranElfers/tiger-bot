import { getBotStatus, startBot, stopBot } from './src/botControl'
import express from 'express'
import { readFile } from 'fs'
import { logger } from './src/logger'
import fb from './src/database/firebase'

const app = express()

if (process.env.ENVIRONMENT === 'development') startBot()

app.get('/', (req, res) => {
	// procesar un SSR para mostar la pagina
	res.contentType('html')
	readFile('./public/index.html', (err, data) => {
		if (err) throw err
		res.send(data)
	})
})

app.get('/status', (req, res) => {
	const status = getBotStatus()
	res.send({ status })
})

// startBot()
app.get('/start', (req, res) => {
	if (getBotStatus() === 'online') return res.send({ status: getBotStatus() })
	startBot().then((status) => {
		res.send({ status })
	})
})

app.get('/stop', (req, res) => {
	stopBot().then((status) => {
		res.send({ status })
	})
})

app.get('/last-feedback', (req, res) => {
	fb.getCollection('feedback').then((feedbackArray) => {
		res.send(feedbackArray)
	})
})

app
	.listen(process.env.PORT, () => {
		logger.info(`[express] listening on ${process.env.PORT}`)
	})
	.on('error', (err) => {
		logger.error(`[express] ${err.message}`)
	})

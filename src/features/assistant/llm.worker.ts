/// <reference lib="webworker" />
// Trabajador que ejecuta el modelo de lenguaje fuera del hilo principal (la interfaz no se bloquea).
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (message: MessageEvent) => handler.onmessage(message)

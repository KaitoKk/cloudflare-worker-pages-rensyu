/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/*
export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		return new Response("Hello World!");
	},
};
*/

export interface Env {
	images: R2Bucket
}

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors(), etag())

app.post('/upload', async (context) => {
	const formData = await context.req.formData()
	const file = formData.get("image") as File

	const ext = file.name.split('.').pop()
	const id = Date.now().toString() + '.' + ext

	await context.env.images.put(id, await file.arrayBuffer())

	return context.json({ message: 'ok', id }, 200)
})

app.get('/:id', async (context) => {
	const id = context.req.param('id')
	const body = await context.env.images.get(id)

	if (!body) return context.json({ error: 'not found' }, 404)

	return context.body(body.body, 200)
})

app.delete('/:id', async (context) => {
	const id = context.req.param('id')
	const body = await context.env.images.get(id)

	if (!body) return context.json({ error: 'not found' }, 404)

	await context.env.images.delete(id)
	return context.json({ message: 'ok' }, 200)
})

export default app
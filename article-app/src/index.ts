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
	article: KVNamespace,
	MAP_API_KEY: string
}

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'

export type Post = {
	datetime: number,
	text: string,
	lat?: string,
	lon?: string,
	location?: string,
	images?: string[]
}

export type Param = {
	text: string,
	lat?: string,
	lon?: string,
	location?: string,
	images?: string[],
}

const app = new Hono<{ Bindings: Env}>()
app.use('*', cors(), etag())

app.get('/', async (context) => {
	const keys = await context.env.article.list()

	return context.json({ message: 'ok', data: keys.keys }, 200)
})

app.post('/posts', async (context) => {
	console.log(await context.req.json() as Param)

	const param = await context.req.json() as Param

	if (!(param && param.text)) return context.json({ error: 'invalid request' }, 400)

	const datetime = Math.floor(Date.now() / 1000)

	const post: Post = {
		datetime,
		text: param.text,
		lat: param.lat,
		lon: param.lon,
		location: param.location,
		images: param.images
	}

	await context.env.article.put(datetime.toString(), JSON.stringify(post))

	return context.json({ message: 'ok', id: datetime }, 200)
})

app.get('/posts/:id', async (context) => {
	const id = context.req.param('id')

	const post = await context.env.article.get(id)
	if (!post) return context.json({ error: 'not found'}, 404)

	return context.json({ message: 'ok', data: JSON.parse(post) as Post }, 200)
})

app.delete('/posts/:id', async (context) => {
	const id = await context.req.param('id')
	const post = await context.env.article.get(id)
	if (!post) return context.json({ error: 'not found' }, 404)

	await context.env.article.delete(id)
	return context.json({ message: 'ok' }, 200)
})

app.get('/nearby/:lat/:lon', async (context) => {
	const lat = context.req.param('lat')
	const lon = context.req.param('lon')

	if (!(lat && lon)) return context.json({ error: 'invalid request'}, 400)

	type places = {
		results: {
			name: string
		}[]
	}

	const result = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=1500&key=${context.env.MAP_API_KEY}&language=ja`)

	const result_json = await result.json<places>()
	const locations = result_json.results.map(n => n.name)

	return context.json({ message: 'ok', locations }, 200)
})

export default app
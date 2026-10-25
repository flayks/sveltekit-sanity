import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { createSanity, toPerspective } from '../src/server.ts'

const token = 'secret-token'
const { handle } = createSanity({ projectId: 'abc', dataset: 'production', studioUrl: 'https://studio.test', token })
const previewCookie = createHash('sha256').update(token).digest('hex')

/** Run the hook on a fake request, with an optional preview cookie */
const run = async (path: string, { preview = false, method = 'GET' } = {}) => {
    const jar: Record<string, string> = preview ? { __sanity_preview: previewCookie } : {}
    const event = {
        url: new URL(`https://site.test${path}`),
        request: new Request(`https://site.test${path}`, method === 'POST' ? { method, body: '"published"' } : {}),
        cookies: {
            get: (name: string) => jar[name],
            set: (name: string, value: string) => (jar[name] = value),
            delete: (name: string) => delete jar[name]
        },
        locals: {} as App.Locals
    }
    const response = await handle({ event, resolve: async () => new Response('ok') } as never)
    return { response, locals: event.locals, jar }
}

test('createSanity needs a token', () => {
    assert.throws(() => createSanity({ projectId: 'abc', dataset: 'production', studioUrl: 'https://studio.test', token: '' }))
})

test('visitors get published content and no editing config', async () => {
    const { response, locals } = await run('/')
    assert.equal(locals.preview, false)
    assert.equal(locals.visualEditing, null)
    assert.equal(response.headers.get('cache-control'), null)
})

test('preview gets drafts and is never cached', async () => {
    const { response, locals } = await run('/', { preview: true })
    assert.equal(locals.preview, true)
    assert.equal(locals.visualEditing?.perspective, 'drafts')
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
})

test('disable only redirects to same-site paths', async () => {
    await assert.rejects(run('/preview/disable?redirect=/work'), { status: 307, location: '/work' })
    await assert.rejects(run('/preview/disable?redirect=https://evil.test'), { status: 307, location: '/' })
    await assert.rejects(run('/preview/disable?redirect=//evil.test'), { status: 307, location: '/' })
})

test('perspective switch needs preview', async () => {
    await assert.rejects(run('/preview/enable', { method: 'POST' }), { status: 401 })

    const { response, jar } = await run('/preview/enable', { method: 'POST', preview: true })
    assert.equal(response.status, 204)
    assert.equal(jar['sanity-preview-perspective'], 'published')
})

test('perspective cookie is checked', () => {
    assert.equal(toPerspective('published'), 'published')
    assert.deepEqual(toPerspective('rSummer,drafts'), ['rSummer', 'drafts'])
    assert.equal(toPerspective(undefined), 'drafts')
    assert.equal(toPerspective('raw'), 'drafts')
    assert.equal(toPerspective('nonsense'), 'drafts')
})

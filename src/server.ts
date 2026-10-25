import { error, redirect } from '@sveltejs/kit'
import type { Handle } from '@sveltejs/kit/hooks'
import { createClient, type ClientPerspective } from '@sanity/client'
import { validatePreviewUrl } from '@sanity/preview-url-secret'
import { perspectiveCookieName } from '@sanity/preview-url-secret/constants'

export type SanityConfig = {
    projectId: string
    dataset: string
    apiVersion?: string
    studioUrl: string
    /** Viewer token, stays on the server */
    token: string
    previewPaths?: { enable?: string; disable?: string }
}

const COOKIE = '__sanity_preview'

/** Perspective from the cookie, `drafts` when missing or unknown */
export const toPerspective = (value = ''): ClientPerspective => {
    // Releases come as a comma-separated stack, like `rSummer,drafts`
    const stack = value.split(',').filter(Boolean)
    if (stack.length > 1) return stack
    return value === 'published' ? 'published' : 'drafts'
}

/** Hex SHA-256, with Web Crypto to run on any adapter */
const hash = async (value: string) => {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}

/** Clients and the `handle` hook for one Sanity project */
export const createSanity = ({ projectId, dataset, apiVersion = '2025-12-06', studioUrl, token, previewPaths = {} }: SanityConfig) => {
    // Empty token would make a guessable preview cookie
    if (!token) throw new Error('createSanity: missing token')

    const { enable = '/preview/enable', disable = '/preview/disable' } = previewPaths
    const client = createClient({ projectId, dataset, apiVersion, token, useCdn: true, stega: { studioUrl } })
    const previewClient = client.withConfig({ useCdn: false, stega: true })

    // Same value in every server instance, unlike a random secret
    const secret = hash(token)

    const handle: Handle = async ({ event, resolve }) => {
        const { url, cookies, request } = event
        const value = await secret
        const preview = cookies.get(COOKIE) === value

        // Studio iframe is on another origin
        const https = url.protocol === 'https:'
        const cookieOptions = { path: '/', httpOnly: true, secure: https, sameSite: https ? 'none' : 'lax' } as const

        if (url.pathname === enable) {
            // Perspective switch from Presentation, JSON so cross-site posts need CORS
            if (request.method === 'POST') {
                if (!preview) error(401, 'Preview is off')
                cookies.set(perspectiveCookieName, String(await request.json()), cookieOptions)
                return new Response(null, { status: 204 })
            }

            const { isValid, redirectTo = '/', studioPreviewPerspective } = await validatePreviewUrl(client, url.toString())
            if (!isValid) error(401, 'Invalid secret')

            cookies.set(COOKIE, value, cookieOptions)
            if (studioPreviewPerspective) cookies.set(perspectiveCookieName, studioPreviewPerspective, cookieOptions)
            redirect(307, redirectTo)
        }

        if (url.pathname === disable) {
            cookies.delete(COOKIE, { path: '/' })
            cookies.delete(perspectiveCookieName, { path: '/' })
            // Same-site paths only
            const to = url.searchParams.get('redirect')
            redirect(307, to?.startsWith('/') && !to.startsWith('//') ? to : '/')
        }

        const perspective = preview ? toPerspective(cookies.get(perspectiveCookieName)) : undefined
        event.locals.preview = preview
        event.locals.sanity = perspective ? previewClient.withConfig({ perspective }) : client
        event.locals.visualEditing = perspective
            ? { projectId, dataset, apiVersion, studioUrl, enablePath: enable, disablePath: disable, perspective: String(perspective) }
            : null

        const response = await resolve(event)
        // Drafts must never land in a shared cache
        if (preview) response.headers.set('cache-control', 'private, no-store')
        return response
    }

    return { client, handle }
}

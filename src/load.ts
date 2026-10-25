import { getRequestEvent } from '$app/server'
import type { QueryParams } from '@sanity/client'

/** Fetch with the request client, keeping what live mode needs */
export const loadQuery = async <const Q extends string>(query: Q, params: QueryParams = {}) => {
    const { locals } = getRequestEvent()
    if (!locals.visualEditing) return { query, params, data: await locals.sanity.fetch(query, params) }

    // Source map gives `data-sanity` values for non-text fields
    const { result, resultSourceMap } = await locals.sanity.fetch(query, params, { filterResponse: false, resultSourceMap: 'withKeyArraySelector' })
    return { query, params, data: result, sourceMap: resultSourceMap, studioUrl: locals.visualEditing.studioUrl }
}

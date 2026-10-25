import { createSubscriber } from 'svelte/reactivity'
import { createQueryStore } from '@sanity/core-loader'
import { defineEncodeDataAttribute } from '@sanity/core-loader/encode-data-attribute'
import type { LoadedQuery } from './types.js'

const { createFetcherStore, enableLiveMode } = createQueryStore({ client: false, ssr: true })

export { enableLiveMode }

/** Load data, replaced by Presentation results while editing */
export const useQuery = <T>({ query, params, data, sourceMap, studioUrl }: LoadedQuery<T>) => {
    const store = createFetcherStore<T>(query, params, { data, sourceMap: sourceMap ?? undefined })
    // Subscribes only while read inside an effect or the template
    const subscribe = createSubscriber(update => store.listen(update))

    return {
        get data() {
            subscribe()
            return store.get().data
        },
        /** `data-sanity` value for a result path, undefined outside preview */
        get encode() {
            subscribe()
            const state = store.get()
            return defineEncodeDataAttribute(state.data, state.sourceMap, studioUrl)
        }
    }
}

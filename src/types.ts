import type { ContentSourceMap, QueryParams, SanityClient } from '@sanity/client'
import type { VisualEditingOptions } from '@sanity/visual-editing'

/** Public config sent to the browser in preview, never the token */
export type VisualEditingConfig = {
    projectId: string
    dataset: string
    apiVersion: string
    studioUrl: string
    enablePath: string
    disablePath: string
    perspective: string
}

/** Overlay options, history and refresh stay with the plugin */
export type OverlayOptions = Omit<VisualEditingOptions, 'history' | 'refresh' | 'onPerspectiveChange'>

/** Query result with what live mode needs to subscribe */
export type LoadedQuery<T> = {
    query: string
    params?: QueryParams
    data: T
    sourceMap?: ContentSourceMap | null
    studioUrl?: string
}

declare global {
    namespace App {
        interface Locals {
            /** Drafts with stega in preview, published from the CDN otherwise */
            sanity: SanityClient
            preview: boolean
            visualEditing: VisualEditingConfig | null
        }
    }
}

<script lang="ts">
    import { afterNavigate, goto, refreshAll } from '$app/navigation'
    import { onMount } from 'svelte'
    import { createClient } from '@sanity/client'
    import { isMaybePresentation } from '@sanity/presentation-comlink'
    import { enableVisualEditing, type HistoryAdapterNavigate } from '@sanity/visual-editing'
    import { enableLiveMode } from './live.js'
    import type { VisualEditingConfig } from './types.js'

    let { config }: { config: VisualEditingConfig } = $props()

    let navigate: HistoryAdapterNavigate | undefined
    let fromStudio = false

    onMount(() => {
        const { projectId, dataset, apiVersion, studioUrl, enablePath, disablePath } = config
        let current = config.perspective

        // Preview cookie outlives the Studio session
        if (!isMaybePresentation()) {
            location.replace(`${disablePath}?${new URLSearchParams({ redirect: location.pathname + location.search })}`)
            return
        }

        // Presentation results get stega from this client
        const disableLiveMode = enableLiveMode({
            client: createClient({ projectId, dataset, apiVersion, useCdn: false, stega: { enabled: true, studioUrl } })
        })

        const disableVisualEditing = enableVisualEditing({
            history: {
                subscribe: (_navigate) => {
                    navigate = _navigate
                    navigate({ type: 'replace', url: location.pathname + location.search })
                    return () => navigate = undefined
                },
                update: (update) => {
                    if (update.type === 'pop') return history.back()
                    fromStudio = true
                    goto(update.url, { replace: update.type === 'replace' })
                }
            },
            // Live mode already applies edits
            refresh: (payload) => payload.source === 'mutation' && payload.livePreviewEnabled ? false : refreshAll(),
            // Drafts or release picked in Presentation, for server loads
            onPerspectiveChange: async (perspective) => {
                // First report on connect matches the cookie
                if (String(perspective) === current) return
                current = String(perspective)
                await fetch(enablePath, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(perspective) })
                refreshAll()
            }
        })

        return () => {
            disableLiveMode()
            disableVisualEditing()
        }
    })

    // Sync site navigation to the Presentation URL bar
    afterNavigate(async ({ to, complete }) => {
        if (navigate && to && !fromStudio) {
            await complete
            navigate({ type: 'push', url: to.url.pathname + to.url.search })
        }
        fromStudio = false
    })
</script>

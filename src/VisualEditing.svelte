<script lang="ts">
    import { browser } from '$app/env'
    import type { OverlayOptions, VisualEditingConfig } from './types.js'

    let { config, options }: { config: VisualEditingConfig | null | undefined; options?: OverlayOptions } = $props()
</script>

{#if browser && config}
    {#await import('./Presentation.svelte') then { default: Presentation }}
        <Presentation {config} {options} />
    {/await}
{/if}

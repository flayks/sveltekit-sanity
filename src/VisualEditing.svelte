<script lang="ts">
    import { browser } from '$app/env'
    import type { VisualEditingConfig } from './types.js'

    let { config }: { config: VisualEditingConfig | null | undefined } = $props()
</script>

{#if browser && config}
    {#await import('./Presentation.svelte') then { default: Presentation }}
        <Presentation {config} />
    {/await}
{/if}

# @flayks/sveltekit-sanity

Sanity for SvelteKit: typed queries, draft preview and live visual editing.

Unofficial and not affiliated with Sanity. The official package is [`@sanity/sveltekit`](https://github.com/sanity-io/sanity-sveltekit).

- Preview mode for the Presentation tool, with drafts and click-to-edit overlays
- Live edits while you type in the Studio, no page reload
- Follows the perspective picked in Presentation: drafts, published or a Content Release
- Published content from the CDN for visitors, nothing extra shipped to them
- TypeGen types from your queries to your pages

## Install

```sh
npm install @flayks/sveltekit-sanity @sanity/client groq
```

`@sanity/client` and `groq` are your own dependencies, so TypeGen types and client updates stay in your hands.

## Setup

**1. Config** with your env vars, in a server-only file

```ts
// src/lib/server/sanity.ts
import { PUBLIC_SANITY_DATASET, PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_STUDIO_URL } from '$app/env/public'
import { SANITY_API_READ_TOKEN } from '$app/env/private'
import { createSanity } from '@flayks/sveltekit-sanity'

export const sanity = createSanity({
    projectId: PUBLIC_SANITY_PROJECT_ID,
    dataset: PUBLIC_SANITY_DATASET,
    studioUrl: PUBLIC_SANITY_STUDIO_URL,
    token: SANITY_API_READ_TOKEN // Viewer token, stays on the server
})
```

Optional: `apiVersion` (default `2025-12-06`) and `previewPaths` (default `/preview/enable` and `/preview/disable`).

**2. Hook**, which also serves the preview paths

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks'
import { sanity } from '$lib/server/sanity'

export const handle = sequence(sanity.handle /*, your other hooks */)
```

**3. Layout**

```ts
// src/routes/+layout.server.ts
import { defineQuery } from 'groq'
import { loadQuery } from '@flayks/sveltekit-sanity'

const settingsQuery = defineQuery(`*[_type == "settings"][0]{ title, footer }`)

export const load = async ({ locals }) => ({
    settings: await loadQuery(settingsQuery),
    visualEditing: locals.visualEditing
})
```

`src/routes/+layout.svelte`

```svelte
<script lang="ts">
    import { useQuery, VisualEditing } from '@flayks/sveltekit-sanity'

    let { data, children } = $props()
    const settings = $derived(useQuery(data.settings))
</script>

{@render children()}

<footer>{settings.data?.footer}</footer>

<VisualEditing config={data.visualEditing} />
```

`VisualEditing` renders nothing for visitors and loads only in preview.

**4. Studio**: point the Presentation tool to your site

```ts
// sanity.config.ts
presentationTool({
    previewUrl: {
        origin: 'https://my-site.com',
        previewMode: {
            enable: '/preview/enable',
            disable: '/preview/disable'
        }
    }
})
```

## Pages

```ts
// src/routes/[slug]/+page.server.ts
import { error } from '@sveltejs/kit'
import { defineQuery } from 'groq'
import { loadQuery } from '@flayks/sveltekit-sanity'

const pageQuery = defineQuery(`*[_type == "page" && slug.current == $slug][0]{
    title,
    sections[]{ _key, title, text, theme }
}`)

export const load = async ({ params }) => {
    const page = await loadQuery(pageQuery, { slug: params.slug })
    if (!page.data) error(404)

    return { page }
}
```

`src/routes/[slug]/+page.svelte`

```svelte
<script lang="ts">
    import { stegaClean } from '@sanity/client/stega'
    import { useQuery } from '@flayks/sveltekit-sanity'

    let { data: pageData } = $props()
    const query = $derived(useQuery(pageData.page))
    const data = $derived(query.data)
</script>

<h1>{data?.title}</h1>

{#each data?.sections ?? [] as section, index (section._key)}
    <section class="theme-{stegaClean(section.theme)}" data-sanity={query.encode(['sections', index])}>
        <h2>{section.title}</h2>
        <p>{section.text}</p>
    </section>
{/each}
```

- `defineQuery` lets TypeGen type `data`
- `data-sanity` on array items gives overlays and drag-and-drop reordering in Presentation, empty for visitors
- `stegaClean` strips the invisible editing markers before using a string for logic, like a class name

## License

MIT

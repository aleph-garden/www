# @aleph-garden/starlight-theme

The Aleph Garden theme for [Starlight](https://starlight.astro.build): the
design tokens and faces from `@aleph-garden/brand`, a site title with a
switcher over every project on aleph.garden, and the site footer. A project
keeps its own title, sidebar and content.

> Before 1.0. Any interface here can change in any release, including the
> ones marked `-dev` patches. Build against it to experiment, depend on an
> exact version, and expect to follow breaking changes by hand.

```js
import aleph from '@aleph-garden/starlight-theme'

starlight({ title: 'Vitrine', plugins: [aleph({ project: 'vitrine', prerelease: true })] })
```

`project` is the path segment the documentation lives under on aleph.garden
(`vitrine` for `/vitrine/docs/`). `prerelease` puts the notice above on every
page.

# Art portfolio

A small Astro portfolio with Sveltia CMS and GitHub Pages. Static pages, content and images in Git, no database or application backend.

- Site: https://karinkrutilova.github.io/portfolio/
- Editor: https://karinkrutilova.github.io/portfolio/admin/
- Deployment status: https://github.com/karinkrutilova/portfolio/actions

## Edit the portfolio

1. Create a [fine-grained GitHub personal access token](https://github.com/settings/personal-access-tokens/new). Select resource owner **karinkrutilova**, repository access **Only select repositories → portfolio**, and repository permission **Contents: Read and write**. Metadata read access is automatic. Choose an expiration date; renew the token when it expires.
2. Open the editor and choose **Sign In with Token**. Paste the token there. Never put it in this repository or send it in chat. Sveltia keeps the token in that browser's local storage; sign out when using a shared computer.
3. Open **Assets → Artwork images**, choose **Upload new assets**, and select or drag in as many images as you need. No title, year, description or other fields are required. The filename supplies a hidden fallback title, so use a short descriptive name such as `blue-portrait.jpg`.
4. Use **Artwork details (optional)** only when you want to add a custom title, year, image description, ordering or other details to an uploaded image. Select the matching image in the record. You can skip this entirely when the gallery is configured to hide captions.
5. Uploads and edits commit directly to `main` and trigger deployment. Wait for the Actions run to finish, then refresh the site.
6. Open **Site text** to change the artist name, gallery introduction, or About/contact text. Add an email link in the About text when ready.

Export JPG, PNG or WebP around 2000 pixels on the long edge, ideally below 500 KB. The editor's upload limit is 2 MB. The repository is public: uploaded files and their Git history are public too. Removing a work from the site does not erase previous commits.

Featured works appear first. Within each group, lower sort-order numbers appear first; unnumbered works follow, newest year first. Each work has its own page. Tags are displayed on that page; there are no filters yet.

The About text has bracketed placeholders to fill in. The gallery shows a note about sample works only while any work has a source link.

## Local development

Requires Node 24 and npm.

```sh
npm ci
npm run dev -- --background
# Open http://localhost:4321/portfolio/
npm run dev -- status
npm run dev -- stop

npm run build
npm test
```

`npm test` checks the built pages, local links, GitHub Pages base paths, image descriptions, responsive WebP files, and editor entry. GitHub Actions runs the same check before deployment. The first publisher token sign-in and an editor save should also be tried in your own browser; a successful build alone does not validate that login.

## Content and images

- `src/content/works/*.md`: optional artwork metadata and Markdown descriptions.
- `src/assets/works/`: uploaded source images.
- `src/content/settings.json`: name and gallery text.
- `src/content/pages/about.md`: About/contact text.
- `src/content.config.ts`: Astro collection schemas.
- `public/admin/config.yml`: editor fields and GitHub backend.

Both Sveltia's `media_folder` and `public_folder` are `/src/assets/works`. The folder is the source of truth for the gallery: supported images placed there appear automatically, including files uploaded in one batch from the Asset Library. A matching file under `src/content/works` can optionally override the filename-derived title and add details. Astro imports each source image and the production build generates responsive WebP files. `/src/assets/...` is a source reference, not a URL served by the published site. Do not change only one side of this configuration.

Sveltia is pinned to `0.208.2` in `public/admin/index.html`. Astro and its image tooling are the only application dependency. The CMS does not require a Svelte integration, OAuth proxy, or database. GitHub Pages must use **GitHub Actions** as its publishing source. The Pages workflow uses the official Astro action.

To change hosting later, update `site`/`base` in `astro.config.mjs`, editor URLs, and the base-path assertion in `scripts/check-build.mjs`. A custom domain has its own registration cost; the current `github.io` address is free.

# Art portfolio

A small Astro portfolio with Sveltia CMS and GitHub Pages. Static pages, content and images in Git, no database or application backend.

- Site: https://karinkrutilova.github.io/portfolio/
- Editor: https://karinkrutilova.github.io/portfolio/admin/
- Deployment status: https://github.com/karinkrutilova/portfolio/actions

## Edit the portfolio

1. Create a [fine-grained GitHub personal access token](https://github.com/settings/personal-access-tokens/new). Select resource owner **karinkrutilova**, repository access **Only select repositories → portfolio**, and repository permission **Contents: Read and write**. Metadata read access is automatic. Choose an expiration date; renew the token when it expires.
2. Open the editor and choose **Sign In with Token**. Paste the token there. Never put it in this repository or send it in chat. Sveltia keeps the token in that browser's local storage; sign out when using a shared computer.
3. Choose **Bulk upload images** in the bottom-right corner of the editor, select as many images as you need, then choose **Upload selected images**. This reliable uploader sends file data independently and publishes the successful files together, avoiding the CMS's all-or-nothing batch limit. No title, year, description or other fields are required. The filename supplies the initial title and image description, so use a short descriptive name such as `blue-portrait.jpg`.
4. Open **Artwork details** to edit the automatically created record for any image. Here you can change its title, description, image description, year, ordering, and other optional details.
5. Choose **Arrange gallery** in the bottom-right corner to see the current site sequence. Drag images or use the arrow buttons, then choose **Save arrangement**. Position 1 is the first artwork beneath the introduction.
6. Uploads and edits commit directly to `main` and trigger deployment. Wait for the Actions run to finish, then refresh the site.
7. Open **Site text** to change the artist name, gallery introduction, or About/contact text. Add an email link in the About text when ready.
8. In **Site text → Name and introduction**, use **Portrait photo** to upload or choose a profile image. Portrait files are stored separately under `src/assets/site/` and never enter the artwork gallery.

Export JPG, PNG or WebP around 2000 pixels on the long edge, ideally below 500 KB for a fast-loading site. The custom bulk uploader accepts files up to GitHub's 100 MB per-file limit and reports an exact error for each rejected file. The repository is public: uploaded files and their Git history are public too. Removing a work from the site does not erase previous commits.

The saved gallery order appears first. Unnumbered artwork follows, with featured items before the rest, then newest year and title. Each artwork has its own page. Tags are displayed on that page; there are no filters yet.

The About text has bracketed placeholders to fill in. The gallery shows a note about sample artwork only while any artwork has a source link.

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

`npm test` checks the built pages, local links, GitHub Pages base paths, image descriptions, responsive WebP files, uploader behavior, gallery ordering, and editor entry. GitHub Actions runs the same check before deployment. The first publisher token sign-in and an editor save should also be tried in your own browser; a successful build alone does not validate that login.

## Content and images

- `src/content/works/*.md`: automatically created artwork metadata records and editable Markdown descriptions.
- `src/assets/works/`: uploaded source images.
- `src/content/settings.json`: name and gallery text.
- `src/content/pages/about.md`: About/contact text.
- `src/content.config.ts`: Astro collection schemas.
- `public/admin/config.yml`: editor fields and GitHub backend.

Both Sveltia's `media_folder` and `public_folder` are `/src/assets/works`. The folder is the source of truth for the gallery: supported images placed there appear automatically, including files uploaded in one batch from the Asset Library. A matching file under `src/content/works` can optionally override the filename-derived title and add details. Astro imports each source image and the production build generates responsive WebP files. `/src/assets/...` is a source reference, not a URL served by the published site. Do not change only one side of this configuration.

Sveltia is pinned to `0.208.2` in `public/admin/index.html`. Astro and its image tooling are the only application dependency. The CMS does not require a Svelte integration, OAuth proxy, or database. GitHub Pages must use **GitHub Actions** as its publishing source. The Pages workflow uses the official Astro action.

To change hosting later, update `site`/`base` in `astro.config.mjs`, editor URLs, and the base-path assertion in `scripts/check-build.mjs`. A custom domain has its own registration cost; the current `github.io` address is free.

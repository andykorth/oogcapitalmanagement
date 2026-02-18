# OOG Capital Management Website

This site is developed with [Hugo](https://gohugo.io).

Run local Hugo server (include draft posts):
```
hugo server -D
```

Hugo v0.147 extended or higher is required. The extended version is needed for some theme features (SCSS processing). Newer versions will probably work, just bump the version number in the theme if needed. But you can kind of ignore the theme 

## Project Structure

```
/assets/css/         OOG-specific CSS (custom.css). Hugo processes these before
                     serving; root-level assets override the theme's copies. This is for non-tailwind css also.

/assets/images/      Artwork used across the site and in featured images.
                     Hugo reprocesses and recompresses these automatically.
                     Referenced in templates via {{ with resources.Get . }}

/content/            Pages and posts, written in Markdown.
  posts/             Blog articles.
  <tool-name>/       One directory per tool, each with a minimal index.md
                     containing front matter + a shortcode invocation.

/layouts/            OOG-specific Hugo template overrides. Root-level layouts
                     take precedence over themes/tailbliss/layouts/.
  shortcodes/        All interactive tool shortcodes (governor-helper,
                     gateway-tool, intel-lookup, corp-manager, etc.)
  home.html          Custom homepage template
  tool-list/         Custom layout for the tools index page

/static/             Content copied directly to /public/ without processing.
  *.js               Browser-side JavaScript for interactive tools.
                     infra-data.js and pricing-and-materials.js are shared
                     modules imported by multiple tools.
  map/               Interactive universe map (~36 MB, don't open wholesale)
  shareholders/      Discord chat exports archive (~121 MB)
  flights.html       Standalone ship tracker (not a Hugo page). Goes in my MagicMirror

/themes/tailbliss/   Upstream TailBliss theme. Contains base layouts, partials,
                     generic shortcodes, and Tailwind/PostCSS configuration.
                     Don't add OOG-specific files here — use root layouts/ instead.

/public/             Hugo build output (git-ignored). Unlike React/Vite, this is
                     output only — static source files live in /static/, not here.
```

## Development

Most of the time you can develop using:
```
hugo server -D
```

If you need to mess with the tailwind bits of the tailbliss theme, then you might need hugo extended and npm:

The npm scripts (Tailwind watch, dev server) live in `themes/tailbliss/`:

```bash
cd themes/tailbliss
npm start        # Tailwind watch + Hugo dev server
npm run build    # Production build (hugo --minify)
```

## Deployment

Deploy to the web server via rsync or SFTP:

```bash
./deploy.sh      # rsync /public/ to remote server
./upload.sh      # SFTP upload from /public/
```

Manual rsync (don't use `--delete` — it would remove content not in the local build):
```
rsync -avz public/ username@host:~/path/
```

On Windows, rsync isn't available via winget. See:
https://blog.holey.cc/2025/04/30/using-rsync-on-windows/

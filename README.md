# OOG Capital Management Website

This site is developed with [Hugo](https://gohugo.io). 

Run local hugo server, include draft posts:
```
hugo server -D
```

I'm using Hugo v147. The extended version may be required for some themes I use. Newer versions will probably work, just bump up the version number in the theme if needed.

# Project Structure:

`/assets/images` - For artwork used across the site, or used in shortcodes or featured_images. Stuff inside /assets/ will run through Hugo's processor scripts, so images will be reformatted and recompressed as needed. References will be replaced with size-specific references. In Hugo code, these are generally referenced like ` {{ with resources.Get . }} `

`/content/` - posts or pages for the site, written in markdown.  

`/public/` - This is the build output of the `hugo` tool. This is very unlike React/Vite/Node, which use the `/public/` folder as input for static content.

`/static/` - Content here gets copied directly to the output directory. This includes favicons, certain images, and non-hugo webapps like the `/map/` project such as https://github.com/Taiyi-94/prun_universe_map

# Deployment

Deploy to webserver via sftp or [rsync](https://gohugo.io/host-and-deploy/deploy-with-rsync/). But don't delete remote content as the tutorial suggests.

```
rsync -avz public/ username@host:~/path/
```

(On windows rsync is not available via winget, but instead follow this painful tutorial: https://blog.holey.cc/2025/04/30/using-rsync-on-windows/ )
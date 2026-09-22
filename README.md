# Community beta branch

See [BETA-SETUP.md](BETA-SETUP.md) for the new Cloudflare beta setup. The historical website notes below describe the original static site and are not the beta deployment instructions.

# TRGVC.club — One-page final design

This version was rebuilt from the previous multi-page design based on the latest feedback.

## Changes

- Back to a **single-page website**
- **Store removed**
- Replaced / repositioned imagery so visuals are used more cleanly
- Attached TRGVC logo cleaned for transparent use (no white/checker box)
- Official Spotify album cover URLs used with local fallbacks
- Album covers include:
  - 3D mouse tilt
  - dynamic highlight / shine
  - subtle zoom and glow
  - hover call-to-action
- Responsive layout rewritten to prevent text overlap / collisions
- Mobile layout removes 3D tilt and keeps album actions visible
- GitHub Pages files included (`CNAME`, `.nojekyll`, `robots.txt`, `sitemap.xml`, `404.html`)

## Deploy

Replace the contents of the current GitHub Pages repository with the contents of this folder, commit to the branch used by GitHub Pages, and keep the custom domain set to `trgvc.club`.


## Logo correction

This build uses the newly supplied TRGVC logo files.

- The header/footer use the complete transparent logo — no symbol crop.
- The hero and About section use the complete logo at its original proportions.
- No part of the bottom wordmark is clipped.
- `object-fit: contain` is used everywhere the logo appears.
- The supplied background version is included as `assets/images/site/logo-background.png`.


## Background logo treatment

The homepage hero and About section now use the supplied **logo-with-background** artwork.

They are deliberately separated from the page background using:
- a floating framed card
- subtle purple/blue edge lighting
- a small rotation difference between the homepage and About section
- soft shadow and glow
- full 1:1 artwork with no cropping

The header/footer still use the transparent logo for clarity and compact sizing.

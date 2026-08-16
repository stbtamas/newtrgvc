# TRGVC Beta Rebuild — Changes

## Brand & content hierarchy
- Rebuilt the homepage around **Music · Gaming · Community**.
- Moved active content ahead of biography-style copy.
- Added a dedicated **Latest Album** feature.
- Added visual **Warzone**, **Forza Horizon**, and **All Gaming Videos** cards.
- Rebuilt the About section around the three core TRGVC pillars.
- Added a stronger community call-to-action and platform directory.
- Rebuilt Contact around music, gaming, and business enquiries.
- Removed Xbox references to keep the gaming identity PC-focused.
- Tightened repeated “real / authentic / unfiltered” wording.

## Visual system
- Kept the established purple / blue / cyan TRGVC aesthetic.
- Added new feature-card, gaming-card, platform-card and contact layouts.
- Added lightweight inline SVG-style platform icons.
- Improved spacing, hierarchy, mobile album cards and responsive layouts.
- Added tasteful scroll reveal states with reduced-motion support.
- Created a dedicated **1200×630 social preview** image.

## Navigation & accessibility
- Added a skip-to-content link.
- Added visible keyboard `:focus-visible` treatment.
- Fixed fixed-navigation anchor offsets.
- Added functional hamburger animation.
- Added `aria-expanded`, `aria-controls`, dynamic menu labels and Escape-to-close behavior.
- Hidden mobile navigation now uses `visibility`, preventing closed-menu focus leakage.
- Improved small footer-text contrast.

## SEO & sharing
- Added canonical URL.
- Completed Open Graph metadata with absolute social-image URL.
- Added X/Twitter card metadata.
- Added Schema.org `MusicGroup` structured data.
- Added `robots.txt`.
- Added `sitemap.xml`.
- Added `site.webmanifest` with 192px and 512px icons.

## Technical
- Preserved the lightweight no-framework HTML/CSS/JS architecture.
- Kept WebP album/logo delivery with fallbacks.
- Added active-section navigation highlighting.
- No build step is required.

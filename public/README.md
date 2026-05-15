Place real favicon and app icons here.

This folder contains placeholder assets for browser and PWA icons.

Recommended workflow to generate PNG and ICO from the SVG (ImageMagick required):

```bash
# generate pngs
convert public/favicon.svg -resize 32x32 public/favicon-32x32.png
convert public/favicon.svg -resize 16x16 public/favicon-16x16.png
convert public/favicon.svg -resize 192x192 public/android-chrome-192x192.png
convert public/favicon.svg -resize 512x512 public/android-chrome-512x512.png

# create favicon.ico (contains multiple sizes)
convert public/favicon-16x16.png public/favicon-32x32.png public/favicon.ico
```

Place the generated files in this folder. Replace these placeholders with final branded artwork.

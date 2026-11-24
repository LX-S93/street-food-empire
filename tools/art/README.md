# Art pipeline

Art is generated locally with ComfyUI and post-processed here.

- `prompts.json`: every asset as `[category, name, prompt, width, height]`. Still images use Z-Image Turbo (8 steps, cfg 1, res_multistep), output to `ComfyUI/output/sfe/<category>/`.
- Storefront animations use Wan 2.1 VACE 1.3B: a composited street scene is the first frame of a 33-frame clip (704×480).
- `process.py <raw_dir> <out_dir>`: removes the white background, trims, resizes and writes WebP into `public/art/`.
- `anim.py <src.webp> <dst.webp>`: turns a clip into a ping-pong loop for the shop scene.

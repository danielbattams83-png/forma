# Forma

A dark, single-page shelf for textured 3D models. The public view is a bento grid. Click a study to orbit it, switch the light, or drop it into wireframe. A password unlocks an admin shelf for uploads, grid size, copy, and order.

The catalog is a JSON file and the models live in `public/`, so you can run it immediately. The repository and blob helpers are the seams if you later move the catalog to Supabase and the files to S3 or Supabase Storage.

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js.

Choose an admin password before you sign in:

```bash
cp .env.example .env.local
```

Set `ADMIN_PASSWORD` in `.env.local`, then start the dev server again. Login stays closed until that variable is set. The session cookie is HTTP-only. On a hosted deploy, set the same variable in the host’s secret store rather than committing it.

## Use the gallery

- Filter the shelf with the category pills.
- Click a tile, or press it from the keyboard, to open the viewer.
- Drag to orbit, scroll to zoom, right-drag to pan.
- Reset the camera, toggle auto-rotate, switch wireframe, and change the light between Studio, Outdoor, and Dark.
- Press `Esc` or the backdrop to close.
- On a fine pointer, resting on a tile swaps the still for a lightweight spinning preview. Touch screens stay on the still so the page does not open a pile of WebGL contexts.

## Admin

Click the lock in the header.

- **Add model** accepts `.glb` or `.gltf`, plus a title, category, description, notes, and a bento size (`1x1`, `2x1`, `2x2`). The preview captures a thumbnail on its own. Recapture the frame or replace it with a JPEG, PNG, or WebP.
- **Library** reorders studies by dragging or with the arrows, edits their copy and grid size, and deletes them.
- **Log out** clears the session.

Prefer a self-contained `.glb`. A `.gltf` that points at external textures or `.bin` files will not resolve from a single upload.

Uploads land in `public/uploads/`. The seed studies live in `public/samples/` and `data/models.json`.

## Swap the storage later

- `lib/repository.ts` — `ModelRepository` reads and writes the catalog. `getRepository()` returns the JSON adapter.
- `lib/blobs.ts` — `BlobStore` saves and deletes model and thumbnail bytes. `getBlobs()` returns the local `public/` adapter.

API routes talk only to those two interfaces. A Supabase table can implement `ModelRepository`, and Supabase Storage or S3 can implement `BlobStore`, without changing the gallery.

## Scripts

`npm run capture-thumbs` re-renders the seed thumbnails in the studio light. The dev server needs to be running. It uses system Chrome via `puppeteer-core`.

## Credits

Seed models are CC0 or CC BY and are attributed on each study. See [CREDITS.md](CREDITS.md). Lighting HDRIs are from Poly Haven (CC0): Studio Small 03, Potsdamer Platz, and Empty Warehouse.

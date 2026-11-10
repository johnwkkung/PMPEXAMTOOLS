# Images Folder

Place quiz question images here (QIMG, CIMG1, CIMG2, CIMG3 files from the API).

## Usage

Images referenced by the quizManager API (e.g. `B_1_0.jpg`) should be copied here.

For bundled access in the app, also register the filename in `app/quiz.tsx` inside the `IMAGE_MAP` object:

```ts
const IMAGE_MAP: Record<string, any> = {
  'B_1_0.jpg': require('@/assets/images/B_1_0.jpg'),
  // Add more entries here...
};
```

> Note: Expo requires all local images to be declared with `require()` at build time.
> Remote images from a URL can be used directly via `{ uri: 'https://...' }`.

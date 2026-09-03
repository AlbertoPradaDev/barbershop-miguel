// Lazy singleton for the MediaPipe FaceLandmarker, self-hosted under /public/vendor
// (an embedded widget must not depend on a CDN at runtime, and a cold CDN fetch of the
// model costs ~25s). Loaded on first photo, shared by every slot.

/* eslint-disable @typescript-eslint/no-explicit-any */
let lmPromise: Promise<any> | null = null;

export function getLandmarker(): Promise<any> {
  if (!lmPromise) {
    lmPromise = (async () => {
      // Runtime import from /public. A Function-wrapped import would be EVAL and
      // the site's CSP has no 'unsafe-eval', so this must be a NATIVE dynamic
      // import; the ignore comments cover both bundlers (webpack builds locally,
      // turbopack on Vercel), and the variable specifier keeps TypeScript from
      // trying to resolve the path.
      const spec = "/vendor/vision_bundle.mjs";
      const mod: any = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ spec);
      const files = await mod.FilesetResolver.forVisionTasks("/vendor/wasm");
      return mod.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/vendor/face_landmarker.task" },
        runningMode: "IMAGE",
        numFaces: 2,
        outputFacialTransformationMatrixes: true, // yaw, for the angle gate
      });
    })().catch((e) => {
      lmPromise = null; // allow a retry on the next photo
      throw e;
    });
  }
  return lmPromise;
}

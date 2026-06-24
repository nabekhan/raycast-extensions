import raycastConfig from "@raycast/eslint-config";

export default [
  { ignores: ["dist/**", "raycast-env.d.ts"] },
  ...raycastConfig.flat(Infinity),
];

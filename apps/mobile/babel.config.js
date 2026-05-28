module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // NativeWind v4: the jsxImportSource lets className flow through the JSX transform.
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 still ships its worklet plugin under the same path; must be last.
    plugins: ["react-native-reanimated/plugin"],
  };
};

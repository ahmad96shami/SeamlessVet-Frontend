// Static image imports (Metro resolves them to asset ids at bundle time).
declare module "*.png" {
  const source: import("react-native").ImageSourcePropType;
  export default source;
}

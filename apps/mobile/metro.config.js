// Metro config for the pnpm workspace: watch the workspace root so symlinked
// packages (@vet/shared in particular) are picked up, and pin nodeModulesPaths
// so Metro resolves through both the app's and the workspace's stores.
const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Strict resolution — pnpm's tree is flat-per-package, not hierarchical.
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });

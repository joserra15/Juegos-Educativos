import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@engine/ContentLoader": "/workspace/engine/ContentLoader.js",
      "@engine/QuestionGenerator": "/workspace/engine/QuestionGenerator.js",
      "@engine/Scoring": "/workspace/engine/Scoring.js",
      "@engine/Hints": "/workspace/engine/Hints.js",
      "@engine/ProgressStore": "/workspace/engine/ProgressStore.js",
      "@engine/WorldManager": "/workspace/engine/WorldManager.js",
      "@engine/PhaseProgress": "/workspace/engine/PhaseProgress.js",
      "@engine/SessionEngine": "/workspace/engine/SessionEngine.js",
      "@engine/PanelStats": "/workspace/engine/PanelStats.js",
      "@ui/Onboarding": "/workspace/js/ui/Onboarding.js",
      "@ui/SelectorMundos": "/workspace/js/ui/SelectorMundos.js",
      "@ui/PwaInstall": "/workspace/js/ui/PwaInstall.js",
      "@ui/PanelFamilias": "/workspace/js/ui/PanelFamilias.js",
      "@ui/RankingView": "/workspace/js/ui/RankingView.js",
      "@ui/MochilaView": "/workspace/js/ui/MochilaView.js",
      "@ui/LazyAssets": "/workspace/js/ui/LazyAssets.js",
    },
  },
  test: {
    include: ["tests/**/*.test.js"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@engine/ContentLoader": fromRoot("./engine/ContentLoader.js"),
      "@engine/QuestionGenerator": fromRoot("./engine/QuestionGenerator.js"),
      "@engine/Scoring": fromRoot("./engine/Scoring.js"),
      "@engine/Hints": fromRoot("./engine/Hints.js"),
      "@engine/ProgressStore": fromRoot("./engine/ProgressStore.js"),
      "@engine/WorldManager": fromRoot("./engine/WorldManager.js"),
      "@engine/PhaseProgress": fromRoot("./engine/PhaseProgress.js"),
      "@engine/SessionEngine": fromRoot("./engine/SessionEngine.js"),
      "@engine/PanelStats": fromRoot("./engine/PanelStats.js"),
      "@ui/Onboarding": fromRoot("./js/ui/Onboarding.js"),
      "@ui/SelectorMundos": fromRoot("./js/ui/SelectorMundos.js"),
      "@ui/PwaInstall": fromRoot("./js/ui/PwaInstall.js"),
      "@ui/PanelFamilias": fromRoot("./js/ui/PanelFamilias.js"),
      "@ui/RankingView": fromRoot("./js/ui/RankingView.js"),
      "@ui/MochilaView": fromRoot("./js/ui/MochilaView.js"),
      "@ui/LazyAssets": fromRoot("./js/ui/LazyAssets.js"),
    },
  },
  test: {
    include: ["tests/**/*.test.js"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});

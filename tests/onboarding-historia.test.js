import { describe, it, expect } from "vitest";
import { mensajeBienvenidaMural } from "../js/ui/Onboarding.js";

describe("Onboarding — bienvenida multi-mundo", () => {
  it("ya no menciona solo el reino de los unicornios", () => {
    const msg = mensajeBienvenidaMural("Alex");
    expect(msg).toContain("Alex");
    expect(msg).toContain("Mundos Mágicos");
    expect(msg.toLowerCase()).not.toContain("reino de los unicornios");
  });
});

import { describe, it, expect } from "vitest";
import { stripRepeatedGreeting } from "./agentFormatting";

describe("stripRepeatedGreeting", () => {
  it("retorna texto inalterado quando não há histórico", () => {
    expect(stripRepeatedGreeting("Boa tarde! Em que posso ajudar?", []))
      .toBe("Boa tarde! Em que posso ajudar?");
  });

  it("remove saudação repetida quando agente já cumprimentou", () => {
    const r = stripRepeatedGreeting(
      "Boa tarde!! Tudo bem por aqui, e com você? Fazemos Cairo sim, é fascinante.",
      ["Boa tarde! Em que posso ajudar?"]
    );
    expect(r).toBe("Fazemos Cairo sim, é fascinante.");
  });

  it("preserva texto se remoção deixaria vazio", () => {
    const r = stripRepeatedGreeting("Boa tarde!", ["Bom dia!"]);
    expect(r).toBe("Boa tarde!");
  });

  it("não remove se a resposta não começa com saudação", () => {
    const r = stripRepeatedGreeting(
      "Sim, fazemos Cairo!",
      ["Boa tarde! Em que posso ajudar?"]
    );
    expect(r).toBe("Sim, fazemos Cairo!");
  });

  it("ignora capitalização e pontuação extra", () => {
    const r = stripRepeatedGreeting(
      "BOA TARDE!!! Tudo ótimo. Vamos seguir.",
      ["Olá! Sou a Nath."]
    );
    expect(r).toBe("Vamos seguir.");
  });

  it("não age se nunca houve saudação anterior", () => {
    const r = stripRepeatedGreeting(
      "Boa tarde! Como posso ajudar?",
      ["Sim, claro.", "Pode me passar as datas?"]
    );
    expect(r).toBe("Boa tarde! Como posso ajudar?");
  });

  it("remove saudação repetida do lead mesmo sem pontuação após boa tarde", () => {
    const r = stripRepeatedGreeting(
      "Boa tarde que bom saber disso, então acho que prefiro algo mais fora do circuito.",
      ["Boa tarde, queria viajar em janeiro."]
    );
    expect(r).toBe("Que bom saber disso, então acho que prefiro algo mais fora do circuito.");
  });

  it("remove só a saudação quando o lead repete com marcador informal", () => {
    const r = stripRepeatedGreeting(
      "Boa tarde hum legal, to pensando em uns 7 dias mais ou menos.",
      ["Boa tarde, queria viajar em janeiro."]
    );
    expect(r).toBe("Hum legal, to pensando em uns 7 dias mais ou menos.");
  });
});

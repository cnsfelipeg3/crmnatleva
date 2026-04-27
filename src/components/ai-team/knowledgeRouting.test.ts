import { describe, it, expect } from "vitest";
import { routeKnowledgeDocsByAgent } from "./knowledgeRouting";

describe("routeKnowledgeDocsByAgent — Brasil", () => {
  it("roteia doc 'Maceió e Litoral Sul' para nemo", () => {
    const docs = [{
      title: "Maceió e Litoral Sul",
      category: "destinos",
      content_text: "Roteiro de praias em Maceió, Alagoas. Praia do Francês, Praia do Gunga, Marechal Deodoro.",
    }];
    const routed = routeKnowledgeDocsByAgent(docs);
    expect(routed.nemo).toBeDefined();
    expect(routed.nemo.length).toBe(1);
    expect(routed.luna).toBeDefined();
    expect(routed.luna.length).toBe(1);
  });

  it("roteia 'Fernando de Noronha' para nemo", () => {
    const docs = [{
      title: "Fernando de Noronha — Roteiro Premium",
      category: "destinos",
      content_text: "Mergulho em Noronha, praias de Fernando de Noronha.",
    }];
    const routed = routeKnowledgeDocsByAgent(docs);
    expect(routed.nemo?.length).toBe(1);
  });

  it("roteia 'Gramado e Canela' para nemo", () => {
    const docs = [{
      title: "Roteiro de Gramado e Canela",
      category: "destinos",
      content_text: "Serra gaúcha, Rio Grande do Sul, Snowland, Mini Mundo.",
    }];
    const routed = routeKnowledgeDocsByAgent(docs);
    expect(routed.nemo?.length).toBe(1);
  });

  it("não rotea doc 'Buenos Aires' para Brasil (não regredir Nemo existente)", () => {
    const docs = [{
      title: "Buenos Aires Roteiro 3 Dias",
      category: "destinos",
      content_text: "Recoleta, Palermo, Argentina, América do Sul.",
    }];
    const routed = routeKnowledgeDocsByAgent(docs);
    expect(routed.nemo?.length).toBe(1);
    expect(routed.dante).toBeUndefined();
  });

  it("não regride Europa (Milão continua no dante)", () => {
    const docs = [{
      title: "Roteiro Completo de Milão",
      category: "destinos",
      content_text: "Milão, Itália, Europa, arquitetura.",
    }];
    const routed = routeKnowledgeDocsByAgent(docs);
    expect(routed.dante?.length).toBe(1);
  });
});

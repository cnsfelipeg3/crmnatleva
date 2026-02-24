import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AirlineLogo from "@/components/AirlineLogo";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("AirlineLogo Component", () => {
  it("renders nothing for empty iata", () => {
    const { container } = renderWithTooltip(<AirlineLogo iata="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders img tag for valid iata", () => {
    const { container } = renderWithTooltip(<AirlineLogo iata="TP" />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toContain("TP.png");
  });

  it("renders with custom size", () => {
    const { container } = renderWithTooltip(<AirlineLogo iata="LA" size={30} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("width")).toBe("30");
  });

  it("renders with showName", () => {
    const { container } = renderWithTooltip(<AirlineLogo iata="G3" showName />);
    expect(container.textContent).toContain("G3");
  });
});

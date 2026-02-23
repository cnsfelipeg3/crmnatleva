import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
    renderWithTooltip(<AirlineLogo iata="TP" />);
    const img = screen.getByAltText("Logo TP");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toContain("TP.png");
  });

  it("renders with custom size", () => {
    renderWithTooltip(<AirlineLogo iata="LA" size={30} />);
    const img = screen.getByAltText("Logo LA");
    expect(img.getAttribute("width")).toBe("30");
  });

  it("renders with showName", () => {
    renderWithTooltip(<AirlineLogo iata="G3" showName />);
    expect(screen.getByText("G3")).toBeInTheDocument();
  });
});

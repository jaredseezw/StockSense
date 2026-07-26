import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders StockSense app", () => {
  render(<App />);
  const stockSenseText = screen.getAllByText(/StockSense/i);
  expect(stockSenseText.length).toBeGreaterThan(0);
});

test("renders dashboard navigation", () => {
  render(<App />);
  expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
});

test("renders simulator navigation", () => {
  render(<App />);
  expect(screen.getByText(/Simulator/i)).toBeInTheDocument();
});

test("renders AI Assistant navigation", () => {
  render(<App />);
  expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();
});
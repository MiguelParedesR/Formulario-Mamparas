// Utility for navigation to centralize logic
import { withBase } from "../config.js";

/**
 * Centralized navigation logic
 * @param {string} relativePath - Relative path to navigate to
 */
export function navigateTo(relativePath) {
  const url = withBase(relativePath);
  console.log(`➡️ Navegando a: ${url}`);
  window.dispatchEvent(
    new CustomEvent("sidebar:navigate", { detail: url })
  );
}
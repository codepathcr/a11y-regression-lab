import { chromium } from 'playwright';
import type { Browser } from 'playwright';

/**
 * Lanza Chromium para la medición.
 *
 * `A11Y_CHROMIUM_PATH` permite apuntar a un Chromium ya presente en el sistema,
 * en lugar del que instala Playwright. Existe para entornos donde el navegador
 * viene precargado: un runner de integración continua, o una imagen base con
 * otra compilación.
 *
 * Usarla no esconde con qué navegador se midió: cada traza registra
 * `environment.browserVersion` tal como lo reporta el navegador que realmente
 * corrió.
 */
export function launchChromium(): Promise<Browser> {
  const executablePath = process.env.A11Y_CHROMIUM_PATH;
  return chromium.launch(executablePath ? { executablePath } : {});
}

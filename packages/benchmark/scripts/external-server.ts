import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import type { StaticServer } from './static-server';

/**
 * Servidor estático para aplicaciones AJENAS al benchmark (repositorios que usan
 * el framework mediante el workflow reutilizable).
 *
 * Es un hermano de `serveDist` y no una modificación suya: `serveDist` lo usan
 * los scripts de medición del estudio y no se toca. Este añade lo que una
 * aplicación real necesita y el benchmark no:
 *
 *  · Salida de las rutas del lado cliente (SPA): una ruta sin extensión que no
 *    existe como archivo devuelve `index.html`, como haría cualquier hosting.
 *  · Una señal de "lista" inyectada. El framework espera
 *    `data-harness-ready="true"` en `<html>`, que las apps del benchmark ponen
 *    ellas mismas. Una aplicación ajena no lo hace, de modo que el servidor
 *    añade al HTML un script mínimo que lo pone cuando (a) la página terminó de
 *    cargar, (b) existe el selector indicado, si se indicó uno, y (c) el DOM
 *    estuvo quieto `quietMs`. No instrumenta nada ni toca el marcado: el
 *    atributo se escribe antes de la captura del paso 0, cuyos eventos el
 *    framework descarta.
 *  · Protección contra rutas fuera de la raíz.
 */

export interface ReadyOptions {
  /**
   * `auto` (por omisión): el servidor inyecta la señal.
   * `app`: la propia aplicación pone `data-harness-ready` y no se inyecta nada.
   */
  mode?: 'auto' | 'app';
  /** Elemento que debe existir antes de dar la página por lista. */
  selector?: string;
  /** Milisegundos sin mutaciones del DOM antes de dar la página por lista. */
  quietMs?: number;
  /** Tope de espera dentro de la página; vencido, publica `data-harness-error`. */
  timeoutMs?: number;
}

export const DEFAULT_QUIET_MS = 300;
export const DEFAULT_PAGE_TIMEOUT_MS = 10_000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
};

/** Script que publica la señal de "lista". Sin dependencias y sin efectos
 *  visibles; los valores llegan serializados con JSON.stringify. */
export function readySnippet(options: ReadyOptions): string {
  const selector = options.selector ?? null;
  const quietMs = options.quietMs ?? DEFAULT_QUIET_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_PAGE_TIMEOUT_MS;
  return `<script data-a11y-lab-ready>(function(){
var de=document.documentElement,sel=${JSON.stringify(selector)},quiet=${JSON.stringify(quietMs)},max=${JSON.stringify(timeoutMs)};
function ready(){de.setAttribute('data-harness-ready','true');}
function fail(m){de.setAttribute('data-harness-error',m);}
function start(){
  var t0=Date.now();
  (function wait(){
    if(sel&&!document.querySelector(sel)){
      if(Date.now()-t0>max){fail('no apareció el selector '+sel+' en '+max+' ms');return;}
      setTimeout(wait,50);return;
    }
    var last=Date.now(),mo=new MutationObserver(function(){last=Date.now();});
    mo.observe(document,{subtree:true,childList:true,attributes:true,characterData:true});
    (function quietly(){
      if(Date.now()-last>=quiet){mo.disconnect();ready();return;}
      if(Date.now()-t0>max){mo.disconnect();fail('el DOM no se estabilizó en '+max+' ms');return;}
      setTimeout(quietly,50);
    })();
  })();
}
if(document.readyState==='complete'){start();}else{window.addEventListener('load',start);}
})();</script>`;
}

/** Inserta el script antes de `</body>`, o al final si el documento no la cierra. */
export function injectReady(html: string, options: ReadyOptions): string {
  if (options.mode === 'app') return html;
  const snippet = readySnippet(options);
  const close = html.toLowerCase().lastIndexOf('</body>');
  return close === -1 ? html + snippet : html.slice(0, close) + snippet + html.slice(close);
}

export interface ExternalServerOptions {
  ready?: ReadyOptions;
  /** Devuelve `index.html` para rutas sin extensión inexistentes. Por omisión sí. */
  spaFallback?: boolean;
}

export function serveExternal(
  port: number,
  root: string,
  options: ExternalServerOptions = {}
): Promise<StaticServer> {
  const base = resolve(root);
  const spa = options.spaFallback ?? true;
  const ready = options.ready ?? {};

  async function isFile(path: string): Promise<boolean> {
    try {
      return (await stat(path)).isFile();
    } catch {
      return false;
    }
  }

  async function sendHtml(file: string, response: ServerResponse): Promise<void> {
    const html = injectReady(await readFile(file, 'utf8'), ready);
    response.setHeader('Content-Type', MIME['.html']);
    response.end(html);
  }

  const server = createServer((request, response) => {
    void (async () => {
      let pathname: string;
      try {
        pathname = decodeURIComponent((request.url ?? '/').split('?')[0].split('#')[0]);
      } catch {
        response.statusCode = 400;
        response.end('solicitud inválida');
        return;
      }
      const target = resolve(join(base, pathname === '/' ? 'index.html' : pathname));
      if (target !== base && !target.startsWith(base + sep)) {
        response.statusCode = 403;
        response.end('fuera de la raíz');
        return;
      }

      let file = target;
      let found = await isFile(file);
      if (!found) {
        // Una carpeta sirve su index.html.
        const inFolder = join(target, 'index.html');
        if (await isFile(inFolder)) {
          file = inFolder;
          found = true;
        }
      }
      if (!found && spa && extname(pathname) === '') {
        file = join(base, 'index.html');
        found = await isFile(file);
      }
      if (!found) {
        response.statusCode = 404;
        response.end('no encontrado');
        return;
      }

      const type = extname(file).toLowerCase();
      if (type === '.html') {
        await sendHtml(file, response);
        return;
      }
      response.setHeader('Content-Type', MIME[type] ?? 'application/octet-stream');
      createReadStream(file).pipe(response);
    })().catch(() => {
      response.statusCode = 500;
      response.end('error del servidor');
    });
  });

  return new Promise((done) => {
    server.listen(port, '127.0.0.1', () => {
      done({ origin: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

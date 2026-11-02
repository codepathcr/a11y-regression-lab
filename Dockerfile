# Imagen de medición del estudio.
#
# El entorno de ejecución es un artefacto versionado de la investigación, no la
# computadora de quien corre el experimento. Esto responde directamente a la
# amenaza de reproducibilidad declarada en la sección 3.9 del documento: el piso
# de ruido que se reporta es una propiedad de esta imagen, y cualquier tercero
# puede reconstruirla y obtener el mismo.
#
# La versión de la imagen base DEBE coincidir con la versión de Playwright
# declarada en packages/framework/package.json. Si una cambia, cambia la otra.
FROM mcr.microsoft.com/playwright:v1.48.2-jammy

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Los navegadores ya vienen en la imagen base con sus librerías de sistema.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Node.js con parches de seguridad (boletín del 21 de octubre de 2026), instalado
# aparte de la imagen base. NO cambia el navegador: Chromium sigue siendo el de
# Playwright 1.48.2, que es lo que fija las cifras del estudio. Cambiar Node no
# altera el árbol de accesibilidad; aun así, tras reconstruir la imagen se debe
# correr `verify-gt` y comprobar que no se movió nada.
# Se usa .tar.gz porque la imagen base puede no traer xz. El tarball se verifica contra su suma SHA-256 publicada por nodejs.org.
ARG NODE_VERSION=22.23.4
ARG NODE_SHA256_X64=b8492284c76a54baf58d61668dd0e41ee0fc98adabf9503d30f05d08f55b4406
ARG NODE_SHA256_ARM64=f7a1e486dbc8b286847815b477d4fb5e9fb963ed4489c3e1588853d685f589f9
RUN set -eux; \
    case "$(uname -m)" in \
      x86_64)  ARCH=x64;   SHA="$NODE_SHA256_X64" ;; \
      aarch64) ARCH=arm64; SHA="$NODE_SHA256_ARM64" ;; \
      *) echo "arquitectura no soportada: $(uname -m)" >&2; exit 1 ;; \
    esac; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.gz"; \
    echo "${SHA}  node-v${NODE_VERSION}-linux-${ARCH}.tar.gz" | sha256sum -c -; \
    tar -xzf "node-v${NODE_VERSION}-linux-${ARCH}.tar.gz" -C /usr/local --strip-components=1 --no-same-owner; \
    rm "node-v${NODE_VERSION}-linux-${ARCH}.tar.gz"; \
    hash -r; \
    test "$(/usr/local/bin/node -v)" = "v${NODE_VERSION}"

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

# Los manifiestos se copian antes que el código fuente: así un cambio en un
# fixture no invalida la capa de instalación de dependencias.
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY pnpm-lock.yaml* ./
COPY packages/framework/package.json ./packages/framework/
COPY packages/ui/package.json        ./packages/ui/
COPY packages/benchmark/package.json ./packages/benchmark/
COPY packages/analysis/package.json  ./packages/analysis/

# El lockfile está versionado: la instalación es reproducible y la imagen falla
# de inmediato si alguien cambió un manifiesto sin regenerarlo.
RUN pnpm install --frozen-lockfile

COPY . .

CMD ["bash"]

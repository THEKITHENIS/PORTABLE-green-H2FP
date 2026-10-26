# PORTABLE green H2FP · Gemelo digital

Gemelo digital educativo de una electrolizadora y estación de carga de hidrógeno (GreenH2FP), en 3D y en realidad virtual.

**Abrir la app:** https://thekithenis.github.io/PORTABLE-green-H2FP/

## Instalarla como app

| Dónde | Cómo |
|---|---|
| Ordenador (Chrome o Edge) | Abre la dirección y pulsa el icono **Instalar** de la derecha de la barra de direcciones. Queda en el escritorio y en el menú de inicio, y se abre en su propia ventana. |
| Android | En Chrome: menú **⋮ → Añadir a pantalla de inicio → Instalar**. |
| iPhone y iPad | En Safari: **Compartir → Añadir a pantalla de inicio**. |
| Gafas PICO y Meta Quest | Abre la dirección en el navegador de las gafas e instálala desde su menú. Dentro, pulsa **MODO VR**. |

Después de usarla con internet, también se abre sin conexión.

## Cómo se publica

Cada vez que se sube un cambio a `main`, GitHub compila la app y la publica sola en GitHub Pages en un par de minutos (se ve en la pestaña **Actions**).

- `.github/workflows/publicar-app.yml`: compila la app y la publica.
- `pwa/`: manifiesto, service worker e iconos que la hacen instalable. Se añaden al compilar, así que no hace falta tocar `index.html` y la app sigue siendo instalable aunque se vuelva a subir desde AI Studio.

## Probarla en local

Hace falta Node.js.

1. `npm install`
2. `npm run dev`

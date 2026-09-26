# Marca: Forja

## Idea

El gimnasio como **fragua**. El cuerpo se forja con calor (esfuerzo), golpes repetidos
(constancia) y temple (descanso). La metáfora guía toda la interfaz:

| Concepto de la app       | Metáfora visual                                |
| ------------------------ | ---------------------------------------------- |
| Serie de trabajo         | Ascua — naranja incandescente                  |
| Descanso entre series    | Temple — azul acero que «enfría»               |
| Volumen semanal muscular | Mapa de calor: del metal frío al blanco vivo   |
| Logros                   | Medallas forjadas: bronce, plata, oro, damasco |
| Racha                    | La llama que no se apaga                       |

**Lema:** _Entrena con criterio. Progresa con calor._

**Tono de voz:** directo, cálido y experto. Tutea. Frases cortas. Nada de culpa ni de
promesas milagro; celebra la constancia más que la intensidad.

## Símbolo

Una llama con una «F» en negativo. El trazado vive en `src/config/brand.ts` y de él se
generan favicon e iconos (`npm run icons`).

## Color

Tema oscuro por defecto («carbón» cálido, nunca negro puro). Todos los colores son tokens
OKLCH en `src/styles/index.css`, con variantes clara y oscura.

## Tipografía

- **Bricolage Grotesque** (variable, ancho 88 %): títulos y cifras grandes. Carácter propio.
- **Inter** (variable): texto de interfaz. Números tabulares para pesos, series y tiempos.

## Forma y movimiento

Superficies con radios amplios (24–30 px), grano sutil y brillo cálido en la esquina.
Movimiento con curva `ease-forge` (salida rápida, llegada suave) y muelles para momentos de
celebración. Se respeta `prefers-reduced-motion`.

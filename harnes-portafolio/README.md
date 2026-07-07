# harnes-portafolio

Harness para **adaptar esta plantilla de portafolio web a un nuevo usuario** con la ayuda de un
agente de IA (Claude, GPT, Gemini, etc.). La plantilla es un portafolio de *slides* full-screen con
estetica terminal/hacker, en HTML/CSS/JS vanilla, **cero CDN** y **cero frameworks**.

Este harness le da al agente tres cosas:

1. Un **punto de partida** explicito e inequivoco (`SKILL.md`).
2. Un **protocolo de entrevista** para que el agente le pregunte al usuario todo lo necesario
   (objetivo de la web, tematica, paleta, secciones, contenido de cada seccion...).
3. **Scripts deterministas y seguros** que aplican (`apply-theme.mjs`) y verifican (`check.mjs`)
   los cambios, sin dependencias externas (solo Node >= 18 stdlib).

---

## AGENTE: tu punto de partida es `harnes-portafolio/SKILL.md`

> ## Lee `harnes-portafolio/SKILL.md` COMPLETO antes de tocar nada.
> No edites archivos, no corras scripts y no adivines la paleta hasta haber leido el SKILL,
> el `CONTENT-MAP.md` y el `portfolio.config.example.json`.

---

## Para quien es

Para una persona que quiere **su propio portafolio** partiendo de esta plantilla, trabajando junto a
su agente de IA. El humano responde preguntas; el agente conduce el flujo y aplica los cambios de
forma segura.

## Flujo

```
  ENTREVISTA   ->   CONFIG            ->   APLICAR              ->   VERIFICAR      ->   CHECKPOINT
  questions.md      portfolio.        apply-theme.mjs           check.mjs           servir estatico
  (por bloques)     config.json       (--write) + content.js    (exit 0)            desktop + movil
```

## Archivos del harness

| Archivo | Que es |
|---|---|
| `SKILL.md` | Protocolo por fases. **Punto de partida del agente.** |
| `questions.md` | Cuestionario de entrevista con IDs estables (Q1, Q2...). |
| `CONTENT-MAP.md` | Donde vive cada cosa + recetas quirurgicas. |
| `portfolio.config.example.json` | Config de ejemplo (baseline = sitio actual). |
| `scripts/apply-theme.mjs` | Aplica paleta y fuentes a `css/main.css` + HTML. |
| `scripts/check.mjs` | Verificacion determinista (7 checks). Exit 0 = todo bien. |
| `scripts/install-hooks.sh` | Instala un pre-commit que corre `check.mjs`. |

> `portfolio.config.json` (la config activa) lo crea el usuario final y esta en `.gitignore`:
> no forma parte de la plantilla.

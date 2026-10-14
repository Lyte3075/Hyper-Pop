# classroomduck

Single-file builds of [DuckMath](https://duckmath.org) served over unpkg.

## Load via unpkg

Pinned to a version:

```
https://unpkg.com/classroomduck@1.0.0/index.html
https://unpkg.com/classroomduck@1.0.0/index.svg
```

Latest:

```
https://unpkg.com/classroomduck/index.html
https://unpkg.com/classroomduck/index.svg
```

## What's inside

- `index.html` — single-file HTML build (JS and essential images inlined, non-essential images under `imgs/`).
- `index.svg` — SVG-wrapped build that renders the whole app inside a `<foreignObject>`.
- `imgs/` — non-essential images referenced by both builds as `./imgs/…`.

# Fondos de Sálvese quien pueda! — prompts para generar

Diez imágenes, cinco por tablero. Generalas con ChatGPT (DALL·E) o con Gemini
("nano banana") y guardalas **en esta misma carpeta**
(`juegos/salvese/tv/public/fondos/`) con **estos nombres exactos**:

```
juegos/salvese/tv/public/fondos/
  fogata-cerro.jpg
  fogata-vado.jpg
  filo-noche.jpg
  bosque-bajo.jpg
  amanecer-sierra.jpg
  salitral-luna.jpg
  medano-noche.jpg
  aguada.jpg
  monte-bajo.jpg
  amanecer-sal.jpg
```

El nombre importa: el código busca cada archivo por ese id exacto
(`packages/tableros` ya lista estos diez nombres en `fondos: [...]` de cada
tablero). Si el archivo no está, el juego no se rompe — sigue mostrando el
fondo de degradé plano que hay hoy. Los vas agregando de a uno cuando estén
listos, sin tocar código.

**Formato**: JPG, apaisado, lo más ancho posible (16:9 o más). Pedile al
generador `1920x1080` o `1792x1024` — lo que el degradé y las siluetas de la
gente/el fuego (que siguen siendo CSS, no imagen) necesitan es que la parte
central-inferior de la imagen quede relativamente despejada, sin nada
importante ahí, porque ahí es donde se dibuja encima la caravana.

---

## Estilo — pegar esto al principio de cada prompt

```
Paper cutout diorama illustration, layered papercraft art style, like a
miniature stage made of cut and folded paper. Soft directional lighting
casting gentle blurred shadows between each paper layer (soft shadow, not
hard-edged). Each shape has subtle gradient shading across its surface,
suggesting the facets and folds of the paper catching light — not flat solid
color. Rounded, slightly imperfect organic edges, as if cut by hand.
Wide cinematic landscape composition, 16:9. No text, no watermark, no logo.
No people, no campfire, no animals — environment only. The lower-center third
of the frame should be visually calm and uncluttered (open ground, gentle
slope, or empty foreground) to leave room for other elements added later.
```

## Estilo — pegar esto al final de cada prompt

```
Muted, slightly desaturated color palette. Night scene lit primarily by cool
moonlight and starlight, with no warm light source in the image itself.
```

---

## La Sierra — frío, de noche, cerros

Paleta de referencia (para que el generador la use como guía de color):
cielo `#0b1020`, cerro lejano `#2a3450`, cerro medio `#161d31`, cerro cercano
`#080b14`. El único cálido de toda la escena es la brasa del fuego (`#ff7a3c`)
— y esa la dibuja el juego, no va en la imagen.

### `fogata-cerro.jpg`
> Escena central del tablero: campamento a media altura en la sierra.
> A high mountain campsite at night, layered snow-dusted peaks rising in the
> background in progressively lighter shades of blue-grey the further back
> they sit, a small flat clearing of dark rocky ground in the foreground,
> a few sparse pine silhouettes at the edges of the frame (not centered).
> Stars visible in the dark blue-black sky above the peaks.

### `fogata-vado.jpg`
> A calm river ford at night, low rolling hills instead of sharp peaks, a
> shallow paper-cutout stream catching a thin sliver of moonlight, smooth
> pebble-shaped rocks along the bank, gentle terrain, open flat ground near
> the water's edge in the lower-center of the frame.

### `filo-noche.jpg`
> A narrow, exposed mountain ridge at night, steep drops on both sides
> suggested by layered paper cliff shapes, wind-swept and stark, sparse
> vegetation, a strong sense of height and exposure, the sky dominates more
> of the frame than usual with sharp jagged peak silhouettes cutting into it.

### `bosque-bajo.jpg`
> A sheltered low forest clearing at night, dense layered tabaquillo-like
> trees with soft rounded paper-cutout canopies overlapping at different
> depths, filtered moonlight through gaps in the canopy, a small clear patch
> of forest floor in the lower-center of the frame, cozy and enclosed rather
> than vast.

### `amanecer-sierra.jpg`
> The same mountain range at the first light of dawn, not full daylight —
> the sky transitions from the same deep night blue at the top of the frame
> into soft warm pink and pale gold near the horizon line, mountain peaks
> catching the first warm light on their upper edges while their lower
> slopes remain in cool blue shadow, a sense of arrival and relief.

---

## El Salitral — seco, de noche, sal y médanos

Paleta de referencia: cielo `#080d1c`, cerro lejano `#3a3550`, cerro medio
`#1d1a2c`, cerro cercano `#0a0910`. El cálido de esta paleta es más ámbar que
naranja (`#ffb05e`) — tampoco va en la imagen, es la brasa del fuego.

### `salitral-luna.jpg`
> A vast flat salt pan under a bright full moon, the cracked white salt
> surface catching moonlight in a pale silver-blue sheen, layered paper-cut
> texture showing the hexagonal crack pattern of dried salt flats, completely
> flat horizon line far in the background, open and empty, a huge dark
> star-filled sky taking up most of the frame.

### `medano-noche.jpg`
> Rolling sand dunes at night, soft undulating layered paper shapes with
> smooth wind-carved curves, one dune's shadow side in deep purple-blue,
> the moonlit side in pale warm grey, no vegetation, a sense of vastness
> and isolation, open sandy ground in the lower-center foreground.

### `aguada.jpg`
> A small desert waterhole at night, a circular patch of dark still water
> reflecting the moon, ringed by a few sparse thorny desert shrubs rendered
> as spiky paper-cutout silhouettes, cracked dry ground surrounding the
> water, the one place in the frame that feels like relief from the dryness
> around it.

### `monte-bajo.jpg`
> Low desert scrubland at night, sparse thorny bushes and low twisted trees
> as layered paper silhouettes of varying heights, dry cracked earth between
> them, a wide low horizon, sparse and thorny rather than lush, open ground
> in the lower-center of the frame.

### `amanecer-sal.jpg`
> The salt flat at first light, the deep night sky at the top of the frame
> fading into warm pale gold and soft coral near the horizon, the white salt
> surface below reflecting both the cool blue above and the warm colors near
> the horizon in a soft gradient, calm and vast, sense of an ending.

---

## Si algo no te convence

No hace falta que las diez sean perfectas para empezar. Con
`fogata-cerro.jpg` y `salitral-luna.jpg` solos ya se ve el cambio completo en
pantalla — son los que más tiempo está mirando la mesa. El resto se puede ir
sumando después sin tocar código.

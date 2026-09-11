# Vocales para trazar — pedido de assets

Minijuego de TukuToon donde chicos de 2 a 5 años aprenden a escribir las vocales
siguiendo el camino con el dedo.

---

## El pedido

| | |
|---|---|
| **Obligatorio** | 10 PNG — las 5 vocales en mayúscula y minúscula, a color |
| **Muy recomendado** | La tinta de cada trazo por separado (ver abajo) |
| **No hace falta** | Contorno, gris, ni la letra "con el primer trazo hecho" |
| **Lienzo** | 2000 × 2000 px, cuadrado, el mismo para todas |
| **Además** | Cómo se escribe cada letra (orden y dirección) |

### Lo que NO hay que mandar

**La letra en cada estado de trazado.** El juego no salta entre imágenes fijas:
revela el color de forma continua detrás del dedo, a medida que avanza. Mandar
estados fijos daría saltos en vez de un revelado suave, y serían unas 25 piezas
más para un resultado peor.

**El contorno o la versión gris.** El juego la genera desaturando la de color.

---

## Lo que sí conviene: la tinta de cada trazo

No cómo *se ve* en cada paso — **la tinta de cada trazo por separado.**

La A partida en tres PNG: la diagonal izquierda sola, la diagonal derecha sola,
la barrita sola. Cada una en el mismo lienzo, con transparencia. Las tres juntas
dan la A completa.

### Por qué

Hoy el juego usa una línea de ancho fijo como máscara de revelado, y el arte no
tiene ancho fijo: las piernas de la A van de 226 a 342. Eso deja dos problemas que
venimos parchando:

- **Bordes grises** en las partes más gordas del trazo.
- **Sangrado entre trazos**: al completar las dos diagonales de la A, la máscara
  tapaba también la barrita, así que el chico veía la letra terminada y el juego
  le pedía un trazo más.

Con la tinta real de cada trazo, la cobertura es exacta y los dos desaparecen.

Además **la `a` y la `u` podrían volver a ser de dos trazos**: hoy son de uno
porque el palito derecho vive dentro de la panza y no le queda nada propio que
revelar. Si vos decidís qué tinta le toca a cada trazo, deja de ser una limitación
técnica y pasa a ser una decisión de diseño tuya.

### Cuáles hacen falta

Solo las letras de **más de un trazo**:

| Letra | Trazos | Piezas |
|---|---|---|
| A | 3 | `mayus-A-t1.png` `-t2` `-t3` |
| E | 4 | `mayus-E-t1.png` … `-t4` |
| I | 3 | `mayus-I-t1.png` … `-t3` |
| a | 2 | `minus-a-t1.png` `-t2` |
| e | 2 | `minus-e-t1.png` `-t2` |
| u | 2 | `minus-u-t1.png` `-t2` |

La **O**, la **o** y la **i** son de un trazo: no las necesitan.

Son 16 piezas extra, y hay que numerarlas en orden de escritura (`t1` es el
primero).

### La regla que lo simplifica

**No te preocupes por los cruces.** Que cada capa tenga todo lo que ese trazo
dibuja, aunque se pise con otra en el vértice de la A o donde la barrita toca las
piernas. El solapamiento no molesta — el juego revela por orden.

### En Photoshop

Si ya tenés la letra armada por partes, es exportar cada parte con el resto
apagado. Si está en una sola capa, hay que separarla: normalmente alcanza con
duplicar la capa y borrar de cada copia lo que no es ese trazo.

---

## Cómo se usa el arte

El chico ve la letra apagada, y el color va apareciendo detrás de su dedo a medida
que recorre el camino correcto.

Por dentro el juego pone dos copias de tu PNG una encima de la otra: la de abajo
desaturada (el estado "todavía no trazada") y la de arriba a color, que se va
descubriendo con una máscara que sigue el trazo.

Por eso alcanza con una sola versión de cada letra.

---

## Los trazos

Un **trazo** es un movimiento seguido del dedo, sin levantarlo. La A son tres: una
diagonal, la otra diagonal y la barrita. La o es uno solo.

El juego lleva al chico **de a un trazo por vez**: enciende el primero, le pone una
manita en el punto de arranque y una flecha en la punta; cuando lo completa, ese
trazo se apaga, suena un premio y se enciende el siguiente.

Por eso hacen falta tres datos por letra que el dibujo no puede contar: **cuántos
trazos son**, **en qué orden** y **hacia dónde va cada uno**. Si la dirección está
invertida, la flecha y la manita apuntan al lado equivocado y el chico practica el
movimiento al revés.

### Cómo está armado hoy

Revisá esta tabla y corregí lo que no coincida con tu criterio. Es más rápido
corregirla que armarla de cero.

| Letra | Cómo se escribe | Trazos |
|---|---|---|
| **A** | Diagonal izquierda desde la punta hacia abajo · diagonal derecha igual · la barrita de izquierda a derecha | 3 |
| **E** | El palito vertical de arriba abajo · después las tres barras, de arriba hacia abajo, cada una de izquierda a derecha | 4 |
| **I** | El palito de arriba abajo · barra de arriba · barra de abajo, las dos de izquierda a derecha | 3 |
| **O** | Una vuelta entera, arrancando arriba y girando en contra del reloj | 1 |
| **U** | Baja por la izquierda, dobla abajo y sube por la derecha | 1 |
| **a** | El óvalo, arrancando arriba y en contra del reloj. Hoy va en **1 trazo**: el palito derecho vive dentro de la panza y no le queda tinta propia. Con las capas por trazo vuelve a ser 2 | 1 |
| **e** | La barrita horizontal de izquierda a derecha · desde ese extremo derecho, la vuelta completa en contra del reloj | 2 |
| **i** | El palito de arriba abajo. El punto no se traza: se toca | 1 + punto |
| **o** | Igual que la O mayúscula | 1 |
| **u** | Baja por la izquierda y dobla abajo · el palito derecho de arriba abajo | 2 |

### Dos reglas del motor

No son preferencias de diseño. Si no se cumplen, el juego falla.

**1. Un trazo no puede volver sobre sí mismo.**
Si sube y baja por la misma línea, el recorrido se adelanta solo: los puntos de la
rama de vuelta quedan pegados al dedo y el juego los da por hechos. Lo probamos con
la u y se salteaba la punta entera del palito. Si el movimiento necesita ir y
volver, **son dos trazos, no uno**.

**2. El punto de la i no es un trazo.**
Un punto no tiene largo, así que no se puede recorrer. Se resuelve distinto:
terminado el palito, el punto late y el chico lo toca. Si alguna letra tiene otro
elemento suelto parecido, avisá y lo tratamos igual.

### Ante la duda, menos trazos

Un chico de 2 años llega mejor a una letra de un trazo continuo; uno de 5 puede con
la E de cuatro. Que pueda terminar la letra importa más que la fidelidad caligráfica.

### Cómo pasarnos esta info

Con una captura de cada letra con numeritos y flechitas alcanza. No hace falta
dibujar nada aparte.

---

## La grilla

Lo que la grilla resuelve no es cuánto mide una letra, sino que **las diez midan y
se apoyen igual**, para que al pasar de una a otra no salte de tamaño ni de posición.

En Photoshop: un lienzo fijo con las guías puestas, y cada letra alineada contra
esas guías. Cada export sale del lienzo entero, así que todas caen en el mismo lugar
sin trabajo extra.

Estos números están sobre un lienzo de 1000. **Para un PSD de 2000 × 2000,
multiplicá todo por dos.**

| Guía | Qué apoya ahí | y |
|---|---|---|
| Alto de mayúscula | Arriba de la A, E, I, O, U | 115 |
| Punto de la i | Arriba del puntito suelto de la i | 315 |
| Alto de minúscula | Arriba de la a, e, o, u | 435 |
| Línea de base | Abajo de todas las letras | 890 |

Cada letra **centrada horizontalmente** en el lienzo.

Estos números los medimos sobre las letras que ya mandaste, así que tu arte ya está
prácticamente en esta grilla.

---

## El export

Todo se resuelve con una decisión: **un solo PSD, lienzo fijo, una capa por letra.**

1. **Un PSD de 2000 × 2000 px**, fondo transparente.
2. **Tirá las guías** de línea de base, alto de mayúscula y alto de minúscula
   (Vista → Guía nueva). Las dejás fijas para las diez.
3. **Una capa o grupo por letra**, todas en el mismo documento, cada una centrada y
   apoyada en la línea de base.
4. **Para exportar:** dejá visible una sola letra y usá
   **Archivo → Exportar → Exportación rápida como PNG**. Eso saca el lienzo entero,
   que es lo que necesitamos. Repetís con cada letra.

### Tres cosas que rompen el export

Las tres pasan sin dar error: el archivo sale bien, se abre bien, y el problema
aparece recién al enchufarlo al juego.

**Exportar la capa en vez del lienzo.**
Si hacés clic derecho sobre la capa y elegís "Exportar como", Photoshop recorta al
borde del dibujo: cada letra sale de un tamaño distinto y en otra posición, que es
justo lo que la grilla evita. Tiene que salir del **menú Archivo**, con el documento
entero.

**Todas las letras en una sola lámina.**
Una imagen con las diez juntas obliga a recortarlas a mano una por una. Que convivan
en el mismo PSD está perfecto — es lo cómodo — pero cada export tiene que traer una
sola letra visible.

**Aplanar o rasterizar con fondo.**
El PNG tiene que salir con transparencia real. Si queda con fondo blanco, en el juego
se ve un cuadrado blanco atrás de la letra.

### PNG derecho, no SVG

Photoshop trabaja en píxeles, así que un SVG que salga de ahí va a llevar un PNG
adentro igual — pero pesando un 33% más por la codificación. El PNG directo es más
liviano y el juego lo usa igual.

### Los nombres

```
mayus-A.png    minus-a.png
mayus-E.png    minus-e.png
mayus-I.png    minus-i.png
mayus-O.png    minus-o.png
mayus-U.png    minus-u.png
```

Los prefijos `mayus-` / `minus-` son necesarios: Windows no distingue mayúsculas de
minúsculas en los nombres de archivo, así que `A.png` y `a.png` serían el mismo
archivo y uno pisaría al otro sin avisar.

---

## Sobre la primera entrega

Las diez letras que mandaste **ya están funcionando en el juego**. La línea de base
te dio clavada (las diez entre 882 y 895 sobre 1000) y el centrado horizontal es
exacto: las diez tienen su centro en 500.

Lo que no coincide es el alto.

| Letra | Alto | Qué pasa |
|---|---|---|
| A | 769 | Referencia |
| U | 772 | Bien |
| I | 776 | Bien |
| O | 783 | Bien — el +1,4% de las redondas es correcto |
| **E** | **808** | **5% más alta.** Es plana arriba y abajo, no tiene por qué sobresalir. Achicar a ~772 |
| a | 455 | Referencia |
| u | 457 | Bien |
| e | 478 | 5% más alta. Achicar a ~463 |
| **o** | **501** | **10% más alta.** Achicar a ~463 |

Que las redondas sean un poco más altas es correcto y se hace a propósito: una o del
mismo alto que una a se ve más chica. Pero lo normal es 1 a 3%, y acá la o está 10%
arriba. **Al corregir, dejá la línea de base donde está y sacá el alto de arriba.**

### La u minúscula no tiene colita

Las dos patas terminan a la misma altura (1 píxel de diferencia). Habíamos pensado
que el palito derecho bajara un poco más que la panza. Por ahora el juego se adaptó a
la versión sin colita, así que **es opcional**.

### Un detalle técnico menor

Los archivos que llegaron dicen `data:img/png` cuando el estándar es
`data:image/png`. Los navegadores lo toleran, pero puede romper en otras
herramientas. Con PNG derecho el problema desaparece solo.

---

## Una pregunta

**¿El camino guía lo dibujás o lo generamos?**

Es lo que el chico ve antes de trazar. Hoy el juego muestra tu propia letra
desaturada, con una línea punteada y una flecha encima. Si preferís un camino
dibujado por vos se puede, pero hay que entregarlo **por trazo** — unas 22 piezas
más.

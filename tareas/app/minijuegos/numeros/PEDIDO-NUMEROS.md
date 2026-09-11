# Números para trazar — pedido de assets

Minijuego de TukuToon donde chicos de 2 a 5 años aprenden a escribir los números
siguiendo el camino con el dedo. Es el mismo juego que el de las vocales, con el
mismo motor: cambia solo el contenido.

---

## Lo importante primero: el juego ya funciona

**Hoy no hace falta ningún asset para jugarlo.** Las diez cifras de `cifras/` las
generamos nosotros a partir de los ejes de trazado, y son provisorias: están para
que el juego se pueda probar, no para publicarlo.

Cuando llegue tu arte **se reemplazan los archivos con el mismo nombre y listo**. No
se toca ni el motor ni `numeros.js`. Lo único que revisamos nosotros después son los
ejes de trazado, que tienen que caer en el centro del trazo de tu dibujo.

---

## El pedido

| | |
|---|---|
| **Obligatorio** | 10 PNG — las cifras del 0 al 9, a color |
| **Muy recomendado** | La tinta de cada trazo por separado (solo el 1, el 4, el 5 y el 7) |
| **Opcional** | El contorno hueco de cada cifra |
| **No hace falta** | La versión gris, ni la cifra "con el primer trazo hecho" |
| **Lienzo** | 2000 × 2000 px, cuadrado, el mismo para todas |
| **Además** | Cómo se escribe cada número (orden y dirección) — ya está propuesto abajo |

### Lo que NO hay que mandar

**La cifra en cada estado de trazado.** El juego no salta entre imágenes fijas:
revela el color de forma continua detrás del dedo, a medida que avanza. Mandar
estados fijos daría saltos en vez de un revelado suave.

**La versión gris.** El juego la genera sola desaturando la de color.

---

## Los nombres de archivo

Van todos en `numeros/cifras/`. El nombre es el que el juego busca, así que tiene
que ser exactamente este:

| Pieza | Nombre | Cuántos |
|---|---|---|
| La cifra a color | `0.png` … `9.png` | 10 |
| El contorno hueco (opcional) | `0-contorno.png` … `9-contorno.png` | 10 |
| La tinta de cada trazo | `1-t1.png` `1-t2.png`, `4-t1.png` `4-t2.png`, `5-t1.png` `5-t2.png`, `7-t1.png` `7-t2.png` | 8 |

El `t1` es siempre el **primer** trazo en el orden de escritura.

El 0, 2, 3, 6, 8 y 9 son de un solo trazo: su tinta es la cifra entera, así que no
hay que separar nada (igual las generamos nosotros desde tu PNG).

---

## La tinta de cada trazo

No cómo *se ve* en cada paso — **la mancha de cada trazo por separado.**

El 4 partido en dos PNG: la diagonal con su base en uno, el palito vertical en el
otro. Los dos juntos dan el 4 completo.

### Por qué

La máscara que revela el color es, sin esto, una línea de ancho fijo sobre el eje
del trazo. Como el arte no tiene ancho constante, eso deja **bordes sin cubrir** en
las partes más gordas y **sangra sobre el trazo vecino** en los cruces — el chico ve
la cifra terminada y el juego le pide un trazo más.

Con la tinta real de cada trazo la cobertura es exacta y los dos problemas
desaparecen.

### La regla que lo simplifica

**No te preocupes por los cruces.** Que cada capa tenga todo lo que ese trazo
dibuja, aunque se pise con la otra donde el palito del 4 cruza la base. El
solapamiento no molesta: el juego revela por orden.

### En Photoshop

Si ya tenés la cifra armada por partes, es exportar cada parte con el resto apagado.
Si está en una sola capa, alcanza con duplicarla y borrar de cada copia lo que no es
ese trazo.

---

## Los trazos

Un **trazo** es un movimiento seguido del dedo, sin levantarlo. El 4 son dos: la
diagonal con su base, y el palito. El 0 es uno solo.

El juego lleva al chico **de a un trazo por vez**: enciende el primero, le pone una
manita en el punto de arranque y una flecha en la punta; cuando lo completa, ese
trazo se apaga, suena un premio y se enciende el siguiente.

Por eso hacen falta tres datos por cifra que el dibujo no puede contar: **cuántos
trazos son**, **en qué orden** y **hacia dónde va cada uno**.

### Cómo está armado hoy

Revisá esta tabla y corregí lo que no coincida con tu criterio. Es más rápido
corregirla que armarla de cero.

| Número | Cómo se escribe | Trazos |
|---|---|---|
| **0** | Una vuelta entera, arrancando arriba y girando hacia la izquierda (en contra del reloj) | 1 |
| **1** | La banderita de abajo hacia arriba · el palito de arriba hacia abajo | 2 |
| **2** | La curva de arriba, la bajada en diagonal y la base, todo sin levantar el dedo | 1 |
| **3** | Las dos pancitas de un tirón, la de arriba y después la de abajo | 1 |
| **4** | Baja en diagonal y cruza a la derecha · el palito de arriba hacia abajo | 2 |
| **5** | Baja el palito y da la panza · el sombrerito de arriba, de izquierda a derecha | 2 |
| **6** | Baja la curva grande y al final da la vuelta de la panza | 1 |
| **7** | El techo de izquierda a derecha · la bajada en diagonal | 2 |
| **8** | Rueda de arriba, cruce al medio y rueda de abajo, todo de un tirón | 1 |
| **9** | Primero la rueda, en contra del reloj · y sin levantar, la bajada | 1 |

El **5** es el único donde el orden puede discutirse: hay cuadernos que arrancan por
el sombrerito. Lo dejamos para el final porque así el chico no levanta el dedo en el
medio del movimiento largo.

### La regla del motor que no se puede romper

**Un trazo no puede volver sobre sí mismo.** Si sube y baja por la misma línea, el
recorrido se adelanta solo: los puntos de la rama de vuelta quedan pegados al dedo y
el juego los da por hechos. Si el movimiento necesita ir y volver, **son dos trazos,
no uno**.

### Ante la duda, menos trazos

Un chico de 2 años llega mejor a una cifra de un trazo continuo. Que pueda terminar
el número importa más que la fidelidad caligráfica.

### Cómo pasarnos esta info

Con una captura de cada cifra con numeritos y flechitas alcanza.

---

## La grilla

Lo que la grilla resuelve no es cuánto mide una cifra, sino que **las diez midan y
se apoyen igual**, para que al pasar de una a otra no salte de tamaño ni de posición.

Es **la misma grilla que las vocales**, así los dos juegos se ven parejos.

Estos números están sobre un lienzo de 1000. **Para un PSD de 2000 × 2000,
multiplicá todo por dos.**

| Guía | Qué apoya ahí | y |
|---|---|---|
| Alto de cifra | Arriba del 0 al 9 (el mismo alto que la A, E, I, O, U) | 115 |
| Línea de base | Abajo de todas las cifras | 890 |

Cada cifra **centrada horizontalmente** en el lienzo (x = 500 en el lienzo de 1000,
x = 1000 en el de 2000).

El 1 es más angosto que el resto: se centra igual, no se estira.

---

## El export

**Un solo PSD de 2000 × 2000, lienzo fijo, una capa por cifra.**

1. Fondo **transparente**.
2. **Tirá las guías** de alto de cifra y línea de base (Vista → Guía nueva) y
   dejalas fijas para las diez.
3. **Una capa o grupo por cifra**, todas en el mismo documento, cada una centrada y
   apoyada en la línea de base.
4. **Para exportar:** dejá visible una sola cifra y usá
   **Archivo → Exportar → Exportación rápida como PNG**. Eso saca el lienzo entero,
   que es lo que necesitamos. Repetís con cada una.

### Tres cosas que rompen el export

Las tres pasan sin dar error: el archivo sale bien, se abre bien, y el problema
recién aparece en el juego.

- **Recortar al contenido.** Si el PNG sale ajustado a la cifra en vez del lienzo
  entero, cada una queda de un tamaño distinto y saltan de posición al cambiar de
  número. El export tiene que ser siempre del lienzo completo.
- **Fondo blanco en vez de transparente.** Sobre el pizarrón verde se ve el
  rectángulo blanco alrededor de la cifra.
- **Mover las guías entre una cifra y otra.** Es lo que la grilla justamente evita.

---

## Lo que no hace falta que mandes

Ni fondo, ni botones, ni estrellas, ni la manita, ni sonidos: todo eso ya está en el
juego. El aula y el pizarrón son los mismos del juego de vocales.

Sí sería bienvenido, pero **más adelante y por separado**:

- **La voz de cada número** (`cero`, `uno`, `dos`…), en mp3 de menos de 1,5 s. Hoy
  lo lee la voz del dispositivo.
- **Una ilustración por número** para la tarjeta final, en vez del emoji repetido
  que mostramos hoy (3 → 🍎🍎🍎). PNG 512 × 512 con transparencia.

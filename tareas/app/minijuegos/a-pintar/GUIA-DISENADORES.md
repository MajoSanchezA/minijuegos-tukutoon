# Cómo entregar un dibujo para "Colorea con TukuToon"

Guía para el equipo de diseño. El juego es un libro de colorear digital para chicos de 2 a 5
años: el nene toca una zona y se rellena de color (balde), o pinta libre con distintos pinceles.

---

## Resumen en 30 segundos

- **Dibujar en vector** (Illustrator o Figma).
- **Entregar un PNG** de línea: **1500 × 1000 px, horizontal, fondo blanco opaco, líneas
  negras cerradas de 6–10 px.**
- Entregar también el **archivo fuente** y una **paleta de 8–10 colores** en hexadecimal.

---

## 1. Por qué vector si el entregable es PNG

El motor del juego lee los píxeles del PNG, detecta las líneas por oscuridad y calcula las
zonas cerradas para poder rellenarlas. No lee curvas ni capas: es un proceso sobre píxeles.
Por eso el archivo que consume el juego es un PNG.

Pero el dibujo tiene que **nacer en vector**, porque:

- El vector garantiza que **cada zona sea un contorno cerrado**. En un dibujo hecho a mano o
  escaneado hay huecos de 1 píxel que no se ven, y el relleno se escapa por ahí y pinta media
  ilustración de un solo color.
- El grosor de trazo queda **uniforme y controlable**.
- Se puede **re-exportar a otro tamaño** más adelante sin volver a dibujar.

---

## 2. Especificación del PNG

| | |
|---|---|
| **Formato** | PNG |
| **Tamaño** | **1500 × 1000 px** (proporción 3:2) |
| **Orientación** | **Horizontal**, siempre |
| **Fondo** | **Blanco opaco `#FFFFFF`** — NO transparente |
| **Líneas** | Negro `#000000` o casi negro |
| **Grosor de línea** | **6 a 10 px** medidos en el tamaño final de export |
| **Relleno de las zonas** | Blanco. El dibujo va **sin colorear** |
| **Nombre del archivo** | minúsculas, sin acentos ni espacios: `dinosaurio.png` |

**Sobre la orientación:** el juego se ve siempre apaisado (en el celular se rota solo), y las
barras de pinceles y colores van a los costados. Un dibujo vertical se ve chiquito en el
medio con huecos grandes a los lados. Horizontal, siempre.

**Sobre el tamaño:** 1500 × 1000 no es capricho. Más grande no se ve mejor (la pantalla no da
para más) y sí se nota al abrir: el motor recorre el dibujo píxel por píxel para calcular las
zonas, así que el doble de tamaño es el cuádruple de trabajo. En una tablet económica se
siente.

**Sobre el grosor:** si el trazo es muy fino, al exportar queda suavizado (gris claro en los
bordes) y el motor no lo reconoce como pared → el color se escapa a la zona de al lado.
6–10 px es el rango seguro.

---

## 3. Los cinco errores que rompen el juego

Estos no son detalles estéticos: hacen que el juego no funcione.

### 1. Fondo transparente
**El peor de todos.** El motor interpreta el transparente como negro, así que toma TODO el
fondo como si fuera línea. Resultado: el dibujo aparece como un rectángulo negro y no se
puede pintar nada. El fondo tiene que ser **blanco opaco**.

### 2. Contornos abiertos
Cualquier hueco, por chico que sea, conecta dos zonas. El nene toca el sombrero y se le pinta
también la cara. **Cada zona para pintar tiene que ser un contorno cerrado.**

### 3. Líneas grises o de color claro
El motor toma como línea todo lo que sea más oscuro que un gris medio (aprox. `#AFAFAF`).
Una línea más clara que eso simplemente no existe para el juego: la zona queda abierta.
**Negro o casi negro.**

### 4. Sombras, degradados o grises de relleno
Todo lo que sea más oscuro que ese gris medio se convierte en **pared no pintable**. Un
sombreado gris queda como una mancha que el nene no puede colorear. **Solo línea negra sobre
blanco.** Nada de volumen, texturas ni tramas.

### 5. Zonas demasiado chicas
Un dedo de 3 años no acierta un detalle de 20 px. **Ninguna zona para pintar más chica que
~60 × 60 px** (medido a 1500 px de ancho). Si un detalle es más chico que eso, mejor
simplificarlo o unirlo a la zona vecina.

---

## 4. Checklist antes de entregar

- [ ] Es horizontal y mide 1500 × 1000 px
- [ ] El fondo es blanco opaco (abrilo sobre una capa de color fuerte: no se tiene que ver a través)
- [ ] Las líneas son negras y parejas, entre 6 y 10 px
- [ ] Todas las zonas están cerradas — sin huecos
- [ ] No hay grises, sombras, degradados ni texturas
- [ ] No hay zonas para pintar más chicas que 60 × 60 px
- [ ] El dibujo está sin colorear
- [ ] El nombre del archivo va en minúsculas, sin acentos ni espacios

---

## 5. Qué más entregar, además del PNG

**a) El archivo fuente** (`.ai`, `.svg`, o el link de Figma).
Para poder re-exportar a otro tamaño más adelante sin volver a molestarlos.

**b) La paleta del personaje: 8 a 10 colores en hexadecimal.**
Cada dibujo muestra su propia paleta en el juego, muestreada del arte oficial a color, para
que el nene pueda pintarlo con los colores "de verdad" del personaje. Ejemplo del formato:

```
#B35D8A  #F9DBBC  #D64973  #93C5D5  #180F0E  #F7F7F8  #E98489  #A6A6A6  #232C49
```

Conviene incluir el negro/oscuro del personaje y un blanco o crema.

**c) (Deseable) La versión a color del mismo dibujo**, en PNG del mismo tamaño.
Todavía no se usa, pero está planeado un modo "colorea como el modelo" que muestra la
referencia al lado. Si lo exportan ahora que tienen el archivo abierto, nos ahorramos pedirlo
después.

---

## 6. Cómo se ve después en el juego

El dibujo se apoya sobre una hoja, sobre una mesa. Las barras de herramientas y colores van a
los costados. Todo entra en una sola pantalla, sin scroll, y en el celular se rota solo para
verse apaisado aunque el nene tenga el teléfono parado.

Herramientas disponibles para pintar: balde (rellena la zona entera), marcador, lápiz,
acuarela, aerosol, brillantina y borrador.

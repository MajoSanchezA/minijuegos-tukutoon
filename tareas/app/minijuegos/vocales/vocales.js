/* =====================================================================
   VOCALES — fuente de verdad del contenido del juego de trazos.
   Igual que `paginas.js` en a-pintar, es .js y NO .json a proposito: se
   carga con <script src> para que la pagina funcione tanto abierta por
   doble clic (file://) como servida por http, sin depender de fetch().

   SISTEMA DE COORDENADAS: 1000 x 1000, el mismo lienzo en el que el
   disenador exporto el arte. Todas las letras comparten linea de base
   (y ~ 885) y estan centradas en x = 500.

   Cada forma (mayus / minus) tiene:
     arte     el SVG del disenador, que se muestra en gris (sin trazar)
              y a color (revelado por donde ya paso el dedo).
     strokes  las lineas de trazado. NUNCA se ven: solo manejan por donde
              va el dedo, cuanto color se revela y donde se para la manita.
              Estan medidas contra el arte real, pasando por el centro de
              cada trazo — se verificaron muestreandolas contra el mapa de
              opacidad del PNG (cero puntos fuera de la letra).
     grosor   ancho de la mascara de revelado, en unidades del viewBox.
              Un poco mas ancho que el trazo del arte, para que el color
              lo cubra entero incluido el contorno.
     punto    solo la i: el puntito no es un trazo (un punto no tiene
              largo, no se puede recorrer). Se toca. Ver el motor.
     caja     el viewBox con que se muestra esa forma. Las minusculas
              viven en la mitad de abajo del lienzo, asi que si se
              mostraran con el lienzo entero quedarian al 59% del tamano
              de una mayuscula: correcto tipograficamente, pero un blanco
              innecesariamente chico para un dedo de 3 anos. Con su propio
              encuadre quedan al 86% — se siguen leyendo mas chicas, pero
              se pueden trazar. El arte y las lineas escalan juntos porque
              comparten el mismo sistema de coordenadas.

   El ORDEN de `strokes` es el orden de escritura, y el sentido de cada
   path es la direccion en la que hay que trazarlo. Coincide con la lamina
   de referencia: A(3) E(4) I(3) O(1) U(1) · a(2) e(2) i(1+punto) o(1) u(2).
   ===================================================================== */
var VOCALES = [

<<<<<<< Updated upstream
  { letter:'E', color:'#EF658E', emoji:'🐘', word:'Elefante',
    mayus:{ strokes:[
      'M80 60 L80 340',       // palito vertical
      'M80 60 L225 60',       // barra de arriba
      'M80 200 L205 200',     // barra del medio
      'M80 340 L225 340'      // barra de abajo
    ], face:{x:160,y:130,s:.78} },
    minus:{ strokes:[
      // 1: la barrita horizontal, de izquierda a derecha
      'M84 240 L216 240',
      // 2: desde el extremo derecho de la barrita, la vuelta completa en
      //    contra del reloj. Partida en dos, el trazo ya no se cruza a si mismo.
      'M216 240 C216 190 186 150 150 150 C114 150 84 190 84 240 C84 290 114 330 150 330 C177 330 200 313 212 289'
    ], face:{x:150,y:283,s:.52} } },

  { letter:'I', color:'#2EC4B6', emoji:'🦎', word:'Iguana',
    mayus:{ strokes:[
      'M150 60 L150 340',     // 1: el palito vertical, de arriba abajo
      'M88 60 L212 60',       // 2: barra de arriba
      'M88 340 L212 340'      // 3: barra de abajo
    ], face:{x:150,y:205,s:.54} },
    minus:{ strokes:[
      'M150 180 L150 330'     // solo el palito...
    ], punto:{x:150,y:126,r:26},   // ...el punto no se traza, se toca
      face:{x:150,y:255,s:.5} } },
=======
  { letter:'A', color:'#FCCC54', emoji:'🐝', word:'Abeja',
    mayus:{
      caja:'0 0 1000 1000',
      arte:'letras/mayus-A.png',
      contorno:'letras/mayus-A-contorno.png',
      // La tinta de cada trazo, entregada por el disenador. Con esto la
      // mascara es exacta, asi que el grosor puede ser generoso: la tinta
      // lo recorta igual y no invade los trazos vecinos.
      tintas:['letras/mayus-A-t1.png','letras/mayus-A-t2.png','letras/mayus-A-t3.png'],
      grosor:420,
      strokes:[
        // 1: diagonal izquierda, DE ABAJO HACIA ARRIBA — arranca en el pie
        //    izquierdo y sube hasta la punta. Asi lo marco el disenador con
        //    el punto de arranque en su guia, y es mejor para chicos chicos:
        //    el trazo 1 termina en la punta y el trazo 2 arranca ahi mismo,
        //    sin tener que volver a ubicar el dedo en un punto lejano.
        //    (Los lados de esta A son curvos, no rectos.)
        'M250 800 C250 720 262 640 285 545 C320 420 420 300 500 210',
        // 2: diagonal derecha, igual
        'M500 210 C580 300 680 420 715 545 C738 640 750 720 750 800',
        // 3: la barrita, de izquierda a derecha
        'M285 588 L715 588'
      ] },
    minus:{
      caja:'155 330 690 690', arte:'letras/minus-a-relleno.svg', grosor:232,
      strokes:[
        // Un solo trazo: el ovalo, arrancando arriba y en contra del reloj.
        //
        // La caligrafia parte la `a` en dos (ovalo + palito derecho), y asi
        // estaba antes. Pero en ESTE arte la panza y el palito son la misma
        // tinta: el lado derecho del ovalo ES el palito. Al trazar la panza
        // se revelaba la letra entera y el segundo trazo se quedaba sin nada
        // que pintar — el chico veia la `a` terminada y el juego le pedia
        // otro trazo igual.
        //
        // Si el disenador dibuja el palito sobresaliendo un poco de la panza
        // (como la colita de la u), vuelve a tener territorio propio y esto
        // se parte en dos otra vez.
        'M500 534 C420 534 354 594 354 668 C354 742 420 803 500 803 C580 803 646 742 646 668 C646 594 580 534 500 534'
      ] } },

  { letter:'E', color:'#CC5444', emoji:'🐘', word:'Elefante',
    mayus:{
      caja:'0 0 1000 1000', arte:'letras/mayus-E-relleno.svg', grosor:270,
      strokes:[
        'M350 200 L350 758',   // 1: el palito vertical, de arriba abajo
        'M350 200 L700 200',   // 2: barra de arriba
        'M350 484 L560 484',   // 3: barra del medio (mas corta que las otras)
        'M350 758 L700 758'    // 4: barra de abajo
      ] },
    minus:{
      caja:'155 330 690 690', arte:'letras/minus-e-relleno.svg', grosor:236,
      strokes:[
        // 1: la barrita horizontal, de izquierda a derecha
        'M363 654 L637 654',
        // 2: desde ese extremo derecho, la vuelta completa en contra del
        //    reloj. Partida en dos, el trazo no se cruza a si mismo.
        'M637 654 C637 573 575 507 500 507 C425 507 363 573 363 654 C363 735 425 801 500 801 C555 801 600 770 620 725'
      ] } },
>>>>>>> Stashed changes

  { letter:'I', color:'#946CCC', emoji:'🦎', word:'Iguana',
    mayus:{
      caja:'0 0 1000 1000', arte:'letras/mayus-I-relleno.svg', grosor:290,
      strokes:[
        'M500 204 L500 785',   // 1: el palito, de arriba abajo
        'M370 204 L630 204',   // 2: barra de arriba
        'M370 785 L630 785'    // 3: barra de abajo
      ] },
    minus:{
      caja:'155 330 690 690', arte:'letras/minus-i-relleno.svg', grosor:242,
      strokes:[
        'M500 614 L500 790'    // 1: solo el palito...
      ],
      punto:{ x:500, y:409, r:95 }   // ...el punto no se traza, se toca
    } },

  { letter:'O', color:'#F49444', emoji:'🐻', word:'Oso',
    mayus:{
      caja:'0 0 1000 1000', arte:'letras/mayus-O-relleno.svg', grosor:282,
      strokes:[
        // una sola vuelta: arranca arriba y gira en contra del reloj
        'M500 228 C365 228 255 345 255 489 C255 633 365 750 500 750 C635 750 745 633 745 489 C745 345 635 228 500 228'
      ] },
    minus:{
      caja:'155 330 690 690', arte:'letras/minus-o-relleno.svg', grosor:236,
      strokes:[
        'M500 474 C420 474 354 543 354 630 C354 717 420 785 500 785 C580 785 647 717 647 630 C647 543 580 474 500 474'
      ] } },

  { letter:'U', color:'#64CCDC', emoji:'🍇', word:'Uvas',
    mayus:{
      caja:'0 0 1000 1000', arte:'letras/mayus-U-relleno.svg', grosor:310,
      strokes:[
        // un solo trazo: baja por la izquierda, dobla abajo y sube por la
        // derecha. Los lados de esta U se abren hacia abajo.
        'M316 240 C280 350 245 440 241 530 C238 650 350 763 500 763 C650 763 762 650 759 530 C755 440 720 350 684 240'
      ] },
    minus:{
      caja:'155 330 690 690', arte:'letras/minus-u-relleno.svg', grosor:236,
      strokes:[
        // 1: baja por la izquierda y da la curva de abajo
        'M377 529 L377 690 C377 775 450 792 500 792 C550 792 629 775 629 690',
        // 2: el palito derecho, de arriba hacia abajo.
        //    OJO: en este arte la u NO tiene colita — las dos patas terminan
        //    a la misma altura. Si el disenador la agrega, este trazo baja mas.
        'M629 529 L629 690'
      ] } }
];

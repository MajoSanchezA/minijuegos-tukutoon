/* =====================================================================
   VOCALES — fuente de verdad del contenido del juego de trazos.
   Igual que `paginas.js` en a-pintar, es .js y NO .json a proposito: se
   carga con <script src> para que la pagina funcione tanto abierta por
   doble clic (file://) como servida por http, sin depender de fetch().

   SISTEMA DE COORDENADAS: 1000 x 1000, el mismo lienzo en el que el
   disenador exporto el arte. Las diez letras estan centradas en x = 500 y
   apoyadas en la misma linea de base.

   Cada forma (mayus / minus) tiene:
     arte      el PNG a color: es lo que se ve cuando el trazo esta hecho.
     contorno  la letra hueca: el estado "todavia sin trazar".
     tintas    la tinta de cada trazo por separado. Con esto la mascara de
               revelado es exacta — cubre justo ese trazo y ni un pixel de
               los vecinos. Sin tintas el motor cae al modo viejo (una
               linea de ancho fijo sobre el eje), que deja borde sin cubrir
               y se mete en los trazos de al lado.
     strokes   los ejes de trazado. NUNCA se ven: manejan por donde va el
               dedo, cuanto se pinta de la linea guia y donde se para la
               manita.
     grosor    ancho de la mascara de avance. Con `tintas` puede ser
               generoso: la tinta lo recorta igual.
     punto     solo la i: el puntito no es un trazo (un punto no tiene
               largo, no se puede recorrer). Se toca.

   DE DONDE SALEN LOS EJES
   No estan dibujados a ojo ni calcados de una tipografia: se extrajeron
   del propio arte. Para cada tinta se calcula la distancia de cada pixel
   al borde y se camina por la cresta —el centro del trazo— sondeando tres
   pasos hacia adelante para no cortarse en las curvas. Las veinte se
   verificaron muestreandolas contra el mapa de opacidad: cero puntos fuera
   de la letra. Si el disenador cambia el arte, se vuelven a extraer; no
   hace falta redibujarlos.

   El ORDEN de `strokes` sigue la numeracion t1, t2... del disenador, y el
   sentido de cada path es la direccion en que hay que trazarlo.
   ===================================================================== */
var VOCALES = [

  { letter:'A', color:'#FCCC4C', emoji:'🐝', word:'Abeja',
    mayus:{
      arte:'letras/mayus-A.png',
      contorno:'letras/mayus-A-contorno.png',
      tintas:['letras/mayus-A-t1.png','letras/mayus-A-t2.png','letras/mayus-A-t3.png'],
      grosor:420,
      strokes:[
        // 1: diagonal izquierda, DE ABAJO HACIA ARRIBA — del pie a la punta.
        //    Lo marco asi el disenador con el punto de arranque, y encadena
        //    con el trazo 2, que sale de esa misma punta: el chico sube por
        //    un lado y baja por el otro sin reubicar el dedo.
        'M210 791 L491 206',
        // 2: diagonal derecha, de la punta hacia abajo
        'M570 327 L774 764',
        // 3: la barrita, de izquierda a derecha
        'M341 620 L647 619'
      ] },
    minus:{
      arte:'letras/minus-a.png',
      contorno:'letras/minus-a-contorno.png',
      tintas:['letras/minus-a-t1.png','letras/minus-a-t2.png'],
      grosor:380,
      strokes:[
        // 1: la panza, arrancando arriba y en contra del reloj (anillo cerrado)
        'M471 373 L396 397 L351 426 L318 463 L285 523 L274 573 L273 622 L282 669 L296 707 L344 770 L379 797 L416 816 L465 828 L511 829 L534 826 L574 809 L615 778 L653 733 L671 696 L684 652 L688 581 L678 530 L662 486 L626 437 L583 403 L548 382 L471 373',
        // 2: el palito derecho, de arriba hacia abajo. Tiene tinta propia
        //    (el disenador la separo), asi que le queda algo para revelar.
        'M728 393 L731 797'
      ] } },

  { letter:'E', color:'#E45444', emoji:'🐘', word:'Elefante',
    mayus:{
      arte:'letras/mayus-E.png',
      contorno:'letras/mayus-E-contorno.png',
      tintas:['letras/mayus-E-t1.png','letras/mayus-E-t2.png',
              'letras/mayus-E-t3.png','letras/mayus-E-t4.png'],
      grosor:420,
      strokes:[
        'M292 220 L292 781',            // 1: el palito
        'M381 194 L697 194',            // 2: barra de arriba
        'M367 494 L561 493',                     // 3: barra del medio
        'M381 805 L705 804'    // 4: barra de abajo
      ] },
    minus:{
      arte:'letras/minus-e.png',
      contorno:'letras/minus-e-contorno.png',
      tintas:['letras/minus-e-t1.png','letras/minus-e-t2.png'],
      grosor:380,
      strokes:[
        // 1: la barrita horizontal, de izquierda a derecha
        'M339 602 L712 595',
        // 2: desde ese extremo, la vuelta en contra del reloj y salida abajo
        'M710 471 L698 448 L664 408 L603 374 L533 361 L462 367 L400 388 L344 431 L313 473 L288 536 L284 629 L291 675 L316 734 L333 758 L369 794 L428 826 L504 843 L578 841 L657 824'
      ] } },

  { letter:'I', color:'#A46CCC', emoji:'🦎', word:'Iguana',
    mayus:{
      arte:'letras/mayus-I.png',
      contorno:'letras/mayus-I-contorno.png',
      tintas:['letras/mayus-I-t1.png','letras/mayus-I-t2.png','letras/mayus-I-t3.png'],
      grosor:420,
      strokes:[
        'M500 220 L498 776',    // 1: el palito, de arriba abajo
        'M426 193 L567 193',    // 2: barra de arriba
        'M426 804 L567 803'     // 3: barra de abajo
      ] },
    minus:{
      arte:'letras/minus-i.png',
      contorno:'letras/minus-i-contorno.png',
      tintas:['letras/minus-i-t1.png'],
      grosor:380,
      strokes:[
        'M512 388 L512 792'     // 1: solo el palito...
      ],
      // ...el punto no se traza, se toca. El disenador lo mando como pieza
      // aparte (minus-i-t2.png); de ahi salen el centro y el radio.
      punto:{ x:513, y:166, r:78 },
      tintaPunto:'letras/minus-i-t2.png' } },

  { letter:'O', color:'#F48C34', emoji:'🐻', word:'Oso',
    mayus:{
      arte:'letras/mayus-O.png',
      contorno:'letras/mayus-O-contorno.png',
      tintas:['letras/mayus-O-t1.png'],
      grosor:420,
      strokes:[
        // una sola vuelta: arranca arriba y gira en contra del reloj
        'M483 186 L433 194 L392 207 L351 229 L313 256 L265 306 L238 351 L212 417 L204 468 L203 518 L215 590 L233 638 L269 698 L299 729 L332 756 L392 790 L443 805 L491 811 L559 805 L600 793 L661 761 L712 716 L742 680 L773 619 L791 557 L796 488 L786 420 L771 373 L736 310 L703 273 L666 241 L616 212 L547 192 L483 186'
      ] },
    minus:{
      arte:'letras/minus-o.png',
      contorno:'letras/minus-o-contorno.png',
      tintas:['letras/minus-o-t1.png'],
      grosor:380,
      strokes:[
        'M491 360 L441 368 L399 383 L355 410 L318 446 L278 517 L267 568 L266 613 L275 663 L289 702 L333 762 L373 794 L410 813 L462 829 L513 832 L562 822 L606 806 L671 757 L705 711 L723 666 L732 616 L732 568 L715 501 L694 463 L666 428 L620 393 L577 373 L491 360'
      ] } },

  { letter:'U', color:'#04CCDC', emoji:'🍇', word:'Uvas',
    mayus:{
      arte:'letras/mayus-U.png',
      contorno:'letras/mayus-U-contorno.png',
      tintas:['letras/mayus-U-t1.png'],
      grosor:420,
      strokes:[
        // un solo trazo: baja por la izquierda, dobla abajo y sube por la derecha
        'M254 203 L254 523 L261 594 L274 646 L313 719 L353 760 L402 789 L484 807 L541 803 L591 790 L616 778 L664 743 L683 722 L699 700 L723 651 L737 599 L744 542 L744 206'
      ] },
    minus:{
      arte:'letras/minus-u.png',
      contorno:'letras/minus-u-contorno.png',
      tintas:['letras/minus-u-t1.png','letras/minus-u-t2.png'],
      grosor:380,
      strokes:[
        // 1: baja por la izquierda, dobla abajo y sube por la derecha
        'M291 405 L292 650 L301 699 L318 742 L349 784 L387 812 L431 830 L478 838 L521 835 L611 790 L647 758 L677 716 L696 679 L707 640 L709 441',
        // 2: el palito derecho, de arriba hacia abajo
        'M709 464 L711 813'
      ] } }
];

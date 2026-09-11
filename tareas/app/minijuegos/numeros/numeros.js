/* =====================================================================
   NUMEROS — fuente de verdad del contenido del juego de trazos de numeros.
   Mismo formato y mismas reglas que `vocales.js`: es .js y NO .json a
   proposito, se carga con <script src> para que la pagina funcione tanto
   abierta por doble clic (file://) como servida por http.

   SISTEMA DE COORDENADAS: 1000 x 1000, el mismo lienzo del arte y el mismo
   que usan las vocales. Las diez cifras estan centradas en x = 500 y
   apoyadas en la misma linea de base (y 199 a 825).

   Cada numero tiene una sola forma. Se llama `mayus` porque es la clave que
   el motor usa por defecto; los numeros NO tienen minuscula, y como ninguno
   trae `minus` el motor esconde solo el boton Aa.

     arte      el PNG a color: es lo que se ve cuando el trazo esta hecho.
     contorno  la cifra hueca: el estado "todavia sin trazar".
     tintas    la tinta de cada trazo por separado, para que la mascara de
               revelado cubra justo ese trazo y ni un pixel de los vecinos.
     strokes   los ejes de trazado. NUNCA se ven: manejan por donde va el
               dedo, cuanto se pinta de la linea guia y donde se para la
               manita.
     grosor    ancho de la mascara de avance. Con `tintas` puede ser
               generoso: la tinta lo recorta igual.
     cantidad  cuantas veces repetir el emoji en la tarjeta final (para
               contarlo). El 0 no la trae: no hay nada que contar.
     decir     lo que lee la voz al completar el numero.

   EL ARTE DE ACA ES PROVISORIO
   Los PNG de `cifras/` los genero el motor de desarrollo a partir de estos
   mismos ejes (ver PEDIDO-NUMEROS.md). Cuando llegue el arte del disenador
   se reemplazan los archivos con el mismo nombre y listo: ni este archivo
   ni el motor se tocan. Los ejes si se vuelven a revisar, porque tienen
   que caer en el centro del trazo del arte nuevo.

   El ORDEN de `strokes` es el orden de escritura correcto, y el sentido de
   cada path es la direccion en la que hay que trazarlo.
   ===================================================================== */
var NUMEROS = [

  { letter:'0', color:'#7FB3FF', emoji:'🕳️', word:'Cero',
    decir:'cero',
    mayus:{
      arte:'cifras/0.png',
      contorno:'cifras/0-contorno.png',
      tintas:['cifras/0-t1.png'],
      grosor:220,
      strokes:[
        // 1: la vuelta entera, arrancando arriba y girando hacia la izquierda
        'M500 199 C386 199 292 339 292 512 C292 684 386 825 500 825 C614 825 708 684 708 512 C708 339 614 199 500 199'
      ] } },

  { letter:'1', color:'#FCCC4C', emoji:'🐣', word:'Uno',
    cantidad:1, decir:'uno',
    mayus:{
      arte:'cifras/1.png',
      contorno:'cifras/1-contorno.png',
      tintas:['cifras/1-t1.png','cifras/1-t2.png'],
      grosor:220,
      strokes:[
        // 1: la banderita, de abajo hacia arriba
        'M401 294 L505 199',
        // 2: el palito, de arriba hacia abajo
        'M505 199 L505 830'
      ] } },

  { letter:'2', color:'#E45444', emoji:'🐟', word:'Dos',
    cantidad:2, decir:'dos',
    mayus:{
      arte:'cifras/2.png',
      contorno:'cifras/2-contorno.png',
      tintas:['cifras/2-t1.png'],
      grosor:220,
      strokes:[
        // 1: la curva de arriba, la bajada en diagonal y la base, sin levantar el dedo
        'M334 326 C334 217 505 171 609 239 C713 308 672 416 568 507 L328 807 L698 807'
      ] } },

  { letter:'3', color:'#2EC4B6', emoji:'🍎', word:'Tres',
    cantidad:3, decir:'tres',
    mayus:{
      arte:'cifras/3.png',
      contorno:'cifras/3-contorno.png',
      tintas:['cifras/3-t1.png'],
      grosor:220,
      strokes:[
        // 1: las dos pancitas de un tiron, la de arriba y la de abajo
        'M339 308 C370 199 630 185 646 312 C661 430 531 503 448 507 C557 503 698 553 687 666 C677 789 422 848 328 739'
      ] } },

  { letter:'4', color:'#FF8A3D', emoji:'⭐', word:'Cuatro',
    cantidad:4, decir:'cuatro',
    mayus:{
      arte:'cifras/4.png',
      contorno:'cifras/4-contorno.png',
      tintas:['cifras/4-t1.png','cifras/4-t2.png'],
      grosor:220,
      strokes:[
        // 1: baja en diagonal y cruza a la derecha
        'M583 199 L302 598 L698 598',
        // 2: el palito, de arriba hacia abajo
        'M583 199 L583 830'
      ] } },

  { letter:'5', color:'#B388EB', emoji:'🐸', word:'Cinco',
    cantidad:5, decir:'cinco',
    mayus:{
      arte:'cifras/5.png',
      contorno:'cifras/5-contorno.png',
      tintas:['cifras/5-t1.png','cifras/5-t2.png'],
      grosor:220,
      strokes:[
        // 1: baja el palito y da la panza
        'M360 212 L360 457 C505 394 698 448 687 630 C677 789 453 852 334 748',
        // 2: el sombrerito de arriba, de izquierda a derecha
        'M360 212 L651 212'
      ] } },

  { letter:'6', color:'#5FD08A', emoji:'🍓', word:'Seis',
    cantidad:6, decir:'seis',
    mayus:{
      arte:'cifras/6.png',
      contorno:'cifras/6-contorno.png',
      tintas:['cifras/6-t1.png'],
      grosor:220,
      strokes:[
        // 1: baja la curva grande y al final da la vuelta de la panza
        'M651 253 C547 180 360 276 339 535 C323 739 453 834 547 816 C661 793 703 675 656 603 C609 530 438 512 360 616'
      ] } },

  { letter:'7', color:'#FF6F91', emoji:'🐞', word:'Siete',
    cantidad:7, decir:'siete',
    mayus:{
      arte:'cifras/7.png',
      contorno:'cifras/7-contorno.png',
      tintas:['cifras/7-t1.png','cifras/7-t2.png'],
      grosor:220,
      strokes:[
        // 1: el techo, de izquierda a derecha
        'M323 217 L687 217',
        // 2: la bajada en diagonal
        'M687 217 L438 830'
      ] } },

  { letter:'8', color:'#4FC3F7', emoji:'🌼', word:'Ocho',
    cantidad:8, decir:'ocho',
    mayus:{
      arte:'cifras/8.png',
      contorno:'cifras/8-contorno.png',
      tintas:['cifras/8-t1.png'],
      grosor:220,
      strokes:[
        // 1: rueda de arriba, cruce al medio y rueda de abajo, todo de un tiron
        'M500 212 C412 212 344 276 344 357 C344 439 412 494 500 494 C594 494 682 553 682 657 C682 766 599 825 500 825 C401 825 318 766 318 657 C318 553 406 494 500 494 C588 494 656 439 656 357 C656 276 588 212 500 212'
      ] } },

  { letter:'9', color:'#FFD84D', emoji:'🦋', word:'Nueve',
    cantidad:9, decir:'nueve',
    mayus:{
      arte:'cifras/9.png',
      contorno:'cifras/9-contorno.png',
      tintas:['cifras/9-t1.png'],
      grosor:220,
      strokes:[
        // 1: primero la rueda (en contra del reloj) y despues la bajada
        'M651 398 C651 285 573 203 484 203 C391 203 318 285 318 398 C318 512 391 594 484 594 C573 594 651 512 651 398 L651 830'
      ] } }
];

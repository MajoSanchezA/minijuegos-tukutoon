/* =====================================================================
   VOCALES — fuente de verdad del contenido del juego de trazos.
   Igual que `paginas.js` en a-pintar, es .js y NO .json a proposito: se
   carga con <script src> para que la pagina funcione tanto abierta por
   doble clic (file://) como servida por http, sin depender de fetch().
   =====================================================================

   viewBox de referencia: 0 0 300 400
     mayuscula -> alto de caja: y 60..340
     minuscula -> caja x:      y 150..330 (el punto de la i, mas arriba)

   El ORDEN de `strokes` es el orden de escritura correcto, y el sentido
   de cada path es la direccion en la que hay que trazarlo. Para cambiar
   el arte (p. ej. redibujar los trazos en Figma sobre el arte oficial)
   solo se reemplaza el `d` de cada path: el motor no se toca.
   ===================================================================== */
var VOCALES = [
  { letter:'A', color:'#FFC94A', emoji:'🐝', word:'Abeja',
    mayus:{ strokes:[
      'M150 60 L70 340',      // diagonal izquierda (de arriba hacia abajo)
      'M150 60 L230 340',     // diagonal derecha
      'M94 255 L206 255'      // barrita
    ], face:{x:150,y:172,s:.74} },
    minus:{ strokes:[
      // el ovalo primero (en contra del reloj) y despues el palito
      'M150 150 C114 150 84 190 84 240 C84 290 114 330 150 330 C186 330 216 290 216 240 C216 190 186 150 150 150',
      'M216 150 L216 330'
    ], face:{x:150,y:240,s:.6} } },

  { letter:'E', color:'#EF658E', emoji:'🐘', word:'Elefante',
    mayus:{ strokes:[
      'M80 60 L80 340',       // palito vertical
      'M80 60 L225 60',       // barra de arriba
      'M80 200 L205 200',     // barra del medio
      'M80 340 L225 340'      // barra de abajo
    ], face:{x:160,y:130,s:.78} },
    minus:{ strokes:[
      // un solo trazo que se cruza a si mismo: barrita, vuelta completa y salida
      'M84 240 L216 240 C216 190 186 150 150 150 C114 150 84 190 84 240 C84 290 114 330 150 330 C177 330 200 313 212 289'
    ], face:{x:150,y:283,s:.52} } },

  { letter:'I', color:'#2EC4B6', emoji:'🦎', word:'Iguana',
    mayus:{ strokes:[
      'M88 60 L212 60',       // barra de arriba
      'M150 60 L150 340',     // palito vertical
      'M88 340 L212 340'      // barra de abajo
    ], face:{x:150,y:205,s:.54} },
    minus:{ strokes:[
      'M150 180 L150 330'     // solo el palito...
    ], punto:{x:150,y:126,r:26},   // ...el punto no se traza, se toca
      face:{x:150,y:255,s:.5} } },

  { letter:'O', color:'#FF8A3D', emoji:'🐻', word:'Oso',
    mayus:{ strokes:[
      // una sola vuelta: arranca arriba y gira hacia la izquierda
      'M150 62 C104 62 66 124 66 200 C66 276 104 338 150 338 C196 338 234 276 234 200 C234 124 196 62 150 62'
    ], face:{x:150,y:200,s:.92} },
    minus:{ strokes:[
      'M150 150 C114 150 84 190 84 240 C84 290 114 330 150 330 C186 330 216 290 216 240 C216 190 186 150 150 150'
    ], face:{x:150,y:240,s:.7} } },

 { letter:'U', color:'#B388EB', emoji:'🍇', word:'Uvas',
  mayus:{ strokes:[
    // U mayúscula: curva completa sin palito
    'M76 62 L76 240 C76 310 224 310 224 240 L224 62'
  ], face:{x:150,y:188,s:.88} },
  
  minus:{ strokes:[
    // Dos trazos, los dos hacia ABAJO (asi se ensena en el cuaderno).
    // Trazo 1: baja por la izquierda, da la curva de abajo y sube un poco
    //   por la derecha, hasta donde se junta con el palito.
    'M84 150 L84 262 C84 310 216 310 216 252',
    // Trazo 2: el palito derecho, de arriba hacia abajo, y sigue MAS ABAJO
    //   que la panza — ese sobrante es la colita.
    'M216 150 L216 330'
  ], face:{x:150,y:228,s:.7} } 
  }
];

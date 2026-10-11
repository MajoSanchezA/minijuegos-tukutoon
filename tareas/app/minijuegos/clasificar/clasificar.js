/* =====================================================================
   CLASIFICAR — fuente de verdad del contenido del juego.
   Mismo criterio que globos.js y vocales.js: .js y NO .json a proposito,
   se carga con <script src> para que la pagina funcione tanto abierta
   por doble clic (file://) como servida por http, sin depender de
   fetch().

   NO HACE FALTA NINGUN ASSET. Cada bolita y cada cesta se dibujan en SVG
   desde el motor: sumar un color es sumar una linea aca abajo.

   ---------------------------------------------------------------------
   ESTE ES SOLO EL NIVEL DE COLORES de la propuesta original ("clasifica
   los objetos por color"). Los niveles de forma, tamano y categoria que
   proponia el documento —"lleva los objetos pequenos y azules a la
   caja"— NO estan implementados: quedan pendientes, y si se agregan van
   a necesitar su propio campo en la ronda (`forma`, `tamano`) y su propio
   dibujo en el motor. La mecanica de arrastrar y soltar de este archivo
   les sirve igual: lo que cambia es SOLO de que depende el color del
   objeto.

   El motor arma un objeto por cada `colores[i]` repetido `porColor`
   veces: todos los objetos de la ronda tienen una cesta que les
   corresponde, no hay distractores sueltos como en globos. Ahi esta la
   diferencia pedagogica con ese juego: en globos hay que ELEGIR (tocar
   esto, no fuera de eso); aca hay que ORDENAR (todo tiene un lugar,
   encontralo). ===================================================================== */

/* Los mismos seis colores y los mismos tonos que globos.js: que un chico
   vea "azul" y sea el mismo azul en los dos juegos. */
var CLASIFICAR_COLORES = [
  { id:'rojo',     nombre:'rojo',     plural:'rojos',     color:'#E45444' },
  { id:'amarillo', nombre:'amarillo', plural:'amarillos', color:'#FCCC4C' },
  { id:'azul',     nombre:'azul',     plural:'azules',    color:'#5AA9E6' },
  { id:'verde',    nombre:'verde',    plural:'verdes',    color:'#8BC34A' },
  { id:'violeta',  nombre:'violeta',  plural:'violetas',  color:'#B388EB' },
  { id:'naranja',  nombre:'naranja',  plural:'naranjas',  color:'#F48C34' }
];

/* Las rondas, en orden de dificultad. Cada una es un boton del selector
   de abajo y una estrella del header.

     id        identifica la ronda y es la clave del progreso guardado.
     colores   ids de color: uno por cesta. Van en el orden en que se
               dibujan las cestas, de izquierda a derecha.
     porColor  cuantos objetos de cada color hay para ordenar.

   LA PROGRESION SIGUE LA EDAD, TAL COMO LA PROPONE EL DOCUMENTO ORIGINAL:
   dos colores y pocos objetos para 2-3 anos, tres colores para 3-4, y
   cuatro para 4-5 — ahi mismo el documento dice que cuatro colores ya es
   "combinar", y que mas de eso deja de ser un juego de esta edad. La
   ultima ronda no suma un color mas: suma MAS objetos de los mismos
   cuatro colores, que es la otra manija de dificultad que tiene esta
   mecanica sin salirse del rango de edad. */
// ---------------------------------------------------------------------------
// Generación dinámica de rondas
// ---------------------------------------------------------------------------
// Definimos una lista de objetos base por color que usamos para poblar cada ronda.
var OBJETOS_POR_COLOR = {
  azul: [
    { id: 'carro-azul', src: 'carro-azul.png' },
    { id: 'crayones-azules', src: 'crayones-azules.png' },
    { id: 'balon-azul', src: 'balon-azul.png' }
  ],
  rojo: [
    { id: 'dino-rojo', src: 'dino-rojo.png' },
    { id: 'crayones-rojos', src: 'crayones-rojos.png' },
    { id: 'balon-rojo', src: 'balon-rojo.png' }
  ],
  amarillo: [
    { id: 'carro-amarillo', src: 'carro-amarillo.png' },
    { id: 'cubos-amarillos', src: 'cubos-amarillos.png' },
    { id: 'osito-amarillo', src: 'osito-amarillo.png' }
  ],
  verde: [
    { id: 'balon-verde', src: 'balon-verde.png' },
    { id: 'balon-verde-2', src: 'balon-verde.png' },
    { id: 'balon-verde-3', src: 'balon-verde.png' }
  ]
};

/**
 * Escoge dos colores distintos al azar.
 */
function coloresAleatorios() {
  // Sólo usar colores que tienen objetos definidos en OBJETOS_POR_COLOR
  var ids = Object.keys(OBJETOS_POR_COLOR);
  var a = ids[Math.floor(Math.random() * ids.length)];
  var b;
  do { b = ids[Math.floor(Math.random() * ids.length)]; } while (b === a);
  return [a, b];
}

/**
 * Genera la lista de objetos para una ronda dada un par de colores y la cantidad por color.
 */
function generarObjetos(colores, porColor) {
  var objetos = [];
  colores.forEach(function(colorId) {
    var pool = OBJETOS_POR_COLOR[colorId];
    for (var i = 0; i < porColor; i++) {
      // Elegir aleatoriamente un objeto del pool (puede repetirse)
      var tmpl = pool[Math.floor(Math.random() * pool.length)];
      // Creamos un id único añadiendo un sufijo
      var uniqId = tmpl.id + '_' + colorId + '_' + i;
      objetos.push({ id: uniqId, colorId: colorId, src: tmpl.src });
    }
  });
  return objetos;
}

/**
 * Genera una ronda con la lógica solicitada.
 *   - Las primeras 4 rondas usan porColor = 2,3,4,5 respectivamente.
 *   - Después, porColor se elige aleatoriamente entre 4 y 5.
 */
function crearRonda(indice) {
  var colores = coloresAleatorios();
  var porColor;
  if (indice < 4) {
    porColor = indice + 2; // 2,3,4,5
  } else {
    // después de la ronda 5, escoger 4 o 5 al azar
    porColor = Math.random() < 0.5 ? 4 : 5;
  }
  return {
    id: 'ronda_' + indice,
    colores: colores,
    porColor: porColor,
    objetos: generarObjetos(colores, porColor)
  };
}

// Generamos un número razonable de rondas (por ejemplo 20).
var CLASIFICAR_RONDAS = [];
for (var i = 0; i < 20; i++) {
  CLASIFICAR_RONDAS.push(crearRonda(i));
}
// ---------------------------------------------------------------------------


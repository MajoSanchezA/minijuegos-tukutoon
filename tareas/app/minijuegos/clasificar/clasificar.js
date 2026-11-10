/* =====================================================================
   CLASIFICAR — fuente de verdad del contenido del juego.
   Mismo criterio que globos.js y vocales.js: .js y NO .json a proposito,
   se carga con <script src> para que la pagina funcione tanto abierta
   por doble clic (file://) como servida por http, sin depender de
   fetch().

   Los objetos se cargan desde PNG locales. Cada color tiene varios juguetes
   para que las rondas puedan variar sin mezclar el color de clasificación.

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
    { id: 'bloques-azul', src: 'bloques-azul.png' },
    { id: 'crayones-azules', src: 'crayones-azules.png' },
    { id: 'balon-azul', src: 'balon-azul.png' },
    { id: 'dino2-azul', src: 'dino2-azul.png' },
    { id: 'dino3-azul', src: 'dino3-azul.png' },
    { id: 'osito-azul', src: 'osito-azul.png' }
  ],
  rojo: [
    { id: 'carro-rojo', src: 'carro-rojo.png' },
    { id: 'bloques-rojos', src: 'bloques-rojos.png' },
    { id: 'crayones-rojos', src: 'crayones-rojos.png' },
    { id: 'balon-rojo', src: 'balon-rojo.png' },
    { id: 'dino2-rojo', src: 'dino2-rojo.png' },
    { id: 'dino3-rojo', src: 'dino3-rojo.png' },
    { id: 'osito-rojo', src: 'osito-rojo.png' }
  ],
  amarillo: [
    { id: 'carro-amarillo', src: 'carro-amarillo.png' },
    { id: 'bloques-amarillos', src: 'bloques-amarillos.png' },
    { id: 'osito-amarillo', src: 'osito-amarillo.png' },
    { id: 'dino2-amarillo', src: 'dino2-amarillo.png' },
    { id: 'dino3-amarillo', src: 'dino3-amarillo.png' },
    { id: 'crayones-amarillos', src: 'crayones-amarillos.png' },
    { id: 'balon-amarillo', src: 'balon-amarillo.png' }
  ],
  verde: [
    { id: 'carro-verde', src: 'carro-verde.png' },
    { id: 'bloques-verdes', src: 'bloques-verdes.png' },
    { id: 'crayones-verdes', src: 'crayones-verdes.png' },
    { id: 'balon-verde', src: 'balon-verde.png' },
    { id: 'dino2-verde', src: 'dino2-verde.png' },
    { id: 'dino3-verde', src: 'dino3-verde.png' },
    { id: 'osito-verde', src: 'osito-verde.png' }
  ]
};

// Cada archivo es una de las composiciones de cofres que envio Cammgo.
// El orden importa: primer cofre a la izquierda y segundo a la derecha.
var COMBINACIONES_COFRES = [
  { colores:['azul','rojo'], plano:'2601b38b-678e-4ff8-9f28-7963562bece0.webp' },
  { colores:['azul','amarillo'], plano:'50a5517a-ed97-407d-950b-8d8029f45cc7.webp' },
  { colores:['azul','verde'], plano:'50fa0190-3bc2-4c82-9893-a48c06e2b185.webp' },
  { colores:['verde','amarillo'], plano:'5b8e6188-fe66-4ab8-9e74-756f8c13a1a4.webp' },
  { colores:['amarillo','verde'], plano:'828e3770-241f-4fd5-9f6a-0b5635d81400.webp' },
  { colores:['rojo','azul'], plano:'89a12403-1f12-4af2-ab3c-f498b438167e.webp' },
  { colores:['verde','azul'], plano:'8e986b94-6de3-452c-be50-81b7901af87c.webp' },
  { colores:['amarillo','rojo'], plano:'a2ef6166-ac61-42f6-a064-4b18fd3ae25b.webp' },
  { colores:['amarillo','azul'], plano:'c8bbde39-4bf1-4b5b-9287-ac170520f3c2.webp' },
  { colores:['rojo','amarillo'], plano:'d8a5cd4a-d474-4901-8f37-270999d46eea.webp' },
  { colores:['rojo','verde'], plano:'dcb53836-1dd3-488c-b422-e757b4ba875a.webp' },
  { colores:['verde','rojo'], plano:'eb15fded-fc04-4d5b-b423-0d41c2197fff.webp' }
];
var ordenCombinaciones = mezclarPool(COMBINACIONES_COFRES.slice());

/**
 * Genera la lista de objetos para una ronda dada un par de colores y la cantidad por color.
 */
function generarObjetos(colores, porColor) {
  var objetos = [];
  colores.forEach(function(colorId) {
    var pool = OBJETOS_POR_COLOR[colorId];
    var opciones = mezclarPool(pool.slice());
    for (var i = 0; i < porColor; i++) {
      // Mezclar sin repetir hasta usar los juguetes disponibles del color.
      var tmpl = opciones[i % opciones.length];
      // Creamos un id único añadiendo un sufijo
      var uniqId = tmpl.id + '_' + colorId + '_' + i;
      objetos.push({ id: uniqId, colorId: colorId, src: tmpl.src });
    }
  });
  return objetos;
}

function mezclarPool(lista) {
  for (var i = lista.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temporal = lista[i];
    lista[i] = lista[j];
    lista[j] = temporal;
  }
  return lista;
}

/**
 * Genera una ronda con la lógica solicitada.
 *   - Las primeras 4 rondas usan porColor = 2,3,4,5 respectivamente.
 *   - Después, porColor se elige aleatoriamente entre 4 y 5.
 */
function crearRonda(indice) {
  // Barajar un ciclo completo: salen en orden aleatorio y sin repetir hasta
  // haber mostrado las doce imagenes; despues comienza otro orden nuevo.
  if(indice > 0 && indice % COMBINACIONES_COFRES.length === 0){
    ordenCombinaciones = mezclarPool(COMBINACIONES_COFRES.slice());
  }
  var combinacion = ordenCombinaciones[indice % COMBINACIONES_COFRES.length];
  var colores = combinacion.colores.slice();
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
    plano: combinacion.plano,
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


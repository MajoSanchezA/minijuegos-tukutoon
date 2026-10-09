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
var CLASIFICAR_RONDAS = [
  { id:'dos',    colores:['azul', 'rojo'],                     porColor:2 },
  { id:'tres',   colores:['azul', 'rojo', 'amarillo'],         porColor:2 },
  { id:'cuatro', colores:['azul', 'rojo', 'amarillo', 'verde'], porColor:2 },
  { id:'mas',    colores:['azul', 'rojo', 'amarillo', 'verde'], porColor:3 },
  {
    id:'prueba-objetos', colores:['violeta', 'amarillo'], porColor:1,
    objetos:[
      { id:'carrito', colorId:'violeta', src:'carrito.webp' },
      { id:'dinosaurio-dos', colorId:'amarillo', src:'dinosaurio-dos.webp' },
      { id:'osito', colorId:'amarillo', src:'osito.webp' }
    ]
  },
  {
    id:'prueba-balones', colores:['rojo', 'amarillo', 'azul', 'verde'], porColor:1,
    objetos:[
      { id:'balon-rojo', colorId:'rojo', src:'balon-rojo.png' },
      { id:'balon-amarillo', colorId:'amarillo', src:'balon-amarillo.png' },
      { id:'balon-azul', colorId:'azul', src:'balon-azul.png' },
      { id:'balon-verde', colorId:'verde', src:'balon-verde.png' }
    ]
  }
];

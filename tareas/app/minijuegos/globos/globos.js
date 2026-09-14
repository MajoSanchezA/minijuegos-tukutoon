/* =====================================================================
   GLOBOS — fuente de verdad del contenido del juego.
   Igual que `paginas.js` en a-pintar y `vocales.js` en el de trazos, es
   .js y NO .json a proposito: se carga con <script src> para que la
   pagina funcione tanto abierta por doble clic (file://) como servida por
   http, sin depender de fetch().

   NO HACE FALTA NINGUN ASSET. El globo se dibuja en SVG desde el motor,
   asi que sumar un color es sumar una linea acá abajo: no hay que pedirle
   un PNG al disenador ni tocar el motor.

   ---------------------------------------------------------------------
   LAS DOS DECISIONES DE DISENO QUE ESTAN CONGELADAS ACA

   1. Cuantos globos. Tres del color pedido es el techo comodo a los 4
      anos, y ocho en pantalla es lo que entra sin que queden chicos para
      un dedo de 2 anos. La ronda libre ("explota todos") va con seis,
      porque ahi todos cuentan y no hay que buscar nada.

   2. Quietos o volando. Lo decide el adulto con el boton del header, no
      la ronda: el mismo contenido sirve de los 2 a los 5 anos cambiando
      solo eso. Quietos es tocar donde se ve; volando ya es seguir y
      anticipar, que es otro musculo. Arranca quieto siempre.
   ===================================================================== */

/* Los colores posibles de un globo. `plural` es lo que se lee en voz alta
   y lo que se escribe en la consigna ("solo los globos AZULES"), asi que
   tiene que concordar: azul -> azules, no "azuls".
   Son los mismos tonos de las paletas de a-pintar y del juego de vocales:
   fuertes, separados entre si y distinguibles para un chico que todavia
   esta aprendiendo a nombrarlos. */
var GLOBOS_COLORES = [
  { id:'rojo',     nombre:'rojo',     plural:'rojos',     color:'#E45444' },
  { id:'amarillo', nombre:'amarillo', plural:'amarillos', color:'#FCCC4C' },
  { id:'azul',     nombre:'azul',     plural:'azules',    color:'#5AA9E6' },
  { id:'verde',    nombre:'verde',    plural:'verdes',    color:'#8BC34A' },
  { id:'violeta',  nombre:'violeta',  plural:'violetas',  color:'#B388EB' },
  { id:'naranja',  nombre:'naranja',  plural:'naranjas',  color:'#F48C34' }
];

/* Las rondas, en orden de dificultad. Cada una es un boton del selector de
   abajo y una estrella del header.

     id        identifica la ronda y es la clave del progreso guardado.
     cuantos   globos en pantalla.
     objetivo  id del color que hay que reventar. Sin `objetivo`, van todos
               (la ronda libre, la de los mas chiquitos).
     blancos   cuantos de ese color. Solo con `objetivo`.
     consigna  opcional: si no viene, el motor la arma sola con el plural
               del color.

   La primera ronda es deliberadamente la mas facil que puede existir:
   tocar cualquier cosa que se ve. Recien de la segunda en adelante hay que
   elegir, que es el salto pedagogico grande — de coordinacion a
   clasificacion por color. */
var GLOBOS_RONDAS = [
  { id:'todos',    cuantos:6 },
  { id:'azul',     cuantos:8, objetivo:'azul',     blancos:3 },
  { id:'rojo',     cuantos:8, objetivo:'rojo',     blancos:3 },
  { id:'amarillo', cuantos:8, objetivo:'amarillo', blancos:3 },
  { id:'verde',    cuantos:8, objetivo:'verde',    blancos:3 }
];

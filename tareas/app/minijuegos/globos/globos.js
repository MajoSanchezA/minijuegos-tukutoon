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

   1. Cuantos globos. De 2 a 4 del color pedido es el techo comodo a los 4
      anos (`blancos` sale al azar en ese rango, ver mas abajo), y ocho en
      pantalla es lo que entra sin que queden chicos para un dedo de 2
      anos. La ronda libre ("explota todos") va con seis, porque ahi todos
      cuentan y no hay que buscar nada.

   2. Quietos o volando. Cada ronda trae su propio `vuelo` por defecto
      (ver mas abajo): las cinco primeras arrancan quietas y la combinada
      vuela, asi el mismo contenido va sumando dificultad de los 2 a los 5
      anos sin que haga falta que el adulto toque nada. El boton del
      header sigue estando para que lo cambie a mano en cualquier
      momento — eso no lo pisa el default de la ronda mientras se quede
      en esa misma ronda (ver `cargarRonda` en el motor). Quietos es tocar
      donde se ve; volando ya es seguir y anticipar, que es otro musculo.
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
     objetivo  id del color que hay que reventar, o 'al-azar' para que lo
               sortee el motor en cada partida. Sin `objetivo`, sirve
               cualquier globo.
     blancos   cuantos globos de ese color hay en pantalla. Solo con
               `objetivo`. Puede ser un numero fijo o [minimo, maximo]:
               con rango, el motor sortea cuantos en cada partida (asi la
               cancha no queda siempre con la misma pinta) y ajusta solo
               cuantos distractores hacen falta para llegar a `cuantos`.
     pide      [minimo, maximo] de cuantos hay que reventar. El numero sale
               al azar adentro de ese rango en cada partida, y el motor lo
               deja SIEMPRE por debajo de los que hay — si pidiera todos,
               no habria nada que contar: bastaria con seguir tocando.
               Sin `pide`, hay que reventar todos los que sirven.
     vuelo     true/false: el modo con el que arranca la ronda (quietos o
               volando) al entrar a ella. El adulto lo puede cambiar
               igual con el boton del header sin que esto se lo pise, ver
               el comentario de `cargarRonda` en el motor. Sin `vuelo`, la
               ronda no toca el modo que ya estaba elegido.
     catarata  true convierte la ronda en un caudal sin fin: no hay una
               cantidad fija de globos del color pedido, cada uno que
               revienta (o que se deja pasar y se escapa por arriba) entra
               de nuevo por abajo con un color nuevo al azar. `blancos` no
               se usa aca — la mezcla la decide el motor solo (ver
               `colorAlAzarCatarata`) — y el tope de siempre en `pide`
               (dejar por lo menos uno sin tocar) tampoco aplica, porque
               con el caudal reponiendose no hace falta.
     consigna  opcional: si no viene, el motor la arma sola.

   EL ORDEN, Y POR QUE

   1. `cuantos`  — cuantos. Cualquier color sirve, asi que lo unico que hay
      que hacer es contar y PARAR. Parar es la mitad del ejercicio.
   2-5. los colores — clasificar. Aca no hay que contar: van todos los del
      color pedido. Lo dificil no es reconocer el azul, es aguantarse de
      tocar los otros cinco globos.
   6. `combinada` — las dos cosas juntas: contar y clasificar, con mas
      globos del color pedido que los que se piden. Es la mas dificil de
      todas y por eso va al final.
   7. `catarata` — la cierra. Ya no hay una tanda fija para mirar entera y
      elegir con calma: los globos entran solos sin parar y hay que
      clasificar Y contar contra un caudal que no se detiene. Por eso pide
      varios (bastantes mas que los 2 a 4 de las rondas de color) y por
      eso va al final de todas, despues de la combinada.

   El mismo criterio ordena el modo: las cinco primeras arrancan QUIETAS
   (`vuelo:false`) y la combinada y la catarata arrancan VOLANDO
   (`vuelo:true`) — el chico aprende a contar y a clasificar con el globo
   parado antes de sumarle el seguimiento con la vista que pide que se
   mueva.

   Ojo con el techo de edad: 2 a 4 del color pedido es comodo a los 4 anos
   (`blancos` sale de ese rango en vez de ser siempre 3, asi la cancha
   cambia de partida en partida) y cuatro es el maximo de `pide` a los 5.
   Por eso `pide` no pasa de 4 en la combinada, aunque en la primera
   ronda —donde no hay que clasificar nada— llega a 5.

   Falta la puerta de entrada de los de 2 anos, que era una ronda sin numero
   ni color ("explota todos los globos", puro tocar y que pase algo). Se
   recupera agregando { id:'todos', cuantos:6 } como primera linea de la
   lista: el motor la sigue soportando. */
var GLOBOS_RONDAS = [
  { id:'cuantos',   cuantos:6, pide:[2, 5], vuelo:false },
  { id:'azul',      cuantos:8, objetivo:'azul',     blancos:[2, 4], vuelo:false },
  { id:'rojo',      cuantos:8, objetivo:'rojo',     blancos:[2, 4], vuelo:false },
  { id:'amarillo',  cuantos:8, objetivo:'amarillo', blancos:[2, 4], vuelo:false },
  { id:'verde',     cuantos:8, objetivo:'verde',    blancos:[2, 4], vuelo:false },
  { id:'combinada', cuantos:9, objetivo:'al-azar',  blancos:[4, 6], pide:[2, 4], vuelo:true },
  { id:'catarata',  cuantos:9, objetivo:'al-azar',  catarata:true,  pide:[6, 8], vuelo:true }
];

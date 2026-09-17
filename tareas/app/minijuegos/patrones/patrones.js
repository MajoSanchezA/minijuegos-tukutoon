/* =====================================================================
   PATRONES — fuente de verdad del contenido del juego.
   Igual que `globos.js` en el juego de globos: .js y NO .json a proposito,
   se carga con <script src> para que la pagina funcione tanto abierta por
   doble clic (file://) como servida por http, sin depender de fetch().

   NO HACE FALTA NINGUN ASSET. Todo el juego son emojis de texto, asi que
   sumar una figura es sumar un caracter aca abajo: no hay que pedirle
   nada a un disenador ni tocar el motor.

   ---------------------------------------------------------------------
   LA IDEA DEL JUEGO

   Tukutoon esta decorando para una fiesta y le falta una pieza: se ve una
   guirnalda con figuras que se repiten con una regla (AB, AAB, ABC...) y
   un hueco al final. El chico arrastra desde la bandeja la pieza que
   sigue y la cuelga en el hueco. No hay una unica secuencia memorizada:
   cada partida sortea que figuras del banco le tocan a cada letra de la
   regla, asi la misma ronda no se ve nunca igual dos veces.

   ---------------------------------------------------------------------
   LAS RONDAS, Y POR QUE ESE ORDEN

   AB es lo mas simple: dos piezas que se alternan, y por eso son globos y
   cotillon — objetos de fiesta con nombre, para que el chico mas chico
   pueda ademas "leer" la guirnalda en voz alta (globo, moño, globo,
   moño...) antes de que le haga falta pensarla como pura forma.

   AAB y ABC ya son la regla sola, sin ayuda de significado: por eso usan
   circulos y figuras de color liso (lucecitas, adornos) en vez de objetos
   con nombre — que la dificultad este en la secuencia y no en reconocer
   el dibujo.

   `bancos` es una LISTA y no un solo banco: en cada patron nuevo (ver
   `sortearRoles` en el motor) se sortea de que banco de la lista salen las
   figuras, asi adentro de la misma ronda va cambiando de pieza sin que
   haga falta otra ronda para eso.

   `tema` es el nombre de lo que se esta decorando, para la consigna
   ("Ayudá a Tukutoon a terminar LA GUIRNALDA DE GLOBOS").

   `mostrar` es cuantas figuras se ven ANTES del hueco. Con AB alcanza con
   4 (dos vueltas completas: A B A B) para que la alternancia se note; con
   AAB y ABC hacen falta 5 (una vuelta entera mas dos figuras de la
   siguiente) porque con menos no llega a asomar el reinicio del patron.
   ===================================================================== */

/* Los bancos de figuras. Cada uno tiene 6 para que, aun en la ronda mas
   dificil (ABC, que gasta 3 en el patron), sigan quedando 3 de sobra para
   armar distractores que no aparecen en la guirnalda. */
var PATRONES_BANCOS = {
  globos:  ['🎈','🎀','🎊','🎁','⭐','🎉'],
  colores: ['🔴','🔵','🟢','🟡','🟣','🟠'],
  formas:  ['🔺','🔵','🟢','⭐','🟦','🔶']
};

/* Las rondas, en orden de dificultad. Cada una es un boton del selector de
   abajo y una estrella del header.

     id       identifica la ronda y es la clave del progreso guardado.
     tema     que se esta decorando, para la consigna.
     patron   la regla, como lista de letras ('A','B','A','B'... se repite
               sola). AAB y ABC no se escriben abreviados: la lista tiene
               que traer cada posicion, porque de ahi sale tambien cuantas
               letras distintas hacen falta (ver `rolesUnicos` en el
               motor).
     mostrar  cuantas figuras se ven antes del hueco (ver arriba).
     bancos   lista de bancos posibles; el motor sortea uno nuevo en cada
               patron (no una vez por ronda), para que la ronda entera no
               se vea siempre con la misma figura. */
var PATRONES_RONDAS = [
  { id:'ab',  tema:'la guirnalda de globos', patron:['A','B'],     mostrar:4, bancos:['globos'] },
  { id:'aab', tema:'las lucecitas',          patron:['A','A','B'], mostrar:5, bancos:['colores'] },
  { id:'abc', tema:'los adornos',            patron:['A','B','C'], mostrar:5, bancos:['formas'] }
];

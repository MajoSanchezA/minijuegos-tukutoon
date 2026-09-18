/* =====================================================================
   TORTUGUITAS — fuente de verdad del contenido del juego.
   Igual que `globos.js` y `vocales.js`: es .js y no .json a proposito, asi
   la pagina funciona tanto abierta por doble clic (file://) como servida
   por http, sin depender de fetch().

   El mar/arena son CSS + una foto de fondo (ver motor/motor-tortugas.css),
   y la tortuga es el PNG de `TORTUGAS_ARTE` — recortado bien pegado al
   dibujo (sin el aire blanco que traia el original) para que el tamano
   que calcula el motor sea el tamano real de la tortuga, no el de un
   lienzo con margenes.
   ===================================================================== */

// Cuantas tortuguitas hay que llevar al mar. El motor arma sus rondas y
// sus voces a partir de este numero solo, asi que subirlo a 10 el dia de
// manana es cambiar esta linea, no reescribir el juego.
var TORTUGAS_CANTIDAD = 5;

// El numero que se ve en el contador Y el clip de audio que se escucha al
// llegar esa tortuguita. El conteo hablado no lo graba una voz sintetica:
// son recortes de la letra de la propia cancion (cancion-tortuguitas-
// completa.mp3), asi lo que el chico escucha es siempre la misma cancion
// que despues suena entera al terminar la ronda.
var TORTUGAS_NUMEROS = [
  { texto:'1', audio:'numero-1.mp3' },
  { texto:'2', audio:'numero-2.mp3' },
  { texto:'3', audio:'numero-3.mp3' },
  { texto:'4', audio:'numero-4.mp3' },
  { texto:'5', audio:'numero-5.mp3' }
];

var TORTUGAS_ARTE = 'tortuga.png';

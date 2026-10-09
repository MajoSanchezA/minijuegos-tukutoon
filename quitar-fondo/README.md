# Fondo Cero

Herramienta independiente para quitar fondos con segmentación de imagen dentro del navegador. El archivo se procesa en el dispositivo y el resultado se descarga como PNG con transparencia.

## Ejecutar

Desde esta carpeta, instala las dependencias y levanta el servidor local:

```sh
npm install
npm run dev
```

Abre la dirección local que muestra Vite. La primera vez se descargará el modelo cuantizado (~40 MB); después se conserva en la caché del navegador. Se necesita conexión para esa primera descarga.

El motor es [`@imgly/background-removal`](https://github.com/imgly/background-removal-js), publicado bajo licencia AGPL-3.0. Revisa esa licencia antes de redistribuir o alojar públicamente la herramienta.

# Geovisor SEGIS · Violencias basadas en género · Nariño

Gobernación de Nariño · Subsecretaría de Gestión Pública · Secretaría de Equidad de Género e Inclusión Social.

Sitio estático para GitHub Pages: no necesita servidor ni base de datos. El geovisor (`index.html`) lee los datos publicados en la carpeta `datos/`.

## Qué hay en cada carpeta

| Archivo o carpeta | Qué es | Cómo se actualiza |
| --- | --- | --- |
| `index.html`, `geovisor.js` | El geovisor | No se toca en la actualización mensual |
| `admin.html` | Herramienta para convertir las matrices de Excel en archivos para publicar | Se abre en el navegador; no envía datos a ningún servidor |
| `datos/dupla.json` | Atenciones de la Dupla Violeta (sin datos personales) | `admin.html` → sección 1, con la matriz estandarizada |
| `datos/policia.json` | Resumen de casos de la Policía | `admin.html` → sección 2, con la matriz de la Policía |
| `datos/municipios.geojson` | Municipios, subregión y población DANE | QGIS (`qgis/datos_geovisor.qgz`) |
| `datos/capas/*.geojson` | Comunas, barrios de Pasto, centros poblados, veredas | QGIS |
| `datos/instituciones.geojson` | Comisarías, Fiscalía, Inspecciones y Casas de Justicia | QGIS |
| `datos/limites.json` | Líneas de subregión y departamento | Solo si cambian los límites |
| `datos/config.json` | Enlace del formulario de reporte y fecha de actualización | Editar en GitHub |
| `datos/plantilla/` | Plantilla de la matriz estandarizada de la Dupla | Reemplazar si cambia la plantilla |

## Actualización mensual (resumen)

1. Revise la matriz que envía la Dupla (columna VALIDACION en «OK»).
2. Abra `https://<cuenta>.github.io/<repositorio>/admin.html`, cargue la matriz y descargue `dupla.json`.
3. En GitHub, entre a `datos/`, elija **Add file → Upload files**, arrastre `dupla.json` y confirme con **Commit changes**.
4. En uno o dos minutos el geovisor queda actualizado.

Privacidad: no suba a este repositorio matrices con nombres, documentos, direcciones ni relatos. Todo lo que está aquí es público.

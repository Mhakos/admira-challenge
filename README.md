# Admira Challenge: Dashboard de Análisis de Ventas

Este repositorio contiene la solución al reto de desarrollo de Admira, que consiste en la construcción de un mini-dashboard full-stack para visualizar y analizar datos obtenidos desde una API externa en vivo.

* **URL de la App (Vercel):** [https://admira-challenge.vercel.app/](https://admira-challenge.vercel.app/)
* **Repositorio GitHub:** [https://github.com/Mhakos/admira-challenge](https://github.com/Mhakos/admira-challenge)

---

## Ver la App en Acción (GIF)

Puedes ver un GIF del dashboard funcionando en el siguiente enlace:
[https://imgur.com/a/0xuZgKb](https://imgur.com/a/0xuZgKb)

---

## Cómo Correr el Proyecto Localmente

Para ejecutar este proyecto, se necesita tener **Node.js (v20+)** y **npm** instalados.

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/Mhakos/admira-challenge.git](https://github.com/Mhakos/admira-challenge.git)
    cd admira-challenge
    ```

2.  **Instalar dependencias:**
    Este comando instalará las dependencias tanto para el cliente (`/client`) como para el servidor (`/server`).
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    * Navega a la carpeta `/server`.
    * Crea una copia del archivo `.env.example` y renómbrala a `.env`.
    * Añade tu URL de webhook (puedes obtener una nueva y gratuita en [webhook.site](https://webhook.site/)).
        ```env
        # admira-challenge/server/.env
        WEBHOOK_URL=[https://webhook.site/#!/view/4588128b-084a-4669-aa83-e11a2e449340/1ea70443-a5cb-48-ad99-0f5bdd7937f4/1](https://webhook.site/#!/view/4588128b-084a-4669-aa83-e11a2e449340/1ea70443-a5cb-48-ad99-0f5bdd7937f4/1)
        ```

4.  **Ejecutar la aplicación:**
    Este comando iniciará el servidor de backend y el cliente de React simultáneamente.
    ```bash
    npm run dev
    ```
    * El frontend estará disponible en `http://localhost:5173`.
    * El backend estará disponible en `http://localhost:3001`.

---

## Evidencia de Ejecución (Webhook y Logs)

Para cumplir con el requisito de entregar evidencia de ejecución real, el proyecto implementa dos mecanismos de trazabilidad:

* **Logs locales:** Cada vez que el servidor procesa una petición a `/api/sales-data`, se registra una entrada en el archivo `server/logs/http_trace.jsonl`. Este archivo se incluye en el repositorio.
* **Notificaciones Webhook en tiempo real:** Adicionalmente, se envía una notificación a un webhook externo con un resumen de la operación. Los resultados de las pruebas y la ejecución en vivo se pueden ver en el siguiente enlace:
    * **Ver Trazas en Webhook.site:** [https://webhook.site/#!/view/4588128b-084a-4669-aa83-e11a2e449340/1ea70443-a5cb-48f4-ad99-0f5bdd7937f4/1](https://webhook.site/#!/view/4588128b-084a-4669-aa83-e11a2e449340/1ea70443-a5cb-48f4-ad99-0f5bdd7937f4/1)

---

## Fuente de Datos Utilizada

Se usa la **Fake Store API** por su estabilidad, gratuidad y porque no requiere autenticación, lo que permite un desarrollo rápido y enfocado en los requisitos del reto.

* **Endpoints consumidos:**
    * `https://fakestoreapi.com/products`: para obtener el catálogo completo de productos.
    * `https://fakestoreapi.com/carts`: para obtener los datos de transacciones (carritos de compra).

---

## Transformaciones de Datos Implementadas

Las transformaciones de datos son el núcleo del reto. Se realizaron 4 transformaciones principales, la mayoría en el backend para optimizar el rendimiento del cliente.

### 1. Join entre dos Endpoints (`/products` y `/carts`)

Para calcular el valor total de cada carrito, era necesario conocer el precio de cada producto. En `server/index.js`, se combinan los datos de ambos endpoints. Primero, se crea un mapa de productos para una búsqueda eficiente (O(1)), y luego se recorren los carritos para calcular el valor total.

```javascript
// server/index.js
const productsMap = new Map(products.map(p => [p.id, p]));
// ...
for (const cart of carts) {
  for (const item of cart.products) {
    const product = productsMap.get(item.productId);
    // ... calcular ventas ...
  }
}

2. Agregación Temporal (Ventas por Día)
El backend procesa la lista de carritos (ya filtrada por fecha) y los agrupa por día, sumando el valor total de las ventas (totalSales) y la cantidad de artículos vendidos (itemsSold) para cada fecha, esto reduce la carga de trabajo del frontend, que recibe los datos ya agregados.

// server/index.js
const dailyData = {};
for (const cart of carts) {
  const dateStr = new Date(cart.date).toISOString().split('T')[0];
  if (!dailyData[dateStr]) {
    dailyData[dateStr] = { totalSales: 0, itemsSold: 0 };
  }
  // ... sumar ventas e items ...
}

3. Cálculo de Tasa (% de Cambio en Ventas)
En el frontend (client/src/App.jsx), una vez que se reciben los datos agregados, se calcula el cambio porcentual en las ventas entre el primer y el último día del período seleccionado.

// client/src/App.jsx
const salesChangePercent = firstDaySales > 0 ? ((lastDaySales - firstDaySales) / firstDaySales) * 100 : 0;

4. Top-N por Métrica (Top 5 Días por Items Vendidos)
También en el frontend, se toma el conjunto de datos diarios y se ordena de forma descendente por la cantidad de itemsSold (mapeado como volume en el estado) para identificar y visualizar los 5 días con mayor actividad.

// client/src/App.jsx
return [...data].sort((a, b) => b.volume - a.volume).slice(0, 5);
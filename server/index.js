import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuración para usar __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Definimos la ruta del log ANTES de la función que la usa ---
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const traceFile = path.join(logDir, 'http_trace.jsonl');

// --- Función de Logging y Webhook ---
const logAndNotify = async (logEntry, webhookPayload) => {
  fs.appendFileSync(traceFile, JSON.stringify(logEntry) + '\n');
  console.log('Log entry written:', logEntry);

  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      console.log('Webhook notification sent successfully.');
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }
};

// --- Ruta de la API de Ventas ---
app.get('/api/sales-data', async (req, res) => {
  const { category, startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Missing date range parameters' });
  }

  const start = Date.now();
  try {
    // 1. Obtener todos los productos y carritos de la API externa
    const [productsResponse, cartsResponse] = await Promise.all([
      fetch('https://fakestoreapi.com/products'),
      fetch('https://fakestoreapi.com/carts')
    ]);

    if (!productsResponse.ok || !cartsResponse.ok) {
      throw new Error('Failed to fetch data from Fake Store API');
    }

    const products = await productsResponse.json();
    const carts = await cartsResponse.json();

    // Crear un mapa de productos para fácil acceso a sus detalles (precio, categoría)
    const productsMap = new Map(products.map(p => [p.id, p]));

    // 2. Transformaciones de Datos
    const dailyData = {};
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    for (const cart of carts) {
      const cartDate = new Date(cart.date);
      
      // Filtro por rango de fechas
      if (cartDate >= startDateObj && cartDate <= endDateObj) {
        const dateStr = cartDate.toISOString().split('T')[0];
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { totalSales: 0, itemsSold: 0 };
        }

        for (const item of cart.products) {
          const product = productsMap.get(item.productId);
          if (product) {
            // Filtro por categoría (si se aplica)
            if (!category || category === 'all' || product.category === category) {
              dailyData[dateStr].totalSales += product.price * item.quantity;
              dailyData[dateStr].itemsSold += item.quantity;
            }
          }
        }
      }
    }

    // 3. Formatear datos para el frontend
    const sortedDates = Object.keys(dailyData).sort();
    const transformedData = {
      prices: sortedDates.map(date => [new Date(date).getTime(), dailyData[date].totalSales]),
      total_volumes: sortedDates.map(date => [new Date(date).getTime(), dailyData[date].itemsSold]),
    };

    const durationMs = Date.now() - start;
    const logEntry = { ts: new Date().toISOString(), method: 'GET', source: 'FakeStoreAPI', status: 200, duration_ms: durationMs };
    const webhookPayload = { message: `Successfully processed sales data`, from: startDate, to: endDate, category: category || 'all' };
    
    await logAndNotify(logEntry, webhookPayload);

    res.status(200).json(transformedData);

  } catch (e) {
    console.error('----------------------------------------------------');
    console.error('ERROR INTERNO DEL SERVIDOR (PROXY)');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error:', e);
    console.error('----------------------------------------------------');
    const errorLogEntry = { ts: new Date().toISOString(), error: e.message || 'Unknown proxy error' };
    fs.appendFileSync(traceFile, JSON.stringify(errorLogEntry) + '\n');
    res.status(500).json({ error: 'Proxy error', details: e.message });
  }
});

app.listen(PORT, () => console.log(`Backend server listening on http://localhost:${PORT}`));
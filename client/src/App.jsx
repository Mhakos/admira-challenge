import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';

// --- Constantes y Configuración ---
const API_BASE_URL = 'http://localhost:3001';
const CATEGORY_OPTIONS = {
    all: 'Todas las Categorías',
    "men's clothing": "Ropa de Hombre",
    "women's clothing": "Ropa de Mujer",
    jewelery: 'Joyería',
    electronics: 'Electrónica',
};

// --- Componentes de UI ---
const Loader = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const ErrorMessage = ({ message }) => (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{message}</span>
    </div>
);

const KpiCard = ({ title, value, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
);

// --- Componente Principal de la App ---
export default function App() {
    // --- Estados ---
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [filters, setFilters] = useState({
        category: 'all',
        startDate: '2020-03-01',
        endDate: '2020-03-10',
    });

    // --- Efecto para Cargar Datos ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setSelectedDay(null);
            
            try {
                const url = `${API_BASE_URL}/api/sales-data?startDate=${filters.startDate}&endDate=${filters.endDate}&category=${filters.category}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const apiResponse = await response.json();
                
                const processedData = apiResponse.prices.map((pricePoint, index) => ({
                    date: new Date(pricePoint[0]).toISOString().split('T')[0],
                    price: pricePoint[1], // Total Sales
                    volume: apiResponse.total_volumes[index][1], // Items Sold
                }));

                setData(processedData);

            } catch (e) {
                setError(e.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    // --- Transformaciones Memorizadas ---
    const kpis = useMemo(() => {
        if (data.length < 2) return null;
        const firstDaySales = data[0].price;
        const lastDaySales = data[data.length - 1].price;
        const salesChangePercent = firstDaySales > 0 ? ((lastDaySales - firstDaySales) / firstDaySales) * 100 : 0;
        const totalItemsSold = data.reduce((acc, day) => acc + day.volume, 0);
        return { totalItemsSold, salesChangePercent };
    }, [data]);

    const top5ItemsDays = useMemo(() => {
        if (data.length === 0) return [];
        return [...data].sort((a, b) => b.volume - a.volume).slice(0, 5);
    }, [data]);

    // --- Manejadores de Eventos y Formateadores ---
    const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleChartClick = (payload) => {
      if (payload && payload.activePayload && payload.activePayload[0]) {
          setSelectedDay(payload.activePayload[0].payload);
      }
    };
    
    // --- CORRECCIÓN: Formateador de fecha seguro ---
    const safeDateFormatter = (tick) => {
        if (typeof tick === 'string') {
            const date = parseISO(tick);
            if (isValid(date)) {
                return format(date, 'MMM dd');
            }
        }
        return tick; // Devuelve el valor original si no es un string de fecha válido
    };

    // --- Renderizado ---
    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Admira Sales Dashboard</h1>
                    <p className="text-gray-600 mt-1">Análisis de rendimiento con Fake Store API</p>
                </header>
                
                <div className="bg-white p-4 rounded-xl shadow-md mb-8 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="w-full sm:w-auto">
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <select id="category" name="category" value={filters.category} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                            {Object.entries(CATEGORY_OPTIONS).map(([key, value]) => (<option key={key} value={key}>{value}</option>))}
                        </select>
                    </div>
                    <div className="w-full sm:w-auto">
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                        <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"/>
                    </div>
                     <div className="w-full sm:w-auto">
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Fecha Fin</label>
                        <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"/>
                    </div>
                </div>

                {loading && <Loader />}
                {error && <ErrorMessage message={error} />}
                {!loading && !error && data.length === 0 && <div className="text-center text-gray-500 py-10">No hay datos de ventas para el rango seleccionado.</div>}
                
                {!loading && !error && data.length > 0 && (
                    <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <KpiCard title="Total Items Vendidos" value={kpis ? kpis.totalItemsSold.toLocaleString('en-US') : 'N/A'} color="text-gray-800" />
                            <KpiCard title="Cambio en Ventas Diarias (%)" value={kpis ? `${kpis.salesChangePercent.toFixed(2)}%` : 'N/A'} color={kpis && kpis.salesChangePercent >= 0 ? 'text-green-600' : 'text-red-600'} />
                        </div>
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                           <h3 className="font-bold text-lg mb-4">Tendencia de Ventas (USD)</h3>
                           <ResponsiveContainer width="100%" height={300}>
                               <LineChart data={data} onClick={handleChartClick}>
                                   <CartesianGrid strokeDasharray="3 3" />
                                   <XAxis dataKey="date" tickFormatter={safeDateFormatter} />
                                   <YAxis width={80} tickFormatter={(tick) => `$${tick.toLocaleString('en-US')}`} />
                                   <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                   <Legend />
                                   <Line type="monotone" dataKey="price" name="Ventas" stroke="#8884d8" strokeWidth={2} dot={false} />
                               </LineChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="font-bold text-lg mb-4">Top 5 Días por Items Vendidos</h3>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={top5ItemsDays} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" width={80} dataKey="date" tickFormatter={safeDateFormatter} />
                                    <Tooltip formatter={(value) => `${value} items`} />
                                    <Bar dataKey="volume" name="Items" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {selectedDay && (
                            <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-md animate-fade-in">
                                <h3 className="font-bold text-lg mb-2">Detalles para el {format(parseISO(selectedDay.date), 'dd MMMM, yyyy')}</h3>
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Métrica</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th></tr></thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    <tr><td className="px-6 py-4 font-medium">Ventas Totales</td><td className="px-6 py-4">${selectedDay.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                                    <tr><td className="px-6 py-4 font-medium">Items Vendidos</td><td className="px-6 py-4">{selectedDay.volume.toLocaleString('en-US')}</td></tr>
                                  </tbody>
                                </table>
                                <button onClick={() => setSelectedDay(null)} className="mt-4 text-sm text-indigo-600 hover:text-indigo-800">Cerrar detalle</button>
                            </div>
                        )}
                    </main>
                )}
            </div>
        </div>
    );
}
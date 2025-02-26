import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

function Historial({ onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [empresasList, setEmpresasList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEmpresas, setFetchingEmpresas] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const tipos = [
    "Caja", "Ingreso", "Costo", "IVA", "PPM", 
    "Ajuste CF", "Retencion SC", "Honorarios", 
    "Gastos Generales", "Cuentas Varias"
  ];

  const unsubscribeRef = React.useRef(null);

  // Cargar la lista de empresas disponibles al montar el componente
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        setFetchingEmpresas(true);
        setError(null);
        
        // Obtener documentos desde la colección 'registros'
        const empresas = [];
        const years = [];
        
        // Consulta a la colección 'registros'
        const registrosCol = collection(db, 'registros');
        const registrosSnapshot = await getDocs(registrosCol);
        
        if (!registrosSnapshot.empty) {
          console.log(`Se encontraron ${registrosSnapshot.size} documentos en registros`);
          
          registrosSnapshot.forEach(doc => {
            const data = doc.data();
            
            if (data.empresa) {
              empresas.push(data.empresa);
            }
            
            if (data.año) {
              const yearStr = data.año.toString();
              years.push(yearStr);
            }
          });
        } else {
          console.log("No hay documentos en la colección registros");
        }
        
        if (empresas.length === 0 && years.length === 0) {
          setError("No se encontraron registros en la base de datos");
          setFetchingEmpresas(false);
          return;
        }
        
        console.log(`Total empresas extraídas: ${empresas.length}`);
        console.log(`Total años extraídos: ${years.length}`);
        
        // Eliminar duplicados y valores nulos
        const uniqueEmpresas = [...new Set(empresas)].filter(Boolean);
        const uniqueYears = [...new Set(years)].filter(Boolean);
        
        console.log(`Empresas únicas: ${uniqueEmpresas.join(', ')}`);
        console.log(`Años únicos: ${uniqueYears.join(', ')}`);
        
        // Ordenar alfabéticamente las empresas
        uniqueEmpresas.sort();
        
        // Ordenar años en orden descendente (más reciente primero)
        uniqueYears.sort((a, b) => b - a);
        
        setEmpresasList(uniqueEmpresas);
        setAvailableYears(uniqueYears);
        
        // Seleccionar valores por defecto si existen
        if (uniqueEmpresas.length > 0) {
          setSelectedEmpresa(uniqueEmpresas[0]);
          console.log(`Empresa seleccionada por defecto: ${uniqueEmpresas[0]}`);
        }
        
        if (uniqueYears.length > 0) {
          setSelectedYear(uniqueYears[0]);
          console.log(`Año seleccionado por defecto: ${uniqueYears[0]}`);
        }
      } catch (error) {
        console.error("Error al cargar la lista de empresas y años:", error);
        setError(`Error al cargar los datos: ${error.message}`);
      } finally {
        setFetchingEmpresas(false);
      }
    };

    fetchEmpresas();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Ejecutar búsqueda automáticamente cuando se selecciona una empresa y un año
  useEffect(() => {
    if (selectedEmpresa && selectedYear && !fetchingEmpresas) {
      handleSearch();
    }
  }, [selectedEmpresa, selectedYear]);

  const handleSearch = () => {
    if (!selectedEmpresa) {
      setError("Por favor seleccione una empresa");
      return;
    }
    if (!selectedYear) {
      setError("Por favor seleccione un año");
      return;
    }

    setError(null);
    setLoading(true);
    
    // Limpiar transacciones anteriores
    setTransactions([]);

    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    console.log(`Buscando registros para empresa: "${selectedEmpresa}", año: "${selectedYear}"`);

    // Consultar la colección 'registros'
    const registrosQuery = query(
      collection(db, 'registros'),
      where('empresa', '==', selectedEmpresa),
      where('año', '==', selectedYear)
    );

    const unsubscribeRegistros = onSnapshot(registrosQuery, (snapshot) => {
      const registrosData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data };
      });
      
      console.log(`Encontrados ${registrosData.length} registros en 'registros'`);
      
      if (registrosData.length === 0) {
        console.log("No se encontraron resultados para la búsqueda");
        setTransactions([]);
        setLoading(false);
        return;
      }
      
      setTransactions(registrosData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching registros:", error);
      setError(`Error al cargar los datos: ${error.message}`);
      setLoading(false);
    });
    
    unsubscribeRef.current = unsubscribeRegistros;
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    
    // Si es string, convertir a número
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(numValue);
  };

  // Función para procesar las transacciones del mes
  const getMonthTransactions = (mes) => {
    if (!transactions.length) {
      return [];
    }
    
    console.log(`Obteniendo transacciones para el mes: ${mes}`);
    
    const monthTransactions = transactions.filter(t => t.mes === mes);
    
    console.log(`Encontradas ${monthTransactions.length} transacciones para ${mes}`);
    
    const result = [];
    
    // Procesamos los registros de la nueva estructura
    monthTransactions.forEach(transaction => {
      // Verificamos si existe el array datos
      if (transaction.datos && transaction.datos.length > 0) {
        // Agrupamos los elementos por control y detalle para tenerlos en la misma fila
        const groupedItems = {};
        
        transaction.datos.forEach(item => {
          const key = `${item.control}-${item.detalle}`;
          
          if (!groupedItems[key]) {
            groupedItems[key] = {
              control: item.control,
              detalle: item.detalle,
              debe: {},
              haber: {},
              fecha: transaction.date
            };
          }
          
          // Asignar valor según el tipo de transacción (debe/haber)
          if (item.tipoTransaccion === 'debe') {
            groupedItems[key].debe[item.tipo] = parseFloat(item.monto);
          } else if (item.tipoTransaccion === 'haber') {
            groupedItems[key].haber[item.tipo] = parseFloat(item.monto);
          }
        });
        
        // Convertir el objeto agrupado a un array de elementos
        Object.values(groupedItems).forEach(groupedItem => {
          result.push(groupedItem);
        });
      }
    });
    
    // Ordenar por fecha (si está disponible)
    result.sort((a, b) => {
      if (a.fecha && b.fecha) {
        if (a.fecha < b.fecha) return -1;
        if (a.fecha > b.fecha) return 1;
      }
      return 0;
    });
    
    return result;
  };

  // Función para renderizar filas de un mes específico
  const renderMonthRows = (mes) => {
    const monthTransactions = getMonthTransactions(mes);
    
    // Siempre queremos exactamente 6 filas por mes
    const rowsToRender = Array(6).fill(null);
    
    // Llenar con transacciones existentes
    for (let i = 0; i < Math.min(monthTransactions.length, 6); i++) {
      rowsToRender[i] = monthTransactions[i];
    }
    
    return (
      <React.Fragment key={mes}>
        {rowsToRender.map((transaction, index) => (
          <tr key={`${mes}-row-${index}`} className={index === 5 ? "last-month-row" : ""}>
            {index === 0 && (
              <td className="mes-cell" rowSpan="6">{mes}</td>
            )}
            <td className="detalle-cell">
              {transaction ? transaction.detalle || '-' : '-'}
            </td>
            <td className="control-cell">
              {transaction ? formatCurrency(transaction.control) : '-'}
            </td>
            {tipos.map(tipo => {
              // Para cada tipo, verificar si hay valores en debe o haber
              let debeValue = '';
              let haberValue = '';
              
              if (transaction) {
                if (transaction.debe && transaction.debe[tipo] !== undefined) {
                  debeValue = transaction.debe[tipo];
                }
                
                if (transaction.haber && transaction.haber[tipo] !== undefined) {
                  haberValue = transaction.haber[tipo];
                }
              }
              
              return (
                <React.Fragment key={`${mes}-${index}-${tipo}`}>
                  <td className="monto-cell debe">
                    {debeValue !== '' ? formatCurrency(debeValue) : '-'}
                  </td>
                  <td className="monto-cell haber">
                    {haberValue !== '' ? formatCurrency(haberValue) : '-'}
                  </td>
                </React.Fragment>
              );
            })}
          </tr>
        ))}
      </React.Fragment>
    );
  };

  // Renderizar un mensaje de estado de carga o un mensaje de "no datos" más explícito
  const renderStatus = () => {
    if (loading) {
      return <div className="loading">Cargando datos...</div>;
    }
    
    if (transactions.length === 0) {
      if (!selectedEmpresa || !selectedYear) {
        return <div className="no-data">Seleccione una empresa y un año para ver los registros</div>;
      }
      
      return (
        <div className="no-data">
          No se encontraron registros para <strong>{selectedEmpresa}</strong> en el año <strong>{selectedYear}</strong>
          <p className="hint">Esto puede ser porque no existan registros o porque los valores no coinciden exactamente con los de la base de datos.</p>
        </div>
      );
    }
    
    return (
      <>
        <div className="data-info">
          Mostrando registros de <strong>{selectedEmpresa}</strong> para el año <strong>{selectedYear}</strong>
          <span className="record-count">({transactions.length} registros encontrados)</span>
        </div>
        <table className="registro-table">
          <thead>
            <tr>
              <th rowSpan="2">Mes</th>
              <th rowSpan="2">Detalle</th>
              <th rowSpan="2">Control</th>
              {tipos.map((tipo) => (
                <th key={tipo} colSpan="2" className="tipo-header">
                  {tipo}
                </th>
              ))}
            </tr>
            <tr>
              {tipos.map((tipo) => (
                <React.Fragment key={`header-${tipo}`}>
                  <th className="debe-header">Debe</th>
                  <th className="haber-header">Haber</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {meses.map((mes) => renderMonthRows(mes))}
          </tbody>
        </table>
      </>
    );
  };

  return (
    <div className="registro-container">
      <h2 className="registro-title">Historial de Registros</h2>
      
      <div className="search-controls">
        <button onClick={onBack} className="back-button">
          Volver al Menú Principal
        </button>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="empresa">Empresa:</label>
            {fetchingEmpresas ? (
              <p className="loading-text">Cargando empresas...</p>
            ) : (
              <select
                id="empresa"
                value={selectedEmpresa}
                onChange={(e) => setSelectedEmpresa(e.target.value)}
                className="empresa-select"
                disabled={empresasList.length === 0 || loading}
              >
                {empresasList.length === 0 ? (
                  <option value="">No hay empresas disponibles</option>
                ) : (
                  <>
                    <option value="">Seleccione una empresa</option>
                    {empresasList.map(empresa => (
                      <option key={empresa} value={empresa}>{empresa}</option>
                    ))}
                  </>
                )}
              </select>
            )}
            {empresasList.length > 0 && (
              <small className="select-count">{empresasList.length} empresas disponibles</small>
            )}
          </div>

          <div className="filter-group">
            <label htmlFor="year">Año:</label>
            {fetchingEmpresas ? (
              <p className="loading-text">Cargando años...</p>
            ) : (
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="year-select"
                disabled={availableYears.length === 0 || loading}
              >
                {availableYears.length === 0 ? (
                  <option value="">No hay años disponibles</option>
                ) : (
                  <>
                    <option value="">Seleccione un año</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </>
                )}
              </select>
            )}
            {availableYears.length > 0 && (
              <small className="select-count">{availableYears.length} años disponibles</small>
            )}
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-responsive">
        {renderStatus()}
      </div>

      <style jsx>{`
        .registro-container {
          padding: 20px;
          max-width: 100%;
          overflow-x: auto;
        }

        .registro-title {
          margin-bottom: 20px;
          color: #333;
          text-align: center;
        }

        .search-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 20px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .filters {
          display: flex;
          gap: 15px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .filter-group label {
          font-weight: 500;
          color: #666;
        }

        .loading-text {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .select-count {
          font-size: 12px;
          color: #6c757d;
          margin-top: 2px;
        }

        .empresa-select,
        .year-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-width: 200px;
          background-color: white;
        }

        .back-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
          background-color: #6c757d;
          color: white;
        }

        .back-button:hover {
          background-color: #5a6268;
        }

        .error-message {
          color: #dc3545;
          margin-bottom: 15px;
          padding: 10px;
          background-color: #f8d7da;
          border-radius: 4px;
        }

        .loading, .no-data {
          text-align: center;
          padding: 30px;
          color: #666;
          background-color: #f8f9fa;
          border-radius: 4px;
          margin-top: 20px;
        }

        .hint {
          font-size: 14px;
          margin-top: 10px;
          color: #6c757d;
        }

        .data-info {
          margin-bottom: 15px;
          padding: 10px;
          background-color: #e9ecef;
          border-radius: 4px;
          text-align: center;
        }

        .record-count {
          margin-left: 10px;
          font-size: 14px;
          color: #6c757d;
        }

        .table-responsive {
          overflow-x: auto;
          margin-top: 20px;
        }

        .registro-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          white-space: nowrap;
        }

        .registro-table th,
        .registro-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }

        .registro-table thead th {
          background-color: #f8f9fa;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .tipo-header {
          background-color: #e9ecef;
        }

        .debe-header {
          background-color: #f8d7da;
        }

        .haber-header {
          background-color: #d4edda;
        }

        .mes-cell {
          font-weight: 500;
          background-color: #f8f9fa;
          position: sticky;
          left: 0;
          z-index: 5;
          border: 2px solid #aaa;
        }

        .detalle-cell {
          text-align: left;
          max-width: 250px;
          white-space: normal;
          word-break: break-word;
        }

        .control-cell {
          font-weight: 500;
        }

        .monto-cell {
          text-align: right;
        }

        .monto-cell.debe {
          background-color: #f3fff3;
        }

        .monto-cell.haber {
          background-color: #fff3f3;
        }

        .last-month-row td {
          border-bottom: 2px solid #aaa;
        }

        @media (max-width: 768px) {
          .search-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .filters {
            flex-direction: column;
          }

          .filter-group {
            width: 100%;
          }

          .empresa-select,
          .year-select {
            width: 100%;
            min-width: unset;
          }
        }
      `}</style>
    </div>
  );
}

export default Historial;
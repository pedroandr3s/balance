import React, { useState, useEffect } from "react";
import { db } from './firebaseConfig';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

const Registro = ({ onBack }) => {
  const [registroForm, setRegistroForm] = useState({
    empresa: "",
    mes: "",
    año: "",
    datos: [{ 
      detalle: "", 
      control: "", 
      tipo: "", 
      tipoTransaccion: "debe", // Por defecto "debe"
      monto: ""
    }],
    total: 0
  });
  const [empresas, setEmpresas] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  // Constante para el número máximo de datos permitidos
  const MAX_DATOS = 10;

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const tipos = [
    "Caja", "Ingreso", "Costo", "IVA", "PPM", "Ajuste CF", 
    "Retencion SC", "Honorarios", "Gastos Generales", "Cuentas Varias"
  ];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      const fetchedEmpresas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmpresas(fetchedEmpresas);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ show: false, message: "", type: "" });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const calculateTotal = (datos) => {
    let total = 0;
    
    datos.forEach(dato => {
      const monto = parseFloat(dato.monto) || 0;
      if (dato.tipoTransaccion === 'debe') {
        total += monto;
      } else {
        total -= monto;
      }
    });
    
    return total;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!registroForm.empresa) newErrors.empresa = "Seleccione una empresa";
    if (!registroForm.mes) newErrors.mes = "Seleccione un mes";
    if (!registroForm.año) newErrors.año = "Ingrese el año";

    registroForm.datos.forEach((dato, index) => {
      if (!dato.detalle) {
        newErrors[`detalle${index}`] = "Complete el campo de detalle";
      }
      if (!dato.control) {
        newErrors[`control${index}`] = "Ingrese el valor de control";
      }
      if (!dato.tipo) {
        newErrors[`tipo${index}`] = "Seleccione el tipo";
      }
      if (!dato.monto) {
        newErrors[`monto${index}`] = "Ingrese el monto";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setNotification({
        show: true,
        message: "Por favor, complete todos los campos requeridos",
        type: "error"
      });
      return;
    }

    setLoading(true);

    const total = calculateTotal(registroForm.datos);

    const newTransaction = {
      empresa: registroForm.empresa,
      mes: registroForm.mes,
      año: registroForm.año,
      datos: registroForm.datos,
      total: total,
      date: new Date().toISOString()
    };

    try {
      // Guardar datos en Firebase
      await addDoc(collection(db, 'registros'), newTransaction);
      
      // Guardar también en la colección correspondiente según el tipo (debe/haber)
      await Promise.all(registroForm.datos.map(async (dato) => {
        const collection_name = dato.tipoTransaccion === 'debe' ? 'debe' : 'haber';
        await addDoc(collection(db, collection_name), {
          empresa: registroForm.empresa,
          mes: registroForm.mes,
          año: registroForm.año,
          detalle: dato.detalle,
          control: dato.control,
          tipo: dato.tipo,
          monto: parseFloat(dato.monto) || 0,
          date: new Date().toISOString()
        });
      }));
      
      // Limpiar solo los datos manteniendo empresa, mes y año
      setRegistroForm(prev => ({
        ...prev,
        datos: [{ 
          detalle: "", 
          control: "", 
          tipo: "", 
          tipoTransaccion: "debe",
          monto: ""
        }],
        total: 0
      }));
      
      setErrors({});
      setNotification({
        show: true,
        message: "Registro guardado exitosamente",
        type: "success"
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      setNotification({
        show: true,
        message: "Error al guardar el registro: " + error.message,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDatoChange = (index, field, value) => {
    const newDatos = [...registroForm.datos];
    newDatos[index] = {
      ...newDatos[index],
      [field]: value
    };

    const total = calculateTotal(newDatos);

    setRegistroForm(prev => ({
      ...prev,
      datos: newDatos,
      total: total
    }));

    if (errors[`${field}${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${field}${index}`];
        return newErrors;
      });
    }
  };

  const handleTipoTransaccionChange = (index, tipo) => {
    const newDatos = [...registroForm.datos];
    newDatos[index] = {
      ...newDatos[index],
      tipoTransaccion: tipo
    };

    const total = calculateTotal(newDatos);

    setRegistroForm(prev => ({
      ...prev,
      datos: newDatos,
      total: total
    }));
  };

  const handleInputChange = (field, value) => {
    setRegistroForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addDatoRow = () => {
    // Verificar si ya se alcanzó el límite máximo de datos
    if (registroForm.datos.length >= MAX_DATOS) {
      setNotification({
        show: true,
        message: `No se pueden agregar más de ${MAX_DATOS} datos`,
        type: "error"
      });
      return;
    }

    setRegistroForm(prev => ({
      ...prev,
      datos: [
        ...prev.datos,
        { 
          detalle: prev.datos[0].detalle, // Copiar el detalle del primer dato
          control: prev.datos[0].control, // Copiar el control del primer dato
          tipo: "", 
          tipoTransaccion: "debe",
          monto: ""
        }
      ]
    }));
  };

  const removeDatoRow = (index) => {
    if (registroForm.datos.length > 1) {
      const newDatos = [...registroForm.datos];
      newDatos.splice(index, 1);
      
      const total = calculateTotal(newDatos);
      
      setRegistroForm(prev => ({
        ...prev,
        datos: newDatos,
        total: total
      }));
      
      // Remove any errors associated with this row
      const newErrors = {...errors};
      Object.keys(newErrors).forEach(key => {
        if (key.endsWith(index.toString())) {
          delete newErrors[key];
        }
      });
      setErrors(newErrors);
    }
  };

  return (
    <div className="container">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="header">
        <h2>Hacer Registro</h2>
        <div className="header-buttons">
          <button onClick={onBack} className="back-button">
            Atrás
          </button>
        </div>
      </div>

      {/* Empresa, Mes, Año section */}
      <div className="form-group">
        <label>Empresa Correspondiente:</label>
        <select
          value={registroForm.empresa}
          onChange={(e) => handleInputChange('empresa', e.target.value)}
          className={`select-empresa ${errors.empresa ? 'error' : ''}`}
        >
          <option value="">Seleccione una empresa</option>
          {empresas.map(empresa => (
            <option key={empresa.id} value={empresa.nombre}>
              {empresa.nombre} - {empresa.rut}
            </option>
          ))}
        </select>
        {errors.empresa && <span className="error-message">{errors.empresa}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Mes Correspondiente:</label>
          <select
            value={registroForm.mes}
            onChange={(e) => handleInputChange('mes', e.target.value)}
            className={errors.mes ? 'error' : ''}
          >
            <option value="">Seleccione mes</option>
            {meses.map(mes => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
          {errors.mes && <span className="error-message">{errors.mes}</span>}
        </div>

        <div className="form-group">
          <label>Año:</label>
          <input
            type="text"
            placeholder="YYYY"
            value={registroForm.año}
            onChange={(e) => handleInputChange('año', e.target.value)}
            maxLength="4"
            className={errors.año ? 'error' : ''}
          />
          {errors.año && <span className="error-message">{errors.año}</span>}
        </div>
      </div>

      {/* Campos de Detalle y Control (solo para el primer dato) */}
      <div className="form-row">
        <div className="form-group">
          <label>Detalle:</label>
          <input
            type="text"
            placeholder="Detalle"
            value={registroForm.datos[0].detalle}
            onChange={(e) => handleDatoChange(0, 'detalle', e.target.value)}
            className={errors[`detalle0`] ? 'error' : ''}
          />
          {errors[`detalle0`] && <span className="error-message">{errors[`detalle0`]}</span>}
        </div>
        
        <div className="form-group">
          <label>Control:</label>
          <input
            type="number"
            placeholder="Valor de control"
            value={registroForm.datos[0].control}
            onChange={(e) => handleDatoChange(0, 'control', e.target.value)}
            className={errors[`control0`] ? 'error' : ''}
          />
          {errors[`control0`] && <span className="error-message">{errors[`control0`]}</span>}
        </div>
      </div>

      {/* Datos section */}
      <div className="datos-section">
        <h3>Datos ({registroForm.datos.length}/{MAX_DATOS})</h3>
        
        {registroForm.datos.map((dato, index) => (
          <div key={index} className="dato-container">
            <div className="dato-row">
              <div className="form-group">
                <label>Tipo:</label>
                <select
                  value={dato.tipo}
                  onChange={(e) => handleDatoChange(index, 'tipo', e.target.value)}
                  className={errors[`tipo${index}`] ? 'error' : ''}
                >
                  <option value="">Seleccione tipo</option>
                  {tipos.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
                {errors[`tipo${index}`] && <span className="error-message">{errors[`tipo${index}`]}</span>}
              </div>
              
              <div className="transaction-type">
                <button
                  type="button"
                  className={`transaction-button ${dato.tipoTransaccion === 'debe' ? 'active' : ''}`}
                  onClick={() => handleTipoTransaccionChange(index, 'debe')}
                >
                  Debe
                </button>
                <button
                  type="button"
                  className={`transaction-button ${dato.tipoTransaccion === 'haber' ? 'active' : ''}`}
                  onClick={() => handleTipoTransaccionChange(index, 'haber')}
                >
                  Haber
                </button>
              </div>
              
              <div className="form-group">
                <label>Monto:</label>
                <input
                  type="number"
                  placeholder="Monto"
                  value={dato.monto}
                  onChange={(e) => handleDatoChange(index, 'monto', e.target.value)}
                  className={errors[`monto${index}`] ? 'error' : ''}
                />
                {errors[`monto${index}`] && <span className="error-message">{errors[`monto${index}`]}</span>}
              </div>
              
              {registroForm.datos.length > 1 && (
                <button 
                  onClick={() => removeDatoRow(index)} 
                  className="remove-button"
                  title="Eliminar registro"
                >
                  ✕
                </button>
              )}
            </div>
            
            {index < registroForm.datos.length - 1 && <hr className="dato-divider" />}
          </div>
        ))}
        
        {/* Mostrar botón "Agregar Dato" solo si no se ha alcanzado el límite */}
        {registroForm.datos.length < MAX_DATOS && (
          <button onClick={addDatoRow} className="add-button">
            Agregar Dato
          </button>
        )}
      </div>

      <div className="total">
        Total: ${registroForm.total.toFixed(2)}
      </div>

      <div className="button-group">
        <button 
          onClick={handleSubmit} 
          className="save-button"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        <button 
          onClick={onBack} 
          className="back-button"
          disabled={loading}
        >
          Volver al Menú Principal
        </button>
      </div>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }

        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px;
          border-radius: 4px;
          color: white;
          z-index: 1000;
          animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .notification.success {
          background-color: #28a745;
        }

        .notification.error {
          background-color: #dc3545;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-buttons {
          display: flex;
          gap: 10px;
        }

        .form-group {
          margin-bottom: 20px;
          position: relative;
          flex: 1;
        }

        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        input, select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .error {
          border-color: #dc3545;
        }

        .error-message {
          color: #dc3545;
          font-size: 12px;
          display: block;
          margin-top: 4px;
        }

        .select-empresa {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
        }

        .datos-section {
          margin-top: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background-color: #f9f9f9;
        }
        
        .datos-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 16px;
          color: #555;
        }

        .dato-container {
          margin-bottom: 15px;
          position: relative;
        }

        .dato-row {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
          align-items: flex-start;
          position: relative;
        }

        .transaction-type {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 25px;
        }

        .transaction-button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          background-color: #f8f9fa;
          cursor: pointer;
          border-radius: 4px;
        }

        .transaction-button.active {
          background-color: #007bff;
          color: white;
          border-color: #007bff;
        }

        .dato-divider {
          border: 0;
          height: 1px;
          background-color: #ddd;
          margin: 20px 0;
        }

        .total {
          margin: 20px 0;
          text-align: right;
          font-size: 1.2em;
          font-weight: bold;
          padding: 10px;
          background-color: #f0f0f0;
          border-radius: 4px;
        }

        .button-group {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        .save-button, .back-button {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .save-button {
          background-color: #007bff;
          color: white;
        }

        .save-button:disabled, .back-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .back-button {
          background-color: #6c757d;
          color: white;
        }

        .add-button {
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 15px;
          cursor: pointer;
          margin-top: 10px;
          width: 100%;
        }

        .remove-button {
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          margin-left: 10px;
          margin-top: 25px;
        }

        button:hover:not(:disabled) {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default Registro;
import React, { useState, useEffect } from "react";
import { db } from './firebaseConfig';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

const Debe = ({ onSubmit, onBack, onHaberClick }) => {
  const [debeForm, setDebeForm] = useState({
    empresa: "",
    mes: "",
    año: "",
    detalles: [{ 
      detalle: "", 
      control: "", 
      tipoDebe: "", 
      monto: "",
      subtotal: 0 
    }],
    total: 0
  });
  const [empresas, setEmpresas] = useState([]);
  const [errors, setErrors] = useState({});

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const tiposDebe = ["Caja", "Ingreso", "Costo", "IVA", "PPM", "Ajuste CF", "Retencion SC", "Honorarios", "Gastos Generales", "Cuentas Varias"];

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

  const calculateTotals = (detalles) => {
    const updatedDetalles = detalles.map(detalle => ({
      ...detalle,
      subtotal: parseFloat(detalle.monto) || 0
    }));

    const total = updatedDetalles.reduce((sum, detalle) => sum + (parseFloat(detalle.monto) || 0), 0);

    return { updatedDetalles, total };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!debeForm.empresa) newErrors.empresa = "Seleccione una empresa";
    if (!debeForm.mes) newErrors.mes = "Seleccione un mes";
    if (!debeForm.año) newErrors.año = "Ingrese el año";

    debeForm.detalles.forEach((detalle, index) => {
      if (!detalle.detalle) {
        newErrors[`detalle${index}`] = "Complete el campo de detalle";
      }
      if (!detalle.control) {
        newErrors[`control${index}`] = "Ingrese el valor de control";
      }
      if (!detalle.tipoDebe) {
        newErrors[`tipoDebe${index}`] = "Seleccione el tipo de debe";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDebeSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const { updatedDetalles, total } = calculateTotals(debeForm.detalles);

    const newTransaction = {
      empresa: debeForm.empresa,
      mes: debeForm.mes,
      año: debeForm.año,
      detalles: updatedDetalles,
      total: total,
      date: new Date().toISOString(),
      type: 'debe'
    };

    try {
      // Store directly in the 'debe' collection
      await addDoc(collection(db, 'debe'), newTransaction);
      
      // Still call onSubmit for any parent component handling if needed
      if (onSubmit) {
        onSubmit({ success: true, data: newTransaction });
      }
      
      setDebeForm({
        empresa: "",
        mes: "",
        año: "",
        detalles: [{ 
          detalle: "", 
          control: "", 
          tipoDebe: "", 
          monto: "",
          subtotal: 0 
        }],
        total: 0
      });
      setErrors({});
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar el registro");
    }
  };

  const handleDetalleChange = (index, field, value) => {
    const newDetalles = [...debeForm.detalles];
    newDetalles[index] = {
      ...newDetalles[index],
      [field]: value
    };

    // If control is changed, update monto to the same value
    if (field === 'control') {
      newDetalles[index].monto = value;
    }

    const { updatedDetalles, total } = calculateTotals(newDetalles);

    setDebeForm(prev => ({
      ...prev,
      detalles: updatedDetalles,
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

  const handleInputChange = (field, value) => {
    setDebeForm(prev => ({
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

  const addDetalleRow = () => {
    if (debeForm.detalles.length < 6) {
      setDebeForm(prev => ({
        ...prev,
        detalles: [
          ...prev.detalles,
          { 
            detalle: "", 
            control: "", 
            tipoDebe: "", 
            monto: "",
            subtotal: 0 
          }
        ]
      }));
    }
  };

  const removeDetalleRow = (index) => {
    if (debeForm.detalles.length > 1) {
      const newDetalles = [...debeForm.detalles];
      newDetalles.splice(index, 1);
      
      const { updatedDetalles, total } = calculateTotals(newDetalles);
      
      setDebeForm(prev => ({
        ...prev,
        detalles: updatedDetalles,
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
      <div className="header">
        <h2>Registrar Debe</h2>
        <div className="header-buttons">
          <button onClick={onHaberClick} className="expense-button">
            Ir a Haber
          </button>
        </div>
      </div>

      {/* Empresa, Mes, Año section */}
      <div className="form-group">
        <label>Empresa Correspondiente:</label>
        <select
          value={debeForm.empresa}
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
            value={debeForm.mes}
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
            value={debeForm.año}
            onChange={(e) => handleInputChange('año', e.target.value)}
            maxLength="4"
            className={errors.año ? 'error' : ''}
          />
          {errors.año && <span className="error-message">{errors.año}</span>}
        </div>
      </div>

      {/* Detalles section */}
      <div className="detalles-section">
        <h3>Detalles</h3>
        
        {debeForm.detalles.map((detalle, index) => (
          <div key={index} className="detalle-container">
            <div className="detalle-row">
              <div className="form-group">
                <label>Detalle:</label>
                <input
                  type="text"
                  placeholder="Detalle"
                  value={detalle.detalle}
                  onChange={(e) => handleDetalleChange(index, 'detalle', e.target.value)}
                  className={errors[`detalle${index}`] ? 'error' : ''}
                />
                {errors[`detalle${index}`] && <span className="error-message">{errors[`detalle${index}`]}</span>}
              </div>
              
              <div className="form-group">
                <label>Control:</label>
                <input
                  type="number"
                  placeholder="Valor de control"
                  value={detalle.control}
                  onChange={(e) => handleDetalleChange(index, 'control', e.target.value)}
                  className={errors[`control${index}`] ? 'error' : ''}
                />
                {errors[`control${index}`] && <span className="error-message">{errors[`control${index}`]}</span>}
              </div>
            </div>
            
            <div className="detalle-row">
              <div className="form-group">
                <label>Tipo de Debe:</label>
                <select
                  value={detalle.tipoDebe}
                  onChange={(e) => handleDetalleChange(index, 'tipoDebe', e.target.value)}
                  className={errors[`tipoDebe${index}`] ? 'error' : ''}
                >
                  <option value="">Seleccione tipo</option>
                  {tiposDebe.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
                {errors[`tipoDebe${index}`] && <span className="error-message">{errors[`tipoDebe${index}`]}</span>}
              </div>
              
              <div className="form-group">
                <label>Monto:</label>
                <input
                  type="number"
                  placeholder="Monto"
                  value={detalle.monto}
                  onChange={(e) => handleDetalleChange(index, 'monto', e.target.value)}
                  className={errors[`monto${index}`] ? 'error' : ''}
                  readOnly
                />
              </div>
              
              {debeForm.detalles.length > 1 && (
                <button 
                  onClick={() => removeDetalleRow(index)} 
                  className="remove-button"
                  title="Eliminar detalle"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="subtotal">
              Subtotal: ${parseFloat(detalle.subtotal || 0).toFixed(2)}
            </div>
            
            <hr className="detalle-divider" />
          </div>
        ))}
        
        {debeForm.detalles.length < 6 && (
          <button onClick={addDetalleRow} className="add-button">
            Agregar Detalle
          </button>
        )}
      </div>

      <div className="total">
        Total: ${debeForm.total.toFixed(2)}
      </div>

      <div className="button-group">
        <button onClick={handleDebeSubmit} className="save-button">
          Guardar
        </button>
        <button onClick={onBack} className="back-button">
          Volver al Menú Principal
        </button>
      </div>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
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

        .expense-button {
          padding: 8px 16px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
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

        .detalles-section {
          margin-top: 30px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background-color: #f9f9f9;
        }

        .detalles-section h3 {
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }

        .detalle-container {
          margin-bottom: 15px;
          position: relative;
        }

        .detalle-row {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
          align-items: flex-start;
          position: relative;
        }

        .subtotal {
          text-align: right;
          font-weight: bold;
          margin: 10px 0;
        }

        .detalle-divider {
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

        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default Debe;
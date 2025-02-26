import React, { useState, useEffect } from "react";
import { db } from './firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

const Haber = ({ onSubmit, onBack, onDebeClick }) => {
  const [haberForm, setHaberForm] = useState({
    empresa: "",
    mes: "",
    año: "",
    control: "",
    tipoHaber: "",
    productos: [{ detalle: "", monto: "", subtotal: 0 }],
    total: 0
  });
  const [empresas, setEmpresas] = useState([]);
  const [errors, setErrors] = useState({});

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const tiposHaber = ["Caja", "Ingreso", "Abono", "IVA", "PPM", "Ajuste DF", "Pago SC", "Honorarios", "Ingresos Varios", "Cuentas Varias"];

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

  const calculateTotals = (productos) => {
    const updatedProductos = productos.map(producto => ({
      ...producto,
      subtotal: parseFloat(producto.monto) || 0
    }));

    const total = updatedProductos.reduce((sum, producto) => sum + (parseFloat(producto.monto) || 0), 0);

    return { updatedProductos, total };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!haberForm.empresa) newErrors.empresa = "Seleccione una empresa";
    if (!haberForm.mes) newErrors.mes = "Seleccione un mes";
    if (!haberForm.año) newErrors.año = "Ingrese el año";
    if (!haberForm.control) newErrors.control = "Ingrese el valor de control";
    if (!haberForm.tipoHaber) newErrors.tipoHaber = "Seleccione el tipo de haber";

    haberForm.productos.forEach((producto, index) => {
      if (!producto.detalle) {
        newErrors[`producto${index}`] = "Complete el campo de detalle";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleHaberSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const { updatedProductos, total } = calculateTotals(haberForm.productos);

    const newTransaction = {
      empresa: haberForm.empresa,
      mes: haberForm.mes,
      año: haberForm.año,
      control: parseFloat(haberForm.control),
      tipoHaber: haberForm.tipoHaber,
      productos: updatedProductos,
      total: total,
      date: new Date().toISOString(),
      type: 'haber'
    };

    try {
      await onSubmit(newTransaction);
      setHaberForm({
        empresa: "",
        mes: "",
        año: "",
        control: "",
        tipoHaber: "",
        productos: [{ detalle: "", monto: "", subtotal: 0 }],
        total: 0
      });
      setErrors({});
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar el registro");
    }
  };

  const handleProductoChange = (index, field, value) => {
    const newProductos = [...haberForm.productos];
    newProductos[index] = {
      ...newProductos[index],
      [field]: value
    };

    const { updatedProductos, total } = calculateTotals(newProductos);

    setHaberForm(prev => ({
      ...prev,
      productos: updatedProductos,
      total: total
    }));

    if (errors[`producto${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`producto${index}`];
        return newErrors;
      });
    }
  };

  const handleInputChange = (field, value) => {
    setHaberForm(prev => {
      const updatedForm = {
        ...prev,
        [field]: value
      };
      
      // Auto-complete monto with control value when control is changed
      if (field === 'control') {
        const controlValue = value;
        const newProductos = updatedForm.productos.map(producto => ({
          ...producto,
          monto: controlValue
        }));
        
        const { updatedProductos, total } = calculateTotals(newProductos);
        
        return {
          ...updatedForm,
          productos: updatedProductos,
          total: total
        };
      }
      
      return updatedForm;
    });

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h2>Registrar Haber</h2>
        <div className="header-buttons">
          <button onClick={onDebeClick} className="income-button">
            Ir a Debe
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Empresa Correspondiente:</label>
        <select
          value={haberForm.empresa}
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
            value={haberForm.mes}
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
            value={haberForm.año}
            onChange={(e) => handleInputChange('año', e.target.value)}
            maxLength="4"
            className={errors.año ? 'error' : ''}
          />
          {errors.año && <span className="error-message">{errors.año}</span>}
        </div>
      </div>

      <div className="form-group">
        <label>Control:</label>
        <input
          type="number"
          placeholder="Ingrese el valor de control"
          value={haberForm.control}
          onChange={(e) => handleInputChange('control', e.target.value)}
          className={errors.control ? 'error' : ''}
        />
        {errors.control && <span className="error-message">{errors.control}</span>}
      </div>

      <div className="form-group">
        <label>Tipo de Haber:</label>
        <select
          value={haberForm.tipoHaber}
          onChange={(e) => handleInputChange('tipoHaber', e.target.value)}
          className={errors.tipoHaber ? 'error' : ''}
        >
          <option value="">Seleccione tipo</option>
          {tiposHaber.map(tipo => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>
        {errors.tipoHaber && <span className="error-message">{errors.tipoHaber}</span>}
      </div>

      {haberForm.productos.map((producto, index) => (
        <div key={index} className="product-row">
          <input
            type="text"
            placeholder="Detalle"
            value={producto.detalle}
            onChange={(e) => handleProductoChange(index, 'detalle', e.target.value)}
            className={errors[`producto${index}`] ? 'error' : ''}
          />
          <input
            type="number"
            placeholder="Monto"
            value={producto.monto}
            onChange={(e) => handleProductoChange(index, 'monto', e.target.value)}
            className={errors[`producto${index}`] ? 'error' : ''}
            readOnly
          />
          <div className="subtotal">
            ${parseFloat(producto.subtotal || 0).toFixed(2)}
          </div>
          {errors[`producto${index}`] && (
            <span className="error-message product-error">
              {errors[`producto${index}`]}
            </span>
          )}
        </div>
      ))}

      <div className="total">
        Total: ${haberForm.total.toFixed(2)}
      </div>

      <div className="button-group">
        <button onClick={handleHaberSubmit} className="save-button">
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

        .income-button {
          padding: 8px 16px;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .form-group {
          margin-bottom: 20px;
          position: relative;
        }

        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-row .form-group {
          flex: 1;
          margin-bottom: 0;
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

        .product-error {
          position: absolute;
          left: 0;
          bottom: -20px;
        }

        .product-row {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
          align-items: center;
          position: relative;
        }

        .product-row input[type="text"] {
          flex: 2;
        }

        .product-row input[type="number"] {
          flex: 1;
        }

        .subtotal {
          min-width: 100px;
          text-align: right;
          font-weight: bold;
        }

        .total {
          margin: 20px 0;
          text-align: right;
          font-size: 1.2em;
          font-weight: bold;
        }

        .select-empresa {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
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
          background-color: #28a745;
          color: white;
        }

        .back-button {
          margin-left: 30%;
          padding: 10px 15px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default Haber;
import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';

function Empresas({ onBack }) {  // Recibimos onBack como prop
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [empresas, setEmpresas] = useState([]);

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

  const handleAddEmpresa = async (e) => {
    e.preventDefault();
    if (nombre && rut) {
      try {
        await addDoc(collection(db, 'empresas'), {
          nombre: nombre,
          rut: rut
        });
        setNombre('');
        setRut('');
      } catch (error) {
        console.error('Error al agregar la empresa:', error);
      }
    } else {
      alert('Por favor, complete ambos campos.');
    }
  };

  const handleDeleteEmpresa = async (id) => {
    try {
      await deleteDoc(doc(db, 'empresas', id));
    } catch (error) {
      console.error('Error al eliminar la empresa:', error);
    }
  };

  const handleEditEmpresa = async (id) => {
    const newNombre = prompt('Nuevo nombre de la empresa:');
    const newRut = prompt('Nuevo RUT de la empresa:');
    if (newNombre && newRut) {
      try {
        await updateDoc(doc(db, 'empresas', id), {
          nombre: newNombre,
          rut: newRut
        });
      } catch (error) {
        console.error('Error al editar la empresa:', error);
      }
    } else {
      alert('Por favor, ingrese un nuevo nombre y RUT.');
    }
  };

  return (
    <div className="container">
      <h2>Empresas</h2>

      <button onClick={onBack} className="back-button">
        Volver al Menú Principal
      </button>

      <form onSubmit={handleAddEmpresa}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre de la Empresa</label>
          <input
            id="nombre"
            type="text"
            placeholder="Nombre de la empresa"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="rut">RUT de la Empresa</label>
          <input
            id="rut"
            type="text"
            placeholder="RUT de la empresa"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
          />
        </div>
        <button type="submit" className="add-button">Agregar Empresa</button>
      </form>

      <h3>Lista de Empresas</h3>
      <ul className="empresas-list">
        {empresas.map((empresa) => (
          <li key={empresa.id} className="empresa-item">
            <span><strong>{empresa.nombre}</strong> - {empresa.rut}</span>
            <div className="button-group">
              <button className="edit-button" onClick={() => handleEditEmpresa(empresa.id)}>Editar</button>
              <button className="delete-button" onClick={() => handleDeleteEmpresa(empresa.id)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
        }

        h2 {
          text-align: center;
          color: #333;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }

        .add-button {
          width: 100%;
          padding: 12px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 10px;
        }

        .empresas-list {
          list-style-type: none;
          padding: 0;
        }

        .empresa-item {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .button-group button {
          padding: 6px 12px;
          margin-left: 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        .edit-button {
          background-color: #007bff;
          color: white;
        }

        .delete-button {
          background-color: #dc3545;
          color: white;
        }

        button:hover {
          opacity: 0.8;
        }

        .button-group button:hover {
          background-color: #555;
        }

        .back-button {
          position: absolute;
          top: 20px;
          padding: 10px 15px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .back-button:hover {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  );
}

export default Empresas;
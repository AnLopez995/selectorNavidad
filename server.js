const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Configura conexión a la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'novenaManagment',
  password: 'root',
  port: 5432,
});

const app = express();
app.use(cors());
app.use(bodyParser.json());
const PORT = 3000;

// Función para cargar el Excel en la tabla posibles_participantes
async function loadExcelData() {
  const filePath = path.join(__dirname, 'data.xlsx'); // Coloca tu archivo Excel en la raíz del proyecto y asegúrate de que tenga este nombre

  if (!fs.existsSync(filePath)) {
    console.error('Archivo Excel no encontrado:', filePath);
    return;
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    // Insertar datos en la base de datos
    for (const row of jsonData) {
      const documento = row['Documento de identidad']?.toString().trim();
      const nombre = row['Nombre']?.trim();

      if (documento && nombre) {
        await pool.query(
          'INSERT INTO posibles_participantes (documento, nombre) VALUES ($1, $2) ON CONFLICT (documento) DO NOTHING',
          [documento, nombre]
        );
      }
    }

    console.log('Datos del archivo Excel cargados en posibles_participantes.');
  } catch (error) {
    console.error('Error al cargar el archivo Excel:', error);
  }
}

// Cargar los datos al iniciar el servidor
loadExcelData();

// Endpoint para buscar participantes
app.post('/buscar', async (req, res) => {
    const { cedula } = req.body;
  
    try {
      // Buscar en participantes
      const participante = await pool.query('SELECT * FROM participantes WHERE documento = $1', [cedula]);
      if (participante.rows.length > 0) {
        return res.json({ encontrado: true, mensaje: 'Ya está registrado.', ...participante.rows[0] });
      }
  
      // Buscar en posibles_participantes
      const posible = await pool.query('SELECT * FROM posibles_participantes WHERE documento = $1', [cedula]);
      if (posible.rows.length > 0) {
        const { documento, nombre } = posible.rows[0];
        await pool.query('INSERT INTO participantes (documento, nombre) VALUES ($1, $2)', [documento, nombre]);
        return res.json({ encontrado: true, mensaje: 'Participante registrado exitosamente.', documento, nombre });
      }
  
      // Si no se encuentra en ninguna tabla
      return res.json({ encontrado: false, mensaje: 'Cédula no encontrada.' });
    } catch (error) {
      console.error('Error en la búsqueda de cédula:', error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  });
  

// Endpoint para registrar manualmente
app.post('/registrar-manual', async (req, res) => {
  const { documento, nombre } = req.body;

  try {
    await pool.query(
      'INSERT INTO participantes (documento, nombre) VALUES ($1, $2) ON CONFLICT (documento) DO NOTHING',
      [documento, nombre]
    );
    return res.json({ mensaje: 'Participante registrado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar participante' });
  }
});

// Endpoint para obtener todos los participantes
app.get('/obtener-participantes', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM participantes');
      res.json(result.rows); // Devuelve todos los registros en formato JSON
    } catch (error) {
      console.error('Error al obtener participantes:', error);
      res.status(500).json({ error: 'Error en el servidor al obtener participantes.' });
    }
  });

  // Endpoint para eliminar un participante por su documento
app.delete('/eliminar-participante', async (req, res) => {
    const { documento } = req.body;
  
    if (!documento) {
      return res.status(400).json({ error: 'El documento es requerido.' });
    }
  
    try {
      const result = await pool.query('DELETE FROM participantes WHERE documento = $1', [documento]);
  
      if (result.rowCount > 0) {
        res.json({ mensaje: 'Participante eliminado exitosamente.' });
      } else {
        res.status(404).json({ error: 'Participante no encontrado.' });
      }
    } catch (error) {
      console.error('Error al eliminar participante:', error);
      res.status(500).json({ error: 'Error en el servidor al eliminar participante.' });
    }
  });

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://192.168.101.125:${PORT}`);
});

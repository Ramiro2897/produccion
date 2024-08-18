const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 3000;

// Conexión a la base de datos PostgreSQL
const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432, // Puerto por defecto para PostgreSQL
});

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Ruta para mostrar la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para obtener las tareas desde la base de datos
app.get('/tasks', async (req, res) => {
  try {
    const query = 'SELECT * FROM tasks';
    const result = await db.query(query);
    res.json(result.rows); // PostgreSQL retorna resultados en `rows`
  } catch (err) {
    console.error('Error al obtener tareas:', err);
    res.status(500).send('Error al obtener tareas');
  }
});

// Ruta para agregar una nueva tarea
app.post('/add', async (req, res) => {
  const newTask = req.body.task;
  try {
    const query = 'INSERT INTO tasks (description) VALUES ($1)';
    await db.query(query, [newTask]);
    res.redirect('/');
  } catch (err) {
    console.error('Error al agregar tarea:', err);
    res.status(500).send('Error al agregar tarea');
  }
});

// Ruta para eliminar una tarea
app.post('/delete/:id', async (req, res) => {
  const taskId = req.params.id;
  try {
    const query = 'DELETE FROM tasks WHERE id = $1';
    await db.query(query, [taskId]);
    res.redirect('/');
  } catch (err) {
    console.error('Error al eliminar tarea:', err);
    res.status(500).send('Error al eliminar tarea');
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

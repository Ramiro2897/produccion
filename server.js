const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 3000;

// Conexión a la base de datos PostgreSQL
const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

// Crear servidor HTTP y vincularlo con Socket.IO
const server = http.createServer(app);
const io = socketIo(server);

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Ruta para mostrar la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let visitCount = 0;

// Función para obtener el contador de visitas
async function getVisitCount() {
  return visitCount;
}

// Incrementar el contador de visitas y emitir el nuevo valor
async function incrementVisitCount() {
  visitCount += 1;
  io.emit('visitCount', visitCount);
}

// Socket.IO para manejar eventos
io.on('connection', async (socket) => {
  console.log('Nuevo cliente conectado');

  incrementVisitCount();

  try {
    const allUcusResult = await db.query('SELECT * FROM ucu');
    const allUcus = allUcusResult.rows;

    const total = allUcus.length;
    const completadas = allUcus.filter(ucu => ucu.completado).length;
    const porcentaje = total > 0 ? (completadas / total) * 100 : 0;

    // Emitir el porcentaje de completado al cliente conectado
    socket.emit('completionPercentage', porcentaje.toFixed(2));
  } catch (error) {
    console.error('Error al calcular el porcentaje de completado:', error);
  }

   // Obtener el contador de visitas y emitirlo al cliente
  socket.on('getVisitCount', async () => {
    try {
      const count = await getVisitCount();
      socket.emit('visitCount', count);
    } catch (err) {
      console.error('Error al obtener el contador de visitas:', err);
    }
  });

  socket.on('completeUcu', async (id) => {
    try {
        // Actualizar la UCU en la base de datos usando el id
        await db.query('UPDATE ucu SET completado = TRUE WHERE id = $1', [id]);

         // Obtener la UCU actualizada
         const result = await db.query('SELECT * FROM ucu WHERE id = $1', [id]);
         const updatedUcu = result.rows[0];
         socket.emit('ucuCompleted', updatedUcu);

        // Obtener el porcentaje de completado
        const allUcusResult = await db.query('SELECT * FROM ucu');
        const allUcus = allUcusResult.rows;

        const total = allUcus.length;
        const completadas = allUcus.filter(ucu => ucu.completado).length;
        const porcentaje = (completadas / total) * 100;

        // Emitir el porcentaje de completado a todos los clientes
        io.emit('completionPercentage', porcentaje);
        

    } catch (error) {
        console.error('Error al completar la UCU:', error);
    }
});



  // Función para obtener el número total de UCUs
  async function getTotalUcus() {
    try {
      const result = await db.query('SELECT COUNT(*) AS total FROM ucu');
      return parseInt(result.rows[0].total, 10);
    } catch (err) {
      console.error('Error al obtener el total de UCUs:', err);
      return 0;
    }
  }

  // Obtener el total de UCUs y emitirlo al cliente
  socket.on('getTotalUcus', async () => {
    try {
      const total = await getTotalUcus();
      socket.emit('totalUcus', total);
    } catch (err) {
      console.error('Error al obtener el total de UCUs:', err);
    }
  });

  // Emitir el total de UCUs a todos los clientes
  async function emitTotalUcus() {
    const total = await getTotalUcus();
    io.emit('totalUcus', total);
  }

  // Enviar la lista de UCUs a un cliente al conectarse
  socket.on('getUcus', async () => {
    try {
      const result = await db.query('SELECT * FROM ucu');
      socket.emit('ucusList', result.rows);
    } catch (err) {
      console.error('Error al obtener UCUs:', err);
    }
  });

  socket.on('addUcu', async (ucuData) => {
    console.log('Datos recibidos en el servidor:', ucuData);
    try {
      const query = 'INSERT INTO ucu (item, cuotas, barrio, referencia, recuentista, completado) VALUES ($1, $2, $3, $4, $5, $6)';
      await db.query(query, [ucuData.item, ucuData.cuotas, ucuData.barrio, ucuData.referencia, ucuData.recuentista, ucuData.completado]);

      // Obtener la lista completa de UCUs después de agregar una nueva UCU
      const result = await db.query('SELECT * FROM ucu');
      io.emit('ucusList', result.rows); // Emitir la lista actualizada a todos los clientes
      emitRecuentistaCounts();
      emitTotalUcus();
    } catch (err) {
      console.error('Error al agregar UCU:', err);
    }
  });

  socket.on('deleteUcu', async (id) => {
    try {
        // Eliminar la UCU de la base de datos usando el id
        await db.query('DELETE FROM ucu WHERE id = $1', [id]);

        // Emitir evento para que todos los clientes actualicen la tabla
        const result = await db.query('SELECT * FROM ucu');
        io.emit('ucusList', result.rows);
        emitRecuentistaCounts();
        emitTotalUcus();

    } catch (error) {
        console.error('Error al eliminar la UCU:', error);
    }
});


  // Manejar la solicitud de UCUs filtrados por recuentista
  socket.on('getUcusByRecuentista', async (recuentista) => {
    console.log('Obteniendo UCUs para recuentista:', recuentista);
    try {
      // Consultar UCUs filtrados por el recuentista
      const query = 'SELECT * FROM ucu WHERE recuentista = $1';
      const result = await db.query(query, [recuentista]);

      // Enviar la lista filtrada de UCUs al cliente
      socket.emit('ucusByRecuentista', result.rows);
    } catch (err) {
      console.error('Error al obtener UCUs por recuentista:', err);
    }
  });

  // Función para contar UCUs por recuentista
  async function getUcuCountsByRecuentista() {
    try {
      const result = await db.query(`
        SELECT recuentista, COUNT(*) AS count
        FROM ucu
        GROUP BY recuentista
      `);
      return result.rows.reduce((acc, row) => {
        acc[row.recuentista] = parseInt(row.count, 10);
        return acc;
      }, {});
    } catch (err) {
      console.error('Error al obtener conteos de UCUs por recuentista:', err);
      return {};
    }
  }

  // Obtener los conteos de UCUs por recuentista
  socket.on('getRecuentistaCounts', async () => {
    try {
      const counts = await getUcuCountsByRecuentista();
      socket.emit('recuentistaCounts', counts);
    } catch (err) {
      console.error('Error al obtener conteos de recuentista:', err);
    }
  });

  // Emitir conteos de UCUs a todos los clientes
  async function emitRecuentistaCounts() {
    const counts = await getUcuCountsByRecuentista();
    io.emit('recuentistaCounts', counts);
  }

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciar el servidor
server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

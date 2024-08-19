const socket = io(); 

const openModalButton = document.getElementById('openModalButton');
const modal = document.querySelector('.modal_add__ucu');
const closeButton = document.getElementById('closeButton');
const addButton = document.getElementById('addButton');
const recuentistaButtons = document.querySelectorAll('.recuentistaButton');

// Función para actualizar la tabla con los datos de la base de datos
function updateTable(ucus) {
  const tbody = document.querySelector('.lista_ucu tbody');
  tbody.innerHTML = ''; 

  ucus.forEach(ucu => {
    const row = document.createElement('tr');
    row.dataset.id = ucu.id;// Agregar el item como data-atributo para referencia
    row.style.backgroundColor = ucu.completado ? '#a5d6a7' : '';
    row.innerHTML = `
      <td><div class="cell-content">${ucu.item}</div></td>
      <td><div class="cell-content cuotas">${ucu.cuotas}</div></td>
      <td><div class="cell-content">${ucu.barrio}</div></td>
      <td><div class="cell-content">${ucu.referencia}</div></td>
      <td>
        <div class="button-group">
          <button class="completeButton"><i class="fas fa-check"></i></button>
          <button class="deleteButton"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Añadir event listeners para los botones de completar
document.querySelectorAll('.completeButton').forEach(button => {
    button.addEventListener('click', (event) => {
      const row = event.target.closest('tr');
      const id = row.dataset.id; 
      socket.emit('completeUcu', id);
    });
  });
  
  // Añadir event listeners para los botones de eliminar
  document.querySelectorAll('.deleteButton').forEach(button => {
    button.addEventListener('click', (event) => {
      const row = event.target.closest('tr');
      const id = row.dataset.id; 
      if (confirm('¿Estás seguro de que deseas eliminar este UCU?')) {
        socket.emit('deleteUcu', id);
      }
    });
  });
}

// completadaaaaaaaaaaaaaaaaaaaaaa
socket.on('ucuCompleted', (updatedUcu) => {
    const row = document.querySelector(`tr[data-id="${updatedUcu.id}"]`);
    if (row) {
        row.style.backgroundColor = '#a5d6a7'; // Cambia el color de la fila para indicar que está completada
    }
});

// Actualizar la tabla cuando se recibe el evento 'ucusList'
socket.on('ucusList', (ucus) => {
    updateTable(ucus);
  });

// Manejar el clic en los botones de recuentistas
recuentistaButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const recuentista = event.target.getAttribute('data-recuentista');
      socket.emit('getUcusByRecuentista', recuentista);
    });
  });
  
  // Actualizar la tabla con los UCUs filtrados por recuentista
socket.on('ucusByRecuentista', (ucus) => {
 updateTable(ucus);
});

function updateTotalUCUs(total) {
 document.getElementById('totalUCUs').textContent = total;
}

// Función para actualizar el contador de visitas
function updateVisitCount(count) {
    document.getElementById('visitCount').textContent = `Número de visitas: ${count}`;
}

socket.on('visitCount', (count) => {
    updateVisitCount(count);
});

// Escuchar el evento 'totalUcus' para actualizar el total de UCUs
socket.on('totalUcus', (total) => {
 updateTotalUCUs(total);
});

// Solicitar la lista de UCUs cuando se carga la página
window.addEventListener('load', () => {
  socket.emit('getUcus');
  socket.emit('getRecuentistaCounts');
  socket.emit('getTotalUcus');
  socket.emit('getVisitCount');
});

openModalButton.addEventListener('click', () => {
  modal.style.display = 'flex';
  document.getElementById('itemInput').value = '';
  document.getElementById('cuotasInput').value = '';
  document.getElementById('barrioInput').value = '';
  document.getElementById('referenciaInput').value = '';
  document.getElementById('recountistInput').value = '';
});

closeButton.addEventListener('click', () => {
  modal.style.display = 'none';
  document.getElementById('itemInput').value = '';
  document.getElementById('cuotasInput').value = '';
  document.getElementById('barrioInput').value = '';
  document.getElementById('referenciaInput').value = '';
  document.getElementById('recountistInput').value = '';
});

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

addButton.addEventListener('click', () => {
  const item = document.getElementById('itemInput').value;
  const cuotas = document.getElementById('cuotasInput').value;
  const barrio = document.getElementById('barrioInput').value;
  const referencia = document.getElementById('referenciaInput').value;
  const recuentista = document.getElementById('recountistInput').value;
  const completed = false; 

  if (item && cuotas && barrio && referencia && recuentista) {
    if (!/^\d{6}$/.test(item)) {
      alert('Número UCU debe ser de 6 dígitos.');
      return;
    }
    if (!/^\d{1,2}$/.test(cuotas)) {
      alert('Cuotas debe ser un número de hasta 2 dígitos.');
      return;
    }

    const ucuData = { item, cuotas, barrio, referencia, recuentista, completed };
    socket.emit('addUcu', ucuData);
    modal.style.display = 'none'; 
  } else {
    alert('Por favor, completa todos los campos.');
  }
});

// Escuchar el evento 'ucuAdded' para actualizar la tabla en tiempo real
socket.on('ucuAdded', (ucuData) => {
  // Solicitar la lista completa de UCUs después de agregar uno nuevo
  socket.emit('getUcus');
});

// Función para actualizar los conteos de UCUs en los botones de recuentistas
function updateRecuentistaCounts(counts) {
    const recuentistaButtons = document.querySelectorAll('.recuentistaButton');
    
    recuentistaButtons.forEach(button => {
      const recuentistaName = button.getAttribute('data-recuentista');
      const count = counts[recuentistaName] || 0;
      button.querySelector('span').textContent = count;
    });
  }
  
  // Escuchar el evento 'recuentistaCounts' para actualizar los conteos de UCUs
  socket.on('recuentistaCounts', (counts) => {
    console.log('Conteos de recuentista recibidos:', counts); 
    updateRecuentistaCounts(counts);
  });

  const year = new Date().getFullYear();
  const copyrightText = `Todos los derechos reservados © ${year} Ramiro González`;
  document.querySelector('.copyright').textContent = copyrightText;


  // Actualizar el porcentaje de completado cuando se recibe el evento 'completionPercentage'
socket.on('completionPercentage', (porcentaje) => {
    updateCompletionPercentage(porcentaje);
});

// Función para actualizar el porcentaje de completado
function updateCompletionPercentage(porcentaje) {
    const completionDiv = document.getElementById('completionPercentage');
    // Convertir el porcentaje a número antes de aplicar toFixed
    const porcentajeNumero = Number(porcentaje);
    completionDiv.textContent = `Porcentaje completado: ${porcentajeNumero.toFixed(2)}%`;
  }

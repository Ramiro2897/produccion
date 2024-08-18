document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById('taskForm');
  const taskList = document.getElementById('taskList');

  // Cargar las tareas cuando la página se carga
  fetch('/tasks')
    .then(response => response.json())
    .then(tasks => {
      tasks.forEach(task => addTaskToDOM(task));
    });

  // Agregar tarea mediante el formulario
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const taskInput = document.getElementById('taskInput');
    const task = taskInput.value;

    fetch('/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `task=${task}`
    }).then(() => {
      taskInput.value = '';
      fetch('/tasks')
        .then(response => response.json())
        .then(tasks => {
          taskList.innerHTML = '';
          tasks.forEach(task => addTaskToDOM(task));
        });
    });
  });

  // Función para agregar una tarea al DOM
  function addTaskToDOM(task) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${task.description}</span>
      <form action="/delete/${task.id}" method="POST">
        <button type="submit">Eliminar</button>
      </form>
    `;
    taskList.appendChild(li);

    li.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      fetch(`/delete/${task.id}`, {
        method: 'POST'
      }).then(() => {
        li.remove();
      });
    });
  }
});

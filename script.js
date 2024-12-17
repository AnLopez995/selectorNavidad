let participants = []; // Lista de participantes
let firstRoundWinners = []; // Primer grupo de 5 ganadores
let secondRoundWinners = []; // Segundo grupo de 3 ganadores
let finalWinner = null; // Ganador final
let currentWinners = []; // Lista temporal para la fase actual
let currentPhase = 1; // Fase actual del sorteo
let confettiInterval;

document.getElementById('register-btn').addEventListener('click', registerParticipant);
document.getElementById('manual-register-btn').addEventListener('click', registerManualParticipant);
document.getElementById('finalize-btn').addEventListener('click', finalizeRegistration);
document.getElementById('next-btn').addEventListener('click', startSingleSelection);

// Cargar participantes desde la base de datos
async function cargarParticipantes() {
  try {
    const response = await fetch('http://192.168.101.125:3000/obtener-participantes');
    participants = await response.json();
    console.log('Participantes cargados:', participants);
  } catch (error) {
    console.error('Error al cargar participantes:', error);
    alert('Error al cargar participantes. Intenta nuevamente.');
  }
}

async function eliminarGanador(documento) {
  try {
    const response = await fetch('http://192.168.101.125:3000/eliminar-participante', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento }), // Envía el documento en el body
    });

    const result = await response.json();
    if (response.ok) {
      console.log('Participante eliminado:', result);
    } else {
      console.error('Error al eliminar participante:', result.error);
      alert('Error al eliminar el ganador. Intenta nuevamente.');
    }
  } catch (error) {
    console.error('Error al comunicarse con el servidor:', error);
    alert('Error en la conexión con el servidor.');
  }
}

async function buscarCedula(cedula) {
  const response = await fetch('http://192.168.101.125:3000/buscar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cedula }),
  });
  return response.json();
}

async function registrarManual(documento, nombre) {
  const response = await fetch('http://192.168.101.125:3000/registrar-manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento, nombre }),
  });
  return response.json();
}

function finalizeRegistration() {
  document.querySelector('h1').innerHTML = '🎄 Selección de Ganadores 🎅';
  document.getElementById('registration').style.display = 'none';
  document.getElementById('manual-registration').style.display = 'none';
  document.getElementById('finalize-btn').style.display = 'none';
  document.getElementById('sorteo').style.display = 'block';
  cargarParticipantes();
}

function startSingleSelection() {
  const nameDisplay = document.getElementById('name-display');

  if (currentPhase === 1) {
    if (firstRoundWinners.length < 5) {
      animateWinnerSelection(participants, firstRoundWinners, nameDisplay, 'Fase 1');
    }
    if (firstRoundWinners.length === 5) {
      // Bloquear la selección adicional y avanzar de fase
      alert('¡Fase 1 completada! Pasamos a la selección de 3 ganadores.');
      currentWinners = [...firstRoundWinners]; // Transferir ganadores
      currentPhase = 2; // Avanzar de fase
      clearTable(); // Limpiar la tabla para la nueva fase
      updatePhaseTitle(2); // Actualizar título
    }
  } else if (currentPhase === 2) {
    if (secondRoundWinners.length < 3) {
      animateWinnerSelection(currentWinners, secondRoundWinners, nameDisplay, 'Fase 2');
    }
    if (secondRoundWinners.length === 3) {
      alert('¡Fase 2 completada! Pasamos a la selección del ganador final.');
      currentWinners = [...secondRoundWinners]; // Transferir ganadores
      currentPhase = 3; // Avanzar de fase
      clearTable(); // Limpiar la tabla
      updatePhaseTitle(3);
    }
  } else if (currentPhase === 3) {
    if (!finalWinner) {
      animateWinnerSelection(currentWinners, [], nameDisplay, 'Fase Final', () => {
        clearTable(); // Limpiar la tabla
        document.getElementById('winners-table').style.display = 'none';
        addWinnerToTable('Fase Final', finalWinner.nombre);
        launchFireworks();
        setTimeout(() => {
          alert(`¡El ganador final es ${finalWinner.nombre}! 🎉`);
          eliminarGanador(finalWinner.documento);
          resetProcess();
          stopFireworks(); // Detener el confeti
        }, 5000);
      });
    }
  }
}



function clearTable() {
  document.getElementById('winners-body').innerHTML = ''; // Limpia la tabla de ganadores
}


function animateWinnerSelection(pool, targetArray, displayElement, phaseName, callback) {
  let totalDuration = 1000; // Duración total de la animación
  let currentDelay = 100;   // Intervalo inicial
  let timeElapsed = 0;

  let finalSelectedWinner = null; // Variable para almacenar el ganador definitivo

  const intervalFunction = () => {
    if (timeElapsed >= totalDuration) {
      clearInterval(randomNamesInterval);

      // Seleccionar el ganador final solo si el pool no está vacío
      if (pool.length > 0) {
        finalSelectedWinner = getRandomParticipants(1, pool)[0];
        console.log(finalSelectedWinner)
      }

      if (finalSelectedWinner) {
        // Solo en la fase final: eliminar los demás participantes
        if (phaseName === 'Fase Final') {
          pool.length = 0; // Vacía el pool
          currentWinners.length = 0; // Vacía cualquier lista temporal
          currentWinners.push(finalSelectedWinner); // Mantiene solo el ganador final
          finalWinner = finalSelectedWinner; // Actualiza la variable finalWinner
        } else {
          targetArray.push(finalSelectedWinner); // Fases intermedias: agregar ganador
        }

        // Eliminar el ganador del pool
        const index = pool.findIndex((p) => p.documento === finalSelectedWinner.documento);
        if (index !== -1) pool.splice(index, 1);

        // Mostrar el ganador en la pantalla
        displayElement.innerHTML = `<span class="winner-name">🎁 ${finalSelectedWinner.nombre} 🎁</span>`;
        addWinnerToTable(phaseName, finalSelectedWinner.nombre);

        console.log(`Ganador seleccionado: ${finalSelectedWinner.nombre}`);
      } else {
        // Manejo del caso donde no se selecciona un ganador
        console.error("Error: No hay participantes disponibles para seleccionar.");
        alert("No hay participantes disponibles para seleccionar.");
      }

      if (callback) callback(); // Ejecutar callback si existe
      return;
    }

    // Mostrar nombres aleatorios durante la animación solo si el pool no está vacío
    if (pool.length > 0) {
      const randomName = pool[Math.floor(Math.random() * pool.length)];
      displayElement.innerHTML = `<span class="slide-up">${randomName.nombre}</span>`;
    }
    timeElapsed += currentDelay;
    currentDelay += 50;

    clearInterval(randomNamesInterval);
    randomNamesInterval = setInterval(intervalFunction, currentDelay);
  };

  let randomNamesInterval = setInterval(intervalFunction, currentDelay);
}






function addWinnerToTable(phase, name) {
  const tableBody = document.getElementById('winners-body');
  const row = document.createElement('tr');

  row.innerHTML = `
    <td>${phase}</td>
    <td>${name}</td>
  `;
  tableBody.appendChild(row);
}

function updatePhaseTitle(phaseNumber) {
  const phaseTitle = document.getElementById('phase-title');
  if (phaseNumber === 2) {
    phaseTitle.innerHTML = `🎲 Fase 2: Selección de 3 Ganadores`;
  } else if (phaseNumber === 3) {
    phaseTitle.innerHTML = `🏆 Fase Final: Selección del Ganador`;
  } else {
    phaseTitle.innerHTML = `🎲 Fase 1: Selección de 5 Ganadores`;
  }
}

function getRandomParticipants(count, pool) {
  const selected = [];
  const tempPool = [...pool];

  while (selected.length < count && tempPool.length > 0) {
    const index = Math.floor(Math.random() * tempPool.length);
    selected.push(tempPool.splice(index, 1)[0]);
  }
  return selected;
}

function launchFireworks() {
  const defaults = {
    spread: 70,
    startVelocity: 60,
    particleCount: 100, // Cantidad inicial de partículas
    origin: { y: 0.6 },
    zIndex: 9999,
  };

  // Lanza confeti de forma periódica
  confettiInterval = setInterval(() => {
    confetti({
      ...defaults,
      particleCount: 200, // Mayor cantidad de partículas
      scalar: 1.2, // Tamaño de las partículas
    });
  }, 1000); // Lanza confeti cada 1 segundo
}

function stopFireworks() {
  clearInterval(confettiInterval); // Detener el confeti
  confetti.reset(); // Resetea la librería para limpiar partículas activas
}

function resetProcess() {
  firstRoundWinners = [];
  secondRoundWinners = [];
  finalWinner = null;
  currentWinners = [];
  currentPhase = 1;
  document.getElementById('name-display').innerHTML = '🎁 ? 🎁';
  document.getElementById('winners-table').style.display = 'table';
  updatePhaseTitle(1)
  clearTable(); // Limpia la tabla al reiniciar
  cargarParticipantes();
}

async function registerParticipant() {
  const cedulaInput = document.getElementById('cedula').value.trim();
  const msg = document.getElementById('registration-msg');

  if (!cedulaInput) {
    msg.textContent = 'Por favor, ingrese una cédula válida.';
    msg.style.color = 'red';
    return;
  }

  try {
    const result = await buscarCedula(cedulaInput);

    if (result.encontrado) {
      if (result.mensaje === 'Participante registrado exitosamente.') {
        msg.textContent = `${result.nombre} ha sido registrado exitosamente.`;
        msg.style.color = '#2e8b57';
      } else {
        msg.textContent = `${result.nombre} ya está registrado.`;
        msg.style.color = '#2e8b57';
      }
    } else {
      msg.textContent = result.mensaje; // "Cédula no encontrada."
      msg.style.color = 'orange';
      document.getElementById('manual-cedula').value = cedulaInput;
      document.getElementById('manual-registration').style.display = 'block';
    }
  } catch (error) {
    console.error('Error al registrar participante:', error);
    msg.textContent = 'Ocurrió un error en el servidor. Intente de nuevo.';
    msg.style.color = 'red';
  } 
}

async function registerManualParticipant() {
  const manualCedula = document.getElementById('manual-cedula').value.trim();
  const manualNombre = document.getElementById('manual-nombre').value.trim();
  const msg = document.getElementById('manual-registration-msg');

  if (manualCedula && manualNombre) {
    const result = await registrarManual(manualCedula, manualNombre);
    msg.textContent = result.mensaje;
    msg.style.color = '#2e8b57';
    document.getElementById('manual-registration').style.display = 'none';
  } else {
    msg.textContent = 'Por favor, completa todos los campos.';
    msg.style.color = 'red';
  }
} 
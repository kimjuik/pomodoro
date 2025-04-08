// Import required modules
const { ipcRenderer } = require('electron');

// DOM Elements
const timerElement = document.getElementById('timer');
const startButton = document.getElementById('start');
const pauseButton = document.getElementById('pause');
const resetButton = document.getElementById('reset');
const pomodoroButton = document.getElementById('pomodoro');
const shortBreakButton = document.getElementById('short-break');
const longBreakButton = document.getElementById('long-break');
const todoInput = document.getElementById('todo-input');
const estimateInput = document.getElementById('estimate-input');
const addTodoButton = document.getElementById('add-todo');
const todoList = document.getElementById('todo-list');
const clockSoundButton = document.getElementById('clock-sound');
const musicSoundButton = document.getElementById('music-sound');

// Create a new element to display current task
const currentTaskElement = document.createElement('div');
currentTaskElement.id = 'current-task';
currentTaskElement.style.display = 'none';
currentTaskElement.innerHTML = '<h3>Current Task</h3><p>None selected</p>';

// Insert current task element right after the timer
const timerContainer = document.getElementById('app');
timerContainer.insertBefore(currentTaskElement, timerContainer.children[1]);

// Timer settings (default values, will be overwritten by settings)
let POMODORO_TIME = 25 * 60; // 25 minutes in seconds
let SHORT_BREAK_TIME = 5 * 60; // 5 minutes in seconds
let LONG_BREAK_TIME = 15 * 60; // 15 minutes in seconds

// Load settings from localStorage
function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem('pomodoro-settings') || '{}');
    
    // Apply settings if they exist
    if (settings.pomodoroTime) {
      POMODORO_TIME = settings.pomodoroTime * 60;
    }
    
    if (settings.shortBreakTime) {
      SHORT_BREAK_TIME = settings.shortBreakTime * 60;
    }
    
    if (settings.longBreakTime) {
      LONG_BREAK_TIME = settings.longBreakTime * 60;
    }
    
    // If reset is needed after settings change and not running
    if (!isRunning) {
      resetTimer();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Timer state
let currentTime = POMODORO_TIME;
let timerId = null;
let isRunning = false;

// Current task state
let currentTask = null;

// Sound state
let clockSoundPlaying = false;
let musicSoundPlaying = false;
let clockSoundInterval = null;
let musicAudio = null;

// Helper function to format time as MM:SS
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update the timer display
function updateDisplay() {
  timerElement.textContent = formatTime(currentTime);
}

// Start the timer
function startTimer() {
  if (isRunning) return;
  
  isRunning = true;
  startButton.disabled = true;
  pauseButton.disabled = false;
  
  // Automatically start the clock sound
  if (!clockSoundPlaying) {
    startClockSound();
  }
  
  timerId = setInterval(() => {
    currentTime--;
    updateDisplay();
    
    if (currentTime <= 0) {
      clearInterval(timerId);
      isRunning = false;
      notifyUser();
      startButton.disabled = false;
      pauseButton.disabled = true;
      
      // Automatically stop the clock sound when timer ends
      if (clockSoundPlaying) {
        stopClockSound();
      }
    }
  }, 1000);
}

// Pause the timer
function pauseTimer() {
  clearInterval(timerId);
  isRunning = false;
  startButton.disabled = false;
  pauseButton.disabled = true;
  
  // Automatically stop the clock sound when timer is paused
  if (clockSoundPlaying) {
    stopClockSound();
  }
}

// Reset the timer
function resetTimer() {
  pauseTimer();
  
  // Determine which mode is active
  if (pomodoroButton.classList.contains('active')) {
    currentTime = POMODORO_TIME;
  } else if (shortBreakButton.classList.contains('active')) {
    currentTime = SHORT_BREAK_TIME;
  } else {
    currentTime = LONG_BREAK_TIME;
  }
  
  updateDisplay();
}

// Notify user when timer ends
function notifyUser() {
  // Play sound (louder beep)
  const audio = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
  audio.play();
  
  // Play the sound 3 times with delay
  setTimeout(() => audio.play(), 700);
  setTimeout(() => audio.play(), 1400);
  
  // Show alert dialog
  if (pomodoroButton.classList.contains('active')) {
    // Create a more visible and dramatic alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'rest-alert';
    alertDiv.innerHTML = `
      <div class="rest-alert-content">
        <h2>Time to Rest!</h2>
        <p>You've completed a pomodoro session.</p>
        <p>Take a break, stretch, rest your eyes and mind.</p>
        <button id="alert-dismiss">OK, I'll Rest Now</button>
      </div>
    `;
    document.body.appendChild(alertDiv);
    
    // Add event listener to dismiss button
    document.getElementById('alert-dismiss').addEventListener('click', () => {
      document.body.removeChild(alertDiv);
      switchToShortBreak(); // Automatically switch to short break mode
    });
    
    // Show system notification as well
    new Notification('Pomodoro Timer', {
      body: 'Time to rest! Take a break and relax your eyes and mind.'
    });
  } else {
    // Break timer ended
    new Notification('Pomodoro Timer', {
      body: 'Break is over. Time to focus!'
    });
    switchToPomodoro(); // Automatically switch to pomodoro mode
  }
}

// Switch to Pomodoro mode
function switchToPomodoro() {
  pauseTimer();
  currentTime = POMODORO_TIME;
  updateDisplay();
  
  pomodoroButton.classList.add('active');
  shortBreakButton.classList.remove('active');
  longBreakButton.classList.remove('active');
}

// Switch to Short Break mode
function switchToShortBreak() {
  pauseTimer();
  currentTime = SHORT_BREAK_TIME;
  updateDisplay();
  
  pomodoroButton.classList.remove('active');
  shortBreakButton.classList.add('active');
  longBreakButton.classList.remove('active');
}

// Switch to Long Break mode
function switchToLongBreak() {
  pauseTimer();
  currentTime = LONG_BREAK_TIME;
  updateDisplay();
  
  pomodoroButton.classList.remove('active');
  shortBreakButton.classList.remove('active');
  longBreakButton.classList.add('active');
}

// To-Do List functionality
let todos = JSON.parse(localStorage.getItem('pomodoro-todos') || '[]');

// Add a new todo
function addTodo() {
  const text = todoInput.value.trim();
  const estimate = parseInt(estimateInput.value) || 25;
  
  if (text === '') return;
  
  const todo = {
    id: Date.now(),
    text,
    estimate,
    completed: false
  };
  
  todos.push(todo);
  saveTodos();
  renderTodos();
  
  todoInput.value = '';
  estimateInput.value = '';
  todoInput.focus();
}

// Complete a todo
function completeTodo(id) {
  todos = todos.map(todo => {
    if (todo.id === id) {
      const updatedTodo = { ...todo, completed: !todo.completed };
      
      // If this is the current task, update it
      if (currentTask && currentTask.id === id) {
        currentTask = updatedTodo;
        setCurrentTask(currentTask);
      }
      
      return updatedTodo;
    }
    return todo;
  });
  
  saveTodos();
  renderTodos();
}

// Delete a todo
function deleteTodo(id) {
  // If deleting the current task, clear it
  if (currentTask && currentTask.id === id) {
    setCurrentTask(null);
  }
  
  todos = todos.filter(todo => todo.id !== id);
  saveTodos();
  renderTodos();
}

// Save todos to localStorage
function saveTodos() {
  localStorage.setItem('pomodoro-todos', JSON.stringify(todos));
}

// Set current task to display at the head of timer
function setCurrentTask(todo) {
  currentTask = todo;
  
  if (!todo) {
    currentTaskElement.style.display = 'none';
    return;
  }
  
  // Update current task display
  currentTaskElement.style.display = 'block';
  currentTaskElement.innerHTML = `
    <h3>Current Task</h3>
    <p class="${todo.completed ? 'todo-done' : ''}">${todo.text}</p>
    <span class="todo-estimate">${todo.estimate} min</span>
  `;
  
  // If it's not already in Pomodoro mode, switch to it
  if (!pomodoroButton.classList.contains('active')) {
    switchToPomodoro();
  }
  
  // If the estimate time is different, offer to adjust the timer
  if (todo.estimate !== POMODORO_TIME / 60 && !isRunning) {
    const adjustTimer = confirm(`Adjust timer to task's estimated time (${todo.estimate} minutes)?`);
    
    if (adjustTimer) {
      currentTime = todo.estimate * 60;
      updateDisplay();
    }
  }
}

// Render the todo list
function renderTodos() {
  todoList.innerHTML = '';
  
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    
    // Highlight the current task
    if (currentTask && todo.id === currentTask.id) {
      li.classList.add('current-task-highlight');
    }
    
    const textSpan = document.createElement('span');
    textSpan.className = `todo-text ${todo.completed ? 'todo-done' : ''}`;
    textSpan.textContent = todo.text;
    
    const estimateSpan = document.createElement('span');
    estimateSpan.className = 'todo-estimate';
    estimateSpan.textContent = `${todo.estimate} min`;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'todo-actions';
    
    const checkButton = document.createElement('button');
    checkButton.className = 'todo-check';
    checkButton.textContent = todo.completed ? 'Undo' : 'Done';
    checkButton.addEventListener('click', () => completeTodo(todo.id));
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'todo-delete';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteTodo(todo.id));
    
    actionsDiv.appendChild(checkButton);
    actionsDiv.appendChild(deleteButton);
    
    li.appendChild(textSpan);
    li.appendChild(estimateSpan);
    li.appendChild(actionsDiv);
    
    // Add click event to the entire li to set as current task
    li.addEventListener('click', (e) => {
      // Prevent triggering when action buttons are clicked
      if (e.target.tagName !== 'BUTTON') {
        setCurrentTask(todo);
        renderTodos(); // Re-render to update highlight
      }
    });
    
    todoList.appendChild(li);
  });
}

// Sound control functions
function toggleClockSound() {
  if (clockSoundPlaying) {
    stopClockSound();
  } else {
    // Only allow turning on clock sound if timer is running
    if (isRunning) {
      startClockSound();
    } else {
      // Provide visual feedback that clock can't be turned on when timer is paused
      clockSoundButton.classList.add('disabled-feedback');
      setTimeout(() => {
        clockSoundButton.classList.remove('disabled-feedback');
      }, 500);
    }
  }
}

function startClockSound() {
  if (clockSoundPlaying) return;
  
  // Create a realistic clock ticking sound
  function playTickSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a very short sound that mimics a clock tick
    const tickBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.03, audioContext.sampleRate);
    const tickData = tickBuffer.getChannelData(0);
    
    // Generate a sharp click sound
    for (let i = 0; i < tickData.length; i++) {
      // Create a quick decay envelope
      const decay = Math.exp(-5 * i / tickData.length);
      // Add some randomness for wooden clock sound quality
      tickData[i] = (Math.random() * 2 - 1) * decay * 0.5;
    }
    
    // Play the sound
    const tickSource = audioContext.createBufferSource();
    tickSource.buffer = tickBuffer;
    
    // Add slight reverb for natural sound
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2; // Control volume
    
    tickSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    tickSource.start();
    
    // Clean up after sound plays
    setTimeout(() => {
      audioContext.close();
    }, 100);
  }
  
  // Play a tick sound immediately
  playTickSound();
  
  // Play tick sound at regular intervals (every 1 second)
  clockSoundInterval = setInterval(playTickSound, 1000);
  
  clockSoundPlaying = true;
  clockSoundButton.classList.add('active');
  clockSoundButton.querySelector('.icon').innerHTML = '🔇';
  clockSoundButton.querySelector('.label').innerHTML = 'Clock Off';
}

function stopClockSound() {
  if (!clockSoundPlaying) return;
  
  clearInterval(clockSoundInterval);
  clockSoundPlaying = false;
  clockSoundButton.classList.remove('active');
  clockSoundButton.querySelector('.icon').innerHTML = '🔊';
  clockSoundButton.querySelector('.label').innerHTML = 'Clock';
}

function toggleMusic() {
  if (musicSoundPlaying) {
    stopMusic();
  } else {
    startMusic();
  }
}

function startMusic() {
  if (musicSoundPlaying) return;
  
  // Create music audio element
  musicAudio = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3');
  musicAudio.volume = 0.3;
  musicAudio.loop = true;
  musicAudio.play();
  
  musicSoundPlaying = true;
  musicSoundButton.classList.add('active');
  musicSoundButton.querySelector('.icon').innerHTML = '🔇';
  musicSoundButton.querySelector('.label').innerHTML = 'Music Off';
}

function stopMusic() {
  if (!musicSoundPlaying) return;
  
  musicAudio.pause();
  musicAudio = null;
  musicSoundPlaying = false;
  musicSoundButton.classList.remove('active');
  musicSoundButton.querySelector('.icon').innerHTML = '🎵';
  musicSoundButton.querySelector('.label').innerHTML = 'Music';
}

// Event listeners
startButton.addEventListener('click', startTimer);
pauseButton.addEventListener('click', pauseTimer);
resetButton.addEventListener('click', resetTimer);
pomodoroButton.addEventListener('click', switchToPomodoro);
shortBreakButton.addEventListener('click', switchToShortBreak);
longBreakButton.addEventListener('click', switchToLongBreak);
addTodoButton.addEventListener('click', addTodo);
clockSoundButton.addEventListener('click', toggleClockSound);
musicSoundButton.addEventListener('click', toggleMusic);

// Handle form submission
todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTodo();
  }
});

// Request notification permission
if (Notification.permission !== 'granted') {
  Notification.requestPermission();
}

// Initialize the display
updateDisplay();
// Initialize the todo list
renderTodos();
// Load settings
loadSettings();

// Listen for settings updates from the settings window
ipcRenderer.on('apply-settings', (event, settings) => {
  // Update timer settings
  POMODORO_TIME = settings.pomodoroTime * 60;
  SHORT_BREAK_TIME = settings.shortBreakTime * 60;
  LONG_BREAK_TIME = settings.longBreakTime * 60;
  
  // Reset timer if not running
  if (!isRunning) {
    resetTimer();
  }
  
  // Save settings to localStorage (redundant but safe)
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
});
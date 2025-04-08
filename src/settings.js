// Import required modules
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// DOM Elements
const autoStartCheckbox = document.getElementById('auto-start');
const pomodoroTimeInput = document.getElementById('pomodoro-time');
const shortBreakTimeInput = document.getElementById('short-break-time');
const longBreakTimeInput = document.getElementById('long-break-time');
const saveButton = document.getElementById('save-btn');
const cancelButton = document.getElementById('cancel-btn');

// Default settings
let settings = {
  autoStart: false,
  pomodoroTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15
};

// Path for macOS Launch Agent
const launchAgentName = 'io.github.kimjuik.pomodoro.plist';
const launchAgentPath = path.join(os.homedir(), 'Library', 'LaunchAgents', launchAgentName);
const appPath = path.join(path.dirname(path.dirname(__dirname)), 'Pomodoro Timer.app');
const appExecutablePath = path.join(path.dirname(path.dirname(__dirname)), 'Pomodoro Timer.app', 'Contents', 'MacOS', 'Pomodoro Timer');

// Load settings from localStorage
function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem('pomodoro-settings') || '{}');
    
    // Merge saved settings with defaults
    settings = { ...settings, ...savedSettings };
    
    // Check if Launch Agent exists for auto-start
    if (fs.existsSync(launchAgentPath)) {
      settings.autoStart = true;
    }
    
    // Update UI
    autoStartCheckbox.checked = settings.autoStart;
    pomodoroTimeInput.value = settings.pomodoroTime;
    shortBreakTimeInput.value = settings.shortBreakTime;
    longBreakTimeInput.value = settings.longBreakTime;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings
function saveSettings() {
  try {
    // Get values from UI
    settings.autoStart = autoStartCheckbox.checked;
    settings.pomodoroTime = parseInt(pomodoroTimeInput.value) || 25;
    settings.shortBreakTime = parseInt(shortBreakTimeInput.value) || 5;
    settings.longBreakTime = parseInt(longBreakTimeInput.value) || 15;
    
    // Save to localStorage
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
    
    // Handle auto-start setting
    handleAutoStart();
    
    // Send settings to main process to update timers
    ipcRenderer.send('settings-updated', settings);
    
    // Close settings window
    ipcRenderer.send('close-settings');
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('There was an error saving your settings. Please try again.');
  }
}

// Handle auto-start Launch Agent creation/removal
function handleAutoStart() {
  try {
    // Create Launch Agent directory if it doesn't exist
    const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }
    
    if (settings.autoStart) {
      // Create plist file for auto-start
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${launchAgentName}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${appExecutablePath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>`;
      
      fs.writeFileSync(launchAgentPath, plistContent);
      
      // Load the Launch Agent (won't take effect until next login)
      try {
        require('child_process').execSync(`launchctl load ${launchAgentPath}`);
      } catch (err) {
        console.error('Error loading launch agent:', err);
      }
    } else {
      // Remove Launch Agent if it exists
      if (fs.existsSync(launchAgentPath)) {
        try {
          // Unload first
          require('child_process').execSync(`launchctl unload ${launchAgentPath}`);
        } catch (err) {
          console.error('Error unloading launch agent:', err);
        }
        
        // Then delete the file
        fs.unlinkSync(launchAgentPath);
      }
    }
  } catch (error) {
    console.error('Error handling auto-start:', error);
    alert('There was an error configuring auto-start. You may need to set it manually.');
  }
}

// Event listeners
saveButton.addEventListener('click', saveSettings);
cancelButton.addEventListener('click', () => {
  ipcRenderer.send('close-settings');
});

// Initialize settings when page loads
document.addEventListener('DOMContentLoaded', loadSettings);

// Listen for settings request from main process
ipcRenderer.on('request-settings', loadSettings);

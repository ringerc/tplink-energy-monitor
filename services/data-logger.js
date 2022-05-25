const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const dataBroadcaster = require('./data-broadcaster');

let logDirPath;
let logIntervalMs;
let maxLogEntries;

loadLogConfig();

function loadLogConfig() {
  try {
    // Use logger config file specified on command line, otherwise use default one.
    if (process.argv.length > 2) {
      loggerConfigPath = process.argv[2];
    } else {
      loggerConfigPath = process.env.TEM_CONFIG_FILE_PATH || 'logger-config.json';
    }
    console.log('Logger config file: "' + loggerConfigPath + '"')

    let config  = JSON.parse(fs.readFileSync(loggerConfigPath, 'utf8'));
    logDirPath = process.env.TEM_LOG_DIR_PATH || config.logDirPath;
    logIntervalMs = ((process.env.TEM_LOG_INTERVAL_SECONDS || config.logIntervalSeconds) * 1000);
    maxLogEntries = process.env.TEM_MAX_LOG_ENTRIES || config.maxLogEntries;

  }
  catch (err) {
    console.warn('Error reading logger config. Reverting to defaults.', err);
    logDirPath = '.'      // Current directory
    logIntervalMs = 60000 // 1 min
    maxLogEntries = 1440  // 24 hrs at 1/min
  }

  // Create log directory path if it doesn't already exist and check its access
  console.log('Log directory path: "' + logDirPath + '"')
  try {
    fs.mkdirSync(logDirPath, true);
  } catch (err) {
    if (!(err.code === 'EEXIST')) {
      console.error("Failed to create data log directory at " + logDirPath + ": ", err);
      throw(err);
    }
  }
  try {
    fs.accessSync(logDirPath,fs.constants.W_OK);
  } catch (err) {
    console.error("Data log directory " + logDirPath + " or a parent directory is not writeable by the current user: ", err);
    throw(err);
  }
}

function startLogging(device) {
  setInterval(() => { log(device); }, logIntervalMs);
  console.log('Logging started for ' + device.alias + ' [' + device.deviceId + '] every ' + (logIntervalMs/1000) + ' seconds');
}

function writeLog(filePath, log) {
  try {
    // Switched to sync write for now. TODO investigate issue from PR #19
    fs.writeFileSync(filePath, JSON.stringify(log), { flag: 'w' });
  }
  catch (err) {
    console.warn('Error writing log \"' + filePath + "\": ", err);
  }
}

function getLogEntries(filePath, callback) {

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if(err) {
      // No log file, init empty one
      writeLog(filePath, []);
      callback([]);
    }
    else {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.warn('Error reading usage log ' + filePath, err);
          callback([]);
        }
        else {
          callback(JSON.parse(data));
        }
      });
    }
  });
}

function log(device) {

  device.emeter.getRealtime().then(response => {

    let logEntry = {
      ts: Date.now(),
      pw: (('power_mw' in response) ? (response.power_mw / 1000) : response.power)
    }

    let filePath = getLogPath(device.deviceId);

    getLogEntries(filePath, (entries) => {
      entries.push(logEntry)

      // Remove old entries
      entries.splice(0, entries.length - maxLogEntries);

      writeLog(filePath, entries);
      dataBroadcaster.broadcastNewLogEntry(device.deviceId, logEntry);
    })

  });
}

function getLogPath(deviceId) {
  return path.join(logDirPath, deviceId + '-log.json');
}

function getLogEntriesForDevice(deviceId, callback) {
  return getLogEntries(getLogPath(deviceId), callback);
}

module.exports = {
  startLogging: startLogging,
  log: log,
  getLogEntriesForDevice: getLogEntriesForDevice
}

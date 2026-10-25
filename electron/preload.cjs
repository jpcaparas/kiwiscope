'use strict';
// Minimal, read-only bridge. The renderer gets no Node or Electron APIs.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('kiwiscope', {
  platform: process.platform,
  versions: Object.freeze({ electron: process.versions.electron, chrome: process.versions.chrome }),
});

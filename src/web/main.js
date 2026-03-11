// ppass - P2P File Manager v3
// Modern UI with multi-device sync

import Peer from 'peerjs';
import QRCode from 'qrcode';

// ==================== State ====================
let peer = null;
let currentMode = null;
let dirHandle = null;
let connections = new Map();
let deviceName = '设备-' + Math.random().toString(36).substr(2, 4);

// ==================== Logging ====================
function log(msg, type = 'info') {
  const logEl = document.getElementById('log');
  if (!logEl) return;
  
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${time}] ${msg}`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
  console.log(msg);
}

// ==================== Peer ID ====================
function generatePeerId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'ppass-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ==================== Initialize Peer ====================
function initPeer(id = null) {
  const peerId = id || generatePeerId();
  
  peer = new Peer(peerId, {
    debug: 1,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });

  peer.on('open', (id) => {
    log(`已启动，设备ID: ${id}`, 'success');
    document.getElementById('peerId').textContent = id;
    updateStatus('online');
    
    if (currentMode === 'host') {
      generateQRCode(id);
    }
  });

  peer.on('connection', (conn) => {
    log(`收到连接请求: ${conn.peer}`);
    handleConnection(conn);
  });

  peer.on('error', (err) => {
    log(`错误: ${err.type} - ${err.message}`, 'error');
    if (err.type === 'unavailable-id') {
      log('重新生成ID...', 'info');
      initPeer();
    }
    updateStatus('offline');
  });

  return peer;
}

// ==================== Connection Handling ====================
function handleConnection(conn) {
  conn.on('open', () => {
    log(`连接建立: ${conn.peer}`, 'success');
    connections.set(conn.peer, conn);
    
    if (currentMode === 'host') {
      broadcast({ type: 'DEVICE_JOINED', peerId: conn.peer, deviceName: conn.peer });
      updateDeviceList();
      sendFileList(conn);
    } else {
      document.getElementById('clientConnected')?.classList.remove('hidden');
      document.getElementById('connectedHost').textContent = conn.peer;
      updateStatus('online');
    }
  });

  conn.on('data', (data) => {
    handleMessage(conn, data);
  });

  conn.on('close', () => {
    log(`连接关闭: ${conn.peer}`, 'error');
    connections.delete(conn.peer);
    
    if (currentMode === 'host') {
      broadcast({ type: 'DEVICE_LEFT', peerId: conn.peer });
      updateDeviceList();
    } else {
      updateStatus('offline');
    }
  });
}

// ==================== Broadcast ====================
function broadcast(data) {
  connections.forEach((conn) => {
    if (conn.open) conn.send(data);
  });
}

function sendFileList(targetConn = null) {
  const send = async () => {
    const files = dirHandle ? await listDirectory(dirHandle) : [];
    const data = { type: MSG.RESPONSE_DIR, files };
    
    if (targetConn) {
      targetConn.send(data);
    } else {
      broadcast(data);
    }
    log(`已${targetConn ? '发送' : '广播'}文件列表`, 'info');
  };
  send();
}

async function listDirectory(dirHandle) {
  const files = [];
  try {
    for await (const entry of dirHandle.values()) {
      files.push({ name: entry.name, isDirectory: entry.kind === 'directory' });
    }
  } catch (err) {
    log(`读取目录失败: ${err.message}`, 'error');
  }
  files.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return b.isDirectory ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return files;
}

// ==================== Protocol ====================
const MSG = {
  REQUEST_DIR: 'request_dir',
  RESPONSE_DIR: 'response_dir',
  REQUEST_FILES: 'request_files',
  REFRESH_FILES: 'refresh_files',
  DEVICE_JOINED: 'device_joined',
  DEVICE_LEFT: 'device_left'
};

function handleMessage(conn, data) {
  switch (data.type) {
    case MSG.REQUEST_DIR:
    case MSG.REQUEST_FILES:
      sendFileList(conn);
      break;
    case MSG.REFRESH_FILES:
      sendFileList();
      break;
    case MSG.RESPONSE_DIR:
      displayFileList(data.files);
      break;
    case MSG.DEVICE_JOINED:
      if (currentMode === 'host') addConnectedDevice(data.peerId);
      break;
    case MSG.DEVICE_LEFT:
      if (currentMode === 'host') removeConnectedDevice(data.peerId);
      break;
  }
}

// ==================== File Selection ====================
async function selectFolder() {
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    document.getElementById('selectFolderBtn').innerHTML = `✅ ${dirHandle.name}`;
    log(`已选择文件夹: ${dirHandle.name}`, 'success');
    sendFileList();
  } catch (err) {
    if (err.name !== 'AbortError') {
      log(`选择文件夹失败: ${err.message}`, 'error');
    }
  }
}

// ==================== UI Functions ====================
function displayFileList(files) {
  const grid = document.getElementById('fileGrid');
  const empty = document.getElementById('emptyState');
  
  if (!files || files.length === 0) {
    empty?.classList.remove('hidden');
    return;
  }
  
  empty?.classList.add('hidden');
  
  // Clear existing cards (keep empty state)
  Array.from(grid.children).forEach(child => {
    if (child.id !== 'emptyState') grid.removeChild(child);
  });
  
  files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'file-card';
    
    let iconClass = 'doc';
    if (file.isDirectory) iconClass = 'folder';
    else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)) iconClass = 'image';
    
    const icons = { folder: '📁', image: '🖼️', doc: '📄' };
    
    card.innerHTML = `
      <div class="file-icon ${iconClass}">${icons[iconClass]}</div>
      <div class="file-name" title="${file.name}">${file.name}</div>
      <div class="file-meta">${file.isDirectory ? '文件夹' : ''}</div>
    `;
    
    grid.appendChild(card);
  });
}

function updateDeviceList() {
  const list = document.getElementById('deviceList');
  const count = document.getElementById('deviceCount');
  
  count.textContent = connections.size;
  
  if (connections.size === 0) {
    list.innerHTML = '<div class="empty-state" style="padding: 20px;"><div class="empty-desc">等待设备连接...</div></div>';
    return;
  }
  
  list.innerHTML = '';
  connections.forEach((conn, peerId) => {
    const item = document.createElement('div');
    item.className = 'device-item';
    item.innerHTML = `
      <span class="status-dot"></span>
      <span class="device-name">${peerId}</span>
      <span class="device-peer">${peerId}</span>
    `;
    list.appendChild(item);
  });
}

function addConnectedDevice(peerId) {
  updateDeviceList();
  log(`设备加入: ${peerId}`, 'success');
}

function removeConnectedDevice(peerId) {
  updateDeviceList();
  log(`设备离开: ${peerId}`, 'info');
}

function updateStatus(status) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  
  if (dot && text) {
    dot.className = `status-dot ${status === 'offline' ? 'offline' : ''}`;
    text.textContent = status === 'online' ? '在线' : '离线';
  }
}

async function generateQRCode(peerId) {
  const canvas = document.getElementById('qrcode');
  if (!canvas) return;
  
  const baseUrl = window.location.origin + window.location.pathname;
  const connectUrl = `${baseUrl}?connect=${peerId}`;
  
  try {
    await QRCode.toCanvas(canvas, connectUrl, { 
      width: 140,
      margin: 1,
      color: { dark: '#FFFFFF', light: '#242424' }
    });
    log('二维码已生成', 'success');
  } catch (err) {
    log(`二维码生成失败: ${err.message}`, 'error');
  }
}

function copyPeerId() {
  const id = document.getElementById('peerId').textContent;
  navigator.clipboard.writeText(id);
  log('ID已复制', 'success');
}

function refreshFiles() {
  if (currentMode === 'host' && dirHandle) {
    sendFileList();
  } else {
    connections.forEach(conn => {
      if (conn.open) conn.send({ type: MSG.REFRESH_FILES });
    });
  }
  log('已刷新', 'info');
}

function connectToPeer() {
  const remoteId = document.getElementById('remotePeerId').value.trim();
  if (!remoteId || !peer) {
    log('请输入设备ID', 'error');
    return;
  }
  
  log(`正在连接: ${remoteId}...`, 'info');
  const conn = peer.connect(remoteId, { reliable: true });
  handleConnection(conn);
}

// ==================== Mode Selection ====================
function startAsHost() {
  currentMode = 'host';
  document.getElementById('modeSelection').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('hostPanel').classList.remove('hidden');
  document.getElementById('selectFolderBtn').classList.remove('hidden');
  initPeer();
  log('启动为存储端模式', 'info');
}

function startAsClient() {
  currentMode = 'client';
  document.getElementById('modeSelection').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('clientPanel').classList.remove('hidden');
  document.getElementById('selectFolderBtn').classList.add('hidden');
  initPeer();
  
  const connectTo = new URLSearchParams(window.location.search).get('connect');
  if (connectTo) {
    document.getElementById('remotePeerId').value = connectTo;
    setTimeout(() => connectToPeer(), 500);
  }
  log('启动为访问端模式', 'info');
}

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', () => {
  log('ppass v3 已加载', 'info');
  
  const connectTo = new URLSearchParams(window.location.search).get('connect');
  if (connectTo) {
    startAsClient();
  }
});

window.startAsHost = startAsHost;
window.startAsClient = startAsClient;
window.selectFolder = selectFolder;
window.connectToPeer = connectToPeer;
window.refreshFiles = refreshFiles;
window.copyPeerId = copyPeerId;

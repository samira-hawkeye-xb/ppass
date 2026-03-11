// ppass - P2P File Manager
// main.js - Core logic

import Peer from 'peerjs';
import QRCode from 'qrcode';

// ==================== State ====================
let peer = null;
let currentMode = null; // 'host' or 'client'
let selectedFolderHandle = null;
let connections = [];
let dirHandle = null;
let myPeerId = null;

// ==================== Logging ====================
function log(msg) {
  const logEl = document.getElementById('log');
  if (!logEl) return;
  const time = new Date().toLocaleTimeString();
  logEl.innerHTML += `[${time}] ${msg}<br>`;
  logEl.scrollTop = logEl.scrollHeight;
  console.log(msg);
}

// ==================== Peer ID Generation ====================
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
  myPeerId = peerId;
  
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
    myPeerId = id;
    log(`✅ Peer 已启动: ${id}`);
    const el = document.getElementById('peerId');
    if (el) el.textContent = id;
    updateStatus(currentMode, 'online');
    
    // 生成二维码
    if (currentMode === 'host') {
      generateQRCode(id);
    }
  });

  peer.on('connection', (conn) => {
    log(`📥 收到连接请求 from: ${conn.peer}`);
    handleConnection(conn);
  });

  peer.on('error', (err) => {
    log(`❌ 错误: ${err.type} - ${err.message}`);
    if (err.type === 'unavailable-id') {
      // ID 已被使用，重新生成
      log('🔄 ID已被使用，重新生成...');
      initPeer();
    }
    updateStatus(currentMode, 'offline');
  });

  return peer;
}

// ==================== Connection Handling ====================
function handleConnection(conn) {
  conn.on('open', () => {
    log(`✅ 连接建立: ${conn.peer}`);
    connections.push(conn);
    
    if (currentMode === 'host') {
      addConnectedDevice(conn.peer);
      // 对方可能是访问端，向主机请求文件列表
      conn.send({ type: 'request_files' });
    }
  });

  conn.on('data', (data) => {
    log(`📨 收到数据: ${data.type || 'unknown'}`);
    handleMessage(conn, data);
  });

  conn.on('close', () => {
    log(`❌ 连接关闭: ${conn.peer}`);
    connections = connections.filter(c => c.peer !== conn.peer);
  });
  
  conn.on('error', (err) => {
    log(`❌ 连接错误: ${err.message}`);
  });
}

function addConnectedDevice(peerId) {
  const list = document.getElementById('connectedDevices');
  if (!list) return;
  const li = document.createElement('li');
  li.innerHTML = `<span>${peerId}</span> <span>已连接</span>`;
  list.appendChild(li);
}

// ==================== Message Protocol ====================
const MSG = {
  REQUEST_DIR: 'request_dir',
  RESPONSE_DIR: 'response_dir',
  REQUEST_FILE: 'request_file',
  RESPONSE_FILE: 'response_file',
  FILE_CHUNK: 'file_chunk',
  FILE_COMPLETE: 'file_complete',
  PING: 'ping',
  PONG: 'pong',
  REQUEST_FILES: 'request_files'
};

function handleMessage(conn, data) {
  switch (data.type) {
    case MSG.REQUEST_DIR:
    case MSG.REQUEST_FILES:
      if (dirHandle) {
        listDirectory(dirHandle).then(files => {
          conn.send({ type: MSG.RESPONSE_DIR, files });
        });
      } else {
        conn.send({ type: MSG.RESPONSE_DIR, files: [] });
      }
      break;
      
    case MSG.RESPONSE_DIR:
      displayFileList(data.files);
      break;
      
    case MSG.FILE_CHUNK:
      // 处理文件块
      handleFileChunk(data);
      break;
      
    case MSG.FILE_COMPLETE:
      handleFileComplete(data);
      break;
      
    case MSG.PING:
      conn.send({ type: MSG.PONG });
      break;
  }
}

// ==================== File System API ====================
async function selectFolder() {
  try {
    dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite'
    });
    selectedFolderHandle = dirHandle;
    const el = document.getElementById('selectedFolder');
    if (el) el.textContent = `已选择: ${dirHandle.name}`;
    log(`📂 已选择文件夹: ${dirHandle.name}`);
    
    // 显示文件夹内容
    const files = await listDirectory(dirHandle);
    displayFileList(files);
  } catch (err) {
    if (err.name !== 'AbortError') {
      log(`❌ 选择文件夹失败: ${err.message}`);
    }
  }
}

async function listDirectory(dirHandle) {
  const files = [];
  
  try {
    for await (const entry of dirHandle.values()) {
      files.push({
        name: entry.name,
        isDirectory: entry.kind === 'directory',
        kind: entry.kind
      });
    }
  } catch (err) {
    log(`❌ 读取目录失败: ${err.message}`);
  }
  
  // 按文件夹+字母排序
  files.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return b.isDirectory ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  
  return files;
}

function displayFileList(files) {
  const list = document.getElementById('fileList');
  if (!list) return;
  list.innerHTML = '';
  
  if (!files || files.length === 0) {
    list.innerHTML = '<li class="file-item">📭 目录为空</li>';
    return;
  }
  
  files.forEach(file => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.innerHTML = `
      <span>${file.isDirectory ? '📁' : '📄'} ${file.name}</span>
      ${!file.isDirectory ? `<button class="btn" style="padding: 4px 8px; font-size: 12px;" onclick="downloadFile('${file.name}')">下载</button>` : ''}
    `;
    list.appendChild(li);
  });
  
  const browser = document.getElementById('fileBrowser');
  if (browser) browser.classList.remove('hidden');
}

// ==================== File Download ====================
async function downloadFile(filename) {
  if (!dirHandle) {
    log('❌ 未选择文件夹');
    return;
  }
  
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    
    log(`📥 开始下载: ${filename} (${file.size} bytes)`);
    
    // 通过 P2P 发送文件
    if (connections.length > 0) {
      const conn = connections[0];
      
      // 发送文件元数据
      conn.send({
        type: MSG.RESPONSE_FILE,
        name: file.name,
        size: file.size,
        mimeType: file.type
      });
      
      // 分块发送文件内容
      const chunkSize = 64 * 1024; // 64KB
      let offset = 0;
      
      while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        const arrayBuffer = await chunk.arrayBuffer();
        
        conn.send({
          type: MSG.FILE_CHUNK,
          data: Array.from(new Uint8Array(arrayBuffer)),
          offset: offset,
          total: file.size
        });
        
        offset += chunkSize;
        log(`📤 发送进度: ${Math.round(offset / file.size * 100)}%`);
      }
      
      conn.send({ type: MSG.FILE_COMPLETE, name: file.name });
      log(`✅ 文件发送完成: ${filename}`);
    }
  } catch (err) {
    log(`❌ 下载失败: ${err.message}`);
  }
}

// ==================== QR Code ====================
async function generateQRCode(peerId) {
  const qrContainer = document.getElementById('qrcode');
  if (!qrContainer) return;
  
  // 构建 URL，包含 peer ID
  const baseUrl = window.location.origin + window.location.pathname;
  const connectUrl = `${baseUrl}?connect=${peerId}`;
  
  try {
    qrContainer.innerHTML = '';
    await QRCode.toCanvas(qrContainer, connectUrl, { 
      width: 200,
      margin: 2
    });
    log(`📱 二维码已生成 - 扫码即可连接`);
  } catch (err) {
    log(`❌ 二维码生成失败: ${err.message}`);
  }
}

// ==================== URL Params ====================
function getConnectParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('connect');
}

// ==================== UI Functions ====================
function startAsHost() {
  currentMode = 'host';
  hideAll();
  document.getElementById('hostPanel').classList.remove('hidden');
  
  initPeer();
  updateStatus('host', 'connecting');
  log('🏠 启动为存储端模式');
}

function startAsClient() {
  currentMode = 'client';
  hideAll();
  document.getElementById('clientPanel').classList.remove('hidden');
  
  initPeer();
  updateStatus('client', 'connecting');
  
  // 检查 URL 参数
  const connectTo = getConnectParam();
  if (connectTo) {
    document.getElementById('remotePeerId').value = connectTo;
    log(`📱 检测到连接参数: ${connectTo}`);
    setTimeout(() => connectToPeer(), 1000);
  }
  
  log('📱 启动为访问端模式');
}

function hideAll() {
  document.getElementById('modeCard')?.classList.add('hidden');
  document.getElementById('hostPanel')?.classList.add('hidden');
  document.getElementById('clientPanel')?.classList.add('hidden');
  document.getElementById('fileBrowser')?.classList.add('hidden');
}

function updateStatus(mode, status) {
  const el = document.getElementById(`${mode}Status`);
  if (!el) return;
  
  el.className = `status ${status}`;
  
  const statusText = {
    'online': '🟢 在线',
    'offline': '🔴 离线',
    'connecting': '🟡 连接中...'
  };
  
  el.textContent = statusText[status] || status;
}

function connectToPeer() {
  const remoteId = document.getElementById('remotePeerId').value.trim();
  if (!remoteId) {
    log('❌ 请输入 Peer ID');
    return;
  }
  
  if (!peer) {
    log('❌ Peer 未初始化');
    return;
  }
  
  log(`🔗 尝试连接: ${remoteId}`);
  
  const conn = peer.connect(remoteId, { reliable: true });
  
  conn.on('open', () => {
    log(`✅ 已连接到: ${remoteId}`);
    document.getElementById('clientSetup')?.classList.add('hidden');
    const connected = document.getElementById('clientConnected');
    if (connected) {
      connected.classList.remove('hidden');
      const host = document.getElementById('connectedHost');
      if (host) host.textContent = remoteId;
    }
    updateStatus('client', 'online');
    
    // 自动请求文件列表
    conn.send({ type: MSG.REQUEST_FILES });
  });
  
  conn.on('error', (err) => {
    log(`❌ 连接失败: ${err.message}`);
  });
  
  handleConnection(conn);
}

function browseRemoteFiles() {
  const conn = connections[0];
  if (conn) {
    conn.send({ type: MSG.REQUEST_FILES });
    log('📂 请求远程文件列表...');
  } else {
    log('❌ 未连接任何设备');
  }
}

// ==================== File Chunk Handling ====================
let receivingFile = null;
let receivingChunks = [];

function handleFileChunk(data) {
  if (!receivingFile || receivingFile.name !== data.name) {
    receivingFile = { name: data.name, size: data.total, chunks: [] };
    receivingChunks = [];
    log(`📥 开始接收: ${data.name}`);
  }
  
  receivingChunks.push({ offset: data.offset, data: new Uint8Array(data.data) });
  
  const progress = Math.round(receivingChunks.length * 64000 / data.size * 100);
  log(`📥 接收进度: ${Math.min(progress, 100)}%`);
}

function handleFileComplete(data) {
  if (receivingFile && receivingFile.name === data.name) {
    // 重组文件
    receivingChunks.sort((a, b) => a.offset - b.offset);
    const totalLength = receivingChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    receivingChunks.forEach(chunk => {
      merged.set(chunk.data, offset);
      offset += chunk.data.length;
    });
    
    // 创建下载
    const blob = new Blob([merged]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.name;
    a.click();
    URL.revokeObjectURL(url);
    
    log(`✅ 文件接收完成: ${data.name}`);
    receivingFile = null;
    receivingChunks = [];
  }
}

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', () => {
  log('🚀 ppass 已加载');
  
  // 检查是否从二维码进入
  const connectTo = getConnectParam();
  if (connectTo) {
    // 自动进入客户端模式
    startAsClient();
  }
});

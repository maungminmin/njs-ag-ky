const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Environment Variables
const UPLOAD_URL = process.env.UPLOAD_URL || '';      
const PROJECT_URL = process.env.PROJECT_URL || '';    
const AUTO_ACCESS = process.env.AUTO_ACCESS || false; 
const FILE_PATH = process.env.FILE_PATH || './tmp';   
const SUB_PATH = process.env.SUB_PATH || 'sub';       
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;        
const UUID = process.env.UUID || 'e4a05a14-fd87-466c-b507-879557c1e209'; 
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';           
const ARGO_AUTH = process.env.ARGO_AUTH || '';               
const ARGO_PORT = process.env.ARGO_PORT || 8005;             
const CFIP = process.env.CFIP || '172.67.73.4';         
const CFPORT = process.env.CFPORT || 443;                   
const NAME = process.env.NAME || '';                        

// Create Run Folder
if (!fs.existsSync(FILE_PATH)) {
  fs.mkdirSync(FILE_PATH);
}

// Generate random filename logic
function generateRandomName() {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const webName = generateRandomName();
const botName = generateRandomName();
let webPath = path.join(FILE_PATH, webName);
let botPath = path.join(FILE_PATH, botName);
let subPath = path.join(FILE_PATH, 'sub.txt');
let configPath = path.join(FILE_PATH, 'config.json');

// Root route
app.get("/", function(req, res) {
  res.send("Server is running!");
});

// Generate Xray config
async function generateConfig() {
  const config = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
      { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
      { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } } },
      { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } } },
      { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } } },
    ],
    outbounds: [{ protocol: "freedom", tag: "direct" }]
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Download Core files
function downloadFile(fileName, fileUrl, callback) {
  const writer = fs.createWriteStream(fileName);
  axios({ method: 'get', url: fileUrl, responseType: 'stream' }).then(response => {
    response.data.pipe(writer);
    writer.on('finish', () => {
      console.log(`Download ${path.basename(fileName)} successfully`);
      callback(null, fileName);
    });
  }).catch(err => callback(err));
}

async function downloadFilesAndRun() {
  const arch = os.arch().includes('arm') ? 'arm64' : 'amd64';
  const files = [
    { fileName: webPath, fileUrl: `https://${arch}.ssss.nyc.mn/web` },
    { fileName: botPath, fileUrl: `https://${arch}.ssss.nyc.mn/bot` }
  ];

  for (const file of files) {
    await new Promise((resolve, reject) => {
      downloadFile(file.fileName, file.fileUrl, (err) => err ? reject(err) : resolve());
    });
    fs.chmodSync(file.fileName, 0o775);
  }

  // Run Xray
  exec(`nohup ${webPath} -c ${configPath} >/dev/null 2>&1 &`);
  console.log(`Xray Core is running`);

  // Run Cloudflared
  let args = ARGO_AUTH.length > 120 
    ? `tunnel --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}` 
    : `tunnel --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --url http://localhost:${ARGO_PORT}`;
  
  exec(`nohup ${botPath} ${args} >/dev/null 2>&1 &`);
  console.log(`Argo Tunnel is running`);
  
  await new Promise(r => setTimeout(r, 5000));
}

// Generate Subscription
async function generateLinks(argoDomain) {
  const nodeName = NAME || "Koyeb-Argo";
  const VMESS = { v: '2', ps: nodeName, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2560', tls: 'tls', sni: argoDomain, fp: 'firefox'};
  
  const subTxt = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${nodeName}
vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}
trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2560#${nodeName}
`;

  const encoded = Buffer.from(subTxt.trim()).toString('base64');
  fs.writeFileSync(subPath, encoded);
  console.log("Subscription generated");

  app.get(`/${SUB_PATH}`, (req, res) => {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(encoded);
  });
}

async function extractDomains() {
  if (ARGO_DOMAIN) {
    await generateLinks(ARGO_DOMAIN);
  } else {
    try {
      const log = fs.readFileSync(path.join(FILE_PATH, 'boot.log'), 'utf-8');
      const match = log.match(/https?:\/\/([^ ]*trycloudflare\.com)/);
      if (match) await generateLinks(match[1]);
    } catch (e) { console.log("Waiting for domain..."); }
  }
}

// Start Server
async function main() {
  await generateConfig();
  await downloadFilesAndRun();
  setInterval(extractDomains, 10000); // Check for domain every 10s
}

main();
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
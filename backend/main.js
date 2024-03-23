const express = require('express');
const cookieParser = require('cookie-parser')
const app = express();
const http = require('http');
const https = require('https');
const fs = require('fs');
const mysql = require('mysql');
const mysqldump = require('mysqldump')
const cors = require("cors")
const cron = require('node-cron');
const bodyParser = require('body-parser');

/* DATABASE */
let credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));
const con = mysql.createConnection({...credentials, multipleStatements: true});

const PRODUCTION = process.env.PRODUCTION || true;
const server = PRODUCTION === true ? 
  https.createServer({
    key: fs.readFileSync(`/etc/letsencrypt/live/${credentials['colla']}-api.tenimaleta.com/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${credentials['colla']}-api.tenimaleta.com/fullchain.pem`)
  }, app)
: 
  http.createServer(app)

const io = require("socket.io")(server, {
  cors: {
      origin: '*'
  },
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true,
}));

const execute_query = (query, fn = null) => {
  con.query(query, function (err, result) {
    if (err) console.log('SQL error: ', err);
    else if (fn) return fn(result);
    else return result;
  });
};

const emit_query = (socket, channel, query, fn = null) => {
  con.query(query, function (err, result) {
    if (err) console.log('SQL error: ', err);
    else if (fn) socket.emit(channel, fn(result));
    else socket.emit(channel, result);
  });
};

const emit_query_w_values = (socket, channel, query, values, fn = null) => {
  con.query(query, values, function (err, result) {
    if (err) console.log('SQL error: ', err);
    else if (fn) socket.emit(channel, fn(result));
    else socket.emit(channel, result);
  });
};

// Keep MySQL alive (ping each minute)
cron.schedule('* * * * *', () => {
  con.query("SELECT 1", function (err, result) {
    if (err) throw err;
  });
}, {
  // scheduled: true,
  // timezone: "Europe/Madrid"
});

// Backup each 24 hours at 4AM
cron.schedule('0 4 * * *', () => {
  mysqldump({
      connection: credentials,
      dumpToFile: `./backups/${new Date().toLocaleString('en-us', {  weekday: 'long' })}.sql`,
  });
}, {
  // scheduled: true,
  // timezone: "Europe/Madrid"
});

const port = process.env.PORT || 4001;

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});

// Run API's backend
const api = require('./api-backend.js');
api.build(app, io, fs, emit_query, execute_query);

// Run pissarra's backend
const common = require('./common-backend.js');
common.build(app, io, fs, emit_query, execute_query);

// Run pissarra's backend
const pissarra = require('./pissarra-backend.js');
pissarra.build(app, io, fs, emit_query, execute_query);

// Run assistència's backend
const assistencia = require('./assistència-backend.js');
assistencia.build(app, io, fs, emit_query, execute_query, mysql.escape);

// Run gestió's backend
const gestio = require('./gestió-backend.js');
gestio.build(app, io, fs, emit_query, execute_query);

// Run calendar's backend
const calendar = require('./calendar-backend.js');
calendar.build(app, io, fs, emit_query, execute_query);

// Run anuncis's backend
const anuncis = require('./anuncis-backend.js');
anuncis.build(io, fs, emit_query);

// Run feedback's backend
const feedback = require('./feedback-backend.js');
feedback.build(io, fs, emit_query);

// Run notifications's backend
const notifications = require('./notifications-backend.js');
notifications.build(app, io, fs, emit_query, execute_query, mysql.escape);

// Run editor's backend
const editor = require('./editor-backend.js');
editor.build(app, io, fs, emit_query, execute_query);

// Run profilepic's backend
const profilepic = require('./profilepic-backend.js');
profilepic.build(app, io, fs, emit_query, execute_query);

// Run chat's backend
const chat = require('./chat-backend.js');
chat.build(io, fs, emit_query_w_values, execute_query, app);

// Run login's backend
const login = require('./login-backend.js');
login.build(app, fs, execute_query);
// Now everything related to loading positions/JSONs is here
// And it can change fully without affecting the other parts

/*

    Mètodes a gestionar:
        .new_connection
        .load_json
        .load_positions
        .import
        .save_change

*/

const calculateProvesDates = (order, durations, horaInici) => {
    const DEFAULT_DURATION = 10;

    // const knownProves = order
    //     .filter(fullName => (fullName?.split('.')?.[0] || '') in durations)

    const provesDurations = order
        .map(fullName => durations[(fullName?.split('.')?.[0] || '')] || DEFAULT_DURATION)

    const compoundDurations = (hora => duration =>
        [
            hora.toDate(),
            hora.add(duration, 'minutes').toDate()
        ]
    )(horaInici.clone())

    const compoundedHores = provesDurations
        .map(compoundDurations)
    
    const horesStructured = compoundedHores
        .map(([start, end], i) => ({
            'prova': order[i],
            'start': start,
            'end': end,
        }))

    return horesStructured;
}

const formatDurations = data => {
    let dict = {}
    const canvis = data.split('\n')

    for (const canvi of canvis) {
        if (canvi.split('=').length !== 2) continue
        const [prova, duration] = canvi.split('=')
        dict[prova] = parseInt(duration)
    }

    return dict;
}

const formatLastLine = data => {
    const lastLine = data
        .split('\n')
        .filter(line => line !== '')
        .at(-1) || '[]'

    return JSON.parse(lastLine);
}

const leaveAllRooms = socket => {
    const rooms = [...socket.rooms].filter(room => room !== socket.id);
    rooms.forEach(room => socket.leave(room));
};

function appendNewlineIfNeeded(fs, filePath, callback) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) throw err;
        
        // Check if the content ends with a newline
        if (data?.length > 0 && data[data.length - 1] !== '\n') {
            fs.appendFile(filePath, '\n', callback);
        } else {
            callback();
        }
    });
}

// This function wraps the logic you provided, but ensures a newline exists at the end of the file before appending the new data
function appendToFileEnsuringNewline(fs, filePath, content, callback) {
    appendNewlineIfNeeded(fs, filePath, () => {
        fs.appendFile(filePath, content + '\n', callback);
    });
}

const getAddonsFromId = (fs, bundleId) => {
    const addonsFilename = `${__dirname}/data/bundles/addons/${bundleId}.json`
    const addonsFile = fs.existsSync(addonsFilename) ? fs.readFileSync(addonsFilename) : null
    if (!addonsFile) return false

    return JSON.parse(addonsFile)
}

const get_available_imports = (socket, fs, selectedEvent, selectedBundle, selectedVersio) => {
    const eventsDirs = fs.readdirSync(`${__dirname}/events/`);
    const path = require('node:path');
    
    const castellsInEvents = eventsDirs.map(event => {
        const posicionsDir = path.join(`${__dirname}/events/`, event, 'posicions');
        const castellsInEvent = fs.existsSync(posicionsDir) ? fs.readdirSync(posicionsDir) : [];

        const hiddenPosicionsDir = path.join(`${__dirname}/events/`, event, 'posicions/hidden');
        const hiddenCastellsInEvent = fs.existsSync(hiddenPosicionsDir) ? fs.readdirSync(hiddenPosicionsDir) : [];

        const adminPosicionsDir = path.join(`${__dirname}/events/`, event, 'posicions/admin');
        const adminCastellsInEvent = fs.existsSync(adminPosicionsDir) ? fs.readdirSync(adminPosicionsDir) : [];

        return [...castellsInEvent, ...hiddenCastellsInEvent, ...adminCastellsInEvent]
            .filter(c => c.split('.').length > 2)
            // .filter(c => c.split('.')[0] === selectedBundle)
            .filter(c => event !== selectedEvent || c.split('.')[1] !== selectedVersio);
    });

    const posicionsLogOfCastell = castellsInEvents
        .map((castells, i) => castells.map(fullname => {
            const [castell, versio, _] = fullname.split('.');
            const posicionsLogPath = `${__dirname}/events/${eventsDirs[i]}/posicions/${castell}.${versio}.canvis`;
            const hiddenPosicionsLogPath = `${__dirname}/events/${eventsDirs[i]}/posicions/hidden/${castell}.${versio}.canvis`;
            const adminPosicionsLogPath = `${__dirname}/events/${eventsDirs[i]}/posicions/admin/${castell}.${versio}.canvis`;

            if (fs.existsSync(posicionsLogPath)) {
                return fs.readFileSync(posicionsLogPath).toString();
            } else if (fs.existsSync(hiddenPosicionsLogPath)) {
                return fs.readFileSync(hiddenPosicionsLogPath).toString();
            } else if (fs.existsSync(adminPosicionsLogPath)) {
                return fs.readFileSync(adminPosicionsLogPath).toString();
            } else {
                return '';
            }
        }));

    socket.emit('.available_imports', {
        'events': eventsDirs,
        'castells': castellsInEvents,
        'posicionsLog': posicionsLogOfCastell,
    });
};

module.exports.build = (app, io, fs, emit_query, execute_query) => {
    const moment = require('moment');
    const path = require('node:path');
    const crypto = require('crypto');
    const { fdir } = require("fdir");
    const cron = require('node-cron');

    const AWS = require('aws-sdk');
    const accessKeys = require('./aws.credentials.json');

    const credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));
    const colla = credentials.colla;    

    const s3 = new AWS.S3({
        accessKeyId: accessKeys.accessKeyId,
        secretAccessKey: accessKeys.secretAccessKey,
        region: accessKeys.region,
    });

    const isBackupNeeded = {};

    const get_future_nearby_events = (hours=48) => `select id from events WHERE \`data-esperada-inici\` >= NOW() AND \`data-esperada-inici\` <= DATE_ADD(NOW(), INTERVAL ${hours} HOUR)`;

    // Function to perform the backup
    const performPositionsBackup = () => {
        // Fetch events happening in the next 48 hours
        execute_query(get_future_nearby_events(), data => {
            // For each event, backup the positions
            data.forEach(event => backupPositionsEvent(event.id.toString()));
        });
    };

    const backupIfNeeded = () => {
        Object.keys(isBackupNeeded).forEach(event => {
            Object.keys(isBackupNeeded[event]).forEach(castellVersio => {
                if (isBackupNeeded[event][castellVersio]) {
                    const [castell, versio] = castellVersio.split('.');
                    backupPositionsProva(event, castell, versio);
                    delete isBackupNeeded[event][castellVersio];
                }
            });
        });
    };

    const backupPositionsProva = (event, castell, versio) => {
        const pinyaPath = `${__dirname}/events/${event}/posicions/${castell}.${versio}.canvis`
        const hiddenPinyaPath = `${__dirname}/events/${event}/posicions/hidden/${castell}.${versio}.canvis`
        const adminPinyaPath = `${__dirname}/events/${event}/posicions/admin/${castell}.${versio}.canvis`
    
        const matchedPath =
            fs.existsSync(pinyaPath) ? pinyaPath :
            fs.existsSync(hiddenPinyaPath) ? hiddenPinyaPath :
            fs.existsSync(adminPinyaPath) ? adminPinyaPath :
            '';

        if (!matchedPath) return;

        const params = {
            Bucket: 'aleta-' + colla,
            Key: `positions/${event}/${castell}.${versio}.canvis`,
            Body: fs.createReadStream(matchedPath)
        };

        s3.putObject(params, function(err, data) {
            if (err) console.log(err, err.stack);
            // else console.log(`Periodic backup of ${castell}.${versio}.canvis saved to S3`);
        });
    }

    const backupPositionsEvent = (event) => {
        const eventDir = path.join(__dirname, 'events', event);

        const walkDir = (currentPath) => {
            const files = fs.readdirSync(currentPath);
            for (const file of files) {
                if (file.includes("order")) continue;

                const curFile = path.join(currentPath, file);
                if (fs.statSync(curFile).isFile() && path.extname(curFile) === '.canvis') {
                    const params = {
                        Bucket: 'aleta-' + colla,
                        Key: `positions/${event}/${file}`,
                        Body: fs.createReadStream(curFile)
                    };

                    s3.putObject(params, function(err, data) {
                        if (err) console.log(err, err.stack);
                        // else console.log(`Periodic backup of ${file} saved to S3`);
                    });
                } else if (fs.statSync(curFile).isDirectory()) {
                    walkDir(curFile);
                }
            }
        };

        walkDir(eventDir);
    };

    // Schedule the backup function if needed
    cron.schedule('* * * * *', backupIfNeeded);

    const save_change = (fs, room, io, socket, pos, action_id) => {
        if (room.split('.').length < 3) return;
    
        // Evita que es pugui guardar una posició amb caixa -1
        if (pos.split(',').length >= 2) {
            const [caixa, ...rest] = pos.split(',')
            if (parseInt(caixa) === -1) return;
        }
    
        const actionId = action_id || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
        const withAddons = pos
            .split(',')
            .concat(socket?.userId || 'anonymous')
            .concat(new Date().toISOString())
            .concat(actionId)
            .join(',')
    
        const [event, castell, versio] = room.split('.');
        const pinyaPath = `${__dirname}/events/${event}/posicions/${castell}.${versio}.canvis`
        const hiddenPinyaPath = `${__dirname}/events/${event}/posicions/hidden/${castell}.${versio}.canvis`
        const adminPinyaPath = `${__dirname}/events/${event}/posicions/admin/${castell}.${versio}.canvis`
    
        if (fs.existsSync(pinyaPath)) appendToFileEnsuringNewline(fs, pinyaPath, withAddons, () => io.to(room).emit(`.new_change`, withAddons));
        else if (fs.existsSync(hiddenPinyaPath)) appendToFileEnsuringNewline(fs, hiddenPinyaPath, withAddons, () => io.to(room).emit(`.new_change`, withAddons));
        else if (fs.existsSync(adminPinyaPath)) appendToFileEnsuringNewline(fs, adminPinyaPath, withAddons, () => io.to(room).emit(`.new_change`, withAddons));
    
        // Create a backup in S3 of the changed .canvis file
        const backupPath = 
            fs.existsSync(pinyaPath) ? pinyaPath :
            fs.existsSync(hiddenPinyaPath) ? hiddenPinyaPath :
            fs.existsSync(adminPinyaPath) ? adminPinyaPath :
            '';

        if (!backupPath) return;

        // const params = {
        //     Bucket: 'aleta-' + colla,
        //     Key: `positions/${event}/${castell}.${versio}.canvis`,
        //     Body: fs.createReadStream(backupPath)
        // };

        // s3.putObject(params, function(err, data) {
        //     if (err) console.log(err, err.stack); // an error occurred
        //     // else     console.log(data);           // successful response
        //     else console.log(`Backup of ${castell}.${versio}.canvis saved to S3`)
        // });

        // Mark the event as needing a backup
        if (!(event in isBackupNeeded)) isBackupNeeded[event] = {};
        isBackupNeeded[event][`${castell}.${versio}`] = true;

        io.emit(`.posicions_changed`, event, castell, versio, withAddons);
    };    

    const get_sockets_in_room = (room) => {
        const sockets = io.sockets.adapter.rooms.get(room);
        if (!sockets) return [];

        return [...sockets].map(id => io.sockets.sockets.get(id));
    }

    const change_first_line = (filePath, newFirstLine, callback) => {
        const lines = fs.readFileSync(filePath).toString().split('\n')
        const newContent = (lines.length > 0 ? [newFirstLine, ...lines.slice(1)] : [newFirstLine]).join('\n')
    
        fs.writeFile(filePath, newContent, (err) => callback(err))
    };
    
    const get_first_line = (filePath) => {
        const lines = fs.readFileSync(filePath).toString().split('\n');
        if (lines.length > 0) {
            return lines[0];
        } else {
            return false;
        }
    };
    
    const get_last_line = (filePath, user) => {
        const lines = fs
            .readFileSync(filePath)
            .toString()
            .split('\n')
            .filter(line => line !== '');

        const onlyUserLines = lines
            .filter(line => user ? parseInt(line.split(',')?.[2]) === parseInt(user) : true)

        if (onlyUserLines.length > 0) {
            return onlyUserLines[onlyUserLines.length - 1];
        } else {
            return false;
        }
    }

    const undo_action = (filePath, action_id, callback) => {
        const lines = fs.readFileSync(filePath)
            .toString()
            .split('\n')
            .filter(line => line !== '')

        if (action_id) {
            const action_lines = lines
                .map((line, i) => [line, i])
                .filter(([line, i]) => line.split(',').includes(action_id))
                .map(([line, i]) => i)
            
            // Pop actionIndex from lines
            const newLines = lines.filter((line, i) => !action_lines.includes(i))
            const newContent = newLines.join('\n');

            fs.writeFile(filePath, newContent, (err) => callback(err))
        } else {
            // Pop last line from lines
            const newLines = lines.slice(0, -1)
            const newContent = newLines.join('\n');

            fs.writeFile(filePath, newContent, (err) => callback(err))
        }
    }

    const undo = (event, castell, versio, io, socket) => {
        const pinyaPath = `${__dirname}/events/${event}/posicions/${castell}.${versio}.canvis`
        const hiddenPinyaPath = `${__dirname}/events/${event}/posicions/hidden/${castell}.${versio}.canvis`
        const adminPinyaPath = `${__dirname}/events/${event}/posicions/admin/${castell}.${versio}.canvis`
    
        if (fs.existsSync(pinyaPath) || fs.existsSync(hiddenPinyaPath) || fs.existsSync(adminPinyaPath)) {
            const matchedPath = 
                fs.existsSync(pinyaPath) ? pinyaPath :
                fs.existsSync(hiddenPinyaPath) ? hiddenPinyaPath :
                fs.existsSync(adminPinyaPath) ? adminPinyaPath :
                '';

            if (!matchedPath) return;

            const lastLine = get_last_line(matchedPath, socket?.userId);
            if (!lastLine) return;

            const action_id = lastLine.split(',')?.[4] || false

            undo_action(matchedPath, action_id, (err) => {
                if (err) {
                    console.log(err);
                    return;
                }

                io.to(`${event}.${castell}.${versio}`).emit(`.undid_action`, action_id);
            })
        }
    }

    const change_option = (filePath, option, value, callback) => {
        const first_line = get_first_line(filePath);
    
        if (first_line) {
            const options = first_line
                .replace('OPTIONS:', '')
                .split(',')
                .map(str => str.split('='));
    
            const newOptions = options
                .map(([key, val]) => key === option ? [key, value] : [key, val])
                .map(([key, val]) => `${key}=${val}`)
                .join(',');
            
            change_first_line(filePath, `OPTIONS:${newOptions}`, callback);
        } else {
            change_first_line(filePath, `OPTIONS:${option}=${value}`, callback);
        }
    };    

    const rotate_ajuntament = (room, io, val) => {
        if (room.split('.').length < 3) return;
        const [event, castell, versio] = room.split('.');
        const pinyaPath = `${__dirname}/events/${event}/posicions/${castell}.${versio}.canvis`
        const hiddenPinyaPath = `${__dirname}/events/${event}/posicions/hidden/${castell}.${versio}.canvis`
        const adminPinyaPath = `${__dirname}/events/${event}/posicions/admin/${castell}.${versio}.canvis`
    
        const ajuntamentRotation = isNaN(val) || (0 <= val && val < 4) ? parseInt(val) : 0

        if (fs.existsSync(pinyaPath) || fs.existsSync(hiddenPinyaPath) || fs.existsSync(adminPinyaPath)) {
            const matchedPath = 
                fs.existsSync(pinyaPath) ? pinyaPath :
                fs.existsSync(hiddenPinyaPath) ? hiddenPinyaPath :
                fs.existsSync(adminPinyaPath) ? adminPinyaPath :
                '';

            change_option(
                matchedPath,
                'ajuntament',
                ajuntamentRotation,
                () => io.to(room).emit(`.ajuntament_rotated`, ajuntamentRotation)
            )
        }
    }

    const getBundleFromId = id => {
        const bundlePath = `${__dirname}/data/bundles/${id}.json`;
        const bundleExists = fs.existsSync(bundlePath);

        if (bundleExists) {
            const fetchedJSON = JSON.parse(fs.readFileSync(bundlePath))
            fetchedJSON.id = id;
            return fetchedJSON;
        } else {
            return null;
        }
    }

    const uploadProvesToS3 = (event) => {
        const public_path = `${__dirname}/events/${event}/posicions`;
        if (!fs.existsSync(public_path)) fs.mkdirSync(public_path, { recursive: true });
        const private_path = `${__dirname}/events/${event}/posicions/hidden`;
        if (!fs.existsSync(private_path)) fs.mkdirSync(private_path, { recursive: true });
        const admin_path = `${__dirname}/events/${event}/posicions/admin`;
        if (!fs.existsSync(admin_path)) fs.mkdirSync(admin_path, { recursive: true });

        const public_crawler = new fdir().withMaxDepth(0).crawl(public_path);
        const private_crawler = new fdir().withMaxDepth(0).crawl(private_path);
        const admin_crawler = new fdir().withMaxDepth(0).crawl(admin_path);

        // Asynchronously - slow process. No need to block thread
        public_crawler.withPromise().then(public_files => {
            private_crawler.withPromise().then(private_files => {
                admin_crawler.withPromise().then(admin_files => {
                    const public_proves = public_files.map(f => f.split('/').at(-1)).filter(file => file.includes('.canvis'));
                    const private_proves = private_files.map(f => f.split('/').at(-1)).filter(file => file.includes('.canvis'));
                    const admin_proves = admin_files.map(f => f.split('/').at(-1)).filter(file => file.includes('.canvis'));
                    
                    const content = { 'event': event, 'public': public_proves, 'private': private_proves, 'admin': admin_proves };
                    
                    // Save to S3
                    const params = {
                        Bucket: 'aleta-' + colla,
                        Key: `proves/${event}.json`,
                        Body: JSON.stringify(content)
                    };

                    s3.putObject(params, function(err, data) {
                        if (err) console.log(err, err.stack); // an error occurred
                        // else     console.log(data);           // successful response
                    });
                });
            });
        });
    }

    function authenticateAPIKey(req, res, next) {
        const apiKey = req.headers['x-api-key'];
    
        if (!apiKey) return res.status(401).send('API Key missing');
    
        // Check the database or your store to see if this is a valid key
        const validKeys = fs.readFileSync('./api-keys.txt', 'utf8')
            .split('\n')
            .filter(key => key.length > 0)
            .filter(key => !key.startsWith('#'))
    
        const isValidKey = validKeys.includes(apiKey);
    
        if (!isValidKey) return res.status(403).send('Invalid API Key');
    
        next();
    }

    app.get('/api/proves/:event', authenticateAPIKey, (req, res) => {
        const event = req.params.event;

        const params = {
            Bucket: 'aleta-' + colla,
            Key: `proves/${event}.json`
        };

        s3.getObject(params, (err, data) => {
            const jsonData = data ? (JSON.parse(data?.Body?.toString()) || {}) : {};
            const isGood = 'event' in jsonData && 'public' in jsonData && 'private' in jsonData && 'admin' in jsonData;

            if (err || !isGood) {
                if (err?.statusCode !== 404) console.log(err, err.stack);
                readFromDisk(true);
            } else {
                res.json(jsonData)
            }
        });

        function readFromDisk(uploadToS3=false) {
            const public_path = `${__dirname}/events/${event}/posicions`;
            if (!fs.existsSync(public_path)) fs.mkdirSync(public_path, { recursive: true });
            const private_path = `${__dirname}/events/${event}/posicions/hidden`;
            if (!fs.existsSync(private_path)) fs.mkdirSync(private_path, { recursive: true });
            const admin_path = `${__dirname}/events/${event}/posicions/admin`;
            if (!fs.existsSync(admin_path)) fs.mkdirSync(admin_path, { recursive: true });

            const public_crawler = new fdir().withMaxDepth(0).crawl(public_path);
            const private_crawler = new fdir().withMaxDepth(0).crawl(private_path);
            const admin_crawler = new fdir().withMaxDepth(0).crawl(admin_path);

            // Asynchronously - slow process. No need to block thread
            public_crawler.withPromise().then(public_files => {
                private_crawler.withPromise().then(private_files => {
                    admin_crawler.withPromise().then(admin_files => {
                        const public_proves = public_files.map(f => f.split('/').at(-1)).filter(file => file.includes('.canvis'));
                        const private_proves = private_files.map(f => f.split('/').at(-1)).filter(file => file.includes('.canvis'));
                        const admin_proves = admin_files.map(f => f.split('/').at(-1)).filter(file => file.includes('.canvis'));
                        
                        const content = { 'event': event, 'public': public_proves, 'private': private_proves, 'admin': admin_proves };
                        res.json(content);

                        if (uploadToS3) {
                            // Save to S3
                            const params = {
                                Bucket: 'aleta-' + colla,
                                Key: `proves/${event}.json`,
                                Body: JSON.stringify(content)
                            };

                            s3.putObject(params, function(err, data) {
                                if (err) console.log(err, err.stack); // an error occurred
                                // else     console.log(data);           // successful response
                            });
                        }
                    });
                });
            });
        }
    });

    const uploadHoraIniciToS3 = (event, date) => {
        const params = {
            Bucket: 'aleta-' + colla,
            Key: `horainici/${event}.date`,
            Body: date
        };

        s3.putObject(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            // else     console.log(data);           // successful response
        });
    }

    io.on('connection', socket => {
        socket.emit('.new_connection', socket.id);

        socket.on('.associate_user', userId => {
            socket.userId = userId;
        })

        // Torna quines plantilles existeixen com a llista
        socket.on('.request_plantilles', () => {
            const plantillesPath = `${__dirname}/data/plantilles/`;
            const plantilles = fs.readdirSync(plantillesPath)
                .filter(file => file.includes('.json'))
                .map(file => file.replace('.json', ''))

            socket.emit('.plantilles', plantilles);
        });

        socket.on('.request_bundles', (selected=null) => {
            const bundlesPath = `${__dirname}/data/bundles/`;
            const bundles = fs.readdirSync(bundlesPath)
                .filter(file => file.includes('.json'))
                .map(file => file.replace('.json', ''))
                .filter(id => selected === null || selected.includes(id))
                .map(id => getBundleFromId(id))
            
            if (selected !== null) {
                bundles.sort((a, b) => {
                    const aIndex = selected.indexOf(a.id)
                    const bIndex = selected.indexOf(b.id)
                    return aIndex > bIndex ? 1 : -1
                })
            }

            socket.emit('.bundles', bundles);
        });

        app.get('/api/bundles', (req, res) => {
            const bundlesPath = `${__dirname}/data/bundles/`;
            const bundles = fs.readdirSync(bundlesPath)
                .filter(file => file.includes('.json'))
                .map(file => file.replace('.json', ''))
                .map(id => getBundleFromId(id))
            
            res.json(bundles)
        })

        socket.on('.request_horainici', (event, defaultHoraInici) => {
            const event_path = `${__dirname}/events/${event}`;
            const horaIniciFile = `${event_path}/horaIniciProves.date`;
            
            if (!fs.existsSync(horaIniciFile)) {
                fs.writeFileSync(
                    horaIniciFile,
                    defaultHoraInici
                )
            }

            fs.readFile(
                horaIniciFile,
                (err, data) => socket.emit(`.horainici`, event, data.toString())
            )
        })

        app.get('/api/horainici/:event', (req, res) => {
            const event = req.params.event;

            const params = {
                Bucket: 'aleta-' + colla,
                Key: `horainici/${event}.date`
            };

            s3.getObject(params, (err, data) => {
                const parsedData = data ? (data?.Body?.toString() || '') : '';
                const isGood = parsedData !== '';

                if (err || !isGood) {
                    if (err?.statusCode !== 404) console.log(err, err.stack);
                    readFromDisk(true);
                } else {
                    res.json(parsedData)
                }
            });

            function readFromDisk(uploadToS3=false) {
                const event_path = `${__dirname}/events/${req.params.event}`;
                const horaIniciFile = `${event_path}/horaIniciProves.date`;
                
                if (!fs.existsSync(horaIniciFile)) {
                    return res.json('');
                }
            
                fs.readFile(
                    horaIniciFile,
                    (err, data) => {
                        if (err) {
                            return res.status(500).json(null);
                        }
                        res.json(data.toString());
                    }
                )

                if (uploadToS3) {
                    const params = {
                        Bucket: 'aleta-' + colla,
                        Key: `horainici/${event}.date`,
                        Body: fs.readFileSync(horaIniciFile)
                    };

                    s3.putObject(params, function(err, data) {
                        if (err) console.log(err, err.stack); // an error occurred
                        // else     console.log(data);           // successful response
                    });
                }
            }
        });        

        socket.on('.save_horainici', (event, date) => {
            const event_path = `${__dirname}/events/${event}`;
            const horaIniciFile = `${event_path}/horaIniciProves.date`;
            
            fs.writeFile(
                horaIniciFile,
                date,
                (err, data) => io.emit(`.horainici`, event, date)
            )

            uploadHoraIniciToS3(event, date)
        })

        // Dona les duracions de cada prova
        socket.on('.request_durations', () => {
            const dataPath = `${__dirname}/data`;
            const durationsFile = `${dataPath}/provesDurations.canvis`;

            if (!fs.existsSync(durationsFile)) {
                fs.writeFileSync(durationsFile, '')
            }

            fs.readFile(
                durationsFile,
                (err, data) => socket.emit(`.durations`, data.toString())
            )
        })

        app.get('/api/durations', (req, res) => {
            const params = {
                Bucket: 'aleta-' + colla,
                Key: `bundles_durations.json`
            };

            s3.getObject(params, (err, data) => {
                const parsedData = data ? (data?.Body?.toString() || '') : '';
                const isGood = parsedData !== '';

                if (err || !isGood) {
                    if (err?.statusCode !== 404) console.log(err);
                    readFromDisk(true);
                } else {
                    res.json(parsedData)
                }
            });

            function readFromDisk(uploadToS3=false) {
                const dataPath = `${__dirname}/data`;
                const durationsFile = `${dataPath}/provesDurations.canvis`;

                if (!fs.existsSync(durationsFile)) {
                    fs.writeFileSync(durationsFile, '')
                }

                try {
                    const data = fs.readFileSync(durationsFile);
                    res.json(data.toString());

                    if (uploadToS3) {
                        const params = {
                            Bucket: 'aleta-' + colla,
                            Key: `bundles_durations.json`,
                            Body: fs.readFileSync(durationsFile)
                        };
    
                        s3.putObject(params, function(err, data) {
                            if (err) console.log(err, err.stack); // an error occurred
                            // else     console.log(data);           // successful response
                        });
                    }
                } catch (err) {
                    res.json(null);
                }
            }
        })

        const uploadDurationsToS3 = (durationsData) => {
            const params = {
                Bucket: 'aleta-' + colla,
                Key: `bundles_durations.json`,
                Body: durationsData.toString()
            };

            s3.putObject(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                // else     console.log(data);           // successful response
            });
        }

        // Edita la duració d'una cada prova
        socket.on('.edit_duration', (prova, duration) => {
            const dataPath = `${__dirname}/data`;
            const durationsFile = `${dataPath}/provesDurations.canvis`;

            if (!fs.existsSync(durationsFile)) {
                fs.writeFileSync(durationsFile, '')
            }

            fs.appendFileSync(
                durationsFile,
                `${prova}=${duration}\n`
            );

            socket.emit(`.durations_changed`, prova, duration);
            uploadDurationsToS3(fs.readFileSync(durationsFile));
        })

        // Obtén les hores que es farà cada prova (en funció de (durations, horaInici, order))
        socket.on('.request_hores_proves', eventId => {
            const dataPath = `${__dirname}/data`;
            const eventPath = `${__dirname}/events/${eventId}`;

            const durationsFile = `${dataPath}/provesDurations.canvis`;
            const horaIniciFile = `${eventPath}/horaIniciProves.date`;
            const orderFile = `${eventPath}/proves.order.canvis`;
            
            // Check existance
            if (!fs.existsSync(durationsFile)) fs.writeFileSync(durationsFile, '{}');
            if (!fs.existsSync(horaIniciFile)) fs.writeFileSync(horaIniciFile, '');
            if (!fs.existsSync(orderFile)) fs.writeFileSync(orderFile, '');

            // Read
            const durationsData = fs.readFileSync(durationsFile).toString()
            const horaIniciData = fs.readFileSync(horaIniciFile).toString()
            const orderData = fs.readFileSync(orderFile).toString()

            // Filter
            const durations = formatDurations(durationsData)
            const horaInici = moment(horaIniciData)
            const order = formatLastLine(orderData)

            // Calculate dates
            const dates = calculateProvesDates(order, durations, horaInici)

            io.emit('.hores_proves', eventId, dates)
        })

        // Carrega la plantilla del castell, si no existeix, envia error.
        socket.on('.load_json', castell => {
            const filename = `${__dirname}/data/plantilles/${castell}.json`;

            if (fs.existsSync(filename)) {
                const data = fs.readFileSync(filename);
                socket.emit('.loaded_json', JSON.parse(data));
            } else {
                socket.emit('.loaded_json', 'ERROR:NOT_EXISTS');
            }
        });

        socket.on('.duplicate_bundle', (bundleId, newAttrs) => {
            const bundle = getBundleFromId(bundleId)
            const newBundleId = crypto.randomBytes(5).toString('hex')
            const bundlePath = `${__dirname}/data/bundles/${newBundleId}.json`;

            const newBundle = {
                ...bundle,
                ...newAttrs,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            // Write bundle to file
            fs.writeFileSync(bundlePath, JSON.stringify(newBundle))

            // Also duplicate addons
            const addonsFilename = `${__dirname}/data/bundles/addons/${bundleId}.json`
            const addonsFile = fs.existsSync(addonsFilename) ? fs.readFileSync(addonsFilename) : null
            if (addonsFile) {
                const newAddonsFilename = `${__dirname}/data/bundles/addons/${newBundleId}.json`
                fs.writeFileSync(newAddonsFilename, addonsFile)
            }

            io.emit('.bundle_duplicated', newBundleId)
        })

        socket.on('.create_bundle', ({ parts, simultani, bundles, ...other }) => {
            const bundleId = crypto.randomBytes(5).toString('hex')
            const bundlePath = `${__dirname}/data/bundles/${bundleId}.json`;
            const partPath = part => `${__dirname}/data/plantilles/${part}.json`;

            if (simultani) {
                const bundleDict = bundles
                    .reduce((acc, item) => {
                        const part_id = crypto.randomBytes(5).toString('hex')
                        item.part_id = part_id;
                        acc[part_id] = item;
                        return acc;
                    }, {});

                fs.writeFileSync(bundlePath, JSON.stringify({
                    id: bundleId,
                    ...other,
                    simultani: true,
                    bundles: bundleDict,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }))
            } else {
                const partsThatExist = Object.fromEntries(
                    Object.entries(parts)
                        .filter(([key, value]) => fs.existsSync(partPath(value)))
                )

                fs.writeFileSync(bundlePath, JSON.stringify({
                    id: bundleId,
                    ...other,
                    parts: partsThatExist,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }))
            }

            io.emit('.bundle_created', bundleId)
        })

        const cutBeforeValue = (arr, value) => {
            const index = arr.findIndex(item => JSON.stringify(item) === JSON.stringify(value));
            return index >= 0 ? arr.slice(index) : [];
        }

        socket.on('.create_bundles_a_terra', ({ parts, ...other }) => {
            const partPath = part => `${__dirname}/data/plantilles/${part}.json`;

            const partsThatExist = Object.fromEntries(
                Object.entries(parts)
                    .filter(([key, value]) => fs.existsSync(partPath(value)))
            )

            Object.entries(partsThatExist).forEach(([part, plantilla]) => {
                // Part in ['Folre', 'Manilles', 'Puntals']
                if (part?.toLowerCase() === 'pinya' || part?.toLowerCase() === 'tronc') {
                    return;
                }

                const bundleId = crypto.randomBytes(5).toString('hex')
                const bundlePath = `${__dirname}/data/bundles/${bundleId}.json`;

                const partsUntilValue = Object.fromEntries(
                    cutBeforeValue(
                        Object.entries(partsThatExist),
                        Object.entries(partsThatExist)
                            .find(([key, value]) => key === part)
                    )
                )
                
                const { shortName } = other

                const newShortName = `${shortName} (${part[0].toLowerCase()}t)`
                const newNom = `${part} a terra de ${shortName}`

                fs.writeFileSync(bundlePath, JSON.stringify({
                    id: bundleId,
                    ...other,
                    nom: newNom,
                    shortName: newShortName,
                    parts: partsUntilValue,
                    createdAt: new Date().toISOString(),
                }))

                io.emit('.bundle_created', bundleId)
            })            
        })

        socket.on('.edit_bundle', ({ id, hidden, ...other }) => {
            const bundlePath = `${__dirname}/data/bundles/${id}.json`;
            const bundleExists = fs.existsSync(bundlePath);

            if (bundleExists) {
                const bundle = JSON.parse(fs.readFileSync(bundlePath))

                if (hidden !== undefined) bundle.hidden = hidden
                
                bundle.updatedAt = new Date().toISOString()
                bundle.id = id

                Object.entries(other)
                    .filter(([key, value]) => value !== undefined)
                    .forEach(([key, value]) => bundle[key] = value)

                fs.writeFileSync(bundlePath, JSON.stringify(bundle))
                io.emit('.bundle_edited', id)
            } else {
                io.emit('.bundle_edited', 'ERROR:NOT_EXISTS');
            }
        })

        socket.on('.request_bundle', (bundleId) => {
            const bundle = getBundleFromId(bundleId)
            socket.emit('.bundle', {
                id: bundleId,
                bundle: bundle
            });
        })

        function uploadBundleToS3(id, data) {
            const fullParams = {
                Bucket: 'aleta-' + colla,
                Key: `full_bundles/${id}.json`,
                Body: data
            };
        
            const fullPromise = s3.putObject(fullParams).promise();
    
            const shortParams = {
                Bucket: 'aleta-' + colla,
                Key: `short_bundles/${id}.json`,
                Body: JSON.stringify(getBundleFromId(id))
            };
        
            const shortPromise = s3.putObject(shortParams).promise();
    
            return Promise.all([fullPromise, shortPromise]);
        }      

        const mergeJSONsWithPrefix = (prev, current, prefix) => {
            if (!prefix) {
                return {
                    ...prev,
                    ...current,
                }
            }
        
            const maxPilarOnPrev = Object.entries(prev)
                .filter(([key, val]) => 'pilar' in val)
                .map(([key, val]) => val.pilar)
                .reduce((acc, val) => Math.max(acc, val), 0)
        
            // Fix pilar numbers
            const currentWithFixedPilars = Object.fromEntries(
                Object.entries(current)
                    .map(([key, val]) => {
                        if ('pilar' in val) {
                            return [key, {
                                ...val,
                                pilar: val.pilar + maxPilarOnPrev + 1
                            }]
                        } else {
                            return [key, val]
                        }
                    })
            )
        
            // Most right caixa on prev
            const maxCaixaOnPrev = Object.entries(prev)
                .filter(([key, val]) => val?.box?.transform?.[4])
                .map(([key, val]) => val.box.transform[4] + val.box.width)
                .reduce((acc, val) => Math.max(acc, val), 0)
        
            // Most left caixa on current
            const minCaixaOnCurrent = Object.entries(currentWithFixedPilars)
                .filter(([key, val]) => val?.box?.transform?.[4])
                .map(([key, val]) => val.box.transform[4])
                .reduce((acc, val) => Math.min(acc, val), Infinity)
        
            // Fix caixa positions
            const currentWithFixedCaixes = Object.fromEntries(
                Object.entries(currentWithFixedPilars)
                    .map(([key, val]) => {
                        if (!val?.box?.transform?.[5]) return [key, val]

                        return [key, {
                            ...val,
                            box: {
                                ...val.box,
                                transform: [
                                    ...val.box.transform.slice(0, 4),
                                    val.box.transform[4] - minCaixaOnCurrent + maxCaixaOnPrev + 30,
                                    val.box.transform[5]
                                ]
                            }
                        }]
                    })
            )
        
            // Add prefix to current's keys
            const currentWithPrefix = Object.fromEntries(
                Object.entries(currentWithFixedCaixes)
                    .map(([key, val]) => [`${prefix}_${key}`, val])
            )
        
            return {
                ...prev,
                ...currentWithPrefix,
            }
        }

        const updateBundle = async (bundleId) => {
            const addPartNameToEveryElement = (part, partname) => {
                return Object.fromEntries(
                    Object.entries(part)
                        .map(([key, value]) => [
                            key,
                            {
                                ...value,
                                'pestanya': partname.toLowerCase()
                            }
                        ])
                )
            }

            const addPrefixToKey = (part, prefix) => {
                return Object.fromEntries(
                    Object.entries(part)
                        .map(([key, value]) => [
                            `${prefix}_${key}`,
                            value
                        ])
                )
            }
        
            const bundle = getBundleFromId(bundleId)
    
            if (bundle?.simultani) {
                const bundlesSimultanis = Object.entries(bundle.bundles)
                    .map(([part_id, bun]) => {
                        return {
                            ...getBundleFromId(bun.id),
                            part_id: part_id
                        }
                    })

                const mergedBundles = bundlesSimultanis
                    .filter(b => b.id)
                    .map(b => {
                        const parts = Object.values(b?.parts || {})
                        const partnames = Object.keys(b?.parts || {})
    
                        const mergedParts = parts
                            .map(part => `${__dirname}/data/plantilles/${part}.json`)
                            .filter(path => fs.existsSync(path))
                            .map(filename => fs.readFileSync(filename))
                            .map(data => JSON.parse(data))
                            .map((part, i) => addPartNameToEveryElement(part, partnames[i]))
                            .reduce((accumulator, current) => {
                                return Object.assign(accumulator, current);
                            }, {})
    
                        return [
                            b.part_id,
                            mergedParts
                        ]
                    })
                    .reduce((accumulator, [part_id, current]) => {
                        return mergeJSONsWithPrefix(accumulator, current, part_id);
                    }, {})

                // Save merged parts to S3
                await uploadBundleToS3(bundleId, JSON.stringify(mergedBundles));
            } else {
                const parts = Object.values(bundle?.parts || {})
                const partnames = Object.keys(bundle?.parts || {})
            
                const mergedParts = parts
                    .map(part => `${__dirname}/data/plantilles/${part}.json`)
                    .filter(path => fs.existsSync(path))
                    .map(filename => fs.readFileSync(filename))
                    .map(data => JSON.parse(data))
                    .map((part, i) => addPartNameToEveryElement(part, partnames[i]))
                    .reduce((accumulator, current) => {
                        return Object.assign(accumulator, current);
                    }, {})
            
                // Save merged parts to S3
                await uploadBundleToS3(bundleId, JSON.stringify(mergedParts));
            }
        }

        socket.on('.request_noms_columnes_simultanis', (bundleId) => {
            const bundle = getBundleFromId(bundleId)
    
            if (bundle?.simultani) {
                const bundlesSimultanis = Object.entries(bundle.bundles)
                    .map(([part_id, bun]) => {
                        return {
                            ...getBundleFromId(bun.id),
                            part_id: part_id
                        }
                    })

                const mergedNomsColumnes = bundlesSimultanis
                    .map(b => getAddonsFromId(fs, b.id))
                    .filter(addons => addons?.noms_columnes)
                    .map(addons => addons?.noms_columnes)
                    .map(dict =>
                        Object.entries(dict)
                            .sort((a, b) => a[0] > b[0] ? 1 : -1)
                            .map(([key, val]) => val)
                    )
                    .reduce((acc, val) => [...acc, ...val], [])

                socket.emit('.noms_columnes_simultanis', bundleId, mergedNomsColumnes)
            }
        })

        socket.on('.request_s3_url', (id, params) => {
            const url = s3.getSignedUrl('getObject', { ...params, Expires: 300 })
            socket.emit('.s3_url', { id: id, url: url })
            console.log(url);
        })

        app.get('/api/form_image_url/:formId/:elementId/:user', (req, res) => {
            const formId = req.params.formId
            const elementId = req.params.elementId
            const user = req.params.user

            const filename = `forms/${formId}/${elementId}/${user}.base64`
            const params = { Bucket: 'aleta-' + colla, Key: filename };
            const url = s3.getSignedUrl('getObject', { ...params, Expires: 300 })
            res.json({ formId: formId, elementId: elementId, user: user, url: url })
        })

        app.get('/api/form_image_url/:formId/:elementId', (req, res) => {
            const formId = req.params.formId
            const elementId = req.params.elementId

            const filename = `forms/${formId}/${elementId}.base64`
            const params = { Bucket: 'aleta-' + colla, Key: filename };
            const url = s3.getSignedUrl('getObject', { ...params, Expires: 300 })
            res.json({ formId: formId, elementId: elementId, url: url })
        })

        app.get('/api/delete_form_image/:formId/:elementId/:user', (req, res) => {
            const formId = req.params.formId
            const elementId = req.params.elementId
            const user = req.params.user

            const filename = `forms/${formId}/${elementId}/${user}.base64`
            const params = { Bucket: 'aleta-' + colla, Key: filename };
            s3.deleteObject(params, (err, data) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ error: err })
                } else {
                    res.json({ formId: formId, elementId: elementId, user: user })
                }
            })
        })

        app.get('/api/bundle_link/:bundleId', async (req, res) => {
            const bundleId = req.params.bundleId;
            const force = 'force' in req.query ? parseInt(req.query.force) : false;

            const filename = `full_bundles/${bundleId}.json`;
            const params = { Bucket: 'aleta-' + colla, Key: filename };

            const emitLink = (params) => {
                try {
                    const url = s3.getSignedUrl('getObject', { ...params, Expires: 300 })
                    res.json({ id: bundleId, link: url })
                } catch (error) {
                    console.error(`Failed to get signed URL: ${error.message}`)
                    res.status(500).json({ id: bundleId, status: 'failed' })
                }
            }

            if (force) {
                // If force, update the bundle
                await updateBundle(bundleId).then(() => emitLink(params));
            } else {
                try {
                    // Check if the object exists in S3
                    await s3.headObject(params).promise();
                    emitLink(params);
                } catch (error) {
                    // If the object doesn't exist, create it
                    updateBundle(bundleId).then(() => emitLink(params));
                }
            }
        })

        socket.on('.request_bundle_link', async (bundleId, force=false) => {
            const filename = `full_bundles/${bundleId}.json`;
            const params = { Bucket: 'aleta-' + colla, Key: filename };
        
            const emitLink = (params) => {
                try {
                    const url = s3.getSignedUrl('getObject', { ...params, Expires: 300 })
                    socket.emit('.bundle_link', { id: bundleId, link: url })
                } catch (error) {
                    console.error(`Failed to get signed URL: ${error.message}`)
                    socket.emit('.bundle_link', { id: bundleId, status: 'failed' })
                }
            };
        
            if (force) {
                // If force, update the bundle
                await updateBundle(bundleId).then(() => emitLink(params));
            } else {
                try {
                    // Check if the object exists in S3
                    await s3.headObject(params).promise();
                    emitLink(params);
                } catch (error) {
                    // If the object doesn't exist, create it
                    updateBundle(bundleId).then(() => emitLink(params));
                }
            }
        });

        socket.on('.load_bundle', (bundleId, ...args) => {
            const bundle = getBundleFromId(bundleId)
            const parts = Object.values(bundle?.parts || {})
            const partnames = Object.keys(bundle?.parts || {})

            const addPartNameToEveryElement = (part, partname) => {
                return Object.fromEntries(
                    Object.entries(part)
                        .map(([key, value]) => [
                            key,
                            {
                                ...value,
                                'pestanya': partname.toLowerCase()
                            }
                        ])
                )
            }

            const mergedParts = parts
                .map(part => `${__dirname}/data/plantilles/${part}.json`)
                .filter(path => fs.existsSync(path))
                .map(filename => fs.readFileSync(filename))
                .map(data => JSON.parse(data))
                .map((part, i) => addPartNameToEveryElement(part, partnames[i]))
                .reduce((accumulator, current) => {
                    return Object.assign(accumulator, current);
                }, {})

            socket.emit('.loaded_json', mergedParts, bundleId, ...args);
        })

        socket.on('.request_addons', (bundleId, part_id) => {
            const addonsFilename = `${__dirname}/data/bundles/addons/${bundleId}.json`;

            if (!fs.existsSync(addonsFilename)) {
                // If it doesn't exist, create a blank addons file
                fs.writeFileSync(addonsFilename, JSON.stringify({
                    id: bundleId,
                    escaletes: {},
                    trepitjacions: {}
                }))

                return socket.emit('.addons', {
                    id: bundleId,
                    part_id: part_id,
                    addons: {
                        id: bundleId,
                        escaletes: {},
                        trepitjacions: {}
                    }
                });
            } else {
                // If it exists, return it
                const addons = JSON.parse(fs.readFileSync(addonsFilename))

                socket.emit('.addons', {
                    id: bundleId,
                    part_id: part_id,
                    addons: addons
                });
            }
        })

        app.get('/api/addons/:bundleId/:partId', (req, res) => {
            const bundleId = req.params.bundleId;
            const part_id = req.params.partId === 'none' ? undefined : req.params.partId;
            const force_disk = 'force_disk' in req.query ? parseInt(req.query.force_disk) : true;
        
            const s3_filename = `addons/${bundleId}.json`;
            const params = { Bucket: 'aleta-' + colla, Key: s3_filename };
        
            if (!force_disk) {
                s3.headObject(params, (err, data) => {
                    if (err) {
                        readFromDisk();
                    } else {
                        const url = s3.getSignedUrl('getObject', { ...params, Expires: 300 });
                        res.json({
                            id: bundleId,
                            part_id: part_id,
                            url: url
                        });
                    }
                });
            } else {
                readFromDisk();
            }
        
            function readFromDisk() {
                const addonsFilename = `${__dirname}/data/bundles/addons/${bundleId}.json`;
        
                if (!fs.existsSync(addonsFilename)) {
                    fs.writeFileSync(addonsFilename, JSON.stringify({
                        id: bundleId,
                        escaletes: {},
                        trepitjacions: {}
                    }));
        
                    res.json({
                        id: bundleId,
                        part_id: part_id,
                        addons: {
                            id: bundleId,
                            escaletes: {},
                            trepitjacions: {}
                        }
                    });
                } else {
                    fs.readFile(addonsFilename, (err, data) => {
                        if (err) {
                            res.status(500).json({ error: 'Error reading file' });
                        } else {
                            const addons = JSON.parse(data.toString());
        
                            res.json({
                                id: bundleId,
                                part_id: part_id,
                                addons: addons
                            });
        
                            // Upload to S3
                            const params = {
                                Bucket: 'aleta-' + colla,
                                Key: s3_filename,
                                Body: JSON.stringify(addons)
                            };
        
                            s3.putObject(params, (err, data) => {
                                if (err) console.log(err);
                            });
                        }
                    });
                }
            }
        });        

        socket.on('.update_bundle_addons', async (bundleId, addons) => {
            const addonsFilename = `${__dirname}/data/bundles/addons/${bundleId}.json`;

            const data = JSON.stringify({
                id: bundleId,
                ...addons
            });

            fs.writeFileSync(addonsFilename, data)

            // Upload to S3
            const s3Params = {
                Bucket: 'aleta-' + colla,
                Key: `addons/${bundleId}.json`,
                Body: data
            };

            s3.putObject(s3Params, (err, data) => {
                if (err) console.log(err);
            });
        })

        socket.on('.request_available_imports', (event, castell, versio) => {
            return get_available_imports(socket, fs, event, castell, versio)
        })

        socket.on('.create_prova', (event, castell, versio, tecnicaRole) => {
            const folderPath = `${__dirname}/events/${event}/posicions`;
            const filename = `${folderPath}/${castell}.${versio}.canvis`;
            const hiddenFilename = `${folderPath}/hidden/${castell}.${versio}.canvis`;
            const adminFilename = `${folderPath}/admin/${castell}.${versio}.canvis`;

            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

            // If doesn't exist, create it
            const doesntExist =
                !fs.existsSync(filename) &&
                !fs.existsSync(hiddenFilename) &&
                !fs.existsSync(adminFilename)

            if (doesntExist && tecnicaRole >= 2) {
                fs.writeFileSync(adminFilename, 'OPTIONS:ajuntament=0\n');
            } else if (doesntExist && tecnicaRole >= 1) {
                fs.writeFileSync(hiddenFilename, 'OPTIONS:ajuntament=0\n');
            }

            io.emit('.prova_created', event, castell, versio);

            // Upload changed proves to S3
            uploadProvesToS3(event);
        })

        socket.on('.change_state_prova', (event, castell, versio, isAdmin=false) => {
            const public_path = `${__dirname}/events/${event}/posicions/${castell}.${versio}.canvis`;
            const private_path = `${__dirname}/events/${event}/posicions/hidden/${castell}.${versio}.canvis`;
            const admin_path = `${__dirname}/events/${event}/posicions/admin/${castell}.${versio}.canvis`;

            const old_state = fs.existsSync(public_path) ? 'public' : fs.existsSync(private_path) ? 'private' : 'admin';

            if (isAdmin) {
                if (fs.existsSync(public_path)) fs.renameSync(public_path, admin_path, () => {});
                else if (fs.existsSync(private_path)) fs.renameSync(private_path, public_path, () => {});
                else if (fs.existsSync(admin_path)) fs.renameSync(admin_path, private_path, () => {});
            } else {
                // Novetat: Membre de tècnica no pot canviar estat de les proves
                return;

                // if (fs.existsSync(public_path)) fs.renameSync(public_path, private_path, () => {});
                // else if (fs.existsSync(private_path)) fs.renameSync(private_path, public_path, () => {});
            }

            const new_state = fs.existsSync(public_path) ? 'public' : fs.existsSync(private_path) ? 'private' : 'admin';
            io.emit('.changed_state_prova', event, castell, versio, old_state, new_state);

            // Upload changed proves to S3
            uploadProvesToS3(event);
        });

        socket.on('.delete_prova', (event, castell, versio) => {
            const public_path = `${__dirname}/events/${event}/posicions/${castell}.${versio}.canvis`;
            const private_path = `${__dirname}/events/${event}/posicions/hidden/${castell}.${versio}.canvis`;
            const admin_path = `${__dirname}/events/${event}/posicions/admin/${castell}.${versio}.canvis`;
            
            const deleted_dir = `${__dirname}/events/${event}/posicions/deleted`;
            const deleted_path = `${deleted_dir}/${castell}.${versio}.canvis`;
            if (!fs.existsSync(deleted_dir)) fs.mkdirSync(deleted_dir, { recursive: true });

            if (fs.existsSync(public_path)) fs.renameSync(public_path, deleted_path, () => {});
            else if (fs.existsSync(private_path)) fs.renameSync(private_path, deleted_path, () => {});
            else if (fs.existsSync(admin_path)) fs.renameSync(admin_path, deleted_path, () => {});

            io.emit('.deleted_prova', event);

            // Upload changed proves to S3
            uploadProvesToS3(event);
        });

        // Llegeix un fitxer (log) de canvis i el retorna
        socket.on(`.load_positions`, (event, castell, versio) => {
            const folderPath = `${__dirname}/events/${event}/posicions`;
            const filename = `${folderPath}/${castell}.${versio}.canvis`;
            const hiddenFilename = `${folderPath}/hidden/${castell}.${versio}.canvis`;
            const adminFilename = `${folderPath}/admin/${castell}.${versio}.canvis`;

            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

            // If doesn't exist, create it
            const doesntExist =
                !fs.existsSync(filename) &&
                !fs.existsSync(hiddenFilename) &&
                !fs.existsSync(adminFilename)

            if (doesntExist) {
                fs.writeFileSync(adminFilename, 'OPTIONS:ajuntament=0\n');
            } else if (fs.existsSync(filename)) {
                // Read file
                fs.readFile(
                    filename,
                    (err, data) => socket.emit(`.loaded_positions`, data.toString())
                );

                // Read file
                fs.readFile(
                    filename,
                    (err, data) => socket.emit(`.loaded_positionsv2`, {
                        event: event,
                        castell: castell,
                        versio: versio,
                        data: data.toString()
                    })
                );
            } else if (fs.existsSync(hiddenFilename)) {
                // Read file
                fs.readFile(
                    hiddenFilename,
                    (err, data) => socket.emit(`.loaded_positions`, data.toString())
                );

                // Read file
                fs.readFile(
                    hiddenFilename,
                    (err, data) => socket.emit(`.loaded_positionsv2`, {
                        event: event,
                        castell: castell,
                        versio: versio,
                        data: data.toString()
                    })
                );
            } else if (fs.existsSync(adminFilename)) {
                // Read file
                fs.readFile(
                    adminFilename,
                    (err, data) => socket.emit(`.loaded_positions`, data.toString())
                );

                // Read file
                fs.readFile(
                    adminFilename,
                    (err, data) => socket.emit(`.loaded_positionsv2`, {
                        event: event,
                        castell: castell,
                        versio: versio,
                        data: data.toString()
                    })
                );
            }
        });

        app.get('/api/positions/:event/:castell/:versio', (req, res) => {
            const event = req.params.event;
            const castell = req.params.castell;
            const versio = req.params.versio;
            const force_disk = 'force_disk' in req.query ? parseInt(req.query.force_disk) : true;

            // NEW VERSION: From S3
            const s3_filename = `positions/${event}/${castell}.${versio}.canvis`;
            const params = { Bucket: 'aleta-' + colla, Key: s3_filename };

            // If file exists in S3 and not forced to use disk, return it
            if (!force_disk) {
                s3.headObject(params, (err, data) => {
                    if (err) {
                        readFromDisk();
                    } else {
                        const url = s3.getSignedUrl('getObject', { ...params, Expires: 300 })
                        res.json({
                            event: event,
                            castell: castell,
                            versio: versio,
                            url: url
                        });
                    }
                });
            } else {
                readFromDisk();
            }

            function readFromDisk() {
                // OLD VERSION: Directly from file
                const folderPath = `${__dirname}/events/${event}/posicions`;
                const filename = `${folderPath}/${castell}.${versio}.canvis`;
                const hiddenFilename = `${folderPath}/hidden/${castell}.${versio}.canvis`;
                const adminFilename = `${folderPath}/admin/${castell}.${versio}.canvis`;

                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                // If doesn't exist, create it
                const doesntExist =
                    !fs.existsSync(filename) &&
                    !fs.existsSync(hiddenFilename) &&
                    !fs.existsSync(adminFilename);

                if (doesntExist) {
                    fs.writeFileSync(adminFilename, 'OPTIONS:ajuntament=0\n');
                } else {
                    let fileToRead = filename;
                    if (fs.existsSync(hiddenFilename)) {
                        fileToRead = hiddenFilename;
                    } else if (fs.existsSync(adminFilename)) {
                        fileToRead = adminFilename;
                    }

                    fs.readFile(fileToRead, (err, data) => {
                        if (err) {
                            res.status(500).json({ error: 'Error reading file' });
                        } else {
                            const fileData = data.toString();
                            res.json({
                                event: event,
                                castell: castell,
                                versio: versio,
                                data: fileData
                            });

                            // Upload to S3
                            const params = {
                                Bucket: 'aleta-' + colla,
                                Key: s3_filename,
                                Body: fileData
                            };

                            s3.putObject(params, (err, data) => {
                                if (err) console.log(err);
                            })
                        }
                    });
                }
            }
        });
        
        socket.on('.duplicar_proves', (fromEvent, toEvent) => {
            const fromPath = `${__dirname}/events/${fromEvent}`;
            const toPath = `${__dirname}/events/${toEvent}`;

            const orderFile = `${fromPath}/proves.order.canvis`;
            const posicionsDir = `${fromPath}/posicions`;

            const toOrderFile = `${toPath}/proves.order.canvis`;
            const toPosicionsDir = `${toPath}/posicions`;

            // Create 'toPath' directory if it doesn't exist
            fs.mkdirSync(toPath, { recursive: true });

            // Copy proves.order.canvis file
            let orderData = fs.readFileSync(orderFile).toString();

            // Function to handle directory copying and renaming
            function copyAndRenameFiles(fromDir, toDir) {
                fs.readdirSync(fromDir, { withFileTypes: true }).forEach(file => {
                    const fromFilePath = path.join(fromDir, file.name);
                    const toFilePath = path.join(toDir, file.name);

                    if (file.isDirectory()) {
                        fs.mkdirSync(toFilePath, { recursive: true });
                        copyAndRenameFiles(fromFilePath, toFilePath);
                    } else {
                        // Rename the middle part of the ".canvis" files
                        if (path.extname(file.name) === '.canvis') {
                            const oldVersio = file.name.split('.')[1];
                            const newVersio = crypto.randomBytes(5).toString('hex')

                            // Replace the old version with the new one in order file
                            orderData = orderData.replaceAll(oldVersio, newVersio);

                            const newFilename = file.name.replace(/\..*\./, '.' + newVersio + '.');
                            const toFilePath = path.join(toDir, newFilename);
                            fs.copyFileSync(fromFilePath, toFilePath);
                        } else {
                            fs.copyFileSync(fromFilePath, toFilePath);
                        }
                    }
                });
            }

            copyAndRenameFiles(posicionsDir, toPosicionsDir);
            fs.writeFileSync(toOrderFile, orderData);

            io.emit('.proves_duplicades', toEvent);
        })

        socket.on('.import_from_log', (posicionsLog, to) => {
            const [toEvent, toCastell, toVersio] = to;
            const sourceFolderPath = `${__dirname}/events/${toEvent}/posicions`;

            const publicTarget = `${sourceFolderPath}/${toCastell}.${toVersio}.canvis`;
            const privateTarget = `${sourceFolderPath}/hidden/${toCastell}.${toVersio}.canvis`;
            const adminTarget = `${sourceFolderPath}/admin/${toCastell}.${toVersio}.canvis`;
            
            if (fs.existsSync(publicTarget)) fs.writeFileSync(publicTarget, posicionsLog);
            else if (fs.existsSync(privateTarget)) fs.writeFileSync(privateTarget, posicionsLog);
            else if (fs.existsSync(adminTarget)) fs.writeFileSync(adminTarget, posicionsLog);
            else console.log(publicTarget, ' not found')
        })

        // Duplica un fitxer log de canvis amb un nou nom
        socket.on('.import', (from, to) => {
            const [fromEvent, fromCastell, fromVersio] = from;
            const fromFolderPath = `${__dirname}/events/${fromEvent}/posicions`;
            const publicSource = `${fromFolderPath}/${fromCastell}.${fromVersio}.canvis`;
            const privateSource = `${fromFolderPath}/hidden/${fromCastell}.${fromVersio}.canvis`;
            const adminSource = `${fromFolderPath}/admin/${fromCastell}.${fromVersio}.canvis`;

            const [toEvent, toCastell, toVersio] = to;
            const sourceFolderPath = `${__dirname}/events/${toEvent}/posicions`;
            const publicTarget = `${sourceFolderPath}/${toCastell}.${toVersio}.canvis`;
            const privateTarget = `${sourceFolderPath}/hidden/${toCastell}.${toVersio}.canvis`;
            const adminTarget = `${sourceFolderPath}/admin/${toCastell}.${toVersio}.canvis`;

            if (fs.existsSync(publicSource) && fs.existsSync(publicTarget)) fs.copyFileSync(publicSource, publicTarget);
            else if (fs.existsSync(publicSource) && fs.existsSync(privateTarget)) fs.copyFileSync(publicSource, privateTarget);
            else if (fs.existsSync(publicSource) && fs.existsSync(adminTarget)) fs.copyFileSync(publicSource, adminTarget);
            else if (fs.existsSync(privateSource) && fs.existsSync(publicTarget)) fs.copyFileSync(privateSource, publicTarget);
            else if (fs.existsSync(privateSource) && fs.existsSync(privateTarget)) fs.copyFileSync(privateSource, privateTarget);
            else if (fs.existsSync(privateSource) && fs.existsSync(adminTarget)) fs.copyFileSync(privateSource, adminTarget);
            else if (fs.existsSync(adminSource) && fs.existsSync(publicTarget)) fs.copyFileSync(adminSource, publicTarget);
            else if (fs.existsSync(adminSource) && fs.existsSync(privateTarget)) fs.copyFileSync(adminSource, privateTarget);
            else if (fs.existsSync(adminSource) && fs.existsSync(adminTarget)) fs.copyFileSync(adminSource, adminTarget);
            else console.log(publicSource, ' and ', publicTarget, ' not found')
        });

        socket.on('.request_watcher_count', (roomId) => socket.emit(`.watcher_count`, roomId, io.sockets.adapter.rooms.get(roomId)?.size || 0))
        socket.on('.request_watcher_info', (roomId) => socket.emit(`.watcher_info`, roomId, get_sockets_in_room(roomId).map(s => s?.userId || null)))
        socket.on(`.save_change_to_room`, (force_room, pos, action_id=null) => save_change(fs, force_room, io, socket, pos, action_id))

        socket.on('.prova_info', (event, castell, versio) => {
            const room = `${event}.${castell}.${versio}`;
            
            socket.join(room);
            io.emit(`.new_watcher`, room, socket.id)

            socket.on(`.save_change`, (pos, action_id=null) => save_change(fs, room, io, socket, pos, action_id));

            socket.on('.undo', () => undo(event, castell, versio, io, socket))

            socket.on('.rotate_ajuntament', rot_val => rotate_ajuntament(room, io, rot_val));

            socket.on(`.leave_room`, room => {
                if (socket.rooms.has(room)) {
                    socket.leave(room);
                    io.emit(`.end_watcher`, room, socket.id);
                }
            })

            socket.on('disconnect', () => {
                leaveAllRooms(socket);
                io.emit(`.end_watcher`, room, socket.id)
            });
        });

        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });
}
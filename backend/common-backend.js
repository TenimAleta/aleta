module.exports.build = (app, io, fs, emit_query, execute_query) => {
    
    const moment = require('moment')
    const md5 = require('md5');
    const cron = require('node-cron');
    const path = require('path');
    const archiver = require('archiver');
    const stream = require('stream');

    const AWS = require('aws-sdk');
    const accessKeys = require('./aws.credentials.json');

    const credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));
    const colla = credentials.colla;    

    const s3 = new AWS.S3({
        accessKeyId: accessKeys.accessKeyId,
        secretAccessKey: accessKeys.secretAccessKey,
        region: accessKeys.region,
    });

    
    async function backupFolder(folder, backupName) {
        // Create a stream to pass to archiver
        const archive = archiver('zip', { zlib: { level: 9 } });
        const passThrough = new stream.PassThrough();
    
        // Zip the folder
        archive.directory(folder, false);
        archive.finalize();
    
        // Pipe the archive data to the passThrough stream
        archive.pipe(passThrough);
    
        // S3 upload parameters
        const params = {
            Bucket: `aleta-${colla}`,
            Key: `backups/${backupName}.zip`,
            Body: passThrough
        };
    
        try {
            // Upload to S3
            const data = await s3.upload(params).promise();
            console.log(`File uploaded successfully at ${data.Location}`);
        } catch (err) {
            console.error("There was an error uploading your file: ", err.message);
        }
    }

    // Schedule a weekly backup every Sunday at 3AM
    cron.schedule('0 3 * * 0', async () => {
        const backupName = moment().format('YYYY-MM-DD');
        backupFolder('./', backupName);
        console.log('Weekly backup performed successfully.');
    });

    const get_md5_pass = user => "SELECT md5pass FROM castellers WHERE id=" + parseInt(user);
    const set_password = (user, pass) => `UPDATE castellers SET md5pass="${md5(pass)}" WHERE id=${parseInt(user)};`; 

    const get_event = event => `SELECT * FROM events WHERE id=${event}`;

    const get_user = user => `SELECT * FROM castellers WHERE id=${user}`;
    const print_all = event_id => {
        const eventId = parseInt(event_id);
        
        if (eventId === -1 || !event_id) {
            return `
                SELECT id, mote, nom, \`primer-cognom\`, \`segon-cognom\`, altura, altura_mans, 
                       hidden, canalla, novell, extern, music, lesionat, 
                       es_tecnica, es_junta, (expo_push_token IS NOT NULL) AS has_notifications 
                FROM castellers;
            `;
        } else {
            return `
                SELECT 
                    castellers.id, castellers.mote, castellers.nom, 
                    castellers.\`primer-cognom\`, castellers.\`segon-cognom\`, castellers.altura, 
                    castellers.altura_mans, castellers.hidden, castellers.canalla, 
                    castellers.novell, castellers.extern, castellers.music, 
                    castellers.lesionat, castellers.es_tecnica, castellers.es_junta,
                    (castellers.expo_push_token IS NOT NULL) AS has_notifications, 
                    a.\`assistència\`, a.\`data-entrada\`, a.\`data-sortida\` 
                FROM (
                    SELECT \`casteller-id\`, \`assistència\`, \`data-entrada\`, \`data-sortida\`
                    FROM \`assistència\` 
                    WHERE \`event-id\` = ${eventId}
                    AND (\`casteller-id\`, \`updatedAt\`) IN (
                        SELECT \`casteller-id\`, MAX(\`updatedAt\`)
                        FROM \`assistència\`
                        GROUP BY \`casteller-id\`
                    )
                ) AS a
                RIGHT JOIN castellers ON castellers.id = a.\`casteller-id\`;
            `;
        }
    };
    
    const applyTimeZone = (date, tz='Spain') => {
        if (tz === 'Spain') {
            const mom = moment(date)
            const lastSundayOfThisYearsMarch = mom.clone().year(mom.clone().year()).month(2).endOf('month').day('Sunday');
            const lastSundayOfThisYearsOctober = mom.clone().year(mom.clone().year()).month(9).endOf('month').day('Sunday');
    
            if (mom < lastSundayOfThisYearsMarch) {
                // January - March: Winter time
                return mom.add(-1, 'hours');
            } else if (mom < lastSundayOfThisYearsOctober) {
                // April - October: Summer time
                return mom.add(-2, 'hours');
            } else {
                // November - December: Winter time
                return mom.add(-1, 'hours');
            }
        } else {
            return moment(date);
        }
    }

    app.get('/api/get_all_positions_logs', (req, res) => {
        // Positions logs are saved in S3 in the folder "positions/" as .canvis files
        const params = {
            Bucket: 'aleta-' + colla,
            Prefix: 'positions/' // Only list objects that have this prefix
        };
    
        s3.listObjectsV2(params, (err, data) => {
            if (err) {
                console.log(err, err.stack); // An error occurred
                res.status(500).send(err); // Send a 500 Internal Server Error response
            } else {
                // TODO: Filter the results if needed, for example, to only return .canvis files
                const positionsLogs = data.Contents.filter(object => object.Key.endsWith('.canvis'));
    
                // Generate signed URLs for each position log and send them to the client
                const signedUrls = positionsLogs.map(log => {
                    const params = {
                        Bucket: 'aleta-' + colla,
                        Key: log.Key,
                        Expires: 60 * 60 // URL expires in 1 hour
                    };
                    return s3.getSignedUrl('getObject', params);
                });
                res.send(signedUrls);
            }
        });
    })

    io.on("connection", socket => {
        console.log(`[${moment().format('DD/MM HH:mm:ss')}] Socket ${socket.id} connected.`);
        socket.emit('.new_connection', socket.id)
        
        socket.on('.request_castellers_info', (event_id) =>
            emit_query(socket, '.castellers_info', print_all(event_id), sql_res => {
                const ids = sql_res.map(casteller => casteller.id);
                const infos = sql_res.map(casteller => ({
                    'id': casteller.id, 
                    'nom': casteller.nom, 
                    'cognom': casteller["primer-cognom"],
                    'segon_cognom': casteller["segon-cognom"],
                    'mote': casteller.mote, 
                    'altura': casteller.altura,
                    'altura_mans': casteller.altura_mans,
                    'assistència': casteller["assistència"],
                    'entrada': casteller["data-entrada"] ? applyTimeZone(casteller["data-entrada"]).toDate() : null,
                    'sortida': casteller["data-sortida"] ? applyTimeZone(casteller["data-sortida"]).toDate() : null,
                    'hidden': casteller.hidden,
                    'canalla': casteller.canalla,
                    'novell': casteller.novell,
                    'extern': casteller.extern,
                    'music': casteller.music,
                    'lesionat': casteller.lesionat,
                    'has_notifications': casteller.has_notifications,
                    'es_tecnica': casteller.es_tecnica,
                    'es_junta': casteller.es_junta,
                }));

                // Merge list of keys and list of values into object (https://stackoverflow.com/a/50985915)
                return ids.reduce((obj, key, index) => ({ ...obj, [key]: infos[index] }), {});
            })
        );

        socket.on('.request_version', () => {
            fs.readFile('./version.json', (err, data) => {
                if (err) throw err;
                socket.emit('.version', JSON.parse(data));
            })
        })

        socket.on('.request_user_details', user => emit_query(socket, `.user`, get_user(user), data => data.length > 0 ? data[0] : {}));

        socket.on('.new_person', (nom, cognom, mote, altura, prova_id) => {
            const parsedAltura = Number.isInteger(parseInt(altura)) ? parseInt(altura) : 'NULL';
            const insert_person_query = "INSERT INTO castellers (nom, `primer-cognom`, mote, altura) VALUES " + '("' + nom + '", "' + cognom + '", "' + mote + '", ' + parsedAltura + ")";
            const select_new_person_id = `SELECT MAX(id) as id FROM castellers WHERE nom="${nom}" AND altura ${parsedAltura === 'NULL' ? 'IS NULL' : '=' + String(parsedAltura)} AND mote="${mote === '-' ? 'NULL' : mote}"` + " AND `primer-cognom`=" + `"${cognom}"`;
            const person_attend_event = "INSERT INTO `assistència` (`event-id`, `casteller-id`, `assistència`) VALUES " + "(" + parseInt(event_id) + ", (" + select_new_person_id + "), 1)";
            
            emit_query(io, '.new_person_id', `${insert_person_query}; ${select_new_person_id}; ${person_attend_event};`, data => {
                return {
                    prova_id: prova_id,
                    new_person_id: data?.[1]?.[0]?.id,
                }
            });
        });

        socket.on('.request_event', event => emit_query(socket, '.event', get_event(event), data => {
            return data.length > 0 ? data.map(ev => {
                const decoded_title = ev.title ? Buffer.from(ev.title, 'base64').toString('utf-8') : ''
                const decoded_description = ev.description ? Buffer.from(ev.description, 'base64').toString('utf-8') : ''

                return {
                    ...ev,
                    ['title']: decoded_title,
                    ['description']: decoded_description,
                }
            })[0] : false
        }))

        app.get('/api/event/:eventId', (req, res) => {
            const eventId = parseInt(req.params.eventId);

            execute_query(get_event(eventId), data => {
                if (data.length > 0) {
                    const decoded_title = data[0].title ? Buffer.from(data[0].title, 'base64').toString('utf-8') : ''
                    const decoded_description = data[0].description ? Buffer.from(data[0].description, 'base64').toString('utf-8') : ''

                    res.json({
                        ...data[0],
                        ['title']: decoded_title,
                        ['description']: decoded_description,
                    });
                } else {
                    res.json(false);
                }
            });
        });

        socket.on('.request_md5_password', user => emit_query(socket, `.md5_password.${user}`, get_md5_pass(user), data => {
            if (data.length === 0) return '';
            else if (data[0].md5pass === null) return '';
            else return data[0].md5pass;
        }));

        socket.on('.set_password', (user, pass) => emit_query(socket, '.password_set', set_password(user, pass)));

        socket.on('disconnect', () => {
            console.log(`[${moment().format('DD/MM HH:mm:ss')}] Socket ${socket.id} disconnected.`)
            socket.removeAllListeners();
            io.emit('.ended_connection', socket.id)
        });
    });
}
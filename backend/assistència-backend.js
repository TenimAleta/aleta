function invertDictionary(dict) {
    let inverted = {};
    for (let key in dict) {
        dict[key].forEach((item) => {
            if (item in inverted) {
                inverted[item].push(key);
            } else {
                inverted[item] = [key];
            }
        });
    }
    return inverted;
}

module.exports.build = (app, io, fs, emit_query, execute_query, escape) => {
    const get_events = "SELECT * FROM events WHERE `data-esperada-inici` < '2099-12-29'";
    const get_assaigs = "SELECT * FROM events WHERE tipus='assaig' AND `data-esperada-inici` < '2099-12-29'";
    const get_actuacions = "SELECT * FROM events WHERE tipus='actuació' AND `data-esperada-inici` < '2099-12-29'";
    const get_activitats = "SELECT * FROM events WHERE tipus='activitat' AND `data-esperada-inici` < '2099-12-29'";
    const get_event = event_id => `SELECT * FROM events WHERE id=${event_id};`;

    const get_assistencia_event = (event) => {
        const eventId = parseInt(event);
        return `
            SELECT 
                c.id, c.mote, c.nom, c.\`primer-cognom\` AS cognom, c.altura, 
                a.\`assistència\`, a.\`data-entrada\`, a.\`data-sortida\`, 
                c.hidden, c.canalla, c.lesionat, c.music, c.extern, c.novell, 
                (c.expo_push_token IS NOT NULL) AS has_notifications 
            FROM castellers c 
            LEFT JOIN (
                SELECT \`casteller-id\`, \`assistència\`, \`data-entrada\`, \`data-sortida\`
                FROM \`assistència\` 
                WHERE \`event-id\` = ${eventId} 
                AND (\`casteller-id\`, \`id\`) IN (
                    SELECT \`casteller-id\`, MAX(\`id\`)
                    FROM \`assistència\` WHERE \`event-id\` = ${eventId}
                    GROUP BY \`casteller-id\`
                )
            ) AS a ON c.id = a.\`casteller-id\`;
        `;
    };

    const get_assistencia = (event, user) => {
        const eventId = parseInt(event);
        const userId = parseInt(user);
        return `
            SELECT \`assistència\`, \`data-entrada\`, \`data-sortida\`
            FROM \`assistència\`
            WHERE \`event-id\` = ${eventId}
            AND \`casteller-id\` = ${userId}
            ORDER BY \`updatedAt\` DESC
            LIMIT 1;
        `;
    };    

    const get_assistencies = user => {
        const userId = parseInt(user);
        return `
            SELECT \`casteller-id\`, \`event-id\`, \`assistència\`, \`data-entrada\`, \`data-sortida\`
            FROM \`assistència\`
            WHERE \`casteller-id\` = ${userId}
            AND (\`event-id\`, \`updatedAt\`) IN (
                SELECT \`event-id\`, MAX(\`updatedAt\`)
                FROM \`assistència\` WHERE \`casteller-id\` = ${userId}
                GROUP BY \`event-id\`
            );
        `;
    };

    const get_user = (user) => `SELECT * FROM castellers WHERE id=${user}`;
    const save_notification = ({ expo_token, user, title, body, notification_id, data, author }) => `INSERT INTO notifications (\`target_token\`, \`target\`, \`title\`, \`body\`, \`notification_id\`, \`data\`, \`author\`) VALUES ('${expo_token}', ${user}, ${title ? `${escape(title)}` : 'NULL'}, ${body ? `${escape(body)}` : 'NULL'}, '${notification_id}', '${data}', ${author})`;

    const { fdir } = require("fdir");
    const moment = require('moment')
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

    const credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));
    const colla = credentials.colla;  
    
    const AWS = require('aws-sdk');
    const accessKeys = require('./aws.credentials.json');

    const s3 = new AWS.S3({
        accessKeyId: accessKeys.accessKeyId,
        secretAccessKey: accessKeys.secretAccessKey,
        region: accessKeys.region,
    });

    // Can use this function below OR use Expo's Push Notification Tool from: https://expo.dev/notifications
    async function sendPushNotification(message, save=true) {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        // Save notification to SQL
        const msg = {
            'expo_token': message?.to || 'NULL',
            'user': message?.data?.user || 'NULL',
            'title': message?.title || 'NULL',
            'body': message?.body || 'NULL',
            'data': JSON.stringify(message?.data || {}),
            'notification_id': message?.notification_id || 'NULL',
            'author': message?.author || 'NULL',
        }

        if (save) execute_query(save_notification(msg), () => {});
    }

    const sendPushNotification2User = (userInfo, message, save=true) => {
        if (!('expo_push_token' in userInfo)) return;

        const changed_message = {
            ...message,
            'to': userInfo['expo_push_token'],
            'data': {
                ...message?.data,
                'user': userInfo.id,
                'colla': credentials['colla'],
            }
        }

        sendPushNotification(changed_message, save)
    }

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

    const getResponsablesOfUser = user => {
        const responsables_file = fs.readFileSync(`${__dirname}/notifications/tecnica_responsables.json`)
        const responsables = JSON.parse(responsables_file)

        const usersResponsables = invertDictionary(responsables)
        return usersResponsables[user] || []
    }

    const avisa_tecnica = (event, user, resposta, update, entrada=null, sortida=null) => {
        const tecnica = getResponsablesOfUser(user)

        const formattedEntrada = entrada && entrada !== 'NULL' ? moment(entrada).format('HH:mm') : null
        const formattedSortida = sortida && sortida !== 'NULL' ? moment(sortida).format('HH:mm') : null

        execute_query(get_user(user), data => {
            if (data.length > 0) {
                const userInfo = data[0]
                const displayName = userInfo.mote || userInfo.nom + ' ' + userInfo['primer-cognom'][0] + '.'

                // Fetch event title from the database
                execute_query(get_event(event), eventData => {
                    const eventTitle = eventData.length > 0 ? Buffer.from(eventData[0].title, 'base64').toString('utf-8') : "ESDEVENIMENT ELIMINAT"

                    const emoji =
                        (formattedEntrada || formattedSortida) ? '🕒 ' :
                        resposta === 1 ? '✅ ' :
                        resposta === 0 ? '❌ ' :
                        '';

                    const message = {
                        title: `${emoji}Canvi d'última hora! (${displayName})`,
                        body:
                            formattedEntrada && formattedSortida ? `[${eventTitle.toUpperCase()}] ${displayName} ${resposta === 1 ? 'VE' : 'NO ve'} i arriba a les ${formattedEntrada} i marxa a les ${formattedSortida}.` :
                            formattedEntrada ? `[${eventTitle.toUpperCase()}] ${displayName} ${resposta === 1 ? 'VE' : 'NO ve'} i arriba a les ${formattedEntrada}.` :
                            formattedSortida ? `[${eventTitle.toUpperCase()}] ${displayName} ${resposta === 1 ? 'VE' : 'NO ve'} i marxa a les ${formattedSortida}.` :
                            `[${eventTitle.toUpperCase()}] ${displayName} al final ${resposta === 1 ? 'VE' : 'NO ve'}.`,
                        data: {  }
                    }

                    tecnica.forEach(userid => {
                        execute_query(get_user(userid), tecnica_data => {
                            if (tecnica_data.length > 0) {
                                sendPushNotification2User(tecnica_data[0], message, false)
                            }
                        })
                    })
                })
            }
        })
    }

    const last_hour_change = async (event) => {
        return new Promise((resolve, reject) => {
            execute_query(get_event(event), data => {
                const start_date = applyTimeZone(data[0]['data-esperada-inici'])
                const end_date = applyTimeZone(data[0]['data-esperada-fi'])
                const now = moment()

                if (now.isAfter(start_date.add(-4, 'hour')) && now.isBefore(end_date)) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
        })
    }

    const confirmar = (event, user, resposta) => {
        return `
            INSERT INTO \`assistència\` (\`event-id\`, \`casteller-id\`, \`assistència\`, \`data-entrada\`, \`data-sortida\`) 
            VALUES (${parseInt(event)}, ${parseInt(user)}, ${parseInt(resposta)}, NULL, NULL);
        ` + get_assistencia(event, user);
    };
    
    const confirmar_raresa = (event, user, resposta, update=false, entrada, sortida) => {
        return `
            INSERT INTO \`assistència\` (\`event-id\`, \`casteller-id\`, \`assistència\`, \`data-entrada\`, \`data-sortida\`) 
            VALUES (${parseInt(event)}, ${parseInt(user)}, ${parseInt(resposta)}, ${entrada ? `'${entrada}'` : `NULL`}, ${sortida ? `'${sortida}'` : `NULL`});
        ` + get_assistencia(event, user);
    };

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
    
    io.on('connection', socket => {
        socket.on('.request_all_events', () => emit_query(socket, '.events', get_events, data => {
            return data.map(ev => {
                const decoded_title = ev.title ? Buffer.from(ev.title, 'base64').toString('utf-8') : ''
                const decoded_description = ev.description ? Buffer.from(ev.description, 'base64').toString('utf-8') : ''

                return {
                    ...ev,
                    ['title']: decoded_title,
                    ['description']: decoded_description,
                }
            })
        }));

        socket.on('.request_actuacions', () => emit_query(socket, '.actuacions', get_actuacions, data => {
            return data.map(ev => {
                const decoded_title = ev.title ? Buffer.from(ev.title, 'base64').toString('utf-8') : ''
                const decoded_description = ev.description ? Buffer.from(ev.description, 'base64').toString('utf-8') : ''

                return {
                    ...ev,
                    ['title']: decoded_title,
                    ['description']: decoded_description,
                }
            })
        }));

        socket.on('.request_assaigs', () => emit_query(socket, '.assaigs', get_assaigs, data => {
            return data.map(ev => {
                const decoded_title = ev.title ? Buffer.from(ev.title, 'base64').toString('utf-8') : ''
                const decoded_description = ev.description ? Buffer.from(ev.description, 'base64').toString('utf-8') : ''

                return {
                    ...ev,
                    ['title']: decoded_title,
                    ['description']: decoded_description,
                }
            })
        }));

        socket.on('.request_activitats', () => emit_query(socket, '.activitats', get_activitats, data => {
            return data.map(ev => {
                const decoded_title = ev.title ? Buffer.from(ev.title, 'base64').toString('utf-8') : ''
                const decoded_description = ev.description ? Buffer.from(ev.description, 'base64').toString('utf-8') : ''

                return {
                    ...ev,
                    ['title']: decoded_title,
                    ['description']: decoded_description,
                }
            })
        }));

        socket.on('.request_events', events => {
            if (events.length === 0) return;
            const valid_ids = events.map(id => !isNaN(parseInt(id)) ? parseInt(id) : -1);
            const events_query = valid_ids.map(ev_id => get_event(ev_id)).join(' ');
            emit_query(socket, '.events_info', events_query, data => {
                return data
                    .map(evs => evs.length > 0 ? evs[0] : {})
                    .map(ev => {
                        if (!ev.id) return {}

                        const decoded_title = ev.title ? Buffer.from(ev.title, 'base64').toString('utf-8') : ''
                        const decoded_description = ev.description ? Buffer.from(ev.description, 'base64').toString('utf-8') : ''
        
                        return {
                            ...ev,
                            ['title']: decoded_title,
                            ['description']: decoded_description,
                        }
                    })
            });
        });

        socket.on('.request_assistencies', user => emit_query(socket, '.assistencies', get_assistencies(user), data => {
            return data.map(res => {
                if (parseInt(res["assistència"]) === 2) return { 'assistencia': 'Fitxat', 'entrada': res['data-entrada'], 'sortida': res['data-sortida'], 'event': res['event-id'], 'user': res['casteller-id'] };
                else if (parseInt(res["assistència"]) === 1) return { 'assistencia': 'Vinc', 'entrada': res['data-entrada'], 'sortida': res['data-sortida'], 'event': res['event-id'], 'user': res['casteller-id'] };
                else if (parseInt(res["assistència"]) === 0) return { 'assistencia': 'No vinc', 'entrada': res['data-entrada'], 'sortida': res['data-sortida'], 'event': res['event-id'], 'user': res['casteller-id'] };
                else return { 'assistencia': 'No confirmat', 'entrada': res['data-entrada'], 'sortida': res['data-sortida'], 'event': res['event-id'], 'user': res['casteller-id'] };
            });
        }));

        app.get('/api/assistencies/:user', authenticateAPIKey, (req, res) => {
            const user = req.params.user;
            execute_query(get_assistencies(user), data => {
                res.json(data.map(res => {
                    if (parseInt(res["assistència"]) === 2) return { 'assistencia': 'Fitxat', 'entrada': res['data-entrada'], 'sortida': res['data-sortida'], 'event': res['event-id'], 'user': res['casteller-id'] };
                    else if (parseInt(res["assistència"]) === 1) return { 'assistencia': 'Vinc', 'entrada': res['data-entrada'], 'sortida': res['data-sortida'], 'event': res['event-id'], 'user': res['casteller-id'] };
                    else if (parseInt(res["assistència"]) === 0) return { 'assistencia': 'No vinc', 'entrada': res['data-entrada'], 'sortida': res['data-sortida'], 'event': res['event-id'], 'user': res['casteller-id'] };
                    else return { 'assistencia': 'No confirmat', 'entrada': res['data-entrada'], 'sortida': res['data-sortida'], 'event': res['event-id'], 'user': res['casteller-id'] };
                }));
            });
        });

        socket.on('.request_assistencia_event', (event) => emit_query(socket, '.assistencies_event', get_assistencia_event(event), data => {
            return {
                event: event,
                data: data
                    .filter(row => parseInt(row.hidden) !== 1 || [1,2].includes(parseInt(row["assistència"])))
                    .map(row => {
                        if (parseInt(row["assistència"]) === 2) return { 'assistencia': 'Fitxat', 'event': event, 'user': parseInt(row["id"]), ...row };
                        else if (parseInt(row["assistència"]) === 1) return { 'assistencia': 'Vinc', 'event': event, 'user': parseInt(row["id"]), ...row };
                        else if (parseInt(row["assistència"]) === 0) return { 'assistencia': 'No vinc', 'event': event, 'user': parseInt(row["id"]), ...row };
                        else return { 'assistencia': 'No confirmat', 'event': event, 'user': parseInt(row["id"]), ...row };
                    })
            }
        }));

        socket.on('.request_assistencia', (event, user) => emit_query(socket, `.assistencia`, get_assistencia(event, user), data => {
            if (data.length === 0) return { 'assistencia': 'No confirmat', 'event': event, 'user': user };
            else if (parseInt(data[0]["assistència"]) === 2) return { 'assistencia': 'Fitxat', 'event': event, 'user': user, "entrada": data[0]['data-entrada'] ? data[0]['data-entrada'] : null, "sortida": data[0]['data-sortida'] ? data[0]['data-sortida'] : null };
            else if (parseInt(data[0]["assistència"]) === 1) return { 'assistencia': 'Vinc', 'event': event, 'user': user, "entrada": data[0]['data-entrada'] ? data[0]['data-entrada'] : null, "sortida": data[0]['data-sortida'] ? data[0]['data-sortida'] : null };
            else if (parseInt(data[0]["assistència"]) === 0) return { 'assistencia': 'No vinc', 'event': event, 'user': user, "entrada": data[0]['data-entrada'] ? data[0]['data-entrada'] : null, "sortida": data[0]['data-sortida'] ? data[0]['data-sortida'] : null };
            else return { 'assistencia': 'No confirmat', 'event': event, 'user': user, "entrada": data[0]['data-entrada'] ? data[0]['data-entrada'] : null, "sortida": data[0]['data-sortida'] ? data[0]['data-sortida'] : null };
        }));

        app.get('/api/assistencia/:event/:user', authenticateAPIKey, (req, res) => {
            const event = req.params.event;
            const user = req.params.user;

            execute_query(get_assistencia(event, user), data => {
                if (data.length === 0) res.json({ 'assistencia': 'No confirmat', 'event': event, 'user': user });
                else if (parseInt(data[0]["assistència"]) === 2) res.json({ 'assistencia': 'Fitxat', 'event': event, 'user': user, "entrada": data[0]['data-entrada'] ? data[0]['data-entrada'] : null, "sortida": data[0]['data-sortida'] ? data[0]['data-sortida'] : null });
                else if (parseInt(data[0]["assistència"]) === 1) res.json({ 'assistencia': 'Vinc', 'event': event, 'user': user, "entrada": data[0]['data-entrada'] ? data[0]['data-entrada'] : null, "sortida": data[0]['data-sortida'] ? data[0]['data-sortida'] : null });
                else if (parseInt(data[0]["assistència"]) === 0) res.json({ 'assistencia': 'No vinc', 'event': event, 'user': user, "entrada": data[0]['data-entrada'] ? data[0]['data-entrada'] : null, "sortida": data[0]['data-sortida'] ? data[0]['data-sortida'] : null });
                else res.json({ 'assistencia': 'No confirmat', 'event': event, 'user': user, "entrada": data[0]['data-entrada'] ? data[0]['data-entrada'] : null, "sortida": data[0]['data-sortida'] ? data[0]['data-sortida'] : null });
            });
        });
        
        socket.on('.confirmar', (event, user, resposta, update, fromTecnica=false) => {
            if (!fromTecnica) {
                last_hour_change(event).then(isLastHour => {
                    if (isLastHour && [0, 1].includes(resposta)) {
                        avisa_tecnica(event, user, resposta, update);
                    }
                });
            }
        
            // After that, run this operation
            emit_query(io, '.confirmat', confirmar(event, user, resposta, update), data => {
                if (data.length !== 2 && data[1].length === 0) 
                    return { 'assistencia': 'No confirmat', 'event': event, 'user': user };
                else if (parseInt(data[1][0]["assistència"]) === 2) 
                    return { 'assistencia': 'Fitxat', 'event': event, 'user': user };
                else if (parseInt(data[1][0]["assistència"]) === 1) 
                    return { 'assistencia': 'Vinc', 'event': event, 'user': user };
                else if (parseInt(data[1][0]["assistència"]) === 0) 
                    return { 'assistencia': 'No vinc', 'event': event, 'user': user };
                else 
                    return { 'assistencia': 'No confirmat', 'event': event, 'user': user };
            });
        });        

        socket.on('.confirmar_raresa', (event, user, resposta, update, entrada, sortida, fromTecnica=false) => {
            if (!fromTecnica) {
                last_hour_change(event).then(isLastHour => {
                    if (isLastHour && [0, 1].includes(resposta)) {
                        avisa_tecnica(event, user, resposta, update, entrada, sortida);
                    }
                });
            }
        
            // After that, run this operation
            emit_query(io, '.confirmat', confirmar_raresa(event, user, resposta, update, entrada, sortida), data => {
                if (data.length !== 2 && data[1].length === 0) 
                    return { 'assistencia': 'No confirmat', 'event': event, 'entrada': data[1][0]['data-entrada'], 'sortida': data[1][0]['data-sortida'], 'user': user };
                else if (parseInt(data[1][0]["assistència"]) === 2) 
                    return { 'assistencia': 'Fitxat', 'event': event, 'entrada': data[1][0]['data-entrada'], 'sortida': data[1][0]['data-sortida'], 'user': user };
                else if (parseInt(data[1][0]["assistència"]) === 1) 
                    return { 'assistencia': 'Vinc', 'event': event, 'entrada': data[1][0]['data-entrada'], 'sortida': data[1][0]['data-sortida'], 'user': user };
                else if (parseInt(data[1][0]["assistència"]) === 0) 
                    return { 'assistencia': 'No vinc', 'event': event, 'entrada': data[1][0]['data-entrada'], 'sortida': data[1][0]['data-sortida'], 'user': user };
                else 
                    return { 'assistencia': 'No confirmat', 'event': event, 'entrada': data[1][0]['data-entrada'], 'sortida': data[1][0]['data-sortida'], 'user': user };
            });
        });        

        socket.on('.request_proves', event => {
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
                        io.emit('.proves', content);
                    });
                });
            });
        });

        socket.on('.request_responsables', () => {
            const responsables_file = fs.readFileSync(`${__dirname}/notifications/tecnica_responsables.json`)
            const responsables = JSON.parse(responsables_file)
            socket.emit('.responsables', responsables)
        })

        socket.on('.add_responsable', ({ tecnica, user }) => {
            const responsables_file = fs.readFileSync(`${__dirname}/notifications/tecnica_responsables.json`)
            const responsables = JSON.parse(responsables_file)
            
            if (tecnica in responsables) {
                responsables[tecnica].push(user)
            } else {
                responsables[tecnica] = [user]
            }

            fs.writeFileSync(`${__dirname}/notifications/tecnica_responsables.json`, JSON.stringify(responsables))
            socket.emit('.responsables', responsables)
        })

        socket.on('.add_responsables', ({ tecnica, users }) => {
            const responsables_file = fs.readFileSync(`${__dirname}/notifications/tecnica_responsables.json`)
            const responsables = JSON.parse(responsables_file)

            if (tecnica in responsables) {
                responsables[tecnica] = [...new Set([...responsables[tecnica], ...users])]
            } else {
                responsables[tecnica] = users
            }

            fs.writeFileSync(`${__dirname}/notifications/tecnica_responsables.json`, JSON.stringify(responsables))
            socket.emit('.responsables', responsables)
        })

        socket.on('.remove_responsable', ({ tecnica, user }) => {
            const responsables_file = fs.readFileSync(`${__dirname}/notifications/tecnica_responsables.json`)
            const responsables = JSON.parse(responsables_file)

            if (tecnica in responsables) {
                responsables[tecnica] = responsables[tecnica].filter(u => u !== user)
            }

            fs.writeFileSync(`${__dirname}/notifications/tecnica_responsables.json`, JSON.stringify(responsables))
            socket.emit('.responsables', responsables)
        })

        socket.on(".clear_responsables", ({ tecnica }) => {
            const responsables_file = fs.readFileSync(`${__dirname}/notifications/tecnica_responsables.json`)
            const responsables = JSON.parse(responsables_file)

            if (tecnica in responsables) {
                responsables[tecnica] = []
            }

            fs.writeFileSync(`${__dirname}/notifications/tecnica_responsables.json`, JSON.stringify(responsables))
            socket.emit('.responsables', responsables)
        })

        socket.on('.request_order', event => {
            const event_path = `${__dirname}/events/${event}`;
            const order_file = `${event_path}/proves.order.canvis`;

            if (!fs.existsSync(event_path)) {
                fs.mkdirSync(event_path, { recursive: true });
            }

            if (fs.existsSync(order_file)) {
                const data = fs.readFileSync(order_file).toString();
                const lastLine = data.split('\n').filter(line => line !== '').at(-1) || '[]'
                const mostRecentOrder = JSON.parse(lastLine);

                // Return most recent order
                socket.emit('.new_order', event, mostRecentOrder)
            } else {
                // Order non-existant, create an empty one
                fs.writeFileSync(
                    order_file,
                    '[]\n',
                    () => socket.emit('.new_order', event, [])
                )
            }
        })

        app.get('/api/order/:event', authenticateAPIKey, (req, res) => {
            const event = req.params.event;

            // Get order from S3
            const params = {
                Bucket: 'aleta-' + colla,
                Key: `orders/${event}.order.canvis`,
            };

            s3.getObject(params, function(err, data) {
                if (err) {
                    readFromDisk(true)
                } else {
                    const dataString = data.Body.toString()
                    const lastLine = dataString.split('\n').filter(line => line !== '').at(-1) || '[]'
                    const mostRecentOrder = JSON.parse(lastLine);

                    // Return most recent order
                    res.json(mostRecentOrder)
                }
            });                    

            function readFromDisk(uploadToS3=true) {
                const event_path = `${__dirname}/events/${event}`;
                const order_file = `${event_path}/proves.order.canvis`;

                if (!fs.existsSync(event_path)) {
                    fs.mkdirSync(event_path, { recursive: true });
                }

                if (fs.existsSync(order_file)) {
                    const data = fs.readFileSync(order_file).toString();
                    const lastLine = data.split('\n').filter(line => line !== '').at(-1) || '[]'
                    const mostRecentOrder = JSON.parse(lastLine);

                    // Return most recent order
                    res.json(mostRecentOrder)

                    if (uploadToS3) {
                        // Upload latest order to S3
                        uploadOrderToS3(event, mostRecentOrder)
                    }
                } else {
                    // Order non-existant, create an empty one
                    fs.writeFileSync(
                        order_file,
                        '[]\n',
                        () => res.json([])
                    )

                    if (uploadToS3) {
                        // Upload new order to S3
                        uploadOrderToS3(event, [])
                    }
                }
            }
        })

        const uploadOrderToS3 = (event, order) => {
            const params = {
                Bucket: 'aleta-' + colla,
                Key: `orders/${event}.order.canvis`,
                Body: JSON.stringify(order)
            };

            s3.putObject(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                // else     console.log(data);           // successful response
            });
        };

        socket.on('.change_order', (event, order) => {
            const event_path = `${__dirname}/events/${event}`;
            const order_file = `${event_path}/proves.order.canvis`;

            if (fs.existsSync(order_file)) {
                fs.appendFile(
                    order_file,
                    JSON.stringify(order) + "\n",
                    () => socket.broadcast.emit(`.new_order`, event, order)
                )

                // Upload latest order to S3
                uploadOrderToS3(event, order)
            } else {
                // Order non-existant, create an empty one
                fs.writeFileSync(
                    order_file,
                    '[]\n',
                    () => socket.emit('.new_order', event, [])
                )

                // Upload new order to S3
                uploadOrderToS3(event, [])
            }
        })

        socket.on('.add_order', (event, order) => {
            const event_path = `${__dirname}/events/${event}`;
            const order_file = `${event_path}/proves.order.canvis`;

            if (!fs.existsSync(order_file)) {
                // Order non-existant, create an empty one
                fs.writeFileSync(
                    order_file,
                    '[]\n',
                    () => socket.emit('.new_order', event, [])
                )
            }
            
            const lastOrder = fs.readFileSync(order_file)
                .toString()
                .split('\n')
                .filter(line => line !== '')
                .at(-1) || '[]'

            const mostRecentOrder = JSON.parse(lastOrder);
            const newOrder = [...mostRecentOrder, ...order]

            fs.appendFileSync(
                order_file,
                JSON.stringify(newOrder) + "\n",
            )

            io.emit(`.new_order`, event, newOrder)

            // Upload latest order to S3
            uploadOrderToS3(event, newOrder)
        })

        socket.on('.remove_last_order', (event) => {
            const event_path = `${__dirname}/events/${event}`;
            const order_file = `${event_path}/proves.order.canvis`;

            if (fs.existsSync(order_file)) {
                const orders = fs.readFileSync(order_file)
                    .toString()
                    .split('\n')
                    .filter(line => line !== '')

                const uniqueOrders = orders
                    .filter((value, index, self) => self.indexOf(value) === index)

                const newOrders = uniqueOrders
                    .slice(0, uniqueOrders.length - 1)

                fs.writeFileSync(
                    order_file,
                    newOrders.join('\n') + '\n',
                )

                const mostRecentOrder = JSON.parse(newOrders.at(-1) || '[]');

                io.emit(`.new_order`, event, mostRecentOrder)

                // Upload latest order to S3
                uploadOrderToS3(event, mostRecentOrder)
            }
        })

        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });
};
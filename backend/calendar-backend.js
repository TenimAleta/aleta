const { google } = require('googleapis');
const path = require('node:path');

const credentials = require('./google.auth');
const calendar_keys = require('./calendar.keys');
const md5 = require('md5');
const moment = require('moment');

const jwtClient = new google.auth.JWT(
	credentials['client_email'],
	null,
	credentials['private_key'],
	'https://www.googleapis.com/auth/calendar'
);

const calendar = google.calendar({
	version: 'v3',
	project: calendar_keys['project'],
	auth: jwtClient
});

const get_calendar_targets = ({ calendarId }) => {
    return calendar_keys?.['calendar_targets']?.[calendarId] || []
}

const processEvents = (result) => result.data.items
    .map(item => {
        let { htmlLink, start, end, summary, location, description, reminders, calendarId } = item;

        // Encode summary
        if (summary) {
            let buff = Buffer.from(summary, 'utf-8');
            summary = buff.toString('base64');
        }

        // Encode description
        if (description) {
            let buff = Buffer.from(description, 'utf-8');
            description = buff.toString('base64');
        }

        return { htmlLink, start, end, summary, location, description, reminders, calendarId };
    })

const normalize_str = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

const infere_tipus = (event) => {
    const assaig_keywords = ['assaig', 'tecnifica'/* r / ció */, 'escola'];
    const actuacio_keywords = ['actuació', 'diada', 'comercial', 'pilar', 'sant', 'aniversari'];

    const decoded_title = event.summary && event.summary.length > 0 ? Buffer.from(event.summary, 'base64').toString('utf-8') : '';
    // const decoded_description = Buffer.from(event.description, 'base64').toString('utf-8');

    // const texts = (event.summary + ' ' + event.description).toLowerCase();
    const texts = normalize_str(decoded_title).toLowerCase();

    if (assaig_keywords.filter(word => texts.includes(normalize_str(word))).length > 0) return 'assaig';
    else if (actuacio_keywords.filter(word => texts.includes(normalize_str(word))).length > 0) return 'actuació';
    else return 'activitat';
};

const infere_targets = (event, tecnicaAsDefault=false) => {
    const tecnica_keywords = ['tècnica']
    const junta_keywords = ['junta']
    const musics_keywords = ['músics', 'gralles', 'tabals', 'grallers']

    const decoded_title = event.summary && event.summary.length > 0 ? Buffer.from(event.summary, 'base64').toString('utf-8') : '';
    const texts = normalize_str(decoded_title).toLowerCase();

    const targets = get_calendar_targets(event)

    const isForTecnica = tecnica_keywords.filter(word => texts.includes(normalize_str(word))).length > 0
    const isForJunta = junta_keywords.filter(word => texts.includes(normalize_str(word))).length > 0
    const isForMusics = musics_keywords.filter(word => texts.includes(normalize_str(word))).length > 0

    const tipus = infere_tipus(event)
    const isActivitat = tipus === 'activitat'

    if (tecnicaAsDefault || isForTecnica) targets.push('tècnica')
    if (isActivitat || isForJunta) targets.push('junta')
    if (isForMusics) targets.push('músics')

    // Remove duplicates from targets
    const uniqueTargets = [...new Set(targets)];
    return uniqueTargets.join(',')
}

const parseDateTime = event => {
    const null_datetime = '0000-00-00 00:00:00+01:00';
    const start_dateTime = 'start' in event ?
        (
            'dateTime' in event.start ?
                event.start.dateTime :
                (
                    'date' in event.start ?
                        event.start.date + ' 00:00:00+01:00' :
                        null_datetime
                )
        )
            : null_datetime;

    const end_dateTime = 'end' in event ?
        (
            'dateTime' in event.end ?
                event.end.dateTime :
                (
                    'date' in event.end ?
                        event.end.date + ' 00:00:00+01:00' :
                        null_datetime
                )
        )
            : null_datetime;
            
    return {
        'start': start_dateTime,
        'end': end_dateTime
    }
};

const encode_string = (string) => string.
        replace(/\\/g, '\\\\').
        replace(/\u0008/g, '\\b').
        replace(/\t/g, '\\t').
        replace(/\n/g, '\\n').
        replace(/\f/g, '\\f').
        replace(/\r/g, '\\r').
        replace(/'/g, '\\\'').
        replace(/"/g, '\\"');

const query_update_events = (events) => {
    const EDIT_EVENTS = events.map(event => {
        const UPDATE = `UPDATE events SET title="${event.summary ? encode_string(event.summary) : ''}", description="${event.description ? encode_string(event.description) : ''}", lloc="${event.location ? encode_string(event.location) : ''}", \`data-esperada-inici\`="${parseDateTime(event).start}", \`data-esperada-fi\`="${parseDateTime(event).end}" WHERE \`gcalendar-link\`="${event.htmlLink}";`;
        const INSERT_IGNORE = `INSERT IGNORE INTO events (title, description, tipus, lloc, \`data-esperada-inici\`, \`data-esperada-fi\`, \`gcalendar-link\`, \`hash\`, \`targets\`) VALUES ("${event.summary ? encode_string(event.summary) : ''}", "${event.description ? encode_string(event.description) : ''}", "${infere_tipus(event)}", "${event.location ? encode_string(event.location) : ''}", "${parseDateTime(event).start}", "${parseDateTime(event).end}", "${event.htmlLink}", "${md5(event.htmlLink)}", "${infere_targets(event, false)}");`;
        return UPDATE + ' ' + INSERT_IGNORE;
    });

    return EDIT_EVENTS.join(' ');
};

const query_get_all_events = `SELECT * FROM events WHERE \`data-esperada-inici\` < '2099-12-29';`;

const getNextYearSeptember = (date) => {
    return moment(date)
        .add(1, 'year')
        .month(8)
        .date(1)
	.toDate()
}

const getNextYearDecember = (date) => {
    return moment(date)
        .add(1, 'year')
        .month(11)
        .date(31)
    .toDate()
}

const fetchEvents = (calendarId, timeMin, timeMax) => {
    return new Promise((resolve, reject) => {
        calendar.events.list({
            calendarId,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500,
            timeMin,
            timeMax,
        }, (error, result) => {
            if (error) {
                reject(error);
            } else {
                if (result.data.items) {
                    result.data.items = result.data.items.map(item => {
                        return {
                            ...item,
                            calendarId
                        };
                    });
                }
                resolve(result);
            }
        });
    });
}

const processError = (socket, error) => {
    if (error && error?.response?.data?.error?.code === 404) {
        socket.emit('.show_calendar_tutorial');
    } else {
        socket.emit('.unknown_calendar_error', error);
        console.error(error);
    }
}

const processData = data => {
    const decoded_events = data
        .map(ev => {
            const decoded_title = ev.title ? Buffer.from(ev.title, 'base64').toString('utf-8') : ''
            const decoded_description = ev.description ? Buffer.from(ev.description, 'base64').toString('utf-8') : ''

            return {
                ...ev,
                ['title']: decoded_title,
                ['description']: decoded_description,
            }
        })

    return {
        'calendar_ids': calendar_keys['ids'],
        'events': decoded_events
    };
}

module.exports.build = (app, io, fs, emit_query, execute_query) => {    
    const moment = require('moment');
    const cron = require('node-cron');
    
    const credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));
    const colla = credentials.colla;

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

    const fetchEventsFromDB = (htmlLinks) => {
        return new Promise((resolve, reject) => {
            execute_query(`SELECT * FROM events WHERE \`data-esperada-inici\` < '2099-12-29' AND \`gcalendar-link\` IN ("${htmlLinks.join('","')}")`, (result) => {
                resolve(result);
            });
        });
    };

    const fetchAllPublicEventsFromDB = () => {
        return new Promise((resolve, reject) => {
            execute_query("SELECT * FROM events WHERE `data-esperada-inici` < '2099-12-29' AND `targets`=''", (result) => {
                resolve(result);
            });
        });
    };

    const fetchPublicFutureEventsFromDB = () => {
        return new Promise((resolve, reject) => {
            execute_query("SELECT * FROM events WHERE `data-esperada-inici` > CURRENT_DATE() AND `data-esperada-inici` < '2099-12-29' AND `targets`=''", (result) => {
                resolve(result);
            });
        });
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

    const eventsAreEqual = (googleEvent, dbEvent) => {
        return googleEvent.summary === dbEvent.title &&
            (googleEvent.description || '') === dbEvent.description &&
            (googleEvent.location || '') === dbEvent.lloc &&
            applyTimeZone(parseDateTime(googleEvent).start.slice(0, -6).replace('T', ' ')).isSame(applyTimeZone(dbEvent['data-esperada-inici'])) &&
            applyTimeZone(parseDateTime(googleEvent).end.slice(0, -6).replace('T', ' ')).isSame(applyTimeZone(dbEvent['data-esperada-fi']))
    };

    const updatePublicCalendar = async (force_all=false) => {
        try {
            let calendarId;
            const calendarTitle = colla.toUpperCase() + ' (Aleta)';

            const calendarList = await calendar.calendarList.list();
            const publicCalendar = calendarList.data.items.find(item => item.summary === calendarTitle);
            if (publicCalendar) {
                calendarId = publicCalendar.id;

                // Fetch all public events from the database
                const publicEvents = !force_all ? await fetchPublicFutureEventsFromDB() : await fetchAllPublicEventsFromDB();
                if (publicEvents.length === 0) {
                    return { status: 404, body: { error: 'No public events found' } };
                }

                // Process each event for Google Calendar format
                const processedEvents = publicEvents.map(event => {
                    return {
                        'summary': Buffer.from(event.title, 'base64').toString('utf-8'),
                        'location': event.lloc,
                        'description': Buffer.from(event.description, 'base64').toString('utf-8'),
                        'start': {
                            'dateTime': applyTimeZone(event['data-esperada-inici']).format(),
                            'timeZone': 'Europe/Madrid',
                        },
                        'end': {
                            'dateTime': applyTimeZone(event['data-esperada-fi']).format(),
                            'timeZone': 'Europe/Madrid',
                        },
                    };
                });

                // Delete all existing events and insert all processedEvents
                const existingEvents = await calendar.events.list({
                    calendarId: calendarId,
                    ...(force_all ? {} : {timeMin: (new Date()).toISOString()}),
                    maxResults: 2500,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                // Delete all existing events
                for (const event of existingEvents.data.items) {
                    await calendar.events.delete({
                        auth: jwtClient,
                        calendarId: calendarId,
                        eventId: event.id,
                    });
                }

                // Insert all processedEvents
                for (const event of processedEvents) {
                    await calendar.events.insert({
                        auth: jwtClient,
                        calendarId: calendarId,
                        resource: event,
                    });
                }
            } else {
                const newCalendar = await calendar.calendars.insert({
                    auth: jwtClient,
                    resource: {
                        summary: calendarTitle,
                        timeZone: 'Europe/Madrid',
                        description: 'Calendari públic de ' + colla,
                    }
                });
                calendarId = newCalendar.data.id;

                // Fetch all public events from the database
                const publicEvents = await fetchAllPublicEventsFromDB();
                if (publicEvents.length === 0) {
                    return { status: 404, body: { error: 'No public events found' } };
                }

                // Process each event for Google Calendar format
                const processedEvents = publicEvents.map(event => {
                    return {
                        'summary': Buffer.from(event.title, 'base64').toString('utf-8'),
                        'location': event.lloc,
                        'description': Buffer.from(event.description, 'base64').toString('utf-8'),
                        'start': {
                            'dateTime': applyTimeZone(event['data-esperada-inici']).format(),
                            'timeZone': 'Europe/Madrid',
                        },
                        'end': {
                            'dateTime': applyTimeZone(event['data-esperada-fi']).format(),
                            'timeZone': 'Europe/Madrid',
                        },
                    };
                });

                // Insert all processedEvents
                for (const event of processedEvents) {
                    await calendar.events.insert({
                        auth: jwtClient,
                        calendarId: calendarId,
                        resource: event,
                    });
                }
            }

            // Add public rule to the calendar
            if (publicCalendar) {
                const acl = await calendar.acl.list({
                    calendarId: calendarId,
                });
                const publicRule = acl.data.items.find(rule => rule.scope.type === 'default');
                if (!publicRule || publicRule.role !== 'reader') {
                    await calendar.acl.insert({
                        calendarId: calendarId,
                        requestBody: {
                            role: 'reader',
                            scope: {
                                type: 'default',
                            },
                        },
                    });
                }
            } else {
                await calendar.acl.insert({
                    calendarId: calendarId,
                    requestBody: {
                        role: 'reader',
                        scope: {
                            type: 'default',
                        },
                    },
                });
            }

            const calendarURL = `https://calendar.google.com/calendar/u/0?cid=${calendarId}`;
            return { status: 200, body: { calendarURL } };
        } catch (error) {
            console.error('Error updating public calendar:', error);
            return { status: 500, body: { error } };
        }
    };

    app.get('/api/update_public_calendar', authenticateAPIKey, async (req, res) => {
        try {
            console.log('Updating all public calendar...');
            const result = await updatePublicCalendar(true);
            res.status(result.status).json(result.body);
            console.log('Public calendar updated');
        } catch (error) {
            res.status(500).json({ error });
            console.error(error);
        }
    });

    cron.schedule('0 0 * * *', async () => {
        try {
            const result = await updatePublicCalendar();
            const calendarURL = result.body.calendarURL;
            if (calendarURL) fs.writeFileSync('./public_calendar.url', calendarURL);
            else console.error('Error updating public calendar:', result.body.error);
        } catch (error) {
            console.error('Error updating public calendar:', error);
        }
    });

    app.get('/api/public_calendar', authenticateAPIKey, async (req, res) => {
        if (fs.existsSync('./public_calendar.url')) {
            const calendarURL = fs.readFileSync('./public_calendar.url', 'utf8');
            res.json({ calendarURL });
        } else {
            res.json({ error: 'No public calendar found' });
        }
    });

    app.get('/api/calendar_keys', authenticateAPIKey, async (req, res) => {
        res.json(calendar_keys);
    });

    app.post('/api/update_calendar_keys', authenticateAPIKey, async (req, res) => {
        const { calendar } = req.body;

        calendar_keys['ids'] = calendar.ids;
        calendar_keys['calendar_targets'] = calendar.calendar_targets;

        fs.writeFileSync('./calendar.keys.json', JSON.stringify(calendar_keys, null, 4));

        res.json(calendar_keys);
    })

    app.get('/api/calendar/readonly', authenticateAPIKey, async (req, res) => {
        execute_query(query_get_all_events, (allEventsInDB) => {
            res.json({
                calendar_events: processData(allEventsInDB),
                events_to_be_deleted: []
            })
        });
    });

    app.get('/api/calendar/readonly_local', authenticateAPIKey, async (req, res) => {
        const monthsBefore = req.query.monthsBefore || 1;
        const dateLimit = moment().subtract(monthsBefore, 'months').format('YYYY-MM-DD');
        const query_get_near_events = `SELECT * FROM events WHERE \`data-esperada-inici\` BETWEEN '${dateLimit}' AND '2099-12-29';`;

        execute_query(query_get_near_events, (allEventsInDB) => {
            res.json({
                calendar_events: processData(allEventsInDB),
                events_to_be_deleted: []
            })
        });
    });

    app.get('/api/calendar', authenticateAPIKey, async (req, res) => {
        try {
            // Fetch the calendar via the API
            const results = await Promise.all(calendar_keys['ids'].map(async id => {
                return await fetchEvents(
                    id,
                    moment('2022-09-01').toDate(),
                    getNextYearDecember(new Date())
                );
            }));

            const currentEvents = results.flatMap(result => processEvents(result));
            const dbEvents = await fetchEventsFromDB(currentEvents.map(event => event.htmlLink));

            // Find out which events have been updated
            const updatedEvents = currentEvents.filter(event => {
                // Find corresponding event in dbEvents
                const dbEvent = dbEvents.find(dbEvent => dbEvent['gcalendar-link'] === event.htmlLink);

                // If there's no corresponding event in the DB, it's a new event and should be updated
                if (!dbEvent) return true;

                // Otherwise, compare the events to see if they need to be updated
                return !eventsAreEqual(event, dbEvent)
            });

            // Execute queries to update the DB (without dependencies on castellers)
            if (updatedEvents.length > 0) execute_query(query_update_events(updatedEvents))

            execute_query(query_get_all_events, (allEventsInDB) => {
                res.json({
                    calendar_events: processData(allEventsInDB),
                    events_to_be_deleted: allEventsInDB.filter(dbEvent => !currentEvents.find(event => event.htmlLink === dbEvent['gcalendar-link']))
                })
            });

        } catch (error) {
            res.json({ error });
            console.error(error);
        }
    });

    app.get('/api/calendar_local', authenticateAPIKey, async (req, res) => {
        try {
            // Fetch the calendar via the API
            const results = await Promise.all(calendar_keys['ids'].map(async id => {
                return await fetchEvents(
                    id,
                    moment('2022-09-01').toDate(),
                    getNextYearDecember(new Date())
                );
            }));

            const currentEvents = results.flatMap(result => processEvents(result));
            const dbEvents = await fetchEventsFromDB(currentEvents.map(event => event.htmlLink));

            // Find out which events have been updated
            const updatedEvents = currentEvents.filter(event => {
                // Find corresponding event in dbEvents
                const dbEvent = dbEvents.find(dbEvent => dbEvent['gcalendar-link'] === event.htmlLink);

                // If there's no corresponding event in the DB, it's a new event and should be updated
                if (!dbEvent) return true;

                // Otherwise, compare the events to see if they need to be updated
                return !eventsAreEqual(event, dbEvent)
            });

            // Execute queries to update the DB (without dependencies on castellers)
            if (updatedEvents.length > 0) execute_query(query_update_events(updatedEvents))

            const monthsBefore = req.query.monthsBefore || 1;
            const dateLimit = moment().subtract(monthsBefore, 'months').format('YYYY-MM-DD');
            const query_get_near_events = `SELECT * FROM events WHERE \`data-esperada-inici\` BETWEEN '${dateLimit}' AND '2099-12-29';`;    

            execute_query(query_get_near_events, (allEventsInDB) => {
                res.json({
                    calendar_events: processData(allEventsInDB),
                    events_to_be_deleted: allEventsInDB.filter(dbEvent => !currentEvents.find(event => event.htmlLink === dbEvent['gcalendar-link']))
                })
            });

        } catch (error) {
            res.json({ error });
            console.error(error);
        }
    });

    io.on('connection', socket => {
        socket.on('.request_calendar', async () => {
            try {
                // Fetch the calendar via the API
                const results = await Promise.all(calendar_keys['ids'].map(async id => {
                    return await fetchEvents(
                        id,
                        moment('2022-09-01').toDate(),
                        getNextYearDecember(new Date())
                    );
                }));
    
                const currentEvents = results.flatMap(result => processEvents(result));
                const dbEvents = await fetchEventsFromDB(currentEvents.map(event => event.htmlLink));

                // Find out which events have been updated
                const updatedEvents = currentEvents.filter(event => {
                    // Find corresponding event in dbEvents
                    const dbEvent = dbEvents.find(dbEvent => dbEvent['gcalendar-link'] === event.htmlLink);

                    // If there's no corresponding event in the DB, it's a new event and should be updated
                    if (!dbEvent) return true;

                    // Otherwise, compare the events to see if they need to be updated
                    return !eventsAreEqual(event, dbEvent)
                });

                // Execute queries to update the DB (without dependencies on castellers)
                if (updatedEvents.length > 0) execute_query(query_update_events(updatedEvents))

                // // (With dependencies on castellers)
                // execute_query(`SELECT * FROM castellers`, (castellers) => {
                //     execute_query(query_update_events_with_castellers(currentEvents, castellers))
                // });

                execute_query(query_get_all_events, (allEventsInDB) => {
                    socket.emit('.calendar_events', processData(allEventsInDB))
                    socket.emit('.events_to_be_deleted', allEventsInDB.filter(dbEvent => !currentEvents.find(event => event.htmlLink === dbEvent['gcalendar-link'])))
                });


            } catch (error) {
                processError(socket, error);
            }
        });

        socket.on('.delete_event', id => {
            emit_query(socket, '.deleted_event', `DELETE FROM events WHERE \`id\`=${id}`);
        })

        socket.on('.create_model_event', () => {
            const summary = Buffer.from('PINYES MODELS', 'utf-8').toString('base64')
            const description = Buffer.from('Esdeveniment creat per a poder pintar les pinyes models', 'utf-8').toString('base64')
            const INSERT_IGNORE = `INSERT IGNORE INTO events (id, title, description, tipus, lloc, \`data-esperada-inici\`, \`data-esperada-fi\`, \`gcalendar-link\`, \`hash\`, \`targets\`) VALUES (999999, "${encode_string(summary)}", "${description ? encode_string(description) : ''}", "assaig", "", "2099-12-30 00:00:00+01:00", "2099-12-30 20:00:00+01:00", "", "pinyesmodels", "tècnica");`;

            emit_query(socket, '.created_model_event', INSERT_IGNORE);
        })

        const update_raresa = (event, user, data_inici, data_fi) => {
            return `
                INSERT INTO \`assistència\` (\`event-id\`, \`casteller-id\`, \`assistència\`, \`data-entrada\`, \`data-sortida\`) 
                VALUES (${parseInt(event)}, ${parseInt(user)}, 1, ${data_inici ? `'${data_inici}'` : `NULL`}, ${data_fi ? `'${data_fi}'` : `NULL`});
            `;
        };        
        socket.on('.add_raresa', (event, user, data_inici, data_fi) => emit_query(socket, '.raresa_afegida', update_raresa(event, user, data_inici, data_fi), data => [event, user]));
        
        const change_tipus = (hash, new_tipus) => `UPDATE events SET tipus='${new_tipus}' WHERE \`hash\`='${hash}'`;
        socket.on('.change_event_tipus', (hash, new_tipus) => emit_query(io, '.tipus_changed', change_tipus(hash, new_tipus)));

        const change_targets = (hash, new_targets) => `UPDATE events SET targets='${new_targets}' WHERE \`hash\`='${hash}'`;
        socket.on('.change_event_targets', (hash, new_targets) => emit_query(io, '.targets_changed', change_targets(hash, new_targets)));

        const get_future_events_of = hash => `SELECT * FROM events WHERE \`data-esperada-inici\` < '2099-12-29' AND \`data-esperada-inici\` > (SELECT \`data-esperada-inici\` FROM events WHERE \`hash\`='${hash}')`;
        socket.on('.add_target_to_all_future_events', (hash, newTarget) => execute_query(get_future_events_of(hash), futureEvents => {
            let counter = 0;

            futureEvents.forEach(event => {
                const targets = event?.targets?.split(',')?.map(target => target.trim()) || []
                if (!targets.includes(newTarget)) targets.push(newTarget);
                
                const targetsString = targets
                    .map(t => t.trim())
                    .filter(t => t !== '')
                    .join(',')

                execute_query(change_targets(event.hash, targetsString), () => {
                    counter++;
                    if (counter === futureEvents.length) socket.emit('.targets_added_to_all_future_events', newTarget);
                })
            });
        }));

        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });
};

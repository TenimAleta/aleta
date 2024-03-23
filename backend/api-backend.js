const md5 = require("md5");

const rebuildPosicions = (props) => {
    const { posicions, setPosicions, posicionsLog } = props;

    let _posicions = {};
    _posicions.castellers = {};
    _posicions.caixes = {};
    _posicions.fustes = [];

    // Brute force approach (no optimization)
    posicionsLog.forEach(pos => {
        if (pos.split(',').length < 2) return;

        // Fustes
        if (pos.split(',')[0] === 'FUSTES') {
            // FUSTES,ARRAY,LENGTH,FUSTA1,FUSTA2,...,REST
            const fustesLength = parseInt(pos.split(',')[2])

            _posicions.fustes = pos
                .split(',')
                .slice(3, 3 + fustesLength)
                .map(fusta => parseInt(fusta))

            return;
        }

        const targetToApply = pos.split(',')[0];
        const actionToBeDone = pos.split(',')[1];

        const caixaPos = targetToApply;
        const castellerPos = parseInt(actionToBeDone);

        // Case for erasing a position
        if (actionToBeDone === '_EMPTY_' && caixaPos in _posicions.caixes) {
            delete _posicions.castellers[_posicions.caixes[caixaPos]];  // make casteller available again
            delete _posicions.caixes[caixaPos];                         // make caixa available again
        } else if (actionToBeDone !== '_EMPTY_') {
            // If casteller is already in a caixa, empty previous caixa
            if (castellerPos in _posicions.castellers) delete _posicions.caixes[_posicions.castellers[castellerPos]];

            // If caixa has already a casteller, make that casteller available
            if (caixaPos in _posicions.caixes) delete _posicions.castellers[_posicions.caixes[caixaPos]];

            _posicions.castellers[castellerPos] = caixaPos;
            if (Number.isInteger(castellerPos)) _posicions.caixes[caixaPos] = castellerPos;
        }
    });

    return _posicions;
};

const getSortedPilars = ({ json }) => {
    const possiblePilars = [...new Set(
        Object.values(json)
            .filter(caixa => caixa.pilar || caixa.pilar === 0)
            .filter(caixa => !isNaN(caixa.pilar))
            .map(caixa => caixa.pilar)
        || []
    )]
        .sort((a,b) => a > b ? 1 : -1)

    return possiblePilars;
}

const getPilarsAsMatrix = ({ json }) => {
    const possiblePilars = [...new Set(
        Object.values(json)
            .filter(caixa => caixa.pilar || caixa.pilar === 0)
            .filter(caixa => !isNaN(caixa.pilar))
            .map(caixa => caixa.pilar)
        || []
    )]
        .sort((a,b) => a > b ? 1 : -1)

    // Fetch values
    const orderedTabs = ['pinya', 'folre', 'manilles', 'puntals', 'tronc', 'organització'].reverse()

    const pilarsCaixes = possiblePilars
        .map(pilar => Object.keys(json)
            .filter(id => json[id].pilar === pilar)
        )
        .map(pilar =>
            pilar
                .filter(id => json[id]?.box?.transform)
                .filter(id => json[id].box.transform.length >= 1)
                .sort((a,b) => {
                    const a_pestanya = json[a].pestanya?.toLowerCase()
                    const b_pestanya = json[b].pestanya?.toLowerCase()

                    if (a_pestanya !== b_pestanya) {
                        if (orderedTabs.includes(a_pestanya) && orderedTabs.includes(b_pestanya)) {
                            return orderedTabs.indexOf(a_pestanya) < orderedTabs.indexOf(b_pestanya) ? 1 : -1;
                        } else if (orderedTabs.includes(a_pestanya)) {
                            return 1;
                        } else if (orderedTabs.includes(b_pestanya)) {  
                            return -1;
                        }
                    }

                    const a_y = json[a].box.transform.at(-1);
                    const b_y = json[b].box.transform.at(-1);

                    return a_y < b_y ? 1 : -1;
                })   
        )
        .map(pilar => pilar.map(id => ({
            id: id,
            ...json[id]
        })))

    return pilarsCaixes;
}

module.exports.build = (app, io, fs, emit_query, execute_query) => {
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

    app.post('/api/set_version', authenticateAPIKey, (req, res) => {
        const user = req.body.user;
        const version = req.body.version;

        const set_version_query = `
            UPDATE castellers SET version = '${version}' WHERE id = ${user};
        `;

        execute_query(set_version_query, sql_res => {
            res.json({message: 'Version updated successfully for user ' + user});
        });
    });

    app.post('/api/resetExpoPushToken', authenticateAPIKey, (req, res) => {
        const userId = req.body.userId;
        if (!userId) return res.status(400).send('User ID missing');

        const reset_expo_push_token = `
            UPDATE castellers SET expo_push_token = NULL WHERE id = ${userId};
        `;
    
        execute_query(reset_expo_push_token, sql_res => {
            res.json({message: 'Expo push token reset successfully for user ' + userId});
        });
    });

    app.get('/api/castellersInfo', authenticateAPIKey, (req, res) => {
        const getCastellersInfoQuery = `
            SELECT id, mote, nom, \`primer-cognom\`, \`segon-cognom\`, altura, altura_mans, 
                   hidden, canalla, novell, extern, music, lesionat, 
                   es_tecnica, es_junta, (expo_push_token IS NOT NULL) AS has_notifications 
            FROM castellers;
        `;
    
        execute_query(getCastellersInfoQuery, sqlRes => {
            const resultObj = sqlRes.reduce((obj, casteller) => {
                obj[casteller.id] = {
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
                };
                return obj;
            }, {});
    
            res.json(resultObj);
        });    
    });   
    
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
                SELECT a1.\`casteller-id\`, a1.\`assistència\`, a1.\`data-entrada\`, a1.\`data-sortida\`
                FROM \`assistència\` a1
                JOIN (
                    SELECT \`casteller-id\`, MAX(\`id\`) AS max_id
                    FROM \`assistència\`
                    WHERE \`event-id\` = ${eventId}
                    GROUP BY \`casteller-id\`
                ) AS a2 ON a1.\`casteller-id\` = a2.\`casteller-id\` AND a1.\`id\` = a2.max_id
            ) AS a ON c.id = a.\`casteller-id\`;
        `;
    };

    app.get('/api/assistencies_event/:id', authenticateAPIKey, (req, res) => {
        const eventId = parseInt(req.params.id)
        const query = get_assistencia_event(eventId);

        execute_query(query, data => {
            const responseData = {
                event: eventId,
                data: data
                    .filter(row => parseInt(row.hidden) !== 1 || [1,2].includes(parseInt(row["assistència"])))
                    .map(row => {
                        if (parseInt(row["assistència"]) === 2) return { 'assistencia': 'Fitxat', 'event': eventId, 'user': parseInt(row["id"]), ...row };
                        else if (parseInt(row["assistència"]) === 1) return { 'assistencia': 'Vinc', 'event': eventId, 'user': parseInt(row["id"]), ...row };
                        else if (parseInt(row["assistència"]) === 0) return { 'assistencia': 'No vinc', 'event': eventId, 'user': parseInt(row["id"]), ...row };
                        else return { 'assistencia': 'No confirmat', 'event': eventId, 'user': parseInt(row["id"]), ...row };
                    })
            };
    
            res.json(responseData);
        });
    });

    app.get('/api/all_assistencies_event/:id', authenticateAPIKey, (req, res) => {
        const eventId = parseInt(req.params.id)
        const query = get_assistencia_event(eventId);

        execute_query(query, data => {
            const responseData = {
                event: eventId,
                data: data
                    // Without filter
                    .map(row => {
                        if (parseInt(row["assistència"]) === 2) return { 'assistencia': 'Fitxat', 'event': eventId, 'user': parseInt(row["id"]), ...row };
                        else if (parseInt(row["assistència"]) === 1) return { 'assistencia': 'Vinc', 'event': eventId, 'user': parseInt(row["id"]), ...row };
                        else if (parseInt(row["assistència"]) === 0) return { 'assistencia': 'No vinc', 'event': eventId, 'user': parseInt(row["id"]), ...row };
                        else return { 'assistencia': 'No confirmat', 'event': eventId, 'user': parseInt(row["id"]), ...row };
                    })
            };
    
            res.json(responseData);
        });
    });

    app.get('/api/castellers', authenticateAPIKey, (req, res) => {
        const get_castellers = "SELECT * FROM castellers";
        execute_query(get_castellers, result => {
            res.json(result)
        });
    });

    app.get('/api/export_castellers_as_excel', (req, res) => {
        const get_castellers = "SELECT * FROM castellers";
        execute_query(get_castellers, result => {
            const fields = ['mote', 'nom', 'primer-cognom', 'segon-cognom', 'altura', 'altura_mans', 'hidden', 'canalla', 'novell', 'music', 'lesionat', 'es_tecnica', 'es_junta'];
            
            // Create a new workbook
            const Excel = require('exceljs');
            let workbook = new Excel.Workbook();
            let worksheet = workbook.addWorksheet('Castellers');
    
            // Add column headers
            worksheet.columns = fields.map(field => ({ header: field, key: field }));
    
            // Add rows
            result.forEach(casteller => {
                worksheet.addRow(casteller);
            });
    
            // Set up response
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=castellers.xlsx');
    
            // Write workbook to the response
            workbook.xlsx.write(res).then(() => {
                res.end();
            });
        });
    }); 

    app.get('/api/events', authenticateAPIKey, (req, res) => {
        const get_events = "SELECT * FROM events";
        execute_query(get_events, result => {
            res.json(result)
        });
    });

    app.get('/api/events/:id', authenticateAPIKey, (req, res) => {
        const get_event = `SELECT * FROM events WHERE id = ${parseInt(req.params.id)}`;
        execute_query(get_event, result => {
            if (result.length === 0) {
                res.status(404).send('Event not found');
            } else {
                res.json(result[0])
            }
        });
    });

    app.get('/api/events/:id/assistencia', authenticateAPIKey, (req, res) => {
        const eventId = parseInt(req.params.id);
        const get_assistencia = `
            SELECT a.*
            FROM \`assistència\` a
            INNER JOIN (
                SELECT \`casteller-id\`, MAX(\`updatedAt\`) as latest_update
                FROM \`assistència\`
                WHERE \`event-id\` = ${eventId}
                GROUP BY \`casteller-id\`
            ) b ON a.\`casteller-id\` = b.\`casteller-id\` AND a.\`updatedAt\` = b.latest_update
            WHERE a.\`event-id\` = ${eventId};
        `;

        execute_query(get_assistencia, result => {
            if (result.length === 0) {
                res.status(404).send('Event not found');
            } else {
                res.json(result)
            }
        });
    });

    app.get('/api/events/:eventId/proves', authenticateAPIKey, (req, res) => {
        const publicProvesDir = `${__dirname}/events/${req.params.eventId}/posicions/`;
        const hiddenProvesDir = `${__dirname}/events/${req.params.eventId}/posicions/hidden/`;
        const adminProvesDir = `${__dirname}/events/${req.params.eventId}/posicions/admin/`;

        try {
            // PUBLIC
            const publicProves = fs.readdirSync(publicProvesDir)
                .filter(file => file.endsWith('.canvis'))
                .map(file => file.replace('.canvis', ''))

            // HIDDEN
            const hiddenProves = fs.readdirSync(hiddenProvesDir)
                .filter(file => file.endsWith('.canvis'))
                .map(file => `hidden/${file}`)
                .map(file => file.replace('.canvis', ''))

            // ADMIN
            const adminProves = fs.readdirSync(adminProvesDir)
                .filter(file => file.endsWith('.canvis'))
                .map(file => `admin/${file}`)
                .map(file => file.replace('.canvis', ''))

            const allProves = [
                ...publicProves,
                ...hiddenProves,
                ...adminProves
            ]

            // Get order
            const event_path = `${__dirname}/events/${req.params.eventId}`;
            const order_file = `${event_path}/proves.order.canvis`;

            if (fs.existsSync(order_file)) {
                const data = fs.readFileSync(order_file).toString();
                const lastLine = data.split('\n').filter(line => line !== '').at(-1) || '[]'
                const mostRecentOrder = JSON.parse(lastLine);

                const orderedProves = allProves.sort((a, b) => {
                    const clean = str => str.replace('hidden/', '').replace('admin/', '')
                    const a_index = mostRecentOrder.indexOf(clean(a) + '.canvis');
                    const b_index = mostRecentOrder.indexOf(clean(b) + '.canvis');

                    if (a_index === -1 && b_index === -1) {
                        return 0;
                    } else {
                        return a_index > b_index ? 1 : -1;
                    }
                });

                res.json(orderedProves);
            } else {
                res.json(allProves);
            }
        } catch (err) {
            res.status(404).send('Event not found');
        }
    });

    /*
        Input: bundleId.versionId (or) hidden/bundleId.versionId (or) admin/bundleId.versionId
        Output: Log contents
    */
    app.get('/api/events/:eventId/posicionslog/:provaId', authenticateAPIKey, (req, res) => {
        const publicDir = `${__dirname}/events/${req.params.eventId}/posicions/`;
        const hiddenDir = `${__dirname}/events/${req.params.eventId}/posicions/hidden/`;
        const adminDir = `${__dirname}/events/${req.params.eventId}/posicions/admin/`;

        if (fs.existsSync(`${publicDir}/${req.params.provaId}.canvis`)) {
            const fileContents = fs.readFileSync(`${publicDir}/${req.params.provaId}.canvis`, 'utf8');
            res.send(fileContents);
        } else if (fs.existsSync(`${hiddenDir}/${req.params.provaId}.canvis`)) {
            const fileContents = fs.readFileSync(`${hiddenDir}/${req.params.provaId}.canvis`, 'utf8');
            res.send(fileContents);
        } else if (fs.existsSync(`${adminDir}/${req.params.provaId}.canvis`)) {
            const fileContents = fs.readFileSync(`${adminDir}/${req.params.provaId}.canvis`, 'utf8');
            res.send(fileContents);
        } else {
            res.status(404).send('Prova not found');
        }
    });
    
    /*
        Input: bundleId.versionId (or) hidden/bundleId.versionId (or) admin/bundleId.versionId
        Output: File contents
    */
    app.get('/api/events/:eventId/posicions/:provaId', authenticateAPIKey, (req, res) => {
        const publicDir = `${__dirname}/events/${req.params.eventId}/posicions/`;
        const hiddenDir = `${__dirname}/events/${req.params.eventId}/posicions/hidden/`;
        const adminDir = `${__dirname}/events/${req.params.eventId}/posicions/admin/`;

        if (fs.existsSync(`${publicDir}/${req.params.provaId}.canvis`)) {
            const fileContents = fs.readFileSync(`${publicDir}/${req.params.provaId}.canvis`, 'utf8');
            const splittedFileContents = fileContents.split('\n');

            const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });
            res.json(posicions);
        } else if (fs.existsSync(`${hiddenDir}/${req.params.provaId}.canvis`)) {
            const fileContents = fs.readFileSync(`${hiddenDir}/${req.params.provaId}.canvis`, 'utf8');
            const splittedFileContents = fileContents.split('\n');

            const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });
            res.json(posicions);
        } else if (fs.existsSync(`${adminDir}/${req.params.provaId}.canvis`)) {
            const fileContents = fs.readFileSync(`${adminDir}/${req.params.provaId}.canvis`, 'utf8');
            const splittedFileContents = fileContents.split('\n');

            const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });
            res.json(posicions);
        } else {
            res.status(404).send('Prova not found');
        }
    });        

    app.get('/api/bundle/:provaId', authenticateAPIKey, (req, res) => {
        const bundleDir = `${__dirname}/data/bundles/`;

        const bundleIdFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[0]

        fs.readFile(`${bundleDir}/${bundleIdFromProva}.json`, (err, data) => {
            if (err) {
                res.status(404).send('Bundle not found');
            } else {
                res.json(JSON.parse(data));
            }
        });
    });

    app.get('/api/quitecontrasenya', authenticateAPIKey, (req, res) => {
        const query = 'select nom, `primer-cognom`, mote from castellers where expo_push_token IS NOT NULL;'
        execute_query(query, result => {
            res.json(result)
        });
    });

    app.get('/api/tronc/:provaId', authenticateAPIKey, (req, res) => {
        const bundleDir = `${__dirname}/data/bundles/`;
        const plantillesDir = `${__dirname}/data/plantilles/`;

        const bundleIdFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[0]

        try {
            const bundleFile = fs.readFileSync(`${bundleDir}/${bundleIdFromProva}.json`);
            const bundleJSON = JSON.parse(bundleFile);

            let troncJSON = {}

            // Get tapats
            Object.keys(bundleJSON.parts).forEach(part => {
                const partFilename = bundleJSON.parts[part]
                const partFile = fs.readFileSync(`${plantillesDir}/${partFilename}.json`);
                const partJSON = JSON.parse(partFile);

                // Add pestanya
                const withPestanya = Object.fromEntries(
                    Object.entries(partJSON)
                        .map(([id, caixa]) => [id, {
                            ...caixa,
                            pestanya: part
                        }])
                )

                if (part === 'Tronc') {
                    troncJSON = {
                        ...troncJSON,
                        ...withPestanya
                    }
                } else {
                    const tapats = Object.fromEntries(
                        Object.entries(withPestanya)
                            .filter(([id, caixa]) => caixa?.pilar || caixa?.pilar === 0)
                    )

                    troncJSON = {
                        ...troncJSON,
                        ...tapats
                    }
                }
            })

            const pilarsMatrix = getPilarsAsMatrix({ json: troncJSON })

            res.json(pilarsMatrix)
        } catch (err) {
            console.log(err)
            res.status(404).send('Bundle not found');
        }
    });

    app.get('/api/events/:eventId/rengles/:provaId', authenticateAPIKey, (req, res) => {
        const bundleDir = `${__dirname}/data/bundles/`;
        const plantillesDir = `${__dirname}/data/plantilles/`;

        const bundleIdFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[0]

        const versioFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[1]

        try {
            const bundleFile = fs.readFileSync(`${bundleDir}/${bundleIdFromProva}.json`);
            const bundleJSON = JSON.parse(bundleFile);

            let troncJSON = {}

            // Get tapats
            Object.keys(bundleJSON.parts).forEach(part => {
                const partFilename = bundleJSON.parts[part]
                const partFile = fs.readFileSync(`${plantillesDir}/${partFilename}.json`);
                const partJSON = JSON.parse(partFile);

                // Add pestanya
                const withPestanya = Object.fromEntries(
                    Object.entries(partJSON)
                        .map(([id, caixa]) => [id, {
                            ...caixa,
                            pestanya: part
                        }])
                )

                if (part === 'Tronc') {
                    troncJSON = {
                        ...troncJSON,
                        ...withPestanya
                    }
                } else {
                    const tapats = Object.fromEntries(
                        Object.entries(withPestanya)
                            .filter(([id, caixa]) => caixa?.pilar || caixa?.pilar === 0)
                    )

                    troncJSON = {
                        ...troncJSON,
                        ...tapats
                    }
                }
            })

            const pilarsIds = getPilarsAsMatrix({ json: troncJSON })
                .map(pilar => pilar.map(caixa => caixa?.id))

            // Get assistències
            const publicDir = `${__dirname}/events/${req.params.eventId}/posicions/`;
            const hiddenDir = `${__dirname}/events/${req.params.eventId}/posicions/hidden/`;
            const adminDir = `${__dirname}/events/${req.params.eventId}/posicions/admin/`;

            if (fs.existsSync(`${publicDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${publicDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });
                
                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))

                res.json(pilarsMatrix)
            } else if (fs.existsSync(`${hiddenDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${hiddenDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });

                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))

                res.json(pilarsMatrix)
            } else if (fs.existsSync(`${adminDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${adminDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });

                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))

                res.json(pilarsMatrix)
            } else {
                res.status(404).send('Posicions not found');
            }
        } catch (err) {
            res.status(404).send('Bundle not found');
            console.log(err)
        }
    });

    app.get('/api/events/:eventId/renglesambfustes/:provaId', authenticateAPIKey, (req, res) => {
        const bundleDir = `${__dirname}/data/bundles/`;
        const plantillesDir = `${__dirname}/data/plantilles/`;

        const bundleIdFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[0]

        const versioFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[1]

        try {
            const bundleFile = fs.readFileSync(`${bundleDir}/${bundleIdFromProva}.json`);
            const bundleJSON = JSON.parse(bundleFile);

            let troncJSON = {}

            // Get tapats
            Object.keys(bundleJSON.parts).forEach(part => {
                const partFilename = bundleJSON.parts[part]
                const partFile = fs.readFileSync(`${plantillesDir}/${partFilename}.json`);
                const partJSON = JSON.parse(partFile);

                // Add pestanya
                const withPestanya = Object.fromEntries(
                    Object.entries(partJSON)
                        .map(([id, caixa]) => [id, {
                            ...caixa,
                            pestanya: part
                        }])
                )

                if (part === 'Tronc') {
                    troncJSON = {
                        ...troncJSON,
                        ...withPestanya
                    }
                } else {
                    const tapats = Object.fromEntries(
                        Object.entries(withPestanya)
                            .filter(([id, caixa]) => caixa?.pilar || caixa?.pilar === 0)
                    )

                    troncJSON = {
                        ...troncJSON,
                        ...tapats
                    }
                }
            })

            const pilarsIds = getPilarsAsMatrix({ json: troncJSON })
                .map(pilar => pilar.map(caixa => caixa?.id))

            const sortedPilars = getSortedPilars({ json: troncJSON })

            // Get assistències
            const publicDir = `${__dirname}/events/${req.params.eventId}/posicions/`;
            const hiddenDir = `${__dirname}/events/${req.params.eventId}/posicions/hidden/`;
            const adminDir = `${__dirname}/events/${req.params.eventId}/posicions/admin/`;

            if (fs.existsSync(`${publicDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${publicDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });
                
                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else if (fs.existsSync(`${hiddenDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${hiddenDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });

                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else if (fs.existsSync(`${adminDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${adminDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });

                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else {
                res.status(404).send('Posicions not found');
            }
        } catch (err) {
            res.status(404).send('Bundle not found');
            console.log(err)
        }
    });

    app.post('/api/send_feedback', authenticateAPIKey, (req, res) => {
        const {
            anonymous,
            feedback,
            colla,
            juntaRole,
            tecnicaRole,
            deviceInfo,
            appVersion,
            userInfo,
        } = req.body;

        const feedbackDir = `${__dirname}/data/feedbacks/`;
        const feedbackFilename = `${feedbackDir}/${Date.now()}.json`;

        const feedbackObj = {
            anonymous,
            feedback,
            colla,
            juntaRole,
            tecnicaRole,
            deviceInfo,
            appVersion,
            userInfo,
            date: Date.now(),
        };

        fs.writeFile(feedbackFilename, JSON.stringify(feedbackObj), (err) => {
            if (err) {
                res.status(500).send('Error saving feedback');
            } else {
                res.json({message: 'Feedback saved successfully'});
            }
        });
    });

    app.get('/api/events/:eventId/renglesambfustesicolumnes/:provaId', authenticateAPIKey, (req, res) => {
        const bundleDir = `${__dirname}/data/bundles`;
        const plantillesDir = `${__dirname}/data/plantilles/`;

        const bundleIdFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[0]

        const versioFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[1]

        try {
            const bundleFile = fs.readFileSync(`${bundleDir}/${bundleIdFromProva}.json`);
            const bundleJSON = JSON.parse(bundleFile);

            let troncJSON = {}

            // Get tapats
            Object.keys(bundleJSON.parts).forEach(part => {
                const partFilename = bundleJSON.parts[part]
                const partFile = fs.readFileSync(`${plantillesDir}/${partFilename}.json`);
                const partJSON = JSON.parse(partFile);

                // Add pestanya
                const withPestanya = Object.fromEntries(
                    Object.entries(partJSON)
                        .map(([id, caixa]) => [id, {
                            ...caixa,
                            pestanya: part
                        }])
                )

                if (part === 'Tronc') {
                    troncJSON = {
                        ...troncJSON,
                        ...withPestanya
                    }
                } else {
                    const tapats = Object.fromEntries(
                        Object.entries(withPestanya)
                            .filter(([id, caixa]) => caixa?.pilar || caixa?.pilar === 0)
                    )

                    troncJSON = {
                        ...troncJSON,
                        ...tapats
                    }
                }
            })

            const pilarsIds = getPilarsAsMatrix({ json: troncJSON })
                .map(pilar => pilar.map(caixa => caixa?.id))

            const sortedPilars = getSortedPilars({ json: troncJSON })

            // Get noms de pilars
            const nomsPilars = {}

            if (fs.existsSync(`${bundleDir}/addons/${bundleIdFromProva}.json`)) {
                const addonsFile = fs.readFileSync(`${bundleDir}/addons/${bundleIdFromProva}.json`);
                const addonsJSON = JSON.parse(addonsFile);

                if (addonsJSON?.noms_columnes) {
                    Object.keys(addonsJSON.noms_columnes).forEach(pilar => {
                        nomsPilars[pilar] = addonsJSON.noms_columnes[pilar]
                    })
                }
            }

            // Get assistències
            const publicDir = `${__dirname}/events/${req.params.eventId}/posicions/`;
            const hiddenDir = `${__dirname}/events/${req.params.eventId}/posicions/hidden/`;
            const adminDir = `${__dirname}/events/${req.params.eventId}/posicions/admin/`;

            if (fs.existsSync(`${publicDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${publicDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });
                
                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['nom', nomsPilars?.[sortedPilars[index]] || `Columna ${sortedPilars[index]}`]]).concat([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else if (fs.existsSync(`${hiddenDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${hiddenDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });

                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['nom', nomsPilars?.[sortedPilars[index]] || `Columna ${sortedPilars[index]}`]]).concat([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else if (fs.existsSync(`${adminDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${adminDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });

                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['nom', nomsPilars?.[sortedPilars[index]] || `Columna ${sortedPilars[index]}`]]).concat([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else {
                res.status(404).send('Posicions not found');
            }
        } catch (err) {
            res.status(404).send('Bundle not found');
            console.log(err)
        }
    });

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
            .map(([key, val]) => val.box.transform[4] + val.box.width)
            .reduce((acc, val) => Math.max(acc, val), 0)
    
        // Most left caixa on current
        const minCaixaOnCurrent = Object.entries(currentWithFixedPilars)
            .map(([key, val]) => val.box.transform[4])
            .reduce((acc, val) => Math.min(acc, val), Infinity)
    
        // Fix caixa positions
        const currentWithFixedCaixes = Object.fromEntries(
            Object.entries(currentWithFixedPilars)
                .map(([key, val]) => {
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

    const extractTronc = (bundle) => {
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
                        // Filter out all caixes without pilar
                        .map(part => Object.fromEntries(
                            Object.entries(part)
                                .filter(([id, caixa]) => caixa?.pilar || caixa?.pilar === 0)
                        ))
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

                return mergedBundles
        } else {
            const parts = Object.values(bundle?.parts || {})
            const partnames = Object.keys(bundle?.parts || {})
        
            const mergedParts = parts
                .map(part => `${__dirname}/data/plantilles/${part}.json`)
                .filter(path => fs.existsSync(path))
                .map(filename => fs.readFileSync(filename))
                .map(data => JSON.parse(data))
                .map((part, i) => addPartNameToEveryElement(part, partnames[i]))
                // Filter out all caixes without pilar
                .map(part => Object.fromEntries(
                    Object.entries(part)
                        .filter(([id, caixa]) => caixa?.pilar || caixa?.pilar === 0)
                ))
                .reduce((accumulator, current) => {
                    return Object.assign(accumulator, current);
                }, {})
        
            return mergedParts
        }
    }

    const getAddonsFromId = (fs, bundleId) => {
        const addonsFilename = `${__dirname}/data/bundles/addons/${bundleId}.json`
        const addonsFile = fs.existsSync(addonsFilename) ? fs.readFileSync(addonsFilename) : null
        if (!addonsFile) return false
    
        return JSON.parse(addonsFile)
    }

    app.get('/api/events/:eventId/renglesambfustesicolumnesambsim/:provaId', authenticateAPIKey, (req, res) => {
        const bundleDir = `${__dirname}/data/bundles`;
        const plantillesDir = `${__dirname}/data/plantilles/`;

        const bundleIdFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[0]

        const versioFromProva = req.params.provaId
            .replace('hidden/', '')
            .replace('admin/', '')
            .split('.')[1]

        try {
            const bundleFile = fs.readFileSync(`${bundleDir}/${bundleIdFromProva}.json`);
            const bundle = JSON.parse(bundleFile);

            const troncJSON = extractTronc(bundle)

            const pilarsIds = getPilarsAsMatrix({ json: troncJSON })
                .map(pilar => pilar.map(caixa => caixa?.id))

            const sortedPilars = getSortedPilars({ json: troncJSON })

            // Get noms de pilars
            const nomsPilars = {}

            if (fs.existsSync(`${bundleDir}/addons/${bundleIdFromProva}.json`)) {
                const addonsFile = fs.readFileSync(`${bundleDir}/addons/${bundleIdFromProva}.json`);
                const addonsJSON = JSON.parse(addonsFile);

                if (bundle.simultani) {
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

                    // Set noms columnes merged
                    sortedPilars.forEach((pilar, index) => {
                        nomsPilars[pilar] = mergedNomsColumnes[index] || ''
                    })
                } else if (addonsJSON?.noms_columnes) {
                    Object.keys(addonsJSON.noms_columnes).forEach(pilar => {
                        nomsPilars[pilar] = addonsJSON.noms_columnes[pilar]
                    })
                }
            }

            // Get assistències
            const publicDir = `${__dirname}/events/${req.params.eventId}/posicions/`;
            const hiddenDir = `${__dirname}/events/${req.params.eventId}/posicions/hidden/`;
            const adminDir = `${__dirname}/events/${req.params.eventId}/posicions/admin/`;

            if (fs.existsSync(`${publicDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${publicDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });
                
                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['nom', nomsPilars?.[sortedPilars[index]] || `Columna ${sortedPilars[index]}`]]).concat([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else if (fs.existsSync(`${hiddenDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${hiddenDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });

                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['nom', nomsPilars?.[sortedPilars[index]] || `Columna ${sortedPilars[index]}`]]).concat([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else if (fs.existsSync(`${adminDir}/${req.params.provaId}.canvis`)) {
                const fileContents = fs.readFileSync(`${adminDir}/${req.params.provaId}.canvis`, 'utf8');
                const splittedFileContents = fileContents.split('\n');
                const posicions = rebuildPosicions({ posicionsLog: splittedFileContents });

                const pilarsMatrix = pilarsIds
                    .map(pilar => pilar.map(caixaId => [caixaId, posicions.caixes[caixaId]]))
                    .map((pilar, index) => ([['nom', nomsPilars?.[sortedPilars[index]] || `Columna ${sortedPilars[index]}`]]).concat([['fusta', posicions.fustes?.[sortedPilars[index]] || 0]]).concat(pilar))

                res.json(pilarsMatrix)
            } else {
                res.status(404).send('Posicions not found');
            }
        } catch (err) {
            res.status(404).send('Bundle not found');
            console.log(err)
        }
    });

    // app.put('/api/events/:eventId/posicionslog/:provaId', authenticateAPIKey, (req, res) => {
    //     const baseDir = `${__dirname}/events/${req.params.eventId}/posicions/`;
    //     const directories = [baseDir, `${baseDir}hidden/`, `${baseDir}admin/`];
    
    //     const addPosition = (fileContents, caixa, casteller, action) => {
    //         const newPosition = (
    //             action === 'add' ? `${caixa},${casteller}` :
    //             action === 'remove' ? `${caixa},_EMPTY_` :
    //             ''
    //         );
    //         const newFileContents = `${fileContents}\n${newPosition}`;
    //         return { newPosition, newFileContents };
    //     };
    
    //     const sendMessage = (action, caixa, casteller, provaId) => {
    //         if (action === 'add') return `Successfully put casteller ${casteller} to caixa ${caixa} in prova ${provaId}`;
    //         if (action === 'remove') return `Successfully removed casteller from caixa ${caixa} in prova ${provaId}`;
    //         return '';
    //     };
    
    //     for (const dir of directories) {
    //         const filePath = `${dir}${req.params.provaId}.canvis`;
    //         if (fs.existsSync(filePath)) {
    //             const fileContents = fs.readFileSync(filePath, 'utf8');
    
    //             const { newPosition, newFileContents } = addPosition(
    //                 fileContents,
    //                 req.body.caixa,
    //                 req.body.casteller,
    //                 req.body.action
    //             );
    
    //             fs.writeFileSync(filePath, newFileContents);
    
    //             res.send(sendMessage(req.body.action, req.body.caixa, req.body.casteller, req.params.provaId));
    
    //             const room = `${req.params.eventId}.${req.params.provaId}`;
    //             io.to(room).emit('.new_change', newPosition);
    //             return;  // exit the loop after processing
    //         }
    //     }
    
    //     res.status(404).send('Prova not found');
    // });

    app.get('/api/notification_groups', authenticateAPIKey, (req, res) => {
        const notificationGroupsDir = `${__dirname}/notifications/notification_groups/`;
        const notificationGroups = fs.readdirSync(notificationGroupsDir)
            .filter(filename => filename.endsWith('.json'))
            .map(filename => filename.replace('.json', ''))
            .map(filename => JSON.parse(fs.readFileSync(`${notificationGroupsDir}/${filename}.json`)))

        res.json(notificationGroups);
    });

    app.post('/api/notification_groups', authenticateAPIKey, (req, res) => {
        const notificationGroupsDir = `${__dirname}/notifications/notification_groups/`;
        const groupName = req.body.name;
        const groupData = req.body;

        const filename = md5(groupName);

        // Validate groupData here if necessary

        try {
            fs.writeFileSync(`${notificationGroupsDir}/${filename}.json`, JSON.stringify(groupData), 'utf8');
            res.send(`Notification group ${groupName} created successfully`);
        } catch (err) {
            console.log(err);
            res.status(500).send('Error creating notification group');
        }
    });

    app.put('/api/notification_groups/:name', authenticateAPIKey, (req, res) => {
        const notificationGroupsDir = `${__dirname}/notifications/notification_groups/`;
        const groupName = req.params.name;
        const groupData = req.body;

        const filename = md5(groupName);

        // Validate groupData here if necessary

        try {
            fs.writeFileSync(`${notificationGroupsDir}/${filename}.json`, JSON.stringify(groupData), 'utf8');
            res.send(`Notification group ${groupName} updated successfully`);
        } catch (err) {
            console.log(err);
            res.status(500).send('Error updating notification group');
        }
    });

    app.delete('/api/notification_groups/:name', authenticateAPIKey, (req, res) => {
        const notificationGroupsDir = `${__dirname}/notifications/notification_groups/`;
        const groupName = req.params.name;

        const filename = md5(groupName);

        try {
            fs.unlinkSync(`${notificationGroupsDir}/${filename}.json`);
            res.send(`Notification group ${groupName} deleted successfully`);
        } catch (err) {
            console.log(err);
            res.status(500).send('Error deleting notification group');
        }
    });
};
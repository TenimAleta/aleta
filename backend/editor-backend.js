module.exports.build = (app, io, fs, emit_query) => {
    const AWS = require('aws-sdk');
    const accessKeys = require('./aws.credentials.json');

    const credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));
    const colla = credentials.colla;    

    const s3 = new AWS.S3({
        accessKeyId: accessKeys.accessKeyId,
        secretAccessKey: accessKeys.secretAccessKey,
        region: accessKeys.region,
    });

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

    const getTimestampNow = () => Date.now();

    const formatName = name => name
        .replace(/[^a-zA-Z0-9_()-]/g, '')
        .toLowerCase();

    const separateSimultanis = (prev, current) => {
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
    
        return currentWithFixedCaixes;
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

            const strippedBundle = {
                ...bundle,
                simultani: false,
                bundles: {}
            }

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
                        .map(part => addPrefixToKey(part, b.part_id))
                        .reduce((accumulator, current) => {
                            return Object.assign(accumulator, current);
                        }, {})

                    return mergedParts
                })
                .reduce((accumulator, current) => {
                    return {
                        ...accumulator,
                        ...separateSimultanis(accumulator, current)
                    }
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

    const getAllBundlesWithPlantilla = (plantilla) => {
        return fs.readdirSync(`${__dirname}/data/bundles`)
            .filter(bundle => bundle.endsWith('.json'))
            .filter(bundle => {
                const bundleData = JSON.parse(fs.readFileSync(`${__dirname}/data/bundles/${bundle}`));
                const bundleParts = bundleData?.parts;

                if (!bundleParts) return false;
                return Object.values(bundleParts).includes(plantilla);
            })
            .map(bundle => bundle.replace('.json', ''));
    }

    const getAllSimultanisWithBundle = (originalBundle) => {
        return fs.readdirSync(`${__dirname}/data/bundles`)
            .filter(bundle => bundle.endsWith('.json'))
            .filter(bundle => {
                const bundleData = JSON.parse(fs.readFileSync(`${__dirname}/data/bundles/${bundle}`));
                const bundles = bundleData?.bundles;

                if (!bundles) return false;
                return Object.values(bundles).map(b => b.id).includes(originalBundle);
            })
            .map(bundle => bundle.replace('.json', ''));
    }

    io.on('connection', socket => {
        socket.on('.update_bundle_caixes', (bundleid, parts) => {
            Object.entries(parts).forEach(([plantilla, caixes]) => {
                const filename = `${__dirname}/data/plantilles/${plantilla}.json`;
                const plantillaData = JSON.parse(fs.readFileSync(filename));

                Object.entries(caixes).forEach(([caixa_id, caixa]) => {
                    plantillaData[caixa_id] = caixa;
                })

                fs.writeFileSync(filename, JSON.stringify(plantillaData));
            })

            // Update bundle
            updateBundle(bundleid);

            // Update simultanis with matched bundles
            getAllSimultanisWithBundle(bundleid)
                .forEach(id => updateBundle(id))

            io.emit('.updated_bundle_caixes', bundleid);
        })

        socket.on('.create_plantilla', (nom, data, force=false) => {
            const formattedNom = formatName(nom);

            if (fs.existsSync(`${__dirname}/data/plantilles/${formattedNom}.json`)) {
                if (force) {
                    fs.writeFileSync(`${__dirname}/data/plantilles/backups/${formattedNom}.${getTimestampNow()}.json`, JSON.stringify(data));
                    fs.writeFileSync(`${__dirname}/data/plantilles/${formattedNom}.json`, JSON.stringify(data));
                    io.emit('.created_plantilla', formattedNom);
                } else {
                    io.emit('.duplicate_plantilla', formattedNom);
                }
            } else {
                fs.writeFileSync(`${__dirname}/data/plantilles/${formattedNom}.json`, JSON.stringify(data));
                io.emit('.created_plantilla', formattedNom);
            }

            // Update all bundles with the new name
            getAllBundlesWithPlantilla(formattedNom)
                .forEach(bundleid => updateBundle(bundleid))

            // Update simultanis with matched bundles
            getAllBundlesWithPlantilla(formattedNom)
                .forEach(bundleid => getAllSimultanisWithBundle(bundleid)
                    .forEach(bundleid => updateBundle(bundleid))
                )
        })

        app.post('/api/upload_plantilla', (req, res) => {
            const nom = req.body.nom;
            const data = req.body.data;
    
            const formattedNom = formatName(nom);
    
            if (fs.existsSync(`${__dirname}/data/plantilles/${formattedNom}.json`)) {
                fs.writeFileSync(`${__dirname}/data/plantilles/backups/${formattedNom}.${getTimestampNow()}.json`, JSON.stringify(data));
                fs.writeFileSync(`${__dirname}/data/plantilles/${formattedNom}.json`, JSON.stringify(data));
                io.emit('.created_plantilla', formattedNom);
                res.json({ message: `Plantilla ${formattedNom} creada correctament.` });
            } else {
                fs.writeFileSync(`${__dirname}/data/plantilles/${formattedNom}.json`, JSON.stringify(data));
                io.emit('.created_plantilla', formattedNom);
                res.json({ message: `Plantilla ${formattedNom} creada correctament.` });
            }
    
            // Update all bundles with the new name
            getAllBundlesWithPlantilla(formattedNom)
                .forEach(bundleid => updateBundle(bundleid))
    
            // Update simultanis with matched bundles
            getAllBundlesWithPlantilla(formattedNom)
                .forEach(bundleid => getAllSimultanisWithBundle(bundleid)
                    .forEach(bundleid => updateBundle(bundleid))
                )
        })

        app.get('/api/download_plantilla/:nom', authenticateAPIKey, (req, res) => {
            const nom = req.params.nom;
            const filename = `${__dirname}/data/plantilles/${nom}.json`;

            const data = fs.readFileSync(filename);
            res.setHeader('Content-disposition', `attachment; filename=${nom}.aleta`);
            res.setHeader('Content-type', 'application/json');
            res.send(data);
        });

        app.post('/api/save_plantilla', (req, res) => {
            const nom = req.body.nom;
            const data = req.body.data;
    
            const formattedNom = formatName(nom);
    
            if (fs.existsSync(`${__dirname}/data/plantilles/${formattedNom}.json`)) {
                fs.writeFileSync(`${__dirname}/data/plantilles/backups/${formattedNom}.${getTimestampNow()}.json`, JSON.stringify(data));
                fs.writeFileSync(`${__dirname}/data/plantilles/${formattedNom}.json`, JSON.stringify(data));
                io.emit('.saved_plantilla', formattedNom);
                res.json({ message: `Plantilla ${formattedNom} guardada correctament.` });
            } else {
                io.emit('.error_plantilla', `ERROR: No s'ha trobat cap plantilla amb el nom ${formattedNom}.`);
                res.json({ error: true, message: `No s'ha trobat cap plantilla amb el nom ${formattedNom}.` });
                return;
            }
    
            // Update all bundles with the new name
            getAllBundlesWithPlantilla(formattedNom)
                .forEach(bundleid => updateBundle(bundleid))
    
            // Update simultanis with matched bundles
            getAllBundlesWithPlantilla(formattedNom)
                .forEach(bundleid => getAllSimultanisWithBundle(bundleid)
                    .forEach(bundleid => updateBundle(bundleid))
                )
        });

        socket.on('.save_plantilla', (nom, data) => {
            const formattedNom = formatName(nom);

            if (fs.existsSync(`${__dirname}/data/plantilles/${formattedNom}.json`)) {
                fs.writeFileSync(`${__dirname}/data/plantilles/backups/${formattedNom}.${getTimestampNow()}.json`, JSON.stringify(data));
                fs.writeFileSync(`${__dirname}/data/plantilles/${formattedNom}.json`, JSON.stringify(data));
                io.emit('.saved_plantilla', formattedNom);
            } else {
                io.emit('.error_plantilla', `ERROR: No s'ha trobat cap plantilla amb el nom ${formattedNom}.`);
                return;
            }

            // Update all bundles with the new name
            getAllBundlesWithPlantilla(formattedNom)
                .forEach(bundleid => updateBundle(bundleid))

            // Update simultanis with matched bundles
            getAllBundlesWithPlantilla(formattedNom)
                .forEach(bundleid => getAllSimultanisWithBundle(bundleid)
                    .forEach(bundleid => updateBundle(bundleid))
                )
        })

        socket.on('.duplicate_plantilla', (from, to) => {
            const formattedFrom = formatName(from);
            const formattedTo = formatName(to);
            
            if (fs.existsSync(`${__dirname}/data/plantilles/${formattedTo}.json`)) {
                // Rename the file to a backup
                fs.renameSync(
                    `${__dirname}/data/plantilles/${formattedTo}.json`,
                    `${__dirname}/data/plantilles/backups/${formattedTo}.${getTimestampNow()}.json`,
                );
            }

            // Copy the file
            fs.copyFileSync(
                `${__dirname}/data/plantilles/${formattedFrom}.json`,
                `${__dirname}/data/plantilles/${formattedTo}.json`,
            );

            // Update all bundles with the new name
            getAllBundlesWithPlantilla(formattedFrom)
                .forEach(bundleid => updateBundle(bundleid))

            // Update simultanis with matched bundles
            getAllBundlesWithPlantilla(formattedFrom)
                .forEach(bundleid => getAllSimultanisWithBundle(bundleid)
                    .forEach(bundleid => updateBundle(bundleid))
                )

            io.emit('.updated_plantilles', formattedTo);
        });

        socket.on('.rename_plantilla', (from, to) => {
            const formattedFrom = formatName(from);
            const formattedTo = formatName(to);
            
            if (fs.existsSync(`${__dirname}/data/plantilles/${formattedTo}.json`)) {
                socket.emit(
                    '.error_plantilla',
                    `ERROR: Ja existeix una plantilla amb el nom ${formattedTo}.`,
                )
            } else {
                // Rename the file
                fs.renameSync(
                    `${__dirname}/data/plantilles/${formattedFrom}.json`,
                    `${__dirname}/data/plantilles/${formattedTo}.json`,
                );

                // Rename all bundle parts
                fs.readdirSync(`${__dirname}/data/bundles`)
                    .filter(bundle => bundle.endsWith('.json'))
                    .forEach(bundle => {
                        const bundleData = JSON.parse(fs.readFileSync(`${__dirname}/data/bundles/${bundle}`));
                        const bundleParts = bundleData.parts;

                        Object.entries(bundleParts).forEach(([part, plantilla]) => {
                            if (plantilla === formattedFrom) {
                                bundleParts[part] = formattedTo;
                            }
                        })

                        fs.writeFileSync(`${__dirname}/data/bundles/${bundle}`, JSON.stringify(bundleData));
                    })

                io.emit('.renamed_plantilla', formattedTo);
            }

            // Update all bundles with the new name
            getAllBundlesWithPlantilla(formattedTo)
                .forEach(bundleid => updateBundle(bundleid))

            // Update simultanis with matched bundles
            getAllBundlesWithPlantilla(formattedTo)
                .forEach(bundleid => getAllSimultanisWithBundle(bundleid)
                    .forEach(bundleid => updateBundle(bundleid))
                )
        })

        socket.on('.update_all_bundles', () => {
            fs.readdirSync(`${__dirname}/data/bundles`)
                .filter(bundle => bundle.endsWith('.json'))
                .forEach(bundle => {
                    const bundleId = bundle.replace('.json', '');
                    updateBundle(bundleId);
                })
        })

        socket.on('.delete_plantilla', (nom) => {
            if (!fs.existsSync(`${__dirname}/data/plantilles/${nom}.json`)) {
                return io.emit('.deleted_plantilla', `ERROR: No s'ha trobat cap plantilla amb el nom ${nom}.`);
            }

            fs.renameSync(
                `${__dirname}/data/plantilles/${nom}.json`,
                `${__dirname}/data/plantilles/backups/${nom}.${getTimestampNow()}.json`,
            );

            return io.emit('.deleted_plantilla', nom);
        })

        socket.on('.restore_plantilla', (filename) => {
            const [nom, timestamp] = filename.split('.')

            if (!fs.existsSync(`${__dirname}/data/plantilles/backups/${filename}.json`)) {
                return io.emit('.restored_plantilla', `ERROR: No s'ha trobat cap backup de la plantilla ${nom}.`);
            }

            fs.renameSync(
                `${__dirname}/data/plantilles/backups/${filename}.json`,
                `${__dirname}/data/plantilles/${nom}.json`,
            );

            return io.emit('.restored_plantilla', nom);
        })

        socket.on('.delete_forever_plantilla', (nom) => {
            if (!fs.existsSync(`${__dirname}/data/plantilles/backups/${nom}.json`)) {
                return io.emit('.deleted_forever_plantilla', `ERROR: No s'ha trobat cap backup de la plantilla ${nom}.`);
            }

            fs.renameSync(
                `${__dirname}/data/plantilles/backups/${nom}.json`,
                `${__dirname}/data/plantilles/trash/${nom}.json`,
            );

            return io.emit('.deleted_forever_plantilla', nom);
        })

        socket.on('.request_deleted_plantilles', () => {
            const files = fs.readdirSync(`${__dirname}/data/plantilles/backups`);
            const backups = files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''))
                .map(file => ({
                    nom: file.split('.')[0],
                    timestamp: file.split('.').pop(),
                    filename: file,
                }))
                .sort((a, b) => b.timestamp > a.timestamp ? 1 : -1)
            
            io.emit('.deleted_plantilles', backups);
        })

        socket.on('.recover_plantilla', (from, to) => {
            if (!fs.existsSync(`${__dirname}/data/plantilles/backups/${from}.json`)) {
                return io.emit('.recovered_plantilla', `ERROR: No s'ha trobat cap backup de la plantilla ${nom}.`);
            }

            if (!fs.existsSync(`${__dirname}/data/plantilles/${to}.json`)) {
                fs.renameSync(
                    `${__dirname}/data/plantilles/backups/${from}.json`,
                    `${__dirname}/data/plantilles/${to}.json`,
                );
            } else {
                fs.renameSync(
                    `${__dirname}/data/plantilles/backups/${from}.json`,
                    `${__dirname}/data/plantilles/${from}.json`,
                );
            }

            return io.emit('.recovered_plantilla', to);
        })

        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });
};
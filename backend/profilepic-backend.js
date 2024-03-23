const { google } = require('googleapis');
const credentials = require('./google.auth');
const moment = require('moment');

const applyInverseTimeZone = (date=null, tz='Spain') => {
    if (tz === 'Spain') {
        const mom = date ? moment(date) : moment()
        const lastSundayOfThisYearsMarch = mom.clone().year(mom.clone().year()).month(2).endOf('month').day('Sunday');
        const lastSundayOfThisYearsOctober = mom.clone().year(mom.clone().year()).month(9).endOf('month').day('Sunday');

        if (mom < lastSundayOfThisYearsMarch) {
            // January - March: Winter time
            return mom.add(1, 'hours');
        } else if (mom < lastSundayOfThisYearsOctober) {
            // April - October: Summer time
            return mom.add(2, 'hours');
        } else {
            // November - December: Winter time
            return mom.add(1, 'hours');
        }
    } else {
        return date ? moment(date) : moment()
    }
}

const jwtClient = new google.auth.JWT(
	credentials['client_email'],
	null,
	credentials['private_key'],
    [
	    'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
    ]
);

const sheetsApi = google.sheets({version: 'v4', auth: jwtClient});

const getDefaultMails = async () => {
    const defaultMails = fs.readFileSync('./forms/defaultMails.json');
    const defaultMailsJson = JSON.parse(defaultMails);
    return defaultMailsJson;
}

async function listSharedEmails(sheetId) {
    const driveApi = google.drive({ version: 'v3', auth: jwtClient });
  
    const permissionsResponse = await driveApi.permissions.list({
      fileId: sheetId,
      fields: 'permissions(id,emailAddress,role)',
    });
  
    const permissions = permissionsResponse.data.permissions;
    const sharedEmails = permissions
        // .filter((permission) => permission.role !== 'owner')
        .map((permission) => permission.emailAddress)
        .filter((email) => email !== undefined)
        .filter((email) => !email.includes('iam.gserviceaccount.com'))
  
    return sharedEmails;
}  

async function createGoogleSheet(sheetTitle, headerRow, defaultSheetName = 'Finals', additionalSheetName = 'Totes') {
    // Create a new Google Sheet
    const newSheet = {
        properties: {
            title: sheetTitle,
        },
        sheets: [
            {
                properties: {
                    title: defaultSheetName,
                    sheetId: 0,
                },
            },
            {
                properties: {
                    title: additionalSheetName,
                },
            },
        ],
    };
    const createSheetResponse = await sheetsApi.spreadsheets.create({ resource: newSheet });
    const spreadsheetId = createSheetResponse.data.spreadsheetId;

    // Add the header row to the default Google Sheet (Finals) and make it readonly
    const updateRequest = {
        spreadsheetId,
        range: defaultSheetName + '!A1',
        valueInputOption: 'RAW',
        resource: {
            range: defaultSheetName + '!A1',
            majorDimension: 'ROWS',
            values: [headerRow],
        },
    };

    await sheetsApi.spreadsheets.values.update(updateRequest);

    // Add the header row to the additional Google Sheet (Totes) and make it readonly
    const updateRequest_additional = {
        spreadsheetId,
        range: additionalSheetName + '!A1',
        valueInputOption: 'RAW',
        resource: {
            range: additionalSheetName + '!A1',
            majorDimension: 'ROWS',
            values: [headerRow],
        },
    };

    await sheetsApi.spreadsheets.values.update(updateRequest_additional);
    const additionalSheetId = createSheetResponse.data.sheets.find(sheet => sheet.properties.title === additionalSheetName).properties.sheetId;

    return spreadsheetId;
}

async function changeDefaultSheetName(spreadsheetId, newName = 'Totes') {
    const updateRequest = {
      spreadsheetId,
      resource: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0, // "Sheet1" has the default sheetId of 0
                title: newName,
              },
              fields: 'title',
            },
          },
        ],
      },
    };
  
    await sheetsApi.spreadsheets.batchUpdate(updateRequest);
  }

async function createOrUpdateSubsheet(spreadsheetId, data, sheetName='Finals') {
    // Get the list of sheets in the spreadsheet
    const spreadsheet = await sheetsApi.spreadsheets.get({
      spreadsheetId,
    });
  
    // Check if a sheet with the specified name already exists
    const existingSheet = spreadsheet.data.sheets.find(
      (sheet) => sheet.properties.title === sheetName
    );
  
    let targetSheetName, sheetId;
  
    if (existingSheet) {
      // If the sheet exists, use the existing sheet name
      targetSheetName = existingSheet.properties.title;
      sheetId = existingSheet.properties.sheetId;
    } else {
      // If the sheet doesn't exist, create a new subsheet with the specified name
      const addSheetRequest = {
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      };
  
      const response = await sheetsApi.spreadsheets.batchUpdate(addSheetRequest);
      targetSheetName = response.data.replies[0].addSheet.properties.title;
      sheetId = response.data.replies[0].addSheet.properties.sheetId;
    }

    // If the sheetName is 'Finals', hide the first column
    if (sheetName === 'Finals') {
        const updateSheetRequest = {
          spreadsheetId,
          resource: {
            requests: [
              {
                updateDimensionProperties: {
                  range: {
                    sheetId: sheetId,
                    dimension: 'COLUMNS',
                    startIndex: 0,
                    endIndex: 1,
                  },
                  properties: {
                    hiddenByUser: true,
                  },
                  fields: 'hiddenByUser',
                },
              },
            ],
          },
        };
        await sheetsApi.spreadsheets.batchUpdate(updateSheetRequest);
      }
  
    // Write the content in data to the target sheet by replacing all existing content
    const updateRequest = {
      spreadsheetId,
      range: `${targetSheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        range: `${targetSheetName}!A1`,
        majorDimension: 'ROWS',
        values: data,
      },
    };
  
    await sheetsApi.spreadsheets.values.update(updateRequest);
  } 
  
const protectSheet = async (spreadsheetId, sheetName) => {
    const matchedSheet = await sheetsApi.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
    const sheetId = matchedSheet.data.sheets.find(sheet => sheet.properties.title === sheetName)?.properties.sheetId;

    const protectRequest = {
        requests: [{
        addProtectedRange: {
            protectedRange: {
            range: {
                sheetId: sheetId,
            },
                description: "Protecting entire sheet",
                warningOnly: false, // This makes the protected range strictly read-only unless the user has permission.
                requestingUserCanEdit: true, // This allows the user who created the protected range to edit it.
            },
        },
        }],
    };

    try {
        await sheetsApi.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: protectRequest,
        });
        // console.log(`Sheet ${sheetId} in spreadsheet ${spreadsheetId} is now protected.`);
    } catch (error) {
        // console.error(`Failed to protect sheet ${sheetId} in spreadsheet ${spreadsheetId}: ${error}`);
    }
};

async function appendDataToGoogleSheet(spreadsheetId, data, sheetName='Totes') {
    const appendRequest = {
        spreadsheetId,
        range: sheetName + '!A1',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
            range: sheetName + '!A1',
            majorDimension: 'ROWS',
            values: data,
        },
    };

    await sheetsApi.spreadsheets.values.append(appendRequest);
    await protectSheet(spreadsheetId, sheetName);
}

const getURLFromId = (spreadsheetId) => `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

async function shareGoogleSheetWithEmail(spreadsheetId, emailAddress, role) {
    const driveApi = google.drive({version: 'v3', auth: jwtClient});
  
    const permission = {
      type: 'user', // Share with a specific user
      role, // Role: 'owner', 'writer', or 'reader'
      emailAddress,
    };
  
    await driveApi.permissions.create({
        resource: permission,
        fileId: spreadsheetId,
        fields: 'id',
        sendNotificationEmail: false,
    });
}  

async function deleteGoogleSheet(spreadsheetId) {
    const driveApi = google.drive({version: 'v3', auth: jwtClient});
    await driveApi.files.delete({fileId: spreadsheetId});
}

async function createSpreadsheetAndAppendData(title, data, mailsToShare) {
    try {
        // Create a new spreadsheet
        const spreadsheet = await sheetsApi.spreadsheets.create({
            resource: {
                properties: {
                    title: title
                }
            }
        });

        const sheetId = spreadsheet.data.spreadsheetId;
        const url = spreadsheet.data.spreadsheetUrl;

        // Share the spreadsheet with your email and provide writer permissions
        const driveApi = google.drive({ version: 'v3', auth: jwtClient });

        for (const mail of mailsToShare) {
            await driveApi.permissions.create({
                fileId: sheetId,
                resource: {
                    type: 'user',
                    role: 'writer',
                    emailAddress: mail
                }
            });
        }        

        // Prepare data for the Google Sheet
        const rows = data.map(person => Object.values(person));

        // Add the headers
        const headerRow = Object.keys(data[0]);
        rows.unshift(headerRow);

        // Append data to the sheet
        await sheetsApi.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'A1', 
            valueInputOption: 'RAW',
            resource: {
                values: rows
            }
        });

        console.log('Data successfully appended to the spreadsheet:', url);
        return url;

    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports.build = (app, io, fs, emit_query, execute_query) => {

    const credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));
    const colla = credentials.colla;

    const AWS = require('aws-sdk');
    const accessKeys = require('./aws.credentials.json');

    const s3 = new AWS.S3({
        accessKeyId: accessKeys.accessKeyId,
        secretAccessKey: accessKeys.secretAccessKey,
        region: accessKeys.region,
    });

    const Jimp = require('jimp');
    const { v4: uuidv4 } = require('uuid');

    function createDataframe(responses, userIds, castellersInfo, form, unique=false, eventId=null) {
        const header = (!unique ? ['Data', 'Nom', 'Cognom', 'Segon cognom', 'Sobrenom'] : ['ID', 'Nom', 'Cognom', 'Segon cognom', 'Sobrenom']).concat(
          form.elements
            .map((element) => element?.type === 'text' ? element?.content : element?.content?.question)
            .map(question => question === undefined ? 'TEXT' : question)
        );

        const data = [header];
      
        userIds.forEach((userId, index) => {
            const isVisitant = castellersInfo?.[userId] === undefined;
          const response = responses[userId];
    
          const rowData = (unique && castellersInfo) ? [
            userId,
            !isVisitant ? (castellersInfo[userId]?.nom || '') : 'VISITANT',
            !isVisitant ? (castellersInfo[userId]?.cognom || '') : 'VISITANT',
            !isVisitant ? (castellersInfo[userId]?.segon_cognom || '') : 'VISITANT',
            !isVisitant ? (castellersInfo[userId]?.mote || '') : 'VISITANT',
          ] : (unique && !castellersInfo) ? [
            userId,
            'Nom (#' + userId + ')',
            'Cognom (#' + userId + ')',
            'Segon cognom (#' + userId + ')',
            'Sobrenom (#' + userId + ')',
          ] : (!unique && castellersInfo) ? [
            applyInverseTimeZone(null).format('DD/MM/YYYY HH:mm:ss'),
            !isVisitant ? (castellersInfo[userId]?.nom || '') : 'VISITANT',
            !isVisitant ? (castellersInfo[userId]?.cognom || '') : 'VISITANT',
            !isVisitant ? (castellersInfo[userId]?.segon_cognom || '') : 'VISITANT',
            !isVisitant ? (castellersInfo[userId]?.mote || '') : 'VISITANT',
          ] : [
            applyInverseTimeZone(null).format('DD/MM/YYYY HH:mm:ss'),
            'Nom (#' + userId + ')',
            'Cognom (#' + userId + ')',
            'Segon cognom (#' + userId + ')',
            'Sobrenom (#' + userId + ')',
          ]
      
          form.elements.forEach((element) => {
            const id = element.id;
            const responseType = element.type;
            const options = element.content.options;
      
            if (responseType === 'multiple-choice') {
                if (response === null) {
                    rowData.push('(Eliminat)');
                } else if (response?.[id] === undefined) {
                    rowData.push('');
                } else {
                    rowData.push(options[response[id]]);
                }
            } else if (responseType === 'ticket') {
                if (response === null) {
                    rowData.push('(Eliminat)');
                } else if (response?.[id] === undefined) {
                    rowData.push('');
                } else {
                    rowData.push(options[response[id]]);
                }
            } else if (responseType === 'checkbox') {
                if (response === null) {
                    rowData.push('(Eliminat)');
                } else if (response?.[id] === undefined) {
                    rowData.push('');
                } else {
                    const selectedOptions = Object.entries(response[id])
                        .filter(([, isSelected]) => isSelected)
                        .map(([optionIndex]) => parseInt(optionIndex, 10))
                        .map((optionIndex) => options[optionIndex]);
                    rowData.push(selectedOptions.join(', '));
                }
            } else if (
              responseType === 'short-answer' ||
              responseType === 'paragraph'
            ) {
                if (response === null) {
                    rowData.push('(Eliminat)');
                } else if (response?.[id] === undefined) {
                    rowData.push('');
                } else {
                    rowData.push(response[id]);
                }
            } else if (
                responseType === 'image-upload'
            ) {
                // Generate a S3 signed URL for the image
                if (response === null) {
                    rowData.push('(Eliminat)');
                } else if (eventId && id && userId) {
                    const S3path = `forms/${eventId}/${id}/${userId}.png`;
                    const signedUrl = s3.getSignedUrl('getObject', {
                        Bucket: 'aleta-' + colla,
                        Key: S3path,
                        Expires: 60 * 60 * 24 * 7, // 7 days
                    });

                    // rowData.push(signedUrl)
                    rowData.push(`=IMAGE("${signedUrl}")`);
                } else {
                    rowData.push('');
                }
            } else {
                rowData.push('-');
            }
          });
      
          data.push(rowData);
        });
      
        return data;
    }

    app.post('/api/upload_form_image', async (req, res) => {
        const { formId, elementId, base64 } = req.body;

        const params = {
            Bucket: 'aleta-' + colla,
            Key: `forms/${formId}/${elementId}.base64`,
            Body: base64,
        };
    
        // Check if folders exist
        await s3.headObject({ Bucket: 'aleta-' + colla, Key: `forms/${formId}/` }).promise()
            .catch(() => s3.putObject({ Bucket: 'aleta-' + colla, Key: `forms/${formId}/` }).promise())
    
        // Upload image to S3 bucket
        s3.putObject(params).promise()
            .then(({ url }) => res.json({ success: true, url }))
            .catch(e => console.log('UPLOAD ERROR', e.message))
    });

    app.get('/api/update_form_images/:formId/:elementId', (req, res) => {
        const { formId, elementId } = req.params;
        const dirPath = `forms/${formId}/${elementId}/`;
    
        const listParams = {
            Bucket: 'aleta-' + colla,
            Prefix: dirPath,
        };
    
        s3.listObjectsV2(listParams, function (err, data) {
            if (err) {
                console.log('Error listing objects from S3:', err, err.stack);
                res.json({ success: false, message: 'Error listing images.' });
            } else {
                let files = data.Contents.filter(file => file.Key.endsWith('.base64'));
                processFiles(files, 0, res);
            }
        });

        function processFiles(files, index, res) {
            if (index >= files.length) {
                res.json({ success: true, message: 'All images processed.' });
                return;
            }
        
            let file = files[index];
            let user = file.Key.split('/').pop().split('.').shift();
            let base64S3path = file.Key;
            let pngS3Path = file.Key.replace('.base64', '.png');
        
            const params = {
                Bucket: 'aleta-' + colla,
                Key: base64S3path,
            };
        
            s3.getObject(params, function (err, data) {
                if (err) {
                    console.log('Error getting image from S3:', err, err.stack);
                } else {
                    const url = data.Body.toString('utf-8').replace(/^data:image\/\w+;base64,/, "");
                    const buf = new Buffer.from(url, 'base64');
        
                    Jimp.read(buf)
                        .then(image => {
                            image
                                .resize(500, Jimp.AUTO)
                                .getBufferAsync(Jimp.MIME_PNG)
                                .then(data => {
                                    const params = {
                                        Bucket: 'aleta-' + colla,
                                        Key: pngS3Path,
                                        Body: data,
                                        ContentType: 'image/png',
                                    };
        
                                    s3.putObject(params, function (err, data) {
                                        if (err) {
                                            console.log('Error uploading image to S3:', err, err.stack);
                                        } else {
                                            console.log('Image uploaded to S3:', pngS3Path);
                                        }
                                        processFiles(files, index + 1, res); // Process the next file
                                    });
                                })
                                .catch(err => {
                                    console.log('Error processing image:', err);
                                    processFiles(files, index + 1, res); // Process the next file
                                });
                        })
                        .catch(err => {
                            console.log('Error reading image:', err);
                            processFiles(files, index + 1, res); // Process the next file
                        });
                }
            });
        }
    });
    app.get('/api/form_image_uploaded/:formId/:elementId/:user', (req, res) => {
        const { formId, elementId, user } = req.params;
        const base64S3path = `forms/${formId}/${elementId}/${user}.base64`;
        const pngS3Path = `forms/${formId}/${elementId}/${user}.png`;

        const params = {
            Bucket: 'aleta-' + colla,
            Key: base64S3path,
        };

        s3.getObject(params, function(err, data) {
            if (err) {
                console.log('Error getting image from S3:', err, err.stack);
                res.json({ success: false, message: 'No s\'ha trobat la imatge.' });
            } else {
                const url = data.Body.toString('utf-8').replace(/^data:image\/\w+;base64,/, "");
                const buf = new Buffer.from(url, 'base64');

                Jimp.read(buf)
                    .then(image => {
                        image
                            .resize(500, Jimp.AUTO)
                            .getBufferAsync(Jimp.MIME_PNG)
                            .then(data => {
                                const params = {
                                    Bucket: 'aleta-' + colla,
                                    Key: pngS3Path,
                                    Body: data,
                                    ContentType: 'image/png',
                                };
                            
                                s3.putObject(params, function(err, data) {
                                    if (err) {
                                        console.log('Error uploading image to S3:', err, err.stack);
                                        res.json({ success: false, message: 'No s\'ha pogut guardar la imatge.' });
                                    } else {
                                        console.log('Image uploaded to S3:', pngS3Path);
                                        res.json({ success: true, message: 'Imatge guardada correctament.' });
                                    }
                                });
                            })
                            .catch(err => {
                                console.log('Error processing image:', err);
                                res.json({ success: false, message: 'No s\'ha pogut processar la imatge.' });
                            });
                    })
                    .catch(err => {
                        console.log('Error reading image:', err);
                        res.json({ success: false, message: 'No s\'ha pogut llegir la imatge.' });
                    });
                    
            }
        });
    });

    function getSpreadsheetId(selectedEvent) {
        const correspondances = fs.readFileSync(`${__dirname}/forms/sheetsId.json`);
        const correspondances_json = JSON.parse(correspondances);
        return correspondances_json?.[selectedEvent];
    }

    const getResponses = (selectedEvent) => {
        const responses_dir = `${__dirname}/events/${selectedEvent}/formresponses`;

        const getDataFromJSON = (file) => {
            if (fs.existsSync(file)) {
                const response_data = JSON.parse(fs.readFileSync(file));

                const decoded_data = Object.keys(response_data).reduce((acc, key) => {
                    const value = response_data[key];
                    const decodedValue = typeof value === 'string' ? decodeURIComponent(value) : value;
                    acc[key] = decodedValue;
                    return acc;
                }, {});

                return decoded_data;
            }
        }

        const getFilenameFromPathWithoutExt = (path) => {
            const splitted = path.split('/');
            const filename = splitted[splitted.length - 1];
            const splitted_filename = filename.split('.');
            splitted_filename.pop();
            return splitted_filename.join('.');
        }
                

        if (fs.existsSync(responses_dir)) {
            const responses = fs.readdirSync(responses_dir).reduce((acc, file) => {
                const response_path = `${responses_dir}/${file}`;
                const userId = getFilenameFromPathWithoutExt(file);
                acc[userId] = getDataFromJSON(response_path);
                return acc;
            }, {});


            return responses
        } else {
            return []
        }
    }

    const updateFinalResponses = async (selectedEvent, castellersInfo, form) => {
        const spreadsheetId = getSpreadsheetId(selectedEvent);
        const responses = getResponses(selectedEvent);
        const userIds = Object.keys(responses);
    
        const data = createDataframe(responses, userIds, castellersInfo, form, true, selectedEvent);
        await createOrUpdateSubsheet(spreadsheetId, data);
        await protectSheet(spreadsheetId, 'Finals');
    }

    io.on('connection', socket => {
        socket.on('.loading_profile_pic', (user) => io.emit('.loading_profile_pic', user));
        socket.on('.changed_profile_pic', (user) => io.emit('.changed_profile_pic', user));

        socket.on('.save_form', (data, selectedEvent) => {
            const form_path = `${__dirname}/events/${selectedEvent}/form.json`;

            if (fs.existsSync(form_path)) {
                io.emit('.form_saved', { evId: selectedEvent, success: false, message: 'Ja existeix un formulari per aquest event.' });
            } else {
                fs.writeFileSync(form_path, JSON.stringify(data));
                io.emit('.form_saved', { evId: selectedEvent, success: true, message: 'Formulari guardat correctament.' });
            }
        })

        socket.on('.force_save_form', (data, selectedEvent) => {
            const event_dir = `${__dirname}/events/${selectedEvent}`;
            const form_path = `${event_dir}/form.json`;

            // Extract tickets from data and add them do the database
            data.elements
                .filter(element => element.type === 'ticket')
                .forEach(element => {
                    const price = parseInt(element.price) || 0;
                    const add_producte_query = `INSERT IGNORE INTO productes (id, nom, preu, \`event-id\`) VALUES ('${element.id}', '${element.content.question}', ${price}, ${selectedEvent}) ON DUPLICATE KEY UPDATE nom='${element.content.question}', \`preu\`=${price}, \`event-id\`=${selectedEvent}`;
                    emit_query(io, '.producte_added', add_producte_query, data => ({
                        'event-id': selectedEvent,
                        'ticket-id': element.id,
                    }))

                    element.price = price;
                })

            // Write to the file
            if (!fs.existsSync(event_dir)) fs.mkdirSync(event_dir);
            fs.writeFileSync(form_path, JSON.stringify(data));

            io.emit('.form_saved', { evId: selectedEvent, success: true, message: 'Formulari guardat correctament.' });
        })

        app.post('/api/duplicate_form/:fromEvent/:toEvent', async (req, res) => {
            function renameIDs(formData) {
                const idMap = {};
            
                formData.elements.forEach(element => {
                    const oldId = element.id;
                    const newId = uuidv4();
                    element.id = newId;
                    idMap[oldId] = newId;
                });
            
                formData.order = formData.order
                    .map(oldId => idMap.hasOwnProperty(oldId) ? idMap[oldId] : oldId);
            
                return formData;
            }

            function mergeFormData(targetFormData, sourceFormData, idsToDuplicate) {
                const clonedSourceFormData = JSON.parse(JSON.stringify(sourceFormData));
                const prunedSourceFormData = clonedSourceFormData.elements.filter(element => idsToDuplicate.includes(element.id));
                const renamedSourceFormData = renameIDs({elements: prunedSourceFormData, order: clonedSourceFormData.order});
                
                // Merge elements
                targetFormData.elements = [...targetFormData.elements, ...renamedSourceFormData.elements];
                // Merge order, ensuring no duplicates
                targetFormData.order = [...new Set([...targetFormData.order, ...renamedSourceFormData.order])];

                return targetFormData;
            }

            const { fromEvent, toEvent } = req.params;
            const { idsToDuplicate } = req.body;

            const fromFormPath = `${__dirname}/events/${fromEvent}/form.json`;
            const toFormPath = `${__dirname}/events/${toEvent}/form.json`;

            try {
                const toFormData = fs.existsSync(toFormPath) ? JSON.parse(fs.readFileSync(toFormPath)) : { elements: [], order: [] };
                if (fs.existsSync(fromFormPath)) {
                    const fromFormData = JSON.parse(fs.readFileSync(fromFormPath));
                    const mergedFormData = mergeFormData(toFormData, fromFormData, idsToDuplicate);

                    fs.writeFileSync(toFormPath, JSON.stringify(mergedFormData));
                    res.json({ success: true, message: 'Preguntes afegides al formulari existent correctament.' });
                } else {
                    res.status(404).json({ success: false, message: 'El formulari d\'origen no existeix.' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: 'Error duplicant el formulari.', error: error.message });
            }
        })

        socket.on('.load_form', (selectedEvent) => {
            const form_path = `${__dirname}/events/${selectedEvent}/form.json`;

            if (fs.existsSync(form_path)) {
                const form_data = JSON.parse(fs.readFileSync(form_path));
                socket.emit('.loaded_form', form_data);
            } else {
                socket.emit('.loaded_form', { title: '', description: '', elements: [], order: [], new: true });
            }
        })

        app.post('/api/remove_tiquet', (req, res) => {
            const id = req.body.id;
            const remove_producte_query = `DELETE FROM productes WHERE id='${id}'`;

            execute_query(remove_producte_query, data => {
                res.json(data);
                io.emit('.producte_removed', { 'ticket-id': id });
            })
        })

        const getCastellersInfo = () => {
            return new Promise((resolve, reject) => {
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
            
                    resolve(resultObj);
                });    
            });
        };

        app.get('/api/export_form_responses/:eventId', (req, res) => {
            // Export form responses to .CSV file
            const selectedEvent = parseInt(req.params.eventId);
            const responses = getResponses(selectedEvent);

            getCastellersInfo()
                .then((castellersInfo) => {
                    const formPath = `${__dirname}/events/${selectedEvent}/form.json`;
                    if (fs.existsSync(formPath)) {
                        const form = JSON.parse(fs.readFileSync(formPath));
                        const headerRow = createDataframe(responses, Object.keys(responses), castellersInfo, form, true, selectedEvent)[0]; // Get the first element (the header row)
                        const rowsData = createDataframe(responses, Object.keys(responses), castellersInfo, form, true, selectedEvent).slice(1); // Get the rest of the elements (the new rows data)

                        const filename = `${form.title} - Respostes.csv`;
                        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
                        res.setHeader('Content-Type', 'text/csv');
                        res.send([headerRow, ...rowsData].join('\n'));
                    } else {
                        res.json({ success: false, message: 'No s\'ha trobat el formulari.' });
                    }
                })
        })

        app.post('/api/delete_form_response', (req, res) => {
            const { userId, eventId, castellersInfo } = req.body;
            const responses_dir = `${__dirname}/events/${eventId}/formresponses`;
            const response_path = `${responses_dir}/${userId}.json`;
            const formPath = `${__dirname}/events/${eventId}/form.json`;
            const formData = fs.existsSync(formPath) ? JSON.parse(fs.readFileSync(formPath)) : null;

            if (fs.existsSync(response_path)) {
                fs.unlinkSync(response_path);
                res.json({ success: true, message: 'Resposta eliminada correctament.' });

                socket.emit('.form_submitted', { user: userId, evId: eventId, success: false, response: null });
                socket.emit('.form_submitted2', { user: userId, evId: eventId, success: false, response: null });
            } else {
                res.json({ success: false, message: 'No s\'ha trobat la resposta.' });
            }

            // Update the Google Sheet asynchronously
            const handleSheetUpdate = async () => {
                if (fs.existsSync(formPath)) {
                    const rowData = createDataframe({ [userId]: null }, [userId], castellersInfo, formData, false, eventId)[1]; // Get the second element (the new row data)
            
                    let fetchedSpreadsheetId = getSpreadsheetId(eventId);

                    if (fetchedSpreadsheetId) {
                        // Append the submitted data to the Google Sheet
                        await appendDataToGoogleSheet(fetchedSpreadsheetId, [rowData]);
                        
                        // Update the final responses
                        await updateFinalResponses(eventId, castellersInfo, formData)
                    }
                }
            };

            handleSheetUpdate()
                .then(() => io.emit('.new_response', eventId))
                .catch((err) => console.error('Error updating Google Sheet:', err));

            // Cancel all tickets
            formData?.elements
                ?.filter(element => element?.type === 'ticket')
                ?.forEach(({ id }) => {
                    // Set all to "No demanat"
                    const remove_ticket_query = `INSERT INTO pagaments (\`casteller-id\`, \`producte-id\`, status) VALUES (${userId}, '${id}', 'No demanat')`;
                    emit_query(io, '.pagament_status_set', remove_ticket_query, () => ({
                        'casteller-id': userId,
                        'producte-id': id,
                        'status': 'No demanat',
                    }))
                })
        })

        socket.on('.submit_form', (data, userId, selectedEvent, castellersInfo=null, formData, sentImages=[]) => {
            const responses_dir = `${__dirname}/events/${selectedEvent}/formresponses`;

            if (!fs.existsSync(responses_dir)) {
                fs.mkdirSync(responses_dir);
            }

            const encodedFormValues = Object.keys(data).reduce((acc, key) => {
                const value = data[key];
                const encodedValue = typeof value === 'string' ? encodeURIComponent(value) : value;
                acc[key] = encodedValue;
                return acc;
            }, {});

            // Add form images to form values
            sentImages
                .forEach(id => {
                    // Image exists
                    encodedFormValues[id] = true;
                });

            // Add mote to form values
            encodedFormValues['mote'] = castellersInfo?.[userId]?.mote || 'VISITANT';

            const response_path = `${responses_dir}/${userId}.json`;
            fs.writeFileSync(response_path, JSON.stringify(encodedFormValues));

            socket.emit('.form_submitted', { user: userId, evId: selectedEvent, success: true, response: data });
            socket.emit('.form_submitted2', { user: userId, evId: selectedEvent, success: true, response: data });

            // Handle the Google Sheet update asynchronously
            const handleSheetUpdate = async () => {
                const formPath = `${__dirname}/events/${selectedEvent}/form.json`;
                if (fs.existsSync(formPath)) {
                    const form = JSON.parse(fs.readFileSync(formPath));
                    const headerRow = createDataframe({ [userId]: data }, [userId], castellersInfo, form, false, selectedEvent)[0]; // Get the first element (the header row)
                    const rowData = createDataframe({ [userId]: data }, [userId], castellersInfo, form, false, selectedEvent)[1]; // Get the second element (the new row data)
            
                    let fetchedSpreadsheetId = getSpreadsheetId(selectedEvent);
                    if (!fetchedSpreadsheetId) {
                        // Create the Google Sheet if it doesn't exist
                        const titol = form.title ? form.title : 'Formulari sense títol';
                        fetchedSpreadsheetId = await createGoogleSheet(`${titol} - Respostes`, headerRow);

                        // Save the new spreadsheet ID
                        const correspondances = fs.readFileSync(`${__dirname}/forms/sheetsId.json`);
                        const correspondancesJson = JSON.parse(correspondances);
                        correspondancesJson[selectedEvent] = fetchedSpreadsheetId;
                        fs.writeFileSync(`${__dirname}/forms/sheetsId.json`, JSON.stringify(correspondancesJson));

                        // Share with default mails
                        const defaultMails = fs.readFileSync(`${__dirname}/forms/defaultMails.json`);
                        const defaultMailsJson = JSON.parse(defaultMails);

                        // // Owner
                        // await shareGoogleSheetWithEmail(fetchedSpreadsheetId, defaultMailsJson['owner'], 'owner');

                        // Writers
                        defaultMailsJson['writers'].forEach(async (mail) => {
                            await shareGoogleSheetWithEmail(fetchedSpreadsheetId, mail, 'writer');
                        });

                        // Readers
                        defaultMailsJson['readers'].forEach(async (mail) => {
                            await shareGoogleSheetWithEmail(fetchedSpreadsheetId, mail, 'reader');
                        });

                        // Send success signal to the client
                        socket.emit('.google_sheet_url_received', getURLFromId(fetchedSpreadsheetId));
                        socket.emit('.google_sheet_shared', { success: true });
                    }

                    // Append the submitted data to the Google Sheet
                    await appendDataToGoogleSheet(fetchedSpreadsheetId, [rowData]);
                    
                    // Update the final responses
                    await updateFinalResponses(selectedEvent, castellersInfo, form)
                }
            };

            handleSheetUpdate()
                .then(() => io.emit('.new_response', selectedEvent))
                .catch((err) => console.error('Error updating Google Sheet:', err));

            // Extract tickets from data and add them do the database
            Object.entries(data)
                .filter(([id, value]) => {
                    const elementInfo = formData?.elements?.find((e) => e.id === id);
                    return elementInfo?.type === 'ticket';
                })
                .forEach(([id, value]) => {
                    if (value === 0) {
                        const add_ticket_query = `INSERT INTO pagaments (\`casteller-id\`, \`producte-id\`, status) VALUES (${userId}, '${id}', 'Demanat')`;
                        emit_query(io, '.pagament_status_set', add_ticket_query, data => ({
                            'casteller-id': userId,
                            'producte-id': id,
                            'status': 'Demanat',
                        }))
                    } else {
                        const remove_ticket_query = `INSERT INTO pagaments (\`casteller-id\`, \`producte-id\`, status) VALUES (${userId}, '${id}', 'No demanat')`;
                        emit_query(io, '.pagament_status_set', remove_ticket_query, data => ({
                            'casteller-id': userId,
                            'producte-id': id,
                            'status': 'No demanat',
                        }))
                    }
                })
        });

        socket.on('.export_assistance', (selectedEvent, eventInfo, assistanceEvent, castellersInfo, options, mailsToShare) => {
            const { assistanceTypesToExport, extraColumnsToExport } = options;
            const columnsToExport = ['nom', 'cognom', 'segon_cognom', 'mote', 'assistencia', ...extraColumnsToExport]

            const columnsMap = {
                'nom': 'Nom',
                'cognom': 'Cognom',
                'segon_cognom': 'Segon Cognom',
                'mote': 'Sobrenom',
                'assistencia': 'Assistència'
            }

            // Get assistanceTypes from the assistance
            const peopleToExport = assistanceEvent
                .filter((person) => assistanceTypesToExport.includes(person.assistencia))

            // Amplify the information with the extraColumnsToExport from castellersInfo
            const peopleToExportWithInfo = peopleToExport.map((person) => {
                const info = castellersInfo[person.id];
                const asssistInfo = assistanceEvent.find((p) => p.id === person.id);

                const columns = columnsToExport.reduce((acc, column) => {
                    const columnName = columnsMap[column] || column.toUpperCase();
                    acc[columnName] = info?.[column] || asssistInfo?.[column] || undefined
                    return acc;
                }, {});

                return {
                    ...columns,
                };
            })

            const title = `${eventInfo?.title} (${moment(eventInfo?.data_inici).format('DD/MM/YY')}) - Assistència`

            // Export the data to a Google Sheet
            createSpreadsheetAndAppendData(title, peopleToExportWithInfo, mailsToShare)
                .then((url) => socket.emit('.assistance_exported', {
                    selectedEvent,
                    url
                }))
                .catch((err) => console.error('Error exporting assistance:', err))
        });

        socket.on('.add_default_mail', (mail, type='writers') => {   
            const defaultMails = fs.readFileSync(`${__dirname}/forms/defaultMails.json`);
            const defaultMailsJson = JSON.parse(defaultMails);

            defaultMailsJson[type] = defaultMailsJson[type].filter((m) => m !== mail);
            defaultMailsJson[type].push(mail);

            fs.writeFileSync(`${__dirname}/forms/defaultMails.json`, JSON.stringify(defaultMailsJson));
            socket.emit('.default_mails', defaultMailsJson)
        });

        socket.on('.remove_default_mail', (mail, type='writers') => {
            const defaultMails = fs.readFileSync(`${__dirname}/forms/defaultMails.json`);
            const defaultMailsJson = JSON.parse(defaultMails);

            defaultMailsJson[type] = defaultMailsJson[type].filter((m) => m !== mail);

            fs.writeFileSync(`${__dirname}/forms/defaultMails.json`, JSON.stringify(defaultMailsJson));
            socket.emit('.default_mails', defaultMailsJson)
        });

        socket.on('.get_default_mails', () => {
            const defaultMails = fs.readFileSync(`${__dirname}/forms/defaultMails.json`);
            const defaultMailsJson = JSON.parse(defaultMails);
            socket.emit('.default_mails', defaultMailsJson);
        });

        app.get('/api/get_all_forms', (req, res) => {
            const events_dirs = fs.readdirSync(`${__dirname}/events`);
            
            const all_forms = events_dirs.reduce((all, event) => {
                const formPath = `${__dirname}/events/${event}/form.json`;
                if (fs.existsSync(formPath)) {
                    const form = JSON.parse(fs.readFileSync(formPath));
                    const parsed_form = {
                        ...form,
                        new: false
                    };

                    all[event] = parsed_form;
                }

                return all;
            }, {});

            res.json(all_forms);
        });

        socket.on('.get_all_forms', () => {
            const events_dirs = fs.readdirSync(`${__dirname}/events`);
            
            const all_forms = events_dirs.reduce((all, event) => {
                const formPath = `${__dirname}/events/${event}/form.json`;
                if (fs.existsSync(formPath)) {
                    const form = JSON.parse(fs.readFileSync(formPath));
                    const parsed_form = {
                        ...form,
                        new: false
                    };

                    all[event] = parsed_form;
                }

                return all;
            }, {});

            socket.emit('.all_forms', all_forms);
        });

        socket.on('.get_all_forms_submitted', user => {
            const events_dirs = fs.readdirSync(`${__dirname}/events`);

            const all_forms_submitted = events_dirs.reduce((all, event) => {
                const responses_dir = `${__dirname}/events/${event}/formresponses`;
                if (fs.existsSync(responses_dir)) {
                    const responses = fs.readdirSync(responses_dir);
                    const user_responses = responses.filter((response) => parseInt(response.split('.')[0]) === user);
                    if (user_responses.length > 0) all[event] = true;
                }

                return all;
            }, {});

            socket.emit('.all_forms_submitted', all_forms_submitted);
            io.emit('.user_all_forms_submitted', user, all_forms_submitted);
        })

        app.get('/api/get_all_forms_submitted/:user', (req, res) => {
            const user = parseInt(req.params.user);
            const events_dirs = fs.readdirSync(`${__dirname}/events`);

            const all_forms_submitted = events_dirs.reduce((all, event) => {
                const responses_dir = `${__dirname}/events/${event}/formresponses`;
                if (fs.existsSync(responses_dir)) {
                    const responses = fs.readdirSync(responses_dir);
                    const user_responses = responses.filter((response) => parseInt(response.split('.')[0]) === user);
                    if (user_responses.length > 0) all[event] = true;
                }

                return all;
            }, {});

            res.json(all_forms_submitted);
            // io.emit('.user_all_forms_submitted', user, all_forms_submitted);
        })

        app.get('/api/get_all_forms_responses/:user', (req, res) => {
            const user = parseInt(req.params.user);
            const events_dirs = fs.readdirSync(`${__dirname}/events`);

            const all_forms_responses = events_dirs.reduce((all, event) => {
                const responses_dir = `${__dirname}/events/${event}/formresponses`;
                if (fs.existsSync(responses_dir)) {
                    const responses = fs.readdirSync(responses_dir);
                    const user_responses = responses.filter((response) => parseInt(response.split('.')[0]) === user);
                    if (user_responses.length > 0) {
                        const response_data = JSON.parse(fs.readFileSync(`${responses_dir}/${user_responses[0]}`));
                        const decoded_data = Object.keys(response_data).reduce((acc, key) => {
                            const value = response_data[key];
                            const decodedValue = typeof value === 'string' ? decodeURIComponent(value) : value;
                            acc[key] = decodedValue;
                            return acc;
                        }, {});

                        all[event] = decoded_data;
                    }
                }

                return all;
            }, {});

            res.json(all_forms_responses);
        })

        socket.on('.get_events_with_forms', () => {
            const events_dirs = fs.readdirSync(`${__dirname}/events`);

            const events_with_forms = events_dirs.reduce((all, event) => {
                const formPath = `${__dirname}/events/${event}/form.json`;
                if (fs.existsSync(formPath)) all[event] = true;
            }, {});

            socket.emit('.events_with_forms', events_with_forms);
        });

        socket.on('.request_shared_emails', async (selectedEvent) => {
            const spreadsheetId = getSpreadsheetId(selectedEvent);
          
            if (spreadsheetId) {
              try {
                const sharedEmails = await listSharedEmails(spreadsheetId);
                socket.emit('.shared_emails', sharedEmails);
              } catch (error) {
                console.error('Error listing shared emails:', error);
                socket.emit('.shared_emails', []);
              }
            } else {
              socket.emit('.shared_emails', []);
            }
        });          

        socket.on('.is_form_submitted', (userId, selectedEvent) => {
            const responses_dir = `${__dirname}/events/${selectedEvent}/formresponses`;
            const response_path = `${responses_dir}/${userId}.json`;

            if (fs.existsSync(response_path)) {
                const response_data = JSON.parse(fs.readFileSync(response_path));
                const decoded_data = Object.keys(response_data).reduce((acc, key) => {
                    const value = response_data[key];
                    const decodedValue = typeof value === 'string' ? decodeURIComponent(value) : value;
                    acc[key] = decodedValue;
                    return acc;
                }, {});

                socket.emit('.form_submitted', { user: userId, evId: selectedEvent, success: true, response: decoded_data });
            } else {
                socket.emit('.form_submitted', { user: userId, success: false, message: 'Encara no has enviat el formulari.' });
            }
        });

        app.get('/api/is_form_submitted/:userId/:selectedEvent', (req, res) => {
            const userId = parseInt(req.params.userId);
            const selectedEvent = parseInt(req.params.selectedEvent);

            const responses_dir = `${__dirname}/events/${selectedEvent}/formresponses`;
            const response_path = `${responses_dir}/${userId}.json`;

            if (fs.existsSync(response_path)) {
                const response_data = JSON.parse(fs.readFileSync(response_path));
                const decoded_data = Object.keys(response_data).reduce((acc, key) => {
                    const value = response_data[key];
                    const decodedValue = typeof value === 'string' ? decodeURIComponent(value) : value;
                    acc[key] = decodedValue;
                    return acc;
                }, {});

                res.json({ evId: selectedEvent, success: true, response: decoded_data });
            } else {
                res.json({ success: false, message: 'Encara no has enviat el formulari.' });
            }
        });

        socket.on('.request_form_responses', (selectedEvent) => {
            const responses = getResponses(selectedEvent);
            socket.emit('.form_responses', {['responses']: responses, ['evId']: selectedEvent});
        });

        socket.on('.request_google_sheet_url', (selectedEvent) => {
            const spreadsheetId = getSpreadsheetId(selectedEvent);
            if (spreadsheetId) {
                const sheetUrl = getURLFromId(spreadsheetId);
                socket.emit('.google_sheet_url_received', sheetUrl);
            } else {
                socket.emit('.google_sheet_url_received', null);
            }
        });
  
        socket.on('.delete_form', selectedEvent => {
            const form_path = `${__dirname}/events/${selectedEvent}/form.json`;
            const responses_dir = `${__dirname}/events/${selectedEvent}/formresponses`;

            if (fs.existsSync(form_path)) {
                fs.unlinkSync(form_path);
            }

            if (fs.existsSync(responses_dir)) {
                fs.rmdirSync(responses_dir, { recursive: true });
            }

            // Delete the associated Google Sheet
            const spreadsheetId = getSpreadsheetId(selectedEvent);

            if (spreadsheetId) {
                const correspondances = fs.readFileSync(`${__dirname}/forms/sheetsId.json`);
                const correspondancesJson = JSON.parse(correspondances);
                delete correspondancesJson[selectedEvent];
                fs.writeFileSync(`${__dirname}/forms/sheetsId.json`, JSON.stringify(correspondancesJson));

                deleteGoogleSheet(spreadsheetId)
                    .then(() => io.emit('.form_deleted', { evId: selectedEvent, success: true }))
                    .catch((err) => console.error('Error deleting Google Sheet:', err));
            } else {
                io.emit('.form_deleted', { evId: selectedEvent, success: true });
            }
        })

        // server-side code (add this inside the `io.on('connection', socket => { ... })` block)

        socket.on('.share_google_sheet', async (selectedEvent, emails) => {
            const spreadsheetId = getSpreadsheetId(selectedEvent);
        
            if (spreadsheetId) {
                try {
                    // Share the Google Sheet with each email in the list
                    const sharePromises = emails.map(email => shareGoogleSheetWithEmail(spreadsheetId, email, 'writer'));
                    await Promise.all(sharePromises);
            
                    socket.emit('.google_sheet_shared', { success: true });
                } catch (error) {
                    console.error('Error sharing Google Sheet:', error);
                    socket.emit('.google_sheet_shared', { success: false, message: 'Error sharing Google Sheet.' });
                }
            } else {
                socket.emit('.google_sheet_shared', { success: false, message: 'No Google Sheet found for the selected event.' });
            }
        });
  
        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });
};
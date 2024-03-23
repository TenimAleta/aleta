module.exports.build = (app, io, fs, emit_query, execute_query) => {
    const md5 = require("md5");
    const path = require('path');
    const xlsx = require('xlsx');

    const generate_default_password = user => md5(`default.${user.nom}.${user['primer-cognom']}`).slice(0,8)
    const credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));
    const colla = credentials.colla;

    const all_users = "SELECT * FROM castellers";
    const create_user = user => `INSERT INTO castellers (nom, \`primer-cognom\`, \`segon-cognom\`, mote, altura, altura_mans, es_tecnica, es_junta, canalla, music, extern, lesionat, novell, md5pass) VALUES ("${user.nom}", "${user['primer-cognom']}", "${user['segon-cognom']}", "${user.mote}", ${!isNaN(user.altura) ? user.altura : 'NULL'}, ${!isNaN(user.altura_mans) ? user.altura_mans : 'NULL'}, ${!isNaN(user.tecnica) ? user.tecnica : 0}, ${!isNaN(user.junta) ? user.junta : 0}, ${user?.canalla ? 1 : 0}, ${user?.music ? 1 : 0}, ${user?.extern ? 1 : 0}, ${user?.lesionat ? 1 : 0}, ${user?.novell ? 1 : 0}, "${md5(generate_default_password(user))}")`;
    const edit_user = user => `UPDATE castellers SET nom="${user.nom}", \`primer-cognom\`="${user['primer-cognom']}", \`segon-cognom\`="${user['segon-cognom']}", mote="${user.mote}", altura=${!isNaN(user.altura) ? user.altura : 'NULL'}, altura_mans=${!isNaN(user.altura_mans) ? user.altura_mans : 'NULL'}, hidden=${user.hidden}, es_tecnica=${user.tecnica}, es_junta=${user.junta}, canalla=${user.canalla}, music=${user?.music ? 1 : 0}, extern=${user?.extern ? 1 : 0}, lesionat=${user?.lesionat ? 1 : 0}, novell=${user?.novell ? 1 : 0} WHERE id=${user.id}`;
    const delete_user = user => `DELETE FROM castellers WHERE id=${user.id}`;
    const reload_password = user => `UPDATE castellers SET md5pass=NULL, expo_push_token=NULL WHERE id=${user.id}`;

    const create_etiqueta = nom => `INSERT INTO etiquetes (nom) VALUES ("${nom}")`;
    const delete_etiqueta = id => `DELETE FROM etiquetes WHERE id=${id}`;
    const add_etiqueta = (user, etiqueta) => `INSERT IGNORE INTO casteller_etiqueta (\`casteller-id\`, \`etiqueta-id\`) VALUES (${user}, ${etiqueta})`;
    const drop_etiqueta = (user, etiqueta) => `DELETE FROM casteller_etiqueta WHERE \`casteller-id\`=${user} AND \`etiqueta-id\`=${etiqueta}`;
    const get_etiquetes = (user) => `SELECT * FROM etiquetes WHERE id IN (SELECT \`etiqueta-id\` FROM casteller_etiqueta WHERE \`casteller-id\`=${user})`;
    const list_etiquetes = `SELECT * FROM etiquetes`;
    const list_etiqueta_users = etiqueta => `SELECT * FROM castellers WHERE id IN (SELECT \`casteller-id\` FROM casteller_etiqueta WHERE \`etiqueta-id\`=${etiqueta})`;

    app.get('/api/etiquetes', (req, res) => {
        execute_query(list_etiquetes, result => res.json(result));
    });

    app.get('/api/etiquetes/:user', (req, res) => {
        const user = req.params.user;

        execute_query(
            get_etiquetes(user),
            result => res.json(result)
        );
    });

    app.get('/api/etiqueta_users/:etiqueta', (req, res) => {
        const etiqueta = req.params.etiqueta;

        execute_query(
            list_etiqueta_users(etiqueta),
            result => res.json(result)
        );
    });

    app.post('/api/add_etiqueta', (req, res) => {
        const user = req.body.user;
        const etiqueta = req.body.etiqueta;

        execute_query(
            add_etiqueta(user, etiqueta),
            result => res.json(result)
        );
    });

    app.post('/api/drop_etiqueta', (req, res) => {
        const user = req.body.user;
        const etiqueta = req.body.etiqueta;

        execute_query(
            drop_etiqueta(user, etiqueta),
            result => res.json(result)
        );
    });

    app.post('/api/create_etiqueta', (req, res) => {
        const nom = req.body.nom;

        execute_query(
            create_etiqueta(nom),
            result => res.json(result)
        );

        io.emit('.etiqueta_created', nom);
    });

    app.post('/api/delete_etiqueta', (req, res) => {
        const id = req.body.id;

        execute_query(
            delete_etiqueta(id),
            result => res.json(result)
        );

        io.emit('.etiqueta_deleted', id);
    });

    app.get('/api/download-template', (req, res) => {
        const filePath = path.join(__dirname, 'excel-template.xlsx');
        res.download(filePath, 'Plantilla Aleta.xlsx');
    });

    const send_welcome_mail = (data) => {
        const AWS = require('aws-sdk');
        const accessKeys = require('./aws.credentials.json');
        const ses = new AWS.SES({
            accessKeyId: accessKeys.accessKeyId,
            secretAccessKey: accessKeys.secretAccessKey,
            region: accessKeys.region,
            apiVersion: '2010-12-01',
        });

        const default_password = generate_default_password({
            nom: data['Nom'],
            'primer-cognom': data['Primer cognom'],
            'segon-cognom': data['Segon cognom'],
            mote: data['Sobrenom'],
        })

        const params = {
            Destination: {
                ToAddresses: [data['Mail']],
            },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: `Hola ${data['Nom']},<br>La teva contrasenya per l'Aleta és: ${default_password}.<br><br>Parla amb tècnica si no pots entrar correctament i ells t'ajudaran.<br><br>Benvingut/da a l'Aleta!`
                    },
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'La teva contrasenya per l\'Aleta (' + colla.toUpperCase() + ')',
                }
            },
            Source: 'hola@tenimaleta.com',
        };

        ses.sendEmail(params, (err, mail_data) => {
            if (err) {
                console.error(err, err.stack);
            } else {
                console.log("Sent email to " + data['Mail']);
            }
        });
        
    }

    io.on('connection', socket => {
        socket.on('.request_users', () => emit_query(socket, '.users', all_users));

        socket.on('.create_etiqueta', nom => emit_query(io, '.etiqueta_created', create_etiqueta(nom)));
        socket.on('.delete_etiqueta', id => emit_query(io, '.etiqueta_deleted', delete_etiqueta(id)));
        socket.on('.add_etiqueta', (user, etiqueta) => emit_query(io, '.etiqueta_added', add_etiqueta(user, etiqueta)));
        socket.on('.drop_etiqueta', (user, etiqueta) => emit_query(io, '.etiqueta_dropped', drop_etiqueta(user, etiqueta)));

        socket.on('.edit_user', user => emit_query(socket, '.user_change', edit_user(user)));
        socket.on('.create_user', user => emit_query(socket, '.user_change', create_user(user)));
        socket.on('.delete_user', user => emit_query(socket, '.user_change', delete_user(user)));
        socket.on('.reload_password', user => emit_query(socket, '.password_reloaded', reload_password(user)));

        socket.on('.upload_excel', async (base64Excel) => {
            // Convert base64 to buffer
            const buffer = Buffer.from(base64Excel.split(",")[1], "base64");
            
            // Parse the Excel file
            const workbook = xlsx.read(buffer, { type: "buffer" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = xlsx.utils.sheet_to_json(worksheet);
            
            // const expectedHeaders = ['Nom', 'Primer cognom', 'Segon cognom', 'Sobrenom', 'Altura espatlles'];
            let insert_queries = []

            for (let row of rows) {
                // Access values using the header names
                const nom = row['Nom'] !== undefined ? row['Nom'] : null
                const primerCognom = row['Primer cognom'] !== undefined ? row['Primer cognom'] : null
                const segonCognom = row['Segon cognom'] !== undefined ? row['Segon cognom'] : null
                const sobrenom = row['Sobrenom'] !== undefined ? row['Sobrenom'] : null
                const alturaEspatlles = row['Altura espatlles'] !== undefined ? row['Altura espatlles'] : null
                const mail = row['Mail'] !== undefined ? row['Mail'] : null

                const default_password = md5(`default.${nom}.${primerCognom}`).slice(0,8)

                const query = `INSERT INTO castellers (nom, \`primer-cognom\`, \`segon-cognom\`, mote, altura, mail, md5pass) VALUES ("${nom}", "${primerCognom}", "${segonCognom}", "${sobrenom}", ${alturaEspatlles}, "${mail}", "${md5(default_password)}") ON DUPLICATE KEY UPDATE mote="${sobrenom}", altura=${alturaEspatlles}, mail="${mail}"`;
                insert_queries.push(query)
            }

            if (insert_queries.length > 0) emit_query(socket, '.excel_uploaded', insert_queries.join(';'))

            for (let row of rows) {
                if (row['Mail'] !== undefined) {
                    send_welcome_mail(row)
                }
            }
        })

        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });
};
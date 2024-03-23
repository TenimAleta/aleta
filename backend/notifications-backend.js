module.exports.build = (app, io, fs, emit_query, execute_query, escape) => {
    const cron = require('node-cron');
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

    const credentials = JSON.parse(fs.readFileSync('../db.credentials.json'));

    const set_token = (user, token) => `UPDATE castellers SET expo_push_token='${token}' WHERE id=${user}`;
    const get_user = (user) => `SELECT * FROM castellers WHERE id=${user}`;
    const save_notification = ({ expo_token, user, title, body, notification_id, data, author }) => `INSERT INTO notifications (\`target_token\`, \`target\`, \`title\`, \`body\`, \`notification_id\`, \`data\`, \`author\`) VALUES ('${expo_token}', ${user}, ${title ? `${escape(title)}` : 'NULL'}, ${body ? `${escape(body)}` : 'NULL'}, '${notification_id}', '${data}', ${author})`;

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

    // Remember users to confirm unconfirmed events
    const remember_no_confirmats = require('./notifications/remember.js')
    cron.schedule('32 18 * * Sat', () => remember_no_confirmats.remember(execute_query, sendPushNotification));

    io.on('connection', socket => {
        socket.on('.set_push_token', (user, token) => emit_query(socket, '.token_set', set_token(user, token)))
        socket.on('.remember_all', () => remember_no_confirmats.remember(execute_query, sendPushNotification));
        socket.on('.send_notification', message => sendPushNotification(message))
        socket.on('.send_notification_to_user', (userid, message, save=true) => emit_query(socket, '.get_user', get_user(userid), data => {
            if (data.length > 0) sendPushNotification2User(data[0], message, save)
        }))

        // PART DE PAGAMENTS

        socket.on('.set_pagament_status', (castellerId, prodId, status) => {
            const query = `INSERT INTO pagaments (\`casteller-id\`, \`producte-id\`, status) VALUES (${castellerId}, '${prodId}', '${status}')`;
            emit_query(io, '.pagament_status_set', query, data => ({
                'casteller-id': castellerId,
                'producte-id': prodId,
                'status': status,
            }))
        })

        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });

    app.get('/api/notifications', (req, res) => {
        const query = `SELECT * FROM notifications`;

        execute_query(query, data => {
            res.json(data);
        })
    });

    // PART DE PAGAMENTS

    app.get('/api/pagaments/:eventId/:userId', (req, res) => {
        const eventId = req.params.eventId;
        const userId = req.params.userId;

        const query = `
            SELECT p.*, prod.nom AS productName, prod.preu AS productPrice, prod.descripcio AS productDescription, 
                prod.tipus AS productType, prod.\`event-id\` AS eventId, prod.createdAt AS productCreatedAt
                FROM \`pagaments\` p
                INNER JOIN (
                    SELECT prod.id AS prodId, MAX(p.id) AS maxPaymentId
                    FROM \`pagaments\` p
                    INNER JOIN \`productes\` prod ON p.\`producte-id\` = prod.id
                    WHERE prod.\`event-id\` = '${eventId}'
                    AND p.\`casteller-id\` = '${userId}'
                    GROUP BY p.\`producte-id\`
                ) AS latestPayments ON p.id = latestPayments.maxPaymentId
                INNER JOIN \`productes\` prod ON p.\`producte-id\` = prod.id
                WHERE prod.\`event-id\` = '${eventId}'
                AND p.\`casteller-id\` = '${userId}';
        `;

        execute_query(query, data => {
            res.json(data);
        })
    });

    app.get('/api/pagaments/:prodId', (req, res) => {
        const prodId = req.params.prodId;
        const query = `
            SELECT 
                c.id, c.mote, c.nom, c.\`primer-cognom\` AS cognom, c.altura, 
                c.hidden, c.canalla, c.lesionat, c.music, c.extern, c.novell, 
                (c.expo_push_token IS NOT NULL) AS has_notifications,
                p.*
            FROM castellers c 
            LEFT JOIN (
                SELECT *
                FROM \`pagaments\` 
                WHERE \`producte-id\` = '${prodId}' 
                AND (\`casteller-id\`, \`id\`) IN (
                    SELECT \`casteller-id\`, MAX(\`id\`)
                    FROM \`pagaments\` WHERE \`producte-id\` = '${prodId}'
                    GROUP BY \`casteller-id\`
                )
            ) AS p ON c.id = p.\`casteller-id\`;
        `;

        execute_query(query, data => {
            res.json(data);
        })
    });

    // app.get('/api/pagaments/:prodId/:user', (req, res) => {
    //     const prodId = req.params.prodId;
    //     const user = req.params.user;

    //     const query = `
    //         SELECT *
    //         FROM \`pagaments\` 
    //         WHERE \`producte-id\` = '${prodId}'
    //         AND \`casteller-id\` = '${user}'
    //         AND (\`casteller-id\`, \`id\`) IN (
    //             SELECT \`casteller-id\`, MAX(\`id\`)
    //             FROM \`pagaments\` WHERE \`producte-id\` = '${prodId}'
    //             GROUP BY \`casteller-id\`
    //         );
    //     `;

    //     execute_query(query, data => {
    //         res.json(data?.[0] || { status: 'notfound' });
    //     });
    // });

    app.get('/api/producte/:prodId', (req, res) => {
        const prodId = req.params.prodId;
        const query = `SELECT * FROM productes WHERE id=${prodId}`;

        execute_query(query, data => {
            res.json(data?.[0] || { status: 'notfound' });
        })
    });

    app.get('/api/productes/:eventId', (req, res) => {
        const eventId = req.params.eventId;
        const query = `SELECT * FROM productes WHERE \`event-id\`=${eventId}`;

        execute_query(query, data => {
            res.json(data);
        })
    });

    app.get('/api/productes', (req, res) => {
        const query = `SELECT * FROM productes`;

        execute_query(query, data => {
            res.json(data);
        })
    });
};
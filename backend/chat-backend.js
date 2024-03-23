module.exports.build = (io, fs, emit_query_w_values, execute_query, app) => {
    const moment = require('moment');

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

    const get_messages = "SELECT * FROM messages WHERE event = ? AND castell = ? AND versio = ? ORDER BY data ASC";
    const insert_message = "INSERT INTO messages (user, content, castell, event, versio, data) VALUES (?, ?, ?, ?, ?, ?)";

    const add_resultat = "INSERT IGNORE INTO resultats (castell, event, versio, objectiu, resultat) VALUES (?, ?, ?, ?, ?); UPDATE resultats SET resultat = ?, objectiu = ? WHERE castell = ? AND event = ? AND versio = ?; SELECT * FROM resultats WHERE castell = ? AND event = ? AND versio = ?";
    const get_resultat = "SELECT * FROM resultats WHERE castell = ? AND event = ? AND versio = ?";
    
    app.get('/api/missatges/:event/:castell/:versio', authenticateAPIKey, (req, res) => {
        const { event, castell, versio } = req.params;

        const query_get_messages = `
            SELECT * FROM messages WHERE event='${event}' AND castell='${castell}' AND versio='${versio}' ORDER BY data ASC
        `;

        execute_query(query_get_messages, (result) => {
            res.json(result.map(message => {
                return {
                    id: message.id,
                    user: message.user,
                    content: decodeURIComponent(message.content),
                    castell: message.castell,
                    event: message.event,
                    versio: message.versio,
                    data: message.data,
                }
            }));
        });
    });

    app.get('/api/resultats/:event/:castell/:versio', authenticateAPIKey, (req, res) => {
        const { event, castell, versio } = req.params;

        const query_get_resultat = `
            SELECT * FROM resultats WHERE event='${event}' AND castell='${castell}' AND versio='${versio}'
        `;

        execute_query(query_get_resultat, (result) => {
            res.json(result.map(resultat => {
                return {
                    castell: resultat.castell,
                    event: resultat.event,
                    versio: resultat.versio,
                    objectiu: resultat.objectiu,
                    resultat: resultat.resultat,
                }
            }));
        });
    });

    io.on('connection', socket => {
        socket.on('.add_resultat', ({ castell, event, versio, objectiu, resultat }) => {
            emit_query_w_values(
                socket.broadcast,
                '.new_resultat',
                add_resultat,
                [
                    castell, event, versio, objectiu, resultat,
                    resultat, objectiu, castell, event, versio,
                    castell, event, versio
                ],
                () => ({ castell, event, versio, objectiu, resultat })
            );
        });

        socket.on('.enter_chat', (data) => {
            socket.join(`chat.${data.event}.${data.castell}.${data.versio}`);
            emit_query_w_values(
                io.to(`chat.${data.event}.${data.castell}.${data.versio}`),
                '.new_messages',
                get_messages,
                [data.event, data.castell, data.versio], (result) => {
                    return result.map(message => {
                        return {
                            id: message.id,
                            user: message.user,
                            content: decodeURIComponent(message.content),
                            castell: message.castell,
                            event: message.event,
                            versio: message.versio,
                            data: message.data,
                        }   
                    })
                }
            )
        });

        socket.on('.leave_chat', (data) => {
            socket.leave(`chat.${data.event}.${data.castell}.${data.versio}`);
        });

        socket.on('.send_messages', (messages) => {
            messages.forEach(message => {
                const date = new Date();
                const timestamp = date.toISOString().slice(0, 19).replace('T', ' ');
                const encodedContent = encodeURIComponent(message.content);

                emit_query_w_values(
                    io.to(`chat.${message.event}.${message.castell}.${message.versio}`),
                    '.new_messages',
                    insert_message,
                    [message.user, encodedContent, message.castell, message.event, message.versio, timestamp],
                    (result) => {
                        const messageToReturn = {
                            id: result.id,
                            user: message.user,
                            content: message.content,
                            castell: message.castell,
                            event: message.event,
                            versio: message.versio,
                            data: moment().toDate(),
                        };

                        return [messageToReturn];
                    }
                );
            });
        });

        socket.on('.delete_message', (message) => {
            emit_query_w_values(
                io.to(`chat.${message.event}.${message.castell}.${message.versio}`),
                '.deleted_message',
                "DELETE FROM messages WHERE id = ?",
                [message.id],
                () => message
            );
        });

        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });
};
module.exports.build = (io, fs, emit_query) => {
    const get_anuncis = "SELECT * FROM anuncis";

    io.on('connection', socket => {
        socket.on('.request_anuncis', () => emit_query(socket, '.anuncis', get_anuncis))

        // socket.on('disconnect', () => {
        //     socket.removeAllListeners();
        // });
    });
};
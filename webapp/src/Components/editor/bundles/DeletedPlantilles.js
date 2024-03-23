import { useState } from "react";
import { useEffect } from "react";
import moment from 'moment';

function DeletedPlantilles({ socket }) {
    const [deletedPlantilles, setDeletedPlantilles] = useState([]);
    const [showDeletedPlantilles, setShowDeletedPlantilles] = useState(false);

    useEffect(() => {
        socket.emit('.request_deleted_plantilles');

        socket.on('.deleted_plantilles', (data) => setDeletedPlantilles(data));
        socket.on('.deleted_plantilla', () => socket.emit('.request_deleted_plantilles'));

        socket.on('.deleted_forever_plantilla', () => socket.emit('.request_deleted_plantilles'))
        socket.on('.restored_plantilla', () => {
            socket.emit('.request_deleted_plantilles')
            socket.emit('.request_plantilles')
        });

        return () => {
            socket.off('.deleted_plantilles');
            socket.off('.deleted_plantilla');
            socket.off('.deleted_forever_plantilla');
            socket.off('.restored_plantilla');
        }
    }, []);

    return !showDeletedPlantilles ? (
        <div>
            <h3>Plantilles eliminades</h3>
            <button
                onClick={() => setShowDeletedPlantilles(true)}
            >
                Mostrar plantilles eliminades
            </button>
        </div>
    ) : (
        <div>
            <h3>Plantilles eliminades</h3>
            <button
                onClick={() => setShowDeletedPlantilles(false)}
            >
                Amagar plantilles eliminades
            </button>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {
                    deletedPlantilles.map(plantilla => (
                        <div
                            key={plantilla.filename}
                            style={{
                                margin: 10,
                                padding: 10,
                                border: '1px solid black',
                                borderRadius: 5,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <div
                            >
                                <strong>{plantilla.nom}</strong>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: 5,
                                }}
                            >
                                <span>
                                    Eliminada el
                                </span>
                                <span>
                                    {moment(parseInt(plantilla.timestamp)).format('DD/MM/YYYY HH:mm:ss')}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: 15,
                                }}
                            >
                                <button
                                    onClick={() => {
                                        socket.emit('.restore_plantilla', plantilla.filename, plantilla.nom);
                                    }}
                                >
                                    Restaurar
                                </button>

                                <button
                                    onClick={() => {
                                        socket.emit('.delete_forever_plantilla', plantilla.filename);
                                    }}
                                    style={{
                                        backgroundColor: 'lightcoral',
                                    }}
                                >
                                    Eliminar per sempre
                                </button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}

export default DeletedPlantilles;
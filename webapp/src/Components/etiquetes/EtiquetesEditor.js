import { useEffect, useState } from "react";
import { fetchAPI, postAPI } from "../../utils/utils";

function EtiquetesEditor({ allEtiquetes, setAllEtiquetes }) {
    const create_etiqueta = (force_nom=null) => {
        const nom = force_nom ? force_nom : prompt('Nom de l\'etiqueta:');
        if (nom) {
            postAPI(
                '/create_etiqueta',
                { nom },
                () => fetchAPI('/etiquetes', setAllEtiquetes),
            );
        }
    }

    const delete_etiqueta = ({ id }) => {
        postAPI(
            '/delete_etiqueta',
            { id },
            () => fetchAPI('/etiquetes', setAllEtiquetes),
        );
    }

    return (
        <div>
            <h2>Edita les etiquetes</h2>

            <div className="etiquetes-editor">
                <div className="etiquetes-list">
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                        }}
                    >
                        {
                            allEtiquetes.map(etiqueta => (
                                <div
                                    key={etiqueta.id}
                                    className="etiqueta"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        margin: 10,
                                        padding: 10,
                                        borderRadius: 5,
                                        backgroundColor: '#eee',
                                        gap: 5,
                                    }}
                                >
                                    <span>{etiqueta.nom}</span>
                                    <button onClick={() => delete_etiqueta(etiqueta)}>x</button>
                                </div>
                            ))
                        }
                    </div>

                    <button onClick={() => create_etiqueta()}>Crea una nova etiqueta</button>
                </div>
            </div>
        </div>
    )
}

export default EtiquetesEditor;
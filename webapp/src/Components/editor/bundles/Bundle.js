import { useState } from "react";
import { useEffect } from "react";
import moment from "moment";

function Bundle({ bundle, socket, duration, changeDuration }) {
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState(bundle?.nom);
    const [newSubtitol, setNewSubtitol] = useState(bundle?.subtitol);
    const [newShortName, setNewShortName] = useState(bundle?.shortName);
    const [hidden, setHidden] = useState(bundle?.hidden);

    const [newDuration, setNewDuration] = useState(0);

    const [availablePlantilles, setAvailablePlantilles] = useState([]);
    const [availableBundles, setAvailableBundles] = useState([]);

    const [allParts, setAllParts] = useState({
        'Pinya': '',
        'Folre': '',
        'Manilles': '',
        'Puntals': '',
        'Tronc': '',
        'Organització': '',
    });

    const partsWithPlantilla = Object.fromEntries(
        Object.entries(allParts)
            .filter(([part, plantilla]) => plantilla)
    )

    const partsAreChanged = JSON.stringify(bundle?.parts) !== JSON.stringify(partsWithPlantilla);

    useEffect(() => {
        setNewDuration(duration);
    }, [duration]);

    useEffect(() => {
        Object.keys(bundle?.parts || {}).forEach(part => {
            bundle.parts[part] && setAllParts(prevParts => ({
                ...prevParts,
                [part]: bundle.parts[part],
            }));
        });
    }, [bundle]);

    useEffect(() => {
        socket.emit('.request_plantilles')
        socket.emit('.request_bundles')

        socket.on('.plantilles', (data) => setAvailablePlantilles(data));
        socket.on('.bundles', (data) => setAvailableBundles(
            data
                .filter(b => b?.hidden !== true)
                .filter(b => !b.simultani)
                .sort((a,b) => a.nom.localeCompare(b.nom))
        ));

        return () => {
            socket.off('.plantilles');
            socket.off('.bundles');
        }
    }, [socket]);

    return editing ? (
        <div
            key={bundle.id}
            style={{
                borderRadius: 5,
                padding: 10,
                margin: 10,
                backgroundColor: '#eee',
                width: 250,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                }}
            >
                <button
                    onClick={() => {
                        setEditing(false);

                        if (partsAreChanged) {
                            socket.emit('.edit_bundle', {
                                id: bundle.id,
                                hidden: true,
                                superseeded: true,
                            });

                            socket.emit('.duplicate_bundle', bundle.id, {
                                nom: newName,
                                subtitol: newSubtitol,
                                shortName: newShortName,
                                hidden: false,
                                superseeded: false,
                                parts: partsWithPlantilla,
                            })

                            socket.emit('.edit_duration', bundle.id, newDuration)
                        } else {
                            socket.emit('.edit_bundle', {
                                id: bundle.id,
                                nom: newName,
                                subtitol: newSubtitol,
                                shortName: newShortName,
                            });

                            socket.emit('.edit_duration', bundle.id, newDuration)
                        }
                    }}
                >
                    Guardar
                </button>

                <button
                    onClick={() => {
                        setEditing(false);
                        setNewName(bundle.nom);
                        setNewSubtitol(bundle.subtitol);
                        setHidden(bundle.hidden);
                        setNewShortName(bundle.shortName);
                        setNewDuration(0);
                    }}
                    style={{
                        backgroundColor: '#333',
                        color: '#fff',
                    }}
                >
                    Cancel·lar
                </button>
            </div>

            <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nom de la prova"
                style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    width: '100%',
                }}
            />

            <input
                type="text"
                value={newShortName}
                onChange={e => setNewShortName(e.target.value)}
                placeholder="Nom curt de la prova (td9fm, 4d9f, ...)"
                style={{
                    fontSize: 16,
                    width: '100%',
                }}
            />

            <input
                type="text"
                value={newSubtitol}
                onChange={e => setNewSubtitol(e.target.value)}
                placeholder="(Privat) Descripció de la prova"
                style={{
                    fontSize: 16,
                    width: '100%',
                }}
            />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <span>Duració:</span>
                <input
                    type="number"
                    value={newDuration}
                    onChange={e => {
                        const num = parseInt(e.target.value);
                        setNewDuration(num);
                    }}
                    style={{
                        width: 50,
                    }}
                />
                <span>minuts</span>
            </div>

            <div>
                {
                    Object.keys(allParts)
                        .map((part, index) => (
                            <div
                                key={part}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                }}
                            >
                                <span>{part}</span>
                                <select
                                    value={allParts?.[part]}
                                    onChange={e => {
                                        setAllParts({
                                            ...allParts,
                                            [part]: e.target.value,
                                        });
                                    }}
                                >
                                    <option value="">--</option>
                                    {
                                        Object.entries(availablePlantilles)
                                            .map(([part, plantilla]) => (
                                                <option
                                                    key={part}
                                                    value={plantilla}
                                                >
                                                    {plantilla}
                                                </option>
                                            ))
                                    }
                                </select>
                            </div>
                        ))
                }
            </div>
        </div>
    ) : (
        <div
            key={bundle.id}
            id={bundle.id}
            style={{
                width: 250,
                borderRadius: 10,
                padding: 20,
                margin: 10,
                backgroundColor: '#eee',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
            }}
        >
            <div>
                <button
                    onClick={() => setEditing(true)}
                >
                    📝
                </button>

                <button
                    onClick={() => {
                        socket.emit('.edit_bundle', {
                            id: bundle.id,
                            hidden: !bundle.hidden
                        });
                    }}
                    style={{
                        backgroundColor: bundle.hidden ? '#333' : '#777',
                        color: '#fff',
                    }}
                >
                    {bundle.hidden ? 'Mostrar' : 'Amagar'}
                </button>
            </div>

            <div>
                <h3>{bundle.nom}</h3>
                <p style={{ color: '#aaa' }}>{bundle.shortName}</p>
                {/* { bundle?.superseeded && bundle?.hidden && <p style={{ fontSize: 12 }}>(S'ha afegit, eliminat o canviat una de les seves parts.)</p> } */}
                { bundle.subtitol && <p style={{ fontSize: 12 }}>{bundle.subtitol}</p> }

                {
                    duration ? (
                        <div
                            style={{
                                marginBottom: 10,
                                textAlign: 'center',
                            }}
                        >
                            {duration} minuts
                        </div>
                    ) : (
                        <div
                            style={{
                                marginBottom: 10,
                                textAlign: 'center',
                            }}
                        >
                            <em>No té minuts posats</em>
                        </div>
                    )
                }

                <div>
                    {
                        Object.entries(bundle?.parts || {})
                            .map(([part, plantilla]) => (
                                <div
                                    key={part}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                    }}
                                >
                                    <span>{part}</span>
                                    <a href={`/editor/${plantilla}`}>{plantilla}</a>
                                </div>
                            ))
                    }
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                }}
            >
                <a
                    href={`/editor/bundle/${bundle.id}`}
                    style={{
                        backgroundColor: '#333',
                        padding: 10,
                        color: '#fff',
                        borderRadius: 5,
                        textDecoration: 'none',
                    }}
                >
                    Edita la prova
                </a>
            </div>

            <div
                style={{
                    fontSize: 10,
                }}
            >
                {
                    (bundle?.updatedAt || bundle?.createdAt) && (
                        'Última modificació: ' +
                        (
                            bundle?.updatedAt ? moment(bundle.updatedAt).format('DD/MM/YYYY HH:mm') :
                            bundle?.createdAt ? moment(bundle.createdAt).format('DD/MM/YYYY HH:mm') :
                            ''
                        )
                    )
                }
            </div>
        </div>
    )
}

export default Bundle;
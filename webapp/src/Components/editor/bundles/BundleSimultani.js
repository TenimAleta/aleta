import { useState } from "react";
import { useEffect } from "react";

function BundleSimultani({ bundle, socket }) {
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState(bundle?.nom);
    const [newSubtitol, setNewSubtitol] = useState(bundle?.subtitol);
    const [newShortName, setNewShortName] = useState(bundle?.shortName);
    const [hidden, setHidden] = useState(bundle?.hidden);

    return editing ? (
        <div
            key={bundle.id}
            style={{
                borderRadius: 5,
                padding: 10,
                margin: 10,
                backgroundColor: '#eee',
                maxWidth: 250,
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
                        socket.emit('.edit_bundle', {
                            id: bundle.id,
                            nom: newName,
                            subtitol: newSubtitol,
                            shortName: newShortName,
                        });
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

            <div>
                {
                    Object.entries(bundle.bundles)
                        .map(([part_id, bundle], i) => (
                            <div
                                key={part_id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                }}
                            >
                                <span>Castell {i+1}</span>
                                <a href={`/editor/bundle/${bundle.id}`}>{bundle.nom}</a>
                            </div>
                        ))
                }
            </div>
        </div>
    ) : (
        <div
            key={bundle.id}
            style={{
                borderRadius: 5,
                padding: 10,
                margin: 10,
                backgroundColor: '#eee',
                display: 'flex',
                flexDirection: 'column',
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
                { bundle.subtitol && <p style={{ fontSize: 12 }}>{bundle.subtitol}</p> }

                <div>
                    {
                        Object.entries(bundle.bundles)
                            .map(([part_id, bundle], i) => (
                                <div
                                    key={part_id}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                    }}
                                >
                                    <span>Castell {i+1}</span>
                                    <a href={`/editor/bundle/${bundle.id}`}>{bundle.nom}</a>
                                </div>
                            ))
                    }
                </div>
            </div>

            {/* <div
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
            </div> */}
        </div>
    )
}

export default BundleSimultani;
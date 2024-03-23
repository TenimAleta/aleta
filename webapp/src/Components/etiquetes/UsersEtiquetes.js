import { useEffect, useState } from "react";
import { fetchAPI, postAPI } from "../../utils/utils";
import Select from 'react-select';

function Etiqueta({
    etiqueta,
    usersEtiquetes,
    setUsersEtiquetes,
    castellersInfo,
    delete_etiqueta,
    displayName,
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const updateEtiquetaUsers = (etiquetaId, newSelectedUsers) => {
        const oldSelectedUsers = usersEtiquetes?.[etiquetaId] || [];
        const usersToAdd = newSelectedUsers?.filter(user => !oldSelectedUsers?.some(oldUser => oldUser.id === user.id)) || [];
        const usersToRemove = oldSelectedUsers?.filter(oldUser => !newSelectedUsers?.some(user => user.id === oldUser.id)) || [];

        setUsersEtiquetes({
            ...usersEtiquetes,
            [etiquetaId]: newSelectedUsers
        });

        usersToAdd.forEach(user => {
            postAPI(
                '/add_etiqueta',
                { user: user.id, etiqueta: etiquetaId },
                () => {},
            );
        });

        usersToRemove.forEach(user => {
            postAPI(
                '/drop_etiqueta',
                { user: user.id, etiqueta: etiquetaId },
                () => {},
            );
        });
    }

    const allOptions = Object.values(castellersInfo || {})
        .sort((a, b) => a.altura > b.altura ? 1 : -1)
        .map(user => ({
            value: user.id,
            label: displayName(user),
            color: 'black'
        }));

    return (
        <div
            key={etiqueta.id}
            className="etiqueta"
            style={{
                flexWrap: 'wrap',
                margin: 10,
                padding: 20,
                borderRadius: 5,
                backgroundColor: '#eee',
                gap: 5,
                width: 250,
                height: '100%',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <h3>{etiqueta.nom}</h3>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <button onClick={() => setIsCollapsed(!isCollapsed)}>{isCollapsed ? '+' : '-'}</button>
                    <button style={{ backgroundColor: '#ffaaaa' }} onClick={() => delete_etiqueta(etiqueta)}>🗑️</button>
                </div>
            </div>

            {
                isCollapsed && (
                    <span>Clica <strong>+</strong> per desplegar</span>
                )
            }

            {!isCollapsed && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 5,
                    }}
                >
                    <Select
                        isMulti
                        name="users"
                        options={allOptions}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        isClearable={false}
                        value={
                            usersEtiquetes?.[etiqueta.id]
                                ?.filter(user => user)
                                ?.map(user => ({
                                    value: user.id,
                                    label: displayName(user),
                                    color: 'black'
                                }))
                        }
                        onChange={(selectedOptions) => {
                            const selectedUserIds = selectedOptions
                                ?.map(option => option.value)
                                ?.map(id => castellersInfo?.[id])

                            updateEtiquetaUsers(etiqueta.id, selectedUserIds);
                        }}
                    />

                    {
                        usersEtiquetes?.[etiqueta.id]?.length === 0 && (
                            <span style={{ margin: 10 }}>No hi ha cap casteller amb aquesta etiqueta</span>
                        )
                    }
                </div>
            )}
        </div>
    )
}

function UsersEtiquetes({ allEtiquetes, setAllEtiquetes, castellersInfo }) {
    // List all users with their etiquetes
    const [usersEtiquetes, setUsersEtiquetes] = useState({});
    
    const displayName = user => {
        const { altura, nom, mote, canalla } = user;
        const cognom = user['primer-cognom'] || user.cognom;

        const canalla_part = canalla ? '👶' : '';
        const nom_part = mote ? mote : `${nom} ${cognom}`;
        const altura_part = altura !== null && !isNaN(altura) ? `(${altura})` : `(Sense altura)`;

        return `${canalla_part} ${nom_part} ${altura_part}`;
    }

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
        if (window.confirm(`Estàs segur que vols eliminar l'etiqueta "${allEtiquetes.find(e => e.id === id).nom}"?`)) {
            postAPI(
                '/delete_etiqueta',
                { id },
                () => fetchAPI('/etiquetes', setAllEtiquetes),
            );
        }
    }

    useEffect(() => {
        if (!allEtiquetes || !castellersInfo) return;

        allEtiquetes.forEach(etiqueta => {
            fetchAPI('/etiqueta_users/' + etiqueta.id, data => {
                setUsersEtiquetes(prev => ({
                    ...prev,
                    [etiqueta.id]: data
                        .map(user => castellersInfo?.[user.id]),
                }));
            });
        });
    }, [
        allEtiquetes,
        castellersInfo,
    ]);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Etiquetes</h2>
                <button onClick={() => create_etiqueta()}>Crea una nova etiqueta</button>
            </div>

            <div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-around',
                    }}
                >
                    {
                        allEtiquetes.map(etiqueta => (
                            <Etiqueta
                                key={etiqueta.id}
                                etiqueta={etiqueta}
                                usersEtiquetes={usersEtiquetes}
                                setUsersEtiquetes={setUsersEtiquetes}
                                castellersInfo={castellersInfo}
                                delete_etiqueta={delete_etiqueta}
                                displayName={displayName}
                            />
                        ))
                    }
                </div>
            </div>

            <h2 style={{ padding: '10px' }}>Persones sense etiqueta</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {
                    Object.values(castellersInfo || {})
                        .filter(user => !allEtiquetes.some(etiqueta => usersEtiquetes[etiqueta.id]?.some(etiquetaUser => etiquetaUser?.id === user?.id)))
                        .sort((a, b) => a.altura > b.altura ? 1 : -1)
                        .map(user => (
                            <div key={user.id} style={{ padding: '5px', margin: '5px', backgroundColor: '#eee', borderRadius: '5px', boxShadow: '0px 0px 5px rgba(0,0,0,0.1)' }}>
                                {displayName(user)}
                            </div>
                        ))
                }
            </div>
        </div>
    )
}

export default UsersEtiquetes;
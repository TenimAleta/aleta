import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../../utils/utils';
import { useRef } from 'react';

function UserSelect({ assistencies, selectedEvent, castellersInfo, userId, setUserId, isUserFitxat }) {
    const getName = data => `${data.nom} ${data.cognom}` + (data.mote ? ` (${data.mote})` : '')
    const searchableName = data => data.mote ? `${data.mote} ${data.nom} ${data.cognom}` : `${data.nom} ${data.cognom}`
    const stringNormalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const assistenciaEvent = assistencies[selectedEvent] || [];

    const isThisUserFitxat = user => assistenciaEvent.some(assist => assist.id === user.id && assist.assistencia === "Fitxat")

    const users = Object.values(castellersInfo || {})
        // .filter(user => user.es_tecnica || user.es_junta)
        .map(({ id, nom, cognom, mote }) => ({ id, nom, cognom, mote }))
        // .filter(user => !assistenciaEvent.some(assist => assist.id === user.id && assist.assistencia === "Fitxat"))

    const usersQueVenen = users
        .filter(user => !assistenciaEvent.some(assist => assist.id === user.id && assist.assistencia === "Fitxat"))
        .filter(user => assistenciaEvent.some(assist => assist.id === user.id && assist.assistencia === "Vinc"))

    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(true);

    const handleUserSelection = (user) => {
        setUserId(user.id);
        setSearchTerm(getName(user));
        setShowDropdown(false);
    };

    const clearSearchTerm = () => {
        setUserId(null);
        setSearchTerm('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && filteredUsers.length > 0) {
            handleUserSelection(filteredUsers[0]);
        }
        // else if (e.key === 'Backspace') {
        //     clearSearchTerm();
        // }
    };

    const getFilteredUsers = (search) => {
        return users.filter(user =>
            stringNormalize(searchableName(user)).toLowerCase().includes(search.toLowerCase())
        )

        let tempSearchTerm = search;
        let tempFilteredUsers = [];
    
        while (tempSearchTerm.length > 0) {
            tempFilteredUsers = users.filter(user =>
                stringNormalize(searchableName(user)).toLowerCase().includes(tempSearchTerm.toLowerCase())
            );
    
            if (tempFilteredUsers.length > 0) {
                break;
            }
    
            tempSearchTerm = tempSearchTerm.slice(0, -1);
        }
    
        return tempFilteredUsers;
    };
    
    const filteredUsers = (searchTerm ? getFilteredUsers(searchTerm) : usersQueVenen)
        .sort((a, b) => {
            const aName = stringNormalize(searchableName(a).replace(/[#\s]+/g, ''));
            const bName = stringNormalize(searchableName(b).replace(/[#\s]+/g, ''));
            return aName.localeCompare(bName);
        })
    
    const timeoutId = useRef(null);

    useEffect(() => {
        if (isUserFitxat) {
            timeoutId.current = setTimeout(() => {
                clearSearchTerm();
                setShowDropdown(true);
            }, 1000);
        }

        return () => clearTimeout(timeoutId.current);
    }, [
        isUserFitxat,
        selectedEvent,
    ]);


        return (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <input
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setShowDropdown(true);
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowDropdown(true)}
                        // onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        placeholder="Busca't a la llista"
                        style={{
                            width: 400,
                            padding: '12px 20px',
                            margin: '8px 0',
                            display: 'inline-block',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            fontSize: '16px',
                        }}
                    />

                    <button
                        onClick={clearSearchTerm}
                        style={{
                            padding: '12px 20px',
                            margin: '8px 8px',
                            fontSize: '16px',
                        }}
                    >
                        Esborra
                    </button>
                </div>
                {filteredUsers.length > 0 && showDropdown && (
                    <div
                        style={{
                            width: 600,
                            maxHeight: 300,
                            overflowY: 'scroll',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            fontSize: '16px',
                        }}
                    >
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                onClick={() => handleUserSelection(user)}
                                style={{
                                    padding: '12px 20px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #ccc',
                                    backgroundColor: isThisUserFitxat(user) ? '#d8f3f9' : 'white',
                                    fontSize: '16px',
                                    display: 'flex',
                                    gap: 5,
                                    alignItems: 'center',
                                }}
                            >
                                {isThisUserFitxat(user) && <span>📍</span>}
                                {getName(user)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
}

export default UserSelect;
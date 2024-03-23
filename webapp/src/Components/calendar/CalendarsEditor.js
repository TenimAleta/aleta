import React, { useState, useEffect } from 'react';
import { fetchAPI, postAPI } from '../../utils/utils';
import TutorialPopup from './tutorial/TutorialPopup';

function CalendarsEditor() {
    const [calendar, setCalendar] = useState({
        ids: [],
        calendar_targets: {}
    });
    const [closed, setClosed] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const allowedTargets = ['tècnica', 'junta', 'músics']; // Allowed target values

    useEffect(() => {
        fetchAPI('/calendar_keys', data => setCalendar(data));
    }, [
        editMode
    ]);

    const shortenEmail = (email) => {
        const [name, domain] = email.split('@');
        const lengthLimit = 20;

        if (name.length <= lengthLimit) {
            return email;
        }

        return `${name.slice(0, lengthLimit)}...@${domain}`;
    }

    const updateCalendar = () => {
        if (calendar.ids.some(id => id === '')) {
            alert('Assegureu-vos que cap ID de calendari estigui buit');
            return;
        }
        if (window.confirm('Esteu segurs que voleu guardar aquests canvis?')) {
            postAPI('/update_calendar_keys', { calendar }, () => {
                console.log('Calendar updated');
                window.location.reload();
            });
        }
    }

    const handleIdChange = (event, index) => {
        const newIds = [...calendar.ids];
        newIds[index] = event.target.value;
        setCalendar(prevState => ({ ...prevState, ids: newIds }));
    };

    const handleAddId = () => {
        setCalendar(prevState => ({
            ...prevState,
            ids: [...prevState.ids, '']
        }));
    };

    const handleRemoveId = (index) => {
        const newIds = [...calendar.ids];
        if (newIds[index] !== '') {
            if (window.confirm('Esteu segurs que voleu eliminar aquesta ID?')) {
                newIds.splice(index, 1);
                setCalendar(prevState => ({ ...prevState, ids: newIds }));
            }
        } else {
            newIds.splice(index, 1);
            setCalendar(prevState => ({ ...prevState, ids: newIds }));
        }
    };

    const handleTargetChange = (checked, key, target) => {
        const newTargets = { ...(calendar?.calendar_targets || {}) };
        if (checked) {
            // Add target if it's checked and not already added
            if (!newTargets[key]) {
                newTargets[key] = [target];
            } else if (!newTargets[key].includes(target)) {
                newTargets[key].push(target);
            }
        } else {
            // Remove target if it's unchecked
            newTargets[key] = newTargets[key].filter(t => t !== target);
        }
        setCalendar(prevState => ({ ...prevState, calendar_targets: newTargets }));
    };

    return (
        <div>
            <h2>Calendaris sincronitzats</h2>

            <div
                id="edit-calendars"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                }}
            >
                <button onClick={() => setEditMode(!editMode)}>
                    {editMode ? 'Cancel·lar' : 'Afegeix/Edita calendaris'}
                </button>

                {editMode &&
                    <a
                        href="#edit-calendars"
                        onClick={() => setClosed(false)}
                        style={{
                            fontSize: 12,
                            color: 'grey',
                            textDecoration: 'underline',
                        }}
                    >
                        Com afegir un calendari?
                    </a>
                }

                {editMode && <button onClick={updateCalendar}>Guardar</button>}
                <TutorialPopup show={!editMode} closed={closed} setClosed={setClosed} />
            </div>

            {calendar.ids.map((id, index) => (
                <div>
                    <div
                        key={index}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginTop: 10,
                            marginBottom: 10,
                        }}
                    >
                        <input 
                            type="text"
                            value={id}
                            placeholder='ID del calendari'
                            onChange={(e) => handleIdChange(e, index)}
                            disabled={!editMode}
                        />
                        {editMode && <button onClick={() => handleRemoveId(index)}>Borra</button>}
                    </div>

                    <div>
                        {(!calendar?.calendar_targets?.[id] || calendar?.calendar_targets?.[id]?.length === 0) && (
                            <div>
                                <input
                                    type="checkbox"
                                    checked={true}
                                    disabled={true}
                                />
                                Públic
                            </div>
                        )}
                        {allowedTargets.map(target => (
                            <div key={target}>
                                <input
                                    type="checkbox"
                                    checked={calendar?.calendar_targets?.[id]?.includes(target) || false}
                                    onChange={(e) => handleTargetChange(e.target.checked, id, target)}
                                    disabled={!editMode}
                                />
                                Privat, i {target} ho veuen
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {editMode && <div
                style={{
                    display: 'flex',
                    marginTop: 10,
                }}
            >
                <button style={{ flex: 1 }} onClick={handleAddId}>+ Afegir nou calendari</button>
            </div>}
        </div>
    );
}

export default CalendarsEditor;
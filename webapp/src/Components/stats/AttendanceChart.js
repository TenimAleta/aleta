import moment from 'moment';
import React, { useState } from 'react';
import { applyTimeZone } from '../interface/assistencia/LlistaAssistencies';

function EventInfo({ event, assist, clicked, setFiltersEvents }) {
    return event && assist && clicked > -1 && (
        <div className='event-info'>
            <div>
                <p><b>Acte:</b> {event.title}</p>
                <p><b>Data:</b> {moment(event['data-esperada-inici']).format('DD/MM/YYYY')}</p>
                <p><b>Assistència:</b> {assist}</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
                <button
                    onClick={() => {
                        setFiltersEvents(prev => ({
                            ...prev,
                            ['ids']: [...prev.ids, event.id],
                        }))
                    }}
                >
                    Amaga aquest acte
                </button>

                <button
                    onClick={() => {
                        setFiltersEvents(prev => ({
                            ...prev,
                            ['titles']: [...prev.titles, event.title],
                        }))
                    }}
                >
                    Amaga tots aquests actes
                </button>
            </div>
        </div>
    )
}

function AttendanceUser({ passatFirst, setFiltersEvents, user, attendanceDict, events, colorMap, getListOfAttendance, displayName, percentage_attendance, eventDisplayName }) {
    const [clicked, setClicked] = useState(-1)

    return (
        <div
            key={user}
            onClick={e => {
                if (e.target.className === 'quadradet') return
                if (e.target.className === 'event-info') return
                setClicked(-1)
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>{displayName(user)}</h3>

                <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                    <h3 style={{ color: passatFirst ? '#000' : '#ccc' }}>{percentage_attendance(user)['passat']}%</h3>
                    <h3 style={{ color: !passatFirst ? '#000' : '#ccc' }}>{percentage_attendance(user)['futur']}%</h3>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                {getListOfAttendance(user).map(d => {
                    const event = events.find(e => parseInt(e.id) === parseInt(d.eventId))
                    const eventDate = applyTimeZone(event['data-esperada-inici'])
                    const beforeNow = eventDate.isBefore(moment())

                    return (
                        <div
                            key={d.eventId}
                            className='quadradet'
                            style={{
                                backgroundColor:
                                    event.tipus !== 'activitat' ? (
                                        clicked === d.eventId ? 'black' :
                                        !beforeNow ? colorMap[d.status] :
                                        d.status === 'Vinc' || d.status === 'Fitxat' ? 'green' :
                                        'red'
                                    ) : 'transparent',
                                width: event.tipus === 'activitat' ? '0' : '25px',
                                height: event.tipus === 'activitat' ? '0' : '25px',
                                margin: '1px',
                                borderRadius:
                                    event.tipus === 'actuació' ? '50%' :
                                    event.tipus === 'activitat' ? '0%' :
                                    '0%',
                                opacity:
                                    ((passatFirst && !beforeNow) || (!passatFirst && beforeNow)) ? '50%' :
                                    '100%',
                                borderLeft: event.tipus === 'activitat' ? '12.5px solid transparent' : null,
                                borderRight: event.tipus === 'activitat' ? '12.5px solid transparent' : null,
                                borderBottom: event.tipus === 'activitat' ? '25px solid ' + (
                                    clicked === d.eventId ? 'black' :
                                    !beforeNow ? colorMap[d.status] :
                                    d.status === 'Vinc' || d.status === 'Fitxat' ? 'green' :
                                    'red'
                                ) : null,
                            }}
                            title={eventDisplayName(event)}
                            onClick={() => setClicked(d.eventId)}
                        />
                    )
                })}
            </div>
            
            <EventInfo
                clicked={clicked}
                event={events.find(e => parseInt(e.id) === parseInt(clicked))}
                assist={attendanceDict?.[user]?.[clicked] || "No confirmat"}
                setFiltersEvents={setFiltersEvents}
            />
        </div>
    )
}

function AttendanceChart({ getListOfAttendance, passatFirst, setPassatFirst, setFiltersEvents, filtersEvents, attendanceDict, filteredEvents, castellersInfo, chosenUsers, start_date, end_date }) {
    const [showMore, setShowMore] = useState(5)

    const colorMap = {
        'Vinc': 'green',
        'No vinc': 'red',
        'Fitxat': 'blue',
        'No confirmat': 'orange'
    };

    const displayName = user => `${castellersInfo[user].nom} ${castellersInfo[user].cognom}` + (castellersInfo[user].mote ? ` (${castellersInfo[user].mote})` : '')
    const eventDisplayName = ev => `${ev.title} (${applyTimeZone(ev['data-esperada-inici']).format('DD/MM/YYYY')})`

    const percentage_attendance = user => {
        const assistencies = getListOfAttendance(user)
        const assistencies_passades = assistencies.filter(d => moment(filteredEvents.find(e => parseInt(e.id) === parseInt(d.eventId))['data-esperada-inici']).isBefore(moment()))
        const assistencies_futures = assistencies.filter(d => moment(filteredEvents.find(e => parseInt(e.id) === parseInt(d.eventId))['data-esperada-inici']).isAfter(moment()))

        const passat_vingut = assistencies_passades.filter(d => d.status === 'Vinc' || d.status === 'Fitxat').length
        const passat_total = assistencies_passades.length

        const futur_vingut = assistencies_futures.filter(d => d.status === 'Vinc' || d.status === 'Fitxat').length
        const futur_total = assistencies_futures.length

        return {
            'passat': passat_total === 0 ? '-' : Math.round(passat_vingut/passat_total * 100),
            'futur': futur_total === 0 ? '-' : Math.round(futur_vingut/futur_total * 100)
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gràfic d'assistències</h2>

                <div>
                    <button
                        onClick={() => setPassatFirst(prev => !prev)}
                    >
                        {
                            !passatFirst ? <>Prioritza assistència <strong>passada</strong></> :
                            <>Prioritza assistència <strong>futura</strong></>
                        }
                    </button>
                </div>
            </div>

            <div>
                { chosenUsers.length === 0 && <p>Selecciona castellers per veure els seus gràfics d'assistències</p> }
            </div>

            <div>
                {
                    chosenUsers
                        .sort((a, b) => {
                            const pa = percentage_attendance(a);
                            const pb = percentage_attendance(b);
                        
                            if (passatFirst) {
                                // First, compare past attendance
                                if (pb['passat'] > pa['passat']) {
                                    return 1; // b comes first if its past attendance is higher
                                } else if (pb['passat'] < pa['passat']) {
                                    return -1; // a comes first if its past attendance is higher
                                } else {
                                    // If past attendances are equal, compare future attendance
                                    if (pb['futur'] > pa['futur']) {
                                        return 1; // b comes first if its future attendance is higher
                                    } else if (pb['futur'] < pa['futur']) {
                                        return -1; // a comes first if its future attendance is higher
                                    } else {
                                        return 0; // Equal past and future attendance, so keep original order
                                    }
                                }
                            } else {
                                // First, compare futur attendance
                                if (pb['futur'] > pa['futur']) {
                                    return 1; // b comes first if its futur attendance is higher
                                } else if (pb['futur'] < pa['futur']) {
                                    return -1; // a comes first if its futur attendance is higher
                                } else {
                                    // If futur attendances are equal, compare passat attendance
                                    if (pb['passat'] > pa['passat']) {
                                        return 1; // b comes first if its passat attendance is higher
                                    } else if (pb['passat'] < pa['passat']) {
                                        return -1; // a comes first if its passat attendance is higher
                                    } else {
                                        return 0; // Equal past and future attendance, so keep original order
                                    }
                                }
                            }
                        })   
                        .slice(0, showMore)                 
                        .map(user => (
                            <AttendanceUser
                                key={user}
                                user={user}
                                attendanceDict={attendanceDict}
                                events={filteredEvents}
                                colorMap={colorMap}
                                getListOfAttendance={getListOfAttendance}
                                displayName={displayName}
                                percentage_attendance={percentage_attendance}
                                eventDisplayName={eventDisplayName}
                                setFiltersEvents={setFiltersEvents}
                                passatFirst={passatFirst}
                            />
                        ))
                }
                {
                    showMore < chosenUsers.length && (
                        <div
                            style={{
                                display: 'flex',
                                flex: 1,
                                marginTop: 40,
                            }}
                        >
                            <button
                                style={{ flex: 1, fontSize: 16, padding: 15 }}
                                onClick={() => setShowMore(prev => prev + 10)}
                            >
                                Mostra'n més
                            </button>
                        </div>
                    )
                }
            </div>
        </div>
    );
}

export default AttendanceChart;

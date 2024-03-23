import React, { useState, useEffect, useCallback } from 'react';
import {isBrowser, isMobile} from 'react-device-detect';
import './Projector.css'
import moment from 'moment'

import { calculateProvesHores } from '../../interface/proves/LlistaProves';
import { formatDurations } from '../../interface/ProvesApp';
import { fetchAPI } from '../../../utils/utils';

function EventInfo({ ev }) {
    const [lang, setLang] = useState('ca');
    const formattedDate = dateObj => `dddd, D [${ [3, 7, 9].includes(dateObj.getMonth()) ? 'd\'' : 'de ' }]MMMM [de] YYYY`

    const parseDate = (beginString, endString) => {
        const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);

        const dateBegin = new Date(beginString);
        const dateEnd = new Date(endString);

        const diaBegin = moment(dateBegin).utc().locale('ca').format(formattedDate(dateBegin));
        const diaEnd = moment(dateEnd).utc().locale('ca').format(formattedDate(dateEnd));

        const horaBegin = moment(dateBegin).utc().format('HH:mm');
        const horaEnd = moment(dateEnd).utc().format('HH:mm');

        const fullDay = horaBegin === '00:00' && horaEnd === '00:00';

        if (diaBegin === diaEnd) {
            return {
                dies: capitalizeFirstLetter(diaBegin),
                hores: `${horaBegin} - ${horaEnd}`
            }
        } else if (fullDay && dateBegin.getDate() === dateEnd.getDate()-1) {
            return {
                dies: capitalizeFirstLetter(diaBegin),
                hores: "Tot el dia"
            }
        } else if (fullDay && dateBegin < new Date(dateEnd.getTime()-86400000)) {
            const d = new Date();
            d.setDate(dateEnd.getDate()-1);
            const diaEndMod = moment(d).utc().locale('ca').format(formattedDate(d));

            return {
                dies: `${capitalizeFirstLetter(diaBegin)} > ${capitalizeFirstLetter(diaEndMod)}`,
                hores: "Tots els dies"
            }
        } else {
            return {
                dies: `${capitalizeFirstLetter(diaBegin)} > ${capitalizeFirstLetter(diaEnd)}`,
                hores: `${horaBegin} - ${horaEnd}`
            }
        }
    };

    return (
        <div style={{ margin: 25 }}>
            <div>
                <div><div style={{ marginBottom: 10, fontSize: 24, fontWeight: 'bold' }}>{ev.title}</div></div>
                <div><div style={{ marginBottom: 5, fontSize: 16 }}>{parseDate(ev['data-esperada-inici'], ev['data-esperada-fi']).hores}</div></div>
            </div>
        </div>
    );
}

function Projector(props) {
    const { socket, extended, setExtended, selectedEvent, selectedBundle, selectedVersio, setSelectedEvent, setSelectedBundle, setSelectedVersio, serverId, setRotationVal } = props;

    const [durations, setDurations] = useState({})
    const [horaInici, setHoraInici] = useState(moment())
    const [bundlesInfo, setBundlesInfo] = useState([])
    
    const [selectedProves, setSelectedProves] = useState({
        'public': [],
        'private': [],
    })

    const [order, setOrder] = useState(false)
    const [eventInfo, setEventInfo] = useState(null);

    useEffect(() => {
        socket.on('.proves', proves => setSelectedProves(proves))
        socket.on('.new_order', (ev, ord) => parseInt(selectedEvent) === parseInt(ev) && setOrder(ord))
        socket.on('.changed_state_prova', (evId, castell, versio, new_state) => parseInt(selectedEvent) === parseInt(evId) && socket.emit('.request_proves', selectedEvent))
        socket.on('.event', info => parseInt(info.id) === parseInt(selectedEvent) && setEventInfo(info))
        socket.on('.horainici', (ev, date) => parseInt(selectedEvent) === parseInt(ev) && setHoraInici(moment(date)))

        socket.on('.durations', data => setDurations(formatDurations(data)))

        socket.on('.durations_changed', (prova, duration) => {            
            setDurations(prev => ({...prev, [prova]: duration}))
            socket.emit('.request_durations');
        })

        return () => {
            socket.off('.changed_state_prova')
            socket.off('.horainici')
            socket.off('.new_order')
            socket.off('.proves')
            socket.off('.event')
            socket.off('.durations')
            socket.off('.durations_changed')
        }
    }, [socket])

    useEffect(() => {
        if (selectedEvent) fetchAPI(`/event/${selectedEvent}`, setEventInfo)
        if (selectedEvent) fetchAPI(`/horainici/${selectedEvent}`, date => setHoraInici(moment(date)))
        if (selectedEvent) fetchAPI(`/proves/${selectedEvent}`, setSelectedProves)
        if (selectedEvent) fetchAPI(`/order/${selectedEvent}`, setOrder)
        fetchAPI(`/durations`, data => setDurations(formatDurations(data)))
        fetchAPI('/bundles', setBundlesInfo)
    }, [selectedEvent, serverId, extended])

    const orderedProves =
        order && selectedProves ?
            [
                ...order
                    .filter(castell => selectedProves.private.includes(castell) || selectedProves.public.includes(castell)),

                ...selectedProves.public
                    .filter(castell => !order.includes(castell)),

                ...selectedProves.private
                    .filter(castell => !order.includes(castell)),
            ]
        :
            []

    const proves = orderedProves
        .map(filename => filename.split('.'))
        .map(([castell, versio, _]) => ({
            'event': selectedEvent,
            'castell': castell,
            'versio': versio,
            'isPublic': selectedProves.public
                .map(filename => filename.split('.'))
                .map(([castell, versio, _]) => `${castell}.${versio}`)
                .includes(`${castell}.${versio}`),
            'isPrivate': selectedProves.private
                .map(filename => filename.split('.'))
                .map(([castell, versio, _]) => `${castell}.${versio}`)
                .includes(`${castell}.${versio}`),
        }))

    const hores = calculateProvesHores(orderedProves, order, durations, horaInici)

    const isProvaDone = (start, end) => {
        const currentTime = moment();
        const datePart = moment(horaInici).format('YYYY-MM-DD');

        const provaStartTime = moment(`${datePart} ${start}`, 'YYYY-MM-DD HH:mm');
        const provaEndTime = moment(`${datePart} ${end}`, 'YYYY-MM-DD HH:mm');

        return currentTime.isAfter(provaEndTime);
    };

    const [currentTime, setCurrentTime] = useState(moment());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(moment());
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    return isBrowser ? (
        <>
            <div id="projector-container" className={`${extended ? 'extended' : ''}`}>
                { extended && <div className="projector-header">
                    <div className="event-info-container">
                        { eventInfo !== null && <EventInfo ev={eventInfo} /> }
                    </div>
                    <div className='time-now'>
                        { currentTime.format('HH:mm:ss') }
                    </div>
                </div> }

                { extended && <div className="projector-content">
                    <div className="llista-proves">
                        {
                            proves
                            .map((prova, i) => prova.isPublic ? (
                                <div
                                    key={prova.versio}
                                    className={`prova ${i < hores.length && isProvaDone(hores[i][0], hores[i][1]) ? 'done' : ''} ${selectedBundle === prova.castell && selectedVersio === prova.versio ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedBundle(prova.castell)
                                        setSelectedVersio(prova.versio)
                                        window.history.pushState(null, '', `/${prova.event}/${prova.castell}/${prova.versio}`);
                                    }}
                                >
                                    <div className="prova-info">
                                        <div className="prova-nom">
                                            {
                                                bundlesInfo.find(bundle => bundle.id === prova.castell) ?
                                                    bundlesInfo.find(bundle => bundle.id === prova.castell).nom
                                                :
                                                    prova.castell
                                            }
                                        </div>
                                        <div className="prova-hora">
                                            <div className='prova-start'>{ i < hores.length && hores[i][0] }</div>
                                            <div className='prova-end'>{ i < hores.length && hores[i][1] }</div>
                                        </div>
                                    </div>
                                </div>
                            ) : prova.isPrivate ? (
                                <div
                                    key={prova.versio}
                                    className={`prova ${i < hores.length && isProvaDone(hores[i][0], hores[i][1]) ? 'done' : ''} ${selectedBundle === prova.castell && selectedVersio === prova.versio ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedBundle(prova.castell)
                                        setSelectedVersio(prova.versio)
                                        window.history.pushState(null, '', `/${prova.event}/${prova.castell}/${prova.versio}`);
                                    }}
                                >
                                    <div className="prova-info">
                                        <div className="prova-nom">
                                            🔒
                                        </div>
                                        <div className="prova-hora">
                                            <div className='prova-start'>{ i < hores.length && hores[i][0] }</div>
                                            <div className='prova-end'>{ i < hores.length && hores[i][1] }</div>
                                        </div>
                                    </div>
                                </div>
                            ) :
                                null
                            )
                        }
                    </div>
                </div> }

                <div className='projector-footer'>
                    <div className="projector-footer-content">
                        {
                            extended && <>
                                <div className="rotate-button button" onClick={() => setRotationVal(prev => (prev + 90)%360)}>
                                    🔃
                                </div>
                            </>
                        }

                        <div className="collapse-button button" onClick={() => setExtended(prev => !prev)}>
                            { extended ? '➡️' : '⬅️' }
                        </div>
                    </div>
                </div>
            </div>
        </>
    ) :
    (
        (selectedBundle === null || selectedVersio === null) ? (
            <div id="projector-container" className='full'>
                <div className="projector-header">
                    <div className="event-info-container">
                        { eventInfo !== null && <EventInfo ev={eventInfo} /> }
                    </div>
                    <div className='time-now'>
                        { currentTime.format('HH:mm:ss') }
                    </div>
                </div>

                <div className="projector-content">
                    <div className="llista-proves">
                        {
                            proves
                                .map((prova, i) => prova.isPublic && (
                                    <div
                                        key={prova.versio}
                                        className={`prova ${i < hores.length && isProvaDone(hores[i][0], hores[i][1]) ? 'done' : ''} ${selectedBundle === prova.castell && selectedVersio === prova.versio ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedBundle(prova.castell)
                                            setSelectedVersio(prova.versio)
                                            window.history.pushState(null, '', `/${prova.event}/${prova.castell}/${prova.versio}`);
                                        }}
                                    >
                                        <div className="prova-info">
                                            <div className="prova-nom">
                                                {prova.castell}
                                            </div>
                                            <div className="prova-hora">    
                                                <div className='prova-start'>{ i < hores.length && hores[i][0] }</div>
                                                <div className='prova-end'>{ i < hores.length && hores[i][1] }</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        }
                    </div>
                </div>
            </div>
        ) : (
            <>
                <div className="goBack" onClick={() => {
                    setSelectedBundle(null)
                    setSelectedVersio(null)
                    window.history.pushState(null, '', `/${selectedEvent}`);
                }}>
                    <div className="goBackButton">
                        <div className="goBackArrow">
                            ⬅️
                        </div>
                    </div>
                </div>
            </>
        )
    )
}

export default Projector;
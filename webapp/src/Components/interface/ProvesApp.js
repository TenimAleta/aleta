import LlistaEvents from './LlistaEvents'
import styles from './Events.styles';
import { useState } from 'react';
import ChooseCastell from './proves/ChooseCastell';
import { useEffect } from 'react';
import { NoSignal } from '../Interface';
import UserInfo from '../login/UserInfo';
import OnlyOneEvent from './OnlyOneEvent';
import Pressable from '../other/Pressable';
import { fetchAPI } from '../../utils/utils';
import { isBrowser } from 'react-device-detect';

export const formatDurations = data => {
    let dict = {}
    const canvis = data.split('\n')

    for (const canvi of canvis) {
        if (canvi.split('=').length !== 2) continue
        const [prova, duration] = canvi.split('=')
        dict[prova] = parseInt(duration)
    }

    return dict;
}

export function HeaderTabs({ userInfo }) {
    return (
        <header className='tabs' style={styles.tabs}>
            <Pressable className="tab" style={styles.tab} href='/gestio'>
                👥
                { isBrowser && <span style={{ fontSize: 14 }}>Castellers</span> }
            </Pressable>
            {
                (userInfo?.es_junta >= 2 || userInfo?.es_tecnica >= 2) && <>
                    <Pressable className="tab" style={styles.tab} href='/calendar'>
                        📅
                        { isBrowser && <span style={{ fontSize: 14 }}>Calendari</span> }
                    </Pressable>
                </>
            }
            {
                (userInfo?.es_junta >= 1 || userInfo?.es_tecnica >= 2) && <>
                    <Pressable className="tab" style={styles.tab} href='/notifications'>
                        🔔
                        { isBrowser && <span style={{ fontSize: 14 }}>Notificacions</span> }
                    </Pressable>
                    <Pressable className="tab" style={styles.tab} href='/forms'>
                        📝
                        { isBrowser && <span style={{ fontSize: 14 }}>Formularis</span> }
                    </Pressable>
                </>
            }
            {
                userInfo?.es_tecnica >= 2 && <>
                    <Pressable className="tab" style={styles.tab} href='/editor'>
                        <span style={{ fontSize: 18, fontWeight: 'bold' }}>⸭</span>
                        { isBrowser && <span style={{ fontSize: 14 }}>Plantilles</span> }
                    </Pressable>
                </>
            }
            <Pressable className="tab" style={styles.tab} href='/stats'>
                📊
                { isBrowser && <span style={{ fontSize: 14 }}>Estadístiques</span> }
            </Pressable>
            {
                userInfo?.es_tecnica >= 1 && <>
                    <Pressable className="tab" style={styles.tab} href='/models'>
                        🌟
                        { isBrowser && <span style={{ fontSize: 14 }}>Pinyes model</span> }
                    </Pressable>
                </>
            }
            {
                userInfo?.es_tecnica >= 1 && <>
                    <Pressable className="tab" style={styles.tab} href='/etiquetes'>
                        🏷️
                        { isBrowser && <span style={{ fontSize: 14 }}>Etiquetes</span> }
                    </Pressable>
                </>
            }
            {
                userInfo?.es_tecnica >= 1 && <>
                    <Pressable className="tab" style={styles.tab} href='/fitxar'>
                        📍
                        { isBrowser && <span style={{ fontSize: 14 }}>Fitxar</span> }
                    </Pressable>
                </>
            }
        </header>
    )
}

function ProvesApp(props) {
    const { socket, isInEventToEdit, isModels, castellersInfo, setCastellersInfo } = props;

    const params = window.location.pathname.split('/').filter(part => part != '');
    const eventToEdit = parseInt(params[1])

    const [selectedEvent, setSelectedEvent] = useState(-1);
    const [importPopupClosed, setImportPopupClosed] = useState(true);

    const [eventType, setEventType] = useState('esdeveniments')
    const [durations, setDurations] = useState({})

    const [bundlesInfo, setBundlesInfo] = useState({});

    const [etiquetes, setEtiquetes] = useState([]);
    const [etiquetaUsers, setEtiquetaUsers] = useState({});

    const [events, setEvents] = useState(null);

    const exports = {
        'setSelectedEvent': setSelectedEvent,
        'setImportPopupClosed': setImportPopupClosed,
        'durations': durations,
        'setDurations': setDurations,
        'castellersInfo': castellersInfo,
        'bundlesInfo': bundlesInfo,
        'etiquetes': etiquetes,
        'etiquetaUsers': etiquetaUsers,
        ...props
    };

    useEffect(() => {
        fetchAPI('/calendar', data => {
            setEvents(data.calendar_events.events);
        })
    }, []);

    useEffect(() => {
        fetchAPI('/bundles', setBundlesInfo)
    }, [])

    useEffect(() => {
        fetchAPI('/etiquetes', setEtiquetes)
    }, [])

    useEffect(() => {
        etiquetes.forEach(etiqueta => {
            fetchAPI(
                `/etiqueta_users/${etiqueta.id}`,
                users => setEtiquetaUsers(
                    prev => ({
                        ...prev,
                        [etiqueta.id]: {
                            castellers: users,
                            perfil: etiqueta.nom
                        }
                    })
                )
            )
        })
    }, [
        etiquetes
    ])

    useEffect(() => {
        socket.emit('.request_durations');

        socket.on('.durations', data => setDurations(formatDurations(data)))

        socket.on('.durations_changed', (prova, duration) => {            
            setDurations(prev => ({...prev, [prova]: duration}))
            socket.emit('.request_durations');
        })

        return () => {
            socket.off('.durations')
            socket.off('.durations_changed')
        }
    }, [])

    return (
        <div style={{ width: '90%' }}>
            <NoSignal socket={socket} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <UserInfo castellersInfo={castellersInfo} {...props} />
            </div>

            <HeaderTabs {...exports} />

            <div id="llista-container" style={{...((eventToEdit || isModels) ? {} : styles.llistes_container)}}>
                <ChooseCastell event={selectedEvent} closed={importPopupClosed} setClosed={setImportPopupClosed} {...exports}  />

                {
                    eventToEdit || isModels ? <>
                        <OnlyOneEvent
                            eventToEdit={eventToEdit}
                            isModels={isModels}
                            {...exports}
                        />
                    </> : <>
                        {/* <LlistaEvents type='esdeveniments' current={true} {...exports} /> */}

                        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                            <div style={{...{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }, ...{ flex: 1, margin: 2, padding: 10, textAlign: 'center', backgroundColor: eventType === 'esdeveniments'  ? '#333' : '#ddd', color: eventType === 'esdeveniments' ? 'white' : '#333' }}} onClick={() => eventType === 'esdeveniments' ? setEventType('esdeveniments') : setEventType('esdeveniments')}>Totes</div>
                            <div style={{...{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }, ...{ flex: 1, margin: 2, padding: 10, textAlign: 'center', backgroundColor: eventType === 'actuació'  ? '#333' : '#ddd', color: eventType === 'actuació' ? 'white' : '#333' }}} onClick={() => eventType === 'actuació' ? setEventType('esdeveniments') : setEventType('actuació')}>Actuacions</div>
                            <div style={{...{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }, ...{ flex: 1, margin: 2, padding: 10, textAlign: 'center', backgroundColor: eventType === 'assaig'    ? '#333' : '#ddd', color: eventType === 'assaig' ? 'white' : '#333' }}} onClick={() => eventType === 'assaig' ? setEventType('esdeveniments') : setEventType('assaig')}>Assaigs</div>
                            <div style={{...{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }, ...{ flex: 1, margin: 2, padding: 10, textAlign: 'center', backgroundColor: eventType === 'activitat' ? '#333' : '#ddd', color: eventType === 'activitat' ? 'white' : '#333' }}} onClick={() => eventType === 'activitat' ? setEventType('esdeveniments') : setEventType('activitat')}>Activitats</div>
                        </div>

                        <LlistaEvents
                            type={eventType}
                            events={events}
                            setEvents={setEvents}
                            {...exports}
                        />
                    </>
                }
            </div>

            <div style={{ margin: 20 }}>&nbsp;</div>
        </div>
    );
}

export default ProvesApp;
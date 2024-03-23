import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';

import Select from 'react-select';
import ChooseEvent from "./ChooseEvent";
import SubgroupSetter from "./SubgroupSetter";

import './notifications.css';
import LastHourNotifications from "./LastHourNotifications";
import { fetchAPI } from "../../utils/utils";
import NotificationGroupManager from "./groups/NotificationGroupManager";
import NotificationLog from "./NotificationLog";
import Pressable from "../other/Pressable";
import UserInfo from "../login/UserInfo";
import { HeaderTabs } from "../interface/ProvesApp";

function MockupNotification({ ...props }) {
    // Create a HTML mockup of an Apple Push Notification
    const { title, body, data } = props;

    const notification_style = {
        width: '95%',
        backgroundColor: 'rgb(245,245,245)',
        borderRadius: '10px',
        boxShadow: '0 0 10px 0 rgba(0,0,0,0.5)',
        padding: '10px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    };

    const notification_title_text_style = {
        fontSize: '1em',
        fontWeight: 'bold',
        color: 'black',
    };

    const notification_body_text_style = {
        fontSize: '0.8em',
        color: 'black',
    };

    const notification_icon_style = {
        width: '50px',
        height: '50px',
        borderRadius: 10,
        backgroundColor: 'white',
    };

    return (
        <div style={notification_style}>
            <div style={{ padding: 10 }}>
                <img style={notification_icon_style} src="/aleta-icon.png" alt="icon" />
            </div>
            <div style={{ padding: 10 }}>
                <div style={notification_title_text_style}>{title}</div>
                <div style={notification_body_text_style}>{body}</div>
            </div>
        </div>
    );
}

function ChooseSubgroup({ socket, subgroupName, setSubgroupName, event, forms }) {
    const thereIsAForm = event in forms;
    const subgroups_values = !thereIsAForm ? ['No confirmat', 'Vinc', 'No vinc'] : ['No confirmat', 'Vinc', 'No vinc', 'Formulari no respost']
    const subgroups_labels = !thereIsAForm ? ['No confirmats', 'Venen', 'No venen'] : ['No confirmats', 'Venen', 'No venen', 'Formulari no respost']

    const style_subgroup_button = {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 10,
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
        flex: 1,
        margin: 'auto',
        margin: 10
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingTop: 15 }}>
            {
                subgroups_values.map((subgroup, i) => (
                    <div
                        key={subgroup}
                        style={{
                            ...style_subgroup_button,
                            backgroundColor: subgroup === subgroupName ? 'rgb(0, 0, 0)' : 'rgb(200, 200, 200)'
                        }}
                        onClick={() => setSubgroupName(subgroup)}
                    >
                        {subgroups_labels[i]}
                    </div>
                ))
            }
        </div>
    );
}

function NotificationsDashboard({ socket, userId, castellersInfo, setCastellersInfo, ...props }) {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')

    const [userIds, setUserIds] = useState([])
    const [grups, setGrups] = useState({})

    const [selectedEvent, setSelectedEvent] = useState(null)
    const [selectedDay, setSelectedDay] = useState(null)

    const [events, setEvents] = useState([])

    const [subgroupName, setSubgroupName] = useState('No confirmat')

    const [notificationsState, setNotificationsState] = useState('none')
    const [notificationsCounter, setNotificationsCounter] = useState(0)

    const withNotis = userIds.filter(user => user.color !== 'red').length
    const withoutNotis = userIds.filter(user => user.color === 'red').length

    const [forms, setForms] = useState({});

    const tecnicaRole = castellersInfo[userId]?.es_tecnica

    const format_text = (text, id) => {
        const nom = id in castellersInfo ?
            castellersInfo[id].nom
            : ''

        const sobrenom = id in castellersInfo ?
            castellersInfo[id].mote ? castellersInfo[id].mote :
            castellersInfo[id].nom ? castellersInfo[id].nom :
            ''
        : ''

        return text
            .replaceAll(' {nom}', nom !== '' ? ` ${nom}` : '')
            .replaceAll('{nom}', nom !== '' ? nom : '')
            .replaceAll(' {sobrenom}', sobrenom !== '' ? ` ${sobrenom}` : '')
            .replaceAll('{sobrenom}', sobrenom !== '' ? sobrenom : '')
    }

    const valid_tags = ['{nom}', '{sobrenom}']

    const check_tags = (text) => {
        const wordswithtags = text.split(' ')
            .filter(word => word.length > 0)
            .filter(word => word.includes("{") && word.includes("}"))

        const invalid_tags = wordswithtags
            .filter(word => valid_tags.every(vtag => !word.includes(vtag)))

        if (invalid_tags.length > 0) {
            alert(
                'Cuidado! Has posat les següents etiquetes que no existeixen:\n\n' +
                invalid_tags.join(', ') +
                '\n\nLes etiquetes existents són:\n\n' +
                valid_tags.join(', ')
            )

            return false;
        }

        return true;
    }

    const notifica_users = () => {
        if (!check_tags(title)) return;
        if (!check_tags(body)) return;

        if (notificationsState !== 'none') {
            const continuar = window.confirm('Estàs segur que vols enviar un altre cop la mateixa notificació?')
            if (!continuar) return;
        }

        const notification_id = uuidv4();

        userIds.forEach(target =>  
            socket.emit('.send_notification_to_user',
                target.value,
                {
                    title: format_text(title !== '' ? title : defaultTitle, target.value),
                    body: format_text(body !== '' ? body : defaultBody, target.value),
                    data: { selectedDay: selectedDay },
                    notification_id: notification_id,
                    author: userId,
                }
            )
        )

        // Notifications' animation
        setNotificationsCounter(0)
        setNotificationsState('loading')
        userIds.forEach((userId, i) => setTimeout(() => setNotificationsCounter(prev => prev + 1), i*100))
        setTimeout(() => setNotificationsState('done'), userIds.length*100)
    }

    useEffect(() => {
        document.title = `Notificacions - Aleta`;
    }, []);

    useEffect(() => {
        fetchAPI('/notification_groups', fetchedGrups => {
            const infoFromIds = ids => Object.values(castellersInfo)
                .filter(info => ids.includes(info.id))
                .map(info => ({
                    value: info.id,
                    label: displayName(info),
                    color: info.has_notifications ? 'black' : 'red'
                }));

            setGrups(
                Object.fromEntries(
                    fetchedGrups
                        .map(group => [group.name, infoFromIds(group.ids)])
                )
            );
        });
    }, [
        Object.keys(castellersInfo).length,
    ]);

    useEffect(() => {
        socket.emit('.get_all_forms');
        socket.on('.all_forms', data => setForms(data));

        return () => {
            socket.off('.all_forms');
        }
    }, []);

    useEffect(() => {
        setNotificationsState('none')
    }, [userIds, title, body, selectedEvent])

    const optionStyles = {
        multiValue: (styles, { data, isDisabled }) => ({ ...styles, color: data.color }),
        multiValueLabel: (styles, { data, isDisabled }) => ({ ...styles, color: data.color }),
        option: (styles, { data, isDisabled }) => ({ ...styles, color: data.color })
    }

    const displayName = info => (info.canalla ? '👶 ' : '') + (info.mote ? ` ${info.mote}` : `${info.nom} ${info.cognom}`)

    const user_names = Object.values(castellersInfo)
        .map(info => ({
            value: info.id,
            label: displayName(info),
            color: info.has_notifications ? 'black' : 'red'
        }))

    const tecnica_names = Object.values(castellersInfo)
        .filter(info => info.es_tecnica)
        .map(info => ({
            value: info.id,
            label: displayName(info),
            color: info.has_notifications ? 'black' : 'red'
        }))

    const style_send_to_all_button = {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
        flex: 1,
        margin: 'auto',
        margin: 10
    }

    const howManyDaysFromToday = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(date - today);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    const formatDaysFromToday = (dateString) => {
        const days = howManyDaysFromToday(dateString);
        if (days === 0) return 'avui';
        if (days === 1) return 'demà';
        return `en ${days} dies`;
    }
    
    const defaultTitle = selectedEvent ? '{nom}, comptem amb tu?' : 'Títol que sortirà a la part superior de la notificació'
    const defaultBody = selectedEvent ? `{nom}, no ens has dit si vens a ${events.filter(ev => ev.id === selectedEvent)[0].title} (${formatDaysFromToday(events.filter(ev => ev.id === selectedEvent)[0]['data-esperada-inici'])}). Comunica'ns-ho ara!` : 'Missatge que surt en lletra petita'

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('titol') || urlParams.get('missatge')) {
            setTitle(decodeURIComponent(urlParams.get('titol')))
            setBody(decodeURIComponent(urlParams.get('missatge')))
        }
    }, [
        
    ])

    const [loopIndex, setLoopIndex] = useState(0)
    const [collapseLastHour, setCollapseLastHour] = useState(true)

    return (
        <>
            <div
                style={{ width: '80%' }}
            >
                <UserInfo castellersInfo={castellersInfo} userId={userId} socket={socket} {...props} />

                <HeaderTabs {...props} />

                <Pressable style={{ backgroundColor: '#eee' }} className="boto-back" href='/'>
                    ← Tornar a la pàgina principal
                </Pressable>

                <h1>Notificacions d'última hora</h1>
                <p>Si un casteller canvia la seva assistència, se us enviarà una notificació a tècnica. Tria per cada casteller a quin responsable de tècnica se li envia.</p>

                {
                    collapseLastHour ? (
                        <button
                            onClick={() => setCollapseLastHour(false)}
                        >
                            Edita els responsables
                        </button>
                    ) : (
                        <div>
                            <button
                                onClick={() => setCollapseLastHour(true)}
                            >
                                Fet
                            </button>

                            <LastHourNotifications
                                socket={socket}
                                tecnica_names={tecnica_names}
                                user_names={user_names}
                            />
                        </div>
                    )  
                }
                
                <h1>Envia una notificació</h1>

                <div>
                    <h3>Tria un esdeveniment</h3>
                    <ChooseEvent forms={forms} events={events} setEvents={setEvents} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} setSelectedDay={setSelectedDay} socket={socket} subgroupName={subgroupName} />
                    { selectedEvent !== null && <ChooseSubgroup event={selectedEvent} forms={forms} subgroupName={subgroupName} setSubgroupName={setSubgroupName} /> }
                    <SubgroupSetter forms={forms} socket={socket} event={selectedEvent} selectUsers={setUserIds} subgroupName={subgroupName} setSubgroupName={setSubgroupName} />
                </div>

                <div>
                    <h3>O envia la notificació a un grup de persones</h3>
                    {
                        tecnicaRole >= 2 &&
                        <NotificationGroupManager
                            user_names={user_names}
                            castellersInfo={castellersInfo}
                        />
                    }
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{...style_send_to_all_button, ...{ backgroundColor: 'darkblue' }}} className="send-to-all-button" onClick={() => setUserIds(user_names)}>Tothom</div>
                        <div style={{...style_send_to_all_button, ...{ backgroundColor: 'darkorange' }}} className="send-to-all-button" onClick={() => setUserIds(tecnica_names)}>Tècnica</div>
                        {
                            Object.keys(grups).map(grup => (
                                <div key={grup} style={{...style_send_to_all_button, ...{ backgroundColor: 'darkgreen' }}} className="send-to-all-button" onClick={() => setUserIds(grups[grup])}>{grup}</div>
                            ))
                        }
                    </div>
                </div>

                <div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ flex: 3 }}>Recipients ({userIds.filter(u => u.color === 'black').length} + <span style={{ color: 'red' }}>{userIds.filter(u => u.color === 'red').length}</span> 🔕)</h3>
                        <div
                            style={{ flex: 1, fontSize: 12, textAlign: 'center', opacity: userIds.filter(user => user.color === 'red').length > 0 ? 1 : 0, color: 'red', padding: 5, borderColor: 'red', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}
                            onClick={() => setUserIds(userIds.filter(user => user.color !== 'red'))}    
                        >Borrar els 🔕</div>
                    </div>
                    <Select
                        options={user_names}
                        isMulti
                        name="users"
                        className="basic-multi-select"
                        classNamePrefix="select"
                        value={userIds}
                        onChange={setUserIds}
                        styles={optionStyles}
                    />
                    <p style={{ fontSize: 12 }}>Els usuaris en <span style={{ color: 'red' }}>vermell</span> no tenen les notificacions activades o no tenen l'Aleta instal·lada. No rebran la notificació.</p>
                </div>

                <div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ flex: 3 }}>Títol</h3>
                        <div
                            style={{ flex: 1, fontSize: 12, textAlign: 'center', opacity: title === '' ? 1 : 0, color: '#777', padding: 5, borderColor: '#777', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}
                            onClick={() => setTitle(defaultTitle)}    
                        >Aplicar proposta</div>
                    </div>
                    <input
                        placeholder={selectedEvent ? '(Proposta:) ' + defaultTitle : defaultTitle}
                        style={{ width: '100%', fontSize: 24 }} name="title" value={title} maxLength={35} onChange={ev => setTitle(ev.target.value)} />
                    <p style={{ fontSize: 12 }}>Pots afegir les etiquetes: <span style={{ color: 'darkblue' }}>{valid_tags.join(', ')}</span> per personalitzar la resposta</p>
                </div>

                <div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ flex: 3 }}>Missatge</h3>
                            <div
                                style={{ flex: 1, fontSize: 12, textAlign: 'center', opacity: body === '' ? 1 : 0, color: '#777', padding: 5, borderColor: '#777', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}
                                onClick={() => setBody(defaultBody)}    
                            >Aplicar proposta</div>
                    </div>
                    <textarea
                        placeholder={selectedEvent ? '(Proposta:) ' + defaultBody : defaultBody}
                        style={{ width: '100%', fontSize: 16, height: 75 }} name="body" maxLength={256} onChange={ev => setBody(ev.target.value)} value={body}></textarea>
                    <p style={{ fontSize: 12 }}>Pots afegir les etiquetes: <span style={{ color: 'darkblue' }}>{valid_tags.join(', ')}</span> per personalitzar la resposta</p>
                </div>

                {userIds.length > 0 && <div>
                    <h3>Previsualització de la notificació</h3>
                    <div>
                        <p style={{ flex: 1, fontSize: 12 }}>Aquesta és la notificació que rebran els usuaris seleccionats. Si no estàs segur/a, prova a enviar-la a un grup petit de persones.</p>

                        <div style={{ display: "flex", flexDirection: 'row' }}>
                            <div
                                style={{ flex: 1, fontSize: 14, textAlign: 'center', color: '#777', padding: 5, borderColor: '#777', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}
                                onClick={() => setLoopIndex(prev => (prev - 1 + userIds.length)%userIds.length)}    
                            >Casteller anterior</div>
                            <div
                                style={{ flex: 1, fontSize: 14, textAlign: 'center', color: '#777', padding: 5, borderColor: '#777', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}
                                onClick={() => setLoopIndex(prev => (prev + 1)%userIds.length)}    
                            >Següent casteller</div>

                        </div>
                    </div>
                    <div style={{ marginTop: 15, marginBottom: 15 }}>
                        <MockupNotification
                            title={format_text(title || defaultTitle, userIds[loopIndex%userIds.length].value)}
                            body={format_text(body || defaultBody, userIds[loopIndex%userIds.length].value)}
                        />
                    </div>
                </div> }

                {
                    notificationsState !== 'none' && 
                    <div style={{ margin: 20, padding: 10, paddingLeft: 30, paddingRight: 30, borderRadius: 10, backgroundColor: '#eee' }}>
                        <h3>
                            {notificationsState === 'loading' && 'Enviant notificacions...'}
                            {notificationsState === 'done' && 'Notificacions enviades!'}
                        </h3>

                        { notificationsState === 'loading' && <div className="loading">&nbsp;</div> }
                        
                        {notificationsState === 'loading' && <p style={{ fontSize: 16 }}>Enviant notificació a {notificationsCounter} castellers... (de {userIds.length} totals)</p>}
                        {(notificationsState === 'done' && withNotis === 1) && <p style={{ fontSize: 16 }}>✅&nbsp;&nbsp;&nbsp;&nbsp;Notificació enviada correctament a <strong>{withNotis}</strong> casteller.</p>}
                        {(notificationsState === 'done' && withNotis > 1) && <p style={{ fontSize: 16 }}>✅&nbsp;&nbsp;&nbsp;&nbsp;Notificació enviada correctament a <strong>{withNotis}</strong> castellers.</p>}
                        {(notificationsState === 'done' && withoutNotis === 1) && <p style={{ fontSize: 16 }}>😔&nbsp;&nbsp;&nbsp;&nbsp;<strong>{withoutNotis}</strong> casteller no té l'app o no té les notificacions activades.</p>}
                        {(notificationsState === 'done' && withoutNotis > 1) && <p style={{ fontSize: 16 }}>😔&nbsp;&nbsp;&nbsp;&nbsp;<strong>{withoutNotis}</strong> castellers no tenen l'app o no tenen les notificacions activades.</p>}
                    </div>
                }

                <div style={{ marginBottom: 50 }}>
                    <button
                        style={{ padding: 10, fontSize: 16, width: '100%' }}
                        onClick={notifica_users}
                    >
                        Notifica a {userIds.length} casteller{userIds.length === 1 ? '' : 's'}
                    </button>
                </div>

                <NotificationLog
                    userId={userId}
                    castellersInfo={castellersInfo}
                    notificationsState={notificationsState}
                />

                {/* White space */}
                <div style={{ marginTop: 50 }}>&nbsp;</div>
            </div>
        </>
    )
}

export default NotificationsDashboard;
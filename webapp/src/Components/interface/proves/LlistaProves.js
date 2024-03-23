import { useEffect, useState } from "react";
import AddProva from "./AddProva";
import Prova from "./Prova";
import styles from "./Prova.styles";

import Styled from "styled-components"

import List from '../../../utils/draggable-list/index.js'
import moment from 'moment'
import { fetchAPI } from "../../../utils/utils";
import Pressable from "../../other/Pressable.js";

function HoraInici({ userInfo, socket, event, horaInici, setHoraInici }) {
    const askHora = () => {
        const promptedHora = prompt(
            "Tria l'hora d'inici de les proves",
            horaInici.format('HH:mm')
        )

        if (promptedHora === null) return;

        const horaValid = moment(promptedHora, "HH:mm", true).isValid()
        if (!horaValid) alert("L'hora introduïda no és vàlida. Si us plau, introdueix-la en el següent format: 'HH:MM'. Exemples: 19:24, 05:42, 00:59...")

        const [HH, MM] = promptedHora.split(':');

        const newHoraInici = horaInici.clone()
        newHoraInici.set({ h: HH, m: MM })
        setHoraInici(newHoraInici)

        socket.emit('.save_horainici', event, newHoraInici.toDate())
        socket.emit('.request_hores_proves', event)
    }

    return (
        <div
            style={{...styles.prova, ...{ display: 'flex', justifyContent: 'space-around' }}}
        >
            <div style={{ flex: 3, display: 'flex', justifyContent: 'center' }}>
                INICI PROVES
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 10 }}>
                <div style={{ color: "#2859A8" }}>
                    {horaInici.format('HH:mm')}
                </div>
                {
                    userInfo?.es_tecnica >= 2 && (
                        <a href='#' onClick={askHora} style={{ color: "#2859A8" }}>
                            &#x270E;
                        </a>
                    )
                }
            </div>
        </div>
    )
}

export const calculateProvesHores = (proves, order, durations, horaInici, absolute=false) => {
    const DEFAULT_DURATION = 10

    let all_names = []
    if ('public' in proves && 'private' in proves && 'admin' in proves) all_names = [...proves.public, ...proves.private, ...proves.admin]
    else all_names = [...proves]

    const orderWithKnownCastells = [...new Set((order || [])
        .filter(castell => all_names.includes(castell)))]

    const itemOrder = orderWithKnownCastells
        .map(castell => all_names.indexOf(castell))

    const itemOrderFull = [
        ...itemOrder,
        ...all_names
            .map((castell, i) => i)
            .filter(idx => !orderWithKnownCastells.includes(all_names[idx]))
    ]

    const orderDurations = itemOrderFull
        .map(i => all_names[i])
        .map(fullName => fullName.split('.')[0] || '')
        // .filter(castell => castell in durations)
        .map(castell => durations[castell] || DEFAULT_DURATION)

    const compoundDurations = (hora => duration =>
        [
            hora.clone(),
            hora.add(duration, 'minutes').clone()
        ]
    )(horaInici.clone())

    const hores = orderDurations
        .map(compoundDurations)
    
    return absolute ? hores : hores.map(hora => hora.map(h => h.format('HH:mm')))
}

function DragHandle(props) {
    const { hores, disabled } = props;

    return (
        <div {...props} style={{ display: 'flex', justifyContent: 'space-evenly', flex: 1 }}>
            <div style={{ color: 'gray', fontSize: 12 }}>
                <div style={{ cursor: !disabled ? 'pointer' : 'default' }}>{hores[0]}</div>
                <div style={{ cursor: !disabled ? 'pointer' : 'default' }}>{hores[1]}</div>
            </div>
        </div>
    )
}

const ProvaItem = (isNeta, isAdmin) => Styled.div`
    background-color: ${ isAdmin && isNeta ? 'rgb(230,150,150)' : isAdmin ? 'rgb(235,200,200)' : isNeta ? 'rgb(235,235,235)' : 'white'  };
    padding: 10px;
    border-radius: 5px;
    flex: 1;
    text-align: center;
    font-size: 16px;
    display: flex;
    justify-content: space-around;
    align-items: center;
`

const applyTimeZone = (date, tz='Spain') => {
    if (tz === 'Spain') {
        const mom = moment(date)
        const lastSundayOfThisYearsMarch = mom.clone().year(mom.clone().year()).month(2).endOf('month').day('Sunday');
        const lastSundayOfThisYearsOctober = mom.clone().year(mom.clone().year()).month(9).endOf('month').day('Sunday');

        if (mom < lastSundayOfThisYearsMarch) {
            // January - March: Winter time
            return mom.add(-1, 'hours');
        } else if (mom < lastSundayOfThisYearsOctober) {
            // April - October: Summer time
            return mom.add(-2, 'hours');
        } else {
            // November - December: Winter time
            return mom.add(-1, 'hours');
        }
    } else {
        return moment(date);
    }
}

function LlistaProves(props) {
    const { bundlesInfo, proves, setProves, horaInici, setHoraInici, assistencies, setAssistencies, order, setOrder, socket, event, durations, setDurations, userInfo } = props;
    const defaultHoraInici = applyTimeZone(props['data-inici'])
    const [editing, setEditing] = useState(false)

    useEffect(() => {
        socket.emit('.request_order', event);
        socket.emit('.request_proves', event);
        socket.emit('.request_horainici', event, defaultHoraInici.toDate());

        fetchAPI(`/assistencies_event/${event}`, data => setAssistencies(data.data))

        socket.on('.proves', res => res.event == event && setProves(res));
        socket.on('.horainici', (ev, date) => event === ev && setHoraInici(moment(date)))
        socket.on('.assistencies_event', (data) => data.event === props.event ? setAssistencies(data.data) : false);
        socket.on('.new_order', (ev, ord) => {
            if (event === ev) {
                socket.emit('.request_proves', event)
                setOrder(ord)
            }
        })

        socket.on('.changed_state_prova', (evId, castell, versio, old_state, new_state) => {
            if (parseInt(event) === parseInt(evId) && old_state !== new_state) {
                setProves(prev => {
                    if (old_state in prev) {
                        return {
                            ...prev,
                            [old_state]: prev[old_state].filter(p => p !== `${castell}.${versio}.canvis`),
                        }
                    }
                    return prev;
                });
                setProves(prev => {
                    if (new_state in prev) {
                        return {
                            ...prev,
                            [new_state]: [...prev[new_state], `${castell}.${versio}.canvis`],
                        }
                    }
                    return prev;
                });
            }
        })

        socket.on('.deleted_prova', evId =>
            parseInt(event) === parseInt(evId) && socket.emit('.request_proves', event)
        )

        return () => {
            socket.off('.proves');
            socket.off('.new_order');
            socket.off('.horainici');
            socket.off('.assistencies_event');
            socket.off('.changed_state_prova')
            socket.off('.deleted_prova')
        }
    }, [event]);

    useEffect(() => {
        durations.length > 0 && all_names
            .filter(fullName => fullName.split('.').length > 0)
            .map(fullName => fullName.split('.')[0])
            .filter(prova => !(prova in durations))
            // Add default 15 minuts to each unknown prova
            .forEach(prova => socket.emit('.edit_duration', prova, 15))

        // const unknownCastells = all_names
        //     .map((castell, i) => i)
        //     .filter(idx => !orderWithKnownCastells.includes(all_names[idx]))

        // if (unknownCastells.length > 0) {
        //     setItemOrder(itemOrderFull)
        // }
    }, [proves, durations])

    const check_duplicate = (prova, proves) => {
        const all_proves = [...proves.public, ...proves.private, ...proves.admin];
        if (prova.split('.').length < 2) return 0;

        const altres_versions = all_proves
            .filter(p => p !== prova)
            .filter(p => p.split('.').length > 1)
            .filter(p => p.split('.')[0] === prova.split('.')[0]);

        return altres_versions.length > 0;
    }

    const all_names =
        userInfo?.es_tecnica >= 2 ? [...proves.public, ...proves.private, ...proves.admin] :
        userInfo?.es_tecnica >= 1 ? [...proves.public, ...proves.private] :
        userInfo?.es_tecnica === 0 ? [...proves.public] :
        []

    const orderWithKnownCastells = [...new Set((order || [])
        .filter(castell => all_names.includes(castell)))]

    const itemOrder = orderWithKnownCastells
        .map(castell => all_names.indexOf(castell))

    const itemOrderFull = [
        ...itemOrder,
        ...all_names
            .map((castell, i) => i)
            .filter(idx => !orderWithKnownCastells.includes(all_names[idx]))
    ]

    const setItemOrder = newItemOrder => {
        const new_order = newItemOrder.map(idx => all_names[idx])
        setOrder(new_order)
        socket.emit('.change_order', event, new_order)
        socket.emit('.request_hores_proves', event)
    }

    const hores = calculateProvesHores(proves, order, durations, horaInici)
    const absoluteHores = calculateProvesHores(proves, order, durations, horaInici, true)
    const isNeta = prova => {
        const matchedBundle = bundlesInfo
            .find(b => b.id === (prova.split('.')[0] || ''))
        
        if (!matchedBundle) return false;

        const parts = Object.keys(matchedBundle?.parts || {})
            .map(part => part.toLowerCase())
            .filter(part => ['pinya', 'folre', 'manilles', 'puntals', 'tronc'].includes(part))

        return parts
            .every(part => part === 'tronc')
    }

    return (
        <div style={styles.proves}>
            { !props.isModels && <HoraInici socket={socket} event={event} horaInici={horaInici} setHoraInici={setHoraInici} userInfo={userInfo} /> }

            <div style={{ display: 'flex', flexDirection: 'row', gap: 5, marginBottom: 10, backgroundColor: '#eee' }}>
                <Pressable style={{ flex: 4, backgroundColor: '#4A90E2', color: 'white', padding: 10, borderRadius: 5, textAlign: 'center', fontSize: 14, border: 'solid 1px transparent' }} onClick={() => setEditing(!editing)}>{editing ? 'Fet' : 'Editar l\'ordre de les proves'}</Pressable>
                { editing && <Pressable style={{ flex: 1, backgroundColor: '#ddd', color: 'black', padding: 10, borderRadius: 5, textAlign: 'center', fontSize: 14, border: 'solid 1px black' }} onClick={() => socket.emit('.remove_last_order', event)}>&#10554;</Pressable> }
            </div>

            { all_names.length > 0 &&
                <List
                    rowHeight={70}
                    order={itemOrderFull}
                    onReOrder={setItemOrder}
                >{
                    all_names.map((prova, i) => {
                        return <List.Item
                            key={`item-${event}-${prova}-${proves.admin.includes(prova)}`}
                            as={ProvaItem(isNeta(prova), proves.admin.includes(prova))}
                            dragHandle={
                                <DragHandle
                                    hores={hores[itemOrderFull.indexOf(i)] || ['?', '?']}
                                />
                            }
                            disabled={!editing}
                        >
                            {
                                !editing && (
                                    <DragHandle
                                        hores={hores[itemOrderFull.indexOf(i)] || ['?', '?']}
                                        disabled={true}
                                    />
                                )
                            }
                            <Prova
                                hores={hores[itemOrderFull.indexOf(i)] || ['?', '?']}
                                absoluteHores={absoluteHores[itemOrderFull.indexOf(i)] || ['?', '?']}
                                horaInici={horaInici}
                                duplicate={check_duplicate(prova, proves)}
                                key={`prova-${event}-${prova}`}
                                prova={prova}
                                isPrivate={proves.private.includes(prova)}
                                isAdmin={proves.admin.includes(prova)}
                                assistencies={assistencies}
                                bundleInfo={bundlesInfo.find(b => b.id === (prova.split('.')[0] || ''))}
                                {...props}
                            />
                        </List.Item>
                    }
                    )
                }</List>
            }

            { userInfo?.es_tecnica >= 1 ? <AddProva {...props} /> : null }
        </div>
    );
}

export default LlistaProves;
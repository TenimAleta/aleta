import { useEffect, useState } from "react";
import AttendanceChart from "./AttendanceChart";
import Select from 'react-select';
import moment from "moment";
import { applyTimeZone } from "../interface/assistencia/LlistaAssistencies";
import { fetchAPI } from "../../utils/utils";
import BlameApp from './blame/BlameApp';
import UserInfo from "../login/UserInfo";
import Pressable from "../other/Pressable";
import { HeaderTabs } from "../interface/ProvesApp";
import AttendanceSeries from "./AttendanceSeries";
import ExportAsExcel from "./ExportAsExcel";

function StatsApp(props) {
    const { socket, userInfo, castellersInfo, setCastellersInfo } = props;

    const [chosenUsers, setChosenUsers] = useState([])
    const [events, setEvents] = useState([])
    const [assistenciesDict, setAssistenciesDict] = useState({})
    const [passatFirst, setPassatFirst] = useState(false)

    const [showBlame, setShowBlame] = useState(false)

    const [filtersEvents, setFiltersEvents] = useState({
        activitats: true,
        assaigs: false,
        actuacions: false,
        ids: [],
        titles: [],
    })

    const [grups, setGrups] = useState({})

    // Default: 1st January of this year or 1st September of last year
    const defaultStartDate = moment().month() > 9-1 ? moment().set({ 'month': 9-1, 'date': 1 }).format('YYYY-MM-DD') : moment().startOf('year').format('YYYY-MM-DD');
    const [start_date, setStart_date] = useState(defaultStartDate)

    // Default: 31st December of this year
    const [end_date, setEnd_date] = useState(moment().endOf('year').format('YYYY-MM-DD'))

    const tecnicaRole = userInfo?.es_tecnica

    const params = window.location.pathname.split('/').filter(part => part != '');
    const isInBlame = params.length > 0 && params[0] === 'stats' && params[1] === 'blame';

    const getListOfAttendance = user => {
        return filteredEvents
            .map(ev => {
                if (assistenciesDict?.[user]?.[ev.id]) {
                    return {
                        eventId: parseInt(ev.id),
                        status: assistenciesDict?.[user]?.[ev.id]
                    }
                } else {
                    return {
                        eventId: parseInt(ev.id),
                        status: 'No confirmat'
                    }
                }
            })
    }

    useEffect(() => {
        document.title = `Estadístiques - Aleta`;
    }, []);

    useEffect(() => {
        if (isInBlame) {
            setShowBlame(true)
        }
    }, [
        isInBlame
    ])

    useEffect(() => {
        // Tothom as default
        setChosenUsers(Object.keys(castellersInfo))
    }, [
        Object.keys(castellersInfo).length,
    ])

    useEffect(() => {
        socket.emit('.request_all_events')

        socket.on('.events', data => setEvents(data))

        return () => {
            socket.off('.events')
        }
    }, [])

    useEffect(() => {
        fetchAPI('/notification_groups', fetchedGrups => {
            const infoFromIds = ids => Object.values(castellersInfo)
                .filter(info => ids.includes(info.id))
                .map(info => ({
                    value: info.id,
                    label: displayName(info.id),
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
        chosenUsers.forEach(user => {
            fetchAPI(`/assistencies/${user}`, data => {
                setAssistenciesDict(prevAssistenciesDict => {
                    const newAssistenciesDict = {...prevAssistenciesDict}

                    chosenUsers
                        .filter(user => !(user in newAssistenciesDict))
                        .forEach(user => {
                            newAssistenciesDict[user] = {}
                            events.forEach(event => newAssistenciesDict[user][event.id] = 'No confirmat')
                        })

                    data
                        .forEach(res => newAssistenciesDict[res.user][res.event] = res.assistencia)

                    return newAssistenciesDict
                })
            })
        })
    }, [
        chosenUsers.length
    ])

    const displayName = user => `${castellersInfo[user].nom} ${castellersInfo[user].cognom}` + (castellersInfo[user].mote ? ` (${castellersInfo[user].mote})` : '')

    const all_users = Object.keys(castellersInfo).map(user => ({
        value: user,
        label: displayName(user)
    }));

    const filteredEvents = events
        .filter(e => moment(e['data-esperada-inici']).isBetween(start_date, end_date, 'day', '[]'))
        .filter(e => 'activitats' in filtersEvents && filtersEvents.activitats ? e.tipus !== 'activitat' : true)
        .filter(e => 'actuacions' in filtersEvents && filtersEvents.actuacions ? e.tipus !== 'actuació' : true)
        .filter(e => 'assaigs' in filtersEvents && filtersEvents.assaigs ? e.tipus !== 'assaig' : true)
        .filter(e => filtersEvents.ids ? !filtersEvents.ids.includes(e.id) : true)
        .filter(e => filtersEvents.titles ? !filtersEvents.titles.includes(e.title) : true)
        .sort((ev_a, ev_b) => moment(ev_a?.['data-esperada-inici']).diff(moment(ev_b?.['data-esperada-inici'])))

    return showBlame ? (
        <BlameApp
            // ATTRIBUTES
            castellersInfo={castellersInfo}
            setCastellersInfo={setCastellersInfo}
        />
    ) : (
        <div
            style={{ width: '80%', paddingTop: 50, paddingBottom: 50 }}
        >
            <UserInfo castellersInfo={castellersInfo} {...props} />

            <HeaderTabs {...props} />

            <Pressable style={{ backgroundColor: '#eee' }} className="boto-back" href='/'>
                ← Tornar a la pàgina principal
            </Pressable>

            <h1>Altres estadístiques</h1>

            {
                tecnicaRole >= 2 && (
                    <div>
                        <button
                            onClick={() => {
                                setShowBlame(true)
                            }}
                        >
                            Estadístiques de canvis de membres de tècnica
                        </button>
                    </div>
                )
            }

            <h1>Estadístiques d'assistència</h1>

            <div>
                <h2>Tria les dates</h2>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', }}>
                    <div style={{ display: 'flex', flexDirection: 'column', }}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                            <label htmlFor="start_date" style={{ marginBottom: '5px', fontSize: 16 }}>Data d'inici</label>
                            <input
                                type="date"
                                id="start_date"
                                name="start_date"
                                value={start_date}
                                onChange={e => setStart_date(e.target.value)}
                                style={{ padding: '10px', fontSize: '16px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginBottom: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => {
                                    setStart_date(moment().startOf('year').format('YYYY-MM-DD'))
                                }}
                                style={{ padding: '10px', fontSize: '16px' }}
                            >
                                Des de l'inici de l'any
                            </button>

                            <button
                                onClick={() => {
                                    setStart_date(moment().format('YYYY-MM-DD'))
                                }}
                                style={{ padding: '10px', fontSize: '16px' }}
                            >
                                Des d'avui
                            </button>

                            <button
                                onClick={() => {
                                    const now = moment();
                                    const september = moment().set({ 'month': 8, 'date': 1 });
                                    if (now.isBefore(september)) {
                                        setStart_date(september.subtract(1, 'year').format('YYYY-MM-DD'));
                                    } else {
                                        setStart_date(september.format('YYYY-MM-DD'));
                                    }
                                }}
                                style={{ padding: '10px', fontSize: '16px' }}
                            >
                                Des de l'1 de setembre
                            </button>

                            <button
                                onClick={() => {
                                    setStart_date(moment().subtract(1, 'month').format('YYYY-MM-DD'))
                                }}
                                style={{ padding: '10px', fontSize: '16px' }}
                            >
                                Des de fa 1 mes
                            </button>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', }}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                            <label htmlFor="end_date" style={{ marginBottom: '5px', fontSize: 16 }}>Data de finalització</label>
                            <input
                                type="date"
                                id="end_date"
                                name="end_date"
                                value={end_date}
                                onChange={e => setEnd_date(e.target.value)}
                                style={{ padding: '10px', fontSize: '16px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginBottom: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => {
                                    setEnd_date(moment().endOf('year').format('YYYY-MM-DD'))
                                }}
                                style={{ padding: '10px', fontSize: '16px' }}
                            >
                                Fins al final de l'any
                            </button>
                            
                            <button
                                onClick={() => {
                                    setEnd_date(moment().format('YYYY-MM-DD'))
                                }}
                                style={{ padding: '10px', fontSize: '16px' }}
                            >
                                Fins avui
                            </button>

                            <button
                                onClick={() => {
                                    setEnd_date(moment().add(1, 'month').format('YYYY-MM-DD'))
                                }}
                                style={{ padding: '10px', fontSize: '16px' }}
                            >
                                Fins d'aquí 1 mes
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <div>
                <h2>Opcions</h2>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    maxWidth: '100%', 
                    margin: '0 auto', 
                    boxSizing: 'border-box',
                    gap: 10,
                }}>
                    <h3>Amagar tipus d'esdeveniment</h3>
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        borderRadius: '10px',
                        backgroundColor: '#f0f0f0',
                        padding: 10,
                    }}>
                        <label 
                            htmlFor="filter_activitats" 
                            style={{ 
                                fontSize: '18px'
                            }}
                        >
                            No mostrar activitats
                        </label>
                        <input
                            type="checkbox"
                            id="filter_activitats"
                            name="filter_activitats"
                            checked={filtersEvents['activitats'] || false}
                            onChange={e => setFiltersEvents(prev => ({...prev, ['activitats']: e.target.checked}))}
                            style={{ 
                                height: '20px', 
                                width: '20px',
                            }}
                        />
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        borderRadius: '10px',
                        backgroundColor: '#f0f0f0',
                        padding: 10
                    }}>
                        <label 
                            htmlFor="filter_actuacions" 
                            style={{ 
                                fontSize: '18px'
                            }}
                        >
                            No mostrar actuacions
                        </label>
                        <input
                            type="checkbox"
                            id="filter_actuacions"
                            name="filter_actuacions"
                            checked={filtersEvents['actuacions'] || false}
                            onChange={e => setFiltersEvents(prev => ({...prev, ['actuacions']: e.target.checked}))}
                            style={{ 
                                height: '20px', 
                                width: '20px',
                            }}
                        />
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        borderRadius: '10px',
                        backgroundColor: '#f0f0f0',
                        padding: 10
                    }}>
                        <label 
                            htmlFor="filter_assaigs" 
                            style={{ 
                                fontSize: '18px'
                            }}
                        >
                            No mostrar assaigs
                        </label>
                        <input
                            type="checkbox"
                            id="filter_assaigs"
                            name="filter_assaigs"
                            checked={filtersEvents['assaigs'] || false}
                            onChange={e => setFiltersEvents(prev => ({...prev, ['assaigs']: e.target.checked}))}
                            style={{ 
                                height: '20px', 
                                width: '20px',
                            }}
                        />
                    </div>

                    <div style={{ 
                        display: filtersEvents.ids.length > 0 ? 'block' : 'none',
                        marginBottom: '20px',
                    }}>
                        <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Events puntuals amagats</h3>
                        <div
                            style={{
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}
                        >
                        {
                            filtersEvents.ids.map((id, index) => (
                                <div key={id} style={{
                                    display: 'flex', 
                                    flexDirection: 'row', 
                                    alignItems: 'center',
                                    justifyContent: 'space-around',
                                    borderRadius: '10px',
                                    backgroundColor: '#f0f0f0',
                                    padding: 10,
                                    marginBottom: '10px'
                                }}>
                                    <label
                                        htmlFor={`filter_${id}`}
                                        style={{ marginRight: '10px', fontSize: '16px' }}
                                    >
                                        {events.find(event => event.id === id).title + applyTimeZone(events.find(event => event.id === id)['data-esperada-inici']).format(' (DD/MM/YYYY)')}
                                    </label>

                                    <input
                                        type="checkbox"
                                        id={`filter_${id}`}
                                        name={`filter_${id}`}
                                        checked={filtersEvents.ids.includes(id)}
                                        onChange={e => {
                                            const newFiltersEvents = {...filtersEvents}
                                            if (e.target.checked) {
                                                newFiltersEvents.ids.push(id)
                                            } else {
                                                newFiltersEvents.ids = newFiltersEvents.ids.filter(_id => _id !== id)
                                            }
                                            setFiltersEvents(newFiltersEvents)
                                        }}
                                        style={{
                                            height: '18px',
                                            width: '18px',
                                        }}
                                    />
                                </div>
                            ))
                        }
                        </div>
                    </div>

                    <div style={{ 
                        display: filtersEvents.titles.length > 0 ? 'block' : 'none',
                    }}>
                        <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Events recorrents amagats</h3>
                        <div
                            style={{
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}
                        >
                            {
                                filtersEvents.titles.map((title, index) => (
                                    <div key={title} style={{
                                        display: 'flex', 
                                        flexDirection: 'row', 
                                        alignItems: 'center',
                                        justifyContent: 'space-around',
                                        borderRadius: '10px',
                                        backgroundColor: '#f0f0f0',
                                        padding: 10,
                                        marginBottom: '10px'
                                    }}>
                                        <label
                                            htmlFor={`filter_${title}`}
                                            style={{ marginRight: '10px', fontSize: '16px' }}
                                        >
                                            {title}
                                        </label>

                                        <input
                                            type="checkbox"
                                            id={`filter_${title}`}
                                            name={`filter_${title}`}
                                            checked={filtersEvents.titles.includes(title)}
                                            onChange={e => {
                                                const newFiltersEvents = {...filtersEvents}
                                                if (e.target.checked) {
                                                    newFiltersEvents.titles.push(title)
                                                } else {
                                                    newFiltersEvents.titles = newFiltersEvents.titles.filter(_title => _title !== title)
                                                }
                                                setFiltersEvents(newFiltersEvents)
                                            }}
                                            style={{
                                                height: '18px',
                                                width: '18px',
                                            }}
                                        />
                                    </div>
                                ))
                            }
                        </div>
                    </div>


                </div>
            </div>

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
                    <h2>Assistència als esdeveniments</h2>

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
                <AttendanceSeries
                    filteredEvents={filteredEvents}
                    filtersEvents={filtersEvents}
                    setFiltersEvents={setFiltersEvents}
                    passatFirst={passatFirst}
                    setPassatFirst={setPassatFirst}
                />
            </div>

            <div>
                <h2>Usuaris</h2>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        margin: 10,
                    }}
                >
                    {
                        <div
                            style={{
                                cursor: 'pointer',
                                padding: '10px',
                                margin: '5px',
                                backgroundColor: chosenUsers.length > 0 && chosenUsers.every(user => all_users.map(user => user.value).includes(user)) ? 'lightgreen' : '#f0f0f0',
                                borderRadius: '5px',
                                textAlign: 'center',
                            }}
                            onClick={() => setChosenUsers(all_users.map(user => user.value))}
                        >
                            Tothom
                        </div>
                    }
                    {
                        Object.keys(grups).map(grup => (
                            <div
                                key={grup}
                                style={{
                                    cursor: 'pointer',
                                    padding: '10px',
                                    margin: '5px',
                                    backgroundColor: chosenUsers.length > 0 && chosenUsers.every(user => grups[grup].map(user => user.value).includes(user)) ? 'lightgreen' : '#f0f0f0',
                                    borderRadius: '5px',
                                    textAlign: 'center',
                                }}
                                onClick={() => setChosenUsers(grups[grup].map(user => user.value))}
                            >
                                {grup}
                            </div>
                        ))
                    }
                </div>
                <Select
                    styles={{
                        valueContainer: (base) => ({
                          ...base,
                          maxHeight: 200,
                          overflowY: "auto"
                        })
                    }}
                    options={all_users}
                    isMulti
                    className="basic-multi-select"
                    classNamePrefix="select"
                    value={chosenUsers.map(user => all_users.find(u => parseInt(u.value) === parseInt(user)))}
                    onChange={selectedUsers => setChosenUsers(selectedUsers.map(user => user.value))}
                />
            </div>

            <div>
                <ExportAsExcel
                    castellersInfo={castellersInfo}
                    filteredEvents={filteredEvents}
                    filtersEvents={filtersEvents}
                    setFiltersEvents={setFiltersEvents}
                    assistenciesDict={assistenciesDict}
                    chosenUsers={chosenUsers}
                />
            </div>

            <div style={{ marginTop: 20 }}>
                <AttendanceChart
                    attendanceDict={assistenciesDict}
                    filteredEvents={filteredEvents}
                    castellersInfo={castellersInfo}
                    chosenUsers={chosenUsers}
                    start_date={start_date}
                    end_date={end_date}
                    filtersEvents={filtersEvents}
                    setFiltersEvents={setFiltersEvents}
                    passatFirst={passatFirst}
                    setPassatFirst={setPassatFirst}
                    getListOfAttendance={getListOfAttendance}
                />
            </div>

            <div style={{ height: 100 }}>&nbsp;</div>
        </div>
    )
}

export default StatsApp;
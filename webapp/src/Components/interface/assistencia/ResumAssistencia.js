import { useEffect, useState } from "react";
import './Assistencia.css'
import LlistaAssistencies, { applyTimeZone } from "./LlistaAssistencies";
import { fetchAPI } from "../../../utils/utils";
import AssistanceChart from "./AssistanceChart";

function ResumAssistencia(props) {
    const { event, assistencies, socket, castellersInfo, noClick, extended, current, past } = props;
    const [assistenciesEvent, setAssistenciesEvent] = useState([]);
    const [popupClosed, setPopupClosed] = useState(true);
    const [waitingResponse, setWaitingResponse] = useState(false);
    const [mailsToShare, setMailsToShare] = useState([]);

    const getName = r => r.mote || r.nom[0] + ' ' + r.cognom;

    useEffect(() => {
        if (assistencies !== undefined) return;
        
        fetchAPI(`/assistencies_event/${props.event}`, data => setAssistenciesEvent(data.data))

        socket.on(`.confirmat`, res => {
            if (res.event === props.event) {
                fetchAPI(`/assistencies_event/${props.event}`, data => setAssistenciesEvent(data.data))
            }
        })

        socket.on('.assistance_exported', data => {
            setWaitingResponse(false);
            window.open(data.url, '_blank')
        })

        return () => {
            socket.off('.assistencies_event');
            socket.off('.confirmat');
            socket.off('.assistance_exported');
        }
    }, [castellersInfo]);

    useEffect(() => {
        socket.emit('.get_default_mails')
        socket.on('.default_mails', data => setMailsToShare(data['writers']))
        return () => socket.off('.default_mails')
    }, [])

    const castellers = (assistencies || assistenciesEvent)
        .filter(c => parseInt(c?.canalla) !== 1)
        .filter(c => parseInt(c?.music) !== 1)

    const fitxats = castellers.filter(row => row.assistencia === 'Fitxat');
    const venen = castellers.filter(row => row.assistencia === 'Vinc');
    const no_venen = castellers.filter(row => row.assistencia === 'No vinc');
    const no_confirmats = castellers
        .filter(row => row.assistencia === 'No confirmat')
        // Que no surtin novatos
        .filter(row => !row?.mote || !row.mote.includes('#'))

    const canalla = (assistencies || assistenciesEvent).filter(c => parseInt(c.canalla) === 1)
    const musics = (assistencies || assistenciesEvent).filter(c => parseInt(c?.music) === 1)
    const novells = (assistencies || assistenciesEvent).filter(c => c?.mote?.includes('#'))

    const eventInfo = {
        title: props.title,
        data_inici: props['data-inici'],
        data_fi: props['data-fi'],
    }

    const assistenciesHour = castellers
        .map(c => ({
            'id': c.id,
            'name': c.mote || `${c.nom} ${c.cognom}`,
            'assist': c['assistència'],
            'entrada': !c['data-entrada'] || isNaN(Date.parse(c['data-entrada'])) ? applyTimeZone(eventInfo.data_inici).toDate() : applyTimeZone(c['data-entrada']).toDate(),
            'sortida': !c['data-sortida'] || isNaN(Date.parse(c['data-sortida'])) ? applyTimeZone(eventInfo.data_fi).toDate() : applyTimeZone(c['data-sortida']).toDate(),
        }))

    return (
        <>
            { !noClick && <LlistaAssistencies assistencies={assistencies || assistenciesEvent} popupClosed={popupClosed} setPopupClosed={setPopupClosed} {...props} /> }
            <div className="assistencia-summary" onClick={() => !noClick && setPopupClosed(false)}>
                { fitxats.length > 0 && <div className="fitxats" title={fitxats.map(getName).join('\n')} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>📍</span>
                    <span>{fitxats.length}</span>
                </div> }
                <div className="venen" title={venen.map(getName).join('\n')} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>
                        { 
                            current ? <>🏃‍♀️ </> :
                            past ? <>👻 </> :
                            <>&#9989; </>
                        }
                    </span>
                    <span>
                        {venen.length}
                    </span>
                </div>
                <div className="no_venen" title={no_venen.map(getName).join('\n')} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>
                        &#10060;
                    </span>
                    <span>
                        {no_venen.length}
                    </span>
                </div>
                <div className="no_confirmats" title={no_confirmats.map(getName).join('\n')} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>
                        😶
                    </span>
                    <span>
                        {no_confirmats.length}
                    </span>
                </div>
            </div>
            { extended && <>
                <div
                    onClick={() => {
                        setWaitingResponse(true);

                        socket.emit('.export_assistance', event, eventInfo, assistencies || assistenciesEvent, castellersInfo, {
                            assistanceTypesToExport: ['Vinc', 'Fitxat'],
                            extraColumnsToExport: []
                        }, mailsToShare)
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                        backgroundColor: 'lightgreen',
                        borderRadius: 5,
                        cursor: 'pointer',
                        marginTop: 10,
                        color: 'black'
                    }}
                >
                    {
                        waitingResponse ? <span>Creant Google Sheet...</span> :
                        <span>Exporta l'assistència a Google Sheets</span>
                    }
                </div>
            </> }
            { !props.noInfo &&
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                        marginTop: 10,
                    }}
                >
                    <AssistanceChart
                        assistencies={assistenciesHour}
                        eventInfo={eventInfo}
                        castellersInfo={castellersInfo}
                        socket={socket}
                    />
                </div>
            }
        </>
    )
}

export default ResumAssistencia;
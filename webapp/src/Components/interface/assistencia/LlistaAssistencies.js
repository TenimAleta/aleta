import { useState, useEffect } from "react";
import Popup from "../../other/Popup";
import Info from "../info/Info";
import Pressable from "../../other/Pressable";
import './Assistencia.css'

import { setPerfil } from "../../pissarra/controller/Casteller";
import moment from 'moment'
import ResumAssistencia from "./ResumAssistencia";
import TargetChooser from "./TargetChooser";
import { fetchAPI } from "../../../utils/utils";

export const applyTimeZone = (date, tz='Spain') => {
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

export const applyInverseTimeZone = (date=null, tz='Spain') => {
    if (tz === 'Spain') {
        const mom = date ? moment(date) : moment()
        const lastSundayOfThisYearsMarch = mom.clone().year(mom.clone().year()).month(2).endOf('month').day('Sunday');
        const lastSundayOfThisYearsOctober = mom.clone().year(mom.clone().year()).month(9).endOf('month').day('Sunday');

        if (mom < lastSundayOfThisYearsMarch) {
            // January - March: Winter time
            return mom.add(1, 'hours');
        } else if (mom < lastSundayOfThisYearsOctober) {
            // April - October: Summer time
            return mom.add(2, 'hours');
        } else {
            // November - December: Winter time
            return mom.add(1, 'hours');
        }
    } else {
        return date ? moment(date) : moment()
    }
}

const toMoment = dateStr => applyTimeZone(dateStr)

function RaresaPack({ raresa, highlightedRareses, matchedProva, disabled }) {
    const [showAll, setShowAll] = useState(false)
    const isHighlighted = highlightedRareses.includes(raresa.raw)

    return (
        <div
            key={raresa.hour}
            className={`raresa ${!matchedProva ? 'general' : ''} ${matchedProva && disabled ? 'past' : ''} ${isHighlighted ? 'highlight' : ''}`}
        >
            <div><strong>{raresa.hour}</strong></div>
            <div onClick={() => setShowAll(!showAll)} className={`noms ${raresa.names.length > 3 ? 'toolong' : ''} ${showAll ? 'showall' : ''}`}>
                {raresa.names.map(name => <div key={name}>{name}</div>)}
            </div>
        </div>
    )
}

function Casteller({ socket, assistencies_dict, event, id, user, assistencia, has_notifications, lesionat, mote, nom, cognom, canalla, music, ...c }) {
    const [showButtons, setShowButtons] = useState(false)

    const set_assistencia = (next_assist) => {
        socket.emit('.confirmar', event, user, next_assist, null, true);
        socket.emit('.request_assistencia_event', event);
        setShowButtons(false);
    }

    const button_style = (assist) => ({
        flex: 1,
        textAlign: 'center',
        backgroundColor: assist === c['assistència'] ? '#aaa' : '#eee',
        paddingTop: 5,
        paddingBottom: 5,
        borderRadius: 5,
    })

    const displayName = 
        (canalla === 1 ? '👶 ' :
        music === 1 ? '🥁 ' :
        lesionat === 1 ? '🏥 ' :
        '') +
        (mote || nom + ' ' + cognom)

    return (
        <div
            style={{
                margin: '10px 5px',
            }}
        >
            <div
                onClick={() => setShowButtons(!showButtons)}
                className={`${assistencies_dict[id]} casteller-assistencia`}
            >
                <div style={{ color: assistencia === 'No confirmat' && has_notifications === 0 ? 'red' : 'white' }}>
                    {displayName}
                </div>
            </div>
            {
                showButtons && <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                    }}
                >
                    <Pressable style={button_style(2)} onClick={() => set_assistencia(2)}>📍</Pressable>
                    <Pressable style={button_style(1)} onClick={() => set_assistencia(1)}>✅</Pressable>
                    <Pressable style={button_style(0)} onClick={() => set_assistencia(0)}>❌</Pressable>
                </div>
            }
        </div>
    )
}

function LlistaRareses({ rareses, aviat, tard, matchedProva }) {
    const formatHora = dateStr => toMoment(dateStr).format('HH:mm')
    const name = assist => assist.mote || (assist.nom + ' ' + assist.cognom)

    const possibleEntrades = [...new Set(rareses.map(assist => assist['data-entrada']))]
    const possibleSortides = [...new Set(rareses.map(assist => assist['data-sortida']))]

    const highlightedEntrades = possibleEntrades
        .filter(() => matchedProva)
        .filter(hora => moment(matchedProva.start).add(-5, 'minutes') < toMoment(hora))
        .filter(hora => toMoment(hora) < moment(matchedProva.end).add(5, 'minutes'))

    const highlightedSortides = possibleSortides
        .filter(() => matchedProva)
        .filter(hora => moment(matchedProva.start).add(-5, 'minutes') < toMoment(hora))
        .filter(hora => toMoment(hora) < moment(matchedProva.end).add(5, 'minutes'))

    const packedEntradesByTime = possibleEntrades
        .map(entrada => rareses.filter(assist => assist['data-entrada'] === entrada))
        .map((users, i) => ({
            hour: formatHora(possibleEntrades[i]),
            names: users.map(user => name(user)),
            raw: possibleEntrades[i]
        }))

    const packedSortidesByTime = possibleSortides
        .map(sortida => rareses.filter(assist => assist['data-sortida'] === sortida))
        .map((users, i) => ({
            hour: formatHora(possibleSortides[i]),
            names: users.map(user => name(user)),
            raw: possibleSortides[i]
        }))

    const llista_entrades = packedEntradesByTime
        .map(entrada => <RaresaPack
            key={entrada.hour}
            matchedProva={matchedProva}
            raresa={entrada}
            highlightedRareses={highlightedEntrades}
            disabled={matchedProva ? toMoment(entrada.raw) <= moment(matchedProva.start) : false}
        />)

    const llista_sortides = packedSortidesByTime
        .map(sortida => <RaresaPack
            key={sortida.hour}
            matchedProva={matchedProva}
            raresa={sortida}
            highlightedRareses={highlightedSortides}
            disabled={matchedProva ? moment(matchedProva.end) <= toMoment(sortida.raw) : false}
        />)

    return (
        <>
            {
                tard && llista_entrades.length > 0 ? <h2>Arriben tard</h2> :
                aviat && llista_sortides.length > 0 ? <h2>Marxen aviat</h2> :
                ''
            }
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className='llista-rareses-packs'>
                    {
                        tard && llista_entrades.length > 0 ? llista_entrades :
                        aviat && llista_sortides.length > 0 ? llista_sortides :
                        ''
                    }
                </div>
            </div>
        </>
    )
}

function ProvaInfo({ prova, start, end, socket }) {
    const castell = prova.split('.')[0] || null
    const formatHora = dateStr => moment(dateStr).format('HH:mm')
    const [bundleName, setBundleName] = useState(null)

    useEffect(() => {
        socket.emit('.request_bundle', castell)

        socket.on('.bundle', bundle => {
            setBundleName(bundle.bundle.nom)
        })

        return () => {
            socket.off('.bundle')
        }
    }, [])

    return (
        <div>
            { bundleName && <h1>
                { bundleName && <>{bundleName} </> }
                { (start && end) && <>({ formatHora(start) } - { formatHora(end) })</> }
            </h1> }
        </div>
    )
}

function LlistaAssistencies(props) {
    const { withTarget, popupClosed, setPopupClosed, assistencies, socket, etiquetes, etiquetaUsers } = props;    
    const [sortByAssist, setSortByAssist] = useState(true);
    const [filter, setFilter] = useState('');

    const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const getName = r => r.mote || r.nom[0] + ' ' + r.cognom;
    const searchableName = r => `${r.nom} ${r.cognom} ${r.mote}`

    const disable_mock = filter.length > 0;

    const iterate_assistencia = (e, event, user, prev_assist) => {
        const update = prev_assist !== 'No confirmat';

        const next_assist =
            prev_assist === 'No confirmat' ? 1 :  // Vinc
            prev_assist === 'No vinc' ? 1 :       // Vinc
            prev_assist === 'Vinc' ? 2 :          // Fitxat
            prev_assist === 'Fitxat' ? 0 :        // No vinc
            1;

        if (disable_mock) {
            socket.emit('.confirmar', event, user, next_assist, update, true);
            socket.emit('.request_assistencia_event', props.event);
        } else {
            setTimeout(() => {
                socket.emit('.confirmar', event, user, next_assist, update, true);
                socket.emit('.request_assistencia_event', props.event);
            }, 500);
        }
    };

    const mock_iterate_assistencia = (e, event, user, prev_assist) => {
        const update = prev_assist !== 'No confirmat';

        const next_assist_str =
            prev_assist === 'No confirmat' ? 'Vinc' :  // Vinc
            prev_assist === 'No vinc' ? 'Vinc' :       // Vinc
            prev_assist === 'Vinc' ? 'Fitxat' :          // Fitxat
            prev_assist === 'Fitxat' ? 'Novinc' :        // No vinc
            'Vinc';
        
        // Remove all Mock classes
        Array.from(
            e
                .currentTarget
                .classList
        )
            .filter(c => c.startsWith('Mock'))
            .forEach(c => e.currentTarget.classList.remove(c))

        // Add newest Mock classes
        e
            .currentTarget
            .classList
            .add('Mock' + next_assist_str)
    }

    const assistenciaOrder = {
        "Fitxat": 4,
        "Vinc": 3,
        "No vinc": 2,
        "No confirmat": 1
    };   

    const compareAssistencia = (a, b) => {
        if (a.assistencia in assistenciaOrder && b.assistencia in assistenciaOrder) {
            return assistenciaOrder[a.assistencia] > assistenciaOrder[b.assistencia] ? -1 : 1;
        } else if (a.assistencia in assistenciaOrder) {
            return -1;
        } else if (b.assistencia in assistenciaOrder) {
            return 1;
        } else {
            return 0;
        }
    };

    const assistencia_filtered = assistencies
        .filter(row => parseInt(row.hidden) !== 1 || ['Vinc', 'Fitxat'].includes(row.assistencia))
        .filter(row => normalize(searchableName(row)).includes(normalize(filter)))
        .sort((a, b) => {
            if (a.assistencia !== b.assistencia) {
                return compareAssistencia(a,b);
            } else if (a.has_notifications !== b.has_notifications) {
                return a.has_notifications ? -1 : 1;
            } else {
                return getName(a) > getName(b) ? 1 : -1;
            }
        })        

    const castellers = assistencia_filtered
        .filter(c => isNaN(c.canalla) || parseInt(c.canalla) === 0)
        .filter(c => isNaN(c.music) || parseInt(c.music) === 0)
        .filter(c => !c?.mote || !c.mote.includes('#'))

    const canalla = assistencia_filtered
        .filter(c => parseInt(c.canalla) === 1)

    const novells = assistencia_filtered
        .filter(c => c?.mote?.includes('#'))

    const musics = assistencia_filtered
        .filter(c => parseInt(c?.music) === 1)

    const users_by_altura = (etiquetes || [])
        .filter(e => e.id || e.id === 0)
        .map(e => e.id)
        .map(id => etiquetaUsers?.[id])
        .map(etiquetaInfo => ({
            perfil: etiquetaInfo?.perfil,
            castellers: castellers
                .filter(c => etiquetaInfo?.castellers?.some(e => e.id === c.id))
        }))
        .concat([{
            perfil: 'Canalla',
            castellers: canalla
        }, {
            perfil: 'Novell',
            castellers: novells
        }, {
            perfil: 'Músic',
            castellers: musics
        }])
        .concat([{
            perfil: 'No etiquetat',
            castellers: castellers
                .filter(c => !etiquetes.some(e => etiquetaUsers?.[e.id]?.castellers?.some(casteller => casteller.id === c.id)))
        }])
        .filter(perfil => perfil?.castellers?.length > 0)

    const assistencies_dict = Object.fromEntries(
        assistencia_filtered
            .map(c => [c.id, c.assistencia])
            .map(([id, assist]) => [id, assist.replace(' ', '')])
    )

    const llistes_perfils = users_by_altura
        .map(perfil =>
            <div className="llista-perfil" key={perfil.perfil}>
                <div className="perfil">{perfil.perfil} ({perfil.castellers.length})</div>
                {perfil.castellers.map(casteller =>
                    <Casteller
                        key={casteller.id+perfil.perfil}
                        {...casteller}
                        assistencies_dict={assistencies_dict}
                        {...props}
                    />
                )}
            </div>
        )

    const arribenTard = assistencies
        .filter(user => parseInt(user['assistència']) === 1)
        .filter(user => !isNaN(Date.parse(user['data-entrada'])))
        // .filter(user => props['data-inici'] ? moment(props['data-inici']) < moment(user['data-entrada']) : true)
        .sort((a,b) => new Date(a['data-entrada']) > new Date(b['data-entrada']) ? 1 : -1)

    const surtenAviat = assistencies
        .filter(user => parseInt(user['assistència']) === 1 || parseInt(user['assistència']) === 2)
        .filter(user => !isNaN(Date.parse(user['data-sortida'])))
        // .filter(user => props['data-fi'] ? moment(user['data-sortida']) < moment(props['data-fi']) : true)
        .sort((a,b) => new Date(a['data-sortida']) > new Date(b['data-sortida']) ? 1 : -1)
    
    useEffect(() => {
        socket.emit('.request_assistencia_event', props.event);
    }, [props.event, popupClosed])

    return (
        <Popup closed={popupClosed} setClosed={setPopupClosed}>
            { !props.noInfo && <Info {...props} /> }
            { props.matchedProva && <ProvaInfo {...props.matchedProva} {...props} /> }

            { withTarget && <TargetChooser {...props} /> }
            { withTarget && <h3>Assistència d'aquest esdeveniment</h3> }

            <ResumAssistencia extended noClick {...props} />
            <div className="llista-rareses">
                <LlistaRareses rareses={arribenTard} tard matchedProva={props.matchedProva} />
                <LlistaRareses rareses={surtenAviat} aviat matchedProva={props.matchedProva} />
            </div>
            <form style={{ marginTop: 10 }}>
                <input style={{ fontSize: 16 }} placeholder="Busca un nom..." className="filter" value={filter} onChange={ev => setFilter(ev.target.value)} />
                <input type='reset' value='Esborra' className="reset" onClick={() => setFilter('')} />
            </form>
            <div className="assistents">
                {llistes_perfils}
            </div>
        </Popup>
    )
}

export default LlistaAssistencies;
import { useEffect, useState } from "react";
import Popup from "../../other/Popup";
import './Importer.css'
import { rebuildPosicions } from "../../../utils/loadPositions";
import BotoPestanya from "../../editor/BotoPestanya";
import { applyTimeZone } from "../../interface/assistencia/LlistaAssistencies";
import Pressable from "../../other/Pressable";
import moment from "moment";
import BotoPestanyaUp from "../controller/botons/BotoPestanyaUp";
import BotoPestanyaDown from "../controller/botons/BotoPestanyaDown";
import { fetchAPI, fetchAPIquery } from "../../../utils/utils";

const cap = word =>
  word.charAt(0).toUpperCase() + word.toLowerCase().slice(1)

const getPlantillaFromPestanya = (chosenPartId, selectedBundle, pestanya, bundlesInfo) => {
    const matchedBundle = bundlesInfo
        ?.find(bundle => bundle.id === selectedBundle)

    if (!matchedBundle) return undefined;

    if (matchedBundle.simultani) {
        const idFromPartId = matchedBundle?.bundles?.[chosenPartId]?.id || null

        const matchedBundles = Object.values(matchedBundle.bundles)
            .map(bundle => bundlesInfo.find(b => b.id === bundle.id))
            .filter(bundle => bundle !== undefined)

        if (matchedBundles?.length === 0) return undefined;
        const chosenBundle = matchedBundles
            .find(bundle => bundle.id === idFromPartId)

        const matchedPart = Object.entries(chosenBundle?.parts || {})
            .find(([part, plantilla]) => part.toLowerCase() === pestanya.toLowerCase())

        if (!matchedPart) return undefined;

        return matchedPart[1]
    } else {
        const matchedPart = Object.entries(matchedBundle?.parts || {})
            .find(([part, plantilla]) => part.toLowerCase() === pestanya.toLowerCase())

        if (!matchedPart) return undefined;

        return matchedPart[1]
    }
}

function Importer(props) {
    const { assistenciesEvent, setCastellBeingImported, json, pestanya, setPestanya, importing, setImporting, posicionsLog, setPosicionsLog, parametrizeOption, setAjuntament, selectedEvent, selectedBundle, selectedVersio, socket, castellersInfo } = props;

    const [events, setEvents] = useState([]);
    const [eventsInfo, setEventsInfo] = useState([]);
    const [castells, setCastells] = useState([]);
    const [posicionsLogs, setPosicionsLogs] = useState(null);
    const [posicions, setPosicions] = useState(null);

    const [originalPosicionsLog, setOriginalPosicionsLog] = useState([]);

    const [previewedEvent, setPreviewedEvent] = useState(null);
    const [previewedCastell, setPreviewedCastell] = useState(null);
    const [previewedVersio, setPreviewedVersio] = useState(null);

    const [bundlesInfo, setBundlesInfo] = useState([]);
    const [posicionsLogPerPestanya, setPosicionsLogPerPestanya] = useState({});
    const [blankSelected, setBlankSelected] = useState(false);

    const [selectedCastell, setSelectedCastell] = useState(null);

    const bundleIsSimultani = bundlesInfo
        ?.find(bundle => bundle.id === selectedBundle)
        ?.simultani

    const castellsWithPestanya = Object.keys(
        bundlesInfo
            ?.find(bundle => bundle.id === selectedBundle)
            ?.bundles
        || {}
    )
        .filter(id => getPlantillaFromPestanya(id, selectedBundle, pestanya, bundlesInfo))

    const nCastells = castellsWithPestanya.length
    const numCastell = castellsWithPestanya.indexOf(selectedCastell)

    useEffect(() => {
        if (nCastells > 0) {
            setSelectedCastell(castellsWithPestanya[0])
        }
    }, [
        nCastells,
        JSON.stringify(castellsWithPestanya),
        pestanya
    ])

    const localeOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: 'UTC'
      };

    const formatEvent = event => `${event.title} - ${event['tipus'] && cap(event['tipus'])} de ${new Date(event['data-esperada-inici']).toLocaleString('ca-ES', localeOptions)}`

    useEffect(() => {
        socket.emit('.request_available_imports', selectedEvent, selectedBundle, selectedVersio)

        socket.on('.available_imports', imports => {
            setEvents(imports.events);
            setCastells(imports.castells);
            setPosicionsLogs(imports.posicionsLog);
        });

        return () => socket.off('.available_imports');
    }, []);
    
    useEffect(() => {
        fetchAPI('/bundles', setBundlesInfo)
    }, [])

    const chosenPartId = selectedCastell

    useEffect(() => {
        if (posicionsLogs === null) return;

        const idsInPestanya = Object.entries(json)
            ?.filter(([caixa_id, caixa]) => caixa?.pestanya.toLowerCase() === pestanya.toLowerCase())
            ?.map(([caixa_id, caixa]) => caixa_id)

        setPosicions(
            posicionsLogs.map(castells => castells.map(posicionsLogsCastell => rebuildPosicions({
                'posicionsLog': posicionsLogsCastell
                    .split('\n')
                    .slice(1)
                    .map(log => log.indexOf('_') > -1 ? log.split('_')[1] : log)
                    .map(log => chosenPartId ? `${chosenPartId}_${log}` : log)
                    .filter(log => idsInPestanya.includes(log?.split(',')?.[0])),
            })))
        )
    }, [json, chosenPartId, posicionsLogs, pestanya]);

    const loadPositions = (eventId, bundleId, versio) => {
        const load_positions = (callback) => fetchAPIquery(`/positions/${eventId}/${bundleId}/${versio}`, (res) => {
            if ('url' in res) {
                fetch(res.url)
                    .then(data => data.text())
                    .then(callback)
            }
        }, false, false, {
            force_disk: 0
        })

        const callback = data => {
            if (eventId === selectedEvent && bundleId === selectedBundle && versio === selectedVersio) {
                const withoutFirstLine = data.split('\n').slice(1)
                setOriginalPosicionsLog(withoutFirstLine)
            } else if (eventId === previewedEvent && bundleId === previewedCastell && versio === previewedVersio) {
                if (data.split('\n').length > 0) {
                    // setAjuntament(parametrizeOption('ajuntament', data.split('\n')[0]))

                    const fullPosicionsLog = data.split('\n').slice(1)
                    const idsInPestanya = Object.entries(json)
                        ?.filter(([caixa_id, caixa]) => caixa?.pestanya.toLowerCase() === pestanya.toLowerCase())
                        ?.map(([caixa_id, caixa]) => caixa_id)

                    const chosenBundleIsSimultani = bundlesInfo
                        ?.find(bundle => bundle.id === previewedCastell)
                        ?.simultani

                    const posicionsLogPestanya = fullPosicionsLog
                        .map(log => !chosenBundleIsSimultani && chosenPartId ? `${chosenPartId}_${log}` : log)
                        .filter(log => idsInPestanya.includes(log?.split(',')?.[0]))

                    setPosicionsLogPerPestanya(prev => ({
                        ...prev,
                        [!chosenBundleIsSimultani ? selectedCastell : 'tots']: {
                            ...prev?.[!chosenBundleIsSimultani ? selectedCastell : 'tots'],
                            [pestanya.toLowerCase()]: {
                                event: previewedEvent,
                                castell: previewedCastell,
                                versio: previewedVersio, 
                                posicions: posicionsLogPestanya,
                                part: Object.entries(bundlesInfo.find(bundle => bundle.id === previewedCastell)?.parts || {})
                                    .find(([part, plant]) => plant.toLowerCase() === plantillaFromPestanya.toLowerCase())
                                    ?.[0]
                            }
                        }
                    }))
                }
            }
        }

        load_positions(callback)
    }

    useEffect(() => {
        if (selectedEvent === null || selectedBundle === null || selectedVersio === null) return;
        socket.emit('.load_positions', selectedEvent, selectedBundle, selectedVersio);
        // loadPositions(selectedEvent, selectedBundle, selectedVersio)
    }, [selectedEvent, selectedBundle, selectedVersio])

    useEffect(() => {
        socket.on('.loaded_positionsv2', res => {
            if (res.event === selectedEvent && res.castell === selectedBundle && res.versio === selectedVersio) {
                const withoutFirstLine = res.data.split('\n').slice(1)
                setOriginalPosicionsLog(withoutFirstLine)
            } else if (res.event === previewedEvent && res.castell === previewedCastell && res.versio === previewedVersio) {
                if (res.data.split('\n').length > 0) {
                    // setAjuntament(parametrizeOption('ajuntament', res.data.split('\n')[0]))

                    const fullPosicionsLog = res.data.split('\n').slice(1)
                    const idsInPestanya = Object.entries(json)
                        ?.filter(([caixa_id, caixa]) => caixa?.pestanya.toLowerCase() === pestanya.toLowerCase())
                        ?.map(([caixa_id, caixa]) => caixa_id)

                    const chosenBundleIsSimultani = bundlesInfo
                        ?.find(bundle => bundle.id === previewedCastell)
                        ?.simultani

                    const posicionsLogPestanya = fullPosicionsLog
                        .map(log => !chosenBundleIsSimultani && chosenPartId ? `${chosenPartId}_${log}` : log)
                        .filter(log => idsInPestanya.includes(log?.split(',')?.[0]))

                    setPosicionsLogPerPestanya(prev => ({
                        ...prev,
                        [!chosenBundleIsSimultani ? selectedCastell : 'tots']: {
                            ...prev?.[!chosenBundleIsSimultani ? selectedCastell : 'tots'],
                            [pestanya.toLowerCase()]: {
                                event: previewedEvent,
                                castell: previewedCastell,
                                versio: previewedVersio, 
                                posicions: posicionsLogPestanya,
                                part: Object.entries(bundlesInfo.find(bundle => bundle.id === previewedCastell)?.parts || {})
                                    .find(([part, plant]) => plant.toLowerCase() === plantillaFromPestanya.toLowerCase())
                                    ?.[0]
                            }
                        }
                    }))
                }
            }
        });

        return () => {
            socket.off('.loaded_positionsv2')
        }
    }, [chosenPartId, previewedEvent, previewedCastell, previewedVersio])

    useEffect(() => {
        const orderOfPriority = [
            'pinya',
            'folre',
            'manilles',
            'puntals',
            'tronc',
            'organització'
        ]

        const removeDuplicatesCaixes = (arr) => {
            const seen = {};
            return arr
                .reverse()
                .reduce((acc, item) => {
                    const caixaId = item.split(',')[0];
                    if (!seen[caixaId]) {
                        seen[caixaId] = true;
                        acc.push(item);
                    }
                    return acc;
                }, [])
                .reverse();
        };

        const mergedPosicions = Object.values(posicionsLogPerPestanya)
            .filter(entry => entry)
            .map(entry => {
                return orderOfPriority
                    .filter(key => entry?.[key]?.posicions)
                    .map(key => entry?.[key]?.posicions)
                    .map(removeDuplicatesCaixes)
                    .reduce((acc, posicions) => [...acc, ...posicions], []);
            })
            .reduce((acc, posicions) => [...acc, ...posicions], []);

        // Si trec aquest console.log, no funciona. WTF, Javascript.
        console.log(
            'N de persones a cada pis:',
            Object.values(posicionsLogPerPestanya)
                .filter(entry => entry)
                .map(entry => {
                    return orderOfPriority
                        .filter(key => entry?.[key]?.posicions)
                        .map(key => entry?.[key]?.posicions)
                        .map(removeDuplicatesCaixes)
                        .map(posicions => posicions.length)
                }),

            // mergedPosicions.length,
            // originalPosicionsLog.length
        )

        setPosicionsLog([...mergedPosicions, ...originalPosicionsLog])
        
        // setPosicionsLog(
        //     Object.entries(posicionsLogPerPestanya)
        //         .filter(([part, log]) => log !== undefined)
        //         .sort(([partA, logA], [partB, logB]) => orderOfPriority.indexOf(partA) > orderOfPriority.indexOf(partB) ? 1 : -1)
        //         .map(([part, log]) => log?.posicions)
        //         .flat()
        // )
    }, [posicionsLogPerPestanya, originalPosicionsLog])

    const importCastell = () => {
        if (posicionsLog.length > 0) {
            const posicionsLogToWrite = [
                `OPTIONS:ajuntament=${0}`,
                posicionsLog.join('\n')
            ]
                .join('\n')

            socket.emit('.import_from_log', posicionsLogToWrite, [selectedEvent, selectedBundle, selectedVersio])
        }

        socket.emit('.load_positions', selectedEvent, selectedBundle, selectedVersio);
        setImporting(false);
    };

    const previewImport = (event, castell_versio) => {
        if (castell_versio.split('.').length !== 3) return;
        const [castell, versio, _] = castell_versio.split('.');

        setPreviewedEvent(event.id)
        setPreviewedCastell(castell)
        setPreviewedVersio(versio)
    };

    useEffect(() => {        
        if (previewedCastell !== null && previewedEvent !== null && previewedVersio !== null) {
            // loadPositions(previewedEvent, previewedCastell, previewedVersio)
            socket.emit('.load_positions', previewedEvent, previewedCastell, previewedVersio);
        }
    }, [previewedCastell, previewedEvent, previewedVersio])

    useEffect(() => {
        const savedInfo = posicionsLogPerPestanya?.[selectedCastell]?.[pestanya.toLowerCase()]
        const savedInfoTots = posicionsLogPerPestanya?.['tots']?.[pestanya.toLowerCase()]

        if (savedInfo) {
            setPreviewedEvent(savedInfo.event)
            setPreviewedCastell(savedInfo.castell)
            setPreviewedVersio(savedInfo.versio)
        } else if (savedInfoTots) {
            setPreviewedEvent(savedInfoTots.event)
            setPreviewedCastell(savedInfoTots.castell)
            setPreviewedVersio(savedInfoTots.versio)
        } else {
            setPreviewedEvent(null)
            setPreviewedCastell(null)
            setPreviewedVersio(null)
        }
    }, [pestanya, posicionsLogPerPestanya, selectedCastell])

    useEffect(() => {
        if (events.length === 0) return;
        socket.emit('.request_events', events);
        socket.on('.events_info', info => setEventsInfo(
            [...eventsInfo, ...info]
        ));
    }, [events]);

    useEffect(() => {
        if (bundleIsSimultani && importing) {
            setCastellBeingImported(chosenPartId)
        } else {
            setCastellBeingImported(null)
        }
    }, [bundleIsSimultani, chosenPartId, importing])

    const capFirst = (string) => string.charAt(0).toUpperCase() + string.slice(1);

    const emptyPosicions = { caixes: [], castellers: [] };

    const plantillaFromPestanya = getPlantillaFromPestanya(chosenPartId, selectedBundle, pestanya, bundlesInfo)

    const llista_imports = eventsInfo
        .map((ev, i) => [ev, castells[i] || [], posicions && posicions[i] || emptyPosicions])
        .filter(([event, castellsInEvent]) => Object.keys(event).length !== 0)
        .filter(([event, castellsInEvent]) => castellsInEvent.length !== 0)
        .sort((a, b) => new Date(a[0]['data-esperada-inici']) < new Date(b[0]['data-esperada-inici']) ? 1 : -1)
        .map(([event, castellsInEvent, posicionsCastell], ev_k) => {
            const associatedBundles = castellsInEvent
                .map(castell => bundlesInfo.find(bundle => bundle.id === castell.split('.')[0]))

            const simultanisMap = associatedBundles
                .map(bundle => bundleIsSimultani && (bundle?.id === selectedBundle) ? bundle : {})
                .map(bundle =>
                    Object.values(bundle?.bundles || {})
                        .map(b => Object.values(b.parts))
                        .some(plantilles => plantilles.some(plantilla => plantilla?.toLowerCase() === plantillaFromPestanya?.toLowerCase()))
                )

            const matchedBundlesMap = associatedBundles
                .map(bundle => Object.values(bundle?.parts || {}))
                .map(parts => parts.some(part => part?.toLowerCase() === plantillaFromPestanya?.toLowerCase()))    

            const matchedPart = associatedBundles
                .map(bundle => Object.entries(bundle?.parts || {}))
                .map(parts => parts.find(([pest, plant]) => plant?.toLowerCase() === plantillaFromPestanya?.toLowerCase()))    
                .map(part => cap(part?.[0] || ''))

            if (matchedBundlesMap.every(e => e === false) && simultanisMap.every(e => e === false)) return null;

            const MOMENT_MAX = moment('2099-12-29')
            const isModel = moment(event['data-esperada-inici']).isAfter(MOMENT_MAX);

            const selectedVersions = Object.values(posicionsLogPerPestanya)
                .map(pestanyes => Object.entries(pestanyes))
                .flat()
                .map(([part, data]) => `${part}.${data?.versio}`)

            return (
                <>
                <div style={{
                    marginBottom: isModel ? 50 : 10,
                }} key={event.id}>
                    {
                        isModel ?
                            <div>
                                <strong>
                                    PINYA MODEL
                                </strong>
                            </div>
                        :
                            <div>
                                {
                                    moment(event?.['data-esperada-inici']).isAfter(moment()) && <em>(FUTUR)&nbsp;</em>
                                }
                                <strong>{event.title}</strong> - {event['tipus'] && capFirst(event['tipus'])} de {new Date(event['data-esperada-inici']).toLocaleString('ca-ES', localeOptions)}
                            </div>
                    }
                    <div>
                        {castellsInEvent.map((castell, k) => {
                            if (!matchedBundlesMap[k] && !simultanisMap[k]) return null;

                            const castellersInProva = (k < posicionsCastell.length ? (Object.keys(posicionsCastell[k].castellers) || []) : [])
                                .map((casteller, i) => assistenciesEvent.find(c => parseInt(c.id) === parseInt(casteller)) || undefined)

                            const n_fitxats = castellersInProva.filter(c => c && c["assistència"] === 2).length;
                            const n_assistents = castellersInProva.filter(c => c && c["assistència"] === 1).length;
                            const n_inassistents = castellersInProva.filter(c => c && c["assistència"] === 0).length;
                            const n_no_resposta = castellersInProva.filter(c => c && c["assistència"] === null).length;

                            const n_castellers = castellersInProva.length;
                            const empty = n_fitxats === 0 && n_assistents === 0 && n_inassistents === 0 && n_no_resposta === 0;

                            const castellsVersio = castell.split('.')[1]
                            const castellIsCurrentlySelected = castellsVersio === previewedVersio
                            const castellIsAlreadyImported = selectedVersions.includes(`${pestanya.toLowerCase()}.${castellsVersio}`)

                            return (
                                <div
                                    onClick={() => {
                                        if (empty) return;
                                        if (castellsVersio !== previewedVersio) {
                                            previewImport(event, castell)
                                        } else {
                                            if (simultanisMap[k]) {
                                                setPosicionsLogPerPestanya(prev => ({
                                                    ...prev,
                                                    ['tots']: {
                                                        ...prev?.['tots'],
                                                        [pestanya.toLowerCase()]: undefined
                                                    }
                                                }))
                                            } else {
                                                setPosicionsLogPerPestanya(prev => ({
                                                    ...prev,
                                                    [selectedCastell]: {
                                                        ...prev?.[selectedCastell],
                                                        [pestanya.toLowerCase()]: undefined
                                                    }
                                                }))
                                            }
                                        }
                                    }}
                                    className="prova"
                                    key={event.id+castell}
                                    style={{
                                        opacity:
                                            !castellIsCurrentlySelected && castellIsAlreadyImported ? 0.5 :
                                            1,
                                        backgroundColor:
                                            castellIsCurrentlySelected ? 'rgba(0,0,0,0.25)' :
                                            castellIsAlreadyImported ? 'rgba(0,0,0,0.1)' :
                                            simultanisMap[k] ? 'rgba(255,255,0,0.1)' :
                                            'white'
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            justifyContent: 'space-around',
                                            flex: 1,
                                        }}
                                    >
                                        <div className="prova-link" style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
                                            <div style={{ color: empty ? '#ccc' : 'darkblue' }}>
                                                ({ matchedPart[k] || (simultanisMap[k] && pestanya) }) {associatedBundles[k].nom}
                                            </div>
                                        </div>

                                        { !empty && <div className="prova-info" style={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', fontSize: 14 }}>
                                            { n_castellers > 0 && <div className="casteller-count">👤 { n_castellers }</div> }
                                            { n_fitxats > 0 && <div className="casteller-count">📍 { n_fitxats }</div> }
                                            { n_assistents > 0 && <div className="casteller-count">&#9989; { n_assistents }</div> }
                                            { n_inassistents > 0 && <div className="casteller-count">&#10060; { n_inassistents }</div> }
                                            { n_no_resposta > 0 && <div className="casteller-count">😶 { n_no_resposta }</div> }
                                        </div> }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                </>
            );
        })
        .filter(e => e !== null);

    return (
        <>
            <div className="import-button" onClick={importCastell}>
                Acabar la importació
            </div>

            <div id="controller-container" className={`extended`}>
                <div
                    style={{
                        display: 'flex',
                        flex: 1,
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                        margin: 20,
                    }}
                >
                    <BotoPestanyaUp full={true} tabs={props.tabs} pestanya={pestanya} setPestanya={setPestanya} />
                    <BotoPestanyaDown full={true} tabs={props.tabs} pestanya={pestanya} setPestanya={setPestanya} />
                </div>

                {
                    nCastells > 1 &&
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            margin: 20,
                        }}
                    >
                        <button
                            onClick={() => {
                                setSelectedCastell(prev => {
                                    const next = (numCastell - 1 + nCastells) % nCastells
                                    return castellsWithPestanya[next]
                                })
                            }}
                        >
                            Castell anterior
                        </button>

                        <button
                            onClick={() => {
                                setSelectedCastell(prev => {
                                    const next = (numCastell + 1) % nCastells
                                    return castellsWithPestanya[next]
                                })
                            }}
                        >
                            Següent castell
                        </button>
                    </div>
                }

                <div className="llista-importer">
                    <div style={{ height: '90%', overflow: 'scroll' }}>
                        <Pressable
                            onClick={() => {
                                setPosicionsLogPerPestanya(prev => ({
                                    ...prev,
                                    [selectedCastell]: {
                                        ...prev?.[selectedCastell],
                                        [pestanya.toLowerCase()]: undefined
                                    },
                                    ['tots']: {
                                        ...prev?.['tots'],
                                        [pestanya.toLowerCase()]: undefined
                                    }
                                }))
                            }}
                            className="prova"
                            style={{
                                marginBottom: 20,
                                backgroundColor: 'white'
                            }}
                            onPressColor={"#ccc"}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'space-around',
                                    flex: 1,
                                }}
                            >
                                <div className="prova-link" style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
                                    <div style={{ color: 'darkblue' }}>
                                        Deixa en blanc {pestanya.toLowerCase()}                                    
                                    </div>
                                </div>
                            </div>
                        </Pressable>

                        {
                            llista_imports.length > 0 ? llista_imports :
                            eventsInfo.length === 0 ? <em>Buscant pinyes compatibles...</em> :
                            <div>No hi ha cap {pestanya.toLowerCase()} per importar.</div>
                        }
                    </div>
                </div>
            </div>
        </>
    );
}

export default Importer;
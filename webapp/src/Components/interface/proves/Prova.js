import moment from 'moment';
import { useEffect, useState } from 'react';
import styles from './Prova.styles'

import { rebuildPosicions } from '../../../utils/loadPositions';
import { fetchAPI } from '../../../utils/utils';

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

function Prova(props) {
    const { bundleInfo, order, setOrder, setCaixesCastellers, castellersInfo, userInfo, socket, prova, event, isPrivate, isAdmin, duplicate, hores, absoluteHores, assistencies } = props;
    const castellName = bundleInfo?.nom
    const castellShortName = bundleInfo?.shortName
    const castellDisplayName = castellShortName || castellName

    const isCapDeTecnica = userInfo?.es_tecnica >= 2;

    const castellId = prova.split('.').length > 0 ? prova.split('.')[0] : '';
    const versioName = prova.split('.').length > 1 ? prova.split('.')[1] : '';

    const change_state_prova = () => isCapDeTecnica ? socket.emit('.change_state_prova', event, castellId, versioName, isCapDeTecnica) : null
    const confirm_delete_prova = () => {
        if (!isCapDeTecnica) return;

        if (window.confirm(`Segur que vols eliminar el ${castellName}?`)) {
            socket.emit('.delete_prova', event, castellId, versioName);

            // Also change order
            socket.emit('.change_order', event, order.filter(prova => prova !== `${castellId}.${versioName}.canvis`));
            setOrder(order.filter(prova => prova !== `${castellId}.${versioName}.canvis`));
        }
    };

    const toMoment = dateStr => applyTimeZone(dateStr)
    const getName = assist => assist.mote || (assist.nom + ' ' + assist.cognom)

    const arribenTard = assistencies
        .filter(assist => assist['data-entrada'])
        .filter(assist => moment(absoluteHores[0]) < toMoment(assist['data-entrada']))
        .map(assist => [assist.id, getName(assist)])

    const surtenAviat = assistencies
        .filter(assist => assist['data-sortida'])
        .filter(assist => moment(absoluteHores[1]) > toMoment(assist['data-sortida']))
        .map(assist => [assist.id, getName(assist)])

    const noVenen = assistencies
        .filter(assist => assist['assistència'] === 0)
        .map(assist => [assist.id, getName(assist)])

    const [posicionsLog, setPosicionsLog] = useState(null);
    const [posicions, setPosicions] = useState({});
    const [troncJSON, setTroncJSON] = useState(null);

    useEffect(() => {
        socket.emit('.load_bundle', castellId)

        socket.on('.loaded_json', (json, id) => {
            if (id === castellId) {
                setTroncJSON(
                    Object.fromEntries(
                        Object.entries(json || {})
                            .filter(([id, caixa]) => caixa?.pestanya?.toLowerCase() === 'tronc' || caixa?.pilar !== undefined)
                    )
                )
            }
        })

        return () => {
            socket.off('.loaded_json')
        }
    }, [castellId])

    useEffect(() => {
        if (!bundleInfo?.simultani) return;

        fetchAPI(`/events/${event}/renglesambfustesicolumnesambsim/${castellId}.${versioName}`, data => {
            const caixes_castellers = data
                .flat()
                .filter(([caixa, casteller]) => !['nom', 'fusta'].includes(caixa))
                .filter(([caixa, casteller]) => casteller in castellersInfo)
                .map(([caixa, casteller]) => [
                    {
                        pestanya: 'tronc',
                        // Other info from caixa
                    },
                    castellersInfo[casteller]
                ])
                
            setCaixesCastellers(prev => ({
                ...prev,
                [prova]: {
                    prova: bundleInfo,
                    caixesCastellers: caixes_castellers  
                }
            }))
        })
    }, [castellersInfo, prova, event, castellId, versioName, bundleInfo?.simultani])

    useEffect(() => {
        socket.emit('.load_positions', event, castellId, versioName);

        socket.on('.loaded_positionsv2', res => {
            if (res.event === event && res.castell === castellId && res.versio === versioName) {
                if (res.data.split('\n').length > 0) {
                    // setAjuntament(parametrizeOption('ajuntament', res.data.split('\n')[0]))
                    setPosicionsLog(res.data.split('\n').slice(1))
                }
            }
        });

        socket.on('.undid_action', action_id => socket.emit('.load_positions', event, castellId, versioName))

        socket.on('.posicions_changed', (ev, castell, versio, pos) => {
            if (versio === versioName && castell === castellId && parseInt(ev) === parseInt(event)) {
                setPosicionsLog(prevLog => prevLog ? [...prevLog, pos] : [pos])
            }
        });

        return () => {
            socket.off('.loaded_positionsv2');
            socket.off('.posicions_changed');
            socket.off('.undid_action');
        }
    }, [event, castellId, versioName]);

    useEffect(() => {
        if (posicionsLog === null) return;
        setPosicions(rebuildPosicions({ 'posicionsLog': posicionsLog }))
    }, [posicionsLog]);

    const castellersInProva = Object.keys(posicions.castellers || {})
        .map(id => parseInt(id))

    const castellersWithRetards = [...arribenTard, ...surtenAviat]
        .filter(([id, _]) => castellersInProva.includes(id))
        .map(([id, name]) => name)

    const castellersNoVenen = noVenen
        .filter(([id, _]) => castellersInProva.includes(id))
        .map(([id, name]) => name)

    const caixaCastellerTronc = Object.keys(troncJSON || {})
        .map(caixa_id => [caixa_id, posicions?.caixes?.[caixa_id]])
        .filter(([caixa, casteller]) => casteller)
        .filter(([caixa, casteller]) => casteller in castellersInfo)
        .map(([caixa, casteller]) => [
            troncJSON[caixa],
            castellersInfo[casteller]
        ])

    useEffect(() => {
        if (bundleInfo?.simultani) return;

        setCaixesCastellers(prev => ({
            ...prev,
            [prova]: {
                prova: bundleInfo,
                caixesCastellers: caixaCastellerTronc  
            }
        }))
    }, [
        JSON.stringify(caixaCastellerTronc),
        JSON.stringify(bundleInfo),
        prova,
    ])

    const isProvaEmpty = posicionsLog && (posicionsLog?.length < 2 || Object.values(rebuildPosicions({ posicionsLog }).castellers).length === 0)

    return (
        <>
            <div style={{ flex: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <a style={{ fontSize: 12, color: "#2859A8" }} href={`/${event}/${castellId}/${versioName}/edit`}>
                            {castellDisplayName}
                        </a>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            { isProvaEmpty && <span
                                style={{
                                    backgroundColor: 'rgb(94 144 224)',
                                    color: 'white',
                                    borderRadius: 5,
                                    padding: 5,
                                    fontSize: 10,
                                }}
                            >
                                Buida
                            </span> }
                        </div>
                    </div>
                    { [...castellersWithRetards, ...castellersNoVenen].length > 0 &&
                        <div style={{ flex: 2, overflow: 'scroll', height: 50 }}>
                            <div style={{ display: 'flex', height: '100%', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                                {
                                    castellersWithRetards.map(retard => {
                                        return (<div key={retard} style={{ color: 'white', backgroundColor: 'rgb(255,50,50)', borderRadius: 5, margin: 5, fontSize: 9, padding: 3 }}>
                                            🕣 {retard}
                                        </div>)
                                    })
                                }
                                {
                                    castellersNoVenen.map(no_ve => {
                                        return (<div key={no_ve} style={{ color: 'white', backgroundColor: 'rgb(255,50,50)', borderRadius: 5, margin: 5, fontSize: 9, padding: 3 }}>
                                            {no_ve}
                                        </div>)
                                    })
                                }
                            </div>
                        </div>
                    }
                    <div style={{ flex: 3, display: 'flex', justifyContent: 'space-evenly' }}>
                        <div className="obrir-blank" style={{ display: 'flex', alignItems: 'center' }}>
                            <a style={{ textDecorationLine: 'none' }} target="_blank" href={`/${event}/${castellId}/${versioName}/edit`}>↗️ </a>
                        </div>
                        <div>
                            <button
                                style={{ backgroundColor: '#eee', border: 'solid 1px black' }}
                                onClick={change_state_prova}
                            >
                                { isAdmin ? '🛡️' : isPrivate ? '🔒' : '🌐' }
                            </button>
                        </div>
                        {
                            isCapDeTecnica && (
                                <div className='eliminar-prova-boto'>
                                    <button
                                        style={{ backgroundColor: '#eee', border: 'solid 1px black' }}
                                        onClick={confirm_delete_prova}
                                    >
                                        &#128465;
                                    </button>
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* <div style={{ fontSize: 12 }}>
                    {
                        caixaCastellerTronc
                            .map(([caixa, casteller]) => `${casteller.mote} (${caixa.pilar})`)
                            .join(', ')
                    }
                </div> */}
            </div>
        </>
    );
}

export default Prova;
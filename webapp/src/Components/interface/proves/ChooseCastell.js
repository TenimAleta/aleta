import { useEffect, useState } from "react";
import Popup from "../../other/Popup";
import styles from "./Prova.styles";
import DuplicarProves from "./DuplicarProves";
import Pressable from "../../other/Pressable";
import SETTINGS from "../../../SETTINGS";
import { fetchAPI, getSubdomain } from "../../../utils/utils";

const colla = getSubdomain()

function ChooseCastell(props) {
    const { socket, event, durations, closed, setClosed, userInfo } = props;
    const [bundles, setBundles] = useState([]);
    const [filter, setFilter] = useState('');
    const [bundlesToAdd, setBundlesToAdd] = useState([]);

    const normalize = str => str.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

    useEffect(() => {
        fetchAPI('/bundles', llista => setBundles(
            llista
                .filter(bundle => !bundle.hidden)
        ))
    }, [])

    useEffect(() => {
        durations.length > 0 && bundles
            .map(bundle => bundle.id)
            .filter(prova => !(prova in durations))
            // Add default 15 minuts to each unknown prova
            .forEach(prova => socket.emit('.edit_duration', prova, 15))
    }, [bundles, durations])

    useEffect(() => {
        setFilter('')
    }, [closed])

    useEffect(() => {
        socket.on('.prova_created', () => socket.emit('.request_proves', event))
        return () => socket.off('.prova_created')
    }, [])

    const isNeta = bundle => !bundle.simultani && Object.keys(bundle.parts)
        .map(part => part.toLowerCase())
        .filter(part => ['pinya', 'folre', 'manilles', 'puntals', 'tronc'].includes(part))
        .every(part => part === 'tronc')

    const hasPinya = bundle => !bundle.simultani && Object.keys(bundle.parts)
        .map(part => part.toLowerCase())
        .includes('pinya')

    const isATerra = bundle => !bundle.simultani && !isNeta(bundle) && !hasPinya(bundle)

    const isFolreATerra = bundle => !bundle.simultani && isATerra(bundle) && Object.keys(bundle.parts)
        .map(part => part.toLowerCase())
        .includes('folre')

    const isManillesATerra = bundle => !bundle.simultani && isATerra(bundle) && !isFolreATerra(bundle) && Object.keys(bundle.parts)
        .map(part => part.toLowerCase())
        .includes('manilles')

    const isPuntalsATerra = bundle => !bundle.simultani && isATerra(bundle) && !isManillesATerra(bundle) && Object.keys(bundle.parts)
        .map(part => part.toLowerCase())
        .includes('puntals')

    const netes = bundles.filter(isNeta)
    const folresATerra = bundles.filter(isFolreATerra)
    const manillesATerra = bundles.filter(isManillesATerra)
    const puntalsATerra = bundles.filter(isPuntalsATerra)
    const pinyes = bundles.filter(hasPinya)
    const simultanis = bundles.filter(bundle => bundle.simultani)

    const changeDuration = (bundle, prevDuration) => {
        const promptedDuration = prompt(
            "Canvia la duració de la prova",
            prevDuration
        )

        if (promptedDuration !== null && !isNaN(parseInt(promptedDuration))) {
            socket.emit('.edit_duration', bundle, parseInt(promptedDuration))
            socket.emit('.request_hores_proves', event)
        }
    }

    const createNewProva = (bundle_id) => {
        // Random alphanumeric string: https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
        const randomVersionName = Math.random().toString(36).slice(2);
        socket.emit('.create_prova', event, bundle_id, randomVersionName, userInfo?.es_tecnica)

        return randomVersionName
    }

    const createProves = () => {
        const new_order = []

        // Create new prova for each bundle
        bundlesToAdd.forEach(bundle => {
            const version = createNewProva(bundle.id)
            new_order.push(`${bundle.id}.${version}.canvis`)
        })

        // Set new order
        socket.emit('.add_order', event, new_order)

        setBundlesToAdd([])
        setClosed(true)
    }

    const addBundleToList = bundle => {
        setBundlesToAdd([...bundlesToAdd, bundle])
    }

    const style_of_hyperlink = {
        textDecoration: 'underline',
        color: '#2859A8',
        cursor: 'pointer',
    }

    const llista_bundles = list => list
        .filter(bundle =>
            normalize(bundle.nom.toLowerCase()).includes(normalize(filter.toLowerCase())) ||
            normalize(bundle?.shortName?.toLowerCase() || '').includes(normalize(filter.toLowerCase()))
        )
        .sort((a, b) => {
            if (filter !== '') {
                return a.nom.length > b.nom.length ? 1 : -1;
            } else if (a?.shortName && b?.shortName) {
                return a?.shortName?.localeCompare(b?.shortName)
            } else if (a?.nom && b?.nom) {
                return a?.nom?.localeCompare(b?.nom)
            } else {
                return 1
            }
        })
        .map(bundle => {
            return <div style={styles.prova} key={bundle.id}>
                <div
                    style={{
                        display: 'flex',
                        flex: 1,
                    }}
                >
                    <Pressable
                        style={{
                            flex: 3,
                            padding: 10,
                            borderRadius: 5,
                            display: 'flex',
                            flexDirection: 'row',
                        }}
                        onClick={() => addBundleToList(bundle)}
                        onPressColor={'lightblue'}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <div
                                style={{
                                    color: '#777',
                                }}
                            >
                                +
                            </div>
                        </div>
                        <div
                            style={{
                                flex: 4,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 'bold',
                                    fontSize: 18,
                                }}
                            >
                                {bundle.shortName || bundle.nom}
                            </div>

                            {
                                bundle.shortName &&
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontStyle: 'italic',
                                    }}
                                >
                                    {bundle.nom}
                                </div>
                            }
                            
                            {
                                bundle.subtitol &&
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                        {bundle.subtitol}
                                    </div>
                            }
                        </div>
                        <div
                            style={{
                                flex: 1
                            }}
                        >
                            {/* Empty */}
                        </div>
                    </Pressable>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
                        <div>
                            {bundle.id in durations ? durations[bundle.id] : '10*'}'
                        </div>
                        <div style={style_of_hyperlink} onClick={() => changeDuration(bundle.id, durations[bundle.id])}>
                            &#x270E;
                        </div>
                    </div>
                </div>
            </div>;
        });

    const totalDuration = bundlesToAdd.every(bundle => bundle.id in durations) ?
        bundlesToAdd
            .reduce((acc, bundle) => acc + (durations[bundle.id] || 10), 0)
        : '?'

    return (
        <Popup {...props}>
            {
                bundlesToAdd.length > 0 ? <>
                    <h2>Proves a afegir</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {
                            bundlesToAdd
                                .map((bundle, i) => (
                                    <div
                                        key={`${bundle.id}-${i}`}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 10,
                                            backgroundColor: '#eee',
                                            padding: 10,
                                            borderRadius: 5,
                                        }}
                                    >
                                        <div
                                            style={{
                                                flex: 4,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 5,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 'bold',
                                                    fontSize: 18,
                                                }}
                                            >
                                                {bundle.shortName || bundle.nom}
                                            </div>

                                            {
                                                bundle.shortName &&
                                                <div
                                                    style={{
                                                        fontSize: 14,
                                                        fontStyle: 'italic',
                                                    }}
                                                >
                                                    {bundle.nom}
                                                </div>
                                            }
                                            
                                            {
                                                bundle.subtitol &&
                                                    <div style={{ fontSize: 12, color: '#666' }}>
                                                        {bundle.subtitol}
                                                    </div>
                                            }
                                        </div>

                                        <div
                                            style={{
                                                flex: 1,
                                            }}
                                        >
                                            {bundle.id in durations ? durations[bundle.id] : '10*'}'
                                        </div>
                                    </div>
                                ))
                        }
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 10,
                            borderRadius: 5,
                            backgroundColor: '#777',
                            color: '#fff',
                            marginTop: 10,
                        }}
                    >
                        Duració total: {totalDuration}'
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 10,
                            borderRadius: 5,
                            backgroundColor: SETTINGS(colla).color,
                            color: '#fff',
                            marginTop: 10,
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            createProves()
                        }}
                    >
                        Afegir proves
                    </div>
                </> : <>
                    <h2>Importa les proves d'un altre dia</h2>
                    <DuplicarProves
                        {...props}
                        toEvent={event}
                    />
                </>
            }

            {
                bundlesToAdd.length === 0 ? <h2>O tria una plantilla</h2> :
                <h2>Tria una altra plantilla</h2>
            }

            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <input autoFocus style={styles.plantilles_filter} type="text" placeholder="Cerca..." value={filter} onChange={e => setFilter(e.target.value)} />
                { filter.length > 0 && <div id="erase_filter" style={{ position: 'absolute', right: 15, cursor: 'pointer', fontSize: '1.5em', color: '#ccc' }} onClick={() => setFilter('')}>
                    &#x2715;
                </div> }
            </div>

            <div
                className="llista-plantilles"
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-around',
                    gap: 10,
                    marginTop: 10,
                }}
            >
                { llista_bundles(pinyes).length > 0 && <div style={{ flexBasis: 300, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ textAlign: 'center' }}>Pinyes</h3>
                    <div>
                        {llista_bundles(pinyes)}
                    </div>
                </div> }

                {
                    llista_bundles(folresATerra).length > 0 && <div style={{ flexBasis: 300, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ textAlign: 'center' }}>Folres a terra</h3>
                        <div>
                            {llista_bundles(folresATerra)}
                        </div>
                    </div>
                }

                {
                    llista_bundles(manillesATerra).length > 0 && <div style={{ flexBasis: 300, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ textAlign: 'center' }}>Manilles a terra</h3>
                        <div>
                            {llista_bundles(manillesATerra)}
                        </div>
                    </div>

                }

                {
                    llista_bundles(puntalsATerra).length > 0 && <div style={{ flexBasis: 300, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ textAlign: 'center' }}>Puntals a terra</h3>
                        <div>
                            {llista_bundles(puntalsATerra)}
                        </div>
                    </div>
                }

                {
                    llista_bundles(simultanis).length > 0 && <div style={{ flexBasis: 300, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ textAlign: 'center' }}>Simultànies</h3>
                        <div>
                            {llista_bundles(simultanis)}
                        </div>
                    </div>
                }

                { llista_bundles(netes).length > 0 && <div style={{ flexBasis: 300, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ textAlign: 'center' }}>Netes</h3>
                    <div>
                        {llista_bundles(netes)}
                    </div>
                </div> }
            </div>
        </Popup>
    );
}

export default ChooseCastell;
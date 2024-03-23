import { useState } from "react";
import { useEffect } from "react";
import Bundle from "./Bundle";
import CreateBundle from "./CreateBundle";
import BundleSimultani from "./BundleSimultani";
import { fetchAPI } from "../../../utils/utils";

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

function BundleList({ socket, availableBundles, setAvailableBundles }) {
    const [showCreateBundleForm, setShowCreateBundleForm] = useState(false);
    const [showDeletedBundles, setShowDeletedBundles] = useState(false);
    const [durations, setDurations] = useState({})
    const [bundleSearch, setBundleSearch] = useState('')
    const [hidePart, setHidePart] = useState({})

    const changeDuration = (bundle, prevDuration) => {
        const promptedDuration = prompt(
            "Canvia la duració de la prova",
            prevDuration
        )

        if (promptedDuration !== null && !isNaN(parseInt(promptedDuration))) {
            socket.emit('.edit_duration', bundle, parseInt(promptedDuration))
        }
    }

    useEffect(() => {
        socket.emit('.request_durations');

        socket.on('.durations', data => setDurations(formatDurations(data)))

        socket.on('.durations_changed', (prova, duration) => {            
            setDurations(prev => ({...prev, [prova]: duration}))
        })

        return () => {
            socket.off('.durations')
            socket.off('.durations_changed')
        }
    }, [])

    useEffect(() => {
        fetchAPI('/bundles', setAvailableBundles)

        socket.on('.bundles', (data) => setAvailableBundles(data));
        socket.on('.bundle_created', () => socket.emit('.request_bundles'))
        socket.on('.bundle_edited', () => socket.emit('.request_bundles'))

        return () => {
            socket.off('.bundles')
            socket.off('.bundle_created')
            socket.off('.bundle_edited')
        }
    }, [socket]);

    return (
        <div>
            <h2>Proves</h2>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 20,
                }}
            >
                <input
                    type="text"
                    placeholder="Cerca proves..."
                    value={bundleSearch}
                    onChange={(e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        setBundleSearch(searchTerm);
                    }}
                />
                <button
                    onClick={() => setBundleSearch('')}
                >
                    Borra cerca
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                    <button onClick={() => setHidePart(prev => ({...prev, pinya: !prev.pinya}))}>
                        { hidePart.pinya ? '+' : '-' }
                    </button>
                </div>
                <h3>Proves amb pinya</h3>
                {
                    !showCreateBundleForm &&
                    <button
                        onClick={() => setShowCreateBundleForm(!showCreateBundleForm)}
                    >
                        Crea prova
                    </button>
                }
            </div>

            {
                showCreateBundleForm &&
                <CreateBundle
                    socket={socket}
                    setShowCreateBundleForm={setShowCreateBundleForm}
                />
            }

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {
                    !hidePart.pinya &&
                    availableBundles
                        .filter(bundle =>
                            bundle?.nom?.toLowerCase()?.includes(bundleSearch) ||
                            bundle?.shortName?.toLowerCase()?.includes(bundleSearch) ||
                            Object.keys(bundle?.parts || {}).some(part => part.toLowerCase().includes(bundleSearch))
                        )
                        .sort((a, b) => a.nom.localeCompare(b.nom))
                        .filter(bundle => !bundle.hidden)
                        .filter(bundle => !bundle.simultani)
                        .filter(bundle =>
                            Object.keys(bundle.parts).some(part => part.toLowerCase() === 'pinya') &&
                            !Object.keys(bundle.parts).every(part => part.toLowerCase() === 'tronc')
                        )
                        .map(bundle =>
                            <Bundle
                                key={bundle.id}
                                bundle={bundle}
                                socket={socket}
                                duration={durations[bundle.id]}
                                changeDuration={() => changeDuration(bundle.id, durations[bundle.id])}
                            />
                        )
                }
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                    <button onClick={() => setHidePart(prev => ({...prev, terra: !prev.terra}))}>
                        { hidePart.terra ? '+' : '-' }
                    </button>
                </div>
                <h3>Proves a terra</h3>
                {
                    !showCreateBundleForm &&
                    <button
                        onClick={() => setShowCreateBundleForm(!showCreateBundleForm)}
                    >
                        Crea prova
                    </button>
                }
            </div>
            
            {
                showCreateBundleForm &&
                <CreateBundle
                    socket={socket}
                    setShowCreateBundleForm={setShowCreateBundleForm}
                />
            }

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {
                    !hidePart.terra &&
                    availableBundles
                        .filter(bundle =>
                            bundle?.nom?.toLowerCase()?.includes(bundleSearch) ||
                            bundle?.shortName?.toLowerCase()?.includes(bundleSearch) ||
                            Object.keys(bundle?.parts || {}).some(part => part.toLowerCase().includes(bundleSearch))
                        )
                        .sort((a, b) => a.nom.localeCompare(b.nom))
                        .filter(bundle => !bundle.hidden)
                        .filter(bundle => !bundle.simultani)
                        .filter(bundle =>
                            // No hi ha d'haver ni una pinya
                            !Object.keys(bundle.parts).some(part => part.toLowerCase() === 'pinya') &&
                            // No ha de ser només tronc
                            !Object.keys(bundle.parts).filter(part => ['pinya', 'folre', 'manilles', 'puntals', 'tronc'].includes(part.toLowerCase())).every(part => part.toLowerCase() === 'tronc')
                        )
                        .map(bundle =>
                            <Bundle
                                key={bundle.id}
                                bundle={bundle}
                                socket={socket}
                            />
                        )
                }
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                    <button onClick={() => setHidePart(prev => ({...prev, netes: !prev.netes}))}>
                        { hidePart.netes ? '+' : '-' }
                    </button>
                </div>
                <h3>Proves netes</h3>
                {
                    !showCreateBundleForm &&
                    <button onClick={() => setShowCreateBundleForm(!showCreateBundleForm)}>
                        Crea prova
                    </button>
                }
            </div>
            
            {
                showCreateBundleForm &&
                <CreateBundle
                    socket={socket}
                    setShowCreateBundleForm={setShowCreateBundleForm}
                />
            }

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {
                    !hidePart.netes &&
                    availableBundles
                        .filter(bundle =>
                            bundle?.nom?.toLowerCase()?.includes(bundleSearch) ||
                            bundle?.shortName?.toLowerCase()?.includes(bundleSearch) ||
                            Object.keys(bundle?.parts || {}).some(part => part.toLowerCase().includes(bundleSearch))
                        )
                        .sort((a, b) => a.nom.localeCompare(b.nom))
                        .filter(bundle => !bundle.hidden)
                        .filter(bundle => !bundle.simultani)
                        .filter(bundle => Object.keys(bundle.parts).filter(part => ['pinya', 'folre', 'manilles', 'puntals', 'tronc'].includes(part.toLowerCase())).every(part => part.toLowerCase() === 'tronc'))
                        .map(bundle =>
                            <Bundle
                                key={bundle.id}
                                bundle={bundle}
                                socket={socket}
                            />
                        )
                }
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                    <button onClick={() => setHidePart(prev => ({...prev, simultanies: !prev.simultanies}))}>
                        { hidePart.simultanies ? '+' : '-' }
                    </button>
                </div>
                <h3>Proves simultànies</h3>
                {
                    !showCreateBundleForm &&
                    <button onClick={() => setShowCreateBundleForm(!showCreateBundleForm)}>
                        Crea prova
                    </button>
                }
            </div>

            {
                showCreateBundleForm &&
                <CreateBundle
                    socket={socket}
                    setShowCreateBundleForm={setShowCreateBundleForm}
                />
            }

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {
                    !hidePart.simultanies &&
                    availableBundles
                        .filter(bundle =>
                            bundle?.nom?.toLowerCase()?.includes(bundleSearch) ||
                            bundle?.shortName?.toLowerCase()?.includes(bundleSearch) ||
                            Object.keys(bundle?.parts || {}).some(part => part.toLowerCase().includes(bundleSearch))
                        )
                        .sort((a, b) => a.nom.localeCompare(b.nom))
                        .filter(bundle => !bundle.hidden)
                        .filter(bundle => bundle.simultani)
                        .map(bundle => <BundleSimultani
                            key={bundle.id}
                            bundle={bundle}
                            socket={socket}
                        />)
                }
            </div>

            <h3>Proves amagades</h3>

            <button
                onClick={() => setShowDeletedBundles(!showDeletedBundles)}
            >
                {
                    showDeletedBundles ?
                        'Amaga proves amagades' :
                        'Mostra proves amagades'
                }
            </button>

            {
                showDeletedBundles &&
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                    }}
                >
                    {
                        availableBundles
                            .sort((a, b) => {
                                const lastModifiedA = a?.updatedAt || a?.createdAt || ''
                                const lastModifiedB = b?.updatedAt || b?.createdAt || ''

                                return !lastModifiedA ? 1 :
                                    !lastModifiedB ? -1 :
                                    lastModifiedB.localeCompare(lastModifiedA)
                            })
                            .filter(bundle => bundle.hidden)
                            // .filter(bundle => !bundle?.superseeded)
                            .filter(bundle => !bundle.simultani)
                            .map(bundle =>
                                <Bundle
                                    key={bundle.id}
                                    bundle={bundle}
                                    socket={socket}
                                />
                            )
                    }

                    {
                        availableBundles
                            .sort((a, b) => {
                                const lastModifiedA = a?.updatedAt || a?.createdAt || ''
                                const lastModifiedB = b?.updatedAt || b?.createdAt || ''

                                return !lastModifiedA ? 1 :
                                    !lastModifiedB ? -1 :
                                    lastModifiedB.localeCompare(lastModifiedA)
                            })
                            .filter(bundle => bundle.hidden)
                            // .filter(bundle => !bundle?.superseeded)
                            .filter(bundle => bundle.simultani)
                            .map(bundle => <BundleSimultani
                                key={bundle.id}
                                bundle={bundle}
                                socket={socket}
                            />)
                    }
                </div>
            }
        </div>
    )
}

export default BundleList;
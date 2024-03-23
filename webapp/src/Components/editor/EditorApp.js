import { useCallback, useEffect, useState } from "react";
import Controller from "./Controller";
import parseSVG from './parseSVG'
import PissarraEditor from "./PissarraEditor";
import BundleList from "./bundles/BundleList";
import DeletedPlantilles from "./bundles/DeletedPlantilles";
import { fetchAPI, getSubdomain, postAPI } from "../../utils/utils";
import Pressable from "../other/Pressable";
import UserInfo from "../login/UserInfo";
import { HeaderTabs } from "../interface/ProvesApp";
import MiniBundle from "./bundles/MiniBundle";

export const addAddons = (jsonOutput, addons) => {
    // Add add-ons
    if (!jsonOutput) return null
    const withAddons = JSON.parse(JSON.stringify(jsonOutput))

    // Escaletes
    const escaletes = addons?.escaletes || {}
    Object.entries(escaletes).forEach(([from, to]) => {
        if (!withAddons[from]) return
        withAddons[from].escala_a = to
    })

    // Trepitjacions
    const trepitjacions = addons?.trepitjacions || {}
    Object.entries(trepitjacions).forEach(([from, to]) => {
        if (!withAddons[from]) return
        withAddons[from].trepitja_a = to
    })

    return withAddons
}

function EditorApp(props) {
    const [svg, setSvg] = useState(null);
    const [jsonOutput, setJsonOutput] = useState(null);
    const [addons, setAddons] = useState(null);
    const [pz, setPanzoom] = useState(null);
    const { socket } = props;

    const [swiper, setSwiper] = useState(null);
    const [extended, setExtended] = useState(false);

    const [mode, setMode] = useState(null);
    const [submode, setSubmode] = useState(null);

    const [caixaSelected, setCaixaSelected] = useState(-1);
    const [duplicating, setDuplicating] = useState(null);
    const [choosingTrepitjat, setChoosingTrepitjat] = useState(null);
    const [choosingEscaleta, setChoosingEscaleta] = useState(null);

    const [showDeletes, setShowDeletes] = useState(false);
    const [bundleInfo, setBundleInfo] = useState(null);
    const [availableBundles, setAvailableBundles] = useState([])

    const params = window.location.pathname.split('/').filter(part => part != '');
    const selectedCastellPart = params[1] && !['new', 'bundle'].includes(params[1]) ? params[1] : null;
    const selectedBundle = params[1] === 'bundle' && params[2] ? params[2] : null;

    const [availablePlantilles, setAvailablePlantilles] = useState([]);
    const [notification, setNotification] = useState(null);

    const [plantillaDefaultName, setPlantillaDefaultName] = useState(null);
    const [isFocused, setIsFocused] = useState(false);

    const [plantillesSearchTerm, setPlantillesSearchTerm] = useState('');
    const [showPlantilles, setShowPlantilles] = useState(true);

    const [pestanya, setPestanya] = useState(null)
    const tabs = bundleInfo?.parts ? Object.keys(bundleInfo?.parts) : null

    const parser = new DOMParser();
    const svgData = parser.parseFromString(svg, "image/svg+xml");

    const json = addAddons(jsonOutput, addons)

    const exports = {
        availableBundles,
        setAvailableBundles,
        'isFocused': isFocused,
        'setIsFocused': setIsFocused,
        'socket': socket,
        'setSvg': setSvg,
        'setJsonOutput': setJsonOutput,
        'setPanzoom': setPanzoom,
        'setSwiper': setSwiper,
        'setExtended': setExtended,
        'swiper': swiper,
        'pz': pz,
        'extended': extended,
        'jsonOutput': jsonOutput,
        'json': json,
        'mode': mode,
        'setMode': setMode,
        'submode': submode,
        'setSubmode': setSubmode,
        'caixaSelected': caixaSelected,
        'setCaixaSelected': setCaixaSelected,
        'duplicating': duplicating,
        'setDuplicating': setDuplicating,
        'choosingTrepitjat': choosingTrepitjat,
        'setChoosingTrepitjat': setChoosingTrepitjat,
        'choosingEscaleta': choosingEscaleta,
        'setChoosingEscaleta': setChoosingEscaleta,
        'selectedCastellPart': selectedCastellPart,
        'selectedBundle': selectedBundle,
        'bundleInfo': bundleInfo,
        'notification': notification,
        'setNotification': setNotification,
        'pestanya': pestanya,
        'setPestanya': setPestanya,
        'tabs': tabs,
        'plantillaDefaultName': plantillaDefaultName,
        'addons': addons,
        'setAddons': setAddons,
        ...props
    }

    useEffect(() => {
        document.title = `Plantilles - Aleta`;
    }, []);

    useEffect(() => {
        if (svg) {
            setJsonOutput(parseSVG(svgData));
        } else {
            setJsonOutput(null);
        }
    }, [svg])

    useEffect(() => {
        if (selectedBundle) socket.emit('.request_bundle', selectedBundle);
        if (selectedBundle) socket.emit('.load_bundle', selectedBundle);
        if (selectedCastellPart) socket.emit('.load_json', selectedCastellPart);

        socket.on('.loaded_json', data => setJsonOutput(data));
        socket.on('.bundle', data => {
            if (data.id === selectedBundle) {
                setBundleInfo(data.bundle)
                socket.emit('.request_addons', selectedBundle)
            }
        });

        socket.on('.addons', data => data.id === selectedBundle && setAddons(data.addons));

        return () => {
            socket.off('.loaded_json');
            socket.off('.addons');
            socket.off('.bundle');
        }
    }, [selectedBundle, selectedCastellPart, socket]);

    useEffect(() => {
        if (selectedBundle) {
            setPestanya(tabs?.[0] || 'Pinya')
        }
    }, [selectedBundle, tabs?.length])

    useEffect(() => {
        socket.emit('.request_plantilles');

        socket.on('.plantilles', (data) => setAvailablePlantilles(data));

        socket.on('.created_plantilla', (nom) => {
            console.log(`Plantilla ${nom} creada correctament.`)
            socket.emit('.request_plantilles');
        })

        socket.on('.saved_plantilla', (nom) => {
            console.log(`Plantilla ${nom} guardada correctament.`)
            socket.emit('.request_plantilles');
        })

        socket.on('.duplicate_plantilla', (nom) => {
            console.log(`Plantilla ${nom} canviada correctament. L'antiga plantilla s'ha guardat en un backup.`)
            socket.emit('.request_plantilles');
        })

        socket.on('.renamed_plantilla', () => {
            socket.emit('.request_plantilles');
            socket.emit('.request_bundles')
        })

        socket.on('.updated_plantilles', () => socket.emit('.request_plantilles'))

        socket.on('.error_plantilla', (error) => alert(error))

        socket.on('.deleted_plantilla', (nom) => {
            socket.emit('.request_plantilles');
            alert(`Plantilla ${nom} eliminada correctament. L'antiga plantilla s'ha guardat en un backup.`)
        })

        return () => {
            socket.off('.created_plantilla');
            socket.off('.saved_plantilla');
            socket.off('.duplicate_plantilla');
            socket.off('.deleted_plantilla');
            socket.off('.updated_plantilles');
            socket.off('.plantilles');
            socket.off('.renamed_plantilla');
        }
    }, [])

    const getBundlesWithPlantilla = useCallback((plantilla) => {
        return availableBundles
            .filter(bundle => !bundle.hidden)
            .filter(bundle => bundle?.parts)
            .filter(bundle => Object.entries(bundle.parts).some(([part, plnt]) => plnt === plantilla))
            .map(bundle => ({
                ...bundle,
                part: Object.entries(bundle.parts).find(([part, plnt]) => plnt === plantilla)[0]
            }))
    }, [availableBundles])

    const llista_plantilles = plantilles =>
        plantilles
        .filter(plantilla =>
            plantilla.toLowerCase().includes(plantillesSearchTerm.toLowerCase()) ||
            getBundlesWithPlantilla(plantilla).map(bundle => bundle.nom).join(' ').toLowerCase().includes(plantillesSearchTerm.toLowerCase()) ||
            getBundlesWithPlantilla(plantilla).map(bundle => bundle.shortName).join(' ').toLowerCase().includes(plantillesSearchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (plantillesSearchTerm === '') return a.localeCompare(b);

            const searchTermLower = plantillesSearchTerm.toLowerCase();
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            const aExactMatch = aLower === searchTermLower;
            const bExactMatch = bLower === searchTermLower;
            const aStartsWith = aLower.startsWith(searchTermLower);
            const bStartsWith = bLower.startsWith(searchTermLower);

            if (aExactMatch && !bExactMatch) return -1;
            if (bExactMatch && !aExactMatch) return 1;
            if (aStartsWith && !bStartsWith) return -1;
            if (bStartsWith && !aStartsWith) return 1;

            return aLower.localeCompare(bLower);
        })
        .map(plantilla => {
            const style_of_plantilla = {
                padding: 20,
                borderRadius: 10,
                backgroundColor: '#eee',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                // justifyContent: 'space-between',
                width: 200,
                gap: 10,
            }

            const style_of_option_button = {
                cursor: 'pointer',
                marginLeft: 10,
                // border: '1px solid black',
                borderRadius: 5,
                padding: 5,
                backgroundColor: '#ddd',
            }

            const delete_plantilla = (plantilla) => {
                const confirmed = window.confirm(`Estàs segur que vols eliminar la plantilla ${plantilla}? Es quedarà guardada en un backup.`);
                if (confirmed) socket.emit('.delete_plantilla', plantilla);
            }

            const duplicate_plantilla = (plantilla) => {
                const newName = window.prompt(`Duplicant plantilla. Quin nom vols posar a la nova plantilla?`, plantilla);
                if (newName) socket.emit('.duplicate_plantilla', plantilla, newName);
            }

            const rename_plantilla = (plantilla) => {
                const newName = window.prompt(`Canvia el nom de la plantilla:`, plantilla);
                if (newName) socket.emit('.rename_plantilla', plantilla, newName);
            }

            const download_plantilla = () => {
                const COLLA = getSubdomain();
                const url = `https://${COLLA}-api.tenimaleta.com:4001/api/download_plantilla/${plantilla}`;
            
                fetch(url, {
                    method: 'GET',
                    headers: {
                        'x-api-key': "453dabb4-7645-4626-a1bb-477dff3aa557"
                    }
                })
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${COLLA}-${plantilla}.aleta`;
                    document.body.appendChild(a); // we need to append the element to the dom -> otherwise it will not work in firefox
                    a.click();    
                    a.remove();  //afterwards we remove the element again         
                });
            }

            return (
                <div key={plantilla} style={style_of_plantilla}>
                    {
                        showDeletes &&
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <Pressable style={style_of_option_button} className="duplicate" onClick={() => duplicate_plantilla(plantilla)}>
                                    ➕
                                </Pressable>
                                <Pressable style={style_of_option_button} className="rename" onClick={() => rename_plantilla(plantilla)}>
                                    📝
                                </Pressable>
                                <Pressable style={{...style_of_option_button, ...{ backgroundColor: 'rgba(255, 0, 0, 0.1)' }}} className="delete" onClick={() => delete_plantilla(plantilla)}>
                                    🗑️
                                </Pressable>
                            </div>
                    }
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                        {
                            !showDeletes ?
                                <a href={`/editor/${plantilla}`}>{plantilla}</a> :
                                <span>{plantilla}</span>
                        }
                        <Pressable style={{ marginLeft: 10, cursor: 'pointer', backgroundColor: '#ddd', borderRadius: '5px', padding: '5px' }} onClick={download_plantilla}>
                            📥
                        </Pressable>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 10,
                        }}
                    >
                        {
                            getBundlesWithPlantilla(plantilla)
                                // .filter(bundle => !bundle.superseeded)
                                .filter(bundle => !bundle.hidden)
                                .sort((a, b) => a.nom.localeCompare(b.nom))
                                .map(bundle => <MiniBundle key={bundle.id} bundle={bundle} part={bundle.part} />)
                        }
                        {
                            getBundlesWithPlantilla(plantilla)
                                .filter(bundle => !bundle.hidden)
                                .length === 0 && (
                                    <em style={{ color: '#333', fontSize: 10 }}>
                                        ⚠️ Cap prova utilitza aquesta plantilla
                                    </em>
                                )
                        }
                    </div>
                </div>
            )
        });

    const style_of_warning_box = {
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        padding: 10,
        borderRadius: 5,
        margin: 10,
    }

    const upload_plantilla_aleta = (nom, data) => {
        const formatName = name => name
            .replace(/[^a-zA-Z0-9_()-]/g, '')
            .toLowerCase();

        const formattedNom = formatName(nom)

        // TODO: remap de etiquetes de colla A a colla B?
        const formattedData = Object.fromEntries(
            Object.entries(data)
                .map(([key, value]) => {
                    return [
                        key,
                        {
                            ...value,
                            perfil: undefined,
                            etiqueta: undefined,
                            pestanya: undefined,
                        }
                    ]
                }
        ))

        postAPI(
            '/upload_plantilla',
            {
                nom: formattedNom,
                data: formattedData,
            },
            () => {
                window.location.href = `/editor/${formattedNom}`;
            }
        )
    }

    return (
        <>
            {
                jsonOutput === null && selectedCastellPart === null && selectedBundle === null ?
                    <div style={{ padding: 20 }}>
                        <UserInfo {...exports} />

                        <HeaderTabs {...exports} />

                        <Pressable style={{ backgroundColor: '#eee' }} className="boto-back" href='/'>
                            ← Tornar a la pàgina principal
                        </Pressable>
                        <h1>Editor de plantilles</h1>
                        <div style={{ margin: 20 }}>
                            <div><strong>1.</strong> Carrega un fitxer SVG</div>
                            <div className="warning-text" style={style_of_warning_box}>
                                <strong>Atenció:</strong> És important que <strong>desagrupeu</strong> els elements del fitxer SVG abans de penjar-lo.
                            </div>
                            <div><strong>2.</strong> Comprova que es vegi correctament</div>
                            <div><strong>3.</strong> Guarda la plantilla amb el botó de la part inferior dreta</div>
                        </div>
                        <h2>Crea el teu propi fitxer .svg des de zero</h2>
                        <p>El més important és que totes les posicions on vagi gent siguin rectangles. Altres figures o texts, l'Aleta no ho llegirà.</p>
                        <p>El bloc base hauria de ser un rectangle 100 píxels x 50 píxels. Us el podeu descarregar <a target="__blank" href="https://aleta-common.s3.eu-west-3.amazonaws.com/rectangle.svg" download="blocbase.svg">aquí</a>.</p>
                        <p>Procureu que les vostres posicions de les pinyes tenen mida del "bloc base".</p>
                        <p>Qualsevol editor d'imatges .svg val, hi ha el <a href="https://editor.method.ac/">Method Draw Vector Editor</a> per pinyes senzilles.</p>
                        <p>Els companys arquitectes sempre tenen les millors eines per fer aquestes edicions, pregunteu-los-hi a ells.</p>

                        <h2>Penja un fitxer .svg</h2>
                        <div>
                            <input
                                type="file"
                                id="file"
                                accept=".svg"
                                onChange={e => {
                                    const file = e.target.files[0];
                                    const reader = new FileReader();
                                    reader.onload = e => {
                                        setPlantillaDefaultName(file.name.split('.')[0]);
                                        setSvg(e.target.result);
                                        window.history.pushState({}, '', '/editor/new');
                                    }
                                    reader.readAsText(file);
                                }}
                            />
                        </div>
                        <h2>Penja un fitxer .aleta</h2>
                        <div>
                            <input
                                type="file"
                                id="file"
                                accept=".aleta"
                                onChange={e => {
                                    const file = e.target.files[0];
                                    const reader = new FileReader();
                                    reader.onload = e => {
                                        const nom = file.name.replace('.aleta', '').replaceAll('.', '-');
                                        const data = JSON.parse(e.target.result);
                                        upload_plantilla_aleta(nom, data);
                                    }
                                    reader.readAsText(file);
                                }}
                            />
                        </div>
                        <h2>O edita una que ja existeixi</h2>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                                <button
                                    onClick={() => setShowPlantilles(prev => !prev)}
                                >
                                    {
                                        !showPlantilles ? <>+</> :
                                        <>-</>
                                    }
                                </button>
                            </div>
                            <h3 style={{ flex: 2 }}>Plantilles</h3>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowDeletes(prev => !prev)}>
                                    { !showDeletes ? <>Editar plantilles</> : <>Fet</> }
                                </button>
                            </div>
                        </div>

                        {
                            showPlantilles && (<>
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
                                        placeholder="Cerca plantilles..."
                                        value={plantillesSearchTerm}
                                        onChange={(e) => {
                                            const searchTerm = e.target.value.toLowerCase();
                                            setPlantillesSearchTerm(searchTerm);
                                        }}
                                    />
                                <button
                                    onClick={() => setPlantillesSearchTerm('')}
                                >
                                    Borra cerca
                                </button>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    {llista_plantilles(availablePlantilles)}
                                    {llista_plantilles(availablePlantilles).length === 0 && <em style={{ color: '#333', fontSize: 12 }}>⚠️ Cap plantilla trobada</em>}
                                </div>
                            </>)
                        }

                        <BundleList {...exports} />

                        <DeletedPlantilles {...exports} />
                    </div>
                : jsonOutput !== null ?
                    <>
                        <PissarraEditor {...exports} />
                        <Controller {...exports} />
                    </>
                : 
                    <></>
            }
        </>
    )
}

export default EditorApp;
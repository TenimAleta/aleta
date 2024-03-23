import { useEffect, useState } from "react";
import { fetchAPI } from "../../../../utils/utils";
import Popup from "../../../other/Popup";
import Pressable from "../../../other/Pressable";

export function PopupEtiquetaChooser({
    popupClosed,
    setPopupClosed,
    caixaSelected,
    onSelect,
    socket,
    etiquetaToInput,
    setEtiquetaToInput,
    ...props
}) {
    const [allEtiquetes, setAllEtiquetes] = useState([]);

    useEffect(() => {
        fetchAPI('/etiquetes', setAllEtiquetes);
    }, [
        popupClosed
    ]);

    useEffect(() => {
        socket.on('.etiqueta_created', () => fetchAPI('/etiquetes', setAllEtiquetes));
        socket.on('.etiqueta_deleted', () => fetchAPI('/etiquetes', setAllEtiquetes));

        return () => {
            socket.off('.etiqueta_created');
            socket.off('.etiqueta_deleted');
        }
    }, []);

    const etiquetaHotkeys = allEtiquetes.reduce((hotkeys, etiqueta) => {
        const availableChar = [...etiqueta.nom.toLowerCase()].find(char => !Object.values(hotkeys).includes(char));
        return availableChar ? { ...hotkeys, [etiqueta.id]: availableChar } : hotkeys;
    }, {});

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (popupClosed && (event.key === 'Q' || event.key === 'q')) {
                setPopupClosed(false);
                return;
            }

            if (!popupClosed) {
                allEtiquetes.forEach(etiqueta => {
                    const hotkey = etiquetaHotkeys[etiqueta.id];
                    if (event.key.toLowerCase() === hotkey || event.key.toUpperCase() === hotkey) {
                        chooseProfile(etiqueta);
                    }
                });
            }
        };
    
        window.addEventListener('keydown', handleKeyDown);
    
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [allEtiquetes, popupClosed]);    

    const chooseProfile = (etiqueta) => {
        if (etiquetaToInput?.id === etiqueta.id) {
            setEtiquetaToInput(null);
        } else {
            setEtiquetaToInput(etiqueta);
        }

        // if (props.json[caixaSelected]?.perfil?.toLowerCase() !== etiqueta.nom?.toLowerCase()) {
        //     props.setJsonOutput({
        //         ...props.json,
        //         [caixaSelected]: {
        //             ...props.json[caixaSelected],
        //             perfil: etiqueta.nom.toLowerCase(),
        //             etiqueta: etiqueta.id,
        //         }
        //     })
        // } else {
        //     props.setJsonOutput({
        //         ...props.json,
        //         [caixaSelected]: {
        //             ...props.json[caixaSelected],
        //             perfil: undefined,
        //             etiqueta: undefined,
        //         }
        //     })
        // }

        setPopupClosed(true);
    }

    return (
        <Popup closed={popupClosed} setClosed={setPopupClosed}>
            <h2>Afegeix una etiqueta</h2>

            <div className="etiquetes-editor">
                <div className="etiquetes-list">
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                        }}
                    >
                        {
                            allEtiquetes.map(etiqueta => (
                                <Pressable
                                    key={etiqueta.id}
                                    onClick={() => chooseProfile(etiqueta)}
                                    className="etiqueta"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        margin: 10,
                                        padding: 10,
                                        borderRadius: 5,
                                        backgroundColor: '#eee',
                                        gap: 5,
                                    }}
                                >
                                    <label htmlFor={etiqueta.nom}>
                                        <span dangerouslySetInnerHTML={{ __html: etiqueta.nom.replace(new RegExp(`(${etiquetaHotkeys?.[etiqueta.id]?.toUpperCase()}|${etiquetaHotkeys?.[etiqueta.id]?.toLowerCase()})`), `<b>$1</b>`) }}></span>
                                    </label>
                                    <input
                                        id={etiqueta.nom}
                                        type="checkbox" 
                                        checked={etiquetaToInput?.id === etiqueta.id} 
                                        readOnly={true}
                                    />
                                </Pressable>
                            ))
                        }
                    </div>
                </div>
            </div>

            <div
                style={{
                    marginTop: 20,
                }}
            >
                <a href="/etiquetes" target="_blank">Gestiona les etiquetes</a>
            </div>
        </Popup>
    )
}

function EtiquetaChooser({ etiquetaToInput, show, popupClosed, setPopupClosed }) {
    return show && (
        <Pressable className="boto" onClick={() => setPopupClosed(prev => !prev)}>
            <span role="img" aria-label="choose">
                🏷️
            </span>
            <div style={{
                position: 'absolute',
                right: 12,
                backgroundColor: 'rgba(229, 204, 255, 1)',
                fontSize: 10,
                padding: 3,
                borderRadius: 5,
                color: 'rgba(0, 0, 0, 0.7)', // black font with 70% transparency
            }}>
                {
                    etiquetaToInput?.nom?.toUpperCase()?.slice(0, 4)
                }
            </div>
        </Pressable>
    );
}

export default EtiquetaChooser;
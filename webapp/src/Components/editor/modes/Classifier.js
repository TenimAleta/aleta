import { useEffect, useState } from "react";
import { fetchAPI } from "../../../utils/utils";
import Popup from "../../other/Popup";
import Pressable from "../../other/Pressable";

export function PopupClassifier({
    popupClosed,
    setPopupClosed,
    caixaSelected,
    socket,
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
                        chooseProfile(caixaSelected, etiqueta);
                    }
                });
            }
        };
    
        window.addEventListener('keydown', handleKeyDown);
    
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [allEtiquetes, popupClosed]);    

    const chooseProfile = (caixaSelected, etiqueta) => {
        if (caixaSelected !== -1) {
            // const perfil = force_perfil ? force_perfil :
            //     prompt("Introdueix el perfil de la caixa (tronc, lateral, baix...)", props.json[caixaSelected]?.perfil || "");

            if (props.json[caixaSelected]?.perfil?.toLowerCase() !== etiqueta.nom?.toLowerCase()) {
                props.setJsonOutput({
                    ...props.json,
                    [caixaSelected]: {
                        ...props.json[caixaSelected],
                        perfil: etiqueta.nom.toLowerCase(),
                        etiqueta: etiqueta.id,
                    }
                })
            } else {
                props.setJsonOutput({
                    ...props.json,
                    [caixaSelected]: {
                        ...props.json[caixaSelected],
                        perfil: undefined,
                        etiqueta: undefined,
                    }
                })
            }

            setPopupClosed(true);
        }
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
                                    onClick={() => chooseProfile(caixaSelected, etiqueta)}
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
                                        <span dangerouslySetInnerHTML={{ __html: etiqueta.nom.replace(new RegExp(`(${etiquetaHotkeys[etiqueta.id].toUpperCase()}|${etiquetaHotkeys[etiqueta.id].toLowerCase()})`), `<b>$1</b>`) }}></span>
                                    </label>
                                    <input
                                        id={etiqueta.nom}
                                        type="checkbox" 
                                        checked={props.json[caixaSelected]?.perfil?.toLowerCase() === etiqueta.nom?.toLowerCase()} 
                                        // onChange={() => chooseProfile(caixaSelected, etiqueta)}
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

function Classifier({ show, popupClosed, setPopupClosed }) {
    return show && (
        <Pressable className="boto" onClick={() => setPopupClosed(prev => !prev)}>
            <span role="img" aria-label="choose">
                🏷️
            </span>
            <div style={{
                position: 'absolute',
                left: 12,
                backgroundColor: 'rgba(173, 216, 230, 0.7)', // lightblue with 70% transparency
                fontSize: 10,
                padding: 3,
                borderRadius: 5,
                color: 'rgba(0, 0, 0, 0.7)', // black font with 70% transparency
            }}>
                Q
            </div>
        </Pressable>
    );
}

export default Classifier;
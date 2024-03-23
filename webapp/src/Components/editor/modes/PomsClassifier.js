import { useEffect, useState } from "react";
import { fetchAPI } from "../../../utils/utils";
import Popup from "../../other/Popup";
import Pressable from "../../other/Pressable";

export function PopupPomsClassifier({
    popupClosed,
    setPopupClosed,
    caixaSelected,
    socket,
    ...props
}) {
    const [allEtiquetes, setAllEtiquetes] = useState([
        {
            id: 1,
            nom: 'Dos',
        },
        {
            id: 2,
            nom: 'Acotxador',
        },
        {
            id: 3,
            nom: 'Enxaneta',
        }
    ]);

    const etiquetaHotkeys = allEtiquetes.reduce((hotkeys, etiqueta) => {
        const availableChar = [...etiqueta.nom.toLowerCase()].find(char => !Object.values(hotkeys).includes(char));
        return availableChar ? { ...hotkeys, [etiqueta.id]: availableChar } : hotkeys;
    }, {});

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (popupClosed && (event.key === 'P' || event.key === 'p')) {
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
            if (props.json[caixaSelected]?.pom?.toLowerCase() !== etiqueta.nom?.toLowerCase()) {
                props.setJsonOutput({
                    ...props.json,
                    [caixaSelected]: {
                        ...props.json[caixaSelected],
                        pom: etiqueta.nom.toLowerCase(),
                    }
                })
            } else {
                props.setJsonOutput({
                    ...props.json,
                    [caixaSelected]: {
                        ...props.json[caixaSelected],
                        pom: undefined,
                    }
                })
            }

            setPopupClosed(true);
        }
    }

    return (
        <Popup closed={popupClosed} setClosed={setPopupClosed}>
            <h2>Tria la posició de pom</h2>

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
                                        checked={props.json[caixaSelected]?.pom?.toLowerCase() === etiqueta.nom?.toLowerCase()} 
                                        // onChange={() => chooseProfile(caixaSelected, etiqueta)}
                                        readOnly={true}
                                    />
                                </Pressable>
                            ))
                        }
                    </div>
                </div>
            </div>
        </Popup>
    )
}

function PomsClassifier({ show, popupClosed, setPopupClosed }) {
    return show && (
        <Pressable className="boto" onClick={() => setPopupClosed(prev => !prev)}>
            <span role="img" aria-label="choose">
                👶
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
                P
            </div>
        </Pressable>
    );
}

export default PomsClassifier;
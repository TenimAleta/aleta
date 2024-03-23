import { useEffect } from "react";
import Pressable from "../../../other/Pressable";

function EtiquetaModeSetter({ show, mode, setMode, ...props }) {
    const changeMode = (e) => {
        setMode(prev => prev === 'etiquetes' ? null : 'etiquetes');
    }
    
    return show && (
        <Pressable className="boto" onClick={changeMode}>
            <span role="img" aria-label="choose">
                🏷️
            </span>
        </Pressable>
    );
}

export default EtiquetaModeSetter;
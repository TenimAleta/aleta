import { useEffect } from "react";
import Pressable from "../../../other/Pressable";

function CordoModeSetter({ show, mode, setMode, ...props }) {
    const changeMode = (e) => {
        setMode(prev => prev === 'cordons' ? null : 'cordons');
    }
    
    return show && (
        <Pressable className="boto" onClick={changeMode}>
            <span role="img" aria-label="choose">
                🔘
            </span>
        </Pressable>
    );
}

export default CordoModeSetter;
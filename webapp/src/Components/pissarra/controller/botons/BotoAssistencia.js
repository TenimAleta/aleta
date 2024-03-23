import { useEffect } from "react";
import { useState } from "react";
import Pressable from "../../../other/Pressable";

function BotoAssistencia(props) {
    const { targetEvent, setPopupClosed } = props;

    return (
        <Pressable onClick={() => setPopupClosed(false)} style={{ backgroundColor: 'rgba(255, 175, 0, 0.2)' }} className={`boto boto-assist ${props.disabled ? 'disabled' : ''} ${targetEvent ? 'withTarget' : ''}`}>
            <div>&#128101;</div>
        </Pressable>
    )
}

export default BotoAssistencia;